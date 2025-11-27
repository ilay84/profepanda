from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Mapping, Optional

POS_CATALOG: List[Dict[str, Any]] = [
    {"value": "adjetivo", "es": "adjetivo", "en": "adjective", "group": "misc"},
    {"value": "adjetivo_demostrativo", "es": "adjetivo demostrativo", "en": "demonstrative adjective", "group": "misc"},
    {"value": "adverbio", "es": "adverbio", "en": "adverb", "group": "misc"},
    {"value": "articulo", "es": "artículo", "en": "article", "group": "misc"},
    {"value": "conjuncion", "es": "conjunción", "en": "conjunction", "group": "misc"},
    {"value": "construccion_gramatical", "es": "construcción gramatical", "en": "grammatical construction", "group": "misc"},
    {"value": "cuantificador", "es": "cuantificador", "en": "quantifier", "group": "misc"},
    {"value": "determinante", "es": "determinante", "en": "determiner", "group": "misc"},
    {"value": "formula_social", "es": "fórmula social", "en": "formulaic expression (social formula)", "group": "misc"},
    {"value": "frase_hecha", "es": "frase hecha", "en": "idiom", "group": "misc"},
    {"value": "interjeccion", "es": "interjección", "en": "interjection", "group": "misc"},
    {"value": "locucion_adjetival", "es": "locución adjetival", "en": "adjectival phrase", "group": "locution"},
    {"value": "locucion_adverbial", "es": "locución adverbial", "en": "adverbial phrase", "group": "locution"},
    {"value": "locucion_conjuntiva", "es": "locución conjuntiva", "en": "conjunctive phrase", "group": "locution"},
    {"value": "locucion_interjectiva", "es": "locución interjectiva", "en": "interjective phrase", "group": "locution"},
    {"value": "locucion_prepositiva", "es": "locución prepositiva", "en": "prepositional phrase", "group": "locution"},
    {"value": "locucion_sustantival", "es": "locución sustantival", "en": "nominal phrase", "group": "locution"},
    {"value": "locucion_verbal", "es": "locución verbal", "en": "verbal phrase", "group": "locution"},
    {"value": "marcador_discursivo", "es": "marcador discursivo", "en": "discourse marker", "group": "misc"},
    {"value": "muletilla_conversacional", "es": "muletilla conversacional", "en": "conversational filler", "group": "misc"},
    {"value": "nombre_propio", "es": "nombre propio", "en": "proper noun", "group": "noun"},
    {"value": "numeral", "es": "numeral", "en": "numeral", "group": "misc"},
    {"value": "onomatopeya", "es": "onomatopeya", "en": "onomatopoeia", "group": "misc"},
    {"value": "particula_modal", "es": "partícula modal", "en": "modal particle", "group": "misc"},
    {"value": "preposicion", "es": "preposición", "en": "preposition", "group": "misc"},
    {"value": "pronombre", "es": "pronombre", "en": "pronoun", "group": "misc"},
    {"value": "sustantivo_femenino", "es": "sustantivo femenino", "en": "feminine noun", "group": "noun"},
    {"value": "sustantivo_masculino", "es": "sustantivo masculino", "en": "masculine noun", "group": "noun"},
    {
        "value": "sustantivo_masculino_y_femenino",
        "es": "sustantivo masculino y femenino",
        "en": "masculine and feminine noun",
        "group": "noun",
    },
    {"value": "verbo_intransitivo", "es": "verbo intransitivo", "en": "intransitive verb", "group": "verb"},
    {"value": "verbo_pronominal", "es": "verbo pronominal", "en": "pronominal verb", "group": "verb"},
    {"value": "verbo_transitivo", "es": "verbo transitivo", "en": "transitive verb", "group": "verb"},
    {
        "value": "verbo_transitivo_e_intransitivo",
        "es": "verbo transitivo e intransitivo",
        "en": "transitive–intransitive verb",
        "group": "verb",
    },
]

POS_VALUES = {entry["value"] for entry in POS_CATALOG}

LEGACY_ALIASES: Mapping[str, str] = {
    "sustantivo": "sustantivo_masculino_y_femenino",
    "verbo": "verbo_transitivo",
    "verb_transitive": "verbo_transitivo",
    "verb_intransitive": "verbo_intransitivo",
    "verb_transitive_intransitive": "verbo_transitivo_e_intransitivo",
    "verb_transitive_and_intransitive": "verbo_transitivo_e_intransitivo",
    "verb_pronominal_transitive": "verbo_pronominal",
    "verb_pronominal_intransitive": "verbo_pronominal",
    "adjective": "adjetivo",
    "demonstrative adjective": "adjetivo_demostrativo",
    "adverb": "adverbio",
    "article": "articulo",
    "conjunction": "conjuncion",
    "grammatical construction": "construccion_gramatical",
    "quantifier": "cuantificador",
    "determiner": "determinante",
    "formulaic expression (social formula)": "formula_social",
    "idiom": "frase_hecha",
    "interjection": "interjeccion",
    "adjectival phrase": "locucion_adjetival",
    "adverbial phrase": "locucion_adverbial",
    "conjunctive phrase": "locucion_conjuntiva",
    "interjective phrase": "locucion_interjectiva",
    "prepositional phrase": "locucion_prepositiva",
    "nominal phrase": "locucion_sustantival",
    "verbal phrase": "locucion_verbal",
    "discourse marker": "marcador_discursivo",
    "conversational filler": "muletilla_conversacional",
    "proper noun": "nombre_propio",
    "numeral": "numeral",
    "onomatopoeia": "onomatopeya",
    "modal particle": "particula_modal",
    "preposition": "preposicion",
    "pronoun": "pronombre",
    "feminine noun": "sustantivo_femenino",
    "masculine noun": "sustantivo_masculino",
    "epicene noun (masculine & feminine)": "sustantivo_masculino_y_femenino",
    # Legacy typos/variants found in _master set
    "verbo_intran_itivo": "verbo_intransitivo",
    "u_tantivo_ma_culino": "sustantivo_masculino",
    "u_tantivo_femenino": "sustantivo_femenino",
    "u_tantivo_ma_culino_y_femenino": "sustantivo_masculino_y_femenino",
}


def _canon(token: Any) -> str:
    try:
        text = str(token or "").lower().strip()
        text = re.sub(r"\s+", "_", text)
        text = re.sub(r"[^a-z0-9_]", "_", text)
        text = re.sub(r"_+", "_", text).strip("_")
        return text
    except Exception:
        return str(token or "").lower().strip()


def canonicalize(token: Any) -> Optional[str]:
    if not token:
        return None
    clean = _canon(token)
    if clean in POS_VALUES:
        return clean
    if clean in LEGACY_ALIASES:
        return LEGACY_ALIASES[clean]
    bare = clean.replace("_", "")
    for value in POS_VALUES:
        if value.replace("_", "") == bare:
            return value
    return None


def get_catalog(allowed: Optional[Iterable[str]] = None) -> List[Dict[str, Any]]:
    if allowed:
        allowed_set = {str(token) for token in allowed}
        return [entry for entry in POS_CATALOG if entry["value"] in allowed_set]
    return POS_CATALOG[:]


def as_json():
    return get_catalog()


def get_aliases() -> Dict[str, str]:
    return dict(LEGACY_ALIASES)
