# ProfePanda Grammar Course Design Guide (Lesson App Schema)

Design grammar-focused lessons that teach one micro-concept at a time with
confidence-first sequencing. Use the schema defined in
`planning/lessons_app_content_reference.md`. This guide defines how to plan,
sequence, and author lessons so learners build mastery through recognition,
guided production, and independent use.

> Note for GPT implementation: If the user has not specified a proficiency
> level, ask for it before generating content (A1/A2/B1/B2/C1/C2).

---

## 1) Mission: Confidence-First Microlearning

- Teach one tiny concept per lesson.
- Start with clarity, then recognition, then production.
- Avoid long rule explanations; prefer short Markdown prompts embedded in
  exercises.
- Keep the learner successful at each step (low cognitive load first).

---

## 2) Content Hierarchy and Data Model

**Hierarchy:** Course -> Unit (optional) -> Lesson -> Exercises (slides)

- Courses live in `data/lessons_app/courses.json`.
- Units (optional) live in `data/lessons_app/units.json`.
- Lessons live in `data/lessons_app/lessons.json`.
- Exercises live in `data/lessons_app/exercises.json`.

Lesson ID handling:
- In the admin JSON editor, `lesson_id` is auto-assigned by the UI based on the
  selected lesson. It can be omitted in authored JSON.

---

## 3) Sequencing Rules (Always Follow)

- One new concept at a time.
- Recognition before production.
- Move from guided to independent practice.
- Vary difficulty with more distractors, longer sentences, fewer hints, and
  less obvious context.

---

## 4) Standard Lesson Flow (Per Micro-Concept)

This is the default sequence. Aim for ~20 slides, but use as many as needed.

### Step 1: Model the Concept (Markdown + Example)
- The very first slide of every lesson.
- Use a short Markdown explanation in the `question` field of the first
  interactive slide.
- Either include an `example_sentence` immediately after, or use a slide type
  that can show an example in its prompt.
- Nothing comes before this step.

### Step 2: Recognition (Low Load)
Use easy, confidence-building recognition:
- `matching`
- `dictation_select`
- `select_all`
- `picture_choice`
- `picture_select_all`
- `vocab_cards`
- `error_spotting` (very short sentence, single error)

### Step 3: Guided Output (Low-Medium Load)
Guided practice with high support:
- `multiple_choice`
- `fill_blanks_select`
- `word_order`
- `reorder`
- `dictation_focus` (short audio, small cloze)

### Step 4: Controlled Output (Medium Load)
Require typed output with constraints:
- `fill_blank`
- `translation`
- `conjugation_map`
- `conjugation_drill`
- `morphology_builder`

### Step 5: Higher Load Production (High Load)
Use only after strong performance in earlier steps:
- `dictation`
- `translation` (free recall, longer)

### Step 6: Mixed Review
Reuse earlier types in new contexts to stabilize learning.

### Step 7: Optional Wrap-Up
Use only if needed:
- `dialogue` (synthesis)
- `explanation` (recap, not default)
- `content_embed` (review slides/videos)
- `custom_block` (admin-only special cases)

---

## 5) Cognitive Load Table

| Type | Demand | When to Use |
| --- | --- | --- |
| Markdown in `question` | Low | Always first slide |
| `example_sentence` | Low | Immediately after the markdown intro |
| `matching`, `dictation_select`, `select_all`, `picture_choice`, `picture_select_all`, `vocab_cards` | Low | Recognition phase |
| `multiple_choice`, `fill_blanks_select`, `word_order`, `reorder`, `dictation_focus` | Medium | Guided output |
| `fill_blank`, `translation`, `conjugation_map`, `conjugation_drill`, `morphology_builder` | Medium-High | Controlled output |
| `dictation` | High | Final output stage |
| `dialogue` | Medium/High | Synthesis or wrap-up |
| `explanation`, `content_embed`, `custom_block` | Low/Medium | Recap or enrichment only |

---

## 6) Prompt and Markdown Best Practices

- Use inline Markdown in `question` to deliver short, clear explanations.
- Keep explanations short and operational (no lecture style).
- Use bold/italic to highlight contrasts (e.g., **ser** vs *estar*).
- Use examples immediately after the explanation.
- Use backticks for Spanish words/phrases; backticks render in #475dd7.
- Italics are for English contrast or emphasis only.
- For `vocab_cards`, labels are bold and black by default; use backticks to color specific segments in #475dd7.
- Add brief feedback wherever supported:
  - `option_feedback` for selection-based types (multiple choice, select all, dictation select, picture choice, picture select all).
  - `fill_blanks_feedback` and `fill_blanks_decoy_feedback` for Fill Blanks (Select).
  - `correct_feedback` / `incorrect_feedback` for typed responses (translation, fill blank, dictation) and optional for word order/reorder.
  - `token_feedback` for Error Spotting.
  - Keep feedback short, specific, and confidence-building. Markdown allowed.

---

## 7) Audio Guidelines

- Provide audio suggestions, not URLs.
- Use `audio_url` or `post_correct_audio_url` fields where supported.
- Include tone, speed, accent, and exact phrase in the audio suggestion.

Supported audio behaviors:
- Prompt audio: `dictation.audio_url`, `dictation_select.audio_url`,
  `dictation_focus.audio_url`, `pronunciation_imitation.model_audio_url`,
  `dialog_lines[].audio_url`, `example_sentence.audio_url`.
