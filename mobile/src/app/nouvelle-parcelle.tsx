import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Crosshair, MapPin, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Bouton, BoutonRond, Carte, Champ, Ecran, EnTete, Texte } from '@/components/ui';
import { nombre, parseDecimal } from '@/lib/format';
import { vibre } from '@/lib/outils';
import { useEtat } from '@/lib/store';
import { C } from '@/lib/theme';

type Position = { latitude: number; longitude: number; precision: number | null };

export default function NouvelleParcelle() {
  const { producteurId, suite } = useLocalSearchParams<{ producteurId: string; suite?: string }>();
  const router = useRouter();
  const producteur = useEtat((e) => e.producteurs[producteurId]);
  const creer = useEtat((e) => e.creerParcelle);
  const notifier = useEtat((e) => e.notifier);

  const [nom, setNom] = useState('Champ principal');
  const [surface, setSurface] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [recherche, setRecherche] = useState(false);
  const [refus, setRefus] = useState(false);
  const [latManuelle, setLatManuelle] = useState('');
  const [lngManuelle, setLngManuelle] = useState('');

  const relever = async () => {
    setRecherche(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setRefus(true);
        return;
      }
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPosition({ latitude: p.coords.latitude, longitude: p.coords.longitude, precision: p.coords.accuracy ?? null });
      vibre.succes();
    } catch {
      setRefus(true);
    } finally {
      setRecherche(false);
    }
  };

  const lat = position?.latitude ?? parseDecimal(latManuelle);
  const lng = position?.longitude ?? parseDecimal(lngManuelle);
  const valide = !!nom.trim() && lat != null && lng != null;

  const enregistrer = () => {
    if (!valide || lat == null || lng == null) return;
    creer({ producteur_id: producteurId, nom: nom.trim(), latitude: lat, longitude: lng, surface_ha: parseDecimal(surface) });
    vibre.succes();
    notifier('Parcelle enregistrée', 'succes');
    if (suite === 'lot') router.replace(`/nouveau-lot?producteurId=${producteurId}`);
    else router.back();
  };

  return (
    <Ecran>
      <EnTete surtitre={producteur?.nom ?? 'Parcelle'} titre="Nouvelle parcelle" droite={<BoutonRond icone={X} onPress={() => router.back()} />} />

      <Champ label="Nom de la parcelle" value={nom} onChangeText={setNom} />
      <Champ label="Surface (hectares)" value={surface} onChangeText={setSurface} keyboardType="decimal-pad" placeholder="Ex. 2,5" aide="Facultatif" />

      <Texte v="etiquette" c={C.charbon500} style={{ marginBottom: 8, marginTop: 4 }}>
        Position GPS
      </Texte>
      <Carte style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Cible active={recherche} trouvee={!!position} />
        {position ? (
          <Animated.View entering={FadeIn} style={{ alignItems: 'center', marginTop: 16 }}>
            <Texte v="mono" style={{ fontSize: 16 }}>
              {position.latitude.toFixed(5)}°, {position.longitude.toFixed(5)}°
            </Texte>
            <Texte v="petit" c={C.feuille600} style={{ marginTop: 4 }}>
              {position.precision ? `Précision ± ${nombre(position.precision)} m` : 'Position relevée'}
            </Texte>
          </Animated.View>
        ) : (
          <Texte v="petit" c={C.charbon500} style={{ marginTop: 16, textAlign: 'center' }}>
            Placez-vous au centre de la parcelle, puis relevez la position.
          </Texte>
        )}
        <Bouton
          titre={position ? 'Relever à nouveau' : 'Relever la position'}
          ton={position ? 'fantome' : 'primaire'}
          icone={Crosshair}
          charge={recherche}
          onPress={relever}
          compact
          style={{ marginTop: 18, alignSelf: 'stretch' }}
        />
      </Carte>

      {refus && !position && (
        <View style={{ marginTop: 16 }}>
          <Texte v="petit" c={C.braise600} style={{ marginBottom: 12 }}>
            Position indisponible : saisissez les coordonnées à la main.
          </Texte>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Champ label="Latitude" value={latManuelle} onChangeText={setLatManuelle} keyboardType="numbers-and-punctuation" placeholder="5.6297" />
            </View>
            <View style={{ flex: 1 }}>
              <Champ label="Longitude" value={lngManuelle} onChangeText={setLngManuelle} keyboardType="numbers-and-punctuation" placeholder="-4.0822" />
            </View>
          </View>
        </View>
      )}

      <Bouton titre="Enregistrer la parcelle" icone={MapPin} desactive={!valide} onPress={enregistrer} style={{ marginTop: 24 }} />
    </Ecran>
  );
}

/** Cible animée pendant la recherche du signal GPS. */
function Cible({ active, trouvee }: { active: boolean; trouvee: boolean }) {
  const onde = useSharedValue(0);
  useEffect(() => {
    onde.value = active ? withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, false) : 0;
  }, [active, onde]);
  const style = useAnimatedStyle(() => ({ opacity: active ? 0.5 * (1 - onde.value) : 0, transform: [{ scale: 1 + onde.value * 1.6 }] }));
  const couleur = trouvee ? C.feuille500 : active ? C.braise500 : C.charbon300;
  return (
    <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[s.onde, { borderColor: couleur }, style]} />
      <View style={[s.cible, { borderColor: couleur }]}>
        <View style={[s.coeur, { backgroundColor: couleur }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  onde: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 2 },
  cible: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  coeur: { width: 12, height: 12, borderRadius: 6 },
});
