/**
 * État de l'application. Le téléphone est la source de vérité sur le terrain : tout ce qui est saisi
 * est enregistré localement (SQLite), marqué « à synchroniser », puis envoyé au serveur dès que possible.
 */
import { create } from 'zustand';

import { setApiUrl, urlParDefaut } from './api';
import { codeLocal, maintenant, nouvelId } from './outils';
import { stockage } from './stockage';
import { CHAMP_DATE, STATUTS, type Four, type Lot, type Parcelle, type Passeport, type Producteur, type ReponseSync, type Statut } from './types';

const CLE_STOCKAGE = 'kabochar:etat:v1';

export type Collection = 'producteurs' | 'parcelles' | 'lots';

export interface PhotoEnAttente {
  id: string;
  uri: string;
  type: 'cabosses' | 'four' | 'biochar' | 'parcelle';
  lot_id?: string;
  latitude?: number;
  longitude?: number;
  cree_le: string;
}

export interface EtatFourDirect {
  cuisson_id: string;
  temp: number | null;
  phase: string | null;
  source: string;
  t_s: number;
}

export interface CapteurLibre {
  device_id: string;
  temp: number;
  temp_interne: number | null;
  four_id: string | null;
  recu: number;
}

interface Donnees {
  producteurs: Record<string, Producteur>;
  parcelles: Record<string, Parcelle>;
  lots: Record<string, Lot>;
  fours: Record<string, Four>;
  passeports: Record<string, Passeport>;
  /** « lots:<id> » → révision locale pas encore reçue par le serveur. */
  sales: Record<string, number>;
  photos: PhotoEnAttente[];
  /** Heure serveur de la dernière synchro réussie : on ne redemande que ce qui a changé depuis. */
  derniereSynchro: string | null;
  /** Adresse du serveur saisie dans les réglages (sinon déduite d'Expo). */
  apiUrl: string | null;
}

type Ton = 'info' | 'succes' | 'erreur';

interface Etat extends Donnees {
  pret: boolean;
  synchro: { enCours: boolean; erreur: string | null; reussieLe: number | null };
  direct: { connecte: boolean; fours: Record<string, EtatFourDirect>; capteurs: Record<string, CapteurLibre> };
  toast: { id: number; message: string; ton: Ton } | null;

  hydrater: () => Promise<void>;
  creerProducteur: (e: Pick<Producteur, 'nom' | 'village' | 'telephone' | 'genre' | 'consentement'>) => Producteur;
  creerParcelle: (e: Omit<Parcelle, 'id' | 'demo' | 'maj_le'>) => Parcelle;
  creerLot: (e: { producteur_id: string; parcelle_id: string | null; masse_cabosses_kg: number; notes?: string }) => Lot;
  modifierLot: (id: string, patch: Partial<Lot>) => Lot;
  appliquerSync: (rep: ReponseSync, poussees: Record<string, number>) => void;
  memoriserPasseport: (p: Passeport) => void;
  ajouterPhoto: (p: Omit<PhotoEnAttente, 'id' | 'cree_le'>) => void;
  retirerPhoto: (id: string) => void;
  definirApiUrl: (url: string | null) => void;
  reinitialiser: () => Promise<void>;
  notifier: (message: string, ton?: Ton) => void;
}

const VIDE: Donnees = {
  producteurs: {},
  parcelles: {},
  lots: {},
  fours: {},
  passeports: {},
  sales: {},
  photos: [],
  derniereSynchro: null,
  apiUrl: null,
};
const CLES_DONNEES = Object.keys(VIDE) as (keyof Donnees)[];

let revision = Date.now();
let surModification: () => void = () => {};
/** Branché par le module de synchro : chaque saisie locale déclenche un envoi différé. */
export const quandModificationLocale = (f: () => void) => {
  surModification = f;
};

export function avancerLot(lot: Lot, statut: Statut, quand = maintenant()): Lot {
  const suivant: Lot = { ...lot, statut };
  for (const s of STATUTS.slice(0, STATUTS.indexOf(statut) + 1)) {
    const champ = CHAMP_DATE[s];
    if (!suivant[champ]) (suivant as unknown as Record<string, unknown>)[champ] = quand;
  }
  // Par défaut, le biochar retourne à la parcelle d'où viennent les cabosses : la boucle est fermée.
  if (statut === 'epandu' && !suivant.parcelle_destination_id) suivant.parcelle_destination_id = suivant.parcelle_id;
  return suivant;
}

