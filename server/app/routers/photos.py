from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import UPLOAD_DIR
from ..db import get_db
from ..models import Lot, Photo
from ..utils import new_id
from . import obtenir_ou_404

router = APIRouter(prefix="/photos", tags=["photos"])

TYPES = {"cabosses", "four", "biochar", "parcelle", "diagnostic"}
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
TAILLE_MAX = 12 * 1024 * 1024


def _url(p: Photo) -> str:
    return f"/media/{Path(p.chemin).name}"


@router.post("", status_code=201)
async def envoyer_photo(
    fichier: UploadFile = File(...),
    type: str = Form(...),
    lot_id: str | None = Form(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    db: Session = Depends(get_db),
):
    if type not in TYPES:
        raise HTTPException(422, f"Type de photo inconnu : {type}.")
    ext = Path(fichier.filename or "").suffix.lower() or ".jpg"
    if ext not in EXTENSIONS:
        raise HTTPException(422, "Format d'image non pris en charge.")
    if lot_id:
        obtenir_ou_404(db, Lot, lot_id, "Lot")
    contenu = await fichier.read()
    if len(contenu) > TAILLE_MAX:
        raise HTTPException(413, "Photo trop lourde (12 Mo maximum).")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    pid = new_id()
    chemin = UPLOAD_DIR / f"{pid}{ext}"
    chemin.write_bytes(contenu)
    photo = Photo(id=pid, lot_id=lot_id, type=type, chemin=str(chemin), latitude=latitude, longitude=longitude)
    db.add(photo)
    db.commit()
    return {"id": pid, "url": _url(photo), "type": type, "lot_id": lot_id}


@router.get("")
def lister_photos(lot_id: str | None = None, db: Session = Depends(get_db)):
    stmt = select(Photo).order_by(Photo.prise_le.desc())
    if lot_id:
        stmt = stmt.where(Photo.lot_id == lot_id)
    return [{"id": p.id, "url": _url(p), "type": p.type, "lot_id": p.lot_id,
             "latitude": p.latitude, "longitude": p.longitude, "prise_le": p.prise_le.isoformat() + "Z"}
            for p in db.scalars(stmt).all()]
