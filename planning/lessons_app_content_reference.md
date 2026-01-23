# ProfePanda Lessons App: Course + Content Reference (for Custom GPT)

Use this document to guide lesson design, course organization, and JSON authoring.
It covers:
- Course, unit, lesson structure and storage
- Exact JSON fields for every exercise/content type
- Markdown support and where it applies
- Audio behaviors (including post-correct answer audio)

All JSON examples are illustrative. Field order is not required, but field names are.

---

## 1) Data Model Overview

Lessons App data is stored as JSON arrays in:
- `data/lessons_app/courses.json`
- `data/lessons_app/lessons.json`
- `data/lessons_app/exercises.json`
- `data/lessons_app/units.json` (created once units are added)
- `data/lessons_app/enrollments.json`
- `data/lessons_app/progress.json`

Only `courses.json`, `lessons.json`, and `exercises.json` are required to run content.
Units are optional. Enrollments/progress are user-facing and can be empty.

---

## 2) Course Structure

### Course JSON (in `courses.json`)
Minimal required fields:
```json
{
  "id": "spanish-basics",
  "title": "Spanish Basics",
  "description": "Learn essential Spanish for everyday situations.",
  "keywords": ["greetings", "basics", "travel"],
  "source_language": "English",
  "target_language": "Spanish",
  "level": "beginner",
  "image_url": "",
  "is_published": true,
  "order": 0
}
```

Additional fields tracked/updated by the app:
```json
{
  "completed_lessons": 0,
  "total_lessons": 2,
  "progress_percent": 0,
  "is_mastered": false
}
```

### Course naming guidance
- Keep titles short and recognizable (2-4 words).
- For large courses, organize into units (see below).
- Use `source_language` and `target_language` exactly as you want displayed.

---

## 3) Units (Optional)

Units group lessons within a course. Only used if units exist for that course.

### Unit JSON (in `units.json`)
```json
{
  "id": "sb-unit-01",
  "course_id": "spanish-basics",
  "title": "Unit 1: Greetings",
  "description": "Core introductions and polite phrases.",
  "order": 1
}
```

Behavior:
- Units are collapsed by default in the student view.
- If no units exist for a course, lessons render as a flat list.
- Lesson objects can reference a unit with `unit_id` (see below).

---

## 4) Lessons

### Lesson JSON (in `lessons.json`)
```json
{
  "id": "sb-01",
  "course_id": "spanish-basics",
  "unit_id": "sb-unit-01",
  "title": "Greetings",
  "description": "Say hello and introduce yourself.",
  "keywords": ["hello", "introductions", "polite"],
  "xp_reward": 10,
  "is_published": true,
  "order": 1
}
```

Notes:
- `unit_id` is optional; omit it for courses without units.
- `order` controls lesson ordering within a course (or unit).

---

## 5) Exercises / Content Items (in `exercises.json`)

Each exercise is stored as a single object. When authoring content in the admin UI,
you do not need to include `lesson_id` in the JSON editor because it is set
automatically based on the currently selected lesson.
```json
{
  "id": "sb-01-ex-01",
  "lesson_id": "sb-01",
  "type": "multiple_choice",
  "order": 1,
  "question": "How do you say `Hola` in Spanish?",
  "hint": "It starts with H."
}
```

### Common fields across types
- `id` (string): unique exercise id
- `lesson_id` (string): parent lesson id (auto-assigned in the UI; optional in JSON editor)
- `type` (string): exercise type
- `order` (number): ordering within a lesson
- `question` (string): prompt shown to the learner (not used by all types). Supports inline Markdown (bold/italic/inline code).
- `prompt_image_url` (string, optional): image shown below the prompt (URL or uploaded image)
- `hint` (string, optional): shown when hints are enabled
- Feedback fields (e.g., `option_feedback`, `correct_feedback`) support inline Markdown.
- All `image_url` fields accept uploaded images from the admin UI (stored and referenced like URLs).

