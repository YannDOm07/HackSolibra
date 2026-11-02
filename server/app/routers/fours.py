import asyncio

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config
from ..cuisson import simuler_profil
from ..db import get_db
from ..models import STATUTS_LOT, Cuisson, Four, Lot, Mesure
from ..schemas import CuissonDetail, CuissonOut, CuissonStart, FourOut, MesureIn, MesureOut, SimulationStart
from ..services import appliquer_statut, cuisson_detail, finaliser_cuisson
from ..temps_reel import executer_simulation, hub, simulations
from ..utils import utcnow
from . import obtenir_ou_404

router = APIRouter(tags=["fours"])


def cuisson_active(db: Session, four_id: str) -> Cuisson | None:
    return db.scalars(select(Cuisson).where(Cuisson.four_id == four_id, Cuisson.statut == "en_cours")).first()


def four_out(db: Session, four: Four) -> FourOut:
    etat = hub.etat.get(four.id)
    if etat is None and (c := cuisson_active(db, four.id)):
        etat = {"cuisson_id": c.id, "temp": None, "phase": None, "source": c.source}
    etat = etat or {}
    return FourOut.model_validate(four).model_copy(update={
        "cuisson_active_id": etat.get("cuisson_id"), "derniere_temp": etat.get("temp"),
        "phase": etat.get("phase"), "source": etat.get("source"),
    })


def _lier_lot(db: Session, lot_id: str | None, four_id: str) -> Lot | None:
    if not lot_id:
        return None
    lot = obtenir_ou_404(db, Lot, lot_id, "Lot")
    lot.four_id = four_id
    if STATUTS_LOT.index(lot.statut) < STATUTS_LOT.index("cuisson"):
        appliquer_statut(lot, "cuisson")
    return lot


# ---------- Fours ----------
@router.get("/fours", response_model=list[FourOut])
def lister_fours(db: Session = Depends(get_db)):
    return [four_out(db, f) for f in db.scalars(select(Four).order_by(Four.code)).all()]


@router.get("/fours/{fid}", response_model=FourOut)
def lire_four(fid: str, db: Session = Depends(get_db)):
    return four_out(db, obtenir_ou_404(db, Four, fid, "Four"))


@router.post("/fours/{fid}/simulation", response_model=CuissonOut, status_code=201)
async def lancer_simulation(fid: str, data: SimulationStart, db: Session = Depends(get_db)):
    """Démarre une cuisson simulée et diffuse sa courbe en direct (démonstrations)."""
    obtenir_ou_404(db, Four, fid, "Four")
    if fid in simulations or cuisson_active(db, fid):
        raise HTTPException(409, "Une cuisson est déjà en cours sur ce four.")
    lot = _lier_lot(db, data.lot_id, fid)
    c = Cuisson(four_id=fid, lot_id=lot.id if lot else None, source="simulation", demo=True, debut=utcnow())
    db.add(c)
    db.commit()
    profil = simuler_profil(pas_s=10)
    simulations[fid] = asyncio.create_task(executer_simulation(c.id, profil, data.vitesse or config.SIM_SPEED))
    await hub.diffuser({"type": "cuisson_demarree", "four_id": fid, "cuisson_id": c.id, "source": "simulation"})
    return c


# ---------- Cuissons ----------
@router.get("/cuissons", response_model=list[CuissonOut])
def lister_cuissons(four_id: str | None = None, statut: str | None = None, limite: int = 50, db: Session = Depends(get_db)):
    stmt = select(Cuisson).order_by(Cuisson.debut.desc()).limit(min(limite, 500))
    if four_id:
        stmt = stmt.where(Cuisson.four_id == four_id)
    if statut:
        stmt = stmt.where(Cuisson.statut == statut)
    return db.scalars(stmt).all()


