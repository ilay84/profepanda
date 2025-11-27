# Interactive Lessons MVP — Full Plan

## Goals
- Mobile‑first, distraction‑free lesson player (Babbel/SpanishDict‑style).
- Reusable exercise elements: MCQ, True/False, Tap‑word, Drag‑blank, Dictation, Flashcards.
- Admin builder with drag/drop, live preview, draft → review → publish.
- Progress tracking, scoring (80% pass), badges, daily streaks.
- Clean visuals, minimal UI, brand‑aligned, PPX‑independent.

## UX & Visual
- Layout: single column; sticky top progress bar; sticky bottom controls (Prev, Check/Next).
- Buttons/icons: uniform, rounded, 44px min touch targets; SVG icon set loaded once.
- Animations: subtle CSS transitions; completion modal with lightweight animation (Lottie/MP4 later).
- Audio controls: compact player with play/pause, replay 5s, speed 0.3–1.0×; preservesPitch when supported.
- Help: per‑element bilingual tooltip; per‑lesson Help modal with basics (nav, scoring, streaks, dictation rules).

## Content & i18n Model
- Target‑language navigation + iconography; authors may mix ES/EN in content.
- Tooltips: optional `tooltip` per element `{ "en": "…", "es": "…" }`.
- Lessons are per‑locale for MVP; schema leaves room to add multi‑locale later.

## Data Model (new tables)
- `units(id, slug, title, locale, taxonomy_json, created_by, created_at, updated_at)`
- `lessons(id, unit_id, slug, title, locale, status[draft|in_review|published], version, json, communicative_goal, created_by, updated_at, published_at)`
- `user_progress(user_id, lesson_id, current_slide, score, accuracy, completed, completed_at, updated_at)`
- `user_attempts(id, user_id, lesson_id, slide_id, payload_json, correct, score_delta, created_at)`
- `media_assets(id, storage, external_id, type, meta_json, created_at)`
- `badges(id, slug, name, icon_url, criteria_json)`; `user_badges(user_id, badge_id, awarded_at)`
- `lesson_events(id, user_id, lesson_id, type, meta_json, created_at)`
- Indices: `(unit_id, status, locale)`, unique `(user_id, lesson_id)` on progress, `(user_id, lesson_id, slide_id)` on attempts.

## Lesson JSON (schema sketch)
```
{
  "version": 1,
  "locale": "es",
  "unit_id": "spanish-verb-present",
  "slug": "presente-regulares",
  "title": "Presente: Regulares",
  "taxonomy": ["grammar/present/regular"],
  "communicative_goal": "ordering_food",
  "help": {"es": "Cómo usar esta lección…", "en": "How to use this lesson…"},
  "settings": {"progress_gate": true, "pass_threshold": 0.8},
  "slides": [
    {"id":"s1","type":"content","elements":[
      {"type":"text","html":"Escucha y elige…","tooltip":{"en":"Listen…"}},
      {"type":"audio","src":"media:gdrive:FILE_ID","caption":"Ejemplo"}
    ]},
    {"id":"s2","type":"exercise","mode":"mcq","prompt":"Selecciona…",
     "choices":[{"id":"a","text":"hablo"},{"id":"b","text":"habla"}],
     "answer":"a","feedback":{"correct":"¡Bien!","incorrect":"Revisa…"}
    },
    {"id":"s3","type":"exercise","mode":"dictation","audio":"media:gdrive:FILE2",
     "answer":"Hola, ¿cómo estás?","grading":{"accents": "required", "punctuation": "advisory"}
    }
  ]
}
```

## Exercise Types & Grading
- MCQ / True‑False: single‑select; 1pt default; first‑try correctness.
- Tap‑word: select target words from a pool; exact match set.
- Drag‑blank: draggable tokens to blanks; order‑sensitive when configured.
- Dictation: case‑insensitive, accent‑required; punctuation ignored for score but surfaced via tips callout.
- Flashcards: ungraded by default; can be marked as reviewed.
- Per slide: state machine idle → answered → feedback → resolved; forward nav gated until resolved.

## Scoring, Progress, Streaks, Badges
- Pass threshold: 80% accuracy; encourage retry to reach 100%.
- Progress saved on submit and slide change; resume where left off.
- Daily streaks: increments on ≥80% lesson completion per calendar day; fields stored: `current_streak`, `best_streak`, `last_completion_date`.
- Badges MVP: First Lesson, Perfect Lesson, Category Explorer (5 in category), 7‑day Streak.

## Media Handling (Audio‑first MVP)
- Accept `media:gdrive:<fileId>` resolved to `https://drive.google.com/uc?export=download&id=<fileId>`.
- Local media via existing storage serves as fallback.
- Video deferred; schema keeps `video` element for future.
- SFX preloaded: `correct.mp3`, `incorrect.mp3`, `complete.mp3`.