- Post-correct audio: `multiple_choice.audio_url`, `fill_blank.audio_url`,
  `translation.audio_url`, `word_order.audio_url`, `reorder.audio_url`,
  `matching_pairs[].audio_url`, `select_all.audio_url`, `picture_choice.audio_url`,
  `picture_select_all.audio_url`,
  `error_spotting.audio_url`, `conjugation_map.audio_url`, `conjugation_drill.audio_url`,
  `morphology_builder.audio_url`, `dictation_select.post_correct_audio_url`,
  `dictation_focus.post_correct_audio_url`.
 - Manual card audio: `vocab_cards[].audio_url` (click to play).

---

## 8) Standard Lesson Outline (~20 Slides)

Use this pattern and extend/contract as needed:

1) Markdown explanation in `question` (interactive slide)
2) `example_sentence` (same concept)
3) `select_all` or `matching` (very easy)
4) `dictation_select`, `picture_choice`, `picture_select_all`, or `vocab_cards` (easy recognition)
5) `fill_blanks_select` (guided)
6) `word_order` or `reorder` (guided)
7) `multiple_choice` (guided)
8) `fill_blank` (short)
9) `translation` (short)
10) `example_sentence` (new context)
11) `matching` or `error_spotting` (new context)
12) `select_all`, `picture_choice`, or `picture_select_all` (harder)
13) `fill_blank` (harder)
14) `translation` (harder)
15) `dictation_focus` (short)
16) `dictation` (short)
17) Mixed review (best-fit type)
18) Mixed review (different type)
19) Light recap in `question` (Markdown)
20) Optional `dialogue` or wrap-up embed

---

## 9) Output Format for Content Creation

Always provide content in this order:
1) Course metadata (`courses.json`)
2) Unit metadata (`units.json`, optional)
3) Lesson metadata (`lessons.json`)
4) Exercises (`exercises.json`), one block per slide

Within exercises:
- Start with Markdown in `question`.
- Then `example_sentence`.
- Then recognition, guided output, controlled output, high load, mixed review.

---

## 10) Sample Lesson (12 Slides) - Ser (Identity)

```json
[
  {
    "type": "multiple_choice",
    "order": 1,
    "question": "`Ser` is for identity. Select the **correct** sentence.",
    "options": ["Yo soy estudiante.", "Yo estoy estudiante."],
    "correct_answer": "Yo soy estudiante.",
    "option_feedback": [
      "Correct. Use `ser` for identity.",
      "Incorrect. `Estoy` is for states/locations."
    ]
  },
  {
    "type": "example_sentence",
    "order": 2,
    "question": "Listen and read the example.",
    "sentence_text": "Yo `soy` estudiante.",
    "sentence_translation": "I am a student.",
    "audio_url": "Audio suggestion: clear neutral voice saying Yo soy estudiante."
  },
  {
    "type": "select_all",
    "order": 3,
    "question": "Select all **ser** sentences.",
    "options": ["Ella es doctora.", "Ella esta cansada.", "Nosotros somos amigos."],
    "correct_options": ["Ella es doctora.", "Nosotros somos amigos."],
    "option_feedback": [
      "Correct. **es** is a form of **ser**.",
      "Incorrect. **esta** is a form of **estar**.",
      "Correct. **somos** is a form of **ser**."
    ],
    "hint": "Use **ser** for identity."
  },
  {
    "type": "fill_blanks_select",
    "order": 4,
    "question": "Choose the correct **ser** form.",
    "fill_blanks_sentence": "Tu {1} mi amigo.",
    "fill_blanks_answers": ["eres"],
    "fill_blanks_decoys": ["es", "soy"],
    "hint": "Tu -> **eres**"
  },
  {
    "type": "word_order",
    "order": 5,
    "question": "Form the sentence: \"We are friends.\"",
    "word_order_words": ["Nosotros", "somos", "amigos."],
    "hint": "Start with the pronoun."
  },
  {
    "type": "fill_blank",
    "order": 6,
    "question": "Ellos ___ estudiantes.",
    "correct_answer": "son",
    "correct_feedback": "Correct. **son** is the ellos form of **ser**.",
    "incorrect_feedback": "Try the ellos form of **ser**.",
    "hint": "ellos -> **son**"
  },
  {
    "type": "translation",
    "order": 7,
    "question": "She is a doctor.",
    "correct_answer": "Ella es doctora.",
    "correct_feedback": "Nice. **es** matches \"she is.\"",
    "incorrect_feedback": "Remember: **es** is the third-person singular of **ser**.",
    "hint": "Use **ser** for identity."
  },
  {
    "type": "example_sentence",
    "order": 8,
    "question": "New context example.",
    "sentence_text": "Mi hermano **es** ingeniero.",
    "sentence_translation": "My brother is an engineer."
  },
  {
    "type": "matching",
    "order": 9,
    "question": "Match the subject with the correct **ser** form.",
    "matching_pairs": [
      { "left": "yo", "right": "soy" },
      { "left": "tu", "right": "eres" },
      { "left": "nosotros", "right": "somos" }
    ]
  },
  {
    "type": "dictation",
    "order": 10,
    "question": "Write what you hear.",
    "audio_url": "Audio suggestion: clear neutral voice saying Nosotros somos amigos.",
    "correct_answer": "Nosotros somos amigos."
  },
  {
    "type": "translation",
    "order": 11,
    "question": "**Remember:** ser = identity. Translate: \"I am a teacher.\"",
    "correct_answer": "Yo soy profesor."
  },
  {
    "type": "dictation",
    "order": 12,
    "question": "Final listen-and-write.",
    "audio_url": "Audio suggestion: clear neutral voice saying Ella es doctora.",
    "correct_answer": "Ella es doctora."
  }
]
```

---

End of document.
