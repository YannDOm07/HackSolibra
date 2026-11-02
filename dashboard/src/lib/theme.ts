import type { Statut } from './types'

// Couleurs des étapes validées (luminosité, saturation, daltonisme, contraste) sur fond sombre et clair.
export const ETAPES: Record<Statut, { libelle: string; couleur: string }> = {
  collecte: { libelle: 'Collecte', couleur: '#B07A20' },
  sechage: { libelle: 'Séchage', couleur: '#408FBA' },
  cuisson: { libelle: 'Pyrolyse', couleur: '#DE602F' },
  enrichissement: { libelle: 'Enrichissement', couleur: '#954E87' },
  epandu: { libelle: 'Retour au sol', couleur: '#348F4F' },
}

export const PHASES: Record<string, { libelle: string; couleur: string }> = {
  en_attente: { libelle: 'En attente', couleur: '#7A736A' },
  allumage: { libelle: 'Allumage', couleur: '#E3AE4A' },
  carbonisation: { libelle: 'Pyrolyse', couleur: '#F2652A' },
  extinction: { libelle: 'Extinction', couleur: '#408FBA' },
  terminee: { libelle: 'Terminée', couleur: '#3D8C5F' },
}

export const CLASSES: Record<string, { libelle: string; court: string }> = {
  haute: { libelle: 'Haute température (> 600 °C)', court: 'Haute' },
  moyenne: { libelle: 'Température moyenne (450–600 °C)', court: 'Moyenne' },
  basse: { libelle: 'Basse température (350–450 °C)', court: 'Basse' },
  insuffisante: { libelle: 'Carbonisation insuffisante (< 350 °C)', court: 'Insuffisante' },
  inconnue: { libelle: 'Température non mesurée', court: '—' },
}

export const COULEURS = {
  braise: '#F2652A',
  braiseClair: '#FFB37A',
  feuille: '#3D8C5F',
  feuilleClair: '#8CC3A0',
  grille: '#2E2A25',
  axe: '#7A736A',
  surface: '#181613',
}
