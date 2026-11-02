import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Check, MapPin, Plus, Search, Ticket, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Avatar } from '@/components/metier';
import { Bouton, BoutonRond, ChampNombre, Choix, Ecran, EnTete, Texte } from '@/components/ui';
import { masseTexte, parseDecimal } from '@/lib/format';
import { vibre } from '@/lib/outils';
import { useEtat } from '@/lib/store';
import { C, F, HUMIDITE_CABOSSE } from '@/lib/theme';
import type { Lot } from '@/lib/types';

export default function NouveauLot() {
  const params = useLocalSearchParams<{ producteurId?: string }>();
  const router = useRouter();
  const producteurs = useEtat((e) => e.producteurs);
  const parcellesParId = useEtat((e) => e.parcelles);
  const creerLot = useEtat((e) => e.creerLot);
  const ajouterPhoto = useEtat((e) => e.ajouterPhoto);

  const [producteurId, setProducteurId] = useState<string | null>(params.producteurId ?? null);
  const [parcelleId, setParcelleId] = useState<string | null>(null);
  const [masse, setMasse] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [cree, setCree] = useState<Lot | null>(null);

  const producteur = producteurId ? producteurs[producteurId] : undefined;
  const parcelles = useMemo(() => Object.values(parcellesParId).filter((p) => p.producteur_id === producteurId), [parcellesParId, producteurId]);
  const parcelleChoisie = parcelleId ?? (parcelles.length === 1 ? parcelles[0].id : null);
  const kg = parseDecimal(masse);
  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return Object.values(producteurs)
      .filter((p) => !q || p.nom.toLowerCase().includes(q) || p.village.toLowerCase().includes(q))
      .sort((a, b) => a.nom.localeCompare(b.nom))
      .slice(0, 6);
  }, [producteurs, recherche]);

  const photographier = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  const enregistrer = () => {
    if (!producteurId || !kg) return;
    const lot = creerLot({ producteur_id: producteurId, parcelle_id: parcelleChoisie, masse_cabosses_kg: kg });
    if (photo) ajouterPhoto({ uri: photo, type: 'cabosses', lot_id: lot.id });
    vibre.succes();
    setCree(lot);
  };

  if (cree) {
    return (
      <Ecran>
        <View style={s.succes}>
          <Animated.View entering={ZoomIn.springify().damping(14)} style={s.coche}>
            <Check size={30} color="#F4FBF6" strokeWidth={3} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(120)} style={{ alignItems: 'center' }}>
            <Texte v="etiquette" c={C.charbon400} style={{ marginTop: 22 }}>
              Lot enregistré
            </Texte>
            <Texte v="monoL" style={{ fontSize: 34, lineHeight: 40, marginTop: 8 }}>
              {cree.code}
            </Texte>
            <Texte v="petit" c={C.charbon500} style={{ marginTop: 4 }}>
              {cree.producteur_nom} · {masseTexte(cree.masse_cabosses_kg)} de cabosses
            </Texte>
            <View style={s.qr}>
              <QRCode value={`KABOCHAR:${cree.code}`} size={150} color={C.charbon900} backgroundColor={C.blanc} />
            </View>
            <Texte v="petit" c={C.charbon400} style={{ textAlign: 'center', maxWidth: 280 }}>
              Ce code suit le lot jusqu'au retour au sol. Il est enregistré sur le téléphone et partira au serveur dès que possible.
            </Texte>
          </Animated.View>
        </View>
        <View style={{ gap: 10 }}>
          <Bouton titre="Voir le passeport" icone={Ticket} onPress={() => router.replace(`/lot/${cree.id}`)} />
          <Bouton
            titre="Nouveau lot"
            ton="fantome"
            icone={Plus}
            onPress={() => {
              setCree(null);
              setMasse('');
              setPhoto(null);
            }}
          />
        </View>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <EnTete surtitre="Collecte" titre="Nouveau lot" droite={<BoutonRond icone={X} onPress={() => router.back()} />} />

      <Etape numero={1} titre="Producteur" faite={!!producteur}>
        {producteur ? (
          <Pressable onPress={() => setProducteurId(null)} style={s.choisi}>
            <Avatar nom={producteur.nom} taille={40} />
            <View style={{ flex: 1 }}>
              <Texte v="corpsFort">{producteur.nom}</Texte>
              <Texte v="petit" c={C.charbon500}>
                {producteur.village}
              </Texte>
            </View>
            <Texte v="petitFort" c={C.braise600}>
              Changer
            </Texte>
          </Pressable>
        ) : (
          <>
            <View style={s.recherche}>
              <Search size={17} color={C.charbon400} />
              <TextInput
                value={recherche}
                onChangeText={setRecherche}
                placeholder="Rechercher un producteur"
                placeholderTextColor={C.charbon300}
                selectionColor={C.braise500}
                style={s.saisie}
              />
            </View>
            {resultats.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  vibre.leger();
                  setProducteurId(p.id);
                  setParcelleId(null);
                }}
                style={({ pressed }) => [s.resultat, pressed && { opacity: 0.6 }]}
              >
                <Avatar nom={p.nom} taille={34} />
                <Texte v="corpsMoyen" style={{ flex: 1 }}>
                  {p.nom}
                </Texte>
                <Texte v="petit" c={C.charbon400}>
                  {p.village}
                </Texte>
              </Pressable>
            ))}
            <Bouton titre="Nouveau producteur" ton="secondaire" compact icone={Plus} onPress={() => router.push('/nouveau-producteur')} style={{ marginTop: 8 }} />
          </>
        )}
      </Etape>

      {producteur && (
        <Etape numero={2} titre="Parcelle d'origine" faite={!!parcelleChoisie}>
          {parcelles.length ? (
            <Choix
              valeur={parcelleChoisie}
              onChange={setParcelleId}
              options={parcelles.map((p) => ({ valeur: p.id, libelle: p.nom, detail: p.surface_ha ? `${p.surface_ha} ha` : undefined }))}
            />
          ) : (
            <Texte v="petit" c={C.charbon500}>
              Ce producteur n'a pas encore de parcelle.
            </Texte>
          )}
          <Pressable onPress={() => router.push(`/nouvelle-parcelle?producteurId=${producteur.id}`)} style={s.lien}>
            <MapPin size={15} color={C.braise600} />
            <Texte v="petitFort" c={C.braise600}>
              Relever une nouvelle parcelle
            </Texte>
          </Pressable>
        </Etape>
      )}

      {producteur && (
        <Etape numero={3} titre="Pesée des cabosses" faite={!!kg}>
          <ChampNombre
            label="Cabosses fraîches"
            valeur={masse}
            onChange={setMasse}
            aide={
              kg ? (
                <Texte v="petit" c={C.charbon500}>
                  Soit environ <Texte v="petitFort">{masseTexte(kg * (1 - HUMIDITE_CABOSSE))}</Texte> de matière sèche (les cabosses
                  fraîches contiennent environ 85 % d'eau).
                </Texte>
              ) : undefined
            }
          />
        </Etape>
      )}

      {producteur && !!kg && (
        <Etape numero={4} titre="Photo du tas" faite={!!photo} facultatif>
          {photo ? (
            <Pressable onPress={photographier}>
              <Image source={{ uri: photo }} style={s.photo} contentFit="cover" transition={200} />
            </Pressable>
          ) : (
            <Bouton titre="Photographier les cabosses" ton="secondaire" icone={Camera} onPress={photographier} />
          )}
        </Etape>
      )}

      <Bouton titre="Enregistrer le lot" desactive={!producteur || !kg} onPress={enregistrer} style={{ marginTop: 24 }} />
    </Ecran>
  );
}

