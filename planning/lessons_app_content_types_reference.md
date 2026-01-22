# Lessons App Content Types Reference (ProfePanda WebApp)

Purpose
- This document lists the exact files, data shapes, and wiring used for each content type in the Lessons App integration.
- Use it when asking ChatGPT for help (share this doc + the requested files).

Project structure (relevant folders)
- API + data store: `domains/lessons_app/api.py`, `data/lessons_app/*.json`
- Lessons App source (built during bundle): `.lessons_app_build/src/...`
- Overrides (authoritative for edits): `scripts/lessons_app_overrides/...`
- Bundle output: `static/lessons_app/`
- Build pipeline: `scripts/build_lessons_app_bundle.ps1`, `scripts/patch_lessons_app_source.py`

Content type registry (runtime)
- Lesson player mapping: `scripts/lessons_app_overrides/pages/LessonPlayer.jsx`
- Exercise normalization (fields + defaults): `scripts/lessons_app_overrides/entities/Exercise.js`
- Admin content editor: `scripts/lessons_app_overrides/AdminContent.jsx`

Image/audio uploads
- Upload helpers live in the admin content editor and save files under static assets.
- Any field named `*_image_url` or `image_url` can be set via URL or uploader.
- Audio fields accept URLs or uploads via the admin uploader.

---

## Content types (current)

Each type below includes the type string, component, and core fields. Use the schema in
`planning/lessons_app_content_reference.md` for full JSON examples and notes.

1) Explanation
- Type string: `explanation`
- Component: `scripts/lessons_app_overrides/Explanation.jsx`
- Core fields: `explanation_content`, `question` (optional)

2) Example Sentence
- Type string: `example_sentence`
- Component: `scripts/lessons_app_overrides/ExampleSentenceSlide.jsx`
- Core fields: `sentence_text`, `sentence_translation`, `question` (optional), `audio_url` (toggle)

3) Multiple Choice
- Type string: `multiple_choice`
- Component: `scripts/lessons_app_overrides/components/content/MultipleChoice.jsx`
- Core fields: `question`, `options`, `correct_answer`, `option_feedback` (optional), `hint`, `audio_url`

4) Fill in the Blank
- Type string: `fill_blank`
- Component: `scripts/lessons_app_overrides/FillBlank.jsx`
- Core fields: `question` (uses `{1}` or `___`), `correct_answer`, `correct_feedback`, `incorrect_feedback`, `hint`, `audio_url`

5) Fill Blanks (Select)
- Type string: `fill_blanks_select`
- Component: `scripts/lessons_app_overrides/components/content/FillBlanksSelect.jsx`
- Core fields: `fill_blanks_sentence`, `fill_blanks_answers`, `fill_blanks_decoys`, `fill_blanks_feedback`, `fill_blanks_decoy_feedback`, `question`, `hint`, `audio_url`

6) Translation
- Type string: `translation`
- Component: `scripts/lessons_app_overrides/Translation.jsx`
- Core fields: `question`, `correct_answer`, `correct_feedback`, `incorrect_feedback`, `hint`, `audio_url`

7) Matching
- Type string: `matching`
- Component: `scripts/lessons_app_overrides/components/content/Matching.jsx`
- Core fields: `matching_pairs[]`, `hint`, `audio_url` (per pair)

8) Word Order
- Type string: `word_order`
- Component: `scripts/lessons_app_overrides/WordOrder.jsx`
- Core fields: `word_order_words`, `word_order_decoys`, `question`, `correct_feedback`, `incorrect_feedback`, `hint`, `audio_url`

9) Reorder
- Type string: `reorder`
- Component: `scripts/lessons_app_overrides/components/content/Reorder.jsx`
- Core fields: `items` (entered in correct order), `question`, `correct_feedback`, `incorrect_feedback`, `hint`, `audio_url`

10) Dictation
- Type string: `dictation`
- Component: `scripts/lessons_app_overrides/Dictation.jsx`
- Core fields: `question`, `audio_url` (prompt), `correct_answer`, `correct_feedback`, `incorrect_feedback`, `hint`

11) Dictation (Select)
- Type string: `dictation_select`
- Component: `scripts/lessons_app_overrides/components/content/DictationSelect.jsx`
- Core fields: `audio_url` (prompt), `options`, `correct_answer`, `option_feedback` (optional), `post_correct_audio_url` (optional), `question`, `hint`

12) Dictation (Focus)
- Type string: `dictation_focus`
- Component: `scripts/lessons_app_overrides/components/content/DictationFocus.jsx`
- Core fields: `focus_sentence`, `focus_answers`, `focus_options` (optional), `audio_url` (prompt), `post_correct_audio_url` (optional), `question`, `hint`

13) Select All
- Type string: `select_all`
- Component: `scripts/lessons_app_overrides/components/content/SelectAll.jsx`
- Core fields: `options`, `correct_options`, `option_feedback` (optional), `question`, `hint`, `audio_url`

14) Conjugation Map
- Type string: `conjugation_map`
- Component: `scripts/lessons_app_overrides/components/content/ConjugationMap.jsx`
- Core fields: `pool_forms`, `groups[]`, `intro_markdown`, `completion_message_markdown`, `question`, `hint`, `audio_url`

