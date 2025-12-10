# Choose the Continuation (CTC) — Plan

Working title: "Choose the Continuation" / "Elegir la continuación". Drag each continuation pill under the sentence it completes.

## Goals
- New exercise type `ctc` with builder + player consistent with existing flows (status selector, taxonomy, JSON editor, media handling, summary slide).
- Each item has 2+ sentence prompts; each prompt expects exactly one correct continuation. Extra decoy pills optional per item.
- Check button appears after all pills are placed; feedback per prompt + overall score; summary slide matches other exercises.
- Reset behavior matches other PPX exercises: header reset icon calls `resetExercise` (clears caches, keeps modal open, reopens slide 1); summary restart button should call the same routine.

## Schema (exercise)
- Root: `{ type: 'ctc', slug, version, title_es/en, instructions_es/en, level, taxonomy_paths, status, created_by/at, items[] }`.
- Item: `{ id, order, prompts: Prompt[], continuations: Continuation[], media?: Media[] }`
  - `Prompt`: `{ id, order, prompt_es, prompt_en, hint_es?, hint_en?, feedback_correct_es?, feedback_correct_en?, feedback_incorrect_es?, feedback_incorrect_en?, expects: continuation_id }`
  - `Continuation`: `{ id, text_es, text_en, is_decoy?: boolean, feedback_es?, feedback_en?, media?: Media[] }`
  - `Media`: `{ id, kind: image|audio|video, src, thumb?, alt_es?, alt_en?, transcript_es?, transcript_en? }`
- Validation: item must have >=2 prompts; each prompt must point to a continuation id; all continuation ids unique; at least as many continuations as prompts; decoys allowed but not required.

## Builder UX
 - Base fields: slug auto-slug from title, title_es/en, instructions_es/en (default: "Arrastrá la continuación correcta." / "Drag the correct continuation."), level, taxonomy, status selector, JSON button with icon, Save/Preview/Publish.
 - Slug rules: auto-generate from the first title typed; stop auto-updating once the slug field is edited or when in edit mode. Keep lowercased/kebab-case to match storage paths.
- Item card:
  - Start with 2 prompt rows by default; "Add prompt" button appends.
  - Prompt row fields: prompt_es, prompt_en, hint_es/en, feedback_correct_es/en, feedback_incorrect_es/en; select dropdown to choose its correct continuation (lists current continuations).
  - Continuations panel: list of pills with text_es/en; toggle "decoy"; optional media attach (reuse media helper used elsewhere).
  - "Add continuation" button; ensure ids stable (e.g., `c1`, `c2`).
  - Validation UI: warn if prompt not mapped, if duplicate continuation mapping, or if fewer continuations than prompts.
- Media: allow optional item-level media array (shared per item) and per-continuation media (optional, small preview).
- Buttons: Add prompt, Add continuation, Delete prompt/continuation, Reorder prompts/continuations.
- Check-state preview: builder preview should preload player with current JSON for quick try.

## Player UX
- Layout per item:
  - List prompts (ordered). Each prompt shows text, optional hint toggle. Under prompt, show indented arrow_right.svg then a droppable slot.
  - Continuation pills in a bank; draggable to slots; decoys are unlabeled as such. Each prompt accepts exactly one pill; pills snap into slots; can swap/return to bank.
  - "Comprobar/Check" button enabled once all slots filled.
- Feedback:
  - On check: per prompt state (correct/incorrect). Show prompt-level feedback_correct/incorrect if provided; otherwise generic strings.
  - Decoy behavior: if a decoy is placed, it marks incorrect and can trigger continuation.feedback_* if set.
  - Allow retry: reset incorrect slots back to bank; keep correct locked (standard pattern from other drag/drop exercises).
- Scoring:
  - Item score = correct prompts / total prompts.
  - Exercise score = average over items; carry to summary.
- Summary slide:
  - Show total correct/total prompts, percentage.
  - For each item, list prompts with the correct continuation and the user choice (highlight mismatches). Include any media if present? (consistent rule: show media toggle only when media exists, never on summary).
  - Restart from summary reuses the shared reset routine so the modal stays open and starts at item 1 with cleared placements/progress.

## API/Routes
- Admin builder: GET/POST/PUT /admin/api/exercises (standard), /:type/:slug, publish endpoint.
- Uploads: `/admin/api/exercises/ctc/:slug/upload?kind=image|audio|video` for item/continuation media (mirrors other types).
- Admin list: add “New Choose the Continuation” action with icon `assets/icons/chose-the-continuation.svg`.

## Validation Rules (builder + backend)
- Root: slug required; title_es/en required; instructions_es/en required; items length >=1.
- Item: prompts length >=2; each prompt has non-empty text (es or en) and expects a valid continuation id; continuations length >= prompts; continuation texts non-empty.
- No duplicate ids; no orphan continuations (optional: allow decoys unmatched by prompts if `is_decoy=true`).
- Media URLs must be http(s) and kind validated.

## Default copy / strings
- Instructions default: ES "Arrastrá la continuación más lógica debajo de cada oración." EN "Drag the most logical continuation under each sentence."
- Generic feedback: correct -> "¡Bien!" / "Nice job!"; incorrect -> "Revisá la continuación." / "Check the continuation."
- Hint button label: "Ver pista" / "Show hint".
- Summary title: "Resumen" / "Summary".

## Analytics/State
- Track attempts per item (increment on each Check); store per-slot correctness for summary.
- Allow resume: if user leaves mid-item, autosave not required initially but keep JSON schema compatible for future caching.

## Open Questions
- Should prompts support rich text or plain text? (default to plain text for MVP). > Plain text is fine for now
- Do we need per-item timer or attempts cap? (default infinite attempts). > Nope, infinite attempts is fine.
- Should decoys be optionally flagged in summary? (propose showing as “decoy used” if placed). > We don't need to flag these, but we should have feedback specific to each pill for correct/incorrect placement, that way the author can put in custom feedback for those decoy pills to show they don't work for either option and why they don't work for each option.
