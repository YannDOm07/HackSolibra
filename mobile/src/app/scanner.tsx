import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bouton, Texte } from '@/components/ui';
import { api } from '@/lib/api';
import { CODE_LOT, vibre } from '@/lib/outils';
import { useEtat } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Scanner() {
  const router = useRouter();
  const [permission, demander] = useCameraPermissions();
  const [recherche, setRecherche] = useState(false);
  const verrou = useRef(false);
  const notifier = useEtat((e) => e.notifier);

  const lu = async (donnees: string) => {
    if (verrou.current) return;
    const code = donnees.toUpperCase().match(CODE_LOT)?.[0];
    if (!code) return;
    verrou.current = true;
    vibre.succes();
    const local = Object.values(useEtat.getState().lots).find((l) => l.code === code);
    if (local) {
      router.replace(`/lot/${local.id}`);
      return;
    }
    setRecherche(true);
    try {
      const p = await api.passeportParCode(code);
      useEtat.setState((e) => ({ lots: { ...e.lots, [p.lot.id]: p.lot }, passeports: { ...e.passeports, [p.lot.id]: p } }));
      router.replace(`/lot/${p.lot.id}`);
    } catch (e) {
      notifier(`${code} : ${(e as Error).message}`, 'erreur');
      verrou.current = false;
      setRecherche(false);
    }
  };

  return (
    <View style={s.ecran}>
      <StatusBar style="light" />
      {permission?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(r) => lu(r.data)} />
      ) : null}
      <SafeAreaView style={s.calque}>
        <View style={s.haut}>
          <Texte v="intertitre" c={C.papier50}>
            Scanner un passeport
          </Texte>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.fermer}>
            <X size={20} color={C.papier50} />
          </Pressable>
        </View>

        {permission?.granted ? (
          <View style={s.centre}>
            <View style={s.cadre}>
              {(['hg', 'hd', 'bg', 'bd'] as const).map((c) => (
                <View key={c} style={[s.coin, s[c]]} />
              ))}
              {recherche && <ActivityIndicator color={C.braise400} size="large" />}
            </View>
            <Texte v="petit" c={C.papier100} style={{ marginTop: 22, textAlign: 'center' }}>
              Visez le QR code imprimé sur le sac ou affiché dans le passeport d'un lot.
            </Texte>
          </View>
        ) : (
          <View style={s.centre}>
            <Texte v="corps" c={C.papier100} style={{ textAlign: 'center', marginBottom: 20 }}>
              L'appareil photo sert à lire les QR codes des lots.
            </Texte>
            <Bouton titre="Autoriser l'appareil photo" ton="braise" onPress={demander} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const COIN = { position: 'absolute' as const, width: 34, height: 34, borderColor: C.braise400 };
const s = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: '#000' },
  calque: { flex: 1, padding: 20 },
  haut: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fermer: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  cadre: { width: 250, height: 250, alignItems: 'center', justifyContent: 'center' },
  coin: COIN,
  hg: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 },
  hd: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 },
  bg: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 },
  bd: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 },
});
