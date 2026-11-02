import { useLocalSearchParams, useRouter } from 'expo-router';
import { CloudUpload, Flame, Hash, Scale, ShieldCheck, Sprout, Sun, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CourbeTemperature } from '@/components/courbe';
import { Frise, PastilleEtape } from '@/components/metier';
import { BadgeCapteur, BadgeDemo, BadgeSimulation, Bouton, Carte, Ecran, EnTete, Section, Texte } from '@/components/ui';
import { api } from '@/lib/api';
import { dateCourte, duree, masse, nombre, temperature } from '@/lib/format';
import { useEtat } from '@/lib/store';
import { C, CLASSES, ETAPES } from '@/lib/theme';
import { CHAMP_DATE, STATUTS, type Lot } from '@/lib/types';

type Action = { titre: string; icone: LucideIcon; ton: 'primaire' | 'braise' | 'feuille'; route: string } | null;

function prochaineAction(lot: Lot, cuissonActive: string | null): Action {
  switch (lot.statut) {
    case 'collecte':
      return { titre: 'Mettre au séchage', icone: Sun, ton: 'primaire', route: `/etape/${lot.id}` };
    case 'sechage':
      return { titre: 'Enfourner et lancer la cuisson', icone: Flame, ton: 'braise', route: `/etape/${lot.id}` };
    case 'cuisson':
      return cuissonActive
        ? { titre: 'Suivre la cuisson en direct', icone: Flame, ton: 'braise', route: `/cuisson/${cuissonActive}` }
        : { titre: 'Peser le biochar', icone: Scale, ton: 'primaire', route: `/etape/${lot.id}` };
    case 'enrichissement':
      return { titre: 'Enregistrer le retour au sol', icone: Sprout, ton: 'feuille', route: `/etape/${lot.id}` };
    default:
      return null;
  }
}

