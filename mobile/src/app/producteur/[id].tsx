import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Phone, Plus, ShieldCheck } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, LigneLot } from '@/components/metier';
import { BadgeDemo, Bouton, Carte, Ecran, EnTete, Section, Texte } from '@/components/ui';
import { masse, nombre } from '@/lib/format';
import { useEtat } from '@/lib/store';
import { C } from '@/lib/theme';

export default function FicheProducteur() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = useEtat((e) => e.producteurs[id]);
  const parcellesParId = useEtat((e) => e.parcelles);
  const lotsParId = useEtat((e) => e.lots);
  const sales = useEtat((e) => e.sales);

  const parcelles = useMemo(() => Object.values(parcellesParId).filter((x) => x.producteur_id === id), [parcellesParId, id]);
  const lots = useMemo(
    () => Object.values(lotsParId).filter((l) => l.producteur_id === id).sort((a, b) => (b.maj_le ?? '').localeCompare(a.maj_le ?? '')),
    [lotsParId, id],
  );

  if (!p) {
    return (
      <Ecran>
        <EnTete retour titre="Producteur introuvable" />
      </Ecran>
    );
  }

  const biochar = lots.reduce((a, l) => a + (l.masse_biochar_kg ?? 0), 0);
  const co2 = lots.reduce((a, l) => a + (l.co2_kg ?? 0), 0);

  return (
    <Ecran>
      <EnTete retour titre="" />
      <View style={{ alignItems: 'center' }}>
        <Avatar nom={p.nom} taille={76} />
        <Texte v="sousTitre" style={{ marginTop: 14, textAlign: 'center' }}>
          {p.nom}
        </Texte>
        <Texte v="mono" c={C.charbon500} style={{ fontSize: 12.5, marginTop: 4 }}>
          {p.code} · {p.village}
        </Texte>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          {p.consentement && (
            <View style={s.accord}>
              <ShieldCheck size={13} color={C.feuille600} />
              <Texte v="petitFort" c={C.feuille700} style={{ fontSize: 12 }}>
                Accord recueilli
              </Texte>
            </View>
          )}
          {p.demo && <BadgeDemo />}
        </View>
        {p.telephone && (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 10 }}>
            <Phone size={13} color={C.charbon400} />
            <Texte v="mono" c={C.charbon600} style={{ fontSize: 13 }}>
              {p.telephone}
            </Texte>
          </View>
        )}
      </View>

      <View style={s.stats}>
        <Stat valeur={String(parcelles.length)} etiquette={parcelles.length > 1 ? 'parcelles' : 'parcelle'} />
        <Stat valeur={String(lots.length)} etiquette={lots.length > 1 ? 'lots' : 'lot'} />
        <Stat valeur={masse(biochar).valeur} unite={masse(biochar).unite} etiquette="biochar" />
        <Stat valeur={nombre(co2)} unite="kg" etiquette="CO₂ stocké" couleur={C.feuille600} />
      </View>

      <Section
        titre="Parcelles"
        action={
          <Bouton titre="Ajouter" ton="fantome" compact icone={Plus} onPress={() => router.push(`/nouvelle-parcelle?producteurId=${p.id}`)} />
        }
      >
        {parcelles.length === 0 ? (
          <Texte v="petit" c={C.charbon400}>
            Aucune parcelle relevée.
          </Texte>
        ) : (
          parcelles.map((pa) => (
            <Carte key={pa.id} style={s.parcelle}>
              <View style={s.icone}>
                <MapPin size={18} color={C.feuille600} />
              </View>
              <View style={{ flex: 1 }}>
                <Texte v="corpsFort">{pa.nom}</Texte>
                <Texte v="mono" c={C.charbon500} style={{ fontSize: 12 }}>
                  {pa.latitude.toFixed(4)}°, {pa.longitude.toFixed(4)}°
                </Texte>
              </View>
              {pa.surface_ha != null && (
                <Texte v="mono" style={{ fontSize: 14 }}>
                  {nombre(pa.surface_ha, 1)} ha
                </Texte>
              )}
            </Carte>
          ))
        )}
      </Section>

      <Section titre="Lots">
        {lots.map((l) => (
          <LigneLot key={l.id} lot={l} enAttente={!!sales[`lots:${l.id}`]} onPress={() => router.push(`/lot/${l.id}`)} />
        ))}
        <Bouton titre="Nouveau lot pour ce producteur" icone={Plus} onPress={() => router.push(`/nouveau-lot?producteurId=${p.id}`)} style={{ marginTop: 8 }} />
      </Section>
    </Ecran>
  );
}

function Stat({ valeur, unite, etiquette, couleur = C.charbon900 }: { valeur: string; unite?: string; etiquette: string; couleur?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Texte v="monoL" c={couleur} style={{ fontSize: 19 }}>
        {valeur}
        {unite ? (
          <Texte v="mono" c={C.charbon400} style={{ fontSize: 11 }}>
            {` ${unite}`}
          </Texte>
        ) : null}
      </Texte>
      <Texte v="petit" c={C.charbon500} style={{ fontSize: 11.5 }}>
        {etiquette}
      </Texte>
    </View>
  );
}

const s = StyleSheet.create({
  accord: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.feuille100,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: C.blanc,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.papier200,
  },
  parcelle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, borderRadius: 18 },
  icone: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.feuille100, alignItems: 'center', justifyContent: 'center' },
});