function Etape({ numero, titre, faite, facultatif, children }: { numero: number; titre: string; faite: boolean; facultatif?: boolean; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={s.etape}>
      <View style={s.etapeTete}>
        <View style={[s.numero, faite && { backgroundColor: C.feuille500, borderColor: C.feuille500 }]}>
          {faite ? (
            <Check size={13} color="#fff" strokeWidth={3} />
          ) : (
            <Texte v="mono" style={{ fontSize: 12 }}>
              {numero}
            </Texte>
          )}
        </View>
        <Texte v="intertitre">{titre}</Texte>
        {facultatif && (
          <Texte v="petit" c={C.charbon400}>
            facultatif
          </Texte>
        )}
      </View>
      {children}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  etape: { marginBottom: 26 },
  etapeTete: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  numero: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: C.papier300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choisi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.blanc,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.charbon900,
    padding: 14,
  },
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
    marginBottom: 8,
  },
  saisie: { flex: 1, fontFamily: F.texteMoyen, fontSize: 15, color: C.charbon900 },
  resultat: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  lien: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  photo: { width: '100%', height: 190, borderRadius: 18 },
  succes: { alignItems: 'center', paddingTop: 48, paddingBottom: 32 },
  coche: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.feuille500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qr: { backgroundColor: C.blanc, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: C.papier200, marginVertical: 22 },
});
