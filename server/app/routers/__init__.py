from fastapi import HTTPException
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from ..utils import short_code


def obtenir_ou_404(db: Session, modele, ident: str, nom: str):
    obj = db.get(modele, ident)
    if obj is None:
        raise HTTPException(404, f"{nom} introuvable.")
    return obj


def code_unique(db: Session, modele, prefixe: str) -> str:
    while True:
        code = short_code(prefixe)
        if not db.scalar(select(exists().where(modele.code == code))):
            return code
