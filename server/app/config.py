"""Configuration du serveur KaboChar (surchargeable par variables d'environnement)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("KABOCHAR_DATA_DIR", BASE_DIR / "data"))
UPLOAD_DIR = DATA_DIR / "uploads"

DATABASE_URL = os.getenv("KABOCHAR_DATABASE_URL", f"sqlite:///{(DATA_DIR / 'kabochar.db').as_posix()}")

# Clé partagée par les capteurs ESP32 (en-tête X-Device-Key).
DEVICE_KEY = os.getenv("KABOCHAR_DEVICE_KEY", "kabochar-demo-device")

# Remplit la base avec des données de démonstration si elle est vide.
DEMO_SEED = os.getenv("KABOCHAR_DEMO_SEED", "1") == "1"

# Accélération des cuissons simulées : secondes simulées par seconde réelle.
SIM_SPEED = float(os.getenv("KABOCHAR_SIM_SPEED", "20"))

VERSION = "0.1.0"
