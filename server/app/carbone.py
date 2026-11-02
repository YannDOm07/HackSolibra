"""Bilan carbone d'un lot de biochar.

Méthode : GIEC, Refinement 2019 des lignes directrices de 2006, volume 4, chapitre 2, appendice 4.

    CO2 stocké (kg) = masse de biochar sec (kg) × F_C × F_perm × 44/12

F_C    : fraction de carbone organique du biochar.
F_perm : fraction de ce carbone encore présente dans le sol après 100 ans ; elle dépend de la
         température de production, que nos capteurs mesurent pour chaque cuisson.
"""
from dataclasses import asdict, dataclass

RATIO_CO2_C = 44 / 12

F_PERM = {"haute": 0.89, "moyenne": 0.80, "basse": 0.65}

# Le GIEC ne donne pas de F_C pour la cabosse (Table 4Ap.1 : 0,49 balle de riz, 0,65 herbacées).
# On retient 0,45 en attendant notre analyse de laboratoire : c'est sous le carbone total mesuré sur
# du biochar artisanal de cabosse (48,8 %, Mwafulirwa et al. 2024), qui inclut aussi du carbone minéral.
F_C_DEFAUT = 0.45

LIBELLES_CLASSE = {
    "haute": "Haute température (> 600 °C)",
    "moyenne": "Température moyenne (450–600 °C)",
    "basse": "Basse température (350–450 °C)",
    "insuffisante": "Carbonisation insuffisante (< 350 °C)",
    "inconnue": "Température non mesurée",
}


def classe_temperature(temp_c: float | None) -> str:
    if temp_c is None:
        return "inconnue"
    if temp_c > 600:
        return "haute"
    if temp_c >= 450:
        return "moyenne"
    if temp_c >= 350:
        return "basse"
    return "insuffisante"


@dataclass(frozen=True)
class BilanCarbone:
    masse_biochar_kg: float
    f_c: float
    f_perm: float
    classe: str
    co2_kg: float

    def as_dict(self) -> dict:
        return asdict(self)


def bilan_carbone(masse_biochar_kg: float | None, classe: str, f_c: float = F_C_DEFAUT) -> BilanCarbone:
    masse = masse_biochar_kg or 0.0
    f_perm = F_PERM.get(classe, 0.0)
    return BilanCarbone(
        masse_biochar_kg=masse,
        f_c=f_c,
        f_perm=f_perm,
        classe=classe,
        co2_kg=round(masse * f_c * f_perm * RATIO_CO2_C, 2),
    )


METHODE = {
    "formule": "CO₂ stocké = masse de biochar sec × F_C × F_perm × 44/12",
    "reference": "GIEC (2019), Refinement to the 2006 IPCC Guidelines, vol. 4, ch. 2, appendice 4",
    "nature": "Estimation brute de séquestration. Les standards de certification déduisent ensuite "
              "les émissions du procédé : les crédits certifiés seront inférieurs.",
    "f_c_defaut": F_C_DEFAUT,
    "f_c_justification": "Valeur prudente en attendant l'analyse de laboratoire (carbone total mesuré "
                         "sur biochar artisanal de cabosse : 48,8 %, Mwafulirwa et al. 2024).",
    "table_f_perm": F_PERM,
    "classes": LIBELLES_CLASSE,
    "temperature_retenue": "Médiane des températures mesurées pendant la phase de carbonisation (choix prudent).",
}
