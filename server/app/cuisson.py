"""Analyse des courbes de température d'un four à rideau de flamme, et simulateur.

Une cuisson typique : allumage, puis carbonisation pendant laquelle l'opérateur ajoute des couches
de cabosses (chaque ajout fait chuter brièvement la température), puis extinction à l'eau
(chute brutale). L'analyse retrouve ces phases à partir de la seule courbe du thermocouple.
"""
import bisect
import math
import random
from dataclasses import asdict, dataclass, field
from statistics import median

from .carbone import classe_temperature

SEUIL_CARBONISATION_C = 450.0
SEUIL_MAINTIEN_C = 400.0
PENTE_EXTINCTION_C_MIN = -60.0
TEMP_MIN_VALIDE, TEMP_MAX_VALIDE = -20.0, 1400.0

Point = tuple[float, float]  # (secondes depuis le début, °C)


@dataclass
class AnalyseCuisson:
    phase: str = "en_attente"
    duree_min: float = 0.0
    duree_carbonisation_min: float = 0.0
    temp_max: float | None = None
    temp_retenue: float | None = None
    couches: int = 0
    classe: str = "inconnue"
    phases: list[dict] = field(default_factory=list)
    alertes: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return asdict(self)


def _lisser(ts: list[float], temps: list[float], demi_fenetre_s: float = 20.0) -> list[float]:
    out, lo, hi, n = [], 0, 0, len(ts)
    somme = 0.0
    for i in range(n):
        while hi < n and ts[hi] <= ts[i] + demi_fenetre_s:
            somme += temps[hi]
            hi += 1
        while ts[lo] < ts[i] - demi_fenetre_s:
            somme -= temps[lo]
            lo += 1
        out.append(somme / (hi - lo))
    return out


def _debut_carbonisation(ts: list[float], lisse: list[float]) -> int | None:
    n = len(ts)
    for i in range(n):
        if lisse[i] < SEUIL_CARBONISATION_C:
            continue
        j = i
        while j < n and ts[j] - ts[i] <= 120 and lisse[j] >= SEUIL_MAINTIEN_C:
            j += 1
        tenu = j >= n or ts[j] - ts[i] > 120
        if tenu:
            return i
    return None


def _debut_extinction(ts: list[float], lisse: list[float], depuis: int) -> int | None:
    """Chute rapide qui descend sous 300 °C : distingue l'extinction des creux d'ajout de couche."""
    n = len(ts)
    for i in range(depuis, n):
        j = bisect.bisect_left(ts, ts[i] + 60, lo=i)
        if j >= n:
            j = n - 1
        if ts[j] - ts[i] < 30:
            break
        pente = (lisse[j] - lisse[i]) / ((ts[j] - ts[i]) / 60)
        if pente > PENTE_EXTINCTION_C_MIN:
            continue
        k = i
        while k < n and ts[k] - ts[i] <= 300:
            if lisse[k] < 300:
                return i
            k += 1
    return None


def _compter_couches(lisse: list[float]) -> int:
    couches, creux, dans_creux = 0, 0.0, False
    ref = lisse[0] if lisse else 0.0
    for v in lisse:
        if not dans_creux:
            ref = max(ref, v)
            if ref - v >= 50:
                dans_creux, creux = True, v
                couches += 1
        else:
            creux = min(creux, v)
            if v - creux >= 30:
                dans_creux, ref = False, v
    return couches