export default function PasseportLot() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lot = useEtat((e) => e.lots[id]);
  const producteur = useEtat((e) => (lot ? e.producteurs[lot.producteur_id] : undefined));
  const parcelle = useEtat((e) => (lot?.parcelle_id ? e.parcelles[lot.parcelle_id] : undefined));
  const passeport = useEtat((e) => e.passeports[id]);
  const enAttente = useEtat((e) => !!e.sales[`lots:${id}`]);
  const etatFour = useEtat((e) => (lot?.four_id ? e.direct.fours[lot.four_id] : undefined));
  const memoriser = useEtat((e) => e.memoriserPasseport);

  useEffect(() => {
    if (!lot || enAttente) return;
    let annule = false;
    api
      .passeport(id)
      .then((p) => !annule && memoriser(p))
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [id, lot?.maj_le, enAttente, etatFour?.cuisson_id]);

  if (!lot) {
    return (
      <Ecran>
        <EnTete retour titre="Lot introuvable" />
      </Ecran>
    );
  }

  const cuisson = passeport?.lot.id === lot.id ? passeport.cuisson : null;
  const cuissonActive = (cuisson?.statut === 'en_cours' ? cuisson.id : null) ?? (lot.statut === 'cuisson' && !lot.masse_biochar_kg ? etatFour?.cuisson_id ?? null : null);
  const action = prochaineAction(lot, cuissonActive);
  const etapes = STATUTS.map((s) => ({
    cle: s,
    libelle: ETAPES[s].libelle,
    date: (lot[CHAMP_DATE[s]] as string | null) ?? null,
    faite: STATUTS.indexOf(s) <= STATUTS.indexOf(lot.statut),
  }));
  const carbone = passeport?.carbone;
  const co2 = passeport ? passeport.carbone.co2_kg : (lot.co2_kg ?? 0);

  return (
    <Ecran>
      <EnTete retour titre="" />

      <Animated.View entering={FadeInDown.duration(380)} style={s.billet}>
        <View style={s.billetHaut}>
          <View style={{ flex: 1 }}>
            <Texte v="etiquette" c={C.charbon300}>
              Passeport du lot
            </Texte>
            <Texte v="monoL" c={C.papier50} style={{ fontSize: 28, lineHeight: 32, marginTop: 8 }}>
              {lot.code}
            </Texte>
            <Texte v="corpsFort" c={C.papier100} style={{ marginTop: 12 }} numberOfLines={1}>
              {producteur?.nom ?? lot.producteur_nom ?? '—'}
            </Texte>
            <Texte v="petit" c={C.charbon300} numberOfLines={1}>
              {producteur?.village ?? lot.village} {parcelle ? `· ${parcelle.nom}` : ''}
            </Texte>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              <PastilleEtape statut={lot.statut} />
              {lot.demo && <BadgeDemo sombre />}
            </View>
          </View>
          <View style={s.qr}>
            <QRCode value={`KABOCHAR:${lot.code}`} size={88} color={C.charbon900} backgroundColor={C.blanc} />
          </View>
        </View>
        <Perforation />
        <View style={s.billetBas}>
          <Mesure etiquette="Cabosses" kg={lot.masse_cabosses_kg} />
          <Mesure etiquette="Biochar" kg={lot.masse_biochar_kg} />
          <Mesure etiquette="CO₂ stocké" kg={lot.masse_biochar_kg ? co2 : null} couleur={C.feuille300} />
        </View>
      </Animated.View>

      {enAttente && (
        <View style={s.avis}>
          <CloudUpload size={18} color={C.braise600} />
          <Texte v="petit" c={C.charbon700} style={{ flex: 1 }}>
            Ce lot n'est pas encore sur le serveur. Il partira automatiquement dès que le réseau le permet.
          </Texte>
        </View>
      )}

      {action ? (
        <Bouton titre={action.titre} icone={action.icone} ton={action.ton} onPress={() => router.push(action.route as never)} style={{ marginTop: 18 }} />
      ) : (
        <View style={[s.avis, { backgroundColor: C.feuille100, borderColor: C.feuille300 }]}>
          <Sprout size={18} color={C.feuille600} />
          <Texte v="petitFort" c={C.feuille700} style={{ flex: 1 }}>
            Boucle fermée · biochar retourné au sol{lot.epandage_le ? ` le ${dateCourte(lot.epandage_le)}` : ''}
          </Texte>
        </View>
      )}

      <Section titre="Parcours">
        <Carte>
          <Frise etapes={etapes} />
        </Carte>
      </Section>

      {cuisson && (
        <Section titre="Cuisson">
          <Pressable onPress={() => router.push(`/cuisson/${cuisson.id}`)}>
            <Carte>
              <View style={s.ligneEntre}>
                <Texte v="intertitre">{passeport?.four?.nom ?? 'Four'}</Texte>
                {cuisson.source === 'simulation' ? <BadgeSimulation /> : <BadgeCapteur />}
              </View>
              <View style={{ marginTop: 12, marginHorizontal: -6 }}>
                <CourbeTemperature points={cuisson.courbe} hauteur={170} enDirect={cuisson.statut === 'en_cours'} />
              </View>
              <View style={s.grille}>
                <Indicateur etiquette="Palier retenu" valeur={temperature(cuisson.analyse.temp_retenue)} />
                <Indicateur etiquette="Carbonisation" valeur={duree(cuisson.analyse.duree_carbonisation_min)} />
                <Indicateur etiquette="Couches" valeur={String(cuisson.analyse.couches)} />
              </View>
              {cuisson.analyse.alertes.map((a) => (
                <View key={a} style={s.alerte}>
                  <TriangleAlert size={15} color={C.braise600} />
                  <Texte v="petit" c={C.charbon700} style={{ flex: 1 }}>
                    {a}
                  </Texte>
                </View>
              ))}
            </Carte>
          </Pressable>
        </Section>
      )}

      <Section titre="Bilan carbone">
        <Carte>
          {lot.masse_biochar_kg && carbone ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Texte v="monoXL" c={C.feuille600} style={{ fontSize: 40, lineHeight: 44 }}>
                  {nombre(carbone.co2_kg, 1)}
                </Texte>
                <Texte v="monoL" c={C.feuille500} style={{ fontSize: 18 }}>
                  kg CO₂
                </Texte>
              </View>
              <Texte v="petit" c={C.charbon500}>
                stockés durablement dans le sol · estimation brute
              </Texte>
              <View style={s.formule}>
                <Texte v="mono" c={C.charbon800} style={{ fontSize: 13 }}>
                  {nombre(carbone.masse_biochar_kg, 1)} × {nombre(carbone.f_c, 2)} × {nombre(carbone.f_perm, 2)} × 44/12
                </Texte>
                <Texte v="petit" c={C.charbon400} style={{ fontSize: 11.5, marginTop: 2 }}>
                  biochar sec (kg) × carbone (F_C) × permanence (F_perm) × CO₂/C
                </Texte>
              </View>
              <View style={{ marginTop: 14 }}>
                <Texte v="etiquette" c={C.charbon400} style={{ fontSize: 9.5 }}>
                  Classe de température mesurée
                </Texte>
                <Texte v="petitFort" c={CLASSES[carbone.classe]?.couleur ?? C.charbon700} style={{ marginTop: 4 }}>
                  {CLASSES[carbone.classe]?.libelle ?? carbone.classe}
                </Texte>
              </View>
              <Texte v="petit" c={C.charbon400} style={{ marginTop: 12, fontSize: 12, lineHeight: 17 }}>
                {carbone.reference}. {carbone.nature}
              </Texte>
            </>
          ) : (
            <Texte v="petit" c={C.charbon500}>
              Le bilan s'affichera après la cuisson et la pesée du biochar.
            </Texte>
          )}
        </Carte>
      </Section>

      {passeport && (
        <Section titre="Vérification">
          <Carte>
            <Ligne icone={Hash} etiquette="Empreinte SHA-256" valeur={`${passeport.verification.empreinte_sha256.slice(0, 10)}…${passeport.verification.empreinte_sha256.slice(-6)}`} mono />
            <Ligne
              icone={Flame}
              etiquette="Mesures du four"
              valeur={`${nombre(passeport.verification.nb_mesures)} · ${passeport.verification.source_temperature === 'capteur' ? 'capteur' : passeport.verification.source_temperature === 'simulation' ? 'simulation' : '—'}`}
            />
            <Ligne icone={ShieldCheck} etiquette="Données" valeur={passeport.verification.donnees_demo ? 'Démonstration' : 'Terrain'} />
            <Texte v="petit" c={C.charbon400} style={{ marginTop: 10, fontSize: 12, lineHeight: 17 }}>
              Toute modification des pesées, des dates ou de la cuisson change l'empreinte : le bilan est infalsifiable sans que cela se voie.
            </Texte>
          </Carte>
        </Section>
      )}
      {!passeport && !enAttente && <ActivityIndicator color={C.charbon400} style={{ marginTop: 24 }} />}
    </Ecran>
  );
}

