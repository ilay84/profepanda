
# Profepanda Bilingual Content System  
### Technical Specification & Planning Document  
### Version 4.1 – Modules + Bilingual Segments + Integration With Existing Exercise System

---

## 1. Purpose

This document defines the structure and behavior of the Profepanda bilingual, modular content system. It is intended to be placed in the planning folder of the ProfePanda repository and used by CODEX (or other agents) to generate implementation plans and code.

Goals:

- Bilingual/multilingual text with user-triggered translation
- Modular lesson pages (avoid long scrolling)
- Embeddable rich media
- Integration with existing exercise schemas and JS-based exercise engines (no new exercise schema required)
- Theming via a separate theme system (colors, fonts, icons)
- Optional LLM support for translation fallback and context-aware Q&A
- Future WYSIWYG editor that writes to this schema

---

## 2. Core Principles

### 2.1 JSON as the single source of truth

- All authored lesson content is stored as JSON.
- No inline HTML or ad-hoc markup in content files.
- Renderers (React/Vue/etc.) interpret JSON and construct UI components.

### 2.2 Modular lesson architecture

- A **resource** (e.g., “SER y ESTAR – Location”) is split into **modules**.
- Each module is a page-sized sub-section with its own title and block list.
- Modules are independently addressable and can be reordered.

### 2.3 Segmented text model

- All text is represented as a sequence of **segments**.
- Each segment can carry:
  - `text`
  - `marks` (formatting)
  - optional `translations` (by language code)

### 2.4 User-triggered translation, not auto-tooltips

- When a user selects text in the UI:
  - The selection is mapped back to one or more segment IDs.
  - A floating action bubble appears with:
    - 🌐 Translate
    - ❓ Ask AI
    - 🔊 Listen (future)
- Clicking “Translate”:
  - Looks for stored translations in `translations[lang]`.
  - If not found and allowed, can call an LLM translation service.

### 2.5 Block-based composition

- Modules are composed from **blocks**.
- Each block:
  - Has a `type`.
  - Uses a `style_variant` where needed.
  - Holds its own `data` object.

### 2.6 Styling via theme system

- A separate theme JSON controls:
  - Color palette
  - Typography choices
  - Icon mapping
  - Component variants (callout styles, etc.)
- Content JSON never hardcodes specific colors or fonts.

### 2.7 Exercise integration uses existing schemas

- This system does **not** define a new exercise schema.
- Instead, content blocks use `exercise_reference`:
  - They point to existing exercise JSON files and configuration already in the project.
  - The lesson renderer delegates interactive behavior to existing exercise renderers.

---

## 3. Top-Level Resource Structure

A **resource** is one JSON file.

```json
{
  "schema_version": "4.1.0",
  "resource_id": "ser-estar-location",
  "resource_type": "grammar_resource",
  "meta": {
    "title_es": "SER y ESTAR: La ubicación",
    "title_en": "SER & ESTAR: Location",
    "lang_primary": "es",
    "langs_supported": ["es", "en"],
    "level": "A2-B1",
    "tags": ["grammar", "ser_estar", "location"],
    "taxonomy_paths": ["grammar/verbs/ser-estar/location"],
    "translation_fallback": {
      "enabled": true,
      "via_llm": true,
      "require_opt_in": true,
      "target_langs": ["en"],
      "guardrails": {
        "cache_ttl_seconds": 86400,
        "rate_limit_per_min": 30,
        "log_events": true
      }
    }
  },
  "modules": [],
  "assets": [],
  "llm_hooks": {
    "allow_qna": true,
    "context_hints": ["ser-estar", "location"],
    "tools": ["explain_example", "generate_practice"]
  }
}
```

Key fields:

- `schema_version`: version for future migrations.
- `resource_id`: stable identifier, used in URLs and indexes.
- `resource_type`: e.g., `grammar_resource`, `reading_resource`, etc.
- `meta`: general metadata and taxonomy used for navigation and search.
- `modules`: the main array of page-like sub-sections.
- `assets`: optional shared media (sounds, images) referenced by blocks.
- `llm_hooks`: configuration for LLM-based tools and permissions.

