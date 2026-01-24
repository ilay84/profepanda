# ProfePanda WebApp

Bilingual (EN/ES) web app for regional language learning. It includes a public-facing glossary explorer and a new courses experience with units, lessons, progress, XP, and admin tooling to curate content, audio, and metadata.

## Features
- **Glossaries (public):** Country picker (and “All glossaries”), letter navigation, search, filters (POS, register, frequency, status, sensitivity, domain, tone), tooltipped flag pills, and icon-only chips for explicit/potentially offensive tags. Per-entry modals stay localized to the user’s language.
- **Glossary admin:** Sense-level editing (POS, register, frequency, status, sensitivity, domains, tone), variants for nouns/adjectives, audio upload for entries/examples, related terms, alt spellings, duplicate detection, JSON editor, and POS normalization to prevent regressions.
- **Courses (public):** A courses home that links into a dedicated course detail view. Courses are organized by units and lessons, with progress tracking, XP totals, and time spent. Lessons display status, XP rewards, and actions (start/review).
- **Courses (admin):** Inline editing for course card copy and imagery on the home page (EN/ES), plus admin tools to manage courses, units, lessons, and XP rewards.
- **Localization:** Interface, POS labels, filters, and system text are localized EN/ES; glossary metadata renders in the chosen language where available.

## Tech stack
- Flask backend with JSON storage (`data/`), per-country indexes for glossaries.
- Vanilla JS + custom PPX UI components; modular builders for exercises.
- Assets in `static/assets` (flags, icons, animations, media placeholders).

## Quickstart
1) Create a virtual environment and install backend deps.
2) Run the Flask app.
3) Open the app at `http://127.0.0.1:5000/`.

## Lessons App Build
The lessons app uses a separate build step when overrides change.

- Run `.\scripts\build_lessons_app_bundle.ps1` after editing files in `scripts/lessons_app_overrides/`.
- The build outputs to `static/lessons_app/`.

## Admin Editing
- Inline editing supports EN/ES copy on the home page (course card copy and images).
- SVG images are supported for card uploads.

## Data Model (High Level)
- Courses have units and lessons.
- Lessons include progress state and XP reward data.
- Glossaries are indexed per country with localized labels.

## Notes
- Secrets/config belong in `.env` (untracked) and instance-specific files under `instance/`.
- `.gitignore` excludes build artifacts, caches, venvs, and temp/media you don’t want in git.
- Large/user-uploaded media should be stored outside the repo and referenced by URL.
