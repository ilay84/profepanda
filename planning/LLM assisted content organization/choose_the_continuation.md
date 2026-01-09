# Choose the Continuation (CTC) — LLM Authoring Guide (ES → EN)

Use this when asking the LLM to draft a “choose the continuation” exercise. Spanish (ES) is canonical; English (EN) is a full translation. The learner picks the best continuation for a given setup. Keep IDs stable and mirror structure in both languages.

## How it works & pedagogical goals
- **Choose the Continuation (CTC)**  
  - How: Learner reads a setup and selects the best continuation.  
  - Goal: Coherence-level application of the rule; tests whether the learner can extend a statement logically given the operator’s constraints.

## JSON Shape
```json
{
  "id": "ctc/example-001",
  "type": "ctc",
  "title_es": "Elige la continuación correcta",
  "title_en": "Choose the correct continuation",
  "instructions_es": "Lee el inicio y elige la continuación adecuada.",
  "instructions_en": "Read the beginning and choose the best continuation.",
  "items": [
    {
      "id": "s1",
      "setup_es": "Aunque hace frío, ella...",
      "setup_en": "Even though it’s cold, she...",
      "choices": [
        { "id": "a", "text_es": "sigue usando una campera gruesa.", "text_en": "keeps wearing a thick coat." },
        { "id": "b", "text_es": "prefiere usar un vestido ligero.",  "text_en": "prefers to wear a light dress." },
        { "id": "c", "text_es": "no sale de la casa.",               "text_en": "doesn’t leave the house." }
      ],
      "correct_id": "b",
      "hint_es": "El contraste debe ser coherente.",
      "hint_en": "The contrast should be coherent.",
      "feedback_correct_es": "Correcto.",
      "feedback_correct_en": "Correct.",
      "feedback_incorrect_es": "Revisa la coherencia con el inicio.",
      "feedback_incorrect_en": "Check the coherence with the setup."
    }
  ],
  "shuffle": true,
  "tags": ["A2-B1", "coherencia"]
}
```

## Field Notes
- `id`: stable slug.
- `type`: `ctc`.
- `title_*`, `instructions_*`: short, clear.
- `items[]`: each item has:
  - `setup_*`: the opening clause.
  - `choices[]`: 2–4 options; each with `id`, `text_es`, `text_en`.
  - `correct_id`: one choice ID.
  - `hint_*`: optional; brief.
  - `feedback_correct_*`, `feedback_incorrect_*`: concise, actionable.
- `shuffle`: optional boolean to randomize item order.
- `tags`: optional strings.

## Translations
- ES is source; EN mirrors meaning/structure.
- If a translation is missing, leave the `*_en` empty string.
- No mixed languages inline.

## Authoring Guidelines
- Setups should be clear and lead to one best continuation.
- Choices: short, coherent with the setup; avoid ambiguity and near-duplicates unless intentional.
- Hints: only if helpful; 1 short sentence.
- Feedback: reinforce the coherence/logic.
- Tone: neutral and instructional.

## LLM Output Format (copy/paste ready)
Return two sections: Spanish first, then English. Do **not** return full JSON; we will paste fields manually.

```
Exercise ID: ctc/slug-here
Title (ES): …
Title (EN): …
Instructions (ES): …
Instructions (EN): …
Shuffle: true/false

Items:
- ID: s1
  Setup (ES): …
  Setup (EN): …
  Choices:
    - id: a, text_es: …
    - id: b, text_es: …
    - id: c, text_es: …
  Correct choice id: …
  Hint (ES): …
  Hint (EN): …
  Feedback correct (ES): …
  Feedback correct (EN): …
  Feedback incorrect (ES): …
  Feedback incorrect (EN): …
- ID: s2
  ...
```

## Validation Checklist
- Each item has exactly one `correct_id` present in `choices`.
- ES/EN present (or EN empty if unavailable) for setup and choices.
- IDs unique across items/choices.
- Setups lead logically to the correct continuation; no mixed-language inline text.
- Feedback/hint concise; instructions clear.
