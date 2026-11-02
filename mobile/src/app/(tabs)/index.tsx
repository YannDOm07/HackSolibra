import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Microscope, Package, QrCode, Settings2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CarteFour, LigneLot, useNombreAnime } from '@/components/metier';
import { PastilleSynchro } from '@/components/navigation';
import { BadgeDemo, BoutonRond, Ecran, Section, Texte, Vide } from '@/components/ui';
import { masse, nombre } from '@/lib/format';
import { useEtat } from '@/lib/store';
import { synchroniser } from '@/lib/synchro';
import { C, ETAPES } from '@/lib/theme';
import { STATUTS, type Lot } from '@/lib/types';

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export default function Accueil() {
  const router = useRouter();
  const lotsParId = useEtat((e) => e.lots);
  const producteurs = useEtat((e) => e.producteurs);
  const fours = useEtat((e) => e.fours);
  const direct = useEtat((e) => e.direct.fours);
  const sales = useEtat((e) => e.sales);
  const [rafraichit, setRafraichit] = useState(false);

  const lots = useMemo(() => Object.values(lotsParId).sort((a, b) => (b.maj_le ?? '').localeCompare(a.maj_le ?? '')), [lotsParId]);
  const totaux = useMemo(() => {
    const somme = (f: (l: Lot) => number | null | undefined) => lots.reduce((a, l) => a + (f(l) ?? 0), 0);
    return {
      co2: somme((l) => l.co2_kg),
      biochar: somme((l) => l.masse_biochar_kg),
      cabosses: somme((l) => l.masse_cabosses_kg),
      demo: lots.some((l) => l.demo),
    };
  }, [lots]);
  const listeFours = useMemo(
    () => Object.values(fours).sort((a, b) => Number(!!direct[b.id]) - Number(!!direct[a.id]) || a.code.localeCompare(b.code)),
    [fours, direct],
  );

  const co2 = useNombreAnime(totaux.co2 / 1000, 1200);
  const d = new Date();

  return (
    <Ecran
      rafraichit={rafraichit}
      onRafraichir={async () => {
        setRafraichit(true);
        await synchroniser();
        setRafraichit(false);
      }}
    >
      <View style={s.barreHaut}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Texte v="sousTitre" style={{ fontSize: 22 }}>
            KaboChar
          </Texte>
          <View style={s.etincelle} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <BoutonRond icone={QrCode} onPress={() => router.push('/scanner')} />
          <BoutonRond icone={Settings2} onPress={() => router.push('/reglages')} />
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(380)}>
        <Texte v="etiquette" c={C.charbon400} style={{ marginTop: 18 }}>
          {JOURS[d.getDay()]} {d.getDate()} {MOIS[d.getMonth()]}
        </Texte>
        <Texte v="titre" style={{ marginTop: 6, marginBottom: 12 }}>
          La cabosse nourrit la terre.
        </Texte>
        <PastilleSynchro />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(420).delay(80)} style={s.heros}>
        <LinearGradient
          colors={['rgba(242,101,42,0)', 'rgba(242,101,42,0.10)', 'rgba(212,78,23,0.34)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Texte v="etiquette" c={C.charbon300}>
            CO₂ stocké dans les sols
          </Texte>
          {totaux.demo && <BadgeDemo sombre />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
          <Texte v="monoXL" c={C.papier50} style={{ fontSize: 56, lineHeight: 60 }}>
            {nombre(co2, 2)}
          </Texte>
          <Texte v="monoL" c={C.braise300}>
            t
          </Texte>
        </View>
        <Texte v="petit" c={C.charbon300}>
          Estimation brute · méthode GIEC 2019
        </Texte>
        <View style={s.herosPied}>
          <Chiffre etiquette="Biochar" kg={totaux.biochar} />
          <View style={s.separateur} />
          <Chiffre etiquette="Cabosses" kg={totaux.cabosses} />
          <View style={s.separateur} />
          <View style={{ flex: 1 }}>
            <Texte v="monoL" c={C.papier50} style={{ fontSize: 20 }}>
              {Object.keys(producteurs).length}
            </Texte>
            <Texte v="petit" c={C.charbon300} style={{ fontSize: 12 }}>
              producteurs
            </Texte>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(420).delay(140)}>
        <Pressable onPress={() => router.push('/diagnostic')} style={({ pressed }) => [s.ia, pressed && { opacity: 0.75 }]}>
          <View style={s.iaIcone}>
            <Microscope size={22} color={C.braise600} />
          </View>
          <View style={{ flex: 1 }}>
            <Texte v="corpsFort">Diagnostic d'une cabosse</Texte>
            <Texte v="petit" c={C.charbon500}>
              L'IA repère la pourriture brune et le foreur
            </Texte>
          </View>
          <ArrowRight size={18} color={C.charbon400} />
        </Pressable>
      </Animated.View>

      <Section
        titre="Fours"
        action={
          <Pressable onPress={() => router.push('/fours')} hitSlop={8} style={s.lien}>
            <Texte v="petitFort" c={C.braise600}>
              Tout voir
            </Texte>
            <ArrowRight size={14} color={C.braise600} />
          </Pressable>
        }
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingLeft: 20 }}>
          {listeFours.map((f) => (
            <CarteFour
              key={f.id}
              four={f}
              etat={direct[f.id]}
              etroite
              onPress={() => {
                const actif = direct[f.id]?.cuisson_id ?? f.cuisson_active_id;
                router.push(actif ? `/cuisson/${actif}` : `/four/${f.id}`);
              }}
            />
          ))}
        </ScrollView>
      </Section>

      <Section titre="Chaîne en cours">
        <Chaine lots={lots} />
      </Section>

      <Section
        titre="Derniers lots"
        action={
          <Pressable onPress={() => router.push('/lots')} hitSlop={8} style={s.lien}>
            <Texte v="petitFort" c={C.braise600}>
              Tous les lots
            </Texte>
            <ArrowRight size={14} color={C.braise600} />
          </Pressable>
        }
      >
        {lots.length === 0 ? (
          <Vide icone={Package} titre="Aucun lot pour l'instant" texte="Le premier lot se crée avec le bouton + : producteur, parcelle, pesée des cabosses." />
        ) : (
          lots.slice(0, 5).map((l, i) => (
            <Animated.View key={l.id} entering={FadeInDown.duration(320).delay(60 * i)}>
              <LigneLot lot={l} enAttente={!!sales[`lots:${l.id}`]} onPress={() => router.push(`/lot/${l.id}`)} />
            </Animated.View>
          ))
        )}
      </Section>
    </Ecran>
  );
}

