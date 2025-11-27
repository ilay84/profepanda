# PPX Exercises UI Architecture

## 0) Purpose
Codify a reusable UI/runtime and admin builder architecture for all exercise types. The True/False (TF) exercise is the reference implementation; all new types must adhere to the same contracts, styling tokens, accessibility, and i18n patterns.

---

## Planned Types + Blueprints
- Next exercise types and blueprint docs (plain text, editable):
  - Drag and Drop (dnd): planning/dnd.txt
  - Dictation (dictation): planning/dictation.txt
  - Click The Words (ctw): planning/ctw.txt
  - Fill in the Blank (fib): planning/fib.txt
  These follow the same modal shell, progress, hint, media, and summary patterns described below.

---

## 1) Modules & Responsibilities
- `static/js/ppx-core.js`: type registry, event bus, utilities (i18n, focus, metrics hooks).
- `static/js/ppx-modal.js`: shared shell (header/body/footer), navigation, progress, summary.
- `static/js/ppx-frame.js`: in-article embedding and admin preview bridge.
- `static/js/ppx-<type>.js`: per-type runtime plugin; renders only `#ppx-body`.
- `static/js/admin_builder_<type>.js`: per-type admin builder plugin; renders editor UI and emits payload.
- `static/css/ppx-exercise-ui.css`: shared components for body content (buttons, feedback, lists).
- `static/css/ppx.css`: tokens + atoms (spacing, typography, colors, elevation) used across PPX.
- `templates/_ppx_head_assets.html`: shared head assets; types include only their own module.

---

## 2) Runtime Type Plugin Contract

Registration:
```js
PPX.registerType('tf', {
  init(ctx) {},
  start(ctx) {},
  validate(ctx) { return { ok: true, issues: [] }; },
  grade(ctx) { return { score: 0, total: 0, detail: [] }; },
  reset(ctx) {},
  getState() { return {}; },
  setState(state) {},
  destroy() {}
});
```

Context (`ctx`):
```ts
{
  el: HTMLElement,     // mount root inside #ppx-body
  lang: 'es'|'en',
  theme: 'light'|'dark'|'brand',
  i18n: (key, vars?) => string,
  opts: object,        // payload and runtime options
  bus: EventTarget     // PPX event bus
}
```

Events (via `bus`):
- `ppx:ready` → plugin mounted and interactive
- `ppx:changed` → user interacted; state mutated
- `ppx:validate` → validation run requested
- `ppx:graded` → grade returned: `{ score, total, detail }`
- `ppx:retry` → reset requested
- `ppx:destroy` → shell teardown

UI rules:
- Render only inside `ctx.el`; do not modify shell header/footer DOM.
- Wire shell actions (Check, Next, Retry) via events; no inline handlers.
- Scope styles under a `.ppx-<type>` root container; avoid global selectors.

Accessibility:
- Keyboard: tab order, arrow navigation where relevant, space/enter activation.
- ARIA: roles/labels/states; announce feedback and errors politely.
- Focus: trap within modal; restore focus on close; visible outline.

Internationalization:
- All strings via `i18n` helper; respond to language change idempotently.
- Prefer data attributes and templates for swapping text nodes.
- For non-TF types, the main item content is neutral (single-language); hints, feedback, navigation, and shell strings remain bilingual.

---

## 3) Admin Builder Plugin Contract

Registration:
```js
PPXBuilders.register('tf', {
  mount(root, initialPayload, { onChange }) {},
  validate() { return { ok: true, issues: [] }; },
  serialize() { return {/* canonical JSON */}; },
  destroy() {}
});
```

Shell layout:
- Left: type-specific editor (items, feedback, hints, ordering).
- Right: Live Preview (`ppx-frame.js`) reflecting current payload.
- Bottom bar: Save Draft | Publish | Preview | Version History.
- Side panels: Metadata, Taxonomy, Language, Validation.
- Item accordions: collapsed shows a right-facing caret; expanded shows a down-facing caret. Keep this consistent across all exercise types that use per-item accordions.

Behavior:
- `onChange(payload)` fired on any edit; preview re-renders via frame with the same payload.
- `validate()` runs both schema checks and light UI checks (missing required fields, empty options, etc.).
- `serialize()` returns the exact JSON saved by the backend.

