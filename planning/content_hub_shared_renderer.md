# Content Hub: Shared Exercise Renderer Library

This proposal describes how the content hub can render exercises via a shared, data‑driven library. It assumes the current JSON payloads in `data/exercises/*` and the existing PPX plugins (TF, MCQ, FITB, Matching, CTW, DND, CTC, Dictation).

## Goals
- Single renderer that consumes exercise JSON (inline or by reference) with consistent UI/UX (clean, minimalist, modern).
- Reuse existing exercise schemas/contracts; avoid duplicating logic per module.
- Inline JSON support so modules can ship self‑contained exercises.
- Embeddable API for content hub pages (SSR + client hydration), exportable for offline/standalone use.
- Strong validation, preview, and accessibility guarantees.

## Scope
- Rendering and interaction for all exercise types listed below.
- Minimal authoring support inside modules (JSON editing/validation), not a full builder UI.
- Does not replace admin exercise builder; instead reuses its data shapes.

## Data Shapes
- **Reference**: `{"type": "exercise_reference", "data": {"exercise_id": "...", "exercise_type": "mcq", "resource_path": "...", "display_options": {...}}}`
- **Inline**: Exercise JSON payload (same shape as stored in `data/exercises/<type>/<slug>/...`), embedded in the module document.
- **Overrides (optional)**: Small patch object applied over a referenced exercise to tweak text/media without forking the canonical exercise.

## Supported Exercise Types (and feasibility inline)
- **tf**: trivial (statement + correct flag).
- **mcq**: options array with feedback; trivial.
- **fitb**: blanks list; honor normalization flags (case/punctuation/accents/whitespace).
- **matching**: left/right pairs; trivial.
- **ctw (click the word)**: sentence string with tokens + correct_count; requires tokenizer that uses provided tokens; straightforward.
- **dnd**: columns + tokens with `correct` target id; needs drag/drop + keyboard fallback; moderate.
- **ctc (choose the continuation)**: prompts + continuations + expects id; similar to dnd/matching; moderate.
- **dictation**: audio + expected text with fuzzy matching rules; heavier due to audio and tolerant scoring.

## Runtime Architecture
- **Core** (new package, e.g., `static/js/ppx-core-lite.js`):
  - JSON loader (inline payload or fetch by `exercise_id` + `version=current` + cache bust).
  - Validator hook (run schema locally; surface errors in preview).
  - Theming tokens (CSS variables) and layout primitives (header, instructions, body, summary).
  - State store (per exercise instance), scoring, completion events.
  - Accessibility helpers: focus order, keybindings, ARIA labels, live regions for feedback.
- **Type Plugins** (reuse/adapt existing `ppx-*.js`):
  - Render into a provided container; no shell DOM mutation.
  - Receive a normalized config (options flags, media, localization) and callbacks for results.
- **Summary/Results**:
  - Shared pill component, accordion pattern, score thresholds, retry/continue CTA.
- **Styling**:
  - Single CSS (e.g., `static/css/ppx-exercise-ui.css`) with tokens for spacing, typography, borders, focus rings, and a “minimalist sleek” default theme.

## Embedding API (Content Hub)
- **Server-side**: Render a placeholder container per exercise block with data attributes:
  - `data-exercise-type`, `data-exercise-id` (if reference), `data-inline-json` (if inline, base64/URI encoded), `data-overrides` (optional).
- **Client-side**:
  - `renderExercise({ element, locale, inlineJson?, exerciseId?, overrides?, displayOptions? })`.
  - Auto-fetch when `exerciseId` provided; uses `_=${Date.now()}` to avoid stale cache.
  - Emits events: `onReady`, `onInteraction`, `onComplete`, `onError`.
- **Lazy loading**:
  - Per-type chunk loading (only load `ppx-dnd.js` when a DND block is present).
  - Intersection observer to defer rendering until in viewport.

## Inline JSON Authoring
- Module authors can paste or edit JSON in a lightweight “Edit as JSON” modal.
- Local validation against the type schema (reuse `data/schemas/exercises/*.schema.json`).
- Preview button uses the renderer in-place (no server round-trip).
- Optional “start from existing exercise” fetch + inline copy to fork for customization.

