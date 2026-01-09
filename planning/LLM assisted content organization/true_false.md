# True/False Exercise — LLM Authoring Guide (ES → EN)

Use this when asking the LLM to draft a True/False (TF) exercise. Spanish (ES) is canonical; English (EN) is a full translation. Keep IDs stable; mirror structure in both languages.

## How it works & pedagogical goals
- **True/False (TF)**  
  - How: Learner reads a statement and chooses “true” or “false.”  
  - Goal: Quick checks on conceptual precision (e.g., essence vs situation). Reinforces binary rule contrasts and surfaces common misconceptions.

## JSON Shape
```json
{
  "id": "tf/example-001",
  "type": "tf",
  "title_es": "Verdadero/Falso: SER y ESTAR",
  "title_en": "True/False: SER and ESTAR",
  "instructions_es": "Indica si cada afirmación es verdadera o falsa.",
  "instructions_en": "Indicate whether each statement is true or false.",
  "items": [
    {
      "id": "itm1",
      "prompt_es": "El verbo SER se usa para la esencia.",
      "prompt_en": "The verb SER is used for essence.",
      "answer": true,
      "hint_es": "Piensa en identidad permanente.",
      "hint_en": "Think about permanent identity.",
      "feedback_correct_es": "Correcto: SER expresa la esencia.",
      "feedback_correct_en": "Correct: SER expresses essence.",
      "feedback_incorrect_es": "No exactamente. SER sí expresa la esencia.",
      "feedback_incorrect_en": "Not quite. SER does express essence."
    }
  ],
  "shuffle": true,
  "tags": ["A1-A2", "ser/estar"]
}
```

## Field Notes
- `id`: stable slug.  
- `type`: `tf`.  
- `title_*`, `instructions_*`: short, clear.  
- `items[]`: ordered; keep `id` per item.
  - `prompt_*`: the statement to judge.
  - `answer`: `true` or `false`.
  - `hint_*`: optional; keep brief.
  - `feedback_correct_*`, `feedback_incorrect_*`: concise, actionable.  
- `shuffle`: boolean to randomize order.  
- `tags`: optional strings.

## Translations
- ES is source; EN mirrors meaning/structure.  
- No inline mixed languages.  
- If a translation is missing, leave the `*_en` empty string.

## Authoring Guidelines
- Prompts: one clear fact per item; avoid ambiguity.  
- Hints: only if helpful; 1 short sentence.  
- Feedback: specific, contrasts correct vs incorrect; avoid repeating prompt verbatim.  
- Keep tone neutral and instructional.

## LLM Output Format (copy/paste ready)
Return two sections: Spanish first, then English. Do **not** return full JSON; we will paste fields manually.

```
Exercise ID: tf/slug-here
Title (ES): …
Title (EN): …
Instructions (ES): …
Instructions (EN): …
Shuffle: true/false

Items:
- ID: itm1
  Prompt (ES): …
  Prompt (EN): …
  Answer: true/false
  Hint (ES): …
  Hint (EN): …
  Feedback correct (ES): …
  Feedback correct (EN): …
  Feedback incorrect (ES): …
  Feedback incorrect (EN): …
- ID: itm2
  ...
```

## Validation Checklist
- Every item has `answer` set to true/false.  
- ES/EN present (or EN empty if unavailable) for all text fields.  
- IDs unique across items.  
- Prompts unambiguous; hints/feedback concise; no mixed-language inline text.  
- Matches allowed field set above.
