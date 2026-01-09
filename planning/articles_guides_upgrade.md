# Articles/Guides Upgrade Plan (Spanish Grammar Focus)

## Goals
- Support modules **and** submodules for finer organization.
- Keep Spanish as the primary authored language; add non-invasive English translation UX (tooltips or side-by-side modal).
- Improve module navigation UI to match recent Content Lab styling (Montserrat, numbered pills, indentation).
- Keep structures (grammar) separate from future communicative lessons; prepare for eventual English grammar track.

## Scope & Separation
- **Spanish Structures (current)**: remains default track; new features land here first.
- **English Structures (future)**: parallel track when content exists; same renderer, `primary_lang=en`; separated index/routes.
- **Communicative Lessons**: defer; likely rework existing lessons feature later.

## Data & Schema Changes
- Add optional `parent_id` on modules to allow submodules (depth 1 nesting).
- Allow per-block/per-segment translations: store English text alongside Spanish (e.g., `translations.en` or `text_en`).
- Mark primary language (`primary_lang: "es"`) for Spanish structures.
- Validation: ensure Spanish text present; translation optional; `parent_id` must reference an existing module.

## Rendering (Public)
- Module nav: numbered pills, indentation for submodules, active/hover states, Montserrat font; scroll/anchor to sections.
- Content: render nested modules with anchors; highlight active submodule on scroll.
- Exercises: keep blue card style with button; responsive sizing.
- Translation UX:
  - Default: inline tooltip on hover/tap with English translation per paragraph/segment.
  - Optional: a small “Translate” chip per paragraph opens a side-by-side modal (ES left, EN right). On mobile, modal becomes a sheet.

## Admin/Authoring
- Submodules: “Add submodule” under a module; allow reorder (buttons or drag/drop).
- Translation entry: dual fields per paragraph/segment (ES primary, EN optional) with a toggle for tooltip vs modal button.
- Preview: ES/EN toggle to simulate translation UX; show nested modules in preview.
- Schema validation on save for `parent_id` and translation fields.

## Routing
- Keep articles/guides routes; add language-aware paths (e.g., `/articles/es/structures/<slug>` and `/articles/en/structures/<slug>`). Only expose ES structures now.

## Implementation Order (Incremental)
1) **Schema**: add `parent_id` + translation fields; validate on save.
2) **Renderer**: nested modules + improved sidebar styling + anchors.
3) **Translation UX**: tooltips first; then per-paragraph modal button.
4) **Admin**: submodule create/attach; translation fields in block editor; preview ES/EN toggle.
5) **Routing**: split indexes by language track; keep EN hidden until ready.
6) **Polish/QA**: typography/padding, exercise card responsiveness, mobile checks.

## Open Design Decisions (now set)
- Tooltip vs modal: use tooltips only for short text (titles, headings, module/submodule titles). For paragraphs and example sentences, show a small “Translate” chip that opens the side-by-side modal; if long, always modal.
- Target languages: store translations per paragraph/block (including headers) as a map (translations.<lang>). Spanish required; EN default; more languages later. Language dropdown shows only if >1 translation exists.
- Target selection: tiny dropdown near the top; hidden if only Spanish exists; modals/tooltips use the selected target, show “translation unavailable” if missing.
- Authoring translations in rich text: side-by-side view (ES read-only left, target editable right); per-paragraph “Add translation” to open the target field.
- Module nav: one submodule level only; children collapsed by default and auto-expand when parent is clicked.

## Example Sentence Blocks (update)
- Remove inline English display; rely on the translate chip/modal for secondary language.
- Block should include: Spanish sentence (primary), optional translations map (EN, etc.), and audio support.
- Audio: allow either uploaded audio (existing media flow) **or** an external audio URL; prefer URL if both present.
- Editor: add fields for audio file upload and a text field for audio URL; validate at least one is set if audio is required.
- Renderer: show a play control if audio exists; otherwise just show the sentence and translate chip.
