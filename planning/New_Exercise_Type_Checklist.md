# New Exercise Type Checklist

Use this checklist when introducing a new exercise player and editor.

Schema
- Fields: type, slug, version, title_es/title_en, instructions_es/instructions_en, level, taxonomy_paths, status, items[]
- Items: include stable id, order, and any type-specific fields
- Media: normalize to media[] entries: { id, kind: image|audio|video, src, thumb?, alt_es?, alt_en?, transcript_es?, transcript_en? }
- For FIB-like exercises with multiple blanks, prefer a dedicated `blanks[]` section on each item with per-blank metadata (options, localized hints/feedback).

Editor (Builder)
- Status selector (Draft/Published/Archived); Save respects selection
- Publish button sets status to published
- Taxonomy picker integrated; taxonomy_paths persisted as JSON array
- Media upload routes wired (if applicable)

Admin List
- Row actions: Edit, Preview, Delete (standard icons)
- Status column: dropdown Draft/Published/Archived with PATCH endpoint
- Filters include Type, Status (incl. Archived), Level, Search (title/slug/topics)

API
- GET /admin/api/exercises/:type/:slug?version=current
- POST /admin/api/exercises (create)
- PUT /admin/api/exercises/:type/:slug (save next version)
- PATCH /admin/api/exercises/:type/:slug/status { status }
- POST /admin/api/exercises/:type/:slug/publish (optional convenience)

Player (Runtime)
- Summary:
  - Implement a clear summary slide when idx === items.length
  - Always force-show the summary host container (even if previous slide had no media)
  - Never show the media toggle on summary
- Media toggle:
  - Only visible if media actually rendered in DOM (ppx-media-grid, img/audio/video nodes)
  - Hide media container on slides without media; do not hide on summary
  - Toggle updates aria-expanded, title, tooltip, and icon
- Accessibility:
  - Numbered inputs should be labeled (e.g., Hueco 1 / Blank 1) with hint buttons having appropriate aria-labels.
  - Live regions for inline feedback
  - Keyboard navigation for next/prev and selection

QA Matrix
- Last slide has media vs no media → summary is visible
- Media toggle never appears on summary; appears only when media renders
- Status changes from editor and list persist and reflect in UI
- Retry flows reset state cleanly (answers, summary flags, caches)

Notes
- Reuse shared helpers (icons, i18n labels, DOM media checks) from core utilities