## Validation and Schemas
- Keep schemas in `data/schemas/exercises/*.schema.json` as source of truth.
- Client bundles a validator (AJV or minimal equivalent) to catch errors before render.
- Validation modes:
  - **Strict**: block render on invalid shape.
  - **Lenient**: render but surface warnings (for legacy payloads).

## Accessibility
- Keyboard-first navigation; all interactions have focusable targets.
- ARIA labels for controls; live regions for correctness feedback.
- DND/CTC offer keyboard alternatives (select target, use arrow keys/enter/space).
- High-contrast friendly theme and focus outlines configurable via CSS variables.

## Offline / Export
- For offline module export: bundle inline JSON; avoid external fetches except media.
- Provide an optional “asset manifest” builder step to pre-download media (audio/images).

## Error Handling
- Friendly in-place error UI (missing data, failed fetch, invalid schema).
- Fallback copy for “This exercise could not be loaded” with a retry action.
- Analytics hook to log validation/fetch/render errors for QA.

## Caching and Versioning
- Fetch endpoints should return `Cache-Control: no-store`.
- Client adds timestamp param to fetches.
- Honor `version` field; `current` alias for latest.
- When overrides are applied to referenced exercises, stamp a composite checksum for caching and debugging.

## Theming and Layout
- Default: neutral background, thin borders, generous whitespace, clear focus ring, modern type (can be swapped per product).
- Configurable tokens: `--ppx-bg`, `--ppx-surface`, `--ppx-accent`, `--ppx-border`, `--ppx-radius`, `--ppx-shadow`, `--ppx-focus`, `--ppx-spacing`.
- Module-level overrides: authors can pick “light” / “dark” / “brand” presets.

## Rollout Plan (suggested)
- **Milestone 1**: Core + TF/MCQ/FITB/Matching/CTW inline rendering; schema validation; summary UI; lazy loading.
- **Milestone 2**: DND and CTC with keyboard fallback; improved analytics + error UI.
- **Milestone 3**: Dictation (audio, fuzzy matching); asset prefetch/export tooling.
- **Milestone 4**: Overrides support for referenced exercises; theme presets and author-facing JSON editor in content hub.

## Author Experience (Minimal)
- Insert block: pick “Exercise” -> choose “Reference” or “Inline”.
- If Reference: search by title/slug; optional overrides for copy/media; choose display options (show title/instructions).
- If Inline: start from template per type; edit JSON with validation; preview inline.
- Diagnostics: list warnings (missing translations, empty media, zero items).

## QA Checklist
- Schema validation passes for all inline blocks.
- TF/MQC/FITB/Matching/CTW render without JS errors; summary renders and scores correctly.
- DND/CTC keyboard flow verified; drag/drop works on touch + desktop.
- Dictation: audio loads; scoring respects ignoreCase/accents/punctuation/whitespace; minChars gating works.
- Events emitted (`onComplete`) with score and per-item breakdown.
- Theme overrides render correctly in at least two presets.

## Open Decisions
- Validator choice (AJV vs. lightweight custom) for bundle size.
- Transport for inline JSON in SSR (data attribute vs. script[type="application/json"]).
- Whether to allow arbitrary per-item overrides on references (could complicate cache/QA).
- Asset hosting guarantees for offline exports (pre-bundle audio/images or allow remote).

## Pre-Renderer QA Checklist (per exercise type/payload)
- **Localization**: Correct language strings shown for instructions, hints, feedback, labels, summary; fallback behavior clear (e.g., en if missing es).
- **Schema compliance**: JSON validates against the type schema; no extra fields; required fields present.
- **Media**: All media URIs resolve; alt text/captions present where applicable; autoplay rules honored (dictation/audio).
- **Interaction & accessibility**: Keyboard navigation works; ARIA labels on buttons/inputs; focus order sane; live feedback announced; drag/drop has keyboard equivalent (DND/CTC).
- **Scoring & completion**: Correct answers recognized; partial scoring rules (if any) applied; summary shows score pill, per-item status, retry CTA if allowed.
- **Options flags**: `ignoreCase`, `ignorePunctuation`, `ignoreAccents`, `normalizeWhitespace`, `minCharsToEnableCheck`, `allowRetry`, `attemptsMax` respected when set.
- **Error handling**: Missing/empty items gracefully handled; renderer shows friendly error instead of crashing.
- **Layout/theme**: Instructions, body, and summary align with the minimalist UI tokens; spacing and focus states consistent.
