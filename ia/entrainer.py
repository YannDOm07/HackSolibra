"""Entraînement du modèle de diagnostic des cabosses de KaboChar.

Méthode : « sonde linéaire » (linear probe) sur DINOv2-small.
  1. Un modèle de vision pré-entraîné (DINOv2-small, Meta, licence Apache 2.0), exécuté avec onnxruntime,
     transforme chaque photo en un vecteur de 768 caractéristiques (jeton CLS + moyenne des patchs).
  2. Une régression logistique multinomiale, écrite en numpy, apprend à classer ces vecteurs :
     cabosse saine, pourriture brune, foreur de cabosse.

Données : « Cacao Diseases » (Zaldy Jr. Pagaduan, Kaggle, CC BY-SA 4.0), 4 390 photos prises à Davao (Philippines).

Usage : python entrainer.py            (≈ 10 min sur un processeur de portable, sans carte graphique)
        python entrainer.py --reutiliser  (réentraîne la tête à partir des caractéristiques déjà calculées)
"""
import argparse
import hashlib
import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

ICI = Path(__file__).resolve().parent
DONNEES = ICI / "data"
CACHE_CARACTERISTIQUES = DONNEES / "caracteristiques.npz"
EXTRACTEUR = ICI / "modeles" / "dinov2-small.onnx"
URL_EXTRACTEUR = "https://huggingface.co/Xenova/dinov2-small/resolve/main/onnx/model.onnx"
SHA256_EXTRACTEUR = "83141175ec78b4ff9a2bb58a4c7c264ba0054d1c2e122e5a8114b79a8d4179ea"
SORTIE = ICI / "modele"

JEU = "zaldyjr/cacao-diseases"
CLASSES = ["healthy", "black_pod_rot", "pod_borer"]
LIBELLES = {"healthy": "Cabosse saine", "black_pod_rot": "Pourriture brune", "pod_borer": "Foreur de cabosse"}
GRAINE = 2026
PART_VALIDATION, PART_TEST = 0.15, 0.15
SEUIL_INCERTITUDE = 0.60
SEUIL_QUASI_DOUBLON = 0.97

# Prétraitement de DINOv2 (preprocessor_config.json) : bord court à 256 px, recadrage central 224, normalisation ImageNet.
MOYENNE = np.array([0.485, 0.456, 0.406], np.float32)
ECART = np.array([0.229, 0.224, 0.225], np.float32)


def pretraiter(image: Image.Image) -> np.ndarray:
    image = image.convert("RGB")
    l, h = image.size
    k = 256 / min(l, h)
    image = image.resize((round(l * k), round(h * k)), Image.BICUBIC)
    l, h = image.size
    g, t = (l - 224) // 2, (h - 224) // 2
    image = image.crop((g, t, g + 224, t + 224))
    return ((np.asarray(image, np.float32) / 255 - MOYENNE) / ECART).transpose(2, 0, 1)


def caracteristiques(session: ort.InferenceSession, lot: np.ndarray) -> np.ndarray:
    jetons = session.run(None, {session.get_inputs()[0].name: lot})[0]
    return np.concatenate([jetons[:, 0], jetons[:, 1:].mean(axis=1)], axis=1)  # CLS + moyenne des patchs


def sha256(chemin: Path) -> str:
    h = hashlib.sha256()
    with open(chemin, "rb") as f:
        for bloc in iter(lambda: f.read(1 << 20), b""):
            h.update(bloc)
    return h.hexdigest()


def preparer_extracteur() -> ort.InferenceSession:
    if not EXTRACTEUR.exists():
        EXTRACTEUR.parent.mkdir(parents=True, exist_ok=True)
        print(f"Téléchargement de DINOv2-small ({URL_EXTRACTEUR})…")
        urllib.request.urlretrieve(URL_EXTRACTEUR, EXTRACTEUR)
    if sha256(EXTRACTEUR) != SHA256_EXTRACTEUR:
        raise SystemExit(f"Empreinte inattendue pour {EXTRACTEUR} : fichier corrompu ou modifié.")
    return ort.InferenceSession(str(EXTRACTEUR), providers=["CPUExecutionProvider"])


