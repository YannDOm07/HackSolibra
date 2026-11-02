import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, CircleCheck, Images, RotateCcw, ShieldAlert, TriangleAlert, X, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Bouton, BoutonRond, Carte, Ecran, EnTete, Texte } from '@/components/ui';
import { api } from '@/lib/api';
import { nombre } from '@/lib/format';
import { vibre } from '@/lib/outils';
import { useEtat } from '@/lib/store';
import { C } from '@/lib/theme';
import type { ClasseCabosse, FicheModele, ResultatDiagnostic } from '@/lib/types';

// Couleurs d'état (bon / alerte / grave), toujours accompagnées d'une icône et d'un libellé.
const ETATS: Record<ClasseCabosse, { couleur: string; fond: string; icone: LucideIcon }> = {
  healthy: { couleur: C.feuille600, fond: C.feuille100, icone: CircleCheck },
  pod_borer: { couleur: C.braise600, fond: '#FDEBDD', icone: TriangleAlert },
  black_pod_rot: { couleur: C.danger, fond: '#F9E1DC', icone: ShieldAlert },
};
const ORDRE: ClasseCabosse[] = ['healthy', 'black_pod_rot', 'pod_borer'];

export default function Diagnostic() {
  const router = useRouter();
  const notifier = useEtat((e) => e.notifier);
  const [photo, setPhoto] = useState<string | null>(null);
  const [resultat, setResultat] = useState<ResultatDiagnostic | null>(null);
  const [analyse, setAnalyse] = useState(false);
  const [fiche, setFiche] = useState<FicheModele | null>(null);

  useEffect(() => {
    api.ficheModele().then(setFiche).catch(() => {});
  }, []);

  const choisir = async (source: 'camera' | 'galerie') => {
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const options = { mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7 };
    const r = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (r.canceled) return;
    const uri = r.assets[0].uri;
    setPhoto(uri);
    setResultat(null);
    setAnalyse(true);
    try {
      const d = await api.diagnostiquer(uri);
      setResultat(d);
      d.etiquette === 'healthy' ? vibre.succes() : vibre.impact();
    } catch (e) {
      vibre.erreur();
      notifier((e as Error).message === 'Serveur injoignable' ? "Connexion au serveur nécessaire pour l'analyse" : (e as Error).message, 'erreur');
      setPhoto(null);
    } finally {
      setAnalyse(false);
    }
  };

  const etat = resultat ? ETATS[resultat.etiquette] : null;

  return (
    <Ecran>
      <EnTete surtitre="Intelligence artificielle" titre="Diagnostic d'une cabosse" droite={<BoutonRond icone={X} onPress={() => router.back()} />} />

      {photo ? (
        <View style={s.cadre}>
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          {analyse && <Balayage />}
        </View>
      ) : (
        <Carte style={{ alignItems: 'center', paddingVertical: 28 }}>
          <View style={s.pastilleIcone}>
            <Camera size={26} color={C.braise600} />
          </View>
          <Texte v="intertitre" style={{ marginTop: 14, textAlign: 'center' }}>
            Photographiez une cabosse de près
          </Texte>
          <Texte v="petit" c={C.charbon500} style={{ textAlign: 'center', marginTop: 6, maxWidth: 290 }}>
            Le modèle repère la pourriture brune et le foreur de cabosse. Cadrez une seule cabosse, en lumière naturelle.
          </Texte>
        </Carte>
      )}

      {analyse && (
        <Texte v="petitFort" c={C.charbon500} style={{ textAlign: 'center', marginTop: 14 }}>
          Analyse en cours…
        </Texte>
      )}

      {resultat && etat && (
        <Animated.View entering={FadeInDown.duration(320)} style={{ marginTop: 16, gap: 12 }}>
          <View style={[s.verdict, { backgroundColor: etat.fond }]}>
            <etat.icone size={26} color={etat.couleur} />
            <View style={{ flex: 1 }}>
              <Texte v="sousTitre" c={C.charbon900}>
                {resultat.libelle}
              </Texte>
              <Texte v="petit" c={C.charbon600}>
                Confiance {nombre(resultat.confiance * 100)} %
              </Texte>
            </View>
          </View>

          {resultat.incertain && (
            <View style={s.incertain}>
              <TriangleAlert size={16} color={C.braise600} />
              <Texte v="petit" c={C.charbon700} style={{ flex: 1 }}>
                Le modèle hésite. Reprenez la photo plus près, une seule cabosse, sans contre-jour.
              </Texte>
            </View>
          )}

          <Carte>
            <Texte v="etiquette" c={C.charbon500} style={{ marginBottom: 12 }}>
              Probabilités
            </Texte>
            {ORDRE.map((c) => (
              <View key={c} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Texte v="petit" c={C.charbon700}>
                    {resultat.libelles[c]}
                  </Texte>
                  <Texte v="mono" style={{ fontSize: 13 }}>
                    {nombre(resultat.scores[c] * 100)} %
                  </Texte>
                </View>
                <View style={s.piste}>
                  <View style={[s.barre, { width: `${Math.max(resultat.scores[c] * 100, 1)}%` }]} />
                </View>
              </View>
            ))}
          </Carte>

          <Carte>
            <Texte v="etiquette" c={C.charbon500} style={{ marginBottom: 8 }}>
              Que faire
            </Texte>
            <Texte v="corps">{resultat.conseil}</Texte>
          </Carte>
        </Animated.View>
      )}

      <View style={{ gap: 10, marginTop: 18 }}>
        <Bouton titre={resultat ? 'Nouvelle photo' : 'Photographier une cabosse'} icone={resultat ? RotateCcw : Camera} ton="braise" charge={analyse} onPress={() => choisir('camera')} />
        <Bouton titre="Choisir dans la galerie" icone={Images} ton="fantome" desactive={analyse} onPress={() => choisir('galerie')} />
      </View>

      {fiche?.disponible && fiche.test && (
        <Texte v="petit" c={C.charbon400} style={{ marginTop: 18, lineHeight: 18 }}>
          Modèle {fiche.version} · exactitude {nombre(fiche.test.exactitude * 100, 1)} % et F1 macro {nombre(fiche.test.f1_macro * 100, 1)} % sur{' '}
          {fiche.test.n} photos jamais vues pendant l'entraînement. Entraîné sur des photos de {fiche.jeu_de_donnees?.origine} : à confirmer avec
          des photos ivoiriennes pendant le pilote.
        </Texte>
      )}
    </Ecran>
  );
}

/** Ligne qui balaie la photo pendant l'analyse. */
function Balayage() {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [y]);
  const style = useAnimatedStyle(() => ({ top: `${y.value * 96}%` }));
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,15,13,0.25)' }]}>
      <Animated.View style={[s.balai, style]} />
    </View>
  );
}

const s = StyleSheet.create({
  cadre: { height: 300, borderRadius: 24, overflow: 'hidden', backgroundColor: C.papier100 },
  pastilleIcone: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FDEBDD', alignItems: 'center', justifyContent: 'center' },
  balai: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.braise400,
    shadowColor: C.braise500,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
  },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22 },
  incertain: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: '#FDF0E7' },
  piste: { height: 8, borderRadius: 4, backgroundColor: C.papier100, marginTop: 6, overflow: 'hidden' },
  barre: { height: 8, borderRadius: 4, backgroundColor: C.charbon700 },
});
