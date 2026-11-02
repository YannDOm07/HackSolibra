# Comment fonctionne KaboChar

Fiche pour toute l'équipe : ce que fait la plateforme, comment elle marche, et où regarder dans le code.

## En une phrase

KaboChar suit chaque lot de cabosses **de la plantation jusqu'au retour au sol**, en enregistrant des preuves à chaque étape
(pesées, GPS, photos, température du four), et en déduit **combien de CO₂ est stocké** selon la méthode du GIEC.

## Les pièces du système

```
 TÉLÉPHONE (Expo)            SERVEUR (Python)                   FOUR
 ┌──────────────┐  synchro  ┌────────────────────┐  mesures  ┌──────────────┐
 │ saisies      │ ────────► │ base de données    │ ◄──────── │ ESP32 +      │
 │ base locale  │ ◄──────── │ analyse cuissons   │ toutes les│ thermocouple │
 │ (SQLite)     │  direct   │ calcul carbone     │ secondes  │ MAX31855     │
 └──────────────┘ WebSocket └────────────────────┘           └──────────────┘
                                     ▲
                                     └── tableau de bord web (coordination, jury)
```

## La vie d'un lot

| Étape | Ce que fait l'agent | Ce que fait la plateforme |
|---|---|---|
| **1. Collecte** | Choisit le producteur et la parcelle, pèse les cabosses, prend une photo | Estime la matière sèche (cabosses fraîches à 85 % d'eau), crée le code `KC-26-XXXX` et son QR code, **même sans réseau** |
| **2. Séchage** | « Mettre au séchage » | Date l'étape |
| **3. Pyrolyse** | « Enfourner » : masse sèche, four, capteur ou simulation | Démarre la cuisson sur le serveur, affiche la courbe en direct. **Seule étape qui exige le réseau** |
| **4. Pesée** | Saisit le poids du biochar sec | Calcule le rendement et le compare au repère publié (22 ± 5 %) ; alerte au-delà de 45 % (biochar mal séché) |
| **5. Retour au sol** | Choisit la parcelle qui reçoit le biochar | Par défaut la parcelle d'origine (**boucle fermée**) ; le passeport est complet |

## Sous le capot

### Hors ligne
Chaque saisie est enregistrée dans la base du téléphone et marquée « à envoyer ».
La synchronisation part seule : 1 seconde après une saisie, toutes les 45 secondes, au retour du réseau et au retour dans l'application.
Le serveur ne renvoie que ce qui a changé depuis la dernière fois. Un lot ne recule jamais d'étape.

### Direct
Capteur → serveur → WebSocket → téléphones et tableau de bord, en moins d'une seconde.
En ouvrant une cuisson déjà commencée, l'application charge l'historique puis enchaîne sur le direct sans perdre de mesure.

### Analyse d'une cuisson (`server/app/cuisson.py`)
À partir de la seule courbe de température, le serveur détecte :
- le début de la carbonisation (450 °C tenus 2 minutes) ;
- chaque ajout de cabosses (creux d'au moins 50 °C) ;
- l'extinction à l'eau (chute rapide sous 300 °C).

Il retient la **température médiane** de la carbonisation (plus prudente que le maximum), qui donne la **classe GIEC** :
haute (> 600 °C), moyenne (450–600 °C), basse (350–450 °C).
C'est le rôle du capteur : **la température mesurée fixe la stabilité du carbone**.

### Calcul carbone (`server/app/carbone.py`)
`CO₂ stocké = biochar sec × F_C × F_perm × 44/12`

Exemple réel : `44,2 kg × 0,45 × 0,89 × 44/12 = 64,9 kg de CO₂`.
C'est une **estimation brute** : les crédits certifiés seront inférieurs (le standard déduit les émissions du four), et on l'affiche.
Toutes les valeurs et leurs sources : [`references.md`](references.md).

### Diagnostic des cabosses par l'IA (`ia/`, `server/app/ia.py`)
L'agent photographie une cabosse ; le modèle répond **saine**, **pourriture brune** ou **foreur de cabosse**, avec sa confiance et un conseil
(les cabosses malades partent au four, où la pyrolyse détruit la maladie). Méthode : DINOv2-small (Meta) extrait les caractéristiques
de la photo, une couche de décision entraînée sur 4 390 photos publiques les classe.
Scores réels sur 658 photos jamais vues : **exactitude 92,9 %**, F1 macro 85,6 %. Limite : photos des Philippines, à confirmer
sur des cabosses ivoiriennes pendant le pilote. Détail : [`ia/README.md`](../ia/README.md).

### Empreinte SHA-256
Un « résumé » calculé à partir des pesées, des dates et de la cuisson. Si une seule donnée change, l'empreinte change : preuve d'intégrité.

### Honnêteté des données
- **DÉMO** : producteurs, parcelles et lots fictifs.
- **SIMULATION** : courbes produites par le simulateur (calé sur les températures publiées des fours à rideau de flamme).
- **CAPTEUR** : mesures réelles du thermocouple.

## Les écrans de l'application mobile

- **Accueil** : compteur de CO₂, fours en direct, chaîne des lots, derniers lots.
- **Lots** : recherche et filtre par étape.
- **Fours** : état des fours, allumage d'une cuisson.
- **Producteurs** : fiches, parcelles GPS, accord du producteur pour ses données (loi n° 2013-450).
- **Passeport** : le « billet » du lot (QR code, parcours, cuisson, bilan carbone, vérification).
- **Cuisson en direct** : température, phases, courbe, classe GIEC.
- **Scanner** : lit le QR code d'un lot et ouvre son passeport.
- **Réglages** : adresse du serveur, capteurs détectés (test de l'ESP32), sources scientifiques.

## Le tableau de bord (salle de contrôle)

Servi par le serveur sur http://localhost:8000 (adresse `/tableau/`), pour la coordination et pour le jury.

- **Vue d'ensemble** : CO₂ stocké, biochar, cabosses valorisées, rendement, hectares amendés, producteurs et productrices,
  emplois de jeunes ; production par semaine ; chaîne des lots par étape ; classes de température ; carte du terrain
  (plan ou satellite) ; fours en direct ; derniers lots. Filtre de période en haut.
- **Fours en direct** : la courbe de chaque four se dessine en direct, avec lecture au survol, phases, classe GIEC et alertes ;
  boutons pour lancer une cuisson (capteur ou simulation) ; panneau de test des capteurs ESP32.
- **Lots** et **passeport** : recherche, filtre par étape, et pour chaque lot son passeport complet (QR code, parcours,
  courbe, calcul carbone détaillé, empreinte SHA-256, photos du terrain).
- **Producteurs** : fiches, parcelles, surface suivie, part des productrices.
- **Diagnostics IA** : fiche du modèle (scores par classe, matrice de confusion, limites) et derniers diagnostics avec leurs photos.
- **Rapport trimestriel** : le rapport exigé par l'article 10 du règlement, généré automatiquement et imprimable en PDF.
- **Méthode et sources** : la formule, la table du GIEC et chaque valeur publiée avec son lien.

Les couleurs des étapes ont été validées par calcul (lisibilité pour les daltoniens et contraste) sur fond clair et sombre.

## Où regarder dans le code

| Dossier | Contenu |
|---|---|
| `mobile/src/app/` | Un fichier = un écran (`lot/[id].tsx` passeport, `cuisson/[id].tsx` direct…) |
| `mobile/src/lib/` | `store.ts` (données du téléphone), `synchro.ts`, `direct.ts`, `api.ts` |
| `mobile/src/components/` | Boutons, courbe de température, cartes, barre d'onglets |
| `dashboard/src/pages/` | Pages du tableau de bord (vue d'ensemble, fours, lots, passeport, producteurs, rapport, méthode) |
| `dashboard/src/components/` | Graphiques, carte, menu latéral |
| `server/app/` | `cuisson.py` (analyse, simulateur), `carbone.py` (GIEC), `services.py` (passeport, impact), `routers/` (API) |
| `docs/` | Charte graphique, références scientifiques, cette fiche |

## Trois phrases pour le jury

1. « Chaque lot a un passeport : on sait d'où viennent les cabosses, à quelle température elles ont été cuites et où le biochar est retourné. »
2. « Le capteur n'est pas décoratif : la température mesurée fixe la stabilité du carbone selon la méthode du GIEC. »
3. « L'application marche sans réseau, parce que les plantations n'en ont pas. »
