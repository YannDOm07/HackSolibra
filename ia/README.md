# Modèle de diagnostic des cabosses

L'agent de terrain photographie une cabosse ; le modèle indique si elle est **saine**, atteinte de **pourriture brune**
ou de **foreur de cabosse**, avec un niveau de confiance et un conseil. Lien avec KaboChar : les cabosses malades
partent au séchage puis au four, où la pyrolyse détruit l'agent de la maladie.

## Méthode

« Sonde linéaire » sur un modèle de vision pré-entraîné :

1. **DINOv2-small** (Meta AI, licence Apache 2.0), au format ONNX et exécuté avec onnxruntime, transforme chaque photo
   en 768 caractéristiques (jeton CLS + moyenne des patchs). Ce modèle n'est pas modifié.
2. Une **régression logistique multinomiale**, écrite en numpy, apprend à classer ces caractéristiques.
   La perte est pondérée par classe pour ne pas sacrifier la classe rare (foreur).

Pourquoi cette méthode : elle marche très bien avec peu d'images, s'entraîne en quelques minutes sans carte graphique,
et le modèle final se résume à un petit fichier (`modele/tete.json`) plus l'extracteur.

## Données

« Cacao Diseases » (Zaldy Jr. Pagaduan, [Kaggle](https://www.kaggle.com/datasets/zaldyjr/cacao-diseases), licence CC BY-SA 4.0) :
4 390 photos prises à Davao City (Philippines). Saines 3 344, pourriture brune 943, foreur 103.

- **Découpage stratifié, graine fixe (2026)** : 70 % entraînement (3 074), 15 % validation (658) pour choisir la régularisation, 15 % test (658) jamais vu.
- **Augmentation** (entraînement seulement) : miroir horizontal ; rotations 90°, 180°, 270° pour le foreur.
- **Contrôle des quasi-doublons** entre test et entraînement (similarité cosinus ≥ 0,97) : 1 seule photo concernée, scores inchangés sans elle.

## Résultats sur le jeu de test (658 photos)

| Classe | Photos | Précision | Rappel | F1 |
|---|---|---|---|---|
| Cabosse saine | 502 | 96,2 % | 94,8 % | 95,5 % |
| Pourriture brune | 141 | 83,2 % | 87,9 % | 85,5 % |
| Foreur de cabosse | 15 | 78,6 % | 73,3 % | 75,9 % |

**Exactitude 92,9 %** · exactitude équilibrée 85,4 % · **F1 macro 85,6 %**.
Quand la confiance dépasse 60 % (97 % des photos), l'exactitude monte à 94,1 % ; en dessous, l'application demande de reprendre la photo.

Matrice de confusion (lignes : vraie classe ; colonnes : saine, pourriture, foreur) :
`[[476, 24, 2], [16, 124, 1], [3, 1, 11]]`. L'erreur la plus fréquente : confondre une cabosse saine et une cabosse atteinte de pourriture brune.

Détail complet : `modele/metriques.json` (aussi publié par l'API : `GET /api/v1/ia/modele`).

## Limites

- Photos des **Philippines** : variétés, lumière et cadrage diffèrent en Côte d'Ivoire. À confirmer sur le terrain.
- Le **foreur** n'a que 103 photos (15 au test) : son score est le moins fiable.
- Le modèle ne connaît **que ces trois classes** : il ne peut pas reconnaître le swollen shoot ou d'autres maladies.
- Pendant le pilote, les photos prises par les agents (avec l'accord des producteurs) serviront à le réentraîner.

## Réentraîner

- **Sur Google Colab (recommandé, rien sur le PC)** : ouvrir `entrainement_colab.ipynb` dans Colab, *Exécution ▸ Tout exécuter*,
  puis copier `tete.json` et `metriques.json` téléchargés dans `ia/modele/`.
- **En local** : `pip install kagglehub onnxruntime pillow numpy` puis `python entrainer.py` (≈ 10 min sur processeur).

Le serveur utilise `modele/tete.json` ; l'extracteur `modeles/dinov2-small.onnx` (88 Mo) est téléchargé et vérifié
(empreinte SHA-256) automatiquement au premier diagnostic.

`exemples/` contient six photos du jeu de test pour les démonstrations (même licence, auteur cité).
