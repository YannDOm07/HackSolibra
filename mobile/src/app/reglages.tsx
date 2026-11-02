import { useRouter } from 'expo-router';
import { BookOpen, ChevronDown, Cpu, ExternalLink, Server, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Pulsation } from '@/components/courbe';
import { Bouton, BoutonRond, Carte, Champ, Ecran, EnTete, Section, Texte } from '@/components/ui';
import { api, getApiUrl } from '@/lib/api';
import { ilYa, nombre, temperature } from '@/lib/format';
import { useEtat } from '@/lib/store';
import { synchroniser } from '@/lib/synchro';
import { C } from '@/lib/theme';
import type { Meta } from '@/lib/types';

export default function Reglages() {
  const router = useRouter();
  const definirApiUrl = useEtat((e) => e.definirApiUrl);
  const reinitialiser = useEtat((e) => e.reinitialiser);
  const notifier = useEtat((e) => e.notifier);
  const connecte = useEtat((e) => e.direct.connecte);
  const capteurs = useEtat((e) => e.direct.capteurs);
  const synchro = useEtat((e) => e.synchro);
  const enAttente = useEtat((e) => Object.keys(e.sales).length);
  const photos = useEtat((e) => e.photos.length);
  // Un sélecteur doit renvoyer une valeur stable (nombre, objet du store) : jamais un objet créé à la volée.
  const nbProducteurs = useEtat((e) => Object.keys(e.producteurs).length);
  const nbLots = useEtat((e) => Object.keys(e.lots).length);
  const [url, setUrl] = useState(getApiUrl());
  const [test, setTest] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [, setTic] = useState(0);
  const [sourcesOuvertes, setSourcesOuvertes] = useState(false);

  useEffect(() => {
    api.meta().then(setMeta).catch(() => {});
    const t = setInterval(() => setTic((x) => x + 1), 2000); // fraîcheur des mesures « il y a … »
    return () => clearInterval(t);
  }, []);

  const tester = async () => {
    setTest(true);
    const precedente = getApiUrl();
    definirApiUrl(url);
    try {
      const r = await api.sante();
      notifier(`Serveur joignable · version ${r.version}`, 'succes');
      synchroniser();
    } catch {
      definirApiUrl(precedente === url ? null : precedente);
      notifier('Aucun serveur KaboChar à cette adresse', 'erreur');
    } finally {
      setTest(false);
    }
  };

  return (
    <Ecran>
      <EnTete surtitre="Application" titre="Réglages" droite={<BoutonRond icone={X} onPress={() => router.back()} />} />

      <Section titre="Serveur" style={{ marginTop: 0 }}>
        <Champ label="Adresse du serveur" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Bouton titre="Tester et utiliser cette adresse" icone={Server} ton="secondaire" compact charge={test} onPress={tester} />
        <Carte style={{ marginTop: 14, gap: 10 }}>
          <Ligne etiquette="Flux en direct" valeur={connecte ? 'connecté' : 'déconnecté'} point={connecte ? C.feuille500 : C.charbon300} />
          <Ligne etiquette="Dernière synchronisation" valeur={ilYa(synchro.reussieLe)} />
          <Ligne etiquette="En attente d'envoi" valeur={`${enAttente} fiche(s) · ${photos} photo(s)`} />
        </Carte>
      </Section>

      <Section titre="Capteurs détectés">
        {Object.values(capteurs).length === 0 ? (
          <Texte v="petit" c={C.charbon400}>
            Allumez une carte ESP32 sur le même réseau : ses mesures apparaissent ici, même sans cuisson en cours. Pratique pour vérifier le
            thermocouple (eau bouillante ≈ 100 °C).
          </Texte>
        ) : (
          Object.values(capteurs).map((c) => (
            <Carte key={c.device_id} style={s.capteur}>
              <Cpu size={18} color={C.charbon500} />
              <View style={{ flex: 1 }}>
                <Texte v="mono" style={{ fontSize: 13 }}>
                  {c.device_id}
                </Texte>
                <Texte v="petit" c={C.charbon400}>
                  {ilYa(c.recu)} · carte {temperature(c.temp_interne)}
                </Texte>
              </View>
              {Date.now() - c.recu < 10_000 && <Pulsation couleur={C.feuille500} taille={7} />}
              <Texte v="monoL" style={{ fontSize: 20 }}>
                {nombre(c.temp, 1)} °C
              </Texte>
            </Carte>
          ))
        )}
      </Section>

      {meta && (
        <Section titre="Méthode et sources">
          <Carte>
            <Texte v="mono" style={{ fontSize: 13 }}>
              {meta.methode.formule}
            </Texte>
            <Texte v="petit" c={C.charbon500} style={{ marginTop: 6 }}>
              {meta.methode.nature}
            </Texte>
          </Carte>
          <Pressable onPress={() => setSourcesOuvertes((o) => !o)} style={({ pressed }) => [s.deplier, pressed && { opacity: 0.7 }]}>
            <BookOpen size={17} color={C.charbon600} />
            <Texte v="petitFort" style={{ flex: 1 }}>
              {meta.references.length} sources scientifiques
            </Texte>
            <ChevronDown size={17} color={C.charbon400} style={{ transform: [{ rotate: sourcesOuvertes ? '180deg' : '0deg' }] }} />
          </Pressable>
          {sourcesOuvertes &&
            meta.references.map((r, i) => (
              <Animated.View key={r.cle} entering={FadeInDown.duration(220).delay(30 * i)}>
                <Pressable onPress={() => Linking.openURL(r.url)} style={({ pressed }) => [s.reference, pressed && { opacity: 0.6 }]}>
                  <View style={{ flex: 1 }}>
                    <Texte v="petitFort">{r.valeur}</Texte>
                    <Texte v="petit" c={C.charbon500} style={{ fontSize: 12, marginTop: 2 }}>
                      {r.source}
                    </Texte>
                  </View>
                  <ExternalLink size={15} color={C.charbon400} />
                </Pressable>
              </Animated.View>
            ))}
        </Section>
      )}

      <Section titre="Données du téléphone">
        <Texte v="petit" c={C.charbon500} style={{ marginBottom: 12 }}>
          {nbProducteurs} producteurs et {nbLots} lots sont enregistrés sur ce téléphone et restent consultables sans réseau.
        </Texte>
        <Bouton
          titre="Effacer et recharger depuis le serveur"
          icone={Trash2}
          ton="fantome"
          compact
          onPress={() =>
            Alert.alert('Effacer les données du téléphone ?', enAttente ? `${enAttente} fiche(s) non envoyée(s) seront perdues.` : 'Tout sera rechargé depuis le serveur.', [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Effacer',
                style: 'destructive',
                onPress: async () => {
                  await reinitialiser();
                  synchroniser();
                },
              },
            ])
          }
        />
      </Section>

      <Texte v="petit" c={C.charbon300} style={{ marginTop: 32, textAlign: 'center' }}>
        KaboChar {meta ? `· serveur ${meta.version}` : ''} · CNID 2026
      </Texte>
    </Ecran>
  );
}

function Ligne({ etiquette, valeur, point }: { etiquette: string; valeur: string; point?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Texte v="petit" c={C.charbon500} style={{ flex: 1 }}>
        {etiquette}
      </Texte>
      {point && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: point }} />}
      <Texte v="petitFort">{valeur}</Texte>
    </View>
  );
}

const s = StyleSheet.create({
  capteur: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, borderRadius: 18 },
  deplier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: C.blanc,
    borderWidth: 1,
    borderColor: C.papier200,
  },
  reference: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: C.papier100,
  },
});