### 3.1 Schema versioning and migrations

- `schema_version` is authoritative for validation and migrations. Loaders should validate against the declared version and surface errors if incompatible.
- Maintain a migration manifest (e.g., `planning/migrations/schema-4.x.md`) describing changes and automated upgraders for minor bumps (e.g., 4.1 → 4.2). Major changes should require explicit author action.
- When bumping the schema, include a changelog entry and, when possible, a scriptable migration path.

---

## 4. Modules

Modules are the internal “pages” or sub-sections of a resource.

### 4.1 Module structure

```json
{
  "module_id": "mod_intro",
  "title_es": "Introducción",
  "title_en": "Introduction",
  "blocks": []
}
```

Notes:

- `module_id` is stable and used in URLs/routes (e.g., `/resource/ser-estar-location/mod_intro`).
- `title_es` / `title_en` are used for navigation menus, breadcrumbs, etc.
- `blocks` is an ordered array of block objects.

### 4.2 Example multi-module resource

Example logical layout for a “SER vs ESTAR” grammar resource:

- `mod_intro`: Overview of SER vs ESTAR
- `mod_identity_vs_situation`: Identity vs situation concept
- `mod_location`: Location uses of SER/ESTAR
- `mod_adjectives`: SER/ESTAR with adjectives
- `mod_practice`: Practice activities (via exercise references)

---

## 5. Block System

Each block is a self-contained unit corresponding to one UI component.

### 5.1 Block shape

```json
{
  "id": "block_01",
  "type": "text",
  "style_variant": "body",
  "data": {}
}
```

- `id`: unique within the module.
- `type`: which renderer to use.
- `style_variant`: optional style key (e.g., `body`, `subtitle`, `callout_warning`).
- `data`: type-specific payload.

### 5.2 Supported block types (v1)

1. `heading`
2. `text`
3. `list`
4. `table`
5. `callout`
6. `media`
7. `embed`
8. `exercise_reference`

New block types can be added later without breaking existing content.

---

## 6. Segment Model

Segments are the smallest text units that can have formatting and translations.

### 6.1 Segment structure

```json
{
  "segment_id": "s1",
  "text": "SER",
  "marks": ["bold"],
  "translations": {
    "en": "to be (essence/identity)"
  }
}
```

- `segment_id`: unique within the block.
- `text`: the display string (in `lang_primary`).
- `marks`: formatting tags.
- `translations`: optional per-language mapping, e.g. `{ "en": "...", "pt": "..." }`.

### 6.2 Supported marks

- `bold`
- `italic`
- `underline`
- `strike`
- `superscript`
- `subscript`
- `small_caps`
- `code`
- `color_primary`
- `color_accent`

---

## 7. Text-Based Blocks

### 7.1 Text block

```json
{
  "id": "intro_text_01",
  "type": "text",
  "style_variant": "body",
  "data": {
    "segments": [
      {
        "segment_id": "s1",
        "text": "En español usamos ",
        "marks": []
      },
      {
        "segment_id": "s2",
        "text": "SER",
        "marks": ["bold"],
        "translations": {
          "en": "SER (to be: essence/identity)"
        }
      },
      {
        "segment_id": "s3",
        "text": " para hablar de la esencia e identidad, y ",
        "marks": []
      },
      {
        "segment_id": "s4",
        "text": "ESTAR",
        "marks": ["bold"],
        "translations": {
          "en": "ESTAR (to be: situation/state)"
        }
      },
      {
        "segment_id": "s5",
        "text": " para hablar de situaciones.",
        "marks": []
      }
    ]
  }
}
```

### 7.2 List block

