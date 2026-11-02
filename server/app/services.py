"""Logique métier partagée par les routes : bilans, impact, passeport des lots."""
import hashlib
import json
from collections import Counter
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from . import carbone
from .cuisson import analyser
from .models import STATUTS_LOT, Cuisson, Four, Lot, Mesure, Parcelle, Producteur
from .schemas import CuissonDetail, CuissonOut, FourOut, LotOut, ParcelleOut, ProducteurOut
from .utils import utcnow

LIBELLES_STATUT = {
    "collecte": "Collecte des cabosses",
    "sechage": "Séchage solaire",
    "cuisson": "Pyrolyse au four",
    "enrichissement": "Enrichissement",
    "epandu": "Retour au sol",
}
CHAMP_DATE_STATUT = {
    "collecte": "collecte_le",
    "sechage": "sechage_le",
    "cuisson": "cuisson_le",
    "enrichissement": "enrichissement_le",
    "epandu": "epandage_le",
}


# ---------- Cuissons ----------
def points_cuisson(db: Session, cuisson: Cuisson) -> list[tuple[float, float]]:
    rows = db.execute(select(Mesure.t, Mesure.temp_c).where(Mesure.cuisson_id == cuisson.id).order_by(Mesure.t)).all()
    return [((t - cuisson.debut).total_seconds(), temp) for t, temp in rows]


def finaliser_cuisson(db: Session, cuisson: Cuisson, fin: datetime | None = None) -> None:
    a = analyser(points_cuisson(db, cuisson), terminee=True)
    cuisson.statut = "terminee"
    cuisson.fin = fin or utcnow()
    cuisson.temp_max = a.temp_max
    cuisson.temp_retenue = a.temp_retenue
    cuisson.duree_min = a.duree_min
    cuisson.duree_carbonisation_min = a.duree_carbonisation_min
    cuisson.couches = a.couches
    cuisson.classe = a.classe
    cuisson.alertes = json.dumps(a.alertes, ensure_ascii=False)
    cuisson.maj_le = utcnow()
    if cuisson.lot is not None:
        cuisson.lot.maj_le = utcnow()


def courbe_reduite(points: list[tuple[float, float]], max_points: int = 300) -> list[tuple[float, float]]:
    """Sous-échantillonne en gardant le min et le max de chaque tranche, pour ne pas effacer les creux."""
    if len(points) <= max_points:
        return [(round(t / 60, 2), temp) for t, temp in points]
    taille = len(points) / (max_points / 2)
    out, i = [], 0.0
    while int(i) < len(points):
        tranche = points[int(i):int(i + taille)] or points[int(i):int(i) + 1]
        lo, hi = min(tranche, key=lambda p: p[1]), max(tranche, key=lambda p: p[1])
        out.extend(sorted({lo, hi}))
        i += taille
    return [(round(t / 60, 2), temp) for t, temp in out]


def cuisson_detail(db: Session, cuisson: Cuisson) -> CuissonDetail:
    pts = points_cuisson(db, cuisson)
    a = analyser(pts, terminee=cuisson.statut == "terminee")
    return CuissonDetail(**CuissonOut.model_validate(cuisson).model_dump(), analyse=a.as_dict(), courbe=courbe_reduite(pts))


def derniere_cuisson(lot: Lot) -> Cuisson | None:
    terminees = [c for c in lot.cuissons if c.statut == "terminee"]
    return terminees[-1] if terminees else None


# ---------- Lots ----------
def bilan_lot(lot: Lot) -> carbone.BilanCarbone:
    c = derniere_cuisson(lot)
    classe = c.classe if c and c.classe else "inconnue"
    return carbone.bilan_carbone(lot.masse_biochar_kg, classe)


def rendement(lot: Lot) -> float | None:
    if lot.masse_biochar_kg and lot.masse_seche_kg:
        return round(lot.masse_biochar_kg / lot.masse_seche_kg, 3)
    return None


def lot_out(lot: Lot) -> LotOut:
    b = bilan_lot(lot)
    return LotOut.model_validate(lot).model_copy(update={
        "producteur_nom": lot.producteur.nom if lot.producteur else None,
        "village": lot.producteur.village if lot.producteur else None,
        "four_code": lot.four.code if lot.four else None,
        "classe": b.classe,
        "rendement": rendement(lot),
        "co2_kg": b.co2_kg,
    })


def appliquer_statut(lot: Lot, statut: str, quand: datetime | None = None) -> None:
    """Fait avancer un lot et date chaque étape franchie (sans écraser une date déjà saisie)."""
    quand = quand or utcnow()
    for s in STATUTS_LOT[: STATUTS_LOT.index(statut) + 1]:
        champ = CHAMP_DATE_STATUT[s]
        if getattr(lot, champ) is None:
            setattr(lot, champ, quand)
    lot.statut = statut
    if statut == "epandu" and lot.parcelle_destination_id is None:
        lot.parcelle_destination_id = lot.parcelle_id  # boucle fermée par défaut
    lot.maj_le = utcnow()


def empreinte_lot(lot: Lot, cuisson: Cuisson | None) -> str:
    """Empreinte SHA-256 des données qui fondent le bilan carbone : toute modification la change."""
    contenu = {
        "lot": lot.code,
        "producteur": lot.producteur_id,
        "parcelle": lot.parcelle_id,
        "masses": [lot.masse_cabosses_kg, lot.masse_seche_kg, lot.masse_biochar_kg],
        "dates": [str(getattr(lot, CHAMP_DATE_STATUT[s])) for s in STATUTS_LOT],
        "cuisson": [cuisson.id, cuisson.temp_retenue, cuisson.classe] if cuisson else None,
    }
    return hashlib.sha256(json.dumps(contenu, sort_keys=True).encode()).hexdigest()


