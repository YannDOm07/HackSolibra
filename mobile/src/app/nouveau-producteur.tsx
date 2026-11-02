import { useRouter } from 'expo-router';
import { ShieldCheck, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Bouton, BoutonRond, Champ, Choix, Ecran, EnTete, Texte } from '@/components/ui';
import { vibre } from '@/lib/outils';
import { useEtat } from '@/lib/store';
import { C } from '@/lib/theme';

export default function NouveauProducteur() {
  const router = useRouter();
  const producteurs = useEtat((e) => e.producteurs);
  const creer = useEtat((e) => e.creerProducteur);
  const notifier = useEtat((e) => e.notifier);
  const villages = useMemo(() => [...new Set(Object.values(producteurs).map((p) => p.village))].sort(), [producteurs]);

  const [nom, setNom] = useState('');
  const [village, setVillage] = useState<string | null>(null);
  const [autreVillage, setAutreVillage] = useState('');
  const [telephone, setTelephone] = useState('');
  const [genre, setGenre] = useState<'F' | 'M' | null>(null);
  const [consentement, setConsentement] = useState(false);

  const villageFinal = village === '__autre' ? autreVillage.trim() : village;
  const valide = nom.trim().length >= 2 && !!villageFinal && villageFinal.length >= 2 && consentement;

  const enregistrer = () => {
    if (!valide || !villageFinal) return;
    const p = creer({ nom: nom.trim(), village: villageFinal, telephone: telephone.trim() || null, genre, consentement });
    vibre.succes();
    notifier(`${p.nom} est enregistré`, 'succes');
    router.replace(`/nouvelle-parcelle?producteurId=${p.id}&suite=lot`);
  };

  return (
    <Ecran>
      <EnTete surtitre="Fiche producteur" titre="Nouveau producteur" droite={<BoutonRond icone={X} onPress={() => router.back()} />} />

      <Champ label="Nom et prénoms" value={nom} onChangeText={setNom} placeholder="Ex. Kouassi Konan Joseph" autoCapitalize="words" />

      <Texte v="etiquette" c={C.charbon500} style={{ marginBottom: 8 }}>
        Village
      </Texte>
      <Choix
        valeur={village}
        onChange={setVillage}
        options={[...villages.map((v) => ({ valeur: v, libelle: v })), { valeur: '__autre', libelle: 'Autre village' }]}
      />
      {village === '__autre' && (
        <View style={{ marginTop: 12 }}>
          <Champ label="Nom du village" value={autreVillage} onChangeText={setAutreVillage} autoCapitalize="words" />
        </View>
      )}
      <View style={{ height: 16 }} />

      <Champ label="Téléphone" value={telephone} onChangeText={setTelephone} placeholder="+225 07 00 00 00 00" keyboardType="phone-pad" aide="Facultatif" />

      <Texte v="etiquette" c={C.charbon500} style={{ marginBottom: 8 }}>
        Genre
      </Texte>
      <Choix
        valeur={genre}
        onChange={setGenre}
        options={[
          { valeur: 'F', libelle: 'Femme' },
          { valeur: 'M', libelle: 'Homme' },
        ]}
      />
      <Texte v="petit" c={C.charbon400} style={{ marginTop: 6 }}>
        Sert à mesurer la place des femmes dans la filière (indicateur d'inclusion).
      </Texte>

      <Pressable
        onPress={() => {
          vibre.leger();
          setConsentement(!consentement);
        }}
        style={[s.consentement, consentement && { borderColor: C.feuille500, backgroundColor: C.feuille100 }]}
      >
        <ShieldCheck size={20} color={consentement ? C.feuille600 : C.charbon400} />
        <View style={{ flex: 1 }}>
          <Texte v="petitFort">Accord du producteur</Texte>
          <Texte v="petit" c={C.charbon500} style={{ marginTop: 2 }}>
            Le producteur accepte que ses informations et la position de ses parcelles soient enregistrées pour la traçabilité de ses lots
            (loi n° 2013-450 relative aux données personnelles).
          </Texte>
        </View>
        <Switch
          value={consentement}
          onValueChange={setConsentement}
          trackColor={{ true: C.feuille500, false: C.papier300 }}
          thumbColor={C.blanc}
        />
      </Pressable>

      <Bouton titre="Enregistrer et relever une parcelle" desactive={!valide} onPress={enregistrer} style={{ marginTop: 24 }} />
    </Ecran>
  );
}

const s = StyleSheet.create({
  consentement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.papier300,
    backgroundColor: C.blanc,
  },
});
