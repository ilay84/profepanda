# Dictation — LLM Authoring Guide (ES → EN)

Use this when asking the LLM to draft a dictation exercise. Spanish (ES) is canonical; English (EN) is a full translation. The learner listens to audio and types the sentence/phrase. Keep IDs stable and mirror structure in both languages.

## How it works & pedagogical goals
- **Dictation**  
  - How: Learner listens to audio and types exactly what they hear.  
  - Goal: Integrates listening with accurate form production; reinforces spelling, accents, agreement, and operational choices in authentic phrasing.

## JSON Shape
```json
{
  "id": "dict/example-001",
  "type": "dictation",
  "title_es": "Dictado: SER y ESTAR",
  "title_en": "Dictation: SER and ESTAR",
  "instructions_es": "Escucha el audio y escribe la frase exactamente.",
  "instructions_en": "Listen to the audio and type the sentence exactly.",
  "items": [
    {
      "id": "s1",
      "text_es": "Ella es ingeniera y está en Madrid.",
      "text_en": "She is an engineer and is in Madrid.",
      "audio_url": "https://…/dictation_s1.mp3",
      "hint_es": "Piensa en SER para profesión y ESTAR para ubicación.",
      "hint_en": "Think SER for profession, ESTAR for location.",
      "feedback_correct_es": "Correcto.",
      "feedback_correct_en": "Correct.",
      "feedback_incorrect_es": "Revisa la ortografía y los acentos.",
      "feedback_incorrect_en": "Check spelling and accents."
    }
  ],
  "tags": ["A1-A2", "ser/estar"]
}
```

## Field Notes
- `id`: stable slug.
- `type`: `dictation`.
- `title_*`, `instructions_*`: short, clear.
- `items[]`: each is one dictation sentence/phrase.
  - `text_*`: full canonical text.
  - `audio_url`: required for delivery (upload or external URL).
  - `hint_*`: optional; brief.
  - `feedback_correct_*`, `feedback_incorrect_*`: concise.
- `tags`: optional strings.

## Translations
- ES is source; EN mirrors meaning/structure.
- If a translation is missing, leave the `*_en` empty string.
- No mixed languages inline.

## Authoring Guidelines
- Keep sentences concise; focus on the target structure.
 - Provide clear, good-quality audio (one per item). If not available, leave `audio_url` blank and flag it.
 - Hints: only if helpful; 1 short sentence.
 - Feedback: simple confirmation/correction; mention accents if relevant.
 - Tone: neutral and instructional.

## LLM Output Format (copy/paste ready)
Return two sections: Spanish first, then English. Do **not** return full JSON; we will paste fields manually.

```
Exercise ID: dict/slug-here
Title (ES): …
Title (EN): …
Instructions (ES): …
Instructions (EN): …

Items:
- ID: s1
  Text (ES): …
  Text (EN): …
  Audio URL: …
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
- Each item has `text_es` and `audio_url` (or flag if missing).
- ES/EN present (or EN empty if unavailable) for all text fields.
- IDs unique across items.
- Prompts unambiguous; hints/feedback concise; no mixed-language inline text.