```json
{
  "id": "list_01",
  "type": "list",
  "data": {
    "ordered": false,
    "items": [
      {
        "item_id": "li1",
        "segments": [
          {
            "segment_id": "li1_s1",
            "text": "Usamos SER para la identidad.",
            "marks": [],
            "translations": {
              "en": "We use SER for identity."
            }
          }
        ]
      },
      {
        "item_id": "li2",
        "segments": [
          {
            "segment_id": "li2_s1",
            "text": "Usamos ESTAR para situaciones.",
            "marks": [],
            "translations": {
              "en": "We use ESTAR for situations."
            }
          }
        ]
      }
    ]
  }
}
```

### 7.3 Callout block

```json
{
  "id": "callout_vivo_muerto",
  "type": "callout",
  "style_variant": "warning",
  "data": {
    "icon": "warning_triangle",
    "segments": [
      {
        "segment_id": "c1",
        "text": "Con los adjetivos ",
        "marks": []
      },
      {
        "segment_id": "c2",
        "text": "vivo",
        "marks": ["bold"],
        "translations": {
          "en": "alive"
        }
      },
      {
        "segment_id": "c3",
        "text": " y ",
        "marks": []
      },
      {
        "segment_id": "c4",
        "text": "muerto",
        "marks": ["bold"],
        "translations": {
          "en": "dead"
        }
      },
      {
        "segment_id": "c5",
        "text": " normalmente usamos ESTAR para la situación física real.",
        "marks": [],
        "translations": {
          "en": "We normally use ESTAR for the real physical state."
        }
      }
    ]
  }
}
```

---

## 8. Table, Media, and Embed Blocks

### 8.1 Table block

```json
{
  "id": "table_ser_estar_examples",
  "type": "table",
  "data": {
    "columns": [
      { "id": "c1", "label": "SER" },
      { "id": "c2", "label": "ESTAR" }
    ],
    "rows": [
      {
        "row_id": "r1",
        "cells": {
          "c1": [
            {
              "segment_id": "r1c1_s1",
              "text": "Es médico.",
              "marks": [],
              "translations": {
                "en": "He is a doctor."
              }
            }
          ],
          "c2": [
            {
              "segment_id": "r1c2_s1",
              "text": "Está cansado.",
              "marks": [],
              "translations": {
                "en": "He is tired."
              }
            }
          ]
        }
      }
    ]
  }
}
```

### 8.2 Media block (image/audio)

```json
{
  "id": "img_ser_estar_diagram",
  "type": "media",
  "data": {
    "media_id": "ser_estar_intro",
    "kind": "image",
    "src": "/media/images/ser-estar-intro.png",
    "alt_es": "Diagrama que compara SER y ESTAR",
    "alt_en": "Diagram comparing SER and ESTAR",
    "caption_segments": [
      {
        "segment_id": "cap1",
        "text": "SER: esencia vs ESTAR: situación",
        "marks": [],
        "translations": {
          "en": "SER: essence vs ESTAR: situation"
        }
      }
    ]
  }
}
```

### 8.3 Embed block (e.g., Canva)

```json
{
  "id": "embed_canva_presentation",
  "type": "embed",
  "data": {
    "provider": "canva",
    "embed_type": "iframe",
    "src": "https://www.canva.com/design/EXAMPLE/embed",
    "title": "Presentación SER y ESTAR",
    "aspect_ratio": "16:9"
  }
}
```

### 8.4 Example sentence callout (optional audio)

```json
{
  "id": "example_sentence_01",
  "type": "example_sentence",
  "style_variant": "callout_info",
  "data": {
    "language_primary": "es",
    "language_translation": "en",
    "segments_primary": [
      { "segment_id": "es1", "text": "Ella está en casa.", "marks": ["bold"] }
    ],
    "segments_translation": [
      { "segment_id": "en1", "text": "She is at home.", "marks": [] }
    ],
    "audio": {
      "source": "uploaded",           // "uploaded" | "url"
      "src": "/media/audio/ella-esta-en-casa.mp3",
      "mime_type": "audio/mpeg",
      "duration_seconds": 4.2
    },
    "player_options": {
      "allow_speed_control": true,
      "default_speed": 1.0,
      "speed_steps": [0.75, 1.0, 1.25]
    }
  }
}
```