function Chiffre({ etiquette, kg }: { etiquette: string; kg: number }) {
  const m = masse(kg);
  return (
    <View style={{ flex: 1 }}>
      <Texte v="monoL" c={C.papier50} style={{ fontSize: 20 }}>
        {m.valeur}
        <Texte v="mono" c={C.charbon300} style={{ fontSize: 13 }}>
          {' '}
          {m.unite}
        </Texte>
      </Texte>
      <Texte v="petit" c={C.charbon300} style={{ fontSize: 12 }}>
        {etiquette}
      </Texte>
    </View>
  );
}

/** Répartition des lots par étape : on voit d'un coup d'œil où en est la filière. */
function Chaine({ lots }: { lots: Lot[] }) {
  const comptes = STATUTS.map((s) => ({ s, n: lots.filter((l) => l.statut === s).length }));
  const total = Math.max(1, lots.length);
  return (
    <View style={s.chaine}>
      <View style={s.chaineBarre}>
        {comptes
          .filter((c) => c.n > 0)
          .map((c) => (
            <View key={c.s} style={{ flex: c.n / total, backgroundColor: ETAPES[c.s].couleur }} />
          ))}
      </View>
      <View style={s.chaineLegende}>
        {comptes.map((c) => (
          <View key={c.s} style={s.chaineItem}>
            <View style={[s.chainePoint, { backgroundColor: ETAPES[c.s].couleur }]} />
            <Texte v="petit" c={C.charbon600} style={{ fontSize: 12 }}>
              {ETAPES[c.s].libelle}
            </Texte>
            <Texte v="mono" c={C.charbon900} style={{ fontSize: 12 }}>
              {c.n}
            </Texte>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  barreHaut: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
  etincelle: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.braise500, marginTop: 4 },
  heros: {
    marginTop: 20,
    backgroundColor: C.charbon900,
    borderRadius: 28,
    padding: 22,
    overflow: 'hidden',
  },
  herosPied: {
    flexDirection: 'row',
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.charbon700,
    gap: 12,
  },
  separateur: { width: 1, backgroundColor: C.charbon700 },
  lien: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: C.blanc,
    borderWidth: 1,
    borderColor: C.papier200,
  },
  iaIcone: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FDEBDD', alignItems: 'center', justifyContent: 'center' },
  chaine: { backgroundColor: C.blanc, borderRadius: 22, borderWidth: 1, borderColor: C.papier200, padding: 16 },
  chaineBarre: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 3, backgroundColor: C.papier100 },
  chaineLegende: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, rowGap: 8, columnGap: 14 },
  chaineItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chainePoint: { width: 8, height: 8, borderRadius: 4 },
});