Markdown styling rule (applies to prompts, titles, and hints):
- `Backticks` render in #475dd7 and should be used for Spanish words/phrases or endings.
- In any feedback field, wrap Spanish target words/phrases in backticks so they render highlighted.
- **Bold** renders in normal text color (black) for emphasis.
- *Italics* are for English emphasis or contrast and render in normal text color.

### Post-correct audio behavior
For selected types, an optional `audio_url` can be provided.
If present and the learner answers correctly, the app:
1) Plays the correct answer sound
2) Immediately plays the `audio_url`

Types that support post-correct `audio_url`:
- `multiple_choice`
- `translation`
- `fill_blank`
- `word_order`
- `reorder`
- `conjugation_map`
- `conjugation_drill`
- `morphology_builder`
- `select_all`
- `picture_choice`
- `picture_select_all`
- `matching` (per-pair audio, see below)

---

## 6) Exercise Types: JSON Schemas + Notes

### A) Multiple Choice (`type: "multiple_choice"`)
```json
{
  "type": "multiple_choice",
  "question": "How do you say `Hola` in Spanish?",
  "options": ["Hola", "Adios", "Gracias", "Por favor"],
  "correct_answer": "Hola",
  "option_feedback": [
    "Correct!",
    "Not quite.",
    "This means thank you.",
    "This means please."
  ],
  "hint": "It starts with `H`.",
  "audio_url": "https://example.com/audio/hola.mp3"
}
```
Notes:
- `option_feedback` is optional but supports per-option feedback (inline markdown).
- `audio_url` plays after correct answer sound (optional).

---

### B) Translation (`type: "translation"`)
```json
{
  "type": "translation",
  "question": "`Good morning`",
  "correct_answer": "Buenos dias",
  "correct_feedback": "Nice! You used the formal greeting.",
  "incorrect_feedback": "Remember the accent on **días**.",
  "hint": "Two words. The second has an accent.",
  "audio_url": "https://example.com/audio/buenos-dias.mp3"
}
```
Notes:
- Answer is typed by student; accents matter unless you normalize externally.
- `correct_feedback` and `incorrect_feedback` are optional (inline markdown).
- `audio_url` plays after correct answer sound (optional).

---

### C) Fill in the Blank (`type: "fill_blank"`)
```json
{
  "type": "fill_blank",
  "question": "Me {1} Eli.",
  "correct_answer": "llamo",
  "correct_feedback": "Correct. **Me llamo** is used for introductions.",
  "incorrect_feedback": "Try the verb for \"to call oneself\".",
  "hint": "Verb for \"to call oneself\".",
  "audio_url": "https://example.com/audio/llamo.mp3"
}
```
Notes:
- The blank is indicated by `{1}` in the question (preferred). `___` still works for legacy content.
- `correct_feedback` and `incorrect_feedback` are optional (inline markdown).
- `audio_url` plays after correct answer sound (optional).

---

### D) Fill Blanks (Select) (`type: "fill_blanks_select"`)
```json
{
  "type": "fill_blanks_select",
  "question": "Complete the sentence with `ser`.",
  "fill_blanks_sentence": "Yo {1} {2}.",
  "fill_blanks_answers": ["soy", "estudiante"],
  "fill_blanks_decoys": ["tu", "es"],
  "fill_blanks_feedback": [
    "**soy** matches the subject \"yo\".",
    "**estudiante** is the noun that follows."
  ],
  "fill_blanks_decoy_feedback": [
    "**tu** is a subject pronoun, not a verb.",
    "**es** is for he/she/it, not \"yo\"."
  ],
  "hint": "Use the correct verb form.",
  "audio_url": "https://example.com/audio/yo-soy-estudiante.mp3"
}
```
Notes:
- Use `{1}`, `{2}`, `{3}` placeholders in `fill_blanks_sentence` to mark blanks.
- `fill_blanks_answers` must be in the correct order for the placeholders.
- `fill_blanks_decoys` are extra options shown as distractors (optional).
- `fill_blanks_feedback` and `fill_blanks_decoy_feedback` are optional per-pill feedback (inline markdown).
- `audio_url` plays after correct answer sound (optional).