Naming & structure:
- Runtime plugin: `ppx-<type>.js` (e.g., `ppx-tf.js`).
- Builder plugin: `admin_builder_<type>.js` (e.g., `admin_builder_tf.js`).
- Reuse building blocks: shared item rows, buttons, chips, list reordering helpers.

---

## 4) JSON Schema Conventions
- Shared: `id`, `type`, `version`, `title_{es,en}`, `instructions_{es,en}`, `level`, `tags|taxonomy_paths`, `status`, `created_by`, `created_at`, `items[]`, `checksum`.
- Neutral main text policy (non-TF types): Use a single neutral field for the primary prompt/content so the same item renders on all site languages. Examples:
  - Dictation: `items[].transcript`
  - MCQ: `items[].question`, `items[].options[].text`
  - FIB: `items[].text` (with `[[blank:id]]` placeholders)
  - DnD: `items[].prompt`, pair tokens/targets as neutral strings
  - CTW: `items[].text`
  Bilingual fields are retained for user-facing meta (titles/instructions) and for `hint_{es,en}` and `feedback_{...}_{es,en}`.
- Items: include `id`, `order`, neutral prompt/content, answer fields, `hint_{es,en}`, `feedback_{correct,incorrect}_{es,en}` where applicable.
- Deterministic ordering: `order` is authoritative for render and grading consistency.

---

## 5) Styling & Tokens
- Use `static/css/tokens.css` and `static/css/ppx.css` variables for color, spacing, typography.
- Ensure WCAG AA contrast; avoid color-only feedback; include icons/text.
- No inline styles; prefer utility classes and BEM-ish `.ppx-<type>__part` naming.

---

## 6) Analytics Hooks
- Shell emits `ppx:analytics` or uses a hook in `ppx-core` after grade: `{ id, type, score, total, hints_used, duration }`.
- Avoid PII; attach session/user ID only if available from the host app.

---

## 7) Reference Implementation (TF)
- Use TF code as the scaffold for new types; copy structure, file layout, and event wiring.
- Verify: keyboard flows, ARIA attributes, language swap, theme variants, summary/ retry.
- Unit-test core grading where possible; snapshot basic DOM for body under different states.

---

## 8) Acceptance Criteria
- New types plug in without modifying `ppx-modal.js` or other core files.
- Admin preview uses the same runtime as public; payloads round-trip cleanly.
- A11y and i18n checks pass; focus and keyboard flows are consistent.
- CSS contained to `.ppx-<type>`; tokens used; zero inline styles.

---

## 9) Cross‑Type UI Decisions (Unification)
- Modal Frame: Use `PPXFrame` for all types to keep header/footer rows aligned with content width.
- Lightbox: Use `PPXModal` image lightbox (`data-ppx-lightbox="true"`) for images across all types; do not implement per-type zoom overlays.
- Summary Sentinel: Reserve `idx === items.length` as the summary “slide” for all types; disable Next on summary; provide Restart and “See results” affordances consistently.
- Check Semantics: Where applicable (MCQ, DnD, CTW, Dictation), gate feedback on a `Check` action and lock inputs post-check according to type options (e.g., `allowRetry`). Style the primary state uniformly.
- Dots Behavior: Support a shared option to restrict dot navigation until answered (parity with TF `dotsOnlyAnswered`).
- Hint Accounting: Increment `hints_used` the first time a hint is opened per item (open‑once semantics) for consistent analytics.
- Media Toggle: Use the same preview/close icons and aria labels; per-item media lives above the work area, hidden on summary.
- Keyboard/A11y: Ensure roving tabindex for token grids, drop zones, and inline selectable text; announce results via `aria-live` and set focus to the first error on failed checks.

---

## 10) Type-Specific Notes (from blueprints)
- DnD: Single-slide exercise (one item). Uses neutral `prompt` and neutral tokens/targets. Media is global to that slide. Summary reviews the single mapping.
- Dictation: Uses neutral `transcript`. Audio control should include speed adjustment; provide special character/accent insert buttons. Diff feedback emphasizes incorrect chars (red) and missing (red underscore).
- CTW: Uses neutral `text`; supports optional image/audio/video as context.
- FIB: Uses neutral `text` with blanks; per-blank accepted variants; normalization options per blank.

---

## Admin Icons (Dashboard)
- Place SVGs under `static/assets/icons/`:
  - `dnd.svg` (Drag & Drop)
  - `dictation.svg` (Dictation)
  - `ctw.svg` (Click The Words)
  - `fib.svg` (Fill in the Blank)
