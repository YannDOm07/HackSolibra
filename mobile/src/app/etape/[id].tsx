import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Flame, Scale, Sprout, Sun, TriangleAlert, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Bouton, BoutonRond, Carte, ChampNombre, Choix, Ecran, EnTete, Texte } from '@/components/ui';
import { api } from '@/lib/api';
import { masseTexte, nombre, parseDecimal } from '@/lib/format';
import { vibre } from '@/lib/outils';
import { useEtat, type PhotoEnAttente } from '@/lib/store';
import { synchroniser } from '@/lib/synchro';
import { C, ETAPES, HUMIDITE_CABOSSE } from '@/lib/theme';

export default function EtapeSuivante() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lot = useEtat((e) => e.lots[id]);
  const parcellesParId = useEtat((e) => e.parcelles);
  const fours = useEtat((e) => e.fours);
  const modifierLot = useEtat((e) => e.modifierLot);
  const ajouterPhoto = useEtat((e) => e.ajouterPhoto);
  const notifier = useEtat((e) => e.notifier);

  const estimationSeche = lot?.masse_cabosses_kg ? Math.round(lot.masse_cabosses_kg * (1 - HUMIDITE_CABOSSE)) : null;
  const [masseSeche, setMasseSeche] = useState(lot?.masse_seche_kg ? String(lot.masse_seche_kg) : estimationSeche ? String(estimationSeche) : '');
  const [biochar, setBiochar] = useState('');
  const listeFours = useMemo(() => Object.values(fours).sort((a, b) => Number(b.village === lot?.village) - Number(a.village === lot?.village)), [fours, lot?.village]);
  const [fourId, setFourId] = useState<string | null>(listeFours[0]?.id ?? null);
  const [mode, setMode] = useState<'capteur' | 'simulation'>('simulation');
  const parcelles = useMemo(() => Object.values(parcellesParId).filter((p) => p.producteur_id === lot?.producteur_id), [parcellesParId, lot?.producteur_id]);
  const [destination, setDestination] = useState<string | null>(lot?.parcelle_id ?? parcelles[0]?.id ?? null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);

  if (!lot) return null;

  const photographier = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };
  const joindrePhoto = (type: PhotoEnAttente['type']) => photo && ajouterPhoto({ uri: photo, type, lot_id: lot.id });
  const fermer = () => router.replace(`/lot/${lot.id}`);
  const entete = (titre: string) => (
    <EnTete surtitre={`${lot.code} · ${ETAPES[lot.statut].libelle}`} titre={titre} droite={<BoutonRond icone={X} onPress={() => router.back()} />} />
  );

  if (lot.statut === 'collecte') {
    return (
      <Ecran>
        {entete('Mettre au séchage')}
        <Carte>
          <Sun size={22} color={C.cabosse500} />
          <Texte v="corps" style={{ marginTop: 10 }}>
            Étaler les cabosses en couche fine sur une bâche, au soleil, et les retourner chaque jour. Le séchage prend une à deux semaines en
            saison sèche.
          </Texte>
          <Texte v="petit" c={C.charbon500} style={{ marginTop: 10 }}>
            Une cabosse fraîche contient plus de 80 % d'eau : bien sécher, c'est un four qui monte vite en température et un meilleur biochar.
          </Texte>
        </Carte>
        <Bouton
          titre="Commencer le séchage"
          icone={Sun}
          style={{ marginTop: 20 }}
          onPress={() => {
            modifierLot(lot.id, { statut: 'sechage' });
            vibre.succes();
            fermer();
          }}
        />
      </Ecran>
    );
  }

  if (lot.statut === 'sechage') {
    const kgSec = parseDecimal(masseSeche);
    const allumer = async () => {
      if (!fourId || !kgSec) return;
      setCharge(true);
      try {
        modifierLot(lot.id, { masse_seche_kg: kgSec });
        // La cuisson est suivie par le serveur : le lot doit y être enregistré avant.
        if (!(await synchroniser())) throw new Error('Connexion au serveur nécessaire pour suivre la cuisson en direct.');
        const c = mode === 'simulation' ? await api.simulerCuisson(fourId, lot.id) : await api.demarrerCuisson(fourId, lot.id);
        vibre.impact();
        router.replace(`/cuisson/${c.id}`);
      } catch (e) {
        notifier((e as Error).message, 'erreur');
      } finally {
        setCharge(false);
      }
    };
    return (
      <Ecran>
        {entete('Enfourner')}
        <ChampNombre
          label="Matière sèche enfournée"
          valeur={masseSeche}
          onChange={setMasseSeche}
          aide={
            estimationSeche ? (
              <Texte v="petit" c={C.charbon500}>
                Estimation à partir de {masseTexte(lot.masse_cabosses_kg)} de cabosses fraîches : {masseTexte(estimationSeche)}. Pesez si possible.
              </Texte>
            ) : undefined
          }
        />
        <Texte v="etiquette" c={C.charbon500} style={{ marginBottom: 10 }}>
          Four
        </Texte>
        <Choix valeur={fourId} onChange={setFourId} options={listeFours.map((f) => ({ valeur: f.id, libelle: f.nom, detail: f.code }))} />
        <Texte v="etiquette" c={C.charbon500} style={{ marginTop: 20, marginBottom: 10 }}>
          Source des températures
        </Texte>
        <Choix
          valeur={mode}
          onChange={setMode}
          options={[
            { valeur: 'capteur', libelle: 'Capteur du four', detail: 'thermocouple ESP32' },
            { valeur: 'simulation', libelle: 'Simulation', detail: 'démonstration' },
          ]}
        />
        <Bouton titre="Allumer le four" icone={Flame} ton="braise" charge={charge} desactive={!fourId || !kgSec} onPress={allumer} style={{ marginTop: 24 }} />
      </Ecran>
    );
  }

  if (lot.statut === 'cuisson') {
    const kg = parseDecimal(biochar);
    const rendement = kg && lot.masse_seche_kg ? kg / lot.masse_seche_kg : null;
    return (
      <Ecran>
        {entete('Pesée du biochar')}
        <ChampNombre
          label="Biochar sec"
          valeur={biochar}
          onChange={setBiochar}
          autoFocus
          aide={
            rendement != null ? (
              <View style={{ gap: 6 }}>
                <Texte v="petit" c={C.charbon500}>
                  Rendement : <Texte v="petitFort">{nombre(rendement * 100, 1)} %</Texte> de la matière sèche (repère publié pour ce type de four :
                  22 ± 5 %).
                </Texte>
                {rendement > 0.45 && (
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TriangleAlert size={14} color={C.braise600} />
                    <Texte v="petit" c={C.braise600} style={{ flex: 1 }}>
                      Rendement inhabituel : vérifiez que le biochar est bien sec avant de peser.
                    </Texte>
                  </View>
                )}
              </View>
            ) : (
              <Texte v="petit" c={C.charbon500}>
                Laisser sécher le biochar après l'extinction à l'eau, puis peser.
              </Texte>
            )
          }
        />
        <PhotoOptionnelle photo={photo} onPress={photographier} libelle="Photographier le biochar" />
        <Bouton
          titre="Valider la pesée"
          icone={Scale}
          desactive={!kg}
          style={{ marginTop: 24 }}
          onPress={() => {
            modifierLot(lot.id, { masse_biochar_kg: kg, statut: 'enrichissement' });
            joindrePhoto('biochar');
            vibre.succes();
            fermer();
          }}
        />
        <Texte v="petit" c={C.charbon400} style={{ marginTop: 10 }}>
          Le lot passe ensuite à l'enrichissement : le biochar est mélangé à du compost ou à des fientes avant l'épandage.
        </Texte>
      </Ecran>
    );
  }

  if (lot.statut === 'enrichissement') {
    return (
      <Ecran>
        {entete('Retour au sol')}
        <Texte v="etiquette" c={C.charbon500} style={{ marginBottom: 10 }}>
          Parcelle qui reçoit le biochar
        </Texte>
        <Choix
          valeur={destination}
          onChange={setDestination}
          options={parcelles.map((p) => ({ valeur: p.id, libelle: p.nom, detail: p.id === lot.parcelle_id ? "parcelle d'origine" : undefined }))}
        />
        {destination === lot.parcelle_id && (
          <View style={s.boucle}>
            <Sprout size={16} color={C.feuille600} />
            <Texte v="petit" c={C.feuille700} style={{ flex: 1 }}>
              Boucle fermée : le biochar retourne à la parcelle d'où viennent les cabosses.
            </Texte>
          </View>
        )}
        <View style={{ height: 16 }} />
        <PhotoOptionnelle photo={photo} onPress={photographier} libelle="Photographier l'épandage" />
        <Bouton
          titre="Enregistrer l'épandage"
          icone={Sprout}
          ton="feuille"
          style={{ marginTop: 24 }}
          onPress={() => {
            modifierLot(lot.id, { parcelle_destination_id: destination, statut: 'epandu' });
            joindrePhoto('parcelle');
            vibre.succes();
            fermer();
          }}
        />
      </Ecran>
    );
  }

  return (
    <Ecran>
      {entete('Lot terminé')}
      <Texte v="corps">Ce lot a terminé son parcours.</Texte>
    </Ecran>
  );
}

function PhotoOptionnelle({ photo, onPress, libelle }: { photo: string | null; onPress: () => void; libelle: string }) {
  return photo ? (
    <Pressable onPress={onPress}>
      <Image source={{ uri: photo }} style={s.photo} contentFit="cover" transition={200} />
    </Pressable>
  ) : (
    <Bouton titre={libelle} ton="secondaire" icone={Camera} compact onPress={onPress} />
  );
}

const s = StyleSheet.create({
  photo: { width: '100%', height: 180, borderRadius: 18 },
  boucle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: C.feuille100,
  },
});
