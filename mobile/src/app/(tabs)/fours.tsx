import { useRouter } from 'expo-router';
import { ChevronRight, Cpu, Flame, ShieldCheck, Thermometer, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Pulsation } from '@/components/courbe';
import { CarteFour } from '@/components/metier';
import { Carte, Ecran, EnTete, Texte, Vide } from '@/components/ui';
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
      <Carte style={{ marginTop: 20 }}>
        <Texte v="etiquette" c={C.charbon500}>
          Comment le four prouve la qualité
        </Texte>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 }}>
          <EtapePreuve icone={Thermometer} titre="Thermocouple" texte="dans la zone de pyrolyse" />
          <ChevronRight size={16} color={C.charbon300} style={{ marginTop: 14 }} />
          <EtapePreuve icone={Cpu} titre="Carte ESP32" texte="une mesure toutes les 2 s" />
          <ChevronRight size={16} color={C.charbon300} style={{ marginTop: 14 }} />
          <EtapePreuve icone={ShieldCheck} titre="Classe GIEC" texte="fixe la permanence du carbone" />
        </View>
      </Carte>
    </Ecran>
  );
}

function EtapePreuve({ icone: Icone, titre, texte }: { icone: LucideIcon; titre: string; texte: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FDEBDD', alignItems: 'center', justifyContent: 'center' }}>
        <Icone size={20} color={C.braise600} />
      </View>
      <Texte v="petitFort" style={{ marginTop: 8, textAlign: 'center', fontSize: 12.5 }}>
        {titre}
      </Texte>
      <Texte v="petit" c={C.charbon500} style={{ textAlign: 'center', fontSize: 11.5, lineHeight: 15 }}>
        {texte}
      </Texte>
    </View>
  );
}