function Perforation() {
  return (
    <View style={s.perforation}>
      <View style={[s.encoche, { marginLeft: -11 }]} />
      <View style={s.pointilles}>
        {Array.from({ length: 22 }, (_, i) => (
          <View key={i} style={s.tiret} />
        ))}
      </View>
      <View style={[s.encoche, { marginRight: -11 }]} />
    </View>
  );
}

function Mesure({ etiquette, kg, couleur = C.papier50 }: { etiquette: string; kg: number | null | undefined; couleur?: string }) {
  const m = masse(kg);
  return (
    <View style={{ flex: 1 }}>
      <Texte v="etiquette" c={C.charbon400} style={{ fontSize: 9.5 }}>
        {etiquette}
      </Texte>
      <Texte v="monoL" c={couleur} style={{ fontSize: 19, marginTop: 4 }}>
        {m.valeur}
        <Texte v="mono" c={C.charbon300} style={{ fontSize: 12 }}>
          {kg == null ? '' : ` ${m.unite}`}
        </Texte>
      </Texte>
    </View>
  );
}

function Indicateur({ etiquette, valeur }: { etiquette: string; valeur: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Texte v="etiquette" c={C.charbon400} style={{ fontSize: 9.5 }}>
        {etiquette}
      </Texte>
      <Texte v="mono" style={{ marginTop: 4 }}>
        {valeur}
      </Texte>
    </View>
  );
}

function Ligne({ icone: Icone, etiquette, valeur, mono }: { icone: LucideIcon; etiquette: string; valeur: string; mono?: boolean }) {
  return (
    <View style={s.ligne}>
      <Icone size={16} color={C.charbon400} />
      <Texte v="petit" c={C.charbon500} style={{ flex: 1 }}>
        {etiquette}
      </Texte>
      <Texte v={mono ? 'mono' : 'petitFort'} style={mono ? { fontSize: 12.5 } : undefined}>
        {valeur}
      </Texte>
    </View>
  );
}

const s = StyleSheet.create({
  billet: { backgroundColor: C.charbon900, borderRadius: 26, overflow: 'hidden' },
  billetHaut: { flexDirection: 'row', gap: 14, padding: 20, paddingBottom: 18 },
  billetBas: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  qr: { backgroundColor: C.blanc, borderRadius: 14, padding: 8, alignSelf: 'flex-start' },
  perforation: { flexDirection: 'row', alignItems: 'center', height: 22 },
  encoche: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.papier50 },
  pointilles: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  tiret: { width: 6, height: 1.5, borderRadius: 1, backgroundColor: C.charbon600 },
  avis: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FDF0E7',
    borderWidth: 1,
    borderColor: '#F7D3BD',
  },
  ligneEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  grille: { flexDirection: 'row', gap: 10, marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.papier200 },
  alerte: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 12 },
  formule: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: C.papier100 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.papier100 },
});