Behavior:
- Rendered as a callout-style block (`style_variant` controls visual style).
- If `audio` is `null`, show two lines: bold primary-language text, then translation text beneath.
- If `audio` is provided, show an audio player (with speed control) plus the text lines. `source` distinguishes uploaded assets vs external URLs.
- Uses the same segmented text model; translations can include per-segment `translations` if needed.

---

## 9. Exercise Reference Blocks (Using Existing Schema)

Instead of defining a new exercise schema, this content system references existing exercise JSON files and JS exercise engines.

### 9.1 Basic exercise_reference block

```json
{
  "id": "ex_ref_01",
  "type": "exercise_reference",
  "data": {
    "exercise_id": "ser_estar_tf_location_01",
    "exercise_type": "true_false",
    "source": "existing_exercise_library",
    "resource_path": "/exercises/ser_estar/ser_estar_tf_location_01.json",
    "display_options": {
      "show_title": true,
      "show_instructions": true
    }
  }
}
```

Notes:

- `exercise_id`: an ID that matches the existing library.
- `exercise_type`: optional hint for the renderer (TF, MCQ, FITB, drag-drop, etc.); renderer selection is driven by the existing exercise engine, not by this hint alone.
- `source`: indicates which library or registry to look up (e.g., "existing_exercise_library").
- `resource_path`: optional path to the JSON file (depending on how the current project stores exercises).
- `display_options`: UI knobs (e.g., show/hide title, hints, etc.), interpreted by the exercise renderer.

The main renderer only needs to know:
- "This block is an exercise."
- "Hand it off to the exercise engine with this ID/path."

Handling missing or renamed exercises:
- If `exercise_id` or `resource_path` is missing/invalid, show a friendly inline message (with the missing ID/path) instead of failing silently.
- Existing exercise JSON schemas and players should be reused as-is; this block only passes through identifiers and display options so current exercises render inside the new content system.

---

## 10. Select-Text Translation Flow

High-level behavior for the renderer:

1. User selects text inside any segmented block.
2. The **SelectionController**:
   - Computes which segments intersect the selection.
   - Collates the selected text.
3. A floating bubble is shown near the selection:
   - 🌐 Translate
   - ❓ Ask AI
   - 🔊 Listen (future)
4. If the user chooses "Translate":
   - Look up `translations[lang]` on each segment, where `lang` matches the current UI language.
   - If missing and `translation_fallback.enabled` is true:
     - Use cached results when available.
     - Respect guardrails (`cache_ttl_seconds`, rate limiting, logging).
     - Require explicit user/admin opt-in before invoking LLM.
     - Query LLM or translation service as the fallback.
5. Show translations in a **TranslationPopup** (styled via theme).
6. Future: "Ask AI" could use the selected text and the current module/resource context to answer questions.

---

## 11. Theming System (High Level)

Theme stored in a separate JSON, e.g.:

```json
{
  "theme_id": "profepanda_default",
  "colors": {
    "primary": "#475dd7",
    "accent": "#80ac5f",
    "warning": "#f6a21a",
    "text_main": "#222222",
    "background": "#ffffff"
  },
  "fonts": {
    "body": "Montserrat, sans-serif",
    "heading": "Montserrat, sans-serif"
  },
  "icons": {
    "warning_triangle": "/icons/warning_triangle.svg",
    "lightbulb": "/icons/lightbulb.svg",
    "exercise": "/icons/exercise.svg"
  }
}
```

The renderer maps:
- `style_variant` + `marks` -> CSS classes & variables
- Icon names -> SVG assets

Additional theming and asset notes:
- `style_variant` values should be drawn from a documented registry per block type (e.g., text: `body`, `subtitle`; callout: `info`, `warning`, `success`). The theme maps variants to component styles.
- `assets` entries should declare `asset_id`, `kind` (`image` | `audio` | `video` | `document`), `src`, optional `cdn_variants`, and an optional `checksum` for cache integrity.

