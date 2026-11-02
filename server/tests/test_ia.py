import io

import pytest
from PIL import Image

from app import config
from app.routers import diagnostics

MODELE_PRESENT = (config.IA_DIR / "tete.json").exists()


def _photo(couleur=(120, 80, 40)) -> bytes:
    tampon = io.BytesIO()
    Image.new("RGB", (640, 480), couleur).save(tampon, "JPEG")
    return tampon.getvalue()


def test_diagnostic_sans_modele_installe(client, monkeypatch):
    monkeypatch.setattr(diagnostics, "modele", lambda: None)
    r = client.post("/api/v1/diagnostics", files={"fichier": ("c.jpg", _photo(), "image/jpeg")})
    assert r.status_code == 503
    assert "entrainer.py" in r.json()["detail"]


@pytest.mark.skipif(not MODELE_PRESENT, reason="modèle non entraîné (ia/entrainer.py)")
def test_fichier_qui_n_est_pas_une_image(client):
    r = client.post("/api/v1/diagnostics", files={"fichier": ("faux.jpg", b"pas une image", "image/jpeg")})
    assert r.status_code == 422


@pytest.mark.skipif(not MODELE_PRESENT, reason="modèle non entraîné (ia/entrainer.py)")
def test_diagnostic_complet(client):
    r = client.post("/api/v1/diagnostics", files={"fichier": ("c.jpg", _photo(), "image/jpeg")})
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["etiquette"] in ("healthy", "black_pod_rot", "pod_borer")
    assert sum(d["scores"].values()) == pytest.approx(1, abs=1e-3)
    assert d["conseil"] and d["photo_url"].startswith("/media/")
    assert client.get("/api/v1/diagnostics").json()[0]["id"] == d["id"]
    fiche = client.get("/api/v1/ia/modele").json()
    assert fiche["disponible"] and fiche["test"]["exactitude"] > 0