def trouver_photos() -> Path:
    os.environ.setdefault("KAGGLEHUB_CACHE", str(DONNEES / "kagglehub"))
    import kagglehub

    racine = Path(kagglehub.dataset_download(JEU))
    dossier = next(racine.rglob("cacao_photos"), None)
    if dossier is None:
        raise SystemExit(f"Dossier cacao_photos introuvable dans {racine}")
    return dossier


# ---------- Extraction ----------
def extraire_tout(session: ort.InferenceSession, photos: Path) -> dict:
    """Caractéristiques de chaque photo, de son miroir, et des rotations pour la classe rare (foreur)."""
    chemins, etiquettes = [], []
    for k, classe in enumerate(CLASSES):
        for p in sorted((photos / classe).glob("*.jpg")):
            chemins.append(str(p.relative_to(photos)))
            etiquettes.append(k)
    n = len(chemins)
    originales = np.zeros((n, 768), np.float32)
    miroirs = np.zeros((n, 768), np.float32)
    rotations: dict[int, np.ndarray] = {}
    debut = time.time()
    lot_x, lot_i = [], []

    def vider():
        if not lot_x:
            return
        f = caracteristiques(session, np.stack(lot_x))
        for (i, sorte), v in zip(lot_i, f):
            if sorte == "o":
                originales[i] = v
            elif sorte == "m":
                miroirs[i] = v
            else:
                rotations.setdefault(i, []).append(v)
        lot_x.clear()
        lot_i.clear()

    for i, rel in enumerate(chemins):
        image = Image.open(photos / rel)
        image.draft("RGB", (512, 512))  # décodage JPEG réduit : 4 à 5 fois plus rapide sur des photos 1080 px
        image = image.convert("RGB")
        lot_x.append(pretraiter(image)); lot_i.append((i, "o"))
        lot_x.append(pretraiter(image.transpose(Image.FLIP_LEFT_RIGHT))); lot_i.append((i, "m"))
        if CLASSES[etiquettes[i]] == "pod_borer":
            for angle in (90, 180, 270):
                lot_x.append(pretraiter(image.rotate(angle, expand=True))); lot_i.append((i, "r"))
        if len(lot_x) >= 32:
            vider()
        if (i + 1) % 250 == 0:
            ecoule = time.time() - debut
            print(f"  {i + 1}/{n} photos · {ecoule:.0f} s · reste ≈ {ecoule / (i + 1) * (n - i - 1):.0f} s", flush=True)
    vider()
    rot = np.zeros((n, 3, 768), np.float32)
    for i, vs in rotations.items():
        rot[i] = np.stack(vs)
    a_rotations = np.array([i in rotations for i in range(n)])
    return {"chemins": np.array(chemins), "y": np.array(etiquettes), "x": originales, "miroirs": miroirs, "rotations": rot, "a_rotations": a_rotations}