def passeport(db: Session, lot: Lot) -> dict:
    c = derniere_cuisson(lot) or (lot.cuissons[-1] if lot.cuissons else None)
    b = bilan_lot(lot)
    nb_mesures = db.scalar(select(func.count()).select_from(Mesure).where(Mesure.cuisson_id == c.id)) if c else 0
    etapes = [
        {"cle": s, "libelle": LIBELLES_STATUT[s], "date": getattr(lot, CHAMP_DATE_STATUT[s]),
         "faite": STATUTS_LOT.index(s) <= STATUTS_LOT.index(lot.statut)}
        for s in STATUTS_LOT
    ]
    return {
        "lot": lot_out(lot),
        "producteur": producteur_out(lot.producteur),
        "parcelle": ParcelleOut.model_validate(lot.parcelle) if lot.parcelle else None,
        "parcelle_destination": ParcelleOut.model_validate(lot.parcelle_destination) if lot.parcelle_destination else None,
        "four": FourOut.model_validate(lot.four) if lot.four else None,
        "cuisson": cuisson_detail(db, c) if c else None,
        "etapes": etapes,
        "carbone": {**b.as_dict(), "libelle_classe": carbone.LIBELLES_CLASSE.get(b.classe), **carbone.METHODE},
        "verification": {
            "source_temperature": c.source if c else None,
            "nb_mesures": nb_mesures,
            "donnees_demo": lot.demo,
            "empreinte_sha256": empreinte_lot(lot, c),
        },
    }


# ---------- Producteurs ----------
def producteur_out(p: Producteur) -> ProducteurOut:
    bilans = [bilan_lot(l) for l in p.lots]
    return ProducteurOut.model_validate(p).model_copy(update={
        "nb_parcelles": len(p.parcelles),
        "nb_lots": len(p.lots),
        "biochar_kg": round(sum(l.masse_biochar_kg or 0 for l in p.lots), 1),
        "co2_kg": round(sum(b.co2_kg for b in bilans), 1),
    })


def charger_lots(db: Session):
    return select(Lot).options(
        selectinload(Lot.producteur).selectinload(Producteur.lots).selectinload(Lot.cuissons),
        selectinload(Lot.producteur).selectinload(Producteur.parcelles),
        selectinload(Lot.parcelle), selectinload(Lot.parcelle_destination),
        selectinload(Lot.four), selectinload(Lot.cuissons),
    )


# ---------- Impact ----------
def resume_impact(db: Session, debut: datetime | None = None, fin: datetime | None = None) -> dict:
    q = charger_lots(db)
    if debut:
        q = q.where(Lot.collecte_le >= debut)
    if fin:
        q = q.where(Lot.collecte_le < fin)
    lots = db.scalars(q).all()
    producteurs = db.scalars(select(Producteur)).all()
    parcelles = db.scalars(select(Parcelle)).all()
    fours = db.scalars(select(Four)).all()

    bilans = {l.id: bilan_lot(l) for l in lots}
    rendements = [r for l in lots if (r := rendement(l)) is not None]
    surfaces = {p.id: p.surface_ha or 0 for p in parcelles}
    amendees = {l.parcelle_destination_id for l in lots if l.statut == "epandu" and l.parcelle_destination_id}
    cuissons = [c for l in lots for c in l.cuissons if c.statut == "terminee"]

    maintenant = utcnow()
    lundi = (maintenant - timedelta(days=maintenant.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    serie = []
    for k in range(9, -1, -1):
        d, f = lundi - timedelta(weeks=k), lundi - timedelta(weeks=k - 1)
        semaine = [l for l in lots if l.cuisson_le and d <= l.cuisson_le < f]
        serie.append({
            "semaine": d.date().isoformat(),
            "biochar_kg": round(sum(l.masse_biochar_kg or 0 for l in semaine), 1),
            "co2_kg": round(sum(bilans[l.id].co2_kg for l in semaine), 1),
            "lots": len(semaine),
        })

    return {
        "donnees_demo": any(l.demo for l in lots) or any(p.demo for p in producteurs),
        "periode": {"debut": debut.isoformat() if debut else None, "fin": fin.isoformat() if fin else None},
        "cabosses_kg": round(sum(l.masse_cabosses_kg or 0 for l in lots), 1),
        "matiere_seche_kg": round(sum(l.masse_seche_kg or 0 for l in lots), 1),
        "biochar_kg": round(sum(l.masse_biochar_kg or 0 for l in lots), 1),
        "co2_kg": round(sum(b.co2_kg for b in bilans.values()), 1),
        "rendement_moyen": round(sum(rendements) / len(rendements), 3) if rendements else None,
        "producteurs": len(producteurs),
        "productrices": sum(1 for p in producteurs if p.genre == "F"),
        "parcelles": len(parcelles),
        "surface_ha": round(sum(surfaces.values()), 1),
        "hectares_amendes": round(sum(surfaces.get(pid, 0) for pid in amendees), 1),
        "fours": len(fours),
        "emplois_jeunes": sum(f.operateurs for f in fours),
        "cuissons": len(cuissons),
        "lots_par_statut": {s: sum(1 for l in lots if l.statut == s) for s in STATUTS_LOT},
        "classes": dict(Counter(c.classe for c in cuissons if c.classe)),
        "serie_hebdo": serie,
    }
