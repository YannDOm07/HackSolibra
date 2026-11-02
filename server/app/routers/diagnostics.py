import io
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..ia import modele
from ..models import Diagnostic, Lot, Parcelle, Photo
from . import obtenir_ou_404
from .photos import enregistrer_photo, lire_televersement, url_photo

router = APIRouter(tags=["intelligence artificielle"])


def _modele_ou_503():
    m = modele()
    if m is None:
        raise HTTPException(503, "Modèle de diagnostic non installé : lancer « python entrainer.py » dans le dossier ia/.")
    return m


@router.get("/ia/modele")
def fiche_du_modele():
    """Fiche du modèle : méthode, données d'entraînement, scores réels sur le jeu de test, limites."""
    m = modele()
    if m is None:
        return {"disponible": False}
    return {"disponible": True, "version": m.version, "classes": m.tete["classes"], "libelles": m.tete["libelles"],
            "extracteur": m.tete["extracteur"]["nom"], "seuil_incertitude": m.tete["seuil_incertitude"], **m.metriques}


@router.post("/diagnostics", status_code=201)
async def diagnostiquer(
    fichier: UploadFile = File(...),
    lot_id: str | None = Form(None),
    parcelle_id: str | None = Form(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    db: Session = Depends(get_db),
):
    """Analyse la photo d'une cabosse : saine, pourriture brune ou foreur, avec un niveau de confiance et un conseil."""
    m = _modele_ou_503()
    if lot_id:
        obtenir_ou_404(db, Lot, lot_id, "Lot")
    if parcelle_id:
        obtenir_ou_404(db, Parcelle, parcelle_id, "Parcelle")
    contenu, ext = await lire_televersement(fichier)
    try:
        image = Image.open(io.BytesIO(contenu))
        image.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(422, "Le fichier envoyé n'est pas une image lisible.")
    try:
        resultat = await run_in_threadpool(m.predire, image)
    except RuntimeError as e:
        raise HTTPException(503, str(e))

    photo = enregistrer_photo(db, contenu, ext, "diagnostic", lot_id, latitude, longitude)
    db.flush()  # la photo doit exister en base avant le diagnostic qui la référence
    d = Diagnostic(photo_id=photo.id, parcelle_id=parcelle_id, etiquette=resultat["etiquette"], confiance=resultat["confiance"],
                   scores_json=json.dumps(resultat["scores"]), modele=resultat["modele"])
    db.add(d)
    db.commit()
    return {"id": d.id, "photo_url": url_photo(photo), "cree_le": d.cree_le.isoformat() + "Z", **resultat}


@router.get("/diagnostics")
def lister_diagnostics(limite: int = 30, db: Session = Depends(get_db)):
    rows = db.execute(
        select(Diagnostic, Photo).join(Photo, Diagnostic.photo_id == Photo.id, isouter=True)
        .order_by(Diagnostic.cree_le.desc()).limit(min(limite, 200))
    ).all()
    return [{"id": d.id, "etiquette": d.etiquette, "confiance": d.confiance, "scores": json.loads(d.scores_json or "{}"),
             "modele": d.modele, "parcelle_id": d.parcelle_id, "photo_url": url_photo(p) if p else None,
             "cree_le": d.cree_le.isoformat() + "Z"} for d, p in rows]