# ---------- Découpage ----------
def decouper(y: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Découpage stratifié et reproductible : mêmes proportions de chaque classe dans chaque partie."""
    rng = np.random.default_rng(GRAINE)
    app, val, test = [], [], []
    for k in range(len(CLASSES)):
        idx = rng.permutation(np.flatnonzero(y == k))
        n_test, n_val = round(len(idx) * PART_TEST), round(len(idx) * PART_VALIDATION)
        test += idx[:n_test].tolist()
        val += idx[n_test:n_test + n_val].tolist()
        app += idx[n_test + n_val:].tolist()
    return np.array(app), np.array(val), np.array(test)


# ---------- Régression logistique multinomiale (numpy) ----------
def softmax(z: np.ndarray) -> np.ndarray:
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def entrainer_tete(x: np.ndarray, y: np.ndarray, l2: float, iterations: int = 700, pas: float = 0.02):
    """Descente de gradient (Adam), perte d'entropie croisée pondérée par l'inverse de la fréquence des classes."""
    n, d = x.shape
    k = len(CLASSES)
    effectifs = np.bincount(y, minlength=k)
    poids_classe = n / (k * np.maximum(effectifs, 1))
    w_ech = poids_classe[y][:, None] / n
    cible = np.eye(k, dtype=np.float32)[y]
    rng = np.random.default_rng(GRAINE)
    W = (rng.standard_normal((d, k)) * 0.01).astype(np.float32)
    b = np.zeros(k, np.float32)
    m = [np.zeros_like(W), np.zeros_like(b)]
    v = [np.zeros_like(W), np.zeros_like(b)]
    b1, b2 = 0.9, 0.999
    for t in range(1, iterations + 1):
        p = softmax(x @ W + b)
        g = (p - cible) * w_ech
        gW = x.T @ g + l2 * W
        gb = g.sum(axis=0)
        for j, (param, grad) in enumerate(((W, gW), (b, gb))):
            m[j] = b1 * m[j] + (1 - b1) * grad
            v[j] = b2 * v[j] + (1 - b2) * grad**2
            param -= pas * (m[j] / (1 - b1**t)) / (np.sqrt(v[j] / (1 - b2**t)) + 1e-8)
    return W, b


def evaluer(y_vrai: np.ndarray, proba: np.ndarray) -> dict:
    k = len(CLASSES)
    y_pred = proba.argmax(axis=1)
    confusion = np.zeros((k, k), int)
    for a, p in zip(y_vrai, y_pred):
        confusion[a, p] += 1
    par_classe = {}
    for c in range(k):
        vp = confusion[c, c]
        precision = vp / max(confusion[:, c].sum(), 1)
        rappel = vp / max(confusion[c, :].sum(), 1)
        f1 = 2 * precision * rappel / max(precision + rappel, 1e-12)
        par_classe[CLASSES[c]] = {"precision": round(float(precision), 4), "rappel": round(float(rappel), 4), "f1": round(float(f1), 4), "effectif": int(confusion[c, :].sum())}
    sur = proba.max(axis=1) >= SEUIL_INCERTITUDE
    return {
        "n": int(len(y_vrai)),
        "exactitude": round(float((y_pred == y_vrai).mean()), 4),
        "exactitude_equilibree": round(float(np.mean([v["rappel"] for v in par_classe.values()])), 4),
        "f1_macro": round(float(np.mean([v["f1"] for v in par_classe.values()])), 4),
        "par_classe": par_classe,
        "matrice_confusion": confusion.tolist(),
        "part_jugee_sure": round(float(sur.mean()), 4),
        "exactitude_si_sure": round(float((y_pred[sur] == y_vrai[sur]).mean()) if sur.any() else 0.0, 4),
    }


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # console Windows : sinon « ≈ » ou « é » font planter l'affichage
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reutiliser", action="store_true", help="réutiliser les caractéristiques déjà extraites")
    args = parser.parse_args()
    debut = time.time()

    if args.reutiliser and CACHE_CARACTERISTIQUES.exists():
        donnees = dict(np.load(CACHE_CARACTERISTIQUES))
        print(f"Caractéristiques rechargées depuis {CACHE_CARACTERISTIQUES}")
    else:
        session = preparer_extracteur()
        photos = trouver_photos()
        print(f"Extraction des caractéristiques ({photos})…")
        donnees = extraire_tout(session, photos)
        DONNEES.mkdir(exist_ok=True)
        np.savez_compressed(CACHE_CARACTERISTIQUES, **donnees)

    y, x = donnees["y"], donnees["x"]
    app, val, test = decouper(y)

    def jeu_entrainement(indices):
        """Photos d'entraînement + miroirs + rotations (classe rare) ; la validation et le test restent intacts."""
        xs = [x[indices], donnees["miroirs"][indices]]
        ys = [y[indices], y[indices]]
        rares = indices[donnees["a_rotations"][indices]]
        if len(rares):
            xs.append(donnees["rotations"][rares].reshape(-1, 768))
            ys.append(np.repeat(y[rares], 3))
        return np.concatenate(xs), np.concatenate(ys)

    x_app, y_app = jeu_entrainement(app)
    moyenne, ecart = x_app.mean(axis=0), x_app.std(axis=0) + 1e-6
    norm = lambda m: (m - moyenne) / ecart

    # Choix de la régularisation sur la validation (F1 macro, qui ne laisse pas la classe rare de côté).
    essais = {}
    for l2 in (1e-4, 1e-3, 1e-2, 1e-1):
        W, b = entrainer_tete(norm(x_app), y_app, l2)
        essais[l2] = evaluer(y[val], softmax(norm(x[val]) @ W + b))
        print(f"  l2={l2:g} : F1 macro validation {essais[l2]['f1_macro']:.4f}")
    l2 = max(essais, key=lambda k: essais[k]["f1_macro"])
    W, b = entrainer_tete(norm(x_app), y_app, l2)
    proba_test = softmax(norm(x[test]) @ W + b)
    resultat_test = evaluer(y[test], proba_test)

    # Quasi-doublons : une photo de test presque identique à une photo d'entraînement gonflerait les scores.
    unit = lambda m: m / np.linalg.norm(m, axis=1, keepdims=True)
    similarite = (unit(x[test]) @ unit(x[app]).T).max(axis=1)
    doublons = similarite >= SEUIL_QUASI_DOUBLON
    resultat_sans_doublons = evaluer(y[test][~doublons], proba_test[~doublons]) if (~doublons).any() else None

    SORTIE.mkdir(exist_ok=True)
    tete = {
        "version": "kabochar-cabosses-1.0",
        "extracteur": {"nom": "DINOv2-small (Meta AI, licence Apache 2.0)", "fichier": EXTRACTEUR.name, "url": URL_EXTRACTEUR, "sha256": SHA256_EXTRACTEUR},
        "pretraitement": {"bord_court": 256, "recadrage": 224, "moyenne": MOYENNE.tolist(), "ecart": ECART.tolist()},
        "caracteristiques": "jeton CLS + moyenne des patchs (768 valeurs)",
        "classes": CLASSES,
        "libelles": LIBELLES,
        "seuil_incertitude": SEUIL_INCERTITUDE,
        "normalisation": {"moyenne": moyenne.round(6).tolist(), "ecart": ecart.round(6).tolist()},
        "poids": W.round(6).tolist(),
        "biais": b.round(6).tolist(),
    }
    (SORTIE / "tete.json").write_text(json.dumps(tete), encoding="utf-8")

    metriques = {
        "version": tete["version"],
        "date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "duree_s": round(time.time() - debut),
        "methode": "Sonde linéaire : caractéristiques DINOv2-small figées + régression logistique multinomiale (numpy), pondérée par classe",
        "jeu_de_donnees": {
            "nom": "Cacao Diseases",
            "auteur": "Zaldy Jr. Pagaduan",
            "source": f"https://www.kaggle.com/datasets/{JEU}",
            "licence": "CC BY-SA 4.0",
            "origine": "Davao City, Mindanao (Philippines)",
            "effectifs": {c: int((y == k).sum()) for k, c in enumerate(CLASSES)},
        },
        "decoupage": {"graine": GRAINE, "entrainement": int(len(app)), "validation": int(len(val)), "test": int(len(test))},
        "augmentation": "miroir horizontal pour toutes les photos d'entraînement ; rotations 90°, 180°, 270° pour la classe rare (foreur)",
        "regularisation_l2": l2,
        "validation_par_l2": {str(k): v["f1_macro"] for k, v in essais.items()},
        "test": resultat_test,
        "quasi_doublons": {
            "seuil_similarite_cosinus": SEUIL_QUASI_DOUBLON,
            "photos_test_concernees": int(doublons.sum()),
            "test_sans_quasi_doublons": resultat_sans_doublons,
        },
        "seuil_incertitude": SEUIL_INCERTITUDE,
    }
    (SORTIE / "metriques.json").write_text(json.dumps(metriques, ensure_ascii=False, indent=2), encoding="utf-8")

    t = resultat_test
    print(f"\nTest ({t['n']} photos jamais vues) : exactitude {t['exactitude']:.3f} · exactitude équilibrée {t['exactitude_equilibree']:.3f} · F1 macro {t['f1_macro']:.3f}")
    for c, v in t["par_classe"].items():
        print(f"  {LIBELLES[c]:<20} précision {v['precision']:.3f} · rappel {v['rappel']:.3f} · F1 {v['f1']:.3f} · n={v['effectif']}")
    print(f"  Matrice de confusion (lignes = vrai, colonnes = prédit, ordre {CLASSES}) : {t['matrice_confusion']}")
    print(f"  Quasi-doublons test/entraînement : {int(doublons.sum())} photo(s)")
    if resultat_sans_doublons:
        print(f"  Sans ces photos : exactitude {resultat_sans_doublons['exactitude']:.3f} · F1 macro {resultat_sans_doublons['f1_macro']:.3f}")
    print(f"Modèle écrit dans {SORTIE} ({time.time() - debut:.0f} s)")


if __name__ == "__main__":
    main()