export const useEtat = create<Etat>()((set, get) => {
  const marquer = (collection: Collection, id: string) => {
    set((e) => ({ sales: { ...e.sales, [`${collection}:${id}`]: ++revision } }));
    surModification();
  };

  return {
    ...VIDE,
    pret: false,
    synchro: { enCours: false, erreur: null, reussieLe: null },
    direct: { connecte: false, fours: {}, capteurs: {} },
    toast: null,

    async hydrater() {
      try {
        const brut = await stockage.lire(CLE_STOCKAGE);
        if (brut) {
          const donnees = { ...VIDE, ...(JSON.parse(brut) as Partial<Donnees>) };
          if (donnees.apiUrl) setApiUrl(donnees.apiUrl);
          set(donnees);
        }
      } catch {
        // Données illisibles : on repart de zéro, le serveur renverra tout à la prochaine synchro.
      }
      set({ pret: true });
    },

    creerProducteur(e) {
      const p: Producteur = { ...e, id: nouvelId(), code: codeLocal('PR'), demo: false, cree_le: maintenant(), maj_le: maintenant(), nb_parcelles: 0, nb_lots: 0 };
      set((s) => ({ producteurs: { ...s.producteurs, [p.id]: p } }));
      marquer('producteurs', p.id);
      return p;
    },

    creerParcelle(e) {
      const p: Parcelle = { ...e, id: nouvelId(), demo: false, maj_le: maintenant() };
      set((s) => ({ parcelles: { ...s.parcelles, [p.id]: p } }));
      marquer('parcelles', p.id);
      return p;
    },

    creerLot(e) {
      const producteur = get().producteurs[e.producteur_id];
      const base: Lot = {
        id: nouvelId(),
        code: codeLocal('KC'),
        producteur_id: e.producteur_id,
        parcelle_id: e.parcelle_id,
        four_id: null,
        parcelle_destination_id: null,
        statut: 'collecte',
        masse_cabosses_kg: e.masse_cabosses_kg,
        masse_seche_kg: null,
        masse_biochar_kg: null,
        collecte_le: null,
        sechage_le: null,
        cuisson_le: null,
        enrichissement_le: null,
        epandage_le: null,
        notes: e.notes ?? null,
        cree_le: maintenant(),
        maj_le: maintenant(),
        demo: false,
        producteur_nom: producteur?.nom,
        village: producteur?.village,
        co2_kg: 0,
      };
      const lot = avancerLot(base, 'collecte');
      set((s) => ({ lots: { ...s.lots, [lot.id]: lot } }));
      marquer('lots', lot.id);
      return lot;
    },

    modifierLot(id, patch) {
      const actuel = get().lots[id];
      let lot: Lot = { ...actuel, ...patch, maj_le: maintenant() };
      if (patch.statut && patch.statut !== actuel.statut) lot = avancerLot({ ...lot, statut: actuel.statut }, patch.statut);
      set((s) => ({ lots: { ...s.lots, [id]: lot } }));
      marquer('lots', id);
      return lot;
    },

    appliquerSync(rep, poussees) {
      set((e) => {
        const sales = { ...e.sales };
        for (const [cle, rev] of Object.entries(poussees)) if (sales[cle] === rev) delete sales[cle];
        for (const r of rep.rejets) delete sales[`${r.type}s:${r.id}`];

        // Une fiche modifiée pendant l'envoi reste locale : elle partira à la prochaine synchro.
        function fusion<T extends { id: string }>(collection: Collection, actuel: Record<string, T>, recus: T[]) {
          const out = { ...actuel };
          for (const x of recus) if (!sales[`${collection}:${x.id}`]) out[x.id] = x;
          return out;
        }
        return {
          producteurs: fusion('producteurs', e.producteurs, rep.producteurs),
          parcelles: fusion('parcelles', e.parcelles, rep.parcelles),
          lots: fusion('lots', e.lots, rep.lots),
          fours: Object.fromEntries(rep.fours.map((f) => [f.id, f])),
          sales,
          derniereSynchro: rep.heure_serveur,
        };
      });
    },

    memoriserPasseport(p) {
      set((e) => ({ passeports: { ...e.passeports, [p.lot.id]: p } }));
    },

    ajouterPhoto(p) {
      set((e) => ({ photos: [...e.photos, { ...p, id: nouvelId(), cree_le: maintenant() }] }));
      surModification();
    },

    retirerPhoto(id) {
      set((e) => ({ photos: e.photos.filter((p) => p.id !== id) }));
    },

    definirApiUrl(url) {
      setApiUrl(url || urlParDefaut());
      set({ apiUrl: url || null });
    },

    async reinitialiser() {
      const apiUrl = get().apiUrl;
      set({ ...VIDE, apiUrl });
      await stockage.effacer(CLE_STOCKAGE);
    },

    notifier(message, ton = 'info') {
      set({ toast: { id: Date.now(), message, ton } });
    },
  };
});

// Sauvegarde différée : on n'écrit sur le disque que si les données ont changé.
let minuteurEcriture: ReturnType<typeof setTimeout> | undefined;
useEtat.subscribe((etat, avant) => {
  if (!etat.pret || !CLES_DONNEES.some((k) => etat[k] !== avant[k])) return;
  clearTimeout(minuteurEcriture);
  minuteurEcriture = setTimeout(() => {
    const e = useEtat.getState();
    const donnees = Object.fromEntries(CLES_DONNEES.map((k) => [k, e[k]]));
    stockage.ecrire(CLE_STOCKAGE, JSON.stringify(donnees)).catch(() => {});
  }, 400);
});
