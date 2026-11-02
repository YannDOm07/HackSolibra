from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import STATUTS_LOT, Four, Lot, Parcelle, Producteur
from ..schemas import LotIn, LotOut, LotPatch, Passeport
from ..services import appliquer_statut, charger_lots, lot_out, passeport
from ..utils import utcnow
from . import code_unique, obtenir_ou_404

router = APIRouter(prefix="/lots", tags=["lots"])


def _lot(db: Session, lid: str) -> Lot:
    lot = db.scalars(charger_lots(db).where(Lot.id == lid)).first()
    if lot is None:
        raise HTTPException(404, "Lot introuvable.")
    return lot


@router.get("", response_model=list[LotOut])
def lister_lots(statut: str | None = None, producteur_id: str | None = None, four_id: str | None = None,
                limite: int = 200, db: Session = Depends(get_db)):
    stmt = charger_lots(db).order_by(Lot.maj_le.desc()).limit(min(limite, 1000))
    if statut:
        stmt = stmt.where(Lot.statut == statut)
    if producteur_id:
        stmt = stmt.where(Lot.producteur_id == producteur_id)
    if four_id:
        stmt = stmt.where(Lot.four_id == four_id)
    return [lot_out(l) for l in db.scalars(stmt).all()]


@router.post("", response_model=LotOut, status_code=201)
def creer_lot(data: LotIn, db: Session = Depends(get_db)):
    if data.id and db.get(Lot, data.id):
        return lot_out(_lot(db, data.id))
    obtenir_ou_404(db, Producteur, data.producteur_id, "Producteur")
    if data.parcelle_id:
        obtenir_ou_404(db, Parcelle, data.parcelle_id, "Parcelle")
    if data.four_id:
        obtenir_ou_404(db, Four, data.four_id, "Four")
    lot = Lot(**data.model_dump(exclude={"code", "statut", "maj_le"}, exclude_none=True),
              code=data.code or code_unique(db, Lot, "KC"))
    appliquer_statut(lot, data.statut, quand=data.collecte_le or utcnow())
    db.add(lot)
    db.commit()
    return lot_out(_lot(db, lot.id))


@router.get("/code/{code}", response_model=Passeport)
def passeport_par_code(code: str, db: Session = Depends(get_db)):
    lot = db.scalars(charger_lots(db).where(Lot.code == code.upper())).first()
    if lot is None:
        raise HTTPException(404, "Aucun lot ne porte ce code.")
    return passeport(db, lot)


@router.get("/{lid}", response_model=LotOut)
def lire_lot(lid: str, db: Session = Depends(get_db)):
    return lot_out(_lot(db, lid))


@router.patch("/{lid}", response_model=LotOut)
def modifier_lot(lid: str, data: LotPatch, db: Session = Depends(get_db)):
    lot = _lot(db, lid)
    champs = data.model_dump(exclude_unset=True)
    statut = champs.pop("statut", None)
    for k, v in champs.items():
        setattr(lot, k, v)
    if statut and STATUTS_LOT.index(statut) != STATUTS_LOT.index(lot.statut):
        appliquer_statut(lot, statut)
    lot.maj_le = utcnow()
    db.commit()
    return lot_out(_lot(db, lid))


@router.get("/{lid}/passeport", response_model=Passeport)
def lire_passeport(lid: str, db: Session = Depends(get_db)):
    return passeport(db, _lot(db, lid))
