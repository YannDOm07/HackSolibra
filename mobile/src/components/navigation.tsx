import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Check, CloudOff, Flame, House, Package, Plus, RefreshCw, Users, WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ilYa } from '@/lib/format';
import { vibre } from '@/lib/outils';
import { useEtat } from '@/lib/store';
import { synchroniser } from '@/lib/synchro';
import { C } from '@/lib/theme';

import { Pulsation } from './courbe';
import { Texte } from './ui';

const LARGEUR_CENTRE = 68;

const ONGLETS: Record<string, { libelle: string; icone: typeof House }> = {
  index: { libelle: 'Accueil', icone: House },
  lots: { libelle: 'Lots', icone: Package },
  fours: { libelle: 'Fours', icone: Flame },
  producteurs: { libelle: 'Producteurs', icone: Users },
};

/** Barre d'onglets flottante, avec le bouton « nouveau lot » au centre. */
export function BarreOnglets({ state, navigateToTab }: BottomTabBarProps) {
  const inset = useSafeAreaInsets();
  const router = useRouter();
  const fourActif = useEtat((e) => Object.keys(e.direct.fours).length > 0);
  const routes = state.routes.filter((r) => ONGLETS[r.name]);
  const milieu = Math.ceil(routes.length / 2);

  // Pastille qui glisse derrière l'onglet actif.
  const [largeur, setLargeur] = useState(0);
  const largeurOnglet = (largeur - 12 - LARGEUR_CENTRE) / routes.length;
  const indexActif = Math.max(0, routes.findIndex((r) => r.key === state.routes[state.index]?.key));
  const position = (i: number) => 6 + i * largeurOnglet + (i >= milieu ? LARGEUR_CENTRE : 0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (largeur) x.value = withSpring(position(indexActif), { damping: 18, stiffness: 180 });
  }, [indexActif, largeur]); // eslint-disable-line react-hooks/exhaustive-deps
  const stylePastille = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const onglet = (route: (typeof routes)[number]) => {
    const def = ONGLETS[route.name];
    const actif = state.routes[state.index]?.key === route.key;
    const Icone = def.icone;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: actif }}
        onPress={() => {
          vibre.leger();
          if (!actif) navigateToTab(route.key);
        }}
        style={s.onglet}
      >
        <View>
          <Icone size={21} color={actif ? C.braise300 : C.charbon400} strokeWidth={actif ? 2.4 : 2} />
          {route.name === 'fours' && fourActif && (
            <View style={{ position: 'absolute', top: -2, right: -4 }}>
              <Pulsation taille={7} />
            </View>
          )}
        </View>
        <Texte v="petitFort" c={actif ? C.papier50 : C.charbon400} style={{ fontSize: 10.5, lineHeight: 13 }}>
          {def.libelle}
        </Texte>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[s.conteneur, { bottom: Math.max(inset.bottom, 10) + 4 }]}>
      <View style={s.barre} onLayout={(e) => setLargeur(e.nativeEvent.layout.width)}>
        {largeur > 0 && <Animated.View pointerEvents="none" style={[s.pastille, { width: largeurOnglet - 8 }, stylePastille]} />}
        {routes.slice(0, milieu).map(onglet)}
        <BoutonCentral onPress={() => router.push('/nouveau-lot')} />
        {routes.slice(milieu).map(onglet)}
      </View>
    </View>
  );
}

function BoutonCentral({ onPress }: { onPress: () => void }) {
  const echelle = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));
  return (
    <Pressable
      accessibilityLabel="Nouveau lot"
      onPressIn={() => (echelle.value = withTiming(0.9, { duration: 90 }))}
      onPressOut={() => (echelle.value = withSpring(1, { damping: 12 }))}
      onPress={() => {
        vibre.impact();
        onPress();
      }}
      style={s.centreZone}
    >
      <Animated.View style={[s.centre, style]}>
        <Plus size={26} color="#FFF8F2" strokeWidth={2.6} />
      </Animated.View>
    </Pressable>
  );
}

/** État de la synchronisation : un coup d'œil suffit pour savoir si tout est envoyé. */
export function PastilleSynchro() {
  const synchro = useEtat((e) => e.synchro);
  const enAttente = useEtat((e) => Object.keys(e.sales).length + e.photos.length);
  const notifier = useEtat((e) => e.notifier);

  let Icone = Check;
  let texte = synchro.reussieLe ? `À jour · ${ilYa(synchro.reussieLe)}` : 'Connexion…';
  let couleur: string = C.feuille600;
  if (synchro.erreur === 'Hors ligne') {
    Icone = WifiOff;
    texte = 'Hors ligne';
    couleur = C.charbon500;
  } else if (synchro.erreur) {
    Icone = CloudOff;
    texte = 'Serveur injoignable';
    couleur = C.braise600;
  }
  if (enAttente && !synchro.enCours) texte += ` · ${enAttente} en attente`;

  return (
    <Pressable
      onPress={async () => {
        vibre.leger();
        const ok = await synchroniser();
        notifier(ok ? 'Synchronisation terminée' : 'Synchronisation impossible pour le moment', ok ? 'succes' : 'erreur');
      }}
      style={({ pressed }) => [s.synchro, pressed && { opacity: 0.7 }]}
    >
      {synchro.enCours ? <ActivityIndicator size="small" color={C.charbon500} /> : <Icone size={14} color={couleur} strokeWidth={2.4} />}
      <Texte v="petitFort" c={C.charbon700} style={{ fontSize: 12 }}>
        {synchro.enCours ? 'Synchronisation…' : texte}
      </Texte>
      {!synchro.enCours && <RefreshCw size={12} color={C.charbon300} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  conteneur: { position: 'absolute', left: 16, right: 16 },
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.charbon900,
    borderRadius: 28,
    height: 68,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  onglet: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, height: '100%' },
  pastille: { position: 'absolute', left: 4, top: 8, bottom: 8, borderRadius: 20, backgroundColor: C.charbon800 },
  centreZone: { width: LARGEUR_CENTRE, alignItems: 'center', justifyContent: 'center' },
  centre: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: C.braise500,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 4,
    borderColor: C.papier50,
  },
  synchro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: C.blanc,
    borderWidth: 1,
    borderColor: C.papier200,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});
