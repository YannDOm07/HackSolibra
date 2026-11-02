import { useRouter } from 'expo-router';
import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInUp, FadeOutUp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { vibre } from '@/lib/outils';
import { useEtat } from '@/lib/store';
import { C, F, R } from '@/lib/theme';

// ---------- Typographie ----------
const VARIANTES = {
  affiche: { fontFamily: F.titreXL, fontSize: 38, lineHeight: 42, letterSpacing: -1 },
  titre: { fontFamily: F.titre, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  sousTitre: { fontFamily: F.titre, fontSize: 21, lineHeight: 26, letterSpacing: -0.3 },
  intertitre: { fontFamily: F.titreSemi, fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  corps: { fontFamily: F.texte, fontSize: 15, lineHeight: 22 },
  corpsMoyen: { fontFamily: F.texteMoyen, fontSize: 15, lineHeight: 22 },
  corpsFort: { fontFamily: F.texteFort, fontSize: 15, lineHeight: 22 },
  petit: { fontFamily: F.texte, fontSize: 13, lineHeight: 18 },
  petitFort: { fontFamily: F.texteFort, fontSize: 13, lineHeight: 18 },
  etiquette: { fontFamily: F.monoMoyen, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.3, textTransform: 'uppercase' },
  mono: { fontFamily: F.monoMoyen, fontSize: 15, lineHeight: 20 },
  monoL: { fontFamily: F.monoFort, fontSize: 24, lineHeight: 28, letterSpacing: -0.5 },
  monoXL: { fontFamily: F.monoFort, fontSize: 46, lineHeight: 50, letterSpacing: -1.8 },
} satisfies Record<string, TextStyle>;

export type Variante = keyof typeof VARIANTES;

export function Texte({ v = 'corps', c = C.charbon900, style, ...props }: TextProps & { v?: Variante; c?: string }) {
  return <Text {...props} style={[VARIANTES[v], { color: c }, style]} />;
}

// ---------- Boutons ----------
const TONS = {
  primaire: { fond: C.charbon900, texte: C.papier50, bord: C.charbon900 },
  braise: { fond: C.braise500, texte: '#FFF8F2', bord: C.braise500 },
  feuille: { fond: C.feuille600, texte: '#F4FBF6', bord: C.feuille600 },
  secondaire: { fond: 'transparent', texte: C.charbon900, bord: C.papier300 },
  fantome: { fond: C.papier100, texte: C.charbon800, bord: C.papier100 },
  sombre: { fond: C.charbon800, texte: C.papier50, bord: C.charbon700 },
};

export function Bouton({
  titre,
  onPress,
  ton = 'primaire',
  icone: Icone,
  charge,
  desactive,
  compact,
  style,
}: {
  titre: string;
  onPress?: () => void;
  ton?: keyof typeof TONS;
  icone?: LucideIcon;
  charge?: boolean;
  desactive?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = TONS[ton];
  const echelle = useSharedValue(1);
  const anime = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));
  const inactif = desactive || charge;
  return (
    <Animated.View style={[anime, style]}>
      <Pressable
        accessibilityRole="button"
        disabled={inactif}
        onPressIn={() => (echelle.value = withTiming(0.97, { duration: 90 }))}
        onPressOut={() => (echelle.value = withTiming(1, { duration: 160 }))}
        onPress={() => {
          vibre.leger();
          onPress?.();
        }}
        style={[
          styles.bouton,
          { backgroundColor: t.fond, borderColor: t.bord, height: compact ? 44 : 56, opacity: desactive ? 0.38 : 1 },
        ]}
      >
        {charge ? (
          <ActivityIndicator color={t.texte} />
        ) : (
          <>
            {Icone && <Icone size={compact ? 16 : 18} color={t.texte} strokeWidth={2.2} />}
            <Texte v={compact ? 'petitFort' : 'corpsFort'} c={t.texte}>
              {titre}
            </Texte>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function BoutonRond({ icone: Icone, onPress, fonce }: { icone: LucideIcon; onPress: () => void; fonce?: boolean }) {
  return (
    <Pressable
      hitSlop={8}
      onPress={() => {
        vibre.leger();
        onPress();
      }}
      style={({ pressed }) => [styles.rond, fonce && styles.rondFonce, pressed && { opacity: 0.6 }]}
    >
      <Icone size={20} color={fonce ? C.papier50 : C.charbon900} strokeWidth={2.2} />
    </Pressable>
  );
}

// ---------- Conteneurs ----------
export function Carte({ children, style, sombre }: { children: ReactNode; style?: StyleProp<ViewStyle>; sombre?: boolean }) {
  return <View style={[styles.carte, sombre && styles.carteSombre, style]}>{children}</View>;
}

export function Ecran({
  children,
  defilement = true,
  onRafraichir,
  rafraichit,
  sansMarge,
}: {
  children: ReactNode;
  defilement?: boolean;
  onRafraichir?: () => void;
  rafraichit?: boolean;
  sansMarge?: boolean;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.ecran}>
      {defilement ? (
        <ScrollView
          contentContainerStyle={[!sansMarge && styles.contenu, { paddingBottom: 140 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRafraichir ? <RefreshControl refreshing={!!rafraichit} onRefresh={onRafraichir} tintColor={C.braise500} colors={[C.braise500]} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, !sansMarge && styles.contenu]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function EnTete({ surtitre, titre, retour, droite }: { surtitre?: string; titre: string; retour?: boolean; droite?: ReactNode }) {
  const router = useRouter();
  return (
    <View style={styles.entete}>
      {retour && (
        <View style={{ marginBottom: 14 }}>
          <BoutonRond icone={ChevronLeft} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
      )}
      <View style={styles.enteteLigne}>
        <View style={{ flex: 1 }}>
          {surtitre && (
            <Texte v="etiquette" c={C.charbon400} style={{ marginBottom: 6 }}>
              {surtitre}
            </Texte>
          )}
          <Texte v="titre">{titre}</Texte>
        </View>
        {droite}
      </View>
    </View>
  );
}

export function Section({ titre, action, children, style }: { titre: string; action?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: 28 }, style]}>
      <View style={styles.sectionTete}>
        <Texte v="etiquette" c={C.charbon500}>
          {titre}
        </Texte>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Vide({ icone: Icone, titre, texte, action }: { icone: LucideIcon; titre: string; texte: string; action?: ReactNode }) {
  return (
    <View style={styles.vide}>
      <View style={styles.videIcone}>
        <Icone size={26} color={C.charbon500} strokeWidth={1.8} />
      </View>
      <Texte v="intertitre" style={{ textAlign: 'center' }}>
        {titre}
      </Texte>
      <Texte v="petit" c={C.charbon500} style={{ textAlign: 'center', marginTop: 4, maxWidth: 280 }}>
        {texte}
      </Texte>
      {action && <View style={{ marginTop: 18, alignSelf: 'stretch' }}>{action}</View>}
    </View>
  );
}

// ---------- Pastilles ----------
export function Pastille({
  texte,
  couleur = C.charbon700,
  fond = 'transparent',
  bord,
  pointille,
  point,
}: {
  texte: string;
  couleur?: string;
  fond?: string;
  bord?: string;
  pointille?: boolean;
  point?: boolean;
}) {
  return (
    <View style={[styles.pastille, { backgroundColor: fond, borderColor: bord ?? fond, borderStyle: pointille ? 'dashed' : 'solid' }]}>
      {point && <View style={[styles.point, { backgroundColor: couleur }]} />}
      <Texte v="etiquette" c={couleur} style={{ letterSpacing: 1 }}>
        {texte}
      </Texte>
    </View>
  );
}

export const BadgeDemo = ({ sombre }: { sombre?: boolean }) => (
  <Pastille texte="Démo" couleur={sombre ? C.charbon300 : C.charbon500} bord={sombre ? C.charbon600 : C.papier300} />
);
export const BadgeSimulation = ({ sombre }: { sombre?: boolean }) => (
  <Pastille texte="Simulation" couleur={sombre ? C.braise300 : C.braise600} bord={sombre ? C.braise400 : C.braise500} pointille />
);
export const BadgeCapteur = ({ sombre }: { sombre?: boolean }) => (
  <Pastille texte="Capteur" couleur={sombre ? C.feuille300 : C.feuille600} bord={sombre ? C.feuille500 : C.feuille300} point />
);

// ---------- Saisie ----------
export function Champ({ label, aide, style, ...props }: TextInputProps & { label: string; aide?: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Texte v="etiquette" c={C.charbon500} style={{ marginBottom: 8 }}>
        {label}
      </Texte>
      <TextInput placeholderTextColor={C.charbon300} selectionColor={C.braise500} style={[styles.champ, style]} {...props} />
      {aide && (
        <Texte v="petit" c={C.charbon400} style={{ marginTop: 6 }}>
          {aide}
        </Texte>
      )}
    </View>
  );
}

export function ChampNombre({
  label,
  valeur,
  onChange,
  unite = 'kg',
  aide,
  autoFocus,
}: {
  label: string;
  valeur: string;
  onChange: (t: string) => void;
  unite?: string;
  aide?: ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Texte v="etiquette" c={C.charbon500} style={{ marginBottom: 8 }}>
        {label}
      </Texte>
      <View style={styles.champNombre}>
        <TextInput
          value={valeur}
          onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={C.papier300}
          selectionColor={C.braise500}
          autoFocus={autoFocus}
          style={styles.champNombreSaisie}
        />
        <Texte v="monoL" c={C.charbon400}>
          {unite}
        </Texte>
      </View>
      {aide && <View style={{ marginTop: 8 }}>{aide}</View>}
    </View>
  );
}

export function Choix<T extends string>({
  options,
  valeur,
  onChange,
}: {
  options: { valeur: T; libelle: string; detail?: string }[];
  valeur: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.choix}>
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <Pressable
            key={o.valeur}
            onPress={() => {
              vibre.leger();
              onChange(o.valeur);
            }}
            style={[styles.puce, actif && styles.puceActive]}
          >
            <Texte v="petitFort" c={actif ? C.papier50 : C.charbon800}>
              {o.libelle}
            </Texte>
            {o.detail && (
              <Texte v="petit" c={actif ? C.charbon300 : C.charbon400} style={{ fontSize: 11.5 }}>
                {o.detail}
              </Texte>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Notification ----------
export function Notifications() {
  const toast = useEtat((e) => e.toast);
  const inset = useSafeAreaInsets();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useEtat.setState({ toast: null }), 2800);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  const couleur = toast.ton === 'erreur' ? C.danger : toast.ton === 'succes' ? C.feuille500 : C.braise500;
  return (
    <Animated.View key={toast.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)} style={[styles.toast, { top: inset.top + 8 }]}>
      <View style={[styles.point, { backgroundColor: couleur, width: 8, height: 8 }]} />
      <Texte v="petitFort" c={C.papier50} style={{ flex: 1 }}>
        {toast.message}
      </Texte>
    </Animated.View>
  );
}

export const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: C.papier50 },
  contenu: { paddingHorizontal: 20, paddingTop: 8 },
  entete: { paddingTop: 8, marginBottom: 20 },
  enteteLigne: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  sectionTete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bouton: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  rond: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.blanc,
    borderWidth: 1,
    borderColor: C.papier200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rondFonce: { backgroundColor: C.charbon900, borderColor: C.charbon900 },
  carte: {
    backgroundColor: C.blanc,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.papier200,
    padding: 18,
  },
  carteSombre: { backgroundColor: C.charbon900, borderColor: C.charbon800 },
  pastille: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  point: { width: 6, height: 6, borderRadius: 3 },
  champ: {
    backgroundColor: C.blanc,
    borderWidth: 1,
    borderColor: C.papier300,
    borderRadius: R.md,
    paddingHorizontal: 16,
    height: 54,
    fontFamily: F.texteMoyen,
    fontSize: 16,
    color: C.charbon900,
  },
  champNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blanc,
    borderWidth: 1,
    borderColor: C.papier300,
    borderRadius: R.lg,
    paddingHorizontal: 20,
    height: 84,
    gap: 10,
  },
  champNombreSaisie: { flex: 1, fontFamily: F.monoFort, fontSize: 40, letterSpacing: -1.5, color: C.charbon900, padding: 0 },
  choix: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: R.md,
    backgroundColor: C.blanc,
    borderWidth: 1,
    borderColor: C.papier300,
  },
  puceActive: { backgroundColor: C.charbon900, borderColor: C.charbon900 },
  vide: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 12 },
  videIcone: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.papier100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.charbon900,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 100,
  },
});
