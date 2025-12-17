# Content Hub JSON Schema (Translation + Styling Guide)

Authoring model for resources, modules, blocks, and rich segments. Use lowercase slugs (`slugify`) for all `*_id` fields. Store UTF-8 text directly (no HTML entities).

## Translation rules (apply to all blocks)
- Primary language content lives in the block’s `segments` (monolingual).
- Never mix two languages in one `text`.
- Secondary language lives in `translations`: `{ "<lang>": { "<segment_id>": "<text>" } }`.
- Any translatable segment must have a unique `segment_id`.
- If a block already has both languages as separate segments (e.g., `example_sentence`), keep each segment monolingual; do not parenthesize translations.
- Ordering: keep segments in primary-language order; translations map by `segment_id`.

Tooltip pattern (for any block):
```json
{
  "block_id": "intro-es",
  "block_type": "rich_text",
  "segments": [
    { "segment_id": "h1", "kind": "heading", "level": 1, "text": "SER y ESTAR: dos maneras de decir \"ser\"" },
    { "segment_id": "p1", "kind": "paragraph", "text": "Aprender a decir \"to be\" en español es fundamental." }
  ],
  "translations": {
    "en": {
      "h1": "SER and ESTAR: two ways to say \"to be\"",
      "p1": "Learning how to say \"to be\" in Spanish is essential."
    }
  }
}
```

## Resource
- `schema_version` (string): e.g., `"4.1.0"`.
- `language` (string): `es` | `en` | other ISO codes.
- `domain` (string): `structures` | `vocabulary` | `goals` (extend as needed).
- `resource_id` (string): slug from title.
- `meta` (object):
  - `title_es` (string)
  - `title_en` (string)
  - `levels` (array<string>): e.g., `["A1","A2","B1","B2","C1","C2"]` (empty for grammar).
  - `tags` (array<string>): freeform + structured IDs.
  - `taxonomy_paths` (array<string>): e.g., `["es/structures"]`.
- `relations` (array): reserved for cross-links.
- `modules` (array<Module>)
- `storage_path` (string): persisted file path.

## Module
- `module_id` (string): slug.
- `parent_id` (string|null): parent module_id for submodules; null for root.
- `title_es` (string)
- `title_en` (string)
- `blocks` (array<Block>)

## Block (common fields)
- `block_id` (string): slug (auto if omitted in UI).
- `block_type` (string): one of:
  - `rich_text`
  - `example_sentence`
  - `table`
  - `list`
  - `callout`
  - `accordion`
  - `audio_example`
- `segments` (array<object>): structure depends on block_type.
- `translations` (object, optional): `{ "<lang>": { "<segment_id>": "<text>" } }`.

---

## Block types and examples (with translations and optional styling)

### rich_text
Segments for headings/paragraphs. Monolingual in `segments`; tooltips in `translations`.
- `segments`: array of:
  - `{ "segment_id": string, "kind": "heading", "level": 1|2|3, "text": string }`
  - `{ "segment_id": string, "kind": "paragraph", "text": string }`
- Optional styling per segment:
  - `style.color` (string) e.g., `"#c46374"` (ESTAR), `"#8f8ec5"` (SER).
  - `style.weight` (string) `"normal"` | `"bold"`.
  - `style.italic` (boolean).
  - `style.underline` (boolean).
  Renderers should treat `style` as hints and ignore unknown keys.

Example:
```json
{
  "block_id": "intro-es",
  "block_type": "rich_text",
  "segments": [
    { "segment_id": "h1", "kind": "heading", "level": 1, "text": "SER y ESTAR: dos maneras de decir \"ser\"" },
    { "segment_id": "p1", "kind": "paragraph", "text": "Aprender a decir \"to be\" en español es fundamental y también un reto.", "style": { "color": "#8f8ec5", "weight": "bold" } },
    { "segment_id": "p2", "kind": "paragraph", "text": "Usamos ESTAR para estado o ubicación.", "style": { "color": "#c46374" } }
  ],
  "translations": {
    "en": {
      "h1": "SER and ESTAR: two ways to say \"to be\"",
      "p1": "Learning how to say \"to be\" in Spanish is essential and also a challenge.",
      "p2": "We use ESTAR for state or location."
    }
  }
}
```

### example_sentence
Built for bilingual pairs. Keep each segment monolingual; tooltips not needed if both languages are present. If only one language is present, use `translations`.
- `segments`: array of:
  - `{ "segment_id": string, "kind": "text", "lang": "es"|"en", "text": string }`
  - Optional `{ "kind": "audio", "url": string, "label": string }`

Example (paired):
```json
{
  "block_id": "ejemplo-01",
  "block_type": "example_sentence",
  "segments": [
    { "segment_id": "t1-es", "kind": "text", "lang": "es", "text": "Él es médico." },
    { "segment_id": "t1-en", "kind": "text", "lang": "en", "text": "He is a doctor." }
  ]
}
```

