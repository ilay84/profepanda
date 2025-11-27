# Dictionary / Glossary – Tech + Product Spec (v1)

Status: draft (safe to implement)
Owner: Dictionary domain
Scope: Public reader UI + Admin builder (JSON storage). DB optional later.

---

## 1) Goals

- Bilingual, multi-sense Spanish dictionary with ES/EN per sense.
- Sense-level tags (controlled enums), related links, examples with source "pills", and optional audio.
- American English equivalents surfaced prominently.
- JSON storage under `data/dictionary/`, schema-validated.
- Fast admin builder with validation; automatic slugging; file-per-entry.

Non-Goals v1
- Search backend; client filtering + simple match is fine.
- Full i18n of content beyond ES/EN.
- DB migration; keep JSON.

---

## 2) Data Model (file per entry)

Storage layout
- Root: `data/dictionary/`
- Files: `data/dictionary/<slug>.json`
- Media (optional): `data/dictionary/<slug>/media/audio/*`

Entry JSON (single file per headword)
```
{
  "word": "choripán",
  "slug": "choripan",
  "audio": null,
  "alt_spellings": ["chori-pan"],
  "senses": [
    {
      "id": "s1",
      "pos": "sustantivo",
      "register": "neutral",
      "freq": "comun",
      "domain": ["comida"],
      "tone": [],
      "status": "vigente",
      "sensitivity": null,

      "definition_es": "Pan con chorizo, típico...",
      "definition_en": "A grilled sausage sandwich...",
      "equivalents_en": ["sausage sandwich"],

      "related_slugs": ["parrilla", "asado"],

      "examples": [
        {
          "es": "Nos comimos un choripán en la cancha.",
          "en": "We ate a choripán at the stadium.",
          "audio": null,
          "source": { "type": "movie", "title": "Relatos Salvajes", "year": 2014 }
        }
      ]
    }
  ]
}
```

Source object (examples.source)
- movie: {type:"movie", title, year}
- series: {type:"series", title, season, episode, year}
- song: {type:"song", artist, title}
- social: {type:"social", platform, post_url, username, profile_url}
- book: {type:"book", author, title}
- other: {type:"other", label}

Normalization & slugs
- Slugs auto-generated from word (lowercased, diacritics stripped, `[^a-z0-9]` -> `-`).
- unique_slug(word) appends -2, -3, ... if needed.

---

## 3) Controlled Vocabularies

Parts of speech
- sustantivo, verbo, adjetivo, adverbio, pronombre, determinante, preposición, conjunción, interjección
- locución_nominal, locución_verbal, locución_adjetival, locución_adverbial, locución_preposicional
- expresión_idiomática, modismo, frase_hecha
- marcador_discursivo, muletilla, fórmula_social, intensificador, exclamación

Register
- formal, neutral, informal, vulgar

Domain (semantic field)
- comida, salud, emociones, familia, trabajo, educación, tecnología, política, economía, cultura pop, deporte, naturaleza, sociedad, transporte

Tone / Affect
- afectuoso, despectivo, irónico, humorístico, poético

Frequency
- muy común, común, menos común, raro

Status / Vitality
- vigente, en desuso, arcaico, regionalismo fuerte

Sensitivity
- potencialmente ofensivo, lenguaje explícito, connotación sexual

---

## 4) JSON Schema (v1)

- Stored at `data/dictionary/_schema.json`

Top-level
- required: `word`, `slug`, `senses`

Sense object
- required: `id`, `pos`, one of `definition_es`/`definition_en`
- fields: `register`, `freq`, `domain[]`, `tone[]`, `status`, `sensitivity`, `equivalents_en[]`, `related_slugs[]`, `examples[]`

Example object
- required: `es` (spanish sentence)
- optional: `en`, `audio`, `source` (typed as above)

---

## 5) Public UI (entry card)

Header
- Audio play icon (if audio), headword in prominent text.
- POS label under headword.

