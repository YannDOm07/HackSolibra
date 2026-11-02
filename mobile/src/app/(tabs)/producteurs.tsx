import { useRouter } from 'expo-router';
import { Search, UserPlus, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { LigneProducteur } from '@/components/metier';
import { BoutonRond, Ecran, EnTete, Texte, Vide } from '@/components/ui';
import { useEtat } from '@/lib/store';
import { C, F } from '@/lib/theme';

export default function Producteurs() {
  const router = useRouter();
  const producteurs = useEtat((e) => e.producteurs);
  const parcelles = useEtat((e) => e.parcelles);
  const lots = useEtat((e) => e.lots);
  const [recherche, setRecherche] = useState('');

  // Totaux recalculés depuis les données locales : justes même hors ligne.
  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return Object.values(producteurs)
      .filter((p) => !q || p.nom.toLowerCase().includes(q) || p.village.toLowerCase().includes(q))
      .map((p) => {
        const sesLots = Object.values(lots).filter((l) => l.producteur_id === p.id);
        return {
          ...p,
          nb_parcelles: Object.values(parcelles).filter((pa) => pa.producteur_id === p.id).length,
          nb_lots: sesLots.length,
          biochar_kg: sesLots.reduce((a, l) => a + (l.masse_biochar_kg ?? 0), 0),
        };
      })
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [producteurs, parcelles, lots, recherche]);

  const total = Object.keys(producteurs).length;
  const femmes = Object.values(producteurs).filter((p) => p.genre === 'F').length;

  return (
    <Ecran>
      <EnTete
        surtitre={`${total} producteurs · ${femmes} productrices`}
        titre="Producteurs"
        droite={<BoutonRond icone={UserPlus} fonce onPress={() => router.push('/nouveau-producteur')} />}
      />
      <View style={s.recherche}>
        <Search size={18} color={C.charbon400} />
        <TextInput
          value={recherche}
          onChangeText={setRecherche}
          placeholder="Nom ou village"
          placeholderTextColor={C.charbon300}
          selectionColor={C.braise500}
          style={s.saisie}
        />
      </View>
      {liste.length === 0 ? (
        <Vide icone={Users} titre="Aucun producteur" texte="Ajoutez le premier producteur avec le bouton en haut à droite." />
      ) : (
        liste.map((p) => (
          <Animated.View key={p.id} entering={FadeIn.duration(200)}>
            <LigneProducteur producteur={p} onPress={() => router.push(`/producteur/${p.id}`)} />
          </Animated.View>
        ))
      )}
      <Texte v="petit" c={C.charbon400} style={{ marginTop: 16 }}>
        Chaque fiche est créée avec l'accord du producteur (loi n° 2013-450 sur les données personnelles).
      </Texte>
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
    marginBottom: 16,
  },
  saisie: { flex: 1, fontFamily: F.texteMoyen, fontSize: 15, color: C.charbon900 },
});