---

## 12. Component Architecture (for Implementation)

Suggested components:

- `ResourcePage`
  - Loads resource JSON and theme.
  - Renders module navigation.
- `ModuleView`
  - Renders a single module’s blocks.
- `BlockRenderer`
  - Switches on `type` and delegates to:
    - `HeadingBlock`
    - `TextBlock`
    - `ListBlock`
    - `TableBlock`
    - `CalloutBlock`
    - `MediaBlock`
    - `EmbedBlock`
    - `ExerciseReferenceBlock`
- `SelectionController`
  - Tracks DOM selection and shows the action bubble.
- `TranslationController`
  - Resolves translations + LLM fallback.
- `TranslationPopup`
  - Displays translation results.

All of these should be implemented in a way that does not interfere with existing exercise UIs; `ExerciseReferenceBlock` simply mounts the existing exercise player components.

---

## 13. File Naming Conventions

Suggested layout:

- `/content/grammar/ser-estar-location.json`
- `/content/reading/lectura_cortita_01.json`
- `/exercises/ser_estar/ser_estar_tf_location_01.json` (existing system)
- `/themes/profepanda-default.json`
- `/planning/bilingual-content-system-spec.md` (this file)

---

## 14. Phase 1 Implementation Tasks (For CODEX / Dev)

1. Define TypeScript interfaces for:
   - Resource
   - Module
   - Block
   - Segment
   - ExerciseReferenceBlock
2. Implement JSON loading for resources and themes.
3. Implement `ResourcePage` + `ModuleView` with basic navigation.
4. Implement `BlockRenderer` and the v1 block components.
5. Implement segmented text rendering:
   - Map segments → inline spans with data attributes (segment IDs).
   - Hook a `SelectionController` that can determine which segments are selected.
6. Implement a simple `TranslationController`:
   - Look up `translations[lang]` in segments.
   - Stub LLM call (to be wired later).
7. Implement a basic `TranslationPopup` UI.
8. Implement `ExerciseReferenceBlock`:
   - Given `exercise_id` / `resource_path`, mount the existing exercise component.
9. Document the expected patterns for authoring new resources in this format.

---

## 15. Future Extensions

- Multi-language transcripts with audio-linked segments.
- Teacher notes mode vs student mode (extra callouts, answers).
- Export to static HTML or PDF.
- Fine-grained analytics hooks on segment interactions and exercise performance.
- Visual JSON editor / block editor using this schema as the underlying model.

---

## 16. Authoring Aids (to make JSON + widgets easy)

- Block registry: maintain a table (in this doc or `/planning/block_registry.md`) listing each block `type`, required `data` fields, optional fields, and allowed `style_variant` values. Example rows: `text` (`segments` required), `list` (`ordered`, `items`), `callout` (`icon`, `segments`), `table` (`columns`, `rows`), `media` (`kind`, `src`, `alt_*`), `embed` (`provider`, `embed_type`, `src`), `exercise_reference` (`exercise_id` required, `exercise_type` hint, `resource_path` optional).
- Schemas/interfaces: provide JSON Schemas or TypeScript interfaces for Resource, Module, Segment, and each block type; wire them into authoring tools/linters for validation.
- Example resource: add `/content/examples/example_resource_all_blocks.json` showing every block type (including `example_sentence` with and without audio), required meta fields, and sample `style_variant`s.
- Assets convention: document paths and CDN hints (e.g., prefer `/media/...` with optional `cdn_variants` and `checksum` as noted in theming/media).
- Renderer contracts: document component props per block renderer (e.g., `TextBlockProps`, `ListBlockProps`, `ExerciseReferenceBlockProps`) so widget implementations stay in sync with the JSON shape.

---

## 17. Progress Tracking & Recommendations

