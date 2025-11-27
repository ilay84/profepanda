# Regional Glossaries — Product & Tech Spec (v1)

Status: draft (safe to implement)
Owner: Glossaries domain
Scope: Public reader UI + Admin authoring model (data + UX). Focus is the modal reader and country‑first linking. Storage stays JSON for v1; DB optional in v2.

---

## 0) Goals (TL;DR)

- Country‑first linking. When editing an AR sense, links resolve to AR entries by default.
- Two link types.
  - Curated Related links (sense‑level).
  - Inline mentions inside examples/notes (stored as ranges; text stays pristine).
- Bilingual by design. ES/EN for definitions & UI; links don’t break localization.
- Controlled tags. Strict enums power search/filters and prevent chip chaos.
- Safety: schema validation, tag enums, and URL‑scoped filters to avoid data drift.

Non‑goals v1
- DB migration; keep JSON files under `data/glossary/`.
- Automated data migration; author will migrate entries manually, one at a time.
- Search backend; client filtering + basic accent‑insensitive match suffices.

---

## 1) Information Architecture & Layout

### Desktop
- Top bar: Search (scope: Global/Country), language toggle ES/EN.
- Left rail: Country selector, Filters (POS, Register, Domain, Frequency, Sensitivity), Active chips.
- Main panel: Virtualized row list of entries (fast scanning).
- Details drawer (right): Senses stack, audio, examples, Related section, cross‑country Compare button.

### Mobile
- Search and filters slide‑in.
- List remains primary; details drawer is full‑height.

Reader v1
- We keep the old visual for the public modal (overlay), and optionally a details drawer later.

---

## 2) Normalized Tag Set (controlled vocab)

Use canonical keys in data. UI renders bilingual labels (ES/EN).

- `country`: AR, UY, CL, MX, ES, CO, PE, PY, BO, EC, VE, PR, DO, CU, GT, CR, PA, HN, NI, SV
- `pos`: sustantivo, verbo, adjetivo, adverbio, locución, expresión, interjección, pronombre, conector
- `register`: formal, neutral, informal, vulgar (nullable)
- `freq`: raro, menos_comun, comun, muy_comun (nullable)
- `domain`: comida, salud, deportes, politica, tecnologia, transporte, trabajo, familia, educacion, economia, cultura_pop
- `tone`: afectuoso, despectivo, ironico, humoristico
- `status`: vigente, en_desuso, arcaico, regionalismo_fuerte (nullable)
- `sensitivity`: potencialmente_ofensivo (nullable)

Validation: schema rejects values outside enums; UI maps to chips.

---

## 3) JSON Data Model (sense‑level linking)

Entry (unchanged core)
- `word`, `slug`, `audio`, optional `alt_spellings`
- `senses`: array of sense objects (below)

Sense (adds curated and inline links)
```json
{
  "id": "s1",
  "countries": ["AR"],
  "pos": "verbo",
  "register": "informal",
  "freq": "comun",
  "domain": [],
  "tone": [],
  "status": "vigente",
  "sensitivity": null,

  "definition_es": "…",
  "definition_en": "…",
  "equivalents_en": ["…"],
  "equivalents_es": [],
  "notes_es": "…",
  "notes_en": "…",

  "examples": [
    {
      "es": "Texto con término a enlazar…",
      "en": "…",
      "audio": null,
      "source": {"kind": "serie", "title": "…", "year": "…"}
    }
  ],

  "related_slugs": ["contestar", "robar"],

  "linked_mentions": [
    {
      "text": "contestar",
      "target_slug": "contestar",
      "target_country": "AR",
      "source": "example_auto",
      "lang": "es",
      "range": {"start": 57, "end": 66}
    }
  ],

  "see_also_legacy": []
}
```

Why sense‑level? Relations depend on meaning + country; avoids noisy global relations.

---