## Player Architecture (PPX‑independent)
- Template: `templates/lessons/player.html`
- CSS: `static/css/lesson_player.css` (build on `static/css/tokens.css`)
- JS modules: `static/js/lesson_player/`
  - `loader.js` (fetch/prepare lesson JSON)
  - `renderer.js` (slides → DOM, a11y & focus)
  - `controls.js` (nav, progress, swipe/keys)
  - `state.js` (local state + server sync)
  - `media.js` (resolver, preload)
  - `audio_player.js` (UI + speed control)
  - `exercises/` (mcq.js, tf.js, tapword.js, dragblank.js, dictation.js, flashcard.js)
  - `feedback.js` (callouts, correctness, SFX)
  - `telemetry.js` (events emit)

## Admin Builder
- Pages: `templates/admin/lessons_index.html`, `templates/admin/lessons_edit.html`
- JS: `static/js/admin_lessons_builder/`
  - `schema.js` (types/defaults/validation)
  - `canvas.js` (live preview using player renderer)
  - `palette.js` (drag elements)
  - `inspector.js` (edit properties)
  - `timeline.js` (slides add/dup/reorder)
  - `media_picker.js` (paste GDrive URL → normalize)
  - `publish.js` (draft → in_review → published)
- WYSIWYG: reuse Quill with minimal toolbar (bold, italic, brand color, H1).

## Workflow & Roles
- Statuses: `draft → in_review → published`.
- Publisher may move `draft → in_review` and then publish; reviewer step encouraged but not hard‑blocked.
- Roles from accounts/authz reused for Author/Reviewer/Publisher/Admin.

## APIs & Routes (summary)
- Public
  - `GET /lessons/<slug>` → player page
  - `GET /api/lessons/<id-or-slug>` → published lesson JSON
  - `POST /api/lessons/<id>/attempt` → {slide_id, result, correct, score_delta}
  - `POST /api/lessons/<id>/progress` → {current_slide, completed}
- Admin
  - `GET/POST /admin/lessons` (list/create)
  - `GET/PUT /admin/lessons/<id>` (edit)
  - `POST /admin/lessons/<id>/submit_review`
  - `POST /admin/lessons/<id>/publish`
  - `POST /admin/media/resolve` (normalize/validate drive links)

## Taxonomy & Goals
- Keep `data/ui/taxonomy/grammar.json` tags.
- Add optional `communicative_goal` (enum suggested; initial set in checklist).
- Admin UI: reuse taxonomy picker + goal picker.

## Accessibility & Performance
- ARIA roles, focus management on slide change, keyboard support, visible focus states.
- High‑contrast theme via tokens.
- Lazy load media; preload next slide lightweight assets; split JS by exercise type.

## Security
- Sanitize WYSIWYG HTML server‑side (allow‑list of tags/attrs).
- CSRF on admin APIs; rate limit public attempts; allow‑list media domains.
- Validate GDrive links (HEAD + content‑type/size); optional backend proxy fallback for audio.

## Analytics (Internal MVP)
- Events: `lesson_loaded`, `slide_viewed`, `answer_submitted`, `answer_correct`, `media_play`, `lesson_completed`.
- Admin dashboard: completion rate, avg score, drop‑off slide, duration.
- Export CSV later; GA integration later.

## Open Decisions (to confirm)
- Streak timezone: user local vs site default vs UTC (recommend site default timezone for consistency).
- Login required for cross‑device progress/streaks? (recommend yes; anonymous stored locally only.)
- Dictation tips display: inline highlights + tips panel vs tips panel only (recommend both).
- Audio formats: standardize on MP3; allow M4A/OGG fallbacks.
- Proxy audio fallback if Drive throttles/CORS issues (recommend allow backend proxy for audio only).
- Default help modal copy + per‑lesson override.
- `communicative_goal` enum initial set.
- Character/word limits for content blocks to keep slides concise.
- Badge asset format: SVG preferred; sizes (128/256px).
- URL shape: `/lessons/<unit-slug>/<lesson-slug>`.

## Timeline (5‑week MVP)
- W1: DB/migrations, schema, minimal player (content+MCQ), media resolver.
- W2: T/F, tap‑word, gating, scoring, audio component, save/resume.
- W3: Dictation (accents required), drag‑blank, flashcards, SFX, completion modal.
- W4: Admin builder (timeline, palette, inspector, Quill), autosave, review/publish flow.
- W5: Taxonomy+goals, analytics events+basic dashboard, badges, QA/a11y pass.

## Acceptance Criteria
- Smooth mobile play, forward nav gated, resume works.
- 80% pass threshold; perfection recognized; badges awarded.
- Dictation enforces accents; punctuation tips visible; audio speed works.
- Drive audio loads reliably; local fallback option.
- Admin can create → review → publish; live preview matches player.

