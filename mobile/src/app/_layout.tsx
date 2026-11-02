import { BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Notifications } from '@/components/ui';
import { useConnexionDirecte } from '@/lib/direct';
import { useEtat } from '@/lib/store';
import { useSynchroAuto } from '@/lib/synchro';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Racine() {
  const [polices, erreurPolices] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });
  const pret = useEtat((e) => e.pret);

  useEffect(() => {
    useEtat.getState().hydrater();
  }, []);
  useSynchroAuto();
  useConnexionDirecte();

  const affichable = (polices || !!erreurPolices) && pret;
  useEffect(() => {
    if (affichable) SplashScreen.hideAsync().catch(() => {});
  }, [affichable]);
  if (!affichable) return null;

  const modale = { presentation: 'modal', animation: 'slide_from_bottom' } as const;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.papier50 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.papier50 }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lot/[id]" />
        <Stack.Screen name="cuisson/[id]" options={{ contentStyle: { backgroundColor: C.charbon950 }, animation: 'fade_from_bottom' }} />
        <Stack.Screen name="four/[id]" />
        <Stack.Screen name="producteur/[id]" />
        <Stack.Screen name="nouveau-lot" options={modale} />
        <Stack.Screen name="nouveau-producteur" options={modale} />
        <Stack.Screen name="nouvelle-parcelle" options={modale} />
        <Stack.Screen name="etape/[id]" options={modale} />
        <Stack.Screen name="scanner" options={{ ...modale, contentStyle: { backgroundColor: '#000' } }} />
        <Stack.Screen name="reglages" options={modale} />
      </Stack>
      <Notifications />
    </GestureHandlerRootView>
  );
}
