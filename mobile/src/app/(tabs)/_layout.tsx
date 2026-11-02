import { Tabs } from 'expo-router/js-tabs';

import { BarreOnglets } from '@/components/navigation';
import { C } from '@/lib/theme';

export default function Onglets() {
  return (
    <Tabs tabBar={(props) => <BarreOnglets {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.papier50 } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="lots" />
      <Tabs.Screen name="fours" />
      <Tabs.Screen name="producteurs" />
    </Tabs>
  );
}
