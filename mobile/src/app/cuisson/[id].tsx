import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Scale, Ticket, TriangleAlert } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { CourbeTemperature, Pulsation } from '@/components/courbe';
import { TemperatureDirecte } from '@/components/metier';
import { BadgeCapteur, BadgeSimulation, Bouton, Texte } from '@/components/ui';
import { api } from '@/lib/api';
import { ecouterCuisson } from '@/lib/direct';
import { chrono, duree, nombre, temperature } from '@/lib/format';
import { vibre } from '@/lib/outils';
import { useEtat } from '@/lib/store';
import { C, CLASSES, PHASES } from '@/lib/theme';
import type { CuissonDetail } from '@/lib/types';

const ORDRE_PHASES = ['allumage', 'carbonisation', 'extinction', 'terminee'];
// Libellés courts : quatre étapes doivent tenir sur la largeur d'un téléphone.
const COURT: Record<string, string> = { allumage: 'Allumage', carbonisation: 'Pyrolyse', extinction: 'Extinction', terminee: 'Terminée' };

export default function CuissonEnDirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<CuissonDetail | null>(null);
  const [points, setPoints] = useState<[number, number][]>([]); // (minutes, °C)
  const [phase, setPhase] = useState('en_attente');
  const [erreur, setErreur] = useState<string | null>(null);
  const [arret, setArret] = useState(false);
  const four = useEtat((e) => (detail ? e.fours[detail.four_id] : undefined));
  const lot = useEtat((e) => (detail?.lot_id ? e.lots[detail.lot_id] : undefined));
  const notifier = useEtat((e) => e.notifier);

  useEffect(() => {
    let actif = true;
    let synchronise = false;
    const tampon: [number, number][] = [];

    const recharger = () =>
      api
        .cuisson(id)
        .then((d) => {
          if (!actif) return;
          setDetail(d);
          if (d.statut === 'terminee') setPhase('terminee');
        })
        .catch(() => {});

    // On s'abonne avant de charger l'historique, pour ne perdre aucune mesure entre les deux.
    const desabonner = ecouterCuisson(id, (t, temp, ph) => {
      if (t < 0) {
        vibre.succes();
        recharger();
        return;
      }
      setPhase(ph);
      if (!synchronise) tampon.push([t / 60, temp]);
      else setPoints((p) => [...p, [t / 60, temp]]);
    });

    (async () => {
      try {
        const d = await api.cuisson(id);
        if (!actif) return;
        setDetail(d);
        setPhase(d.analyse.phase);
        if (d.statut === 'terminee') {
          setPoints(d.courbe);
        } else {
          const brut = await api.mesuresCuisson(id);
          const base = brut.map(([t, v]) => [t / 60, v] as [number, number]);
          const dernier = base.length ? base[base.length - 1][0] : -1;
          setPoints([...base, ...tampon.filter((p) => p[0] > dernier)]);
        }
        synchronise = true;
      } catch (e) {
        setErreur((e as Error).message);
      }
    })();

    // L'analyse complète (couches, palier) est recalculée par le serveur : on la rafraîchit régulièrement.
    const minuteur = setInterval(recharger, 12_000);
    return () => {
      actif = false;
      desabonner();
      clearInterval(minuteur);
    };
  }, [id]);

  // Une vibration marque chaque changement de phase (allumage → pyrolyse → extinction).
  const phasePrecedente = useRef<string | null>(null);
  useEffect(() => {
    if (phasePrecedente.current && phasePrecedente.current !== phase && phase !== 'en_attente') vibre.impact();
    phasePrecedente.current = phase;
  }, [phase]);

  const enCours = detail?.statut === 'en_cours' && phase !== 'terminee';
  const dernier = points[points.length - 1];
  const analyse = detail?.analyse;
  const classe = CLASSES[analyse?.classe ?? 'inconnue'] ?? CLASSES.inconnue;

  const terminer = () =>
    Alert.alert("Terminer la cuisson ?", "À faire une fois le four éteint à l'eau.", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Terminer',
        style: 'destructive',
        onPress: async () => {
          setArret(true);
          try {
            setDetail(await api.terminerCuisson(id).then(() => api.cuisson(id)));
            setPhase('terminee');
            vibre.succes();
          } catch (e) {
            notifier((e as Error).message, 'erreur');
          } finally {
            setArret(false);
          }
        },
      },
    ]);

  return (
    <SafeAreaView edges={['top']} style={s.ecran}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <LueurBraise temp={enCours ? dernier?.[1] ?? 0 : 0} />
        <View style={s.haut}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/fours'))} hitSlop={10} style={s.retour}>
            <ChevronLeft size={20} color={C.papier50} />
          </Pressable>
          {detail && (detail.source === 'simulation' ? <BadgeSimulation sombre /> : <BadgeCapteur sombre />)}
        </View>

        <Texte v="etiquette" c={C.charbon400} style={{ marginTop: 18 }}>
          {enCours ? 'Cuisson en direct' : detail ? 'Cuisson terminée' : 'Connexion au four…'}
        </Texte>
        <Texte v="titre" c={C.papier50} style={{ marginTop: 6 }}>
          {four?.nom ?? 'Four'}
        </Texte>
        <Texte v="petit" c={C.charbon300}>
          {lot ? `${lot.code} · ${lot.producteur_nom ?? ''}` : 'Cuisson sans lot associé'}
        </Texte>

        <View style={s.mesure}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <TemperatureDirecte valeur={dernier?.[1]} grand />
            <Texte v="monoL" c={C.braise400} style={{ marginTop: 10, marginLeft: 4 }}>
              °C
            </Texte>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Texte v="etiquette" c={C.charbon400}>
              Durée
            </Texte>
            <Texte v="monoL" c={C.papier100} style={{ marginTop: 4 }}>
              {chrono((dernier?.[0] ?? 0) * 60)}
            </Texte>
          </View>
        </View>

        <View style={s.phases}>
          {ORDRE_PHASES.map((p, i) => {
            const rang = ORDRE_PHASES.indexOf(phase);
            const passe = i < rang || phase === 'terminee';
            const courant = p === phase;
            const def = PHASES[p];
            return (
              <View key={p} style={[s.phase, courant && { backgroundColor: C.charbon800, borderColor: def.couleur }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {courant && enCours ? <Pulsation couleur={def.couleur} taille={7} /> : <View style={[s.puce, { backgroundColor: passe || courant ? def.couleur : C.charbon700 }]} />}
                </View>
                <Texte v="petitFort" c={courant ? C.papier50 : passe ? C.charbon300 : C.charbon500} style={{ fontSize: 11.5, marginTop: 6 }} numberOfLines={1}>
                  {COURT[p]}
                </Texte>
              </View>
            );
          })}
        </View>

        <View style={s.graphique}>
          <CourbeTemperature points={points} sombre enDirect={enCours} hauteur={240} dureeMin={enCours ? 120 : 30} />
        </View>

        {erreur && (
          <Texte v="petit" c={C.braise300} style={{ marginTop: 12 }}>
            {erreur}
          </Texte>
        )}

        <View style={s.tuiles}>
          <Tuile etiquette="Palier retenu" valeur={temperature(analyse?.temp_retenue)} detail="médiane de la carbonisation" />
          <Tuile etiquette="Carbonisation" valeur={duree(analyse?.duree_carbonisation_min)} detail="au-dessus de 450 °C" />
          <Tuile etiquette="Ajouts détectés" valeur={analyse ? String(analyse.couches) : '—'} detail="couches de cabosses" />
          <Tuile
            etiquette="Classe GIEC"
            valeur={classe.court}
            couleur={analyse?.classe === 'haute' ? C.feuille300 : analyse?.classe === 'moyenne' ? C.cabosse300 : C.papier100}
            detail={analyse?.classe && ['haute', 'moyenne', 'basse'].includes(analyse.classe) ? `F_perm ${nombre({ haute: 0.89, moyenne: 0.8, basse: 0.65 }[analyse.classe as 'haute'], 2)}` : 'en attente'}
          />
        </View>

        {analyse?.alertes.map((a) => (
          <Animated.View key={a} entering={FadeIn} style={s.alerte}>
            <TriangleAlert size={16} color={C.braise300} />
            <Texte v="petit" c={C.papier100} style={{ flex: 1 }}>
              {a}
            </Texte>
          </Animated.View>
        ))}

        <View style={{ marginTop: 22, gap: 10 }}>
          {enCours ? (
            <Bouton titre="Terminer la cuisson" ton="sombre" onPress={terminer} charge={arret} />
          ) : (
            detail && (
              <>
                {lot && lot.statut === 'cuisson' && !lot.masse_biochar_kg && (
                  <Bouton titre="Peser le biochar" icone={Scale} ton="braise" onPress={() => router.replace(`/etape/${lot.id}`)} />
                )}
                {lot && <Bouton titre="Voir le passeport du lot" icone={Ticket} ton="fantome" onPress={() => router.replace(`/lot/${lot.id}`)} />}
              </>
            )
          )}
        </View>
        {detail?.source === 'simulation' && (
          <Texte v="petit" c={C.charbon400} style={{ marginTop: 18, lineHeight: 18 }}>
            Courbe générée par le simulateur de démonstration, calé sur les températures publiées pour les fours à rideau de flamme. Les
            cuissons réelles utilisent le thermocouple du four.
          </Texte>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tuile({ etiquette, valeur, detail, couleur = C.papier50 }: { etiquette: string; valeur: string; detail: string; couleur?: string }) {
  return (
    <View style={s.tuile}>
      <Texte v="etiquette" c={C.charbon400} style={{ fontSize: 9.5 }}>
        {etiquette}
      </Texte>
      <Texte v="monoL" c={couleur} style={{ fontSize: 22, marginTop: 8 }}>
        {valeur}
      </Texte>
      <Texte v="petit" c={C.charbon500} style={{ fontSize: 11.5, marginTop: 2 }}>
        {detail}
      </Texte>
    </View>
  );
}

const s = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: C.charbon950 },
  haut: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  retour: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.charbon800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesure: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20 },
  phases: { flexDirection: 'row', gap: 6, marginTop: 18 },
  phase: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.charbon800,
  },
  puce: { width: 7, height: 7, borderRadius: 4 },
  graphique: { marginTop: 16, backgroundColor: C.charbon900, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 8 },
  tuiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  tuile: { width: '48.5%', backgroundColor: C.charbon900, borderRadius: 20, padding: 16 },
  alerte: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(242,101,42,0.12)',
  },
});

/** Lueur derrière la température : elle s'intensifie avec la chaleur du four. */
function LueurBraise({ temp }: { temp: number }) {
  const intensite = Math.max(0, Math.min(1, (temp - 60) / 640));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -20, left: -20, right: -20, height: 460 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="lueur" cx="28%" cy="42%" r="72%">
            <Stop offset="0" stopColor={C.braise500} stopOpacity={0.4 * intensite} />
            <Stop offset="0.5" stopColor={C.braise600} stopOpacity={0.12 * intensite} />
            <Stop offset="1" stopColor={C.charbon950} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#lueur)" />
      </Svg>
    </View>
  );
}
