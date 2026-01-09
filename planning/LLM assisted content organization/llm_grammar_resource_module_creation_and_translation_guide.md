# LLM Guide: Grammar Resource Modules (ES → EN)

Use this when asking an LLM to draft or reorganize modules/submodules. Spanish (ES) is the canonical source; English (EN) is a full translation. Keep a 1:1 mapping per block with shared IDs. Exercises are suggested separately (see Exercise Suggestions).

## Resource Model
- **Article**: `slug`, `title_es`, `title_en`, `type` (`structure` or `communicative`), `category/section` (official grammar schema), `order_index`.
- **Modules**: ordered top-level units. Fields: `id`, `title_es`, `title_en`, `order`. Optional `parent_id` for one level of submodules.
- **Blocks**: ordered content inside a module. Fields vary by type; every block has `id`, `type`, `order`, `module_id`.

## Allowed Block Types
- **heading**: `title_es`, `title_en`.
- **text / rich_text**: `es_markdown`, `en_markdown`.
- **callout**: `es_markdown`, `en_markdown`, optional `tone` (`info|warn|success`).
- **accordion**: `title_es`, `title_en`, `es_markdown`, `en_markdown` (single panel).
- **example**: `text_es`, `text_en`, optional `audio_url`, optional `note`.
- **exercise_ref**: `exercise_id` (exercise handles its own translations; the card can show a translated title/description if provided).
- **list/table**: Markdown; provide `es_markdown`, `en_markdown`.

## Translation Rules
- ES is source; EN mirrors meaning/structure; no mixed inline languages.
- Every ES field has an EN sibling (or empty if missing).
- Exercise refs: only card title/description can be translated; exercise internals translate elsewhere.

## Output Format for LLM (copy/paste)
You will paste results manually. Do **not** return JSON. For each module/submodule:
1) **Module headings (ES + EN)**
   - `Módulo X (ES): …`
   - `Module X (EN): …`
2) **Blocks (paired ES and EN)**
   - Block ID  
   - Type (heading, text, callout, accordion, example, exercise_ref, list/table)  
   - ES Markdown (or text fields as applicable)  
   - EN Markdown (or translated fields)  
   - Extras by type (example: `audio_url?`; exercise_ref: `exercise_id`, optional translated label)

Suggested layout to return:
```
### Module: SER y ESTAR: Lo básico
#### Module (EN): SER and ESTAR: The Basics

- Block ID: mod1-heading (heading)
  - ES: ## ¿Qué expresa SER?
  - EN: ## What does SER express?

- Block ID: mod1-context (text)
  - ES:
    SER expresa **la esencia** de algo o alguien.
  - EN:
    SER expresses **the essence** of something or someone.

- Block ID: mod1-example-1 (example)
  - text_es: Ella es ingeniera.
  - text_en: She is an engineer.
  - audio_url: (blank if none)

- Block ID: mod1-exref-1 (exercise_ref)
  - exercise_id: mcq/ser-essence-1
  - title_es: Práctica: SER y esencia
  - title_en: Practice: SER and essence
```

Keep ES and EN in separate bullet sections for easy paste. Every ES block should have a matching EN block (empty is fine if not available). Do not mix languages inline.

## Markdown Guidance
- Headings: `##` (module context), `###` (subheadings).
- Lists: standard Markdown bullets/numbers.
- Tables: OK; keep ES/EN separate (do not mix).
- Callouts/accordion: supply body in `es_markdown` / `en_markdown`; UI renders container.
- Keep prose concise; no inline translations in ES.

## Ordering & Nesting
- One submodule level: use `parent_id` to attach to a parent. Numbering (1, 1.1, 1.2) derives from order + parent.
- `order` required for modules and blocks within each module.

## Exercise Suggestions (LLM instructions)
- Suggest exercises **after** outlining modules/blocks; do not embed exercises in the Markdown. Parent modules usually omit exercises (they introduce the section); suggest exercises for submodules where practice helps the structure stick. Parents may include a light exercise only if it primes the learner conceptually.
- When suggesting exercises, name the type and give a 1–2 line rationale tied to the module objective. Use these type summaries:
  - **True/False (TF)** — How: choose true/false. Goal: quick conceptual checks; contrast binary rules (e.g., essence vs situation).
  - **Multiple Choice (MCQ)** — How: pick one correct option. Goal: discriminate forms/uses; test pattern recognition under controlled options.
  - **Fill in the Blanks (FITB)** — How: supply missing form/word(s). Goal: active recall; choose the right operator/form in context.
  - **Click the Word (CTW)** — How: click target word(s) in a sentence. Goal: form–function awareness; notice cues that signal the operational choice.
  - **Drag and Drop (DND)** — How: drag items into categories/columns. Goal: conceptual sorting; contrast categories (rules/uses/meanings) to solidify boundaries.
  - **Dictation** — How: listen and type the sentence. Goal: integrate listening with accurate form production; reinforces spelling/accents and operational choices in authentic phrasing.
  - **Choose the Continuation (CTC)** — How: pick the best continuation for a setup. Goal: coherence-level application of the rule; extend a statement logically under operator constraints.
  - **Matching** — How: match side A to side B (concept → example). Goal: link rules/labels to exemplars; reinforce classification and recall.
- For each suggested exercise: state the type, the focus (e.g., SER vs ESTAR in professions), and 1–2 example prompts in Spanish (no need for full authoring here). Exercises will be authored separately using the per-type guides.

## What to Ask the LLM To Do
1) Propose modules/submodules with `title_es`/`title_en` and `order` (and `parent_id` if submodule).
2) For each module, generate ordered blocks with ES content plus EN translations (format above).
3) Respect allowed block types; keep IDs consistent; leave EN empty if unavailable.
4) Suggest exercises (type + rationale + 1–2 sample prompts) for submodules where practice is appropriate; parent modules only if it primes the learner.
5) Do not return JSON; keep output human-friendly for copy/paste.

## Validation Checklist
- Modules/blocks have unique `id` and `order`.
- ES/EN present (or EN empty) for every translatable field; no mixed-language inline text.
- Examples: `text_es`, `text_en`; `audio_url` optional.
- Exercise refs: only `exercise_id` + optional translated label; no prompts/feedback here.
- Markdown well-formed; headings/lists/tables scoped appropriately.

## Minimal ES-only Variant
If only Spanish is desired, set EN fields to `""` and omit translation chips in the UI.

---
Use this guide when prompting the LLM. Output modules/blocks in the human-friendly format, and suggest exercises separately using the type summaries above. 
