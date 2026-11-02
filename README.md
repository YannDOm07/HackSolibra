# KaboChar

Plateforme de traçabilité d'une filière de biochar produit à partir des cabosses de cacao, en Côte d'Ivoire.
Chaque lot est suivi de la plantation jusqu'au retour au sol : pesées, photos géolocalisées, courbe de température du four
mesurée par capteur, et bilan carbone calculé selon la méthode du GIEC.

Projet présenté au Concours National de l'Innovation Durable (CNID) 2026.

## Structure

| Dossier | Contenu |
|---|---|
| `server/` | API Python (FastAPI + SQLite) : données, analyse des cuissons, calcul carbone, temps réel |
| `mobile/` | Application terrain (Expo / React Native), utilisable hors connexion |
| `dashboard/` | Tableau de bord web (React) |
| `firmware/` | Programme de la carte ESP32 + thermocouple MAX31855 |
| `ia/` | Entraînement du modèle de diagnostic des cabosses |
| `design/` | Charte graphique (tokens partagés) |
| `docs/` | Charte, références scientifiques, notes techniques |

## Lancer le serveur

```bash
cd server
python -m venv .venv
.venv\Scripts\activate          # Windows  (source .venv/bin/activate sous Linux/macOS)
pip install -r requirements.txt
python -m app.seed              # base de démonstration
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- Documentation interactive de l'API : http://localhost:8000/docs
- Flux en direct des fours (WebSocket) : `ws://<ip-du-pc>:8000/ws`
- Tests : `python -m pytest -q`

`--host 0.0.0.0` rend le serveur joignable par les téléphones et l'ESP32 connectés au même réseau Wi-Fi
(point d'accès du téléphone sur le terrain : aucune connexion internet n'est nécessaire).

## Lancer l'application mobile (Expo Go)

1. Installer **Expo Go** sur le téléphone (Play Store / App Store).
2. Le PC et le téléphone doivent être sur le **même réseau Wi-Fi**, et le serveur doit tourner (section précédente).
3. Puis :

```bash
cd mobile
npm install
npx expo start
```

4. Scanner le QR code affiché dans le terminal avec Expo Go (Android) ou l'appareil photo (iPhone).

L'application trouve seule le serveur (même adresse IP que le PC, port 8000). Sinon : écran **Réglages** → adresse du serveur.
Elle fonctionne hors connexion : les saisies sont enregistrées sur le téléphone (SQLite) et synchronisées dès que le serveur est joignable.

Vérifications : `npx tsc --noEmit` (types) et `npx expo-doctor` (configuration).

## Lancer le tableau de bord

```bash
cd dashboard
npm install
npm run build
```

Puis lancer le serveur (section « Lancer le serveur ») et ouvrir **http://localhost:8000** : le tableau de bord est servi par
le serveur lui-même, sous `/tableau/`. Une seule commande suffit donc pour une démonstration.

En développement : `npm run dev` dans `dashboard/`, puis http://localhost:5173.

## Capteur des fours (ESP32 + MAX31855)

Programme, câblage et protocole de vérification de 15 minutes : [`firmware/README.md`](firmware/README.md).

## Ce qui est mesuré, ce qui est simulé

- Les données de démonstration (producteurs, parcelles, lots) sont **fictives** et marquées `demo` en base ; les interfaces affichent un badge « DÉMO ».
- Les courbes de cuisson de démonstration viennent du **simulateur** (`server/app/cuisson.py`) et sont marquées `simulation` ; les interfaces affichent un badge « SIMULATION ».
- Les mesures envoyées par un vrai capteur sont marquées `capteur`.

## Méthode carbone

`CO₂ stocké = masse de biochar sec × F_C × F_perm × 44/12` (GIEC 2019, vol. 4, ch. 2, appendice 4).
La classe de permanence (`F_perm`) découle de la température de carbonisation mesurée à chaque cuisson.
Détails et sources : [`docs/references.md`](docs/references.md).

## Variables d'environnement (serveur)

| Variable | Défaut | Rôle |
|---|---|---|
| `KABOCHAR_DEVICE_KEY` | `kabochar-demo-device` | Clé attendue dans l'en-tête `X-Device-Key` des capteurs |
| `KABOCHAR_DEMO_SEED` | `1` | Crée les données de démonstration si la base est vide |
| `KABOCHAR_SIM_SPEED` | `20` | Accélération des cuissons simulées (20 = une cuisson de 2 h en 6 min) |
| `KABOCHAR_DATA_DIR` | `server/data` | Base SQLite et photos |
