# Multiple Choice (MCQ) Exercise — LLM Authoring Guide (ES → EN)

Use this when asking the LLM to draft a Multiple Choice exercise. Spanish (ES) is canonical; English (EN) is a full translation. Keep IDs stable; mirror structure in both languages.

## How it works & pedagogical goals
- **Multiple Choice (MCQ)**  
  - How: Learner selects one correct option among several.  
  - Goal: Targeted discrimination of forms/uses; tests pattern recognition and rule application under controlled options.
  
## JSON Shape
```json
{
  "id": "mcq/example-001",
  "type": "mcq",
  "title_es": "MCQ: SER vs ESTAR en contexto",
  "title_en": "MCQ: SER vs ESTAR in context",
  "instructions_es": "Selecciona la opción correcta para cada pregunta.",
  "instructions_en": "Select the correct option for each question.",
  "shuffle": true,
  "items": [
    {
      "id": "q1",
      "prompt_es": "Elige la forma correcta: Ella __ enfermera.",
      "prompt_en": "Choose the correct form: She __ a nurse.",
      "choices": [
        { "id": "a", "text_es": "está", "text_en": "is (estar)" },
        { "id": "b", "text_es": "es",   "text_en": "is (ser)" }
      ],
      "correct_id": "b",
      "hint_es": "Piensa en profesión.",
      "hint_en": "Think about profession.",
      "feedback_correct_es": "Correcto: profesión usa SER.",
      "feedback_correct_en": "Correct: professions use SER.",
      "feedback_incorrect_es": "No exactamente. Para profesión se usa SER.",
      "feedback_incorrect_en": "Not quite. Use SER for professions."
    }
  ],
  "tags": ["A1-A2", "ser/estar"]
}
```

## Field Notes
- `id`: stable slug.  
- `type`: `mcq`.  
- `title_*`, `instructions_*`: short, clear.  
- `shuffle`: boolean to randomize item order.  
- `items[]`: ordered; keep `id` per item.
  - `prompt_*`: the question/prompt.  
  - `choices[]`: 2+ options; each has `id`, `text_es`, `text_en`.  
  - `correct_id`: matches one choice `id`.  
  - `hint_*`: optional; brief.  
  - `feedback_correct_*`, `feedback_incorrect_*`: concise, actionable.  
- `tags`: optional strings.

## Translations
- ES is source; EN mirrors meaning/structure.  
- If a translation is missing, leave the `*_en` empty string.  
- No mixed languages inline.

## Authoring Guidelines
- Prompts: unambiguous, one clear answer.  
- Choices: short; avoid trick wording; one correct choice.  
- Hints: only if helpful; 1 short sentence.  
- Feedback: specific to the choice; contrast correct vs incorrect.  
- Keep tone neutral and instructional.

## LLM Output Format (copy/paste ready)
Return two sections: Spanish first, then English. Do **not** return full JSON; we will paste fields manually.

```
Exercise ID: mcq/slug-here
Title (ES): …
Title (EN): …
Instructions (ES): …
Instructions (EN): …
Shuffle: true/false

Items:
- ID: q1
  Prompt (ES): …
  Prompt (EN): …
  Choices:
    - id: a, text_es: …
    - id: b, text_es: …
    - ...
  Correct choice id: …
  Hint (ES): …
  Hint (EN): …
  Feedback correct (ES): …
  Feedback correct (EN): …
  Feedback incorrect (ES): …
  Feedback incorrect (EN): …
- ID: q2
  ...
```

## Validation Checklist
- Each item has exactly one `correct_id` present in `choices`.  
- ES/EN present (or EN empty if unavailable) for prompts and choices.  
- IDs unique across items/choices.  
- Prompts unambiguous; choices concise; hints/feedback optional but consistent.  
- Matches allowed field set above.
