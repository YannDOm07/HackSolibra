# Références scientifiques

Toutes les valeurs utilisées par la plateforme et dans le dossier, avec leur source exacte.
Vérifiées le 2 novembre 2026 en lisant le texte source.

> **Règle** : on ne cite que ce qui est écrit ici. Une valeur de laboratoire n'est jamais présentée comme un résultat de terrain,
> et nos propres mesures remplaceront ces valeurs dès le test terrain.

## 1. Méthode carbone : GIEC 2019

Source : GIEC (2019), *Refinement to the 2006 IPCC Guidelines*, vol. 4, ch. 2, appendice 4.
[PDF](https://www.ipcc-nggip.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch02_Ap4_Biochar.pdf)

- Équation 4Ap.1 : carbone stocké = masse de biochar sec × F_C × F_perm (× 44/12 pour passer en CO₂).
- Le biochar est défini par un chauffage au-delà de 350 °C (p. Ap4.1). La méthode vaut pour les sols minéraux de cultures et prairies.

**F_perm** (part du carbone restant après 100 ans, table 4Ap.2, p. Ap4.3) :

| Température de production | F_perm |
|---|---|
| Haute (> 600 °C) | 0,89 ± 13 % |
| Moyenne (450–600 °C) | 0,80 ± 11 % |
| Basse (350–450 °C) | 0,65 ± 15 % |

**F_C** (carbone organique du biochar, table 4Ap.1, p. Ap4.2, pyrolyse) : fumier 0,38 · biosolides 0,35 · balle et paille de riz 0,49 · herbacées 0,65 · coques et noyaux 0,74 · bois 0,77.
**La cabosse n'a pas de catégorie propre.**

**Notre choix : F_C = 0,45** en attendant l'analyse de laboratoire de notre biochar. C'est sous le carbone total mesuré sur du biochar artisanal de cabosse (48,8 %, voir §4), qui inclut aussi du carbone minéral. Choix volontairement prudent.

**Lien avec nos capteurs** : la classe de F_perm dépend de la température. Notre thermocouple la mesure à chaque cuisson ; la plateforme retient la **médiane** des températures de la phase de carbonisation (plus prudent que le maximum).

## 2. Humidité de la cabosse fraîche

| Valeur | Conditions | Source |
|---|---|---|
| 87,06 % | Base humide, Vietnam | Nguyen & Nguyen (2017), *Technologies* 5(2):14, [doi:10.3390/technologies5020014](https://doi.org/10.3390/technologies5020014) |
| 80,9 à 86,25 % | 5 variétés, Colombie | Martínez-Giraldo et al. (2026), *Front. Sustain. Food Syst.*, doi:10.3389/fsufs.2026.1764336, table 1 |
| ≈ 81 % (19 % de matière sèche) | Ouganda | Kilama et al. (2019), *Energy Sustain. Soc.* 9:22, [lien](https://energsustainsoc.biomedcentral.com/articles/10.1186/s13705-019-0205-4) |

**Notre choix : 85 %.** Conséquence pratique : une tonne de cabosses fraîches ne donne que 130 à 190 kg de matière sèche. D'où la transformation **au village** : on ne transporte pas de l'eau.

## 3. Rendement en biochar

| Valeur | Conditions | Source |
|---|---|---|
| **22 ± 5 %** (matière sèche), plage 13–32 % | **Four Kon-Tiki**, terrain, divers végétaux | Cornelissen et al. (2016), *PLoS ONE* 11(5):e0154617, [lien](https://pmc.ncbi.nlm.nih.gov/articles/PMC4871524/) |
| 15–20 % | Four Kon-Tiki | Schmidt & Taylor (2014), *the Biochar Journal*, [lien](https://www.biochar-journal.org/en/ct/39) |
| 49,2 % à 350 °C ; 39,0 % à 500 °C | Cabosse, laboratoire | Ghysels et al. (2020), *Sustain. Energy Fuels* 4:3712, doi:10.1039/D0SE00689K |
| 43,7 % à 400 °C ; 32,8 % à 900 °C | Cabosse **de Côte d'Ivoire**, laboratoire | Koffi et al. (2025), *Bois et Forêts des Tropiques* 362, doi:10.19182/bft2025.362.a37907 |
| 33 % (retort) ; 13 % (gazéifieur) | Cabosse, échelle ferme, Malaisie | Hamzah et al. (2026), *IJROWA*, doi:10.57647/ijrowa.2026.7968 (résumé) |

**Notre hypothèse de terrain : 22 ± 5 %** (Kon-Tiki). Les rendements de laboratoire (39–49 %) ne s'appliquent pas à un four artisanal. Le test terrain mesurera le nôtre.

## 4. Propriétés du biochar de cabosse

| Valeur | Conditions | Source |
|---|---|---|
| Carbone total 48,8 ± 8,7 % ; pH 10,7 ; potassium ≈ 8,6 % | Four artisanal (fût dans fût), Ghana | Mwafulirwa et al. (2024), *J. Clean. Prod.* 479:144065, [PDF](https://centaur.reading.ac.uk/119193/9/1-s2.0-S0959652624035145-main.pdf), table 1 |
| C 55,3 % ; cendres 16,0 % ; pH 9,5 | Laboratoire, 350 °C | Ghysels et al. (2020), table 2 |
| C 60,9 % ; cendres 22,1 % ; pH 9,6 | Laboratoire, 500 °C | Ghysels et al. (2020), table 2 |

**À retenir** : biochar **alcalin** (pH 9,5–10,7) et **très riche en potassium**, deux atouts pour les sols acides des cacaoyères.

## 5. Fours à rideau de flamme (Kon-Tiki)

| Valeur | Source |
|---|---|
| Zone de pyrolyse à 680–750 °C | Cornelissen et al. (2016) |
| 650–700 °C | Schmidt & Taylor (2014) |
| Monoxyde de carbone : 54 g/kg de biochar contre 351 g/kg pour les fours traditionnels ; oxydes d'azote et composés organiques volatils aussi nettement plus bas | Cornelissen et al. (2016) |
| Méthane et particules : **pas de différence significative** avec les fours traditionnels | Cornelissen et al. (2016) |

**Formulation correcte** : « beaucoup moins de monoxyde de carbone et de composés organiques volatils qu'une meule traditionnelle ».
**À ne pas écrire** : « moins de fumée » ou « moins de méthane » (non démontré).

## 6. Cabosses et pourriture brune

- *Phytophthora megakarya* et *P. palmivora* ont été isolés sur des cosses prélevées dans des tas de cosses (Bello et al. 2014, *Pak. J. Sci. Ind. Res.* 57(2):81–85).
- Les débris de cabosses infectées propagent le pathogène ; leur retrait élimine des sources d'inoculum (Kongor et al. 2024, *CABI Agric. Biosci.* 5:102, [lien](https://cabiagbio.biomedcentral.com/articles/10.1186/s43170-024-00310-6)).
- La pyrolyse détruit *Phytophthora* (Mwafulirwa et al. 2024).

**Formulation correcte** : « les tas de cabosses peuvent héberger l'agent de la pourriture brune ; leur élimination fait partie des recommandations sanitaires ».
Aucune étude ne chiffre leur contribution aux épidémies : ne pas en inventer.

## 7. Gisement

| Valeur | Source |
|---|---|
| 13 à 15 millions de tonnes de cabosses par an en Côte d'Ivoire | CTCN, [document](https://www.ctc-n.org/file-download/download/public/19268) |
| ≈ 4,4 Mt de matière sèche (15 Mt humides) | GBN, [fiche sectorielle](https://cop.impulsouth.org/wp-content/uploads/2025/01/GBN_Sector-Brief_CIV_Bioabfall_FR_Web.pdf) |
| ≈ 10 t de cabosses humides par tonne de fèves sèches (valeur de revue) | Ouattara et al. (2021), *BioResources* 16(1), p. 1990 |
| ≈ 4 t de cosses fraîches par tonne de fèves (seule mesure directe trouvée) | Kilama et al. (2019), table 3 |

Les estimations varient du simple au double selon la méthode : dans le dossier, on cite la source à chaque fois.

## 8. Crédits carbone

| Valeur | Source |
|---|---|
| 124,02 € par tonne de CO₂ (indice biochar CORCCHAR, septembre 2026) | [Puro.earth](https://puro.earth/carbon-removal-index-price) |
| Fourchette 100–300 $ par tonne de CO₂ | IETA, juin 2026, [note](https://www.ieta.org/uploads/wp-content/2026/03/IETA_CMWG_BusinessBrief_Biochar_FinalJune2026.pdf) |

**Standard adapté aux petits producteurs** : *Global Artisan C-Sink* de Carbon Standards International, version 2.1A du 15 juin 2024 ([page officielle](https://www.carbon-standards.com/en/global-artisan-c-sink)).
- Ouvert aux pays à revenu faible et intermédiaire, dont la Côte d'Ivoire.
- Kon-Tiki admis si la température dépasse 650 °C : nos capteurs le prouvent cuisson par cuisson.
- Le standard **déduit** les émissions du procédé (méthane : 30 kg par tonne de biochar). Le standard précise que la cabosse n'a pas encore été étudiée sur ce point.

**Conséquence** : le CO₂ affiché par la plateforme est une **estimation brute** selon le GIEC. Les crédits certifiés seront inférieurs, et le modèle économique ne doit pas reposer sur eux pendant le pilote.
