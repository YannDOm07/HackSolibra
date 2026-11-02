import pytest

from app.carbone import bilan_carbone, classe_temperature
from app.cuisson import analyser, simuler_profil


@pytest.mark.parametrize("temp,classe", [(None, "inconnue"), (320, "insuffisante"), (350, "basse"),
                                         (449.9, "basse"), (450, "moyenne"), (600, "moyenne"), (600.1, "haute")])
def test_classes_de_temperature(temp, classe):
    assert classe_temperature(temp) == classe


def test_bilan_carbone_suit_la_formule_du_giec():
    b = bilan_carbone(100, "haute", f_c=0.5)
    assert b.co2_kg == pytest.approx(100 * 0.5 * 0.89 * 44 / 12, abs=0.01)
    assert bilan_carbone(100, "insuffisante").co2_kg == 0
    assert bilan_carbone(None, "haute").co2_kg == 0


@pytest.mark.parametrize("graine", range(12))
def test_analyse_retrouve_les_phases_d_une_cuisson_simulee(graine):
    a = analyser(simuler_profil(graine, pas_s=10), terminee=True)
    assert a.phase == "terminee"
    assert [p["phase"] for p in a.phases] == ["allumage", "carbonisation", "extinction"]
    assert a.classe in ("haute", "moyenne")
    assert 50 < a.duree_carbonisation_min < 120
    assert a.couches >= 5
    assert a.alertes == []


def test_cuisson_trop_froide_est_signalee():
    pts = [(t, 30 + t / 10) for t in range(0, 3600, 10)]  # monte lentement, plafonne vers 390 °C
    a = analyser(pts, terminee=True)
    assert a.classe == "insuffisante"
    assert any("450 °C" in x for x in a.alertes)


def test_valeurs_aberrantes_ignorees():
    pts = simuler_profil(1, pas_s=10)
    pts[50] = (pts[50][0], 9999.0)
    a = analyser(pts, terminee=True)
    assert a.temp_max < 1000
    assert any("aberrante" in x for x in a.alertes)


def test_phase_en_direct():
    pts = simuler_profil(3, pas_s=10)
    assert analyser(pts[:3]).phase in ("en_attente", "allumage")
    assert analyser(pts[: len(pts) // 2]).phase == "carbonisation"