---

### E) Matching (`type: "matching"`)
```json
{
  "type": "matching",
  "matching_pairs": [
    {
      "left": "Hola",
      "right": "Hello",
      "audio_url": "https://example.com/audio/hola.mp3"
    },
    {
      "left": "Adios",
      "right": "Goodbye",
      "audio_url": "https://example.com/audio/adios.mp3"
    }
  ],
  "hint": "Start with the obvious one: Hola."
}
```
Notes:
- `audio_url` is per pair and plays after a correct match (optional).

---

### F) Explanation (`type: "explanation"`)
```json
{
  "type": "explanation",
  "explanation_content": "## Ser vs Estar\n\n`Ser` is permanent.\n\n- Soy alto.\n- Ella es doctora."
}
```
Markdown rules:
- `explanation_content` supports Markdown (headings, lists, bold, italics).
 

---

### G) Example Sentence (`type: "example_sentence"`)
```json
{
  "type": "example_sentence",
  "question": "Listen and read.",
  "sentence_text": "Yo `soy` estudiante.",
  "sentence_translation": "I am a student.",
  "audio_url": "https://example.com/audio/yo-soy-estudiante.mp3"
}
```
Markdown rules:
- `sentence_text` supports Markdown.
- Bold (`**word**`) renders in brand blue (#475dd7).

---

### H) Dialogue (`type: "dialogue"`)
```json
{
  "type": "dialogue",
  "question": "Romi and `Eli` greet each other.",
  "dialog_speakers": [
    { "name": "Eli", "avatar_url": "" },
    { "name": "Romi", "avatar_url": "" }
  ],
  "dialog_lines": [
    {
      "speaker_index": 0,
      "text": "Hola, Romi.",
      "translation": "Hi, Romi.",
      "audio_url": "https://example.com/audio/hola-romi.mp3"
    },
    {
      "speaker_index": 1,
      "text": "Hola, Eli. Como va?",
      "translation": "Hi, Eli. How's it going?",
      "audio_url": "https://example.com/audio/hola-eli.mp3"
    }
  ]
}
```
Notes:
- Speaker index references `dialog_speakers` by array index.
- Each line may include its own `audio_url`.

---

### I) Word Order (`type: "word_order"`)
```json
{
  "type": "word_order",
  "question": "Order the words to make `Se me olvido la tarea`.",
  "word_order_words": ["Se", "me", "olvido", "la", "tarea."],
  "word_order_decoys": ["el", "perro"],
  "correct_feedback": "Nice! Reflexive pronouns go before the verb.",
  "incorrect_feedback": "Try placing the pronoun before the verb.",
  "hint": "Start with \"Se\".",
  "audio_url": "https://example.com/audio/se-me-olvido-la-tarea.mp3"
}
```
Notes:
- Correct order is the `word_order_words` array.
- `correct_feedback` and `incorrect_feedback` are optional (inline markdown).
- `audio_url` plays after correct answer sound (optional).

---

### J) Dictation (`type: "dictation"`)
```json
{
  "type": "dictation",
  "question": "Write what you hear from `audio`.",
  "audio_url": "https://example.com/audio/pelotudo.mp3",
  "correct_answer": "Pelotudo",
  "correct_feedback": "Great listening.",
  "incorrect_feedback": "Listen again for the final syllable.",
  "hint": "Starts with P."
}
```
Notes:
- Dictation uses `audio_url` as the prompt audio.
- `correct_feedback` and `incorrect_feedback` are optional (inline markdown).
- Correct/incorrect sounds play on submit.

---

### K) Dictation (Select) (`type: "dictation_select"`)
```json
{
  "type": "dictation_select",
  "question": "Click the word you hear (`vaso`)."
  "audio_url": "https://example.com/audio/vaso.mp3",
  "options": ["el vaso", "la ventana", "el piano", "la taza"],
  "correct_answer": "el vaso",
  "option_feedback": [
    "Correct. **el vaso** is masculine.",
    "**la ventana** is feminine.",
    "**el piano** is masculine but not the audio.",
    "**la taza** is feminine."
  ],
  "post_correct_audio_url": "https://example.com/audio/vaso-post.mp3",
  "hint": "Masculine nouns often use el."
}
```
Notes:
- Uses `audio_url` as the prompt audio.
- Options render in randomized order.
- `option_feedback` is optional per-option feedback (inline markdown).
- `post_correct_audio_url` plays after the correct-answer sound (optional).

---

### L) Dictation (Focus) (`type: "dictation_focus"`)
```json
{
  "type": "dictation_focus",
  "question": "Listen and complete the sentence.",
  "focus_sentence": "Yo {1} {2}.",
  "focus_answers": ["soy", "estudiante"],
  "focus_options": ["soy", "estudiante", "tu", "es"],
  "audio_url": "https://example.com/audio/yo-soy-estudiante.mp3",
  "post_correct_audio_url": "https://example.com/audio/yo-soy-estudiante-post.mp3",
  "hint": "Use the correct verb form."
}
```
Notes:
- Use `{1}`, `{2}`, `{3}` placeholders in `focus_sentence` to mark blanks.
- `focus_answers` must match the placeholder order.
- `focus_options` is optional; leave empty to require typing.
- `post_correct_audio_url` plays after the correct-answer sound (optional).

---

### M) Pronunciation Imitation (`type: "pronunciation_imitation"`)
```json
{
  "type": "pronunciation_imitation",
  "question": "Listen and imitate the phrase.",
  "model_text": "Me **llamo** Ana.",
  "model_audio_url": "https://example.com/audio/me-llamo-ana.mp3",
  "hint": "Focus on the double L sound.",
  "prompt_image_url": "https://example.com/images/ana.png"
}
```
Notes:
- Uses `model_audio_url` as the reference audio.
- Learners record themselves locally and compare waveforms; recordings are not saved.
- `model_text` supports inline Markdown.

---

### N) Conjugation Map (`type: "conjugation_map"`)
```json
{
  "type": "conjugation_map",
  "title": "Present Tense: Hablar",
  "intro_markdown": "Use the conjugation endings for **-ar** verbs.",
  "completion_message_markdown": "Great work! You nailed the present tense.",
  "pool_forms": ["habl`o`", "habl`as`", "habl`a`", "habl`amos`"],
  "shuffle_pool": true,
  "groups": [
    {
      "group_id": "group-1",
      "group_title": "Present tense",
      "slots": [
        {
          "slot_id": "slot-1-1",
          "subjects": ["yo"],
          "accepted_forms": ["habl`o`"],
          "slot_note_markdown": "Use **-o** for yo."
        },
        {
          "slot_id": "slot-1-2",
          "subjects": ["tu"],
          "accepted_forms": ["habl`as`"],
          "slot_note_markdown": "Use **-as** for tu."
        }
      ]
    }
  ],
  "hint": "Think about regular -ar endings.",
  "audio_url": "https://example.com/audio/hablar-present.mp3"
}
```
Notes:
- Use backticks inside `pool_forms` and `accepted_forms` to mark the conjugation ending.
  The ending renders in #475dd7 with an underline after a correct match.
- `audio_url` plays after the correct-answer sound each time a correct form is selected.
- `slot_note_markdown` supports inline markdown (bold/italic/inline code).

---

### O) Morphology Builder (`type: "morphology_builder"`)
```json
{
  "type": "morphology_builder",
  "question": "Build the word meaning \"reusable\".",
  "morpheme_pool": [
    { "text": "re-", "type": "prefix" },
    { "text": "use", "type": "root" },
    { "text": "-able", "type": "suffix" },
    { "text": "-ment", "type": "suffix" }
  ],
  "correct_sequence": ["re-", "use", "-able"],
  "show_hyphenation": true,
  "hint": "Start with the prefix meaning \"again\".",
  "audio_url": "https://example.com/audio/reusable.mp3",
  "correct_feedback": "Nice! re- + use + -able means reusable.",
  "incorrect_feedback": "Try the prefix first, then the root."
}
```
Notes:
- `morpheme_pool` accepts objects with `text`, `type` (`prefix`, `root`, `suffix`, `other`),
  and optional `label` (used when `type` is `other`).
- `correct_sequence` is the exact ordered list of morphemes.
- `show_hyphenation` controls whether hyphens display in the player.
- `audio_url` plays after the correct answer sound (optional).

---

### P) Reorder (`type: "reorder"`)
```json
{
  "type": "reorder",
  "question": "Put the steps in order.",
  "items": [
    "First, wash your hands.",
    "Then, cut the vegetables.",
    "Finally, serve the salad."
  ],
  "hint": "Look for time words.",
  "audio_url": "https://example.com/audio/steps.mp3",
  "correct_feedback": "Nice! That is the right sequence.",
  "incorrect_feedback": "Try again—start with the preparation step."
}
```
Notes:
- Enter `items` in the correct order; the player shuffles them.
- `audio_url` plays after the correct answer sound (optional).

---

### Q) Conjugation Drill (`type: "conjugation_drill"`)
```json
{
  "type": "conjugation_drill",
  "question": "Conjugate **hablar** for **yo** (present).",
  "correct_answer": "hablo",
  "stem": "habl",
  "ending": "o",
  "hint": "Regular -ar verbs use **-o** for yo.",
  "audio_url": "https://example.com/audio/hablo.mp3",
  "correct_feedback": "Correct: habl + **o**.",
  "incorrect_feedback": "Try again. Yo uses **-o**."
}
```
Notes:
- `stem` renders plain; `ending` renders underlined in brand blue.
- If `stem` or `ending` is omitted, the correct answer renders as plain text.
- `audio_url` plays after the correct answer sound (optional).

---

### R) Content Embed (`type: "content_embed"`)
```json
{
  "type": "content_embed",
  "question": "Review the key idea in this short clip.",
  "embed_url": "https://www.youtube.com/embed/VIDEO_ID",
  "embed_html": "<iframe src=\"https://www.canva.com/design/.../view?embed\" allowfullscreen=\"allowfullscreen\"></iframe>",
  "embed_title": "Intro video",
  "embed_aspect_ratio": "16:9",
  "embed_allow_fullscreen": true
}
```
Notes:
- Accepts YouTube, Canva, and Google Slides URLs (share links are normalized).
- If `embed_html` is provided, it is used instead of `embed_url`.
- `embed_aspect_ratio` supports `16:9`, `4:3`, `1:1`, `9:16`.
- `embed_allow_fullscreen` controls the iframe fullscreen permission.

---

### S) Picture Choice (`type: "picture_choice"`)
```json
{
  "type": "picture_choice",
  "question": "Choose the image that matches **el vaso**.",
  "prompt_image_url": "https://example.com/images/glass.png",
  "picture_options": [
    { "image_url": "https://example.com/images/vaso.png", "label": "el vaso" },
    { "image_url": "https://example.com/images/taza.png", "label": "la taza" },
    { "image_url": "https://example.com/images/plato.png", "label": "el plato" }
  ],
  "correct_index": 0,
  "option_feedback": [
    "Correct. **el vaso** is the glass.",
    "**la taza** is a cup.",
    "**el plato** is a plate."
  ],
  "hint": "Look for the glass.",
  "audio_url": "https://example.com/audio/vaso.mp3"
}
```
Notes:
- `picture_options[].image_url` supports SVG, PNG, JPG, WEBP (URL or uploaded image).
- `option_feedback` is optional per-option feedback (inline markdown).
- `audio_url` plays after the correct-answer sound (optional).

---

### T) Picture Choice (Multi) (`type: "picture_select_all"`)
```json
{
  "type": "picture_select_all",
  "question": "Select all images that match **el**.",
  "prompt_image_url": "https://example.com/images/articles.png",
  "picture_options": [
    { "image_url": "https://example.com/images/vaso.png", "label": "`el` vaso" },
    { "image_url": "https://example.com/images/casa.png", "label": "`la` casa" },
    { "image_url": "https://example.com/images/sol.png", "label": "`el` sol" },
    { "image_url": "https://example.com/images/noche.png", "label": "`la` noche" }
  ],
  "correct_indices": [0, 2],
  "option_feedback": [
    "Correct. **el** is masculine.",
    "**la** is feminine.",
    "Correct. **el** is masculine.",
    "**la** is feminine."
  ],
  "hint": "Look for masculine articles.",
  "audio_url": "https://example.com/audio/el-articles.mp3"
}
```
Notes:
- Multi-select version of Picture Choice.
- `correct_indices` holds all correct option indexes.
- `picture_options[].image_url` supports SVG, PNG, JPG, WEBP (URL or uploaded image).
- `option_feedback` is optional per-option feedback (inline markdown).
- `audio_url` plays after the correct-answer sound (optional).

---

### U) Vocab Cards (`type: "vocab_cards"`)
```json
{
  "type": "vocab_cards",
  "question": "Study the vocabulary cards.",
  "prompt_image_url": "https://example.com/images/market.png",
  "vocab_cards": [
    {
      "image_url": "https://example.com/images/vaso.png",
      "label": "**el vaso**",
      "audio_url": "https://example.com/audio/vaso.mp3"
    },
    {
      "image_url": "https://example.com/images/taza.png",
      "label": "**la taza**",
      "audio_url": "https://example.com/audio/taza.mp3"
    }
  ],
  "hint": "Tap the audio icon to hear each word."
}
```
Notes:
- Cards render in a grid; labels are bold by default.
- Use backticks to color specific segments in #475dd7 (e.g., `el` libro).
- `vocab_cards[].image_url` supports SVG, PNG, JPG, WEBP (URL or uploaded image).
- `vocab_cards[].audio_url` is optional and plays on click (no speed controls).
- Use this type for image-based vocabulary explanation; it is not graded.

---

### V) Error Spotting (`type: "error_spotting"`)
```json
{
  "type": "error_spotting",
  "question": "Find the incorrect words in the sentence.",
  "tokens": ["Yo", "eres", "estudiante", "."],
  "correct_indices": [1],
  "correction_sentence": "Yo **soy** estudiante.",
  "token_feedback": [
    "",
    "**eres** is for tu; use **soy** for yo.",
    "",
    ""
  ],
  "correct_feedback": "Correct. **soy** matches yo.",
  "incorrect_feedback": "Not quite. Check the verb form.",
  "hint": "Look for subject-verb agreement.",
  "audio_url": "https://example.com/audio/yo-soy-estudiante.mp3"
}
```
Notes:
- `tokens` is the sentence split into selectable parts (punctuation can be its own token or attached).
- `correct_indices` may include multiple incorrect tokens.
- `correction_sentence` is shown after submission.
- `token_feedback` is optional and only shown for selected tokens.
- `audio_url` plays after the correct answer sound (optional).

---

### W) Custom Block (`type: "custom_block"`)
```json
{
  "type": "custom_block",
  "question": "Explore the interactive example.",
  "custom_html": "<div class=\"sandbox\">...</div>",
  "custom_css": ".sandbox { ... }",
  "custom_js": "/* JS for the block */"
}
```
Notes:
- Admin-only: this block is authored in the admin editor.
- `custom_html`, `custom_css`, `custom_js` are rendered inside a sandbox container.
- Intended for bespoke interactions that don't fit other content types.

---

### W) Select All (`type: "select_all"`)
```json
{
  "type": "select_all",
  "question": "Select only the nouns that are `masculine`.",
  "options": [
    "el vaso",
    "la ventana",
    "el teléfono",
    "la taza",
    "el piano",
    "la palabra",
    "el dinero"
  ],
  "option_feedback": [
    "Correct. **el vaso** is masculine.",
    "**la ventana** is feminine.",
    "Correct. **el teléfono** is masculine.",
    "**la taza** is feminine.",
    "Correct. **el piano** is masculine.",
    "**la palabra** is feminine.",
    "Correct. **el dinero** is masculine."
  ],
  "correct_options": ["el vaso", "el teléfono", "el piano", "el dinero"],
  "hint": "Masculine nouns often end in -o.",
  "audio_url": "https://example.com/audio/masculine-examples.mp3"
}
```
Notes:
- Order does not matter; learners select all correct choices.
- `option_feedback` is optional per-option feedback (inline markdown).
- `audio_url` plays after the correct-answer sound when the selection is correct.

---

## 7) Enrollments (for student access)

### Enrollment JSON (in `enrollments.json`)
```json
{
  "user_id": "67388240-90a4-47ff-b5b2-aa4bc0827b66",
  "course_id": "spanish-basics",
  "enrolled_at": "2026-10-01T05:00:00Z"
}
```

The system uses this to:
- Show enrolled courses in "My Courses"
- Render "Remove course" vs "Enroll" buttons

---

## 8) Progress (for student tracking)

### Progress JSON (in `progress.json`)
```json
{
  "user_id": "67388240-90a4-47ff-b5b2-aa4bc0827b66",
  "course_id": "spanish-basics",
  "lesson_id": "sb-01",
  "completed": true,
  "total_xp": 10,
  "current_streak": 2,
  "last_activity_at": "2026-10-01T06:00:00Z"
}
```

Exact shape may expand over time, but this reflects current use.

---

## 9) Content Creation Tips for GPT

When generating lesson content:
- Keep prompts short, clear, and level-appropriate.
- For multiple choice, ensure distractors are plausible.
- For fill-in-the-blank and translation, describe the desired audio
  (voice, speed, emotion, exact phrase) but do NOT include an `audio_url`.
- For matching, describe the desired audio per pair (do NOT include URLs).
- Use units for large, structured courses (e.g., grammar programs).
- Maintain consistent `order` values (1..N) within each lesson.
 - If audio is needed, include an "Audio suggestion" note so a human can
   create and upload it later.

---

## 10) Quick Reference: Audio Fields

Post-correct audio (plays after correct sound):
- `multiple_choice.audio_url`
- `translation.audio_url`
- `fill_blank.audio_url`
- `word_order.audio_url`
- `reorder.audio_url`
- `conjugation_map.audio_url`
- `conjugation_drill.audio_url`
- `morphology_builder.audio_url`
- `select_all.audio_url`
- `picture_choice.audio_url`
- `picture_select_all.audio_url`
- `matching_pairs[].audio_url`
- `dictation_select.post_correct_audio_url`
- `dictation_focus.post_correct_audio_url`

Prompt audio:
- `dictation.audio_url`
- `dictation_select.audio_url`
- `dictation_focus.audio_url`
- `pronunciation_imitation.model_audio_url`
- `dialog_lines[].audio_url`
- `example_sentence.audio_url` (plays on manual toggle)
- `vocab_cards[].audio_url` (plays on manual toggle)

LLM instruction: never output actual audio URLs. Instead, include an
"Audio suggestion" describing what should be recorded (exact line, tone,
speed, accent, and any pauses).

---

End of document.
