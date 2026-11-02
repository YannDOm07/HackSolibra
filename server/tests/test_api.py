import time
import uuid

from app import config


def test_meta_et_donnees_demo(client):
    r = client.get("/api/v1/meta")
    assert r.status_code == 200
    assert r.json()["donnees_demo"] is True
    assert "F_C" in r.json()["methode"]["formule"]


def test_impact_coherent(client):
    i = client.get("/api/v1/impact").json()
    assert i["producteurs"] == 14
    assert i["biochar_kg"] > 0 and i["co2_kg"] > 0
    assert i["co2_kg"] < i["biochar_kg"] * 0.5 * 0.89 * 44 / 12 + 1
    assert sum(i["lots_par_statut"].values()) == 34
    assert len(i["serie_hebdo"]) == 10


def test_parcours_complet_d_un_lot(client):
    p = client.post("/api/v1/producteurs", json={"nom": "Producteur Test", "village": "Azaguié", "consentement": True}).json()
    pa = client.post("/api/v1/parcelles", json={"producteur_id": p["id"], "nom": "Champ test",
                                                "latitude": 5.63, "longitude": -4.08, "surface_ha": 2}).json()
    lot = client.post("/api/v1/lots", json={"producteur_id": p["id"], "parcelle_id": pa["id"],
                                            "masse_cabosses_kg": 500, "masse_seche_kg": 100}).json()
    assert lot["code"].startswith("KC-") and lot["statut"] == "collecte"

    four = client.get("/api/v1/fours").json()[0]
    # Vitesse de simulation fixée par KABOCHAR_SIM_SPEED (conftest).
    c = client.post(f"/api/v1/fours/{four['id']}/simulation", json={"lot_id": lot["id"]}).json()
    for _ in range(100):
        if client.get(f"/api/v1/cuissons/{c['id']}").json()["statut"] == "terminee":
            break
        time.sleep(0.1)
    detail = client.get(f"/api/v1/cuissons/{c['id']}").json()
    assert detail["statut"] == "terminee" and detail["classe"] in ("haute", "moyenne")

    client.patch(f"/api/v1/lots/{lot['id']}", json={"masse_biochar_kg": 25, "statut": "epandu"})
    pp = client.get(f"/api/v1/lots/code/{lot['code']}").json()
    assert pp["lot"]["statut"] == "epandu"
    assert pp["parcelle_destination"]["id"] == pa["id"]  # boucle fermée par défaut
    assert all(e["faite"] and e["date"] for e in pp["etapes"])
    assert pp["carbone"]["co2_kg"] > 0
    assert len(pp["verification"]["empreinte_sha256"]) == 64


def test_capteur_refuse_sans_cle(client):
    r = client.post("/api/v1/mesures", json={"device_id": "esp32-f01", "temp_c": 25})
    assert r.status_code == 401


def test_capteur_reel_alimente_la_cuisson(client):
    four = next(f for f in client.get("/api/v1/fours").json() if f["device_id"] == "esp32-f02")
    c = client.post("/api/v1/cuissons", json={"four_id": four["id"]}).json()
    h = {"X-Device-Key": config.DEVICE_KEY}
    r = client.post("/api/v1/mesures", headers=h, json={"device_id": "esp32-f02", "temp_c": 512.5, "temp_interne_c": 31})
    assert r.json()["cuisson_id"] == c["id"]
    client.post(f"/api/v1/cuissons/{c['id']}/terminer")
    assert client.get(f"/api/v1/cuissons/{c['id']}").json()["statut"] == "terminee"
    libre = client.post("/api/v1/mesures", headers=h, json={"device_id": "esp32-banc", "temp_c": 99.6}).json()
    assert libre["cuisson_id"] is None


def test_synchro_hors_ligne(client):
    pid, lid = str(uuid.uuid4()), str(uuid.uuid4())
    r = client.post("/api/v1/sync", json={
        "producteurs": [{"id": pid, "nom": "Saisi hors ligne", "village": "Rubino", "consentement": True}],
        "lots": [{"id": lid, "producteur_id": pid, "masse_cabosses_kg": 420, "statut": "sechage"}],
    }).json()
    assert r["appliques"] == {"producteurs": 1, "parcelles": 0, "lots": 1}
    lot = next(l for l in r["lots"] if l["id"] == lid)
    assert lot["statut"] == "sechage" and lot["code"].startswith("KC-")
    # Renvoyer la même fiche ne crée pas de doublon.
    client.post("/api/v1/sync", json={"lots": [{"id": lid, "producteur_id": pid, "statut": "sechage"}]})
    assert sum(1 for l in client.get("/api/v1/lots", params={"producteur_id": pid}).json()) == 1


def test_rapport_trimestriel(client):
    r = client.get("/api/v1/rapports/trimestriel", params={"annee": 2026, "trimestre": 4}).json()
    assert r["titre"] == "Rapport trimestriel T4 2026"
    assert r["indicateurs"]["donnees_demo"] is True
