"""Synchronisation de l'application mobile, conçue pour un usage majoritairement hors connexion.

Le téléphone envoie tout ce qu'il a créé ou modifié depuis sa dernière synchro, puis reçoit
en retour tout ce qui a changé côté serveur. En cas de conflit, la version la plus récente gagne.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import STATUTS_LOT, Four, Lot, Parcelle, Producteur
from ..schemas import SyncIn, SyncOut
from ..services import appliquer_statut, charger_lots, lot_out, producteur_out
from ..utils import utcnow
from . import code_unique
from .fours import four_out

router = APIRouter(tags=["synchronisation"])


def _plus_recent(existant, entrant_maj) -> bool:
    return existant is None or entrant_maj is None or entrant_maj >= existant.maj_le


@router.post("/sync", response_model=SyncOut)
def synchroniser(data: SyncIn, db: Session = Depends(get_db)):
    appliques = {"producteurs": 0, "parcelles": 0, "lots": 0}
    rejets: list[dict] = []
    maintenant = utcnow()

    for p in data.producteurs:
        existant = db.get(Producteur, p.id) if p.id else None
        if not _plus_recent(existant, p.maj_le):
            rejets.append({"type": "producteur", "id": p.id, "raison": "version plus récente sur le serveur"})
            continue
        champs = p.model_dump(exclude={"id", "code", "maj_le"})
        if existant is None:
            existant = Producteur(id=p.id, code=p.code or code_unique(db, Producteur, "PR"))
            db.add(existant)
        for k, v in champs.items():
            setattr(existant, k, v)
        existant.maj_le = maintenant
        appliques["producteurs"] += 1
    db.flush()

    for pa in data.parcelles:
        existante = db.get(Parcelle, pa.id) if pa.id else None
        if not _plus_recent(existante, pa.maj_le):
            rejets.append({"type": "parcelle", "id": pa.id, "raison": "version plus récente sur le serveur"})
            continue
        if db.get(Producteur, pa.producteur_id) is None:
            rejets.append({"type": "parcelle", "id": pa.id, "raison": "producteur inconnu"})
            continue
        if existante is None:
            existante = Parcelle(id=pa.id)
            db.add(existante)
        for k, v in pa.model_dump(exclude={"id", "maj_le"}).items():
            setattr(existante, k, v)
        existante.maj_le = maintenant
        appliques["parcelles"] += 1
    db.flush()

    for l in data.lots:
        existant = db.get(Lot, l.id) if l.id else None
        if not _plus_recent(existant, l.maj_le):
            rejets.append({"type": "lot", "id": l.id, "raison": "version plus récente sur le serveur"})
            continue
        if db.get(Producteur, l.producteur_id) is None:
            rejets.append({"type": "lot", "id": l.id, "raison": "producteur inconnu"})
            continue
        if existant is None:
            existant = Lot(id=l.id, code=l.code or code_unique(db, Lot, "KC"), statut="collecte")
            db.add(existant)
        for k, v in l.model_dump(exclude={"id", "code", "statut", "maj_le"}, exclude_none=True).items():
            setattr(existant, k, v)
        # Un lot ne recule jamais d'étape : le serveur peut l'avoir fait avancer (fin de cuisson).
        if STATUTS_LOT.index(l.statut) >= STATUTS_LOT.index(existant.statut):
            appliquer_statut(existant, l.statut)
        existant.maj_le = maintenant
        appliques["lots"] += 1
    db.commit()

    depuis = data.depuis
    def modifies(modele):
        stmt = select(modele)
        return stmt.where(modele.maj_le > depuis) if depuis else stmt

    lots = db.scalars(charger_lots(db).where(Lot.maj_le > depuis) if depuis else charger_lots(db)).all()
    return {
        "heure_serveur": maintenant,
        "appliques": appliques,
        "rejets": rejets,
        "producteurs": [producteur_out(p) for p in db.scalars(modifies(Producteur)).all()],
        "parcelles": db.scalars(modifies(Parcelle)).all(),
        "lots": [lot_out(x) for x in lots],
        "fours": [four_out(db, f) for f in db.scalars(select(Four)).all()],
    }
