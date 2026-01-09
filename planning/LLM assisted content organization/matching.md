# Matching — LLM Authoring Guide (ES → EN)

Use this when asking the LLM to draft a matching exercise. Spanish (ES) is canonical; English (EN) is a full translation. The learner matches items from side A to side B. Keep IDs stable and mirror structure in both languages.

## How it works & pedagogical goals
- **Matching**  
  - How: Learner matches items on side A to side B (e.g., concept → example).  
  - Goal: Build connections between rules/labels and exemplars; reinforces classification and recall of operational uses through 1:1 pairing.

## JSON Shape
```json
{
  "id": "match/example-001",
  "type": "matching",
  "title_es": "Empareja SER y ejemplos",
  "title_en": "Match SER and examples",
  "instructions_es": "Relaciona cada concepto con su ejemplo.",
  "instructions_en": "Match each concept to its example.",
  "pairs": [
    { "id": "p1", "left_es": "SER",   "left_en": "SER",   "right_es": "profesión", "right_en": "profession" },
    { "id": "p2", "left_es": "ESTAR", "left_en": "ESTAR", "right_es": "ubicación", "right_en": "location" }
  ],
  "hint_es": "Piensa en esencia vs estado.",
  "hint_en": "Think essence vs state.",
  "feedback_correct_es": "Correcto: todos emparejados.",
  "feedback_correct_en": "Correct: all matched.",
  "feedback_incorrect_es": "Revisa los emparejamientos.",
  "feedback_incorrect_en": "Check the pairings.",
  "shuffle": true,
  "tags": ["A1-A2", "ser/estar"]
}
```

## Field Notes
- `id`: stable slug.
- `type`: `matching`.
- `title_*`, `instructions_*`: short, clear.
- `pairs[]`: each pairing; may be displayed as two columns.
  - `id`: stable per pair.
  - `left_*`, `right_*`: the text to match. Keep them concise and unambiguous.
- `hint_*`: optional; brief.
- `feedback_correct_*`, `feedback_incorrect_*`: concise.
- `shuffle`: optional boolean to randomize order of one side.
- `tags`: optional strings.

## Translations
- ES is source; EN mirrors meaning/structure.
- If a translation is missing, leave the `*_en` empty string.
- No mixed languages inline.

## Authoring Guidelines
- Keep each side short; avoid near-duplicate entries unless intentional.
- Aim for clear, 1:1 matches; avoid ambiguous overlaps.
- Hints: only if helpful; 1 short sentence.
- Feedback: acknowledge completion and prompt re-check if incorrect.
- Tone: neutral and instructional.

## LLM Output Format (copy/paste ready)
Return two sections: Spanish first, then English. Do **not** return full JSON; we will paste fields manually.

```
Exercise ID: match/slug-here
Title (ES): …
Title (EN): …
Instructions (ES): …
Instructions (EN): …
Shuffle: true/false

Pairs:
- id: p1, left_es: …, left_en: …, right_es: …, right_en: …
- id: p2, left_es: …, left_en: …, right_es: …, right_en: …
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
- Pairs have unique IDs and clear, non-overlapping matches.
- ES/EN present (or EN empty if unavailable) for all text fields.
- No mixed-language inline text.
- Prompts/hints/feedback concise; instructions clear.