- Data shapes:
  - `user_progress`: `{ user_id, resource_id, module_id, status: "not_started" | "in_progress" | "completed", last_viewed_at }`.
  - `exercise_attempt`: `{ user_id, exercise_id, resource_id?, module_id?, score, max_score, started_at, completed_at, attempt_id }`.
- Event hooks:
  - `ModuleView` emits `module_viewed` and `module_completed` (e.g., when last block is seen or when all required exercises are completed).
  - `ExerciseReferenceBlock` reports attempts/results via the existing exercise engine; adapter posts `exercise_attempt` events with scores.
- Persistence (phase 1): allow pluggable storage (local/session for demos; API-backed for real users). Keep the API surface minimal so implementations can swap storage.
- Progress computation:
  - Module completion: either (a) all blocks viewed, or (b) all required exercises passed (threshold configurable, e.g., 70%).
  - Resource completion: all modules completed.
- Recommendations:
  - “Continue” → next `in_progress` module or first `not_started`.
  - “Review” → modules containing exercises with low recent scores or high error rates.
  - “Refresh” → modules not visited within a configurable interval (e.g., 14 days).
- UI hooks:
  - Progress bar per resource/module; badges on module nav items; a “Suggested next” panel sourced from the recommendation logic above.
- Privacy/opt-in:
  - Honor user/admin opt-in for tracking (consistent with translation guardrails). If tracking is disabled, default to session-only progress that clears on refresh.

---

## 18. Admin Content Lab (UI/UX sandbox)

- Purpose: private, flag-gated playground to iterate on visuals/UX without touching prod; admin-only.
- Route: `/admin/content-lab` (behind admin auth + `ENABLE_CONTENT_LAB` flag).
- Data sources: load from `/content/examples/*.json` (include all-blocks and example_sentence with/without audio); allow switching resources from a dropdown.
- Theme playground: live-edit theme JSON (form or textarea) with changes applied in real time; persist to local storage only.
- Layout/variant toggles: density (compact/comfortable), callout styles, segment spacing, selection bubble placement, audio player variant, progress bar style.
- Responsive presets: quick viewport toggles (mobile/tablet/desktop) inside the lab.
- Stubs: mock translation, progress, and exercise scoring; log events to console; no external calls.
- Reload: “Reload JSON” button to refetch current resource without rebuild.
- Snapshot: “Capture view” button to export the current panel to an image/PDF for sharing.
- Opt-out: `ENABLE_CONTENT_LAB=false` by default; ensure the route is not bundled for prod builds when the flag is off.

Implementation checklist:
- [ ] Add flag/config: `ENABLE_CONTENT_LAB` (default false) and gate route.
- [ ] Create route `/admin/content-lab` wired to existing admin layout/shell.
- [ ] Loader: dropdown to pick resource JSON and theme JSON from `/content/examples`; fetch + render `ResourcePage`.
- [ ] Theme editor: live-editable JSON with apply/reset; persist to local storage for the lab session.
- [ ] Variant controls: toggles/sliders for density, callout style, segment spacing, selection bubble position, audio player variant, progress bar style.
- [ ] Responsive controls: buttons for mobile/tablet/desktop viewport widths in the preview pane.
- [ ] Stubs/mocks: replace translation, progress, exercise scoring with no-op/mocked services; console-log events.
- [ ] Reload button: re-fetch current JSON without page reload; show timestamp of last load.
- [ ] Snapshot button: export the preview area as PNG/PDF for feedback.
- [ ] QA: verify gating (auth + flag), no network calls for LLM/external services, and no data writes outside local storage.

---

## 19. Open Questions (to finalize)

- Selection mapping (proposal): keep segments atomic but allow partial spans by wrapping each segment in a span with `data-segment-id`; capture `start`/`end` offsets within the segment plus the substring and collect all selections in DOM order across blocks/tables. When translating, pass `{segment_id, start, end, text}` so the downstream translation/LLM has precise coverage, while the UI can snap to word boundaries for display. If a renderer cannot compute offsets (legacy blocks), fall back to full-segment selection and log reduced granularity.

---

End of document.
