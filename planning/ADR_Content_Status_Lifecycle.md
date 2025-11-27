# ADR: Content Status Lifecycle

Context
- We manage two domains of content: Articles and Exercises.
- Multiple exercise types exist (tf, mcq, fitb, dnd, dictation), with more planned.
- Status handling must be consistent across domains and UIs.

Decision
- Adopt a unified lifecycle with three statuses: draft, published, archived.
- Provide consistent editor controls, list-level quick updates, and API endpoints for status changes.

Statuses
- draft: Work in progress. Default on create. Visible in Admin only.
- published: Live and visible to end users. Sets published_at timestamp.
- archived: Soft-deleted. Hidden from public; visible to Admin for recovery or review.

Editor UX
- Add a status selector in editors (Articles and all Exercise builders) with options Draft/Published/Archived.
- Publish button sets status to published; Save respects the selected status.

Admin Lists
- Show a Status column with a dropdown per row for quick changes.
- Add top-level filters, including Archived.
- Standardize action icons: Edit, Preview, Delete.

APIs
- Exercises: PATCH /admin/api/exercises/:type/:slug/status { status }
  - Valid values: draft | published | archived
  - Clones current to next immutable version and updates status; returns { status, version }.
- Articles: PATCH /admin/articles/:slug/status { status }
  - Valid values: draft | published | archived
  - Updates status and timestamps; returns { status }.

Persistence
- Exercises
  - Versions: data/exercises/<type>/<slug>/<version>.json
  - Pointer: data/exercises/<type>/<slug>/current.json
  - Index: data/exercises/index.json (includes status, version, metadata)
- Articles
  - Single file: data/articles/<slug>/article.json (includes status and timestamps)

Public Visibility
- Only published items appear in public UIs.
- Draft and Archived are excluded from public routes and API responses unless explicitly requested in Admin.

Media & Summary Pattern (Players)
- Media toggle is visible only when media actually renders in the DOM.
- Toggle never appears on summary slides.
- Summary host container is always made visible even if the last item had no media.

Internationalization
- Provide labels for Draft/Published/Archived and Publish/Unpublish/Archive across ES/EN.

Rejected Options
- Complex multi-step (scheduled) lifecycles: deferred until scheduling is needed.

Consequences
- Consistent status handling across domains and future exercise types.
- Minimal surface for regressions: single PATCH per domain, standardized UI controls.

