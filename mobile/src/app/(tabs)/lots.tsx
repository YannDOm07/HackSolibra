import { useRouter } from 'expo-router';
import { Package, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { LigneLot } from '@/components/metier';
import { Ecran, EnTete, Texte, Vide } from '@/components/ui';
import { vibre } from '@/lib/outils';
import { useEtat } from '@/lib/store';
import { C, ETAPES, F } from '@/lib/theme';
import { STATUTS, type Statut } from '@/lib/types';

export default function Lots() {
  const router = useRouter();
  const lotsParId = useEtat((e) => e.lots);
  const sales = useEtat((e) => e.sales);
  const [filtre, setFiltre] = useState<Statut | null>(null);
  const [recherche, setRecherche] = useState('');

  const tous = useMemo(() => Object.values(lotsParId).sort((a, b) => (b.maj_le ?? '').localeCompare(a.maj_le ?? '')), [lotsParId]);
  const lots = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return tous.filter(
      (l) => (!filtre || l.statut === filtre) && (!q || l.code.toLowerCase().includes(q) || (l.producteur_nom ?? '').toLowerCase().includes(q)),
    );
  }, [tous, filtre, recherche]);

  const puce = (cle: Statut | null, libelle: string, couleur?: string) => {
    const actif = filtre === cle;
    const n = cle ? tous.filter((l) => l.statut === cle).length : tous.length;
    return (
      <Pressable
        key={cle ?? 'tous'}
        onPress={() => {
          vibre.leger();
          setFiltre(cle);
        }}
        style={[s.puce, actif && s.puceActive]}
      >
        {couleur && <View style={[s.point, { backgroundColor: couleur }]} />}
        <Texte v="petitFort" c={actif ? C.papier50 : C.charbon800}>
          {libelle}
        </Texte>
        <Texte v="mono" c={actif ? C.charbon300 : C.charbon400} style={{ fontSize: 12 }}>
          {n}
        </Texte>
      </Pressable>
    );
  };

  return (
    <Ecran>
      <EnTete surtitre={`${tous.length} lots tracés`} titre="Lots" />
      <View style={s.recherche}>
        <Search size={18} color={C.charbon400} />
        <TextInput
          value={recherche}
          onChangeText={setRecherche}
          placeholder="Code du lot ou producteur"
          placeholderTextColor={C.charbon300}
          selectionColor={C.braise500}
          style={s.rechercheSaisie}
          autoCapitalize="characters"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {puce(null, 'Tous')}
        {STATUTS.map((st) => puce(st, ETAPES[st].libelle, ETAPES[st].couleur))}
      </ScrollView>

      {lots.length === 0 ? (
        <Vide icone={Package} titre="Aucun lot ici" texte={recherche ? 'Aucun lot ne correspond à cette recherche.' : 'Aucun lot à cette étape pour le moment.'} />
      ) : (
        lots.map((l) => (
          <Animated.View key={l.id} entering={FadeIn.duration(200)} layout={LinearTransition.duration(220)}>
            <LigneLot lot={l} enAttente={!!sales[`lots:${l.id}`]} onPress={() => router.push(`/lot/${l.id}`)} />
          </Animated.View>
        ))
      )}
    </Ecran>
  );
}

const s = StyleSheet.create({
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.blanc,
    borderWidth: 1,
    borderColor: C.papier300,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 14,
  },
  rechercheSaisie: { flex: 1, fontFamily: F.texteMoyen, fontSize: 15, color: C.charbon900 },
  puce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: C.blanc,
    borderWidth: 1,
    borderColor: C.papier300,
  },
  puceActive: { backgroundColor: C.charbon900, borderColor: C.charbon900 },
  point: { width: 7, height: 7, borderRadius: 4 },
});