Example (single language + tooltip):
```json
{
  "block_id": "ejemplo-02",
  "block_type": "example_sentence",
  "segments": [
    { "segment_id": "t1", "kind": "text", "lang": "es", "text": "Ella está en casa." }
  ],
  "translations": {
    "en": { "t1": "She is at home." }
  }
}
```

### table
Rows and cells. Each cell monolingual; translations via `segment_id`.
- `segments`: array of rows:
  - `row_id` (string)
  - `cells` (array): each `{ "segment_id": string, "text": string, "lang": "es"|"en", "rich": boolean }`

Example:
```json
{
  "block_id": "tabla-01",
  "block_type": "table",
  "segments": [
    {
      "row_id": "r1",
      "cells": [
        { "segment_id": "c1", "text": "SER", "lang": "es", "rich": false },
        { "segment_id": "c2", "text": "ESTAR", "lang": "es", "rich": false }
      ]
    },
    {
      "row_id": "r2",
      "cells": [
        { "segment_id": "c3", "text": "Él es médico.", "lang": "es", "rich": false },
        { "segment_id": "c4", "text": "Él está cansado.", "lang": "es", "rich": false }
      ]
    }
  ],
  "translations": {
    "en": {
      "c1": "SER",
      "c2": "ESTAR",
      "c3": "He is a doctor.",
      "c4": "He is tired."
    }
  }
}
```

### list
Items monolingual; translations via `segment_id`.
- `segments`: array of `{ "segment_id": string, "text": string, "lang": "es"|"en" }`

Example:
```json
{
  "block_id": "lista-01",
  "block_type": "list",
  "segments": [
    { "segment_id": "i1", "text": "Ser: identidad, origen, profesión.", "lang": "es" },
    { "segment_id": "i2", "text": "Estar: estados temporales, ubicación.", "lang": "es" }
  ],
  "translations": {
    "en": {
      "i1": "Ser: identity, origin, profession.",
      "i2": "Estar: temporary states, location."
    }
  }
}
```

### callout
Single or few highlighted lines; translations via `segment_id`.
- `segments`: array of `{ "segment_id": string, "text": string, "lang": "es"|"en" }`
- Optional `tone`: e.g., `info|warning|success`.

Example:
```json
{
  "block_id": "aviso-01",
  "block_type": "callout",
  "segments": [
    { "segment_id": "c1", "text": "Con 'vivo' y 'muerto' usamos ESTAR.", "lang": "es" }
  ],
  "translations": {
    "en": { "c1": "With 'alive' and 'dead' we use ESTAR." }
  }
}
```

### accordion
Items with title/body; translations via `translations`.
- `segments`: array of items:
  - `{ "segment_id": string, "title": string, "body": string, "lang": "es"|"en" }`

Example:
```json
{
  "block_id": "acordeon-01",
  "block_type": "accordion",
  "segments": [
    {
      "segment_id": "acc1",
      "title": "Uso de SER",
      "body": "Identidad, origen, profesión.",
      "lang": "es"
    }
  ],
  "translations": {
    "en": {
      "acc1.title": "Use of SER",
      "acc1.body": "Identity, origin, profession."
    }
  }
}
```

### audio_example
Text + audio. Text is monolingual; translate via `translations` if needed.
- `segments`: array:
  - `{ "segment_id": string, "kind": "text", "lang": "es"|"en", "text": string }`
  - `{ "kind": "audio", "url": string, "label": string, "duration_ms": number, "waveform": array<number> (optional) }`

Example:
```json
{
  "block_id": "audio-01",
  "block_type": "audio_example",
  "segments": [
    { "segment_id": "t1", "kind": "text", "lang": "es", "text": "Nosotros estamos listos." },
    { "kind": "audio", "url": "https://cdn/audio/listos.mp3", "label": "ES audio", "duration_ms": 3200 }
  ],
  "translations": {
    "en": { "t1": "We are ready." }
  }
}
```

---

## Minimal resource skeleton
```json
{
  "schema_version": "4.1.0",
  "language": "es",
  "domain": "structures",
  "resource_id": "ser-estar",
  "meta": {
    "title_es": "Ser vs. estar",
    "title_en": "Ser vs. Estar",
    "levels": [],
    "tags": ["sp-ser-estar", "verbs-special"],
    "taxonomy_paths": ["es/structures"]
  },
  "relations": [],
  "modules": [],
  "storage_path": "/content/es/structures/ser-estar.json"
}
```

Use this document in GPT tooling to generate valid, tooltip-friendly JSON. Keep new block types aligned to the `block_id`/`block_type`/`segments` (+ optional `translations`) pattern.
