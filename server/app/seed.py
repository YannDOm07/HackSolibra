"""Jeu de données de démonstration.

Tout ce qui est créé ici est fictif et marqué demo=True : les interfaces l'affichent comme tel.
Les villages existent (zone cacaoyère de l'Agnéby-Tiassa) mais producteurs, parcelles et lots sont inventés.

Usage : python -m app.seed   (réinitialise la base)
"""
import random
from datetime import timedelta

from sqlalchemy import insert
from sqlalchemy.orm import Session

from .cuisson import simuler_profil
from .db import Base, SessionLocal, engine
from .models import STATUTS_LOT, Cuisson, Four, Lot, Mesure, Parcelle, Producteur
from .references import HUMIDITE_CABOSSE_FRAICHE, RENDEMENT_SIMULATION
from .services import CHAMP_DATE_STATUT, appliquer_statut, finaliser_cuisson
from .utils import short_code, utcnow

VILLAGES = {
    "Azaguié": (5.6297, -4.0822),
    "Agboville": (5.9281, -4.2132),
    "Rubino": (6.0667, -4.3167),
}
FOURS = [
    ("KC-F01", "Four d'Azaguié", "Azaguié", "esp32-f01", 3),
    ("KC-F02", "Four d'Agboville", "Agboville", "esp32-f02", 3),
    ("KC-F03", "Four de Rubino", "Rubino", "esp32-f03", 2),
]
PRODUCTEURS = [
    ("Kouassi Konan Joseph", "M", "Azaguié"), ("Adjoua N'Guessan", "F", "Azaguié"),
    ("Yao Kouadio Firmin", "M", "Azaguié"), ("Aminata Koné", "F", "Azaguié"),
    ("Koffi Brou Hervé", "M", "Agboville"), ("Affoué Kouamé", "F", "Agboville"),
    ("Sékou Ouattara", "M", "Agboville"), ("Akissi Yao Mireille", "F", "Agboville"),
    ("N'Dri Kouakou Paul", "M", "Agboville"), ("Brou Aya Clarisse", "F", "Rubino"),
    ("Assi Gnangoran Marc", "M", "Rubino"), ("Ahou Kouakou Estelle", "F", "Rubino"),
    ("Tra Bi Zah Jean", "M", "Rubino"), ("Kra Amenan Odile", "F", "Rubino"),
]
NOMS_CHAMPS = ["Champ du bas-fond", "Champ de la piste", "Vieux champ", "Champ de la rivière",
               "Champ du carrefour", "Nouveau champ", "Champ derrière l'école"]

# Durées typiques entre deux étapes, en jours.
DELAIS = {"sechage": (0.3, 1.0), "cuisson": (6, 10), "enrichissement": (2, 4), "epandu": (5, 9)}


def generer_demo(db: Session, graine: int = 2026, nb_lots: int = 34) -> None:
    rng = random.Random(graine)
    maintenant = utcnow()

    fours = {}
    for code, nom, village, device, operateurs in FOURS:
        lat, lng = VILLAGES[village]
        f = Four(code=code, nom=nom, village=village, latitude=lat + 0.004, longitude=lng - 0.003,
                 volume_l=1000, operateurs=operateurs, device_id=device, demo=True)
        db.add(f)
        fours[village] = f

    producteurs = []
    for nom, genre, village in PRODUCTEURS:
        p = Producteur(code=short_code("PR"), nom=nom, genre=genre, village=village, consentement=True,
                       telephone=f"+225 07 {rng.randint(10, 99)} {rng.randint(10, 99)} {rng.randint(10, 99)} {rng.randint(10, 99)}",
                       cree_le=maintenant - timedelta(days=rng.randint(60, 90)), demo=True)
        lat0, lng0 = VILLAGES[village]
        for k in range(rng.choice((1, 1, 2))):
            p.parcelles.append(Parcelle(
                nom=rng.choice(NOMS_CHAMPS) if k == 0 else "Champ de la colline",
                latitude=lat0 + rng.uniform(-0.035, 0.035), longitude=lng0 + rng.uniform(-0.035, 0.035),
                surface_ha=round(rng.uniform(1.2, 4.5), 1), demo=True))
        db.add(p)
        producteurs.append(p)
    db.flush()

    for i in range(nb_lots):
        p = rng.choice(producteurs)
        parcelle = rng.choice(p.parcelles)
        # Plus de lots récents : la chaîne doit montrer des lots à chaque étape.
        dates = {"collecte": maintenant - timedelta(days=0.2 + 55 * rng.random() ** 1.8)}
        precedent = dates["collecte"]
        for etape in STATUTS_LOT[1:]:
            precedent = precedent + timedelta(days=rng.uniform(*DELAIS[etape]))
            dates[etape] = precedent
        statut = [s for s in STATUTS_LOT if dates[s] <= maintenant][-1]

        frais = round(rng.uniform(600, 1300), 0)
        lot = Lot(code=short_code("KC"), producteur=p, parcelle=parcelle, masse_cabosses_kg=frais, demo=True,
                  masse_seche_kg=round(frais * (1 - HUMIDITE_CABOSSE_FRAICHE), 1))
        for s in STATUTS_LOT[: STATUTS_LOT.index(statut) + 1]:
            setattr(lot, CHAMP_DATE_STATUT[s], dates[s])
        db.add(lot)

        if STATUTS_LOT.index(statut) >= STATUTS_LOT.index("cuisson"):
            four = fours[p.village]
            lot.four = four
            lot.masse_biochar_kg = round(lot.masse_seche_kg * rng.uniform(*RENDEMENT_SIMULATION), 1)
            c = Cuisson(four=four, lot=lot, source="simulation", debut=dates["cuisson"], demo=True)
            db.add(c)
            db.flush()
            profil = simuler_profil(graine=graine * 1000 + i, pas_s=15)
            db.execute(insert(Mesure), [
                {"device_id": four.device_id, "four_id": four.id, "cuisson_id": c.id,
                 "t": c.debut + timedelta(seconds=t), "temp_c": temp, "source": "simulation"}
                for t, temp in profil
            ])
            finaliser_cuisson(db, c, fin=c.debut + timedelta(seconds=profil[-1][0]))

        appliquer_statut(lot, statut, quand=dates[statut])
        lot.maj_le = maintenant
    db.commit()


if __name__ == "__main__":
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        generer_demo(session)
    print("Base réinitialisée avec les données de démonstration.")
