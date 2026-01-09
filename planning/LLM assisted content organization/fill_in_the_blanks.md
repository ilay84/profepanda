# Fill in the Blanks (FITB) — LLM Authoring Guide (ES → EN)

Use this when asking the LLM to draft a fill-in-the-blanks exercise. Spanish (ES) is canonical; English (EN) is a full translation. Keep IDs stable and mirror structure in both languages.

## How it works & pedagogical goals
- **Fill in the Blanks (FITB)**  
  - How: Learner supplies the missing form/word(s), with or without options.  
  - Goal: Active recall and form–meaning mapping in context; solid for practicing morphology or choosing the right operator in real sentences.

## JSON Shape
```json
{
  "id": "fitb/example-001",
  "type": "fitb",
  "title_es": "Completa con SER o ESTAR",
  "title_en": "Complete with SER or ESTAR",
  "instructions_es": "Completa cada espacio con la opción correcta.",
  "instructions_en": "Fill each blank with the correct option.",
  "items": [
    {
      "id": "s1",
      "text_es": "Ella __ ingeniera y __ en Madrid.",
      "text_en": "She __ an engineer and __ in Madrid.",
      "blanks": [
        {
          "id": "b1",
          "options": ["es", "está"],
          "answer": "es",
          "hint_es": "Profesión usa SER.",
          "hint_en": "Profession uses SER.",
          "feedback_correct_es": "Correcto: profesión usa SER.",
          "feedback_correct_en": "Correct: use SER for professions.",
          "feedback_incorrect_es": "No exactamente. Para profesión usa SER.",
          "feedback_incorrect_en": "Not quite. Use SER for professions."
        },
        {
          "id": "b2",
          "options": ["es", "está"],
          "answer": "está",
          "hint_es": "Piensa en ubicación/estado.",
          "hint_en": "Think location/state.",
          "feedback_correct_es": "Correcto: ubicación actual usa ESTAR.",
          "feedback_correct_en": "Correct: current location uses ESTAR.",
          "feedback_incorrect_es": "No exactamente. Para ubicación usa ESTAR.",
          "feedback_incorrect_en": "Not quite. Use ESTAR for location."
        }
      ]
    }
  ],
  "shuffle": true,
  "tags": ["A1-A2", "ser/estar"]
}
```

## Field Notes
- `id`: stable slug.  
- `type`: `fitb`.  
- `title_*`, `instructions_*`: short, clear.  
- `items[]`: each is a sentence/prompt containing one or more blanks.
  - `text_*`: show blanks as `__` (or leave placeholders for blanks).
  - `blanks[]`: ordered; each has:
    - `id`: stable within the item.
    - `options`: array of strings to choose from (or leave empty if free-text; if free-text, specify the expected `answer`).
    - `answer`: the correct option/string.
    - `hint_*`: optional; brief.
    - `feedback_correct_*`, `feedback_incorrect_*`: concise, actionable.
- `shuffle`: optional boolean to randomize item order.
- `tags`: optional strings.

## Translations
- ES is source; EN mirrors meaning/structure.  
- If a translation is missing, leave the `*_en` empty string.  
- No mixed languages inline.

## Authoring Guidelines
- One to three blanks per sentence is ideal.  
- Provide options when the task is choose-the-right-form; for free-text blanks, ensure `answer` is unambiguous.  
- Hints: only if helpful; 1 short sentence.  
- Feedback: specific to the blank; contrast correct vs incorrect.  
- Keep tone neutral and instructional.

## LLM Output Format (copy/paste ready)
Return two sections: Spanish first, then English. Do **not** return full JSON; we will paste fields manually.

```
Exercise ID: fitb/slug-here
Title (ES): …
Title (EN): …
Instructions (ES): …
Instructions (EN): …
Shuffle: true/false

Items:
- ID: s1
  Text (ES): Ella __ ingeniera y __ en Madrid.
  Text (EN): She __ an engineer and __ in Madrid.
  Blanks:
    - id: b1
      options: ["es", "está"]   (or leave empty for free-text)
      answer: es
      Hint (ES): …
      Hint (EN): …
      Feedback correct (ES): …
      Feedback correct (EN): …
      Feedback incorrect (ES): …
      Feedback incorrect (EN): …
    - id: b2
      options: ["es", "está"]
      answer: está
      ...
- ID: s2
  ...
```

## Validation Checklist
- Each blank has an `answer` and, if multiple-choice, `options` includes that answer.  
- ES/EN present (or EN empty if unavailable) for text, hints, feedback.  
- IDs unique (items and blanks).  
- Prompts unambiguous; hints/feedback concise; no mixed-language inline text.  
- Matches the field set above.
