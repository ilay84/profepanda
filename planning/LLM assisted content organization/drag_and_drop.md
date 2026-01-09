# Drag and Drop (DND) — LLM Authoring Guide (ES → EN)

Use this when asking the LLM to draft a drag-and-drop exercise. Spanish (ES) is canonical; English (EN) is a full translation. Keep IDs stable and mirror structure in both languages.

## How it works & pedagogical goals
- **Drag and Drop (DND)**  
  - How: Learner drags items into categories/columns.  
  - Goal: Conceptual sorting; contrasts categories (rules, uses, meanings) to solidify operational boundaries (e.g., SER vs ESTAR).

## JSON Shape (categories / columns)
```json
{
  "id": "dnd/example-001",
  "type": "dnd",
  "title_es": "SER vs ESTAR: clasifica",
  "title_en": "SER vs ESTAR: classify",
  "instructions_es": "Arrastra cada tarjeta a la categoría correcta.",
  "instructions_en": "Drag each card to the correct category.",
  "columns": [
    { "id": "c1", "title_es": "SER (esencias)", "title_en": "SER (essence)" },
    { "id": "c2", "title_es": "ESTAR (situaciones)", "title_en": "ESTAR (situations)" }
  ],
  "items": [
    { "id": "i1", "text_es": "profesión", "text_en": "profession", "column_id": "c1" },
    { "id": "i2", "text_es": "ubicación actual", "text_en": "current location", "column_id": "c2" }
  ],
  "hint_es": "Piensa en esencia vs situación.",
  "hint_en": "Think essence vs situation.",
  "feedback_correct_es": "Correcto: cada tarjeta está en la categoría correcta.",
  "feedback_correct_en": "Correct: each card is in the right category.",
  "feedback_incorrect_es": "Revisa: esencia (SER) vs situación/estado (ESTAR).",
  "feedback_incorrect_en": "Check: essence (SER) vs situation/state (ESTAR).",
  "shuffle": true,
  "tags": ["A1-A2", "ser/estar"]
}
```

## Field Notes
- `id`: stable slug.
- `type`: `dnd`.
- `title_*`, `instructions_*`: short, clear.
- `columns[]`: 2+ drop targets. Each has `id`, `title_es`, `title_en`.
- `items[]`: draggable cards. Each has `id`, `text_es`, `text_en`, and the correct `column_id`.
- `hint_*`: optional; brief.
- `feedback_correct_*`, `feedback_incorrect_*`: concise, actionable.
- `shuffle`: optional boolean to randomize item order.
- `tags`: optional strings.

## Translations
- ES is source; EN mirrors meaning/structure.
- If a translation is missing, leave the `*_en` empty string.
- No mixed languages inline.

## Authoring Guidelines
- Categories should be unambiguous; keep 2–4 columns max.
- Items: short phrases; avoid near-duplicates unless intentional.
- Hints: only if helpful; 1 short sentence.
- Feedback: reinforce the category logic.
- Tone: neutral and instructional.

## LLM Output Format (copy/paste ready)
Return two sections: Spanish first, then English. Do **not** return full JSON; we will paste fields manually.

```
Exercise ID: dnd/slug-here
Title (ES): …
Title (EN): …
Instructions (ES): …
Instructions (EN): …
Shuffle: true/false

Columns:
- id: c1, title_es: …, title_en: …
- id: c2, title_es: …, title_en: …
...

Items:
- id: i1, text_es: …, text_en: …, column_id: c1
- id: i2, text_es: …, text_en: …, column_id: c2
...

Hint (ES): …
Hint (EN): …
Feedback correct (ES): …
Feedback correct (EN): …
Feedback incorrect (ES): …
Feedback incorrect (EN): …
Tags: [...]
```

## Validation Checklist
- Columns have unique IDs; items reference a valid `column_id`.
- ES/EN present (or EN empty if unavailable) for all text fields.
- Items concise; categories unambiguous; no mixed-language inline text.
- Feedback/hint concise; instructions clear.
