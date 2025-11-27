# ProfePanda WebApp

Bilingual (EN/ES) web app for regional language learning. It includes a public-facing glossary explorer, article reader, and interactive exercises, plus full admin tooling to curate content, audio, and metadata.

## Features
- **Glossaries (public):** Country picker (and “All glossaries”), letter navigation, search, filters (POS, register, frequency, status, sensitivity, domain, tone), tooltipped flag pills, and icon-only chips for explicit/potentially offensive tags. Per-entry modals stay localized to the user’s language.
- **Glossary admin:** Sense-level editing (POS, register, frequency, status, sensitivity, domains, tone), variants for nouns/adjectives, audio upload for entries/examples, related terms, alt spellings, duplicate detection, JSON editor, and POS normalization to prevent regressions.
- **Articles:** Publish and browse bilingual articles with media; public reader honors language choice, while admin can manage content, tags, and media references.
- **Exercises:** FITB, MCQ, dictation, DnD, and TF builders (PPX components) with JSON editors, media support, and preview/test flows. Public side renders interactive practice experiences with the same design language.
- **Localization:** Interface, POS labels, filters, and system text are localized EN/ES; glossary metadata renders in the chosen language where available.

## Tech stack
- Flask backend with JSON storage (`data/`), per-country indexes for glossaries.
- Vanilla JS + custom PPX UI components; modular builders for exercises.
- Assets in `static/assets` (flags, icons, animations, media placeholders).

## Notes
- Secrets/config belong in `.env` (untracked) and instance-specific files under `instance/`.
- `.gitignore` excludes build artifacts, caches, venvs, and temp/media you don’t want in git.
- Large/user-uploaded media should be stored outside the repo and referenced by URL.
