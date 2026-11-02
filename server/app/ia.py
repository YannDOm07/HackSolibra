"""Diagnostic des cabosses par l'IA.

Le modèle est produit par ia/entrainer.py : l'extracteur DINOv2-small (ONNX) transforme la photo en
768 caractéristiques, puis une tête linéaire (tete.json) donne la probabilité de chaque classe.
Le prétraitement doit rester identique à celui de l'entraînement.
"""
import hashlib
import json
import logging
import threading
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

from . import config

log = logging.getLogger("kabochar.ia")

CONSEILS = {
    "healthy": "Aucun symptôme visible. Les cosses vides partent quand même au séchage puis au four : "
    "on ne laisse pas de tas de cabosses au champ.",
    "black_pod_rot": "Signes de pourriture brune. Retirer sans attendre les cabosses atteintes et les envoyer au "
    "séchage puis au four : la pyrolyse détruit l'agent de la maladie. Ne pas laisser de tas de cosses au champ.",
    "pod_borer": "Signes de foreur de cabosse. Récolter et écabosser rapidement les cabosses touchées et signaler "
    "la parcelle à la coopérative. Les cosses partent au four.",
}


def _sha256(chemin: Path) -> str:
    h = hashlib.sha256()
    with open(chemin, "rb") as f:
        for bloc in iter(lambda: f.read(1 << 20), b""):
            h.update(bloc)
    return h.hexdigest()


class ModeleDiagnostic:
    def __init__(self, dossier: Path, extracteur: Path):
        self.tete = json.loads((dossier / "tete.json").read_text(encoding="utf-8"))
        chemin_metriques = dossier / "metriques.json"
        self.metriques = json.loads(chemin_metriques.read_text(encoding="utf-8")) if chemin_metriques.exists() else {}
        self.extracteur = extracteur
        self._session = None
        self._verrou = threading.Lock()
        p = self.tete["pretraitement"]
        self._moyenne = np.array(p["moyenne"], np.float32)
        self._ecart = np.array(p["ecart"], np.float32)
        self._norm_m = np.array(self.tete["normalisation"]["moyenne"], np.float32)
        self._norm_e = np.array(self.tete["normalisation"]["ecart"], np.float32)
        self._W = np.array(self.tete["poids"], np.float32)
        self._b = np.array(self.tete["biais"], np.float32)

    @property
    def version(self) -> str:
        return self.tete["version"]

    def _session_onnx(self):
        """Charge l'extracteur au premier diagnostic (et le télécharge une fois s'il manque)."""
        with self._verrou:
            if self._session is None:
                import onnxruntime as ort

                attendu = self.tete["extracteur"]["sha256"]
                if not self.extracteur.exists():
                    self.extracteur.parent.mkdir(parents=True, exist_ok=True)
                    log.info("Téléchargement de l'extracteur %s", self.tete["extracteur"]["url"])
                    urllib.request.urlretrieve(self.tete["extracteur"]["url"], self.extracteur)
                if _sha256(self.extracteur) != attendu:
                    raise RuntimeError("Extracteur DINOv2 corrompu ou modifié (empreinte SHA-256 inattendue).")
                self._session = ort.InferenceSession(str(self.extracteur), providers=["CPUExecutionProvider"])
            return self._session

    def _pretraiter(self, image: Image.Image) -> np.ndarray:
        image.draft("RGB", (512, 512))
        image = image.convert("RGB")
        p = self.tete["pretraitement"]
        l, h = image.size
        k = p["bord_court"] / min(l, h)
        image = image.resize((round(l * k), round(h * k)), Image.BICUBIC)
        l, h = image.size
        r = p["recadrage"]
        g, t = (l - r) // 2, (h - r) // 2
        image = image.crop((g, t, g + r, t + r))
        return ((np.asarray(image, np.float32) / 255 - self._moyenne) / self._ecart).transpose(2, 0, 1)[None]

    def predire(self, image: Image.Image) -> dict:
        session = self._session_onnx()
        jetons = session.run(None, {session.get_inputs()[0].name: self._pretraiter(image)})[0]
        x = np.concatenate([jetons[:, 0], jetons[:, 1:].mean(axis=1)], axis=1)
        z = ((x - self._norm_m) / self._norm_e) @ self._W + self._b
        p = np.exp(z - z.max())
        p = (p / p.sum())[0]
        classes = self.tete["classes"]
        i = int(p.argmax())
        etiquette = classes[i]
        return {
            "etiquette": etiquette,
            "libelle": self.tete["libelles"][etiquette],
            "confiance": round(float(p[i]), 4),
            "incertain": bool(p[i] < self.tete["seuil_incertitude"]),
            "scores": {c: round(float(v), 4) for c, v in zip(classes, p)},
            "libelles": self.tete["libelles"],
            "conseil": CONSEILS.get(etiquette, ""),
            "modele": self.version,
        }


_modele: ModeleDiagnostic | None = None
_charge = False
_verrou_global = threading.Lock()


def modele() -> ModeleDiagnostic | None:
    """Le modèle s'il a été entraîné (ia/modele/tete.json présent), sinon None."""
    global _modele, _charge
    with _verrou_global:
        if not _charge:
            _charge = True
            if (config.IA_DIR / "tete.json").exists():
                _modele = ModeleDiagnostic(config.IA_DIR, config.IA_EXTRACTEUR)
            else:
                log.warning("Modèle de diagnostic absent (%s) : lancer ia/entrainer.py", config.IA_DIR)
        return _modele
