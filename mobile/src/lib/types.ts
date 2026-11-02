// Miroir des schémas de l'API (server/app/schemas.py).

export type Statut = 'collecte' | 'sechage' | 'cuisson' | 'enrichissement' | 'epandu';
export const STATUTS: Statut[] = ['collecte', 'sechage', 'cuisson', 'enrichissement', 'epandu'];

export const CHAMP_DATE: Record<Statut, keyof Lot> = {
  collecte: 'collecte_le',
  sechage: 'sechage_le',
  cuisson: 'cuisson_le',
  enrichissement: 'enrichissement_le',
  epandu: 'epandage_le',
};

export interface Producteur {
  id: string;
  code: string;
  nom: string;
  village: string;
  telephone: string | null;
  genre: 'F' | 'M' | null;
  consentement: boolean;
  cree_le?: string;
  maj_le?: string;
  demo: boolean;
  nb_parcelles?: number;
  nb_lots?: number;
  biochar_kg?: number;
  co2_kg?: number;
}

export interface Parcelle {
  id: string;
  producteur_id: string;
  nom: string;
  latitude: number;
  longitude: number;
  surface_ha: number | null;
  polygone_geojson?: string | null;
  maj_le?: string;
  demo: boolean;
}

export interface Four {
  id: string;
  code: string;
  nom: string;
  village: string;
  latitude: number;
  longitude: number;
  type: string;
  volume_l: number | null;
  operateurs: number;
  device_id: string | null;
  demo: boolean;
  cuisson_active_id: string | null;
  derniere_temp: number | null;
  phase: string | null;
  source: string | null;
}

export interface Lot {
  id: string;
  code: string;
  producteur_id: string;
  parcelle_id: string | null;
  four_id: string | null;
  parcelle_destination_id: string | null;
  statut: Statut;
  masse_cabosses_kg: number | null;
  masse_seche_kg: number | null;
  masse_biochar_kg: number | null;
  collecte_le: string | null;
  sechage_le: string | null;
  cuisson_le: string | null;
  enrichissement_le: string | null;
  epandage_le: string | null;
  notes: string | null;
  cree_le?: string;
  maj_le?: string;
  demo: boolean;
  producteur_nom?: string | null;
  village?: string | null;
  four_code?: string | null;
  classe?: string | null;
  rendement?: number | null;
  co2_kg?: number;
}

export interface Analyse {
  phase: string;
  duree_min: number;
  duree_carbonisation_min: number;
  temp_max: number | null;
  temp_retenue: number | null;
  couches: number;
  classe: string;
  phases: { phase: string; debut_s: number; fin_s: number }[];
  alertes: string[];
}

export interface Cuisson {
  id: string;
  lot_id: string | null;
  four_id: string;
  source: 'capteur' | 'simulation';
  statut: 'en_cours' | 'terminee';
  debut: string;
  fin: string | null;
  temp_max: number | null;
  temp_retenue: number | null;
  duree_min: number | null;
  duree_carbonisation_min: number | null;
  couches: number | null;
  classe: string | null;
  demo: boolean;
}

export interface CuissonDetail extends Cuisson {
  analyse: Analyse;
  courbe: [number, number][]; // (minutes, °C)
}

export interface Passeport {
  lot: Lot;
  producteur: Producteur;
  parcelle: Parcelle | null;
  parcelle_destination: Parcelle | null;
  four: Four | null;
  cuisson: CuissonDetail | null;
  etapes: { cle: Statut; libelle: string; date: string | null; faite: boolean }[];
  carbone: {
    masse_biochar_kg: number;
    f_c: number;
    f_perm: number;
    classe: string;
    co2_kg: number;
    libelle_classe: string | null;
    formule: string;
    reference: string;
    nature: string;
  };
  verification: {
    source_temperature: string | null;
    nb_mesures: number;
    donnees_demo: boolean;
    empreinte_sha256: string;
  };
}

export interface ReponseSync {
  heure_serveur: string;
  appliques: Record<string, number>;
  rejets: { type: string; id: string; raison: string }[];
  producteurs: Producteur[];
  parcelles: Parcelle[];
  lots: Lot[];
  fours: Four[];
}

export interface Reference {
  cle: string;
  valeur: string;
  source: string;
  url: string;
}

export interface Meta {
  version: string;
  donnees_demo: boolean;
  methode: { formule: string; reference: string; nature: string; f_c_defaut: number };
  references: Reference[];
}
