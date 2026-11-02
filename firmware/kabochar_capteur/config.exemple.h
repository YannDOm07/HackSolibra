// Copier ce fichier en « config.h » (même dossier), puis le remplir.
// config.h n'est pas versionné : le mot de passe Wi-Fi ne part pas sur GitHub.
#pragma once

// Réseau Wi-Fi : celui du PC, ou le partage de connexion d'un téléphone sur le terrain (pas besoin d'internet).
#define WIFI_NOM "NomDuWifi"
#define WIFI_MOT_DE_PASSE "motdepasse"

// Adresse du PC qui fait tourner le serveur KaboChar : « ipconfig » → Adresse IPv4, port 8000.
#define SERVEUR "http://192.168.1.105:8000"

// Identifiant de la carte. Pour associer le capteur à un four, utiliser le « device_id » de ce four
// (fours de démonstration : esp32-f01 Azaguié, esp32-f02 Agboville, esp32-f03 Rubino).
#define DEVICE_ID "esp32-f01"

// Clé attendue par le serveur (variable KABOCHAR_DEVICE_KEY côté serveur).
#define CLE_CAPTEUR "kabochar-demo-device"

// Une mesure toutes les 2 secondes.
#define PERIODE_MS 2000

// Correction issue de la vérification à l'eau bouillante (ex. le capteur lit 98,4 °C au lieu de 100 → 1.6f).
#define CALIBRATION_DECALAGE_C 0.0f