Per sense (render in order)
- Sense label ("Sense 1", "Sense 2"...)
- Spanish definition (supports bold/italic)
- English definition
- American English equivalents (heading: "🇺🇸 American English Equivalents") as a short list
- Related entries (chips/links by slug; internal links)
- Examples
  - Small media row (audio if present)
  - ES sentence (text), EN translation below
  - Source pill: "[icon] Label (details)"

Multiple senses
- Visually separated (divider or card sections).

---

## 6) Admin Builder (single entry editor)

Entry-level
- Word/term (required)
- Headword audio (optional; upload or URL)
- Slug: auto-generated (never a field)

Senses (repeatable/collapsible)
- POS (dropdown with controlled list)
- Tags (all controlled lists; single or multi as specified)
  - register (single)
  - domain, tone (multi)
  - frequency (single)
  - status (single)
  - sensitivity (single)
- Definitions (ES rich text; EN plain or rich text)
- American English equivalents (token list)
- Related entries (token list; validate slug format; prevent self-link)
- Examples (repeater)
  - ES sentence (required)
  - EN translation (optional)
  - Audio (optional)
  - Source (typed form with dynamic fields per type)

Admin UX
- "Add sense" / "Remove sense"
- Validation summaries on save (missing required fields, invalid tags)
- Autoslug on first save; slug shown read-only badge in the header after save
- Safe atomic writes (replace temp file -> current file)

---

## 7) API & Routing (v1)

Public
- GET /dictionary/<slug>/ -> renders entry card templates/public_dictionary_entry.html
- (Optional later) GET /dictionary/api/entry/<slug> -> JSON

Admin
- GET /admin/dictionary/manage -> entries list + "New entry"
- GET /admin/dictionary/new -> builder (blank)
- POST /admin/dictionary/new -> create JSON file
- GET /admin/dictionary/edit/<slug> -> builder (prefilled)
- POST /admin/dictionary/edit/<slug> -> update JSON
- GET /admin/api/dictionary/list?q=&pos=&domain=... -> list/filter for admin UI typeaheads
- POST /admin/api/dictionary/validate -> run schema on a slug or all entries

Storage helpers (new module)
- app/dictionary_store.py
  - read_json/write_json, load/save entry, list_slugs, validate_entry, unique_slug
  - simple search (word/slug/def) with optional tag filters

---

## 8) Icons & Assets

- audio.svg, movie.svg, series.svg, song.svg, social.svg, book.svg, other.svg
- Place in static/assets/icons/; use consistent 16–20px sizing in pills.

---

## 9) Validation Rules (high-value)

- Entry: word non-empty; slug matches ^[a-z0-9]+(?:-[a-z0-9]+)*$
- Sense: pos from enum, at least one of definition_es/en; tags from enums
- Examples: es required; if source.type present, enforce required subfields for that type
- Related: array of lowercase-slug strings; no self reference; duplicates removed

---

## 10) Implementation Plan (phased)

Phase 1: Storage + schema + basic admin
- Add app/dictionary_store.py (CRUD + validation + unique_slug)
- Add data/dictionary/_schema.json + 1–2 sample entries
- Admin routes: manage/new/edit with minimal builder (word, POS, defs, tags, equivalents, related, examples)
- Public route: /dictionary/<slug>/ rendering definitions and examples

Phase 2: Richer UI + source pills
- Add icon set + source pill templating
- Add headword audio + example audio player
- Improve tokens (chips) for tags and related items

Phase 3: Search + filters
- Admin list with filters (POS, domain, register, etc.)
- Public simple filter (POS/domain) and search

Phase 4: QA + content polish
- Enforce schema validation in admin save path
- Lint JSON files on save (sorted keys, UTF-8, pretty)
- Perf pass on client-side rendering and lazy audio

---

## 11) Notes & Consistency

- Keep Montserrat and existing PPX card hierarchy.
- Treat "American English equivalents" as sense-level; if multiple senses share the same list, duplicate explicitly.
- Keep tokens in Spanish for tags (as shown), but translate labels in UI via t(es, en).
- For future regional overlays, the dictionary stays general; regional glossaries handle country-first variants.