def analyser(points: list[Point], terminee: bool = False, ambiante: float = 30.0) -> AnalyseCuisson:
    res = AnalyseCuisson()
    valides = sorted(p for p in points if TEMP_MIN_VALIDE <= p[1] <= TEMP_MAX_VALIDE)
    if len(valides) < len(points):
        res.alertes.append(f"{len(points) - len(valides)} valeur(s) aberrante(s) du capteur ignorée(s).")
    if len(valides) < 3:
        if terminee:
            res.alertes.append("Pas assez de mesures pour analyser la cuisson.")
        return res

    ts = [p[0] for p in valides]
    temps = [p[1] for p in valides]
    lisse = _lisser(ts, temps)
    res.duree_min = round((ts[-1] - ts[0]) / 60, 1)
    res.temp_max = round(max(lisse), 1)

    t_allumage = next((ts[i] for i, v in enumerate(lisse) if v > ambiante + 25), None)
    i_carbo = _debut_carbonisation(ts, lisse)
    i_ext = _debut_extinction(ts, lisse, i_carbo) if i_carbo is not None else None

    if t_allumage is not None:
        res.phases.append({"phase": "allumage", "debut_s": t_allumage, "fin_s": ts[i_carbo] if i_carbo is not None else ts[-1]})

    if i_carbo is None:
        res.phase = "allumage" if t_allumage is not None else "en_attente"
        res.classe = "insuffisante" if terminee else "inconnue"
        if terminee:
            res.alertes.append("La température de carbonisation (450 °C) n'a jamais été atteinte.")
        return res

    i_fin = i_ext if i_ext is not None else len(ts) - 1
    segment = temps[i_carbo:i_fin + 1]
    res.duree_carbonisation_min = round((ts[i_fin] - ts[i_carbo]) / 60, 1)
    res.temp_retenue = round(median(segment), 1)
    res.couches = _compter_couches(lisse[i_carbo:i_fin + 1])
    res.classe = classe_temperature(res.temp_retenue)
    res.phases.append({"phase": "carbonisation", "debut_s": ts[i_carbo], "fin_s": ts[i_fin]})

    if i_ext is not None:
        res.phases.append({"phase": "extinction", "debut_s": ts[i_ext], "fin_s": ts[-1]})
        refroidi = lisse[-1] < 120 or ts[-1] - ts[i_ext] > 600
        res.phase = "terminee" if (terminee or refroidi) else "extinction"
    else:
        res.phase = "terminee" if terminee else "carbonisation"
        if terminee:
            res.alertes.append("Extinction à l'eau non détectée : le biochar a pu continuer à se consumer.")

    if res.classe in ("basse", "insuffisante"):
        res.alertes.append("Palier de carbonisation sous 450 °C : stabilité du carbone plus faible.")
    if terminee and res.duree_carbonisation_min < 20:
        res.alertes.append("Carbonisation courte (moins de 20 min) : vérifier le chargement du four.")
    return res


def simuler_profil(graine: int | None = None, pas_s: float = 10.0) -> list[Point]:
    """Courbe réaliste d'une cuisson complète (≈ 1 h 30 à 2 h), pour les démonstrations.

    Ordres de grandeur : zone de pyrolyse d'un four à rideau de flamme mesurée à 680–750 °C
    (Cornelissen et al. 2016) ; le thermocouple, placé en bordure, lit un peu moins. Creux de 70 à
    140 °C à chaque ajout de couche, extinction à l'eau en quelques minutes.
    """
    rng = random.Random(graine)
    ambiante = rng.uniform(27, 32)
    t_allumage = rng.uniform(7, 11) * 60
    nb_couches = rng.randint(7, 10)
    intervalle = rng.uniform(8, 11) * 60
    palier = rng.uniform(590, 700)
    creux = [rng.uniform(70, 140) for _ in range(nb_couches)]
    t_carbo_fin = t_allumage + nb_couches * intervalle
    t_flambee = t_carbo_fin + rng.uniform(4, 7) * 60
    d_extinction = rng.uniform(3, 5) * 60
    d_refroidissement = 8 * 60
    pic = palier + 25 + rng.uniform(20, 50)
    fin_extinction = 98 + (pic - 98) * math.exp(-4.5)

    points: list[Point] = []
    t = 0.0
    while t <= t_flambee + d_extinction + d_refroidissement:
        if t < t_allumage:
            x = t / t_allumage
            base = ambiante + (palier * 0.85 - ambiante) * (1 - math.exp(-3.2 * x)) / (1 - math.exp(-3.2))
        elif t < t_carbo_fin:
            k = int((t - t_allumage) // intervalle)
            dt = (t - t_allumage) - k * intervalle
            base = palier + 25 * (t - t_allumage) / (t_carbo_fin - t_allumage) - creux[k] * math.exp(-dt / 75)
        elif t < t_flambee:
            x = (t - t_carbo_fin) / (t_flambee - t_carbo_fin)
            base = palier + 25 + (pic - palier - 25) * math.sin(math.pi * x / 2)
        elif t < t_flambee + d_extinction:
            x = (t - t_flambee) / d_extinction
            base = 98 + (pic - 98) * math.exp(-4.5 * x)
        else:
            x = (t - t_flambee - d_extinction) / d_refroidissement
            base = 55 + (fin_extinction - 55) * math.exp(-2.2 * x)
        bruit = rng.gauss(0, 4.0 if base > 200 else 1.2)
        points.append((round(t, 1), round(base + bruit, 1)))
        t += pas_s
    return points