## 4) JSON Schema (minimal, extensible)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://profepanda/glossary.schema.json",
  "type": "object",
  "required": ["word", "slug", "senses"],
  "properties": {
    "word": {"type": "string"},
    "slug": {"type": "string", "pattern": "^[a-z0-9\-]+$"},
    "audio": {"type": ["string", "null"]},
    "alt_spellings": {"type": "array", "items": {"type": "string"}},
    "senses": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id","countries","pos","definition_es","definition_en"],
        "properties": {
          "id": {"type": "string"},
          "countries": {"type": "array", "minItems": 1,
            "items": {"type": "string", "enum": ["AR","UY","CL","MX","ES","CO","PE","PY","BO","EC","VE","PR","DO","CU","GT","CR","PA","HN","NI","SV"]}},
          "pos": {"type": "string", "enum": ["sustantivo","verbo","adjetivo","adverbio","locución","expresión","interjección","pronombre","conector"]},
          "register": {"type": ["string","null"], "enum": ["formal","neutral","informal","vulgar",null]},
          "freq": {"type": ["string","null"], "enum": ["raro","menos_comun","comun","muy_comun",null]},
          "domain": {"type": "array", "items": {"type": "string", "enum": ["comida","salud","deportes","politica","tecnologia","transporte","trabajo","familia","educacion","economia","cultura_pop"]}},
          "tone": {"type": "array", "items": {"type": "string", "enum": ["afectuoso","despectivo","ironico","humoristico"]}},
          "status": {"type": ["string","null"], "enum": ["vigente","en_desuso","arcaico","regionalismo_fuerte",null]},
          "sensitivity": {"type": ["string","null"], "enum": ["potencialmente_ofensivo",null]},

          "definition_es": {"type": "string"},
          "definition_en": {"type": "string"},
          "equivalents_en": {"type": "array", "items": {"type": "string"}},
          "equivalents_es": {"type": "array", "items": {"type": "string"}},
          "notes_es": {"type": ["string","null"]},
          "notes_en": {"type": ["string","null"]},

          "examples": {"type": "array", "items": {
            "type": "object", "required": ["es"],
            "properties": {"es": {"type": "string"}, "en": {"type": ["string","null"]}, "audio": {"type": ["string","null"]}, "source": {"type": ["object","null"]}}
          }},

          "related_slugs": {"type": "array", "items": {"type": "string"}},

          "linked_mentions": {"type": "array", "items": {
            "type": "object", "required": ["text","target_slug","target_country","source","lang","range"],
            "properties": {
              "text": {"type": "string"},
              "target_slug": {"type": "string"},
              "target_country": {"type": "string"},
              "source": {"type": "string", "enum": ["example_auto","example_manual","definition_manual"]},
              "lang": {"type": "string", "enum": ["es","en"]},
              "range": {"type": "object", "required": ["start","end"],
                "properties": {"start": {"type": "integer", "minimum": 0}, "end": {"type": "integer", "minimum": 0}}
              }
            }
          }}
        }
      }
    }
  }
}
```

---

## 5) Editor UX (fast + safe)

### A) Related (curated)
- Sense card → Related token input
- Type‑ahead (accent‑insensitive) over same‑country entries
- Chips with remove ×, drag reorder
- Prevent self‑link and duplicates
- v2: relation type (synonym | contrast | regional_variant)

### B) Inline mentions
- Authors type normally in Examples/Notes/Definition.
- On Save: Autolink Review Panel
  - Exact matches (in‑country) → “Apply all”
  - Likely matches (fuzzy) → pick/ignore per item
- Approved links go to `linked_mentions` (text unchanged)
- If text later changes → “Stale link” badge → Reflow ranges (auto realign)

### C) Manual @‑link
- Optional: `@` + slug to add a manual mention at caret → insert to `linked_mentions` with a range

### D) Backlinks (read‑only)
- Compute “Mentioned by” on read; no writes to targets

---

## 6) Autolinker Algorithm (country‑first)

Inputs: `country_ctx`, `index_primary`, `index_fallback` (optional), `stoplist`
Steps
1) Normalize text (NFD), keep original for render.
2) Tokenize with diacritic‑aware boundaries; make n‑grams (max 4).
3) Greedy longest‑match against `index_primary` (MWEs first).
4) Skip stop words + overlaps.
5) Collect Exact; propose Likely using small edit‑distance threshold.
6) Present Review Panel; upon accept, write `linked_mentions` with `target_country = country_ctx[0]`.

Tie‑breakers: prefer same POS, then higher frequency, then exact alt spelling.

---

## 7) Reader UI (details drawer / modal)

Sense section
- Definition: bilingual rules above
- Equivalents: muted chips/line
- Tags: pill chips (pos, register, domain, freq, tone, status, sensitivity)
- Examples: collapsible accordion with count; inside each block: ES (bold + backtick highlight), EN (italic), example audio (optional), source line with “View all”

Inline mentions in examples
- Subtle underline; tooltip “Abrir ‘contestar’ (AR)”
- Cross‑country link shows 🌍 or flag in popover

---

## 8) Search & Filters

- Search scope: Global / Country → persists in URL
- Filters: Country (multi), POS (single), Register (multi, cap 2), Domain (multi), Frequency (range), Sensitivity (hide)
- Active chips above list, URL‑encoded for shareable views

---

## 9) Accessibility & i18n

- All flag icons with `aria-label` (e.g., “Argentina”)
- Focus rings on chips/links; keyboard: Up/Down rows, Enter open, A play audio, `/` focus search
- Drawer headings use semantic `<h2>/<h3>`
- Bilingual UI; each sense requires `definition_es` and `definition_en` (can be placeholder)

---

## 10) Performance

- Virtualized list (windowed rendering)
- Autolinker off main thread (web worker) or server‑side
- Diacritic‑folded indexes per country in memory
- Lazy‑load audio; preload on hover

---

## 11) Migration Plan — Manual Only (no automated batch)

Author will migrate legacy content manually, entry by entry. No scripted import is required. The app will provide safe scaffolding and validation so manual work is fast and consistent.

Recommended manual workflow
1) Pick a country (e.g., AR) and open a blank entry template (JSON skeleton below) in `data/glossary/<country>.json` or an editor UI once available.
2) Create the entry with: `word`, stable `slug` (ASCII, kebab‑case), optional `audio`, and at least one `sense`.
3) For each sense:
   - Normalize tags to the controlled vocab (pos, register, freq, etc.).
   - Paste Spanish definition into `definition_es`.
   - Leave `definition_en` present (may be an empty string) — to be filled later.
   - Add examples (ES required; EN optional for now; audio optional and can be added later).
   - Add curated `related_slugs` only if you know exact targets; otherwise leave empty.
4) Save and run schema validation (CLI or editor integration) to catch enum/shape issues.
5) Preview in the public modal; iterate until rendering is correct.

Entry JSON skeleton
```json
{
  "word": "…",
  "slug": "…",
  "audio": null,
  "senses": [
    {
      "id": "s1",
      "countries": ["AR"],
      "pos": "verbo",
      "register": "informal",
      "freq": "comun",
      "domain": [],
      "tone": [],
      "status": "vigente",
      "sensitivity": null,
      "definition_es": "…",
      "definition_en": "",  
      "equivalents_en": [],
      "equivalents_es": [],
      "notes_es": null,
      "notes_en": null,
      "examples": [{"es": "…", "en": null, "audio": null, "source": null}],
      "related_slugs": [],
      "linked_mentions": []
    }
  ]
}
```

Guardrails for manual migration
- Always include `definition_en` key (can be empty initially) to meet bilingual requirement.
- Use controlled vocab enums; if a value doesn’t fit, put the raw phrase into `notes_es` and propose an enum addition later.
- Defer example audios; leave `audio` null until files are ready.
- Keep `related_slugs` empty unless you verify exact targets. Inline mentions (`linked_mentions`) are editor‑generated later.

Optional tooling (nice to have)
- A CLI `validate-glossary` to run JSON Schema checks and report enum violations.
- A script to list missing example audio files (advisory only).

---

## 12) QA Checklist

- Saving a sense suggests only same‑country autolinks by default
- Multi‑word beats single word (“a caballo” > “caballo”)
- Changing example text flags stale ranges; Reflow realigns
- Related pills open correct sense; backlinks show “Mentioned by”
- Cross‑country fallback visually badged
- URL encodes filters; reload restores state
- Screen reader reads link destinations clearly

---

## 13) Rollout Steps

1) Add `related_slugs`, `linked_mentions` to schema + validators
2) Build Related token input (admin)
3) Build Autolink Review Panel (admin)
4) Add inline rendering in examples (public)
5) Add Related section UI (public)
6) Manual content entry (author): seed 1–2 countries; include `definition_en` placeholders
7) Instrument events (add/remove related, links applied, stale reflow)

---

## 14) Nice‑to‑Have (phase 2)

- Relation types (synonym, contrast, regional_variant) with icons
- Editor graph view of relations (find orphans/hubs)
- Teacher mode toggle (hide sensitive, highlight regional contrasts)
- Export “study list” per country + filters

---

## 15) Tech Notes (this webapp)

- Reader UI: Flask + Jinja; modal overlay reuses PPX modal styles or custom modal.
- Data path: `data/glossary/<country>.json` (v1 JSON approach)
- i18n: reuse `t(es, en, lang)` + `ui()` helpers, JSON keys for UI strings.
- Security: sanitize any rich HTML in definitions; only allowed tags/attrs.
- Storage safety: validate JSON against schema before save; reject non‑enum tags.
