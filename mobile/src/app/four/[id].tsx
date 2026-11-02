import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Cpu, Flame, Users } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CarteFour } from '@/components/metier';
import { BadgeCapteur, BadgeDemo, BadgeSimulation, Bouton, Carte, Choix, Ecran, EnTete, Section, Texte } from '@/components/ui';
import { api } from '@/lib/api';
import { dateHeure, duree, temperature } from '@/lib/format';
import { useEtat } from '@/lib/store';
import { synchroniser } from '@/lib/synchro';
import { C, CLASSES } from '@/lib/theme';
import type { Cuisson } from '@/lib/types';

export default function FicheFour() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const four = useEtat((e) => e.fours[id]);
  const etat = useEtat((e) => e.direct.fours[id]);
  const lotsParId = useEtat((e) => e.lots);
  const sales = useEtat((e) => e.sales);
  const notifier = useEtat((e) => e.notifier);
  const [historique, setHistorique] = useState<Cuisson[] | null>(null);
  const [lotId, setLotId] = useState<string>('aucun');
  const [mode, setMode] = useState<'simulation' | 'capteur'>('simulation');
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    api.cuissonsDuFour(id).then(setHistorique).catch(() => setHistorique([]));
  }, [id, etat?.cuisson_id]);

  // Lots prêts à enfourner, ceux du village du four en premier.
  const candidats = useMemo(
    () =>
      Object.values(lotsParId)
        .filter((l) => l.statut === 'sechage')
        .sort((a, b) => Number(b.village === four?.village) - Number(a.village === four?.village)),
    [lotsParId, four?.village],
  );

  if (!four) {
    return (
      <Ecran>
        <EnTete retour titre="Four introuvable" />
      </Ecran>
    );
  }

  const actif = etat?.cuisson_id ?? four.cuisson_active_id;

  const allumer = async () => {
    setCharge(true);
    try {
      const lot = lotId === 'aucun' ? undefined : lotId;
      // Le lot doit exister côté serveur avant de lui rattacher une cuisson.
      if (lot && sales[`lots:${lot}`]) await synchroniser();
      const c = mode === 'simulation' ? await api.simulerCuisson(four.id, lot) : await api.demarrerCuisson(four.id, lot);
      router.replace(`/cuisson/${c.id}`);
    } catch (e) {
      notifier((e as Error).message, 'erreur');
    } finally {
      setCharge(false);
    }
  };

  return (
    <Ecran>
      <EnTete retour surtitre={`${four.code} · ${four.village}`} titre={four.nom} droite={four.demo ? <BadgeDemo /> : undefined} />

      {actif ? (
        <>
          <CarteFour four={four} etat={etat} onPress={() => router.push(`/cuisson/${actif}`)} />
          <Bouton titre="Suivre la cuisson en direct" icone={Flame} ton="braise" onPress={() => router.push(`/cuisson/${actif}`)} style={{ marginTop: 14 }} />
        </>
      ) : (
        <Carte>
          <Texte v="intertitre">Lancer une cuisson</Texte>
          <Texte v="etiquette" c={C.charbon500} style={{ marginTop: 18, marginBottom: 10 }}>
            Lot à enfourner
          </Texte>
          <Choix
            valeur={lotId}
            onChange={setLotId}
            options={[
              ...candidats.slice(0, 8).map((l) => ({ valeur: l.id, libelle: l.code, detail: l.producteur_nom ?? undefined })),
              { valeur: 'aucun', libelle: 'Essai sans lot' },
            ]}
          />
          {candidats.length === 0 && (
            <Texte v="petit" c={C.charbon400} style={{ marginTop: 8 }}>
              Aucun lot au séchage pour l'instant.
            </Texte>
          )}
          <Texte v="etiquette" c={C.charbon500} style={{ marginTop: 18, marginBottom: 10 }}>
            Source des températures
          </Texte>
          <Choix
            valeur={mode}
            onChange={setMode}
            options={[
              { valeur: 'capteur', libelle: 'Capteur du four', detail: four.device_id ?? 'non équipé' },
              { valeur: 'simulation', libelle: 'Simulation', detail: 'démonstration' },
            ]}
          />
          <Bouton titre="Allumer le four" icone={Flame} ton="braise" charge={charge} onPress={allumer} style={{ marginTop: 20 }} />
          {mode === 'simulation' && (
            <Texte v="petit" c={C.charbon400} style={{ marginTop: 10 }}>
              La simulation rejoue une cuisson réaliste en accéléré ; elle reste marquée « simulation » partout.
            </Texte>
          )}
        </Carte>
      )}

      <Section titre="Fiche du four">
        <Carte>
          <Info icone={Flame} etiquette="Type" valeur={four.type} />
          <Info icone={Users} etiquette="Opérateurs formés" valeur={`${four.operateurs} jeunes`} />
          <Info icone={Cpu} etiquette="Capteur" valeur={four.device_id ?? 'aucun'} mono />
        </Carte>
      </Section>

      <Section titre="Dernières cuissons">
        {historique === null ? (
          <Texte v="petit" c={C.charbon400}>
            Chargement…
          </Texte>
        ) : historique.length === 0 ? (
          <Texte v="petit" c={C.charbon400}>
            Aucune cuisson enregistrée.
          </Texte>
        ) : (
          historique.map((c) => (
            <Pressable key={c.id} onPress={() => router.push(`/cuisson/${c.id}`)} style={({ pressed }) => [s.cuisson, pressed && { opacity: 0.7 }]}>
              <View style={{ flex: 1, gap: 3 }}>
                <Texte v="petitFort">{dateHeure(c.debut)}</Texte>
                <Texte v="mono" c={C.charbon500} style={{ fontSize: 12 }}>
                  {c.statut === 'en_cours' ? 'en cours' : `${duree(c.duree_min)} · ${temperature(c.temp_retenue)}`}
                </Texte>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                {c.source === 'simulation' ? <BadgeSimulation /> : <BadgeCapteur />}
                {c.classe && (
                  <Texte v="petitFort" c={CLASSES[c.classe]?.couleur ?? C.charbon500} style={{ fontSize: 12 }}>
                    {CLASSES[c.classe]?.court ?? c.classe}
                  </Texte>
                )}
              </View>
              <ChevronRight size={18} color={C.charbon300} />
            </Pressable>
          ))
        )}
      </Section>
    </Ecran>
  );
}

function Info({ icone: Icone, etiquette, valeur, mono }: { icone: typeof Flame; etiquette: string; valeur: string; mono?: boolean }) {
  return (
    <View style={s.info}>
      <Icone size={16} color={C.charbon400} />
      <Texte v="petit" c={C.charbon500} style={{ flex: 1 }}>
        {etiquette}
      </Texte>
      <Texte v={mono ? 'mono' : 'petitFort'} style={mono ? { fontSize: 12.5 } : undefined}>
        {valeur}
      </Texte>
    </View>
  );
}

const s = StyleSheet.create({
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.papier100 },
  cuisson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.papier200,
    padding: 14,
    marginBottom: 8,
  },
});
