# ProfePanda WebApp Plan (Clean)

## 0) Purpose & Principles
- Small, single-purpose modules; clear domain boundaries; shared exercise runtime.
- Versioned, sanitized content; reusable widgets; RBAC; predictable storage.

## 1) Articles (Condensed)
- Must-haves: rich text, embeds (allowlist), widgets (PPX insert, example sentence), color palette memory, multilingual, versioning, markdown mode (round-trip), RBAC.
- Data: per-article folder + `article.json`; versioning for edits; summary + lead image; `taxonomy_paths: [string]`.
- Admin: new/edit forms with summary, image, taxonomy picker; version restore (planned); sanitizer/allowlist (planned).
- Public: list, view, language switcher; SEO meta + sitemaps (planned); accessibility checks (planned).
- Acceptance: create/edit/publish, taxonomy stored, public renders per lang, basic list/search hooks (planned).

## 2) PPX Exercises (Condensed)
- Types: TF, MCQ (initial). Next up: Drag & Drop (dnd, single‑slide), Dictation (audio speed + accent buttons), Click The Words (ctw), and Fill in the Blank (fib).
- Store: versioned JSON per exercise; `index.json`; publish/restore; validation; status lifecycle.
- API: CRUD + publish/restore (`/admin/api/exercises/...`).
- Admin: TF/MCQ builders (partial), library list, preview.
- Runtime: PPX modal + frame, core JS + CSS present.
- UI & Builder contracts: TF is the canonical reference for both runtime UI and admin builder. New types implement standardized PPX plugin APIs (runtime and builder) and reuse shared tokens, events, and shell.
 - Neutral main text: for non-TF types, the primary prompt/content is a single neutral field (same across languages). Hints, feedback, navigation, and shell strings remain bilingual.
- Blueprints: see planning/dnd.txt, planning/dictation.txt, planning/ctw.txt.
 - New type icons (admin dashboard): `static/assets/icons/dnd.svg`, `dictation.svg`, `ctw.svg`, `fib.svg`.
- Naming: `ppx-<type>.js`, `admin_builder_<type>.js`, shared `ppx-core.js`, `ppx-modal.js`, `ppx-frame.js`, `ppx-exercise-ui.css`, `ppx.css`.
- A11y/i18n: keyboard-first, ARIA roles/labels, focus management; strings via `i18n`; live language swap supported.
- Acceptance: create/edit/publish TF & MCQ; modal loads and scores; admin preview == runtime; adding new type requires only plugin + builder + schema; taxonomy_paths planned.

## 3) Taxonomy & Content Library (Integrated)
- Purpose: shared grammar taxonomy for articles and exercises.
- Data: `data/ui/taxonomy/grammar.json` with `path`, `title` {es,en}, `children[]`; helpers build indices.
- Admin: picker implemented for articles; extend to exercises; future taxonomy manager for editing nodes.
- Public: browse page implemented; list filters by `?topic` planned.
- APIs: GET `/taxonomy/grammar`, `/taxonomy/grammar/<path>`, `/taxonomy/grammar/browse` implemented.
- Acceptance: article/exercise payloads carry `taxonomy_paths`; filters show breadcrumb and localized titles.

## 4) Glossary (MVP Stub)
- Data model + editor + public hover/search planned; not yet implemented.

## 5) Unified Implementation
- Repo layout: small modules per domain; blueprints registered in `app/__init__.py`.
- RBAC: roles author/editor/super; migration scaffold present; enforcement to extend across endpoints.
- Migrations: admin_users + admin_permissions created; extend as features land.
- Endpoints: JSON-first for admin APIs; public HTML with progressive enhancement.
- Frontend: tiny JS files; no inline CSS/JS; shared tokens & components.
- Storage: `data/<domain>/<slug>/`; media under each item; orphans cleanup (planned).
- Telemetry: basic healthz; analytics/telemetry planned.

## 6) MVP Checklist
- Articles: public pages (Done); admin editor core (Partial); version diff/restore (Planned); sanitizer/SEO (Planned).
- Exercises: store + API (Done); TF builder (Partial); MCQ builder (Partial); runtime modal (Done); taxonomy_paths (Planned).
- Taxonomy: helpers + browse + API (Done); article picker (Done); exercise picker (Planned); public filters (Planned).
- Glossary: data + editor + public (Planned).
- System: RBAC schema (Done); enforcement (Partial); storage/media (Partial); telemetry (Planned).
