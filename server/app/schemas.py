from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, PlainSerializer

from .utils import to_naive_utc


def _iso_utc(dt: datetime) -> str:
    return dt.replace(tzinfo=timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


# Toutes les dates sortent en ISO 8601 UTC (« …Z ») et sont stockées en UTC naïf.
UTC = Annotated[datetime, AfterValidator(to_naive_utc), PlainSerializer(_iso_utc, return_type=str)]

Statut = Literal["collecte", "sechage", "cuisson", "enrichissement", "epandu"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Producteurs & parcelles ----------
class ProducteurIn(BaseModel):
    id: str | None = None
    code: str | None = None
    nom: str = Field(min_length=2, max_length=120)
    village: str = Field(min_length=2, max_length=80)
    telephone: str | None = None
    genre: Literal["F", "M"] | None = None
    consentement: bool = False
    maj_le: UTC | None = None


class ProducteurOut(ORM):
    id: str
    code: str
    nom: str
    village: str
    telephone: str | None
    genre: str | None
    consentement: bool
    cree_le: UTC
    maj_le: UTC
    demo: bool
    nb_parcelles: int = 0
    nb_lots: int = 0
    biochar_kg: float = 0.0
    co2_kg: float = 0.0


class ParcelleIn(BaseModel):
    id: str | None = None
    producteur_id: str
    nom: str = Field(min_length=1, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    surface_ha: float | None = Field(default=None, ge=0)
    polygone_geojson: str | None = None
    maj_le: UTC | None = None


class ParcelleOut(ORM):
    id: str
    producteur_id: str
    nom: str
    latitude: float
    longitude: float
    surface_ha: float | None
    polygone_geojson: str | None
    maj_le: UTC
    demo: bool


# ---------- Fours & cuissons ----------
class FourOut(ORM):
    id: str
    code: str
    nom: str
    village: str
    latitude: float
    longitude: float
    type: str
    volume_l: int | None
    operateurs: int
    device_id: str | None
    demo: bool
    cuisson_active_id: str | None = None
    derniere_temp: float | None = None
    phase: str | None = None
    source: str | None = None


class AnalyseOut(BaseModel):
    phase: str
    duree_min: float
    duree_carbonisation_min: float
    temp_max: float | None
    temp_retenue: float | None
    couches: int
    classe: str
    phases: list[dict]
    alertes: list[str]


class CuissonOut(ORM):
    id: str
    lot_id: str | None
    four_id: str
    source: str
    statut: str
    debut: UTC
    fin: UTC | None
    temp_max: float | None
    temp_retenue: float | None
    duree_min: float | None
    duree_carbonisation_min: float | None
    couches: int | None
    classe: str | None
    demo: bool


class CuissonDetail(CuissonOut):
    analyse: AnalyseOut
    courbe: list[tuple[float, float]]  # (minutes depuis le début, °C), sous-échantillonnée


class CuissonStart(BaseModel):
    four_id: str
    lot_id: str | None = None


class SimulationStart(BaseModel):
    lot_id: str | None = None
    vitesse: float | None = Field(default=None, gt=0, le=200)


class MesureIn(BaseModel):
    device_id: str = Field(min_length=1, max_length=64)
    temp_c: float
    temp_interne_c: float | None = None
    t: UTC | None = None  # facultatif : l'ESP32 n'a pas toujours l'heure


class MesureOut(ORM):
    t: UTC
    temp_c: float
    temp_interne_c: float | None
    device_id: str
    cuisson_id: str | None
    source: str


# ---------- Lots ----------
class LotIn(BaseModel):
    id: str | None = None
    code: str | None = None
    producteur_id: str
    parcelle_id: str | None = None
    four_id: str | None = None
    parcelle_destination_id: str | None = None
    statut: Statut = "collecte"
    masse_cabosses_kg: float | None = Field(default=None, ge=0)
    masse_seche_kg: float | None = Field(default=None, ge=0)
    masse_biochar_kg: float | None = Field(default=None, ge=0)
    collecte_le: UTC | None = None
    sechage_le: UTC | None = None
    cuisson_le: UTC | None = None
    enrichissement_le: UTC | None = None
    epandage_le: UTC | None = None
    notes: str | None = None
    maj_le: UTC | None = None


class LotPatch(BaseModel):
    four_id: str | None = None
    parcelle_destination_id: str | None = None
    statut: Statut | None = None
    masse_cabosses_kg: float | None = Field(default=None, ge=0)
    masse_seche_kg: float | None = Field(default=None, ge=0)
    masse_biochar_kg: float | None = Field(default=None, ge=0)
    notes: str | None = None


class LotOut(ORM):
    id: str
    code: str
    producteur_id: str
    parcelle_id: str | None
    four_id: str | None
    parcelle_destination_id: str | None
    statut: str
    masse_cabosses_kg: float | None
    masse_seche_kg: float | None
    masse_biochar_kg: float | None
    collecte_le: UTC | None
    sechage_le: UTC | None
    cuisson_le: UTC | None
    enrichissement_le: UTC | None
    epandage_le: UTC | None
    notes: str | None
    cree_le: UTC
    maj_le: UTC
    demo: bool
    producteur_nom: str | None = None
    village: str | None = None
    four_code: str | None = None
    classe: str | None = None
    rendement: float | None = None
    co2_kg: float = 0.0


class Etape(BaseModel):
    cle: Statut
    libelle: str
    date: UTC | None
    faite: bool


class Passeport(BaseModel):
    lot: LotOut
    producteur: ProducteurOut
    parcelle: ParcelleOut | None
    parcelle_destination: ParcelleOut | None
    four: FourOut | None
    cuisson: CuissonDetail | None
    etapes: list[Etape]
    carbone: dict
    verification: dict


# ---------- Impact & rapports ----------
class Impact(BaseModel):
    donnees_demo: bool
    periode: dict
    cabosses_kg: float
    matiere_seche_kg: float
    biochar_kg: float
    co2_kg: float
    rendement_moyen: float | None
    producteurs: int
    productrices: int
    parcelles: int
    surface_ha: float
    hectares_amendes: float
    fours: int
    emplois_jeunes: int
    cuissons: int
    lots_par_statut: dict[str, int]
    classes: dict[str, int]
    serie_hebdo: list[dict]


# ---------- Synchronisation ----------
class SyncIn(BaseModel):
    depuis: UTC | None = None
    producteurs: list[ProducteurIn] = []
    parcelles: list[ParcelleIn] = []
    lots: list[LotIn] = []


class SyncOut(BaseModel):
    heure_serveur: UTC
    appliques: dict[str, int]
    rejets: list[dict]
    producteurs: list[ProducteurOut]
    parcelles: list[ParcelleOut]
    lots: list[LotOut]
    fours: list[FourOut]
