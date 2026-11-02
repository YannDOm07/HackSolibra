import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from .. import carbone, config
from ..db import get_db
from ..models import Lot, Producteur
from ..references import REFERENCES
from ..schemas import Impact
from ..services import LIBELLES_STATUT, charger_lots, lot_out, resume_impact
from ..utils import utcnow

router = APIRouter(tags=["impact"])


@router.get("/health")
def sante():
    return {"ok": True, "version": config.VERSION}


@router.get("/meta")
def meta(db: Session = Depends(get_db)):
    return {
        "version": config.VERSION,
        "donnees_demo": bool(db.scalar(select(exists().where(Producteur.demo.is_(True))))),
        "methode": carbone.METHODE,
        "statuts": [{"cle": k, "libelle": v} for k, v in LIBELLES_STATUT.items()],
        "references": REFERENCES,
    }


@router.get("/impact", response_model=Impact)
def impact(debut: datetime | None = None, fin: datetime | None = None, db: Session = Depends(get_db)):
    return resume_impact(db, debut, fin)


@router.get("/rapports/trimestriel")
def rapport_trimestriel(annee: int, trimestre: int, db: Session = Depends(get_db)):
    """Indicateurs exigés par l'article 10 du règlement (rapports trimestriels à SOLIBRA et au MINETE)."""
    if trimestre not in (1, 2, 3, 4):
        raise HTTPException(422, "Le trimestre doit être compris entre 1 et 4.")
    debut = datetime(annee, 3 * trimestre - 2, 1)
    fin = datetime(annee + 1, 1, 1) if trimestre == 4 else datetime(annee, 3 * trimestre + 1, 1)
    lots = db.scalars(charger_lots(db).where(Lot.collecte_le >= debut, Lot.collecte_le < fin).order_by(Lot.collecte_le)).all()
    alertes = [
        {"lot": l.code, "cuisson": c.id, "alerte": a}
        for l in lots for c in l.cuissons if c.alertes for a in json.loads(c.alertes)
    ]
    return {
        "titre": f"Rapport trimestriel T{trimestre} {annee}",
        "periode": {"debut": debut.date().isoformat(), "fin": fin.date().isoformat()},
        "genere_le": utcnow().isoformat(timespec="seconds") + "Z",
        "indicateurs": resume_impact(db, debut, fin),
        "lots": [lot_out(l) for l in lots],
        "alertes": alertes,
        "methode": carbone.METHODE,
    }
