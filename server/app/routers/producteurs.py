from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Lot, Parcelle, Producteur
from ..schemas import ParcelleIn, ParcelleOut, ProducteurIn, ProducteurOut
from ..services import producteur_out
from ..utils import utcnow
from . import code_unique, obtenir_ou_404

router = APIRouter(tags=["producteurs"])


def _requete():
    return select(Producteur).options(
        selectinload(Producteur.parcelles), selectinload(Producteur.lots).selectinload(Lot.cuissons)
    )


@router.get("/producteurs", response_model=list[ProducteurOut])
def lister_producteurs(village: str | None = None, q: str | None = None, db: Session = Depends(get_db)):
    stmt = _requete().order_by(Producteur.nom)
    if village:
        stmt = stmt.where(Producteur.village == village)
    if q:
        stmt = stmt.where(Producteur.nom.ilike(f"%{q}%"))
    return [producteur_out(p) for p in db.scalars(stmt).all()]


@router.get("/producteurs/{pid}", response_model=ProducteurOut)
def lire_producteur(pid: str, db: Session = Depends(get_db)):
    return producteur_out(obtenir_ou_404(db, Producteur, pid, "Producteur"))


@router.post("/producteurs", response_model=ProducteurOut, status_code=201)
def creer_producteur(data: ProducteurIn, db: Session = Depends(get_db)):
    # Idempotent : l'application mobile peut renvoyer une fiche déjà reçue.
    if data.id and (existant := db.get(Producteur, data.id)):
        return producteur_out(existant)
    p = Producteur(**data.model_dump(exclude={"code", "maj_le"}, exclude_none=True),
                   code=data.code or code_unique(db, Producteur, "PR"), maj_le=utcnow())
    db.add(p)
    db.commit()
    return producteur_out(p)


@router.get("/parcelles", response_model=list[ParcelleOut])
def lister_parcelles(producteur_id: str | None = None, db: Session = Depends(get_db)):
    stmt = select(Parcelle).order_by(Parcelle.nom)
    if producteur_id:
        stmt = stmt.where(Parcelle.producteur_id == producteur_id)
    return db.scalars(stmt).all()


@router.post("/parcelles", response_model=ParcelleOut, status_code=201)
def creer_parcelle(data: ParcelleIn, db: Session = Depends(get_db)):
    if data.id and (existante := db.get(Parcelle, data.id)):
        return existante
    obtenir_ou_404(db, Producteur, data.producteur_id, "Producteur")
    p = Parcelle(**data.model_dump(exclude={"maj_le"}, exclude_none=True), maj_le=utcnow())
    db.add(p)
    db.commit()
    return p