15) Conjugation Drill
- Type string: `conjugation_drill`
- Component: `scripts/lessons_app_overrides/components/content/ConjugationDrill.jsx`
- Core fields: `question`, `correct_answer`, `stem`, `ending`, `correct_feedback`, `incorrect_feedback`, `hint`, `audio_url`

16) Morphology Builder
- Type string: `morphology_builder`
- Component: `scripts/lessons_app_overrides/components/content/MorphologyBuilder.jsx`
- Core fields: `morpheme_pool[]`, `correct_sequence[]`, `show_hyphenation`, `question`, `correct_feedback`, `incorrect_feedback`, `hint`, `audio_url`
- Morphemes use `type` in `prefix|root|suffix|other` and optional `label` when `type` is `other`.

17) Picture Choice
- Type string: `picture_choice`
- Component: `scripts/lessons_app_overrides/components/content/PictureChoice.jsx`
- Core fields: `picture_options[]`, `correct_index`, `option_feedback` (optional), `question`, `hint`, `audio_url`

18) Picture Choice (Multi)
- Type string: `picture_select_all`
- Component: `scripts/lessons_app_overrides/components/content/PictureSelectAll.jsx`
- Core fields: `picture_options[]`, `correct_indices[]`, `option_feedback` (optional), `question`, `hint`, `audio_url`

19) Vocab Cards
- Type string: `vocab_cards`
- Component: `scripts/lessons_app_overrides/components/content/VocabCards.jsx`
- Core fields: `vocab_cards[]` (each with `image_url`, `label`, `audio_url` optional), `question`, `hint`, `prompt_image_url` (optional)

20) Error Spotting
- Type string: `error_spotting`
- Component: `scripts/lessons_app_overrides/components/content/ErrorSpotting.jsx`
- Core fields: `tokens[]`, `correct_indices[]`, `correction_sentence`, `token_feedback[]` (optional), `question`, `correct_feedback`, `incorrect_feedback`, `hint`, `audio_url`

21) Dialogue
- Type string: `dialogue`
- Component: `scripts/lessons_app_overrides/Dialogue.jsx`
- Core fields: `dialog_speakers[]`, `dialog_lines[]`, `question`

22) Pronunciation Imitation
- Type string: `pronunciation_imitation`
- Component: `scripts/lessons_app_overrides/components/content/PronunciationImitation.jsx`
- Core fields: `model_text`, `model_audio_url`, `question`, `hint`, `prompt_image_url` (optional)

23) Content Embed
- Type string: `content_embed`
- Component: `scripts/lessons_app_overrides/components/content/ContentEmbed.jsx`
- Core fields: `embed_url` or `embed_html`, `embed_title` (optional), `embed_aspect_ratio` (optional), `question`

24) Custom Block (admin-only)
- Type string: `custom_block`
- Component: `scripts/lessons_app_overrides/components/content/CustomBlock.jsx`
- Core fields: `custom_html`, `custom_css`, `custom_js`, `question` (optional)

---

## Admin editor (content CRUD)

- UI + form schema (authoritative): `scripts/lessons_app_overrides/AdminContent.jsx`
  - Build target: `.lessons_app_build/src/pages/admin/AdminContent.jsx`
  - Includes:
    - Content cards + drag handles
    - Form editor with content-type switcher
    - JSON editor toggle
    - Field helpers for each type
    - Uploaders for audio and image URLs

- Exercise services: `scripts/lessons_app_overrides/services/exercises.js`
  - REST endpoints:
    - `GET /api/lessons/<lesson_id>/exercises`
    - `POST /api/exercises`
    - `PUT /api/exercises/<exercise_id>`
    - `DELETE /api/exercises/<exercise_id>`

---

## Backend (Python)

- Data files:
  - `data/lessons_app/courses.json`
  - `data/lessons_app/lessons.json`
  - `data/lessons_app/exercises.json`
  - `data/lessons_app/units.json`
  - `data/lessons_app/progress.json`

- API endpoints: `domains/lessons_app/api.py`
  - Exercises are stored as dicts in `exercises.json`. Reordering updates the `order` field.
  - `api_lesson_exercises` sorts by `(order, id)`.

---

## Build + patch flow

- `scripts/build_lessons_app_bundle.ps1`
  - Copies Lessons App into `.lessons_app_build`
  - Applies patches from `scripts/patch_lessons_app_source.py`
  - Runs Vite build and copies `dist/` to `static/lessons_app/`

- `scripts/patch_lessons_app_source.py`
  - Replaces source files in `.lessons_app_build` using overrides in `scripts/lessons_app_overrides/`

---

## Exact files to share with ChatGPT for content-type help

- `scripts/lessons_app_overrides/AdminContent.jsx`
- `scripts/lessons_app_overrides/pages/LessonPlayer.jsx`
- `scripts/lessons_app_overrides/entities/Exercise.js`
- `scripts/lessons_app_overrides/services/exercises.js`
- `domains/lessons_app/api.py`
- (If styling questions) `static/css/courses.css`
