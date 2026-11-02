"""Valeurs publiées utilisées par la plateforme, avec leurs sources.

Chaque valeur affichée dans l'application ou le dossier doit pouvoir être retrouvée ici
(détail et citations : docs/references.md).
"""

# Teneur en eau des cabosses fraîches : 80,9 à 87,1 % selon les études ; on retient le haut de la
# fourchette pour ne pas surestimer la matière sèche.
HUMIDITE_CABOSSE_FRAICHE = 0.85

# Rendement massique d'un four Kon-Tiki : 22 ± 5 % de la matière sèche (Cornelissen et al. 2016).
RENDEMENT_SIMULATION = (0.17, 0.27)

REFERENCES = [
    {
        "cle": "methode_giec",
        "valeur": "CO₂ = masse de biochar sec × F_C × F_perm × 44/12 ; F_perm = 0,89 (> 600 °C), 0,80 (450–600 °C), 0,65 (350–450 °C)",
        "source": "GIEC (2019), Refinement 2006 IPCC Guidelines, vol. 4, ch. 2, appendice 4, éq. 4Ap.1 et table 4Ap.2",
        "url": "https://www.ipcc-nggip.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch02_Ap4_Biochar.pdf",
    },
    {
        "cle": "humidite_cabosse",
        "valeur": "80,9 à 87,1 % d'eau dans la cabosse fraîche",
        "source": "Nguyen & Nguyen (2017), Technologies 5(2):14 ; Martínez-Giraldo et al. (2026), Front. Sustain. Food Syst.",
        "url": "https://doi.org/10.3390/technologies5020014",
    },
    {
        "cle": "rendement_kontiki",
        "valeur": "22 ± 5 % de la matière sèche (four à rideau de flamme)",
        "source": "Cornelissen et al. (2016), PLoS ONE 11(5):e0154617",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4871524/",
    },
    {
        "cle": "temperature_kontiki",
        "valeur": "680–750 °C dans la zone de pyrolyse",
        "source": "Cornelissen et al. (2016), PLoS ONE 11(5):e0154617",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4871524/",
    },
    {
        "cle": "carbone_biochar_cabosse",
        "valeur": "48,8 ± 8,7 % de carbone total, pH 10,7, potassium ≈ 8,6 % (four artisanal)",
        "source": "Mwafulirwa et al. (2024), Journal of Cleaner Production 479:144065",
        "url": "https://centaur.reading.ac.uk/119193/9/1-s2.0-S0959652624035145-main.pdf",
    },
    {
        "cle": "prix_credit_biochar",
        "valeur": "124,02 € par tonne de CO₂ (indice CORCCHAR, septembre 2026)",
        "source": "Puro.earth / Nasdaq, indice des crédits biochar",
        "url": "https://puro.earth/carbon-removal-index-price",
    },
]