@router.post("/cuissons", response_model=CuissonOut, status_code=201)
async def demarrer_cuisson(data: CuissonStart, db: Session = Depends(get_db)):
    """Cuisson réelle : les mesures arriveront du capteur ESP32 monté sur le four."""
    obtenir_ou_404(db, Four, data.four_id, "Four")
    if data.four_id in simulations or cuisson_active(db, data.four_id):
        raise HTTPException(409, "Une cuisson est déjà en cours sur ce four.")
    lot = _lier_lot(db, data.lot_id, data.four_id)
    c = Cuisson(four_id=data.four_id, lot_id=lot.id if lot else None, source="capteur", debut=utcnow())
    db.add(c)
    db.commit()
    await hub.diffuser({"type": "cuisson_demarree", "four_id": data.four_id, "cuisson_id": c.id, "source": "capteur"})
    return c


@router.get("/cuissons/{cid}", response_model=CuissonDetail)
def lire_cuisson(cid: str, db: Session = Depends(get_db)):
    return cuisson_detail(db, obtenir_ou_404(db, Cuisson, cid, "Cuisson"))


@router.get("/cuissons/{cid}/mesures")
def mesures_cuisson(cid: str, apres_s: float = -1, db: Session = Depends(get_db)):
    """Points (secondes, °C) d'une cuisson, pour rattraper le direct en cours de route."""
    c = obtenir_ou_404(db, Cuisson, cid, "Cuisson")
    rows = db.execute(select(Mesure.t, Mesure.temp_c).where(Mesure.cuisson_id == cid).order_by(Mesure.t)).all()
    return [[(t - c.debut).total_seconds(), temp] for t, temp in rows if (t - c.debut).total_seconds() > apres_s]


@router.post("/cuissons/{cid}/terminer", response_model=CuissonOut)
async def terminer_cuisson(cid: str, db: Session = Depends(get_db)):
    c = obtenir_ou_404(db, Cuisson, cid, "Cuisson")
    if c.statut == "terminee":
        return c
    if (tache := simulations.get(c.four_id)) is not None:
        tache.cancel()  # la tâche finalise elle-même la cuisson
        try:
            await tache
        except asyncio.CancelledError:
            pass
        db.refresh(c)
        return c
    finaliser_cuisson(db, c)
    db.commit()
    await hub.cuisson_terminee(c.four_id, c.id)
    return c


# ---------- Mesures des capteurs ----------
@router.post("/mesures")
async def recevoir_mesure(data: MesureIn, x_device_key: str = Header(default=""), db: Session = Depends(get_db)):
    if x_device_key != config.DEVICE_KEY:
        raise HTTPException(401, "Clé de capteur invalide.")
    four = db.scalars(select(Four).where(Four.device_id == data.device_id)).first()
    c = cuisson_active(db, four.id) if four else None
    t = data.t or utcnow()
    db.add(Mesure(device_id=data.device_id, four_id=four.id if four else None, cuisson_id=c.id if c else None,
                  t=t, temp_c=data.temp_c, temp_interne_c=data.temp_interne_c, source="capteur"))
    db.commit()
    if c is None:
        # Capteur non associé à une cuisson : mode vérification / étalonnage.
        await hub.diffuser({"type": "mesure_libre", "device_id": data.device_id, "temp": data.temp_c,
                            "temp_interne": data.temp_interne_c, "four_id": four.id if four else None})
        return {"ok": True, "cuisson_id": None, "phase": None}
    phase = await hub.nouvelle_mesure(four.id, c.id, (t - c.debut).total_seconds(), data.temp_c, "capteur")
    return {"ok": True, "cuisson_id": c.id, "phase": phase}


@router.get("/mesures/recentes", response_model=list[MesureOut])
def mesures_recentes(device_id: str | None = None, limite: int = 120, db: Session = Depends(get_db)):
    stmt = select(Mesure).order_by(Mesure.t.desc()).limit(min(limite, 2000))
    if device_id:
        stmt = stmt.where(Mesure.device_id == device_id)
    else:
        stmt = stmt.where(Mesure.source == "capteur")
    return list(reversed(db.scalars(stmt).all()))
