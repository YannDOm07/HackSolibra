import * as Network from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { api } from './api';
import { quandModificationLocale, useEtat, type Collection } from './store';

let enCours: Promise<boolean> | null = null;

/** Envoie les saisies locales, récupère les changements du serveur, puis envoie les photos en attente. */
export function synchroniser(): Promise<boolean> {
  enCours ??= executer().finally(() => {
    enCours = null;
  });
  return enCours;
}

async function executer(): Promise<boolean> {
  const etat = useEtat.getState();
  if (!etat.pret) return false;

  const reseau = await Network.getNetworkStateAsync().catch(() => null);
  if (reseau && reseau.isConnected === false) {
    useEtat.setState({ synchro: { ...etat.synchro, enCours: false, erreur: 'Hors ligne' } });
    return false;
  }

  useEtat.setState((e) => ({ synchro: { ...e.synchro, enCours: true } }));
  const poussees = { ...etat.sales };
  const aEnvoyer = (collection: Collection) =>
    Object.keys(poussees)
      .filter((cle) => cle.startsWith(`${collection}:`))
      .map((cle) => etat[collection][cle.slice(collection.length + 1)])
      .filter(Boolean)
      // Le serveur applique ce qu'il reçoit dans l'ordre d'arrivée : on n'envoie pas l'horloge du téléphone.
      .map(({ maj_le, ...reste }) => reste);

  try {
    const rep = await api.sync({
      depuis: etat.derniereSynchro,
      producteurs: aEnvoyer('producteurs'),
      parcelles: aEnvoyer('parcelles'),
      lots: aEnvoyer('lots'),
    });
    useEtat.getState().appliquerSync(rep, poussees);
    await envoyerPhotos();
    useEtat.setState({ synchro: { enCours: false, erreur: null, reussieLe: Date.now() } });
    return true;
  } catch (e) {
    useEtat.setState((s) => ({ synchro: { ...s.synchro, enCours: false, erreur: (e as Error).message } }));
    return false;
  }
}

async function envoyerPhotos() {
  const { photos, sales, retirerPhoto } = useEtat.getState();
  for (const photo of photos) {
    if (photo.lot_id && sales[`lots:${photo.lot_id}`]) continue; // le lot doit d'abord exister côté serveur
    try {
      await api.envoyerPhoto(photo);
      retirerPhoto(photo.id);
    } catch {
      return; // on réessaiera à la prochaine synchro
    }
  }
}

let differee: ReturnType<typeof setTimeout> | undefined;
quandModificationLocale(() => {
  clearTimeout(differee);
  differee = setTimeout(() => synchroniser(), 1200);
});

/** Synchro au démarrage, au retour du réseau, au retour dans l'application et toutes les 45 s. */
export function useSynchroAuto() {
  const pret = useEtat((e) => e.pret);
  const reseau = Network.useNetworkState();

  useEffect(() => {
    if (!pret) return;
    const minuteur = setInterval(() => synchroniser(), 45_000);
    const abonnement = AppState.addEventListener('change', (s) => {
      if (s === 'active') synchroniser();
    });
    return () => {
      clearInterval(minuteur);
      abonnement.remove();
    };
  }, [pret]);

  useEffect(() => {
    if (pret && reseau.isConnected !== false) synchroniser();
  }, [pret, reseau.isConnected]);
}
