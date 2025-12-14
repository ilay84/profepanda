# Glossary Entry Schema (ProfePanda)

This document summarizes the JSON structure used for glossary entries, valid enums (countries, POS), and source metadata used in examples.

## Entry shape (top-level)
```jsonc
{
  "word": "boliche",
  "slug": "boliche",
  "audio": "/media/glossary-audio/entry/boliche/boliche.mp3", // optional
  "alt_spellings": ["bolixe"],                               // optional
  "senses": [/* sense objects */]
}
```

## Sense shape
```jsonc
{
  "id": "s1",                                 // generated if missing
  "countries": ["AR","UY"],                   // ISO-like codes; see list below
  "pos": "sustantivo_masculino_y_femenino",   // see POS section
  "register": "informal" | null,
  "freq": "comun" | "muy_comun" | ... | null, // freq enum
  "domain": ["cultura_pop", ...],             // optional tags
  "tone": ["humoristico", ...],               // optional tags
  "status": ["vigente", ...],                 // optional tags
  "sensitivity": ["potencialmente_ofensivo", ...], // optional tags
  "variants": {                               // optional; noun/adj helpers
    "masc_sg": null, "masc_pl": null,
    "fem_sg": null,  "fem_pl": null,
    "augmentative": null, "diminutive": null
  },
  "definition_es": "Definición en español",
  "definition_en": "Definition in English",
  "equivalents_en": ["equivalent 1", ...],    // array of strings
  "related_slugs": ["otro-term", ...],        // optional
  "alt_forms": [/* alt form objects */],      // optional
  "examples": [/* example objects */]         // optional
}
```

## Alt form shape (sense-level)
```jsonc
{
  "form": "casita",
  "type": "diminutivo",                       // e.g., diminutivo, aumentativo, variante_regional
  "regions": ["AR","UY"],                     // countries where this form applies
  "note_es": "Nota opcional (ES)" | null,
  "note_en": "Optional note (EN)" | null,
  "audio": "/media/glossary-audio/entry/slug/form.mp3" | null,
  "related_slug": "related-entry-slug" | null
}
```

## Example shape (sense-level)
```jsonc
{
  "es": "Ejemplo en español",
  "en": "Example in English",
  "audio": "/media/glossary-audio/examples/slug/s1/slug_ex_01.mp3", // optional
  "source": { /* source metadata; see below */ } | null,
  "linked_terms": ["otro-slug", ...] // optional, related entries
}
```

> Note: In every example text (ES and EN), wrap the target entry term/equivalent in backticks (\`) so it renders highlighted in the glossary.

### Source metadata (per example)
`source.type` drives which fields are relevant:

- **movie**: `title`, `year`
- **series**: `title`, `season`, `episode`, `year`
- **song**: `artist`, `song_title`
- **social**: `platform`, `post_url`, `username`, `profile_url`
- **book**: `author`, `book_title`
- **other**: `label` (freeform)

All fields are strings and optional; type is required when a source is present.

## Controlled enums

### Countries (ISO-like codes)
`AR, UY, CL, MX, ES, CO, PE, PY, BO, EC, VE, PR, DO, CU, GT, CR, PA, HN, NI, SV, GQ, US`

### Parts of speech (value → English label)
- `adjetivo` → adjective
- `adjetivo_demostrativo` → demonstrative adjective
- `adverbio` → adverb
- `articulo` → article
- `conjuncion` → conjunction
- `construccion_gramatical` → grammatical construction
- `cuantificador` → quantifier
- `determinante` → determiner
- `formula_social` → formulaic expression (social formula)
- `frase_hecha` → idiom
- `interjeccion` → interjection
- `locucion_adjetival` → adjectival phrase
- `locucion_adverbial` → adverbial phrase
- `locucion_conjuntiva` → conjunctive phrase
- `locucion_interjectiva` → interjective phrase
- `locucion_prepositiva` → prepositional phrase
- `locucion_sustantival` → nominal phrase
- `locucion_verbal` → verbal phrase
- `marcador_discursivo` → discourse marker
- `muletilla_conversacional` → conversational filler
- `nombre_propio` → proper noun
- `numeral` → numeral
- `onomatopeya` → onomatopoeia
- `particula_modal` → modal particle
- `preposicion` → preposition
- `pronombre` → pronoun
- `sustantivo_femenino` → feminine noun
- `sustantivo_masculino` → masculine noun
- `sustantivo_masculino_y_femenino` → masculine and feminine noun
- `verbo_intransitivo` → intransitive verb
- `verbo_pronominal` → pronominal verb
- `verbo_transitivo` → transitive verb
- `verbo_transitivo_e_intransitivo` → transitive–intransitive verb

### Registers
`formal, neutral, informal, vulgar` (or null)

### Frequency
`raro, menos_comun, comun, muy_comun` (or null)

### Status
`vigente, en_desuso, arcaico, regionalismo_fuerte` (or null/empty)

### Sensitivity
`potencialmente_ofensivo, lenguaje_explicito, connotacion_sexual` (or null/empty)

### Domains (examples)
`comida, salud, emociones, familia, trabajo, educacion, tecnologia, politica, economia, cultura_pop, deporte, naturaleza, sociedad, transporte`

### Tone (examples)
`afectuoso, despectivo, ironico, humoristico, poetico, agresivo`

## Audio paths (current layout)
- Entry audio: `/media/glossary-audio/entry/<slug>/<file>.mp3`
- Example audio: `/media/glossary-audio/examples/<slug>/s<sense>/<slug>_ex_<index>.mp3`

## Notes
- Sense `id` is required; the system generates sequential `s1`, `s2`, … if missing.
- POS and other enums are normalized server-side; unknown tokens default to safe values.
- Example `linked_terms` and sense `related_slugs` are slugs, not display words.

## Definition writing guidelines
- Be concise and direct; prefer a single clear sentence.
- Lead with the core meaning; avoid filler like “Term used to…” unless necessary.
- Use neutral register unless the sense demands otherwise; mention register/region via fields, not prose.
- Avoid circularity; don’t redefine with the same word unless indicating etymology/shortening.
- Prefer plain text; keep HTML minimal (e.g., `<em>` for referenced terms); strip stray spans.
- For abbreviations/shortenings, say “Shortened form of X, used to refer to Y.”
- For functional phrases, use “To [verb]…” or “[Noun phrase] that…” patterns.
- Keep examples for examples; definitions should not include usage examples.

## Variants and other forms
- Only add variants that are at least somewhat common for the term; avoid obscure or unused forms.
- For augmentative/diminutive, list masculine and feminine in one field separated by a comma (e.g., `grandote, grandota`), since the glossary doesn’t support gendered split fields.
- Keep variant fields short and normalized (no full sentences).
- Use `alt_forms` for true alternate spellings/orthographic variants or region-specific forms; include regions where relevant.
