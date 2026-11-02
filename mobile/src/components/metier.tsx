import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, CloudUpload, Cpu, Users } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { dateHeure, ilYa, initiales, masseTexte, nombre, temperature } from '@/lib/format';
import type { EtatFourDirect } from '@/lib/store';
import { C, CLASSES, ETAPES, PHASES, R } from '@/lib/theme';
import type { Four, Lot, Producteur, Statut } from '@/lib/types';

import { Pulsation } from './courbe';
import { BadgeCapteur, BadgeDemo, BadgeSimulation, Texte } from './ui';

// ---------- Étapes ----------
export function PastilleEtape({ statut }: { statut: Statut }) {
  const e = ETAPES[statut];
  return (
    <View style={[s.etape, { backgroundColor: e.fond }]}>
      <View style={[s.etapePoint, { backgroundColor: e.couleur }]} />
      <Texte v="petitFort" c={C.charbon800} style={{ fontSize: 12 }}>
        {e.libelle}
      </Texte>
    </View>
  );
}

export function Frise({ etapes }: { etapes: { cle: Statut; libelle: string; date: string | null; faite: boolean }[] }) {
  const courante = [...etapes].reverse().find((e) => e.faite)?.cle;
  return (
    <View>
      {etapes.map((e, i) => {
        const couleur = ETAPES[e.cle].couleur;
        const derniere = i === etapes.length - 1;
        const estCourante = e.cle === courante;
        return (
          <View key={e.cle} style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ alignItems: 'center', width: 22 }}>
              <View
                style={[
                  s.friseRond,
                  e.faite ? { backgroundColor: couleur, borderColor: couleur } : { backgroundColor: C.blanc, borderColor: C.papier300 },
                  estCourante && { transform: [{ scale: 1.15 }] },
                ]}
              >
                {estCourante && <View style={s.friseCoeur} />}
              </View>
              {!derniere && <View style={[s.friseTrait, { backgroundColor: etapes[i + 1].faite ? couleur : C.papier200 }]} />}
            </View>
            <View style={{ flex: 1, paddingBottom: derniere ? 0 : 20, marginTop: -2 }}>
              <Texte v={estCourante ? 'corpsFort' : 'corpsMoyen'} c={e.faite ? C.charbon900 : C.charbon400}>
                {e.libelle}
              </Texte>
              <Texte v="mono" c={C.charbon400} style={{ fontSize: 12, marginTop: 2 }}>
                {e.date ? dateHeure(e.date) : 'à venir'}
              </Texte>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---------- Lots ----------
export function LigneLot({ lot, enAttente, onPress }: { lot: Lot; enAttente?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.ligne, pressed && s.presse]}>
      <View style={[s.barre, { backgroundColor: ETAPES[lot.statut].couleur }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Texte v="mono" style={{ fontSize: 14 }}>
            {lot.code}
          </Texte>
          {enAttente && <CloudUpload size={14} color={C.braise600} strokeWidth={2.2} />}
        </View>
        <Texte v="petit" c={C.charbon500} numberOfLines={1}>
          {lot.producteur_nom ?? '—'} · {lot.village ?? ''}
        </Texte>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <PastilleEtape statut={lot.statut} />
        <Texte v="mono" c={C.charbon500} style={{ fontSize: 12 }}>
          {lot.masse_biochar_kg ? `${masseTexte(lot.masse_biochar_kg)} biochar` : `${masseTexte(lot.masse_cabosses_kg)} cabosses`}
        </Texte>
      </View>
      <ChevronRight size={18} color={C.charbon300} />
    </Pressable>
  );
}

// ---------- Producteurs ----------
const TEINTES = [C.cabosse500, C.feuille600, C.ardoise500, C.cacao500, C.braise600];
export const teinte = (texte: string) => TEINTES[[...texte].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TEINTES.length];

export function Avatar({ nom, taille = 44 }: { nom: string; taille?: number }) {
  return (
    <View style={[s.avatar, { width: taille, height: taille, borderRadius: taille / 2, backgroundColor: teinte(nom) }]}>
      <Texte v="petitFort" c="#FFF9F2" style={{ fontSize: taille * 0.34 }}>
        {initiales(nom)}
      </Texte>
    </View>
  );
}

export function LigneProducteur({ producteur, onPress }: { producteur: Producteur; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.ligne, pressed && s.presse]}>
      <Avatar nom={producteur.nom} />
      <View style={{ flex: 1, gap: 2 }}>
        <Texte v="corpsFort" numberOfLines={1}>
          {producteur.nom}
        </Texte>
        <Texte v="petit" c={C.charbon500}>
          {producteur.village} · {producteur.nb_parcelles ?? 0} parcelle{(producteur.nb_parcelles ?? 0) > 1 ? 's' : ''}
        </Texte>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Texte v="mono" style={{ fontSize: 13 }}>
          {masseTexte(producteur.biochar_kg ?? 0)}
        </Texte>
        <Texte v="etiquette" c={C.charbon400} style={{ fontSize: 9 }}>
          biochar
        </Texte>
      </View>
    </Pressable>
  );
}

// ---------- Fours ----------
export function CarteFour({ four, etat, onPress, etroite }: { four: Four; etat?: EtatFourDirect; onPress: () => void; etroite?: boolean }) {
  const actif = !!etat || !!four.cuisson_active_id;
  const temp = etat?.temp ?? four.derniere_temp;
  const phase = PHASES[etat?.phase ?? four.phase ?? 'en_attente'] ?? PHASES.en_attente;
  const source = etat?.source ?? four.source;

  if (!actif) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.four, etroite && s.fourEtroit, pressed && s.presse]}>
        <View style={s.fourTete}>
          <Texte v="mono" c={C.charbon500} style={{ fontSize: 12 }}>
            {four.code}
          </Texte>
          {four.demo && <BadgeDemo />}
        </View>
        <Texte v="intertitre" style={{ marginTop: 10 }}>
          {four.nom}
        </Texte>
        <Texte v="petit" c={C.charbon500}>
          {four.derniere_cuisson_le ? `Au repos · dernière cuisson ${ilYa(new Date(four.derniere_cuisson_le).getTime())}` : 'Au repos'}
        </Texte>
        {four.derniere_classe && four.derniere_classe !== 'inconnue' && CLASSES[four.derniere_classe] && four.derniere_temp_retenue != null && (
          <View style={s.derniere}>
            <View style={[s.etapePoint, { backgroundColor: CLASSES[four.derniere_classe].couleur }]} />
            <Texte v="petitFort" c={C.charbon700} style={{ fontSize: 12 }}>
              Classe {CLASSES[four.derniere_classe].court.toLowerCase()} · {temperature(four.derniere_temp_retenue)}
            </Texte>
          </View>
        )}
        <View style={s.fourPied}>
          <View style={s.fourInfo}>
            <Users size={13} color={C.charbon400} />
            <Texte v="petit" c={C.charbon500}>
              {four.operateurs} opérateurs
            </Texte>
          </View>
          {four.device_id && (
            <View style={s.fourInfo}>
              <Cpu size={13} color={C.charbon400} />
              <Texte v="mono" c={C.charbon500} style={{ fontSize: 11 }}>
                {four.device_id}
              </Texte>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.four, s.fourActif, etroite && s.fourEtroit, pressed && s.presse]}>
      <LinearGradient
        colors={['rgba(242,101,42,0)', 'rgba(242,101,42,0.16)', 'rgba(212,78,23,0.42)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.fourTete}>
        <Texte v="mono" c={C.charbon300} style={{ fontSize: 12 }}>
          {four.code}
        </Texte>
        {source === 'simulation' ? <BadgeSimulation sombre /> : <BadgeCapteur sombre />}
      </View>
      <Texte v="intertitre" c={C.papier50} style={{ marginTop: 10 }}>
        {four.nom}
      </Texte>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
        <TemperatureDirecte valeur={temp} />
        <Texte v="monoL" c={C.braise300} style={{ fontSize: 18 }}>
          °C
        </Texte>
      </View>
      <View style={[s.fourInfo, { marginTop: 4 }]}>
        <Pulsation couleur={phase.couleur} />
        <Texte v="petitFort" c={C.papier100}>
          {phase.libelle}
        </Texte>
      </View>
    </Pressable>
  );
}

/** Chiffre qui glisse en douceur vers la nouvelle mesure au lieu de sauter. */
export function TemperatureDirecte({ valeur, grand }: { valeur: number | null | undefined; grand?: boolean }) {
  const affiche = useNombreAnime(valeur ?? 0, 420);
  return (
    <Texte v="monoXL" c={C.braise300} style={grand ? { fontSize: 76, lineHeight: 80, letterSpacing: -3 } : { fontSize: 38, lineHeight: 42 }}>
      {valeur == null ? '—' : nombre(affiche)}
    </Texte>
  );
}

export function useNombreAnime(cible: number, duree = 900): number {
  const [valeur, setValeur] = useState(cible);
  const depart = useRef(cible);
  useEffect(() => {
    const debut = Date.now();
    const de = depart.current;
    let image = 0;
    const pas = () => {
      const p = Math.min(1, (Date.now() - debut) / duree);
      const v = de + (cible - de) * (1 - Math.pow(1 - p, 3));
      depart.current = v;
      setValeur(v);
      if (p < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    // Filet de sécurité : la valeur finale s'affiche même si les images d'animation sont suspendues.
    const garde = setTimeout(() => {
      depart.current = cible;
      setValeur(cible);
    }, duree + 80);
    return () => {
      cancelAnimationFrame(image);
      clearTimeout(garde);
    };
  }, [cible, duree]);
  return valeur;
}

const s = StyleSheet.create({
  etape: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  etapePoint: { width: 7, height: 7, borderRadius: 4 },
  friseRond: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  friseCoeur: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF9F2' },
  friseTrait: { width: 2, flex: 1, marginVertical: 3, borderRadius: 1 },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.blanc,
    borderRadius: R.md + 2,
    borderWidth: 1,
    borderColor: C.papier200,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  presse: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  barre: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  four: {
    backgroundColor: C.blanc,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.papier200,
    padding: 18,
    minHeight: 168,
    overflow: 'hidden',
  },
  fourEtroit: { width: 230 },
  fourActif: { backgroundColor: C.charbon900, borderColor: C.charbon800 },
  fourTete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fourPied: { marginTop: 'auto', paddingTop: 16, gap: 6 },
  fourInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  derniere: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.papier100,
  },
});
