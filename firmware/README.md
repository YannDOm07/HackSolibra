# Capteur de four : ESP32 + MAX31855

La carte lit la température du four toutes les 2 secondes et l'envoie au serveur KaboChar en Wi-Fi.
Ces mesures font la courbe de cuisson, et la température retenue fixe la classe de stabilité du carbone (méthode GIEC).

## Matériel

| Élément | Remarque |
|---|---|
| Carte ESP32 (type « ESP32 DevKit ») | |
| Module MAX31855 (version **K**, pour thermocouple type K) | Vérifier l'inscription « MAX31855K » sur la puce |
| Thermocouple type K | Pour les essais : sonde standard. **Pour le four : sonde haute température (0–1 200 °C) à gaine inox ou céramique** ; la sonde à gaine plastique fond vers 200 °C |
| Câble USB | Alimentation et téléversement |

## Câblage

| MAX31855 | ESP32 |
|---|---|
| VIN (ou 3V3) | 3V3 |
| GND | GND |
| CLK (SCK) | GPIO 18 |
| CS | GPIO 5 |
| DO (MISO, SO) | GPIO 19 |

Thermocouple sur le bornier du MAX31855 : fil **jaune sur +**, fil **rouge sur −** (code couleur courant ; en cas de doute,
voir le test ci-dessous : une température qui *baisse* quand on chauffe signale des fils inversés).

```
  ESP32                MAX31855            thermocouple K
  3V3  ─────────────── VIN
  GND  ─────────────── GND
  G18  ─────────────── CLK                  + (jaune) ─┐
  G5   ─────────────── CS          bornier             ├── pointe dans le four
  G19  ─────────────── DO                   − (rouge) ─┘
```

## Installation (Arduino IDE 2)

1. **Fichier → Préférences → URL de gestionnaire de cartes** : `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
2. **Outils → Carte → Gestionnaire de cartes** : installer « esp32 » (Espressif). Choisir la carte « ESP32 Dev Module ».
3. **Croquis → Inclure une bibliothèque → Gérer les bibliothèques** : installer « Adafruit MAX31855 library » (accepter « Adafruit BusIO »).
4. Dans `kabochar_capteur/`, copier `config.exemple.h` en `config.h` et le remplir : Wi-Fi, adresse du PC (`ipconfig` → IPv4), identifiant de la carte.
5. Ouvrir `kabochar_capteur.ino`, choisir le port de la carte, **Téléverser**.
6. **Moniteur série à 115 200 bauds** : une ligne toutes les 2 s, par exemple
   `[capteur] 27.4 °C (carte 26.8 °C) · envoyé · mode vérification (aucune cuisson sur ce four)`.

Le serveur doit tourner sur le PC (`uvicorn app.main:app --host 0.0.0.0 --port 8000`) et la carte doit être sur le même réseau.

## Vérification (15 minutes)

Les mesures s'affichent en direct dans **« Capteurs détectés »** : tableau de bord (page Fours en direct) et application (Réglages).

| Test | Attendu | Si ça ne va pas |
|---|---|---|
| Pointe dans de l'eau avec beaucoup de glace, 1 min | 0 °C (± 2 °C) | Noter l'écart |
| Pointe dans de l'eau à gros bouillons, 1 min | ≈ 100 °C | Reporter l'écart dans `CALIBRATION_DECALAGE_C` (ex. 98,4 lu → `1.6f`), puis téléverser à nouveau |
| Pointe près d'une flamme de gazinière, quelques secondes | Plusieurs centaines de °C, montée rapide | Si la valeur baisse : fils + et − inversés |

Faire une capture d'écran des courbes : c'est une **mesure réelle**, citable dans le dossier.

## Cuisson réelle

Associer la carte à un four en mettant son `device_id` dans `config.h` (par exemple `esp32-f01`), puis lancer la cuisson
depuis le tableau de bord (**Fours en direct → Démarrer avec le capteur**) ou l'application. Les mesures de la carte forment
alors la courbe de la cuisson, marquée « Capteur ». Sans cuisson en cours, elles restent en mode vérification.

Si le Wi-Fi coupe, la carte garde jusqu'à 30 minutes de mesures et les renvoie au retour du réseau, avec leur heure exacte.

## Dépannage

| Message | Cause probable |
|---|---|
| `MAX31855 introuvable` | Câblage CLK / CS / DO ou alimentation |
| `thermocouple débranché` | Fil du thermocouple mal serré dans le bornier |
| `court-circuit avec la masse` | Gaine métallique du thermocouple en contact avec la masse du montage |
| `clé refusée par le serveur` | `CLE_CAPTEUR` différente de `KABOCHAR_DEVICE_KEY` du serveur |
| `serveur injoignable` | Adresse du PC dans `config.h`, serveur arrêté, ou réseau différent |
| Valeurs qui sautent | Fils du thermocouple trop près de câbles secteur ; boîtier et masse communs |

## Sécurité

Seule la pointe du thermocouple va dans le feu. La carte et le module restent à distance, à l'abri de la chaleur et de l'eau
d'extinction. Ne jamais manipuler le montage pendant l'extinction à l'eau.
