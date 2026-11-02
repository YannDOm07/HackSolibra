// Miroir des schémas de l'API (server/app/schemas.py).
export type Statut = 'collecte' | 'sechage' | 'cuisson' | 'enrichissement' | 'epandu'
export const STATUTS: Statut[] = ['collecte', 'sechage', 'cuisson', 'enrichissement', 'epandu']

export interface Producteur {
  id: string
  code: string
  nom: string
  village: string
  telephone: string | null
  genre: 'F' | 'M' | null
  consentement: boolean
  demo: boolean
  nb_parcelles: number
  nb_lots: number
  biochar_kg: number
  co2_kg: number
}

export interface Parcelle {
  id: string
  producteur_id: string
  nom: string
  latitude: number
  longitude: number
  surface_ha: number | null
  demo: boolean
}

export interface Four {
  id: string
  code: string
  nom: string
  village: string
  latitude: number
  longitude: number
  type: string
  volume_l: number | null
  operateurs: number
  device_id: string | null
  demo: boolean
  cuisson_active_id: string | null
  derniere_temp: number | null
  phase: string | null
  source: string | null
}

export interface Lot {
  id: string
  code: string
  producteur_id: string
  parcelle_id: string | null
  four_id: string | null
  parcelle_destination_id: string | null
  statut: Statut
  masse_cabosses_kg: number | null
  masse_seche_kg: number | null
  masse_biochar_kg: number | null
  collecte_le: string | null
  sechage_le: string | null
  cuisson_le: string | null
  enrichissement_le: string | null
  epandage_le: string | null
  maj_le: string
  demo: boolean
  producteur_nom: string | null
  village: string | null
  four_code: string | null
  classe: string | null
  rendement: number | null
  co2_kg: number
}

export interface Analyse {
  phase: string
  duree_min: number
  duree_carbonisation_min: number
  temp_max: number | null
  temp_retenue: number | null
  couches: number
  classe: string
  phases: { phase: string; debut_s: number; fin_s: number }[]
  alertes: string[]
}

export interface Cuisson {
  id: string
  lot_id: string | null
  four_id: string
  source: 'capteur' | 'simulation'
  statut: 'en_cours' | 'terminee'
  debut: string
  fin: string | null
  temp_retenue: number | null
  duree_min: number | null
  classe: string | null
}

export interface CuissonDetail extends Cuisson {
  analyse: Analyse
  courbe: [number, number][] // (minutes, °C)
}

export interface Passeport {
  lot: Lot
  producteur: Producteur
  parcelle: Parcelle | null
  parcelle_destination: Parcelle | null
  four: Four | null
  cuisson: CuissonDetail | null
  etapes: { cle: Statut; libelle: string; date: string | null; faite: boolean }[]
  carbone: {
    masse_biochar_kg: number
    f_c: number
    f_perm: number
    classe: string
    co2_kg: number
    libelle_classe: string | null
    formule: string
    reference: string
    nature: string
  }
  verification: { source_temperature: string | null; nb_mesures: number; donnees_demo: boolean; empreinte_sha256: string }
}

export interface Impact {
  donnees_demo: boolean
  cabosses_kg: number
  matiere_seche_kg: number
  biochar_kg: number
  co2_kg: number
  rendement_moyen: number | null
  producteurs: number
  productrices: number
  parcelles: number
  surface_ha: number
  hectares_amendes: number
  fours: number
  emplois_jeunes: number
  cuissons: number
  lots_par_statut: Record<Statut, number>
  classes: Record<string, number>
  serie_hebdo: { semaine: string; biochar_kg: number; co2_kg: number; lots: number }[]
}

export interface Rapport {
  titre: string
  periode: { debut: string; fin: string }
  genere_le: string
  indicateurs: Impact
  lots: Lot[]
  alertes: { lot: string; cuisson: string; alerte: string }[]
  methode: { formule: string; reference: string; nature: string; f_c_defaut: number; table_f_perm: Record<string, number> }
}

export interface Photo {
  id: string
  url: string
  type: string
  lot_id: string | null
  prise_le: string
}

export type ClasseCabosse = 'healthy' | 'black_pod_rot' | 'pod_borer'

export interface Evaluation {
  n: number
  exactitude: number
  exactitude_equilibree: number
  f1_macro: number
  par_classe: Record<ClasseCabosse, { precision: number; rappel: number; f1: number; effectif: number }>
  matrice_confusion: number[][]
  part_jugee_sure: number
  exactitude_si_sure: number
}

export interface FicheModele {
  disponible: boolean
  version?: string
  classes?: ClasseCabosse[]
  libelles?: Record<ClasseCabosse, string>
  extracteur?: string
  seuil_incertitude?: number
  methode?: string
  date?: string
  jeu_de_donnees?: { nom: string; auteur: string; source: string; licence: string; origine: string; effectifs: Record<ClasseCabosse, number> }
  decoupage?: { graine: number; entrainement: number; validation: number; test: number }
  augmentation?: string
  test?: Evaluation
  quasi_doublons?: { seuil_similarite_cosinus: number; photos_test_concernees: number; test_sans_quasi_doublons: Evaluation | null }
}

export interface DiagnosticIA {
  id: string
  etiquette: ClasseCabosse
  confiance: number
  scores: Record<ClasseCabosse, number>
  modele: string
  photo_url: string | null
  cree_le: string
}

export interface Reference {
  cle: string
  valeur: string
  source: string
  url: string
}

export interface Meta {
  version: string
  donnees_demo: boolean
  methode: { formule: string; reference: string; nature: string; f_c_defaut: number; f_c_justification: string; table_f_perm: Record<string, number> }
  references: Reference[]
}
