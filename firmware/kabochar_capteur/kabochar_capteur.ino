// KaboChar · capteur de température de four
// ESP32 + module MAX31855 + thermocouple type K.
//
// Toutes les PERIODE_MS, la carte lit le thermocouple et envoie la mesure au serveur KaboChar.
// Si le réseau coupe, les mesures sont gardées en mémoire (30 min) puis renvoyées avec leur ancienneté :
// le serveur reconstitue leur heure exacte, la courbe de cuisson reste complète.
//
// Bibliothèque requise : « Adafruit MAX31855 library » (gestionnaire de bibliothèques de l'Arduino IDE).

#include <Adafruit_MAX31855.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <WiFi.h>

#include "config.h"

// Câblage (voir firmware/README.md)
constexpr int BROCHE_CLK = 18;
constexpr int BROCHE_CS = 5;
constexpr int BROCHE_DO = 19;
constexpr int BROCHE_LED = 2;  // LED intégrée de la plupart des cartes ESP32 DevKit

constexpr size_t CAPACITE = 900;  // 30 min de mesures à une toutes les 2 s
constexpr size_t LOT_MAX = 60;    // mesures envoyées par requête lors d'un rattrapage

Adafruit_MAX31855 thermocouple(BROCHE_CLK, BROCHE_CS, BROCHE_DO);

struct Mesure {
  uint32_t prise_ms;
  float temp;
  float interne;
};

// File circulaire : si elle déborde, on oublie les mesures les plus anciennes.
Mesure file[CAPACITE];
size_t tete = 0, taille = 0;
uint32_t prochain_rattrapage = 0;  // après un échec, on laisse 5 s au serveur avant de réessayer

void empiler(const Mesure& m) {
  file[(tete + taille) % CAPACITE] = m;
  if (taille < CAPACITE) {
    taille++;
  } else {
    tete = (tete + 1) % CAPACITE;
  }
}

void clignoter(int fois, int duree_ms = 60) {
  for (int i = 0; i < fois; i++) {
    digitalWrite(BROCHE_LED, HIGH);
    delay(duree_ms);
    digitalWrite(BROCHE_LED, LOW);
    delay(duree_ms);
  }
}

const char* defaut(uint8_t e) {
  // Bits de défaut du MAX31855 (fiche technique) : D0 circuit ouvert, D1 court-circuit masse, D2 court-circuit VCC.
  if (e & 0x01) return "thermocouple débranché";
  if (e & 0x02) return "thermocouple en court-circuit avec la masse";
  if (e & 0x04) return "thermocouple en court-circuit avec l'alimentation";
  return "défaut inconnu";
}

void connecterWifi() {
  static uint32_t dernier_essai = 0;
  if (WiFi.status() == WL_CONNECTED) return;
  if (dernier_essai != 0 && millis() - dernier_essai < 10000) return;
  dernier_essai = millis();
  Serial.printf("[réseau] connexion au Wi-Fi « %s »…\n", WIFI_NOM);
  WiFi.disconnect();
  WiFi.begin(WIFI_NOM, WIFI_MOT_DE_PASSE);
}

// Valeur texte d'un champ JSON simple (« "phase":"carbonisation" ») ; vide si absent ou null.
String champ(const String& json, const char* cle) {
  String motif = String("\"") + cle + "\":\"";
  int i = json.indexOf(motif);
  if (i < 0) return "";
  i += motif.length();
  int j = json.indexOf('"', i);
  return j > i ? json.substring(i, j) : "";
}

// Envoie les mesures en attente, de la plus ancienne à la plus récente. Renvoie la réponse du serveur, ou "".
String envoyer() {
  size_t n = taille < LOT_MAX ? taille : LOT_MAX;
  uint32_t maintenant = millis();
  String corps;
  corps.reserve(48 + n * 72);
  corps += "{\"device_id\":\"";
  corps += DEVICE_ID;
  corps += "\",\"mesures\":[";
  for (size_t k = 0; k < n; k++) {
    const Mesure& m = file[(tete + k) % CAPACITE];
    if (k) corps += ',';
    corps += "{\"temp_c\":";
    corps += String(m.temp, 2);
    corps += ",\"temp_interne_c\":";
    corps += String(m.interne, 2);
    corps += ",\"age_ms\":";
    corps += String(maintenant - m.prise_ms);
    corps += '}';
  }
  corps += "]}";

  HTTPClient http;
  http.setTimeout(5000);
  if (!http.begin(String(SERVEUR) + "/api/v1/mesures/lot")) return "";
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", CLE_CAPTEUR);
  int code = http.POST(corps);
  String reponse = code > 0 ? http.getString() : "";
  http.end();

  if (code == 200) {
    tete = (tete + n) % CAPACITE;
    taille -= n;
    return reponse;
  }
  prochain_rattrapage = millis() + 5000;
  if (code == 401) {
    Serial.println("[réseau] clé refusée par le serveur : vérifier CLE_CAPTEUR dans config.h");
  } else if (code == 422) {
    Serial.println("[réseau] mesures refusées (format) : lot abandonné");
    tete = (tete + n) % CAPACITE;
    taille -= n;
  } else {
    Serial.printf("[réseau] serveur injoignable (%s) : %u mesure(s) en attente\n", http.errorToString(code).c_str(), (unsigned)taille);
  }
  return "";
}

void setup() {
  Serial.begin(115200);
  pinMode(BROCHE_LED, OUTPUT);
  delay(300);
  Serial.println();
  Serial.println("KaboChar · capteur de four");
  Serial.printf("Carte « %s » → %s\n", DEVICE_ID, SERVEUR);

  if (!thermocouple.begin()) {
    Serial.println("[capteur] MAX31855 introuvable : vérifier le câblage (CLK 18, CS 5, DO 19, 3V3, GND)");
  }
  delay(500);  // le MAX31855 a besoin d'un court instant après la mise sous tension

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  connecterWifi();
}

void loop() {
  static uint32_t prochaine = 0;
  connecterWifi();

  if ((int32_t)(millis() - prochaine) >= 0) {
    prochaine = millis() + PERIODE_MS;
    double t = thermocouple.readCelsius();
    double interne = thermocouple.readInternal();

    if (isnan(t)) {
      Serial.printf("[capteur] lecture impossible : %s\n", defaut(thermocouple.readError()));
      clignoter(3);
    } else {
      float temp = t + CALIBRATION_DECALAGE_C;
      empiler({millis(), temp, (float)interne});
      Serial.printf("[capteur] %.1f °C (carte %.1f °C)", temp, interne);

      if (WiFi.status() != WL_CONNECTED) {
        Serial.printf(" · hors réseau, %u en attente\n", (unsigned)taille);
      } else {
        String reponse = envoyer();
        if (reponse.length()) {
          String phase = champ(reponse, "phase");
          if (phase.length()) {
            Serial.printf(" · envoyé · cuisson en cours, phase %s\n", phase.c_str());
          } else {
            Serial.println(" · envoyé · mode vérification (aucune cuisson sur ce four)");
          }
          clignoter(1, 30);
        } else {
          Serial.println();
        }
      }
    }
  }

  // Rattrapage : après une coupure, on vide la file par lots sans attendre la mesure suivante.
  if (taille > 1 && WiFi.status() == WL_CONNECTED && (int32_t)(millis() - prochain_rattrapage) >= 0) {
    if (envoyer().length()) Serial.printf("[réseau] rattrapage : %u mesure(s) encore en attente\n", (unsigned)taille);
  }
  delay(20);
}
