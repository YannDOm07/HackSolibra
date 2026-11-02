// Charte « Terre & Braise » : mêmes valeurs que design/tokens.json.
import type { Statut } from './types';

export const C = {
  charbon950: '#100F0D',
  charbon900: '#181613',
  charbon800: '#221F1B',
  charbon700: '#2E2A25',
  charbon600: '#3D3832',
  charbon500: '#57514A',
  charbon400: '#7A736A',
  charbon300: '#A39B90',
  papier50: '#FBF8F3',
  papier100: '#F5EFE6',
  papier200: '#EBE2D5',
  papier300: '#DDD1C0',
  blanc: '#FFFDFA',
  braise300: '#FFB37A',
  braise400: '#FF8A4C',
  braise500: '#F2652A',
  braise600: '#D44E17',
  braise700: '#A93C10',
  cabosse300: '#F0C977',
  cabosse400: '#E3AE4A',
  cabosse500: '#C98F2A',
  cabosse600: '#A07020',
  cacao500: '#6E4127',
  cacao700: '#4A2A18',
  feuille100: '#E2EFE6',
  feuille300: '#8CC3A0',
  feuille500: '#3D8C5F',
  feuille600: '#2F7049',
  feuille700: '#235538',
  ardoise500: '#4C7A99',
  danger: '#C8402B',
} as const;

export const F = {
  titreXL: 'BricolageGrotesque_800ExtraBold',
  titre: 'BricolageGrotesque_700Bold',
  titreSemi: 'BricolageGrotesque_600SemiBold',
  texte: 'IBMPlexSans_400Regular',
  texteMoyen: 'IBMPlexSans_500Medium',
  texteFort: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMoyen: 'IBMPlexMono_500Medium',
  monoFort: 'IBMPlexMono_600SemiBold',
} as const;

export const R = { sm: 8, md: 14, lg: 22, xl: 32 } as const;

// Couleurs des étapes validées (daltonisme, contraste) sur fond clair et sombre : design/tokens.json.
export const ETAPES: Record<Statut, { libelle: string; action: string; couleur: string; fond: string }> = {
  collecte: { libelle: 'Collecte', action: 'Collecté', couleur: '#B07A20', fond: '#F6ECDA' },
  sechage: { libelle: 'Séchage', action: 'Au séchage', couleur: '#408FBA', fond: '#E2EEF6' },
  cuisson: { libelle: 'Pyrolyse', action: 'Au four', couleur: '#DE602F', fond: '#FBE5DC' },
  enrichissement: { libelle: 'Enrichissement', action: 'Enrichi', couleur: '#954E87', fond: '#F2E5EF' },
  epandu: { libelle: 'Retour au sol', action: 'Épandu', couleur: '#348F4F', fond: '#E1EFE5' },
};

export const PHASES: Record<string, { libelle: string; couleur: string }> = {
  en_attente: { libelle: 'En attente', couleur: C.charbon400 },
  allumage: { libelle: 'Allumage', couleur: C.cabosse500 },
  carbonisation: { libelle: 'Carbonisation', couleur: C.braise500 },
  extinction: { libelle: 'Extinction', couleur: C.ardoise500 },
  terminee: { libelle: 'Terminée', couleur: C.feuille500 },
};

export const CLASSES: Record<string, { libelle: string; court: string; couleur: string }> = {
  haute: { libelle: 'Haute température (> 600 °C)', court: 'Haute', couleur: C.feuille600 },
  moyenne: { libelle: 'Température moyenne (450–600 °C)', court: 'Moyenne', couleur: C.cabosse600 },
  basse: { libelle: 'Basse température (350–450 °C)', court: 'Basse', couleur: C.braise600 },
  insuffisante: { libelle: 'Carbonisation insuffisante', court: 'Insuffisante', couleur: C.danger },
  inconnue: { libelle: 'Température non mesurée', court: '—', couleur: C.charbon400 },
};

// Teneur en eau des cabosses fraîches retenue par la plateforme (docs/references.md, §2).
export const HUMIDITE_CABOSSE = 0.85;
