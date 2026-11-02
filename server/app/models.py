"""Modèle de données. Les identifiants sont des UUID générés côté client ou serveur,
ce qui permet à l'application mobile de créer des fiches hors connexion."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base
from .utils import new_id, utcnow

STATUTS_LOT = ("collecte", "sechage", "cuisson", "enrichissement", "epandu")


class Producteur(Base):
    __tablename__ = "producteurs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(16), unique=True)
    nom: Mapped[str] = mapped_column(String(120))
    village: Mapped[str] = mapped_column(String(80))
    telephone: Mapped[str | None] = mapped_column(String(32))
    genre: Mapped[str | None] = mapped_column(String(1))
    # Accord du producteur pour l'enregistrement de ses données (loi n° 2013-450).
    consentement: Mapped[bool] = mapped_column(Boolean, default=False)
    cree_le: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    maj_le: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    demo: Mapped[bool] = mapped_column(Boolean, default=False)

    parcelles: Mapped[list["Parcelle"]] = relationship(back_populates="producteur")
    lots: Mapped[list["Lot"]] = relationship(back_populates="producteur")


class Parcelle(Base):
    __tablename__ = "parcelles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    producteur_id: Mapped[str] = mapped_column(ForeignKey("producteurs.id"), index=True)
    nom: Mapped[str] = mapped_column(String(120))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    surface_ha: Mapped[float | None] = mapped_column(Float)
    polygone_geojson: Mapped[str | None] = mapped_column(Text)
    cree_le: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    maj_le: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    demo: Mapped[bool] = mapped_column(Boolean, default=False)

    producteur: Mapped[Producteur] = relationship(back_populates="parcelles")


class Four(Base):
    __tablename__ = "fours"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(16), unique=True)
    nom: Mapped[str] = mapped_column(String(120))
    village: Mapped[str] = mapped_column(String(80))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    type: Mapped[str] = mapped_column(String(60), default="Rideau de flamme")
    volume_l: Mapped[int | None] = mapped_column(Integer)
    operateurs: Mapped[int] = mapped_column(Integer, default=2)
    # Identifiant de la carte ESP32 montée sur ce four.
    device_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    maj_le: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    demo: Mapped[bool] = mapped_column(Boolean, default=False)


class Lot(Base):
    __tablename__ = "lots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(16), unique=True)
    producteur_id: Mapped[str] = mapped_column(ForeignKey("producteurs.id"), index=True)
    parcelle_id: Mapped[str | None] = mapped_column(ForeignKey("parcelles.id"))
    four_id: Mapped[str | None] = mapped_column(ForeignKey("fours.id"))
    parcelle_destination_id: Mapped[str | None] = mapped_column(ForeignKey("parcelles.id"))
    statut: Mapped[str] = mapped_column(String(16), default="collecte", index=True)

    masse_cabosses_kg: Mapped[float | None] = mapped_column(Float)  # cabosses fraîches pesées à la collecte
    masse_seche_kg: Mapped[float | None] = mapped_column(Float)  # matière sèche enfournée
    masse_biochar_kg: Mapped[float | None] = mapped_column(Float)  # biochar séché, pesé après extinction

    collecte_le: Mapped[datetime | None] = mapped_column(DateTime)
    sechage_le: Mapped[datetime | None] = mapped_column(DateTime)
    cuisson_le: Mapped[datetime | None] = mapped_column(DateTime)
    enrichissement_le: Mapped[datetime | None] = mapped_column(DateTime)
    epandage_le: Mapped[datetime | None] = mapped_column(DateTime)

    notes: Mapped[str | None] = mapped_column(Text)
    cree_le: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    maj_le: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    demo: Mapped[bool] = mapped_column(Boolean, default=False)

    producteur: Mapped[Producteur] = relationship(back_populates="lots")
    parcelle: Mapped[Parcelle | None] = relationship(foreign_keys=[parcelle_id])
    parcelle_destination: Mapped[Parcelle | None] = relationship(foreign_keys=[parcelle_destination_id])
    four: Mapped[Four | None] = relationship()
    cuissons: Mapped[list["Cuisson"]] = relationship(back_populates="lot", order_by="Cuisson.debut")


class Cuisson(Base):
    """Une fournée. Les champs d'analyse sont un cache recalculé à la fin de la cuisson."""

    __tablename__ = "cuissons"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    lot_id: Mapped[str | None] = mapped_column(ForeignKey("lots.id"), index=True)
    four_id: Mapped[str] = mapped_column(ForeignKey("fours.id"), index=True)
    source: Mapped[str] = mapped_column(String(12), default="capteur")  # "capteur" | "simulation"
    statut: Mapped[str] = mapped_column(String(12), default="en_cours")  # "en_cours" | "terminee"
    debut: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    fin: Mapped[datetime | None] = mapped_column(DateTime)

    temp_max: Mapped[float | None] = mapped_column(Float)
    temp_retenue: Mapped[float | None] = mapped_column(Float)
    duree_min: Mapped[float | None] = mapped_column(Float)
    duree_carbonisation_min: Mapped[float | None] = mapped_column(Float)
    couches: Mapped[int | None] = mapped_column(Integer)
    classe: Mapped[str | None] = mapped_column(String(14))
    alertes: Mapped[str | None] = mapped_column(Text)  # JSON
    maj_le: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    demo: Mapped[bool] = mapped_column(Boolean, default=False)

    lot: Mapped[Lot | None] = relationship(back_populates="cuissons")
    four: Mapped[Four] = relationship()


class Mesure(Base):
    __tablename__ = "mesures"
    __table_args__ = (Index("ix_mesures_cuisson_t", "cuisson_id", "t"), Index("ix_mesures_device_t", "device_id", "t"))

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(64))
    four_id: Mapped[str | None] = mapped_column(ForeignKey("fours.id"))
    cuisson_id: Mapped[str | None] = mapped_column(ForeignKey("cuissons.id"))
    t: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    temp_c: Mapped[float] = mapped_column(Float)
    temp_interne_c: Mapped[float | None] = mapped_column(Float)  # soudure froide du MAX31855
    source: Mapped[str] = mapped_column(String(12), default="capteur")


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    lot_id: Mapped[str | None] = mapped_column(ForeignKey("lots.id"), index=True)
    type: Mapped[str] = mapped_column(String(16))  # cabosses | four | biochar | parcelle | diagnostic
    chemin: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    prise_le: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Diagnostic(Base):
    """Résultat du modèle de vision sur une photo de cabosse (étape IA)."""

    __tablename__ = "diagnostics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    photo_id: Mapped[str | None] = mapped_column(ForeignKey("photos.id"))
    parcelle_id: Mapped[str | None] = mapped_column(ForeignKey("parcelles.id"), index=True)
    etiquette: Mapped[str] = mapped_column(String(32))
    confiance: Mapped[float] = mapped_column(Float)
    scores_json: Mapped[str | None] = mapped_column(Text)
    modele: Mapped[str] = mapped_column(String(64))
    cree_le: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    demo: Mapped[bool] = mapped_column(Boolean, default=False)
