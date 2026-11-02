import { useRouter } from 'expo-router';
import { Flame } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Pulsation } from '@/components/courbe';
import { CarteFour } from '@/components/metier';
import { Ecran, EnTete, Texte, Vide } from '@/components/ui';
import { useEtat } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Fours() {
  const router = useRouter();
  const fours = useEtat((e) => e.fours);
  const direct = useEtat((e) => e.direct.fours);
  const connecte = useEtat((e) => e.direct.connecte);

  const liste = useMemo(
    () => Object.values(fours).sort((a, b) => Number(!!direct[b.id]) - Number(!!direct[a.id]) || a.code.localeCompare(b.code)),
    [fours, direct],
  );
  const actifs = liste.filter((f) => direct[f.id] || f.cuisson_active_id).length;

  return (
    <Ecran>
      <EnTete
        surtitre={actifs ? `${actifs} en cuisson` : 'Tous au repos'}
        titre="Fours"
        droite={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 6 }}>
            {connecte ? <Pulsation couleur={C.feuille500} taille={7} /> : <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.charbon300 }} />}
            <Texte v="petit" c={C.charbon500}>
              {connecte ? 'Direct' : 'Hors direct'}
            </Texte>
          </View>
        }
      />
      {liste.length === 0 ? (
        <Vide icone={Flame} titre="Aucun four" texte="Les fours apparaissent après la première synchronisation avec le serveur." />
      ) : (
        <View style={{ gap: 12 }}>
          {liste.map((f, i) => (
            <Animated.View key={f.id} entering={FadeInDown.duration(320).delay(70 * i)}>
              <CarteFour
                four={f}
                etat={direct[f.id]}
                onPress={() => {
                  const actif = direct[f.id]?.cuisson_id ?? f.cuisson_active_id;
                  router.push(actif ? `/cuisson/${actif}` : `/four/${f.id}`);
                }}
              />
            </Animated.View>
          ))}
        </View>
      )}
      <Texte v="petit" c={C.charbon400} style={{ marginTop: 20, lineHeight: 19 }}>
        Chaque four porte un thermocouple relié à une carte ESP32. La courbe de température prouve la qualité de chaque cuisson et fixe la
        classe de stabilité du carbone (méthode GIEC).
      </Texte>
    </Ecran>
  );
}
