# Click the Word (CTW) — LLM Authoring Guide (ES → EN)

Use this when asking the LLM to draft a “click the word” exercise. Spanish (ES) is canonical; English (EN) is a full translation. The learner clicks specific target words within a sentence. Keep IDs stable and mirror structure in both languages.

## How it works & pedagogical goals
- **Click the Word (CTW)**  
  - How: Learner clicks the target word(s) in a sentence.  
  - Goal: Form–function awareness and rapid scanning; helps notice cues (adjectives, operators, particles) that signal the operational choice.

## JSON Shape
```json
{
  "id": "ctw/example-001",
  "type": "ctw",
  "title_es": "Haz clic en los adjetivos",
  "title_en": "Click the adjectives",
  "instructions_es": "Haz clic en todas las palabras que sean adjetivos.",
  "instructions_en": "Click all the words that are adjectives.",
  "sentence_es": "El perro negro corre rápido por el parque.",
  "sentence_en": "The black dog runs quickly through the park.",
  "targets": ["negro"],                  // words to be clicked (ES forms)
  "hint_es": "Piensa en palabras que describen.",
  "hint_en": "Think of words that describe.",
  "feedback_correct_es": "Correcto: identificaste los adjetivos.",
  "feedback_correct_en": "Correct: you identified the adjectives.",
  "feedback_incorrect_es": "Revisa: solo las palabras que describen.",
  "feedback_incorrect_en": "Check: only the describing words.",
  "tags": ["A1-A2", "adjetivos"]
}
```

## Field Notes
- `id`: stable slug.
- `type`: `ctw`.
- `title_*`, `instructions_*`: short, clear.
- `sentence_*`: full sentence; keep ES/EN aligned.
- `targets`: array of target words in ES. (Case-sensitive? Typically match the form in the sentence.)
- `hint_*`: optional; brief.
- `feedback_correct_*`, `feedback_incorrect_*`: concise, actionable.
- `tags`: optional strings.

## Translations
- ES is source; EN mirrors meaning/structure.
- If a translation is missing, leave the `*_en` empty string.
- No mixed languages inline.

## Authoring Guidelines
- One sentence per exercise.
- Keep targets unambiguous: avoid repeated identical words unless intentional.
- Hints: only if helpful; 1 short sentence.
- Feedback: reinforce what defines the correct targets.
- Tone: neutral and instructional.

## LLM Output Format (copy/paste ready)
Return two sections: Spanish first, then English. Do **not** return full JSON; we will paste fields manually.

```
Exercise ID: ctw/slug-here
Title (ES): …
Title (EN): …
Instructions (ES): …
Instructions (EN): …
Sentence (ES): …
Sentence (EN): …
Targets (ES): ["...","..."]
Hint (ES): …
Hint (EN): …
Feedback correct (ES): …
Feedback correct (EN): …
Feedback incorrect (ES): …
Feedback incorrect (EN): …
Tags: [...]
```

## Validation Checklist
- Targets appear in the ES sentence and are unique/clear.
- ES/EN present (or EN empty if unavailable) for text fields.
- No mixed-language inline text.
- Feedback/hint concise; instructions clear.
