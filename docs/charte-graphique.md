# Charte graphique « Terre & Braise »

L'identité part de la matière du projet : la cabosse, la braise du four, le charbon, la terre qui reçoit le biochar.
Les valeurs exactes sont dans [`design/tokens.json`](../design/tokens.json), source unique pour l'appli et le tableau de bord.

## Deux ambiances, un seul langage

| | Application mobile | Tableau de bord |
|---|---|---|
| Usage | Sur le terrain, en plein soleil | Au bureau, sur grand écran, en démonstration |
| Fond | Papier clair (`papier.50`) | Charbon (`charbon.950`) |
| Contraste | Maximal : boutons principaux charbon sur papier | Accents braise sur charbon |

Une appli sombre est illisible au soleil : c'est pour ça que le mobile est clair.

## Rôle des couleurs

- **Braise** : tout ce qui est chaud ou vivant (température, cuisson en cours, action principale). En texte sur fond clair, utiliser `braise.600` ou plus foncé (contraste).
- **Feuille** : le sol, le carbone stocké, ce qui est validé.
- **Cabosse** : la matière première (collecte, séchage).
- **Cacao** : l'enrichissement.
- **Ardoise** : l'eau (rétention, humidité).
- **Danger** : uniquement pour les alertes réelles.

Chaque étape d'un lot a sa couleur (`etapes` dans les tokens), la même partout : frise du passeport, carte, graphiques.

## Typographie

- **Bricolage Grotesque** pour les titres : un caractère dessiné, qui évite l'effet « template ».
- **IBM Plex Sans** pour le texte courant.
- **IBM Plex Mono** pour toutes les mesures (°C, kg, CO₂) : les chiffres ont la même largeur, donc un compteur qui défile ne « tremble » pas, comme sur un instrument.

## Honnêteté des données, visible à l'écran

- Badge **SIMULATION** (contour pointillé braise) sur toute courbe issue du simulateur.
- Badge **DÉMO** (contour charbon) sur les producteurs, parcelles et lots fictifs.

Ces badges ne sont jamais masqués : le jury doit voir ce qui est mesuré et ce qui est simulé.

## Mouvement

Transitions courtes (150–250 ms), sans rebond gratuit. Une vibration légère confirme chaque enregistrement sur le terrain.
