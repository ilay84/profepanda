# **ProfePanda WebApp Plan**

# **0) Purpose & Principles**

* **Goal:** Rebuild ProfePanda with small, single-purpose modules and clear domain boundaries; shared UI/runtime for exercises.
* **Principles:** Single Responsibility • Explicit versioning • Sanitized rich text • Reusable widgets • RBAC • Zero inline CSS/JS • Predictable slugs & storage • Admin UX parity across domains.
* **Unified Lifecycle:** All content types (Articles, Exercises, Glossary) share the same lifecycle: **create → draft → in_review → publish → archive**. All use the same versioning rules, permissions model, and audit trails.

---

# **1) ARTICLES — Full Spec**

## **1.1 Must-haves (your list, consolidated)**

* **Rich Text**: headings (H1–H4), bold, italics, strikethrough, quotes, lists, links.
* **Embeds**: allow-listed providers (YouTube, Canva, H5P; extendable).
* **Custom Widgets**:
  * **Exercise insert** (opens PPX modal for a chosen exercise).
  * **Example Sentence widget**: audio upload + modern play icon; **bold** target-language line; **italic** translation line.
* **Text Color**: color picker with **custom palette memory** (see 1.6).
* **Multilingual**: “**Write in another language…**” (clone flow). Language name is entered **in that language** (English, español, etc.). All language versions attach to a **mother article**.
* **Public switching**: globe icon + **language dropdown** on top.
* **Auto-slugs**: admin never types slugs; clean, consistent structure.
* **Version history**: list, view, diff, and **restore** directly in the editor.
* **Markdown mode**: **Left pane = MD**, **Right pane = live preview**; safe round-trip.
* **RBAC**: admin users with **granular permissions** (e.g., create, edit, publish, restore, translate); applies across Articles / Exercises / Glossary.

## **1.2 Additional recommendations**

* **Autosave** (every 10s + on blur) and “unsaved changes” guard.
* **Status lifecycle**: `draft` → `in_review` → `published` → `archived` (+ scheduled publish).
* **Public-skin preview** (no admin chrome), per language.
* **Sanitizer**: strict allowlist; transforms iframes into safe components.
* **Media mgmt**: per-article upload bucket; prune orphans on version prune.
* **SEO/i18n**: per-lang meta title/description, og:image, canonical + hreflang.
* **Internal linking**: quick picker for Articles/Exercises/Glossary.
* **Audit trail**: who/when + optional “What changed?” note per version.
* **Accessibility**: heading order checks, alt-text prompts, language attributes.
* **Search hooks**: update index on publish/unpublish/restore.

## **1.3 Data model (minimal & normalized)**

**articles** (the mother/group)
* `id (uuid)`, `created_at`, `updated_at`
* `slug` (canonical base slug, not localized)
* `default_lang` (`es`, `en`, …)
* `status` (`active` | `archived`)

**article_versions**
* `id`, `article_id (fk)`, `lang`
* `title`
* `content_html` (sanitized render)
* `content_md` (optional MD source for round-trip)
* `widgets_json` (Example Sentences, Exercise refs, etc.)
* `embeds_json` (normalized provider + id + meta)
* `meta_title`, `meta_description`, `og_image_url`
* `status` (`draft` | `in_review` | `published` | `archived`)
* `version_num` (monotonic per `article_id` + `lang`)
* `published_at`, `author_id`, `editor_id`, `change_note`
* `render_mode` (`visual` | `markdown`) ← authoritative source for round-trip

**article_lang_map**
* `article_id`, `lang`, `version_id` (current published), `slug_lang` (localized slug)

**admin_users** / **admin_permissions**
* Users + resource/action permissions (create, edit, publish, restore, translate, delete).

**Notes**
* When both `content_md` and `content_html` exist, **`render_mode` decides** which is authoritative. If `render_mode=markdown`, `content_md` is source-of-truth and HTML is regenerated.

## **1.4 Slugs & URLs**

* On first create: `articles.slug = slugify(title)` (dedupe with `-2`, `-3`).
* Per-language URL: `/{lang}/articles/{slug_lang}` where `slug_lang = slugify(localized title)`.
* `hreflang` points across languages; canonical = current language page.
* **Default-language shortcut:** If default language is English, omit `/en/` in canonical URLs (e.g., `/articles/{slug}`), while `/es/articles/{slug}` and others remain as alternates.

## **1.5 Services (business logic)**

* `create_article(default_lang, title, content_src, meta)` → `(article_id, version_id)`
* `clone_language(article_id, from_lang, to_lang, new_title, to_lang_label)` → new draft
* `save_version(article_id, lang, content_src, widgets, embeds, meta, change_note)` → bump version
* `publish_version(article_id, lang, version_id, scheduled_at=None)`
* `restore_version(article_id, lang, version_id)` → new draft from snapshot
* `list_versions(article_id, lang)` → metadata list
* `sanitize_and_render(md | delta | html)` → `(content_html, embeds_json)`
* `resolve_widgets(content_html)` → `widgets_json` (tokens → structured)
* `search(query, lang, status)` → delegated search service
* `can(user, resource, action)` → RBAC utility
* `get_public_url(article_id, lang)` → computes canonical URL for the language ← **added**

**Audit requirement:** All write services call `audit.log(actor, resource, action, metadata)`.

## **1.6 Color palette memory (editor requirement)**

* **Feature**: color picker with **“Brand Palette”** (predefined tokens) + **“My Colors”** (persisted custom swatches).
* **Where to store**:
  * **Per user**: `admin_users.preferences.colors[]`.
  * **Per site (brand)**: `settings.brand_colors[]` (super admin).
* **Usage**: toolbar reads both lists; sanitize color to CSS class tokens when possible (e.g., `pfx-color-1`) to avoid inline styles; fall back to inline for custom colors (whitelisted).

## **1.7 Embeds & Widgets**

* **Embeds**: paste → normalized `<pf-embed provider="youtube" id="..."></pf-embed>` at render.
* **Widgets (content tokens)**:
  * `{{ ppx:exercise slug="ser-estar-v1" lang="es" }}`
  * `{{ ex-sentence audio="..." tl="…" en="…" }}`
  * `{{ gloss:romperla }}`
* Renderer extracts tokens → writes `widgets_json` → renders partials server-side.
* **Token parsing rule:** Tokens must be separated from adjacent text by a space or line break for recognition.

## **1.8 Markdown mode**

* Left: Markdown editor; Right: preview (same sanitizer as visual editor).
* **Round-trip rule**: if editing in MD, treat `content_md` as source; generate `content_html` on save/preview. Switching back to Visual re-hydrates from current HTML (or re-parses MD if set).
* **Performance:** Markdown preview renders in a worker thread to avoid UI jank on large articles.

## **1.9 Admin UI (screens)**

* **Index**: filters (status, language, author); search by title.
* **Editor**: tabs **Visual | Markdown**; toolbar (H1/H2, B/I/S, quote, list, link, color picker, embeds, widgets); right side panel for **Versions**, **SEO**, **Schedule**.
* **Language**: globe dropdown (switch) + button **“Write in another language…”** (clone flow).
* **Version history**: list → preview → diff → restore (creates new draft and auto-adds `change_note: "Restored from vX"`).
* **Permissions**: super admin manages users/roles; editors can publish if granted.

## **1.10 Storage (dev vs prod)**

* Dev: `/uploads/articles/{article_id}/media` and `/embeds`.
* Prod: S3 (same logical paths) via a storage adapter.

## **1.11 SEO & Search**

* Generate/update sitemaps per language on publish.
* Add canonical + hreflang; push to search index on publish/restore.

## **1.12 Acceptance (MVP)**

* Create, autosave, preview, publish (one language).
* Clone to new language; switch languages publicly.
* Example Sentence widget (audio + bold TL + italic translation).
* Exercise token opens shared PPX modal.
* Version history → preview/diff → restore to new draft.
* Color picker with brand palette + user “My Colors.”

## **1.13 API Endpoints (JSON)**

| Endpoint | Method | Purpose | Auth |
| ----- | ----- | ----- | ----- |
| `/admin/api/articles` | `POST` | Create a new article (mother record + first draft version). | `articles:create` |
| `/admin/api/articles/{article_id}/versions` | `POST` | Save draft (new version number). | `articles:edit` |
| `/admin/api/articles/{article_id}/versions` | `GET` | List versions (metadata) filtered by `lang`. | `articles:edit` |
| `/admin/api/articles/{article_id}/versions/{version_id}` | `GET` | Get full version payload. | `articles:edit` |
| `/admin/api/articles/{article_id}/versions/{version_id}/publish` | `POST` | Publish (or schedule with `scheduled_at`). | `articles:publish` |
| `/admin/api/articles/{article_id}/versions/{version_id}/restore` | `POST` | Restore old version → creates new draft. | `articles:restore` |
| `/admin/api/articles/{article_id}/clone-language` | `POST` | Clone to new language (`to_lang`, `new_title`, `to_lang_label`). | `articles:translate` |
| `/admin/api/uploads/articles/{article_id}/media` | `POST` | Upload media (images/audio) to per-article bucket. | `articles:edit` |
| `/admin/api/articles/search` | `GET` | Search by title/slug/status/lang. | `articles:edit` |
| `/admin/api/articles/{article_id}/preview?lang=xx` | `GET` | Render server-side preview (public skin). | `articles:edit` |
| `/admin/api/articles/{article_id}/widgets` | `GET` | Return parsed widget metadata for inspection. | `articles:edit` |

**Notes**
* All writes return envelopes like: `{ "ok": true, "data": { "id": "...", "version_id": "..." }, "audit_id": "..." }`.
* On publish: response includes `public_url` and `sitemap_updated: true`.

## **1.14 Validation Rules**

* **Title**: required, 2–160 chars per language.
* **Content**: either `content_md` or `content_html` required; if both present, `render_mode` decides source (if `markdown`, `content_md` is authoritative).
* **Widgets**: must pass schema (see 1.17).
* **Embeds**: must match allowlist (see 1.16); provider + id parsed correctly.
* **Slug**: generated; must be unique across mother scope and per-language `slug_lang` unique in `article_lang_map`.
* **Status flow**: only `draft|in_review` can publish; `published` can be archived.
* **SEO**: if `meta_title` set, 10–70 chars; `meta_description` 50–160 chars.
* **Language codes**: ISO-639-1 (`es`, `en`, …) and labels (e.g., “español”, “English”).

## **1.15 Versioning, Diffs & Restore**

* **Immutability**: saved versions are read-only.
* **Diffs**: show (a) title/meta changes, (b) semantic block diff (paragraphs, lists, blockquotes).
* **Restore**: creates a **new draft** with a system-added `change_note: "Restored from vN"`.
* **Numbering**: version numbers are sequential and never reused; deleted drafts leave their number unused.
* **Retention**: keep at least **last 30** versions per language; older ones auto-archived (configurable).

## **1.16 Sanitizer & Embed Allowlist**

* **Tags allowed**: `p, h1–h4, strong, em, s, blockquote, ul, ol, li, a[href|rel|target], img[src|alt|title], code, pre, span[data-*]`.
* **Style attrs**: disallow inline styles by default; allow `text-align` on blocks; **colors map to classes** (see 1.6).
* **Links**: add `rel="noopener noreferrer"` when `target="_blank"`.
* **Embeds** (converted at render-time to custom elements):
  * **YouTube**: `<pf-embed provider="youtube" id="VIDEO_ID" start="...">`
  * **Canva**: `<pf-embed provider="canva" id="DOC_ID">`
  * **H5P**: `<pf-embed provider="h5p" id="CONTENT_ID">`
  * Unknown pastes are wrapped as `<pf-embed provider="unknown" src="...">` for manual cleanup.
* **Iframes**: stripped if not recognized; pasted embed URLs are parsed and normalized into safe `<pf-embed>` components.
* **Images**: serve via media proxy with size + MIME checks.

## **1.17 Widgets (Token Specs & Schemas)**

Widgets are inserted as **tokens in content** and mirrored as structured objects in `widgets_json`. Renderer resolves tokens → server-side partials.

### **A) Exercise Insert**

**Token**
```
{{ ppx:exercise slug="ser-estar-essence" lang="es" }}
```

**Widget JSON** (normalized)
```json
{
  "type": "ppx-exercise",
  "slug": "ser-estar-essence",
  "lang": "es",
  "options": { "theme": "default", "show_progress": true }
}
```
**Validation**: `slug` must exist in library; `lang` optional (fallback to page lang).

### **B) Example Sentence**

**Token**
```
{{ ex-sentence audio="ex_romperla_01.mp3" tl="Messi la rompió en el partido." en="Messi crushed it in the match." }}
```

**Widget JSON**
```json
{
  "type": "example-sentence",
  "audio": "ex_romperla_01.mp3",
  "tl": "Messi la rompió en el partido.",
  "en": "Messi crushed it in the match.",
  "display": { "icon": "play-circle" }
}
```
**Validation**: `tl` required (bold line), `en` required (italic line), `audio` optional but recommended.

### **C) Glossary Hover (optional but handy)**

**Token**
```
{{ gloss:romperla }}
```

**Widget JSON**
```json
{ "type": "glossary-link", "slug": "romperla" }
```

## **1.18 Editor UX Details**

* **Toolbar**: H1–H4, Bold, Italic, Strikethrough, Quote, Bulleted/Numbered lists, Link, **Color**, Embed, Widgets.
* **Color picker**:
  * Tabs: **Brand Colors** (site-wide tokens), **My Colors** (user swatches), **Add color** (hex).
  * Persist **My Colors** in `admin_users.preferences.colors[]`.
* **Autosave**: every 10s & on blur; icon indicator with timestamp (“Draft saved 1:32 PM”).
* **Unsaved-guard**: confirm dialog on route change if dirty.
* **Markdown tab**: left MD, right preview; keyboard shortcut `Ctrl/Cmd + B/I`; fenced code blocks allowed.
* **Keyboard shortcuts**: `Ctrl/Cmd + S` (save), `Ctrl/Cmd + K` (insert link), `Ctrl/Cmd + Shift + P` (preview), `Ctrl/Cmd + Alt + E` (insert widget palette).

## **1.19 Permissions Matrix (Articles)**

| Action | Author | Editor | Super |
| ----- | ----- | ----- | ----- |
| Create | ✅ | ✅ | ✅ |
| Edit own drafts | ✅ | ✅ | ✅ |
| Edit others’ drafts | ❌ | ✅ | ✅ |
| Submit for review | ✅ | ✅ | ✅ |
| Publish/Unpublish | ❌ | ✅ (if granted) | ✅ |
| Clone language | ✅ | ✅ | ✅ |
| Restore version | ❌ | ✅ | ✅ |
| Manage users/roles | ❌ | ❌ | ✅ |

*Permissions apply per-domain. Access to `articles:*` does not imply access to `exercises:*`.*

## **1.20 Storage, Media & File Limits**

* **Paths**: `/uploads/articles/{article_id}/media/...`
* **Limits**: images ≤ 2 MB (webp/jpg/png), audio ≤ 8 MB (mp3/ogg), total per version ≤ 50 MB (configurable).
* **Cleanup**: when pruning old versions, compare `widgets_json/embeds_json` vs on-disk media → mark orphans → purge after 14 days.
* **CDN headers**: `Cache-Control: public, max-age=86400` for public assets; `no-store` for admin previews.

## **1.21 SEO & Internationalization**

* **hreflang** across published language variants.
* **Canonical** per language page (no cross-language canonical).
* **Sitemaps** regenerate on publish/unpublish; per-language files: `/sitemaps/sitemap_es.xml`, `/sitemaps/sitemap_en.xml`.
* **OpenGraph**: `og:title`, `og:description`, `og:image` pulled from version meta; fallback to defaults if unset.

## **1.22 Accessibility**

* Enforce **single H1** per article, linear heading order, required alt text on images.
* Keyboard nav: toolbar tabbable; markdown pane aria-labelled; language switcher has `aria-haspopup="listbox"`.
* Color contrast meets WCAG AA; avoid color-only signaling (icons + text for feedback).

## **1.23 Performance & Caching**

* **Editor**: lazy-load heavy modules (embed pickers, diff viewer). MD preview in worker.
* **Public**: server-side render & cache HTML per `version_id` with ETag; purge on publish/restore.
* Defer non-critical scripts and prefetch next article links when idle.

## **1.24 Error States & Recovery**

* **Save conflicts**: if version changed since load, show diff dialog → “Apply anyway” creates a new version with merge note.
* **Broken tokens**: renderer highlights with a warning chip and logs to Sentry; article still renders surrounding content.
* **Invalid embed URL**: convert to a neutral link + info tooltip (“Unsupported embed”).

## **1.25 Migration & Import (from current site)**

* Script to import existing pages:
  1. Parse HTML → sanitize → write `article_versions` (lang = inferred or default).
  2. Extract known widgets/embeds into `widgets_json`/`embeds_json`.
  3. Create `articles` mother record; set `article_lang_map` with latest as published.
* Unknown embeds are wrapped as `<pf-embed provider="unknown" src="...">` for review.
* Maintain original URLs via `slug_lang` mapping; add 301 redirects if path pattern changes.

## **1.26 Telemetry & Admin Analytics**

* Track: `editor_open`, `autosave`, `publish`, `restore`, `clone_language`, `preview`, `color_custom_added`, **`diff_viewed`**, **`restore_confirmed`**.
* Public: `view`, `lang_switch`, `widget_render_error`.
* Export CSV for audits by date range & user.

## **1.27 Non-Goals (for MVP)**

* No collaborative real-time editing.
* No inline CSS beyond color fallback for custom swatches.
* No AI-assisted translation/generation in-editor (phase 2).

## **1.28 Acceptance (Expanded)**

A story is **Done** when:

* ✅ Create → autosave → publish (ES) works; preview matches public page.
* ✅ Clone to EN; globe switcher swaps languages and sets proper `hreflang`.
* ✅ Example Sentence widget renders (audio + **bold** TL + *italic* EN).
* ✅ PPX exercise token opens the shared modal; completion summary appears.
* ✅ Version history shows diffs; restore creates a new draft and can be published.
* ✅ Color picker: **Brand Colors** visible; **My Colors** persist per admin user.
* ✅ Sanitizer strips disallowed HTML; embeds normalize to `<pf-embed>` components.
* ✅ SEO tags present; sitemap updated on publish; search index receives entry.
* ✅ RBAC enforced (button visibility + backend guards); audit writes events.
* ✅ a11y checks pass (headings, alt text, contrast, focus order).

---

# **2) PPX Exercises — Full Spec (Library & Runtime)**

## **2.1 Core Goals**

* Create a **modular, extensible exercises system** (“PPX”) with:
  * A **central library** for all exercise definitions (versioned JSON per type/slug).
  * A **shared modal runtime** for public use (one modal shell; plugins render only their body).
  * An **admin builder interface** for creating and editing exercises (one builder per type).
  * **Versioning**, **analytics**, **internationalization**, and **media management** built-in.
* Reduce file complexity by separating:
  * Admin logic (builders, editors)
  * Runtime logic (PPX public types)
  * Storage logic (JSON read/write + version index)
* Treat the **True/False (TF)** exercise as the **canonical reference implementation** for both the public runtime UI and the admin builder UX. All future exercise types must conform to the same UI patterns, CSS tokens, accessibility standards, and the PPX Type/Builder plugin contracts defined below.

## **2.2 Exercise Types (Initial Launch Set)**

Each type shares a consistent JSON structure, but with type-specific payloads. For non-TF types, the primary prompt/content is authored once in a single neutral field and displayed across languages. Hints, feedback, navigation, and shell strings remain bilingual.

| Type | Description | Core Interaction |
| ----- | ----- | ----- |
| **True/False** | Choose between two options (instant check). | Single answer; instant feedback; hints supported. |
| **Multiple Choice (MCQ)** | Select one or more correct answers. | Per-answer feedback + hint button. |
| **Drag & Drop (DnD)** | Single‑slide: match pairs or fill slots. | Check to reveal wrong placements; optional retry. |
| **Dictation** | Listen and type what you hear. | Audio + input + diff highlighting; optional retries. |
| **Click The Words (CTW)** | Click target words/expressions within a text. | Check highlights correct/incorrect; optional cap on selections. |

All types support:
* ES/EN dual-language labels & instructions.
* Per-item **feedback** and **hint** fields.
* Summary screen showing **score**, **review**, and "Try again" button.

### 2.2a Cross-Type UI + Plugin Contract (Runtime)

To ensure painless reuse of the UI base across exercise types, each exercise type ships as a PPX plugin that implements a small runtime contract. TF is the reference plugin and new types should follow its structure and conventions.

Key elements:
- Registry: `ppx-core.js` exposes `PPX.registerType(type, plugin)` and an event bus.
- Shell: `ppx-modal.js` renders header/footer; the plugin renders only the body into `#ppx-body`.
- Frame: `ppx-frame.js` provides in-page preview/embedding and bridges admin builder preview to the runtime.
- Styles: `ppx-exercise-ui.css` + shared `ppx.css` tokens and utilities; no inline styles.

Required plugin surface (JS):
- `init(ctx)` → mount content into `ctx.el`; prepare DOM/state.
- `start(ctx)` → ready to interact; focus management.
- `validate(ctx)` → returns `{ ok: boolean, issues?: [...] }` (pre-grade checks).
- `grade(ctx)` → returns `{ score: number, total: number, detail?: [...] }` and emits `ppx:graded`.
- `reset(ctx)` → clears user state and DOM feedback.
- `getState()` / `setState(state)` → serialize/restore transient state for retry/preview.
- `destroy()` → detach listeners and DOM.

Context fields (`ctx`): `{ el, lang, theme, i18n, opts, bus }`.

Events (published on `bus`): `ppx:ready`, `ppx:changed`, `ppx:validate`, `ppx:graded`, `ppx:retry`, `ppx:destroy`.

Accessibility & i18n:
- Use tokens and classes for contrast and spacing; honor `data-ppx-theme`.
- Provide ARIA roles/labels; ensure full keyboard navigation and focus cycling.
- Pull visible strings via `i18n` helper; live language swap should be idempotent.

### 2.2b Blueprints (Design Notes per Type)
- Drag & Drop: planning/dnd.txt — single‑slide exercise; global media; mapping review summary.
- Dictation: planning/dictation.txt — audio speed control; accent buttons; diff feedback; builder + media.
- Click The Words: planning/ctw.txt — tokenization; selection rules; contextual media; builder + summary.
- Fill in the Blank: planning/fib.txt — blanks with per‑blank variants; normalization; per‑blank feedback; builder + media.

### 2.2c Admin Icons (New Types)
Place under `static/assets/icons/`:
- `dnd.svg` (Drag & Drop), `dictation.svg` (Dictation), `ctw.svg` (Click The Words), `fib.svg` (Fill in the Blank).

## **2.3 Data & Versioning**

**Storage Layout**
```
data/exercises/
  tf/
    ser-estar-essence/
      001.json
      002.json
      current.json
  mcq/
    adjectives-estar/
      001.json
      current.json
  index.json
```

**Versioning Rules**
* Each new save creates `NNN.json` (`001`, `002`, …).
* `current.json` is a pointer with `{ "version": "002" }`.
* Each version includes: `id`, `type`, `slug`, `version`, `title_es`, `title_en`, `level` (A1–C2), `tags`, `created_by`, `created_at`, `status` (`draft`/`published`), `items[]`, **`checksum`** (hash of JSON for integrity) ← **added**.
* **All versions are immutable**; restoring creates a new version and a new checksum.

## **2.4 JSON Schema (Shared + Type Extensions)**

**Shared fields**
```json
{
  "id": "tf/ser-estar-essence",
  "type": "tf",
  "version": 2,
  "title_es": "SER o ESTAR: la esencia y la situación",
  "title_en": "SER or ESTAR: Essence vs Situation",
  "instructions_es": "Elegí Verdadero o Falso.",
  "instructions_en": "Choose True or False.",
  "level": "A2",
  "tags": ["ser/estar", "essence"],
  "status": "published",
  "created_by": "admin",
  "created_at": "2025-10-30T10:00:00Z",
  "checksum": "sha256:...",
  "items": []
}
```

**Example — True/False Item**
```json
{
  "id": "t1",
  "order": 1,
  "statement_es": "La identidad es algo esencial.",
  "statement_en": "Identity is something essential.",
  "answer": "true",
  "feedback_correct_es": "✅ Exacto, es una característica esencial.",
  "feedback_incorrect_es": "❌ Recordá: la identidad no cambia.",
  "hint_es": "Pensá si cambia o no con el tiempo."
}
```

**Example - Multiple Choice Item (neutral main text)**
```json
{
  "id": "q1",
  "order": 1,
  "question": "Which sentence uses SER correctly?",
  "options": [
    { "text": "Estoy médico.", "correct": false, "feedback": {"es":"No, SER se usa para profesiones permanentes.", "en":"No, use SER for permanent professions."} },
    { "text": "Soy médico.", "correct": true,  "feedback": {"es":"Correcto.", "en":"Correct."} }
  ]
}
```

**Example — Fill-in-the-Blank Item**
```json
{
  "id": "f1",
  "order": 1,
  "sentence_es": "Yo ___ profesor.",
  "sentence_en": "I ___ a teacher.",
  "answer": "soy",
  "hint_es": "Es una característica esencial.",
  "feedback_correct_es": "Correcto ✅",
  "feedback_incorrect_es": "No, para profesiones usamos SER."
}
```

**Ordering rule:** every item includes an integer `order` to guarantee deterministic display across runtimes and browsers.

## **2.5 File Index (Library Overview)**

`data/exercises/index.json` → rebuilt automatically on save/delete.
```json
{
  "tf/ser-estar-essence": {
    "title_es": "SER o ESTAR: la esencia y la situación",
    "type": "tf",
    "level": "A2",
    "tags": ["ser/estar", "essence"],
    "version": "002",
    "status": "published"
  },
  "mcq/adjectives-estar": { }
}
```

## **2.6 Services (Python layer)**

| Service | Description |
| ----- | ----- |
| `load_exercise(type, slug, version="current")` | Returns parsed JSON. |
| `save_exercise(payload, user)` | Creates next version, updates index, computes checksum, audits. |
| `validate_exercise(payload)` | Validates schema based on `type`. |
| `list_exercises(filters)` | Returns metadata from index.json. |
| `delete_exercise(type, slug)` | Soft-delete (mark archived). |
| `get_media(type, slug)` | Returns list of linked media. |
| `record_attempt(exercise_id, user, score, hints_used, duration)` | Stores analytics. |
| `restore_exercise(type, slug, version)` | Clones old version → new version, logs audit. |

## **2.7 Admin Interface (Builders)**

**A. Library Page**
* Filters: type, level, tags, status, language.
* Columns: title, type, level, status, last updated, actions (edit / preview / duplicate / delete).
* “+ New Exercise” button → choose type.

**B. Builder Pages (per type)**
* **Left:** Editor area (item fields, feedback, hints).
* **Right:** Live Preview (PPX runtime).
* **Edit as JSON:** modal editor to view/edit the raw payload with Validate/Apply; parity across TF and MCQ (and required for future types).
* **Bottom bar:** Save Draft • Publish • Preview • Version History.
* "Add item"; drag to reorder; per-item expand/collapse.
* A1-C2 tags, category chips.

### 2.7a Builder Shell + Plugin Contract (Admin)

The admin builder shares a common shell and side panels. Each type provides a minimal builder plugin that renders type-specific editors and emits changes in a consistent way. TF is the reference builder.

Shared shell components:
- Panels: Metadata (title, level), Taxonomy, Language, Validation, Version history.
- Actions: Save Draft, Publish, Preview, Restore.
- Preview: uses `ppx-frame.js` to render the current payload in the same shell used publicly.

Builder plugin surface (JS):
- `mount(root, initialPayload, { onChange })` → render editor UI; call `onChange(payload)` on edits.
- `validate()` → returns `{ ok: boolean, issues: [...] }` for UI surfacing before save.
- `serialize()` → returns canonical JSON matching the schema for this type.
- `destroy()` → cleanup.

Naming & structure conventions:
- Runtime plugin: `static/js/ppx-<type>.js` (e.g., `ppx-tf.js`).
- Builder module: `static/js/admin_builder_<type>.js` (e.g., `admin_builder_tf.js`).
- Shared core: `ppx-core.js`, `ppx-modal.js`, `ppx-frame.js`, `ppx-exercise-ui.css`, `ppx.css`.
- Templates: shared `_ppx_head_assets.html` includes all common assets; types add only their module.

**C. Version History**
* All versions with number, date, user, change note.
* “Preview” and “Restore” (restore creates new version, audits).

**D. Insert from Articles**
* Library modal inside Articles editor → search & select → auto-insert token:  
  `{{ ppx:exercise slug="ser-estar-essence" lang="es" }}`

## **2.8 Public Runtime (PPX Modal System)**

**A. Core**
* One modal shell: `ppx-modal.js` handles header/footer.
* Each type plugin renders only the body.
* Shared CSS tokens: `ppx.css`; SFX; progress; summary.

**B. Layout**
```
<header>Title + Lang Toggle + Progress</header>
<section id="ppx-body">Exercise content</section>
<footer>Prev | Check | Next | Retry</footer>
```

**C. Shared Features**
* Score tracking (percent & summary).
* Retry flow resets state.
* Hints appear only if available.
* Green/red feedback with accessible contrast.
* SFX toggle (default ON).
* Progress bar + completion summary.
* **Theming:** modal supports `data-ppx-theme="light|dark|brand"` at container or per-article context. ← **added**

**D. Analytics**
* Track `open_time`, `duration`, `score`, `hints_used`, `attempts`, `completed`.

**E. Reuse & Extensibility Rules**
* New exercise types must not alter shell DOM; only render inside `#ppx-body`.
* All actions (check, next, retry) flow through core events; types listen/respond.
* CSS must only target within a `.ppx-<type>` root to avoid leakage.
* Do not introduce inline event handlers; use delegated listeners and the event bus.

## **2.9 Validation Rules**
* Must pass type-specific JSON schema before saving.
* Each item has `id`, language fields, and correct-answer fields.
* Hints/feedback optional but encouraged.

## **2.10 Media Handling**
* Exercise folder may include `/media/` for images/audio.
* Audio filenames: `ex_<slug>_NN.mp3`.
* Upload via `/admin/api/exercises/{type}/{slug}/media`.
* On deletion, orphan media flagged for cleanup.

## **2.11 Permissions (RBAC)**

| Action | Author | Editor | Super |
| ----- | ----- | ----- | ----- |
| Create Exercise | ✅ | ✅ | ✅ |
| Edit Own Drafts | ✅ | ✅ | ✅ |
| Edit Others’ Drafts | ❌ | ✅ | ✅ |
| Publish / Unpublish | ❌ | ✅ | ✅ |
| Delete / Archive | ❌ | ✅ | ✅ |
| Manage Library Index | ❌ | ✅ | ✅ |

## **2.12 API Endpoints (JSON)**

| Endpoint | Method | Description |
| ----- | ----- | ----- |
| `/admin/api/exercises` | `GET` | List all exercises (filterable). |
| `/admin/api/exercises` | `POST` | Create a new exercise. |
| `/admin/api/exercises/{type}/{slug}` | `GET` | Fetch latest or specific version. |
| `/admin/api/exercises/{type}/{slug}` | `PUT` | Save new version. |
| `/admin/api/exercises/{type}/{slug}/publish` | `POST` | Publish version. |
| `/admin/api/exercises/{type}/{slug}/restore/{ver}` | `POST` | Restore older version. |
| `/admin/api/exercises/{type}/{slug}/media` | `POST` | Upload media. |

## **2.13 Acceptance Criteria (MVP)**

* Admin: create & edit **TF** and **MCQ**; preview & publish; insert into Articles.
* Builders include "Edit as JSON" modal (validate/apply) for TF and MCQ; required for future exercise types.
* Public: open modal; complete with feedback/hints/retry; see summary.
* JSON versions created; `index.json` auto-updates.
* Admin preview == public runtime.
* Clear separation of concerns: `builder_*.js`, `ppx-core.js`/`ppx-modal.js`, `*.public.js`.
* TF implements the full PPX plugin and builder contracts; MCQ implements the same contracts without changes to core.
* Adding a new type requires only: a new runtime plugin, a new builder module, and schema; no changes to `ppx-modal.js` or the shell.

## **2.14 Future Enhancements**

* Question pools & randomization.
* Timed mode.
* Linked exercises (series with progress memory).
* Per-exercise analytics dashboard.
* Adaptive difficulty.
* Collaborator roles (reviewer vs author).

---

# **3) GLOSSARY — Full Spec (Glosario Bilingüe y Regional)**

## **3.1 Core Goals**

* **Modernize the existing glossary** into a flexible, relational or structured JSON format while keeping all current data intact.
* Maintain compatibility with current **entry data**, **audio naming conventions**, and **bilingual examples**.
* Create a **clean, searchable, and cross-linked interface** where entries connect to Articles and Exercises seamlessly.
* Support **regional variants**, **tags**, and **“see also”** cross-references.
* Use the same **admin permissions system (RBAC)** as Articles and Exercises.

## **3.2 Design Philosophy**

* Each **entry = core lemma or expression** (e.g., *pelotudo*, *romperla*, *tener fiaca*).
* Entries can have:
  * Multiple **senses** (e.g., “literal” vs. “colloquial”).
  * Multiple **examples per sense**, each with Spanish + English translation, and optional audio.
* A single entry is **bilingual and bidirectional**, but Spanish remains the canonical root.
* **Regional tags** (🇦🇷, 🇲🇽, 🇪🇸, etc.) label country-specific meanings or usage.
* **Lunfardo**, **coloquial**, or **formal** markers with tone indicators (😏, 🧩, 🎩).

## **3.3 Data Model (normalized structure)**

**Option A: Database-backed (recommended long term)**

| Table | Purpose |
| ----- | ----- |
| `glossary_entries` | Root entries (unique lemma/slang/phrase). |
| `glossary_senses` | Meanings/definitions grouped under an entry. |
| `glossary_examples` | Examples linked to each sense. |
| `glossary_tags` | Shared tag pool. |
| `glossary_regions` | ISO codes or custom region labels. |
| `glossary_links` | “See also” and “related terms.” |

**Option B: JSON per entry (current setup, upgraded)**

Each file in `/data/glossary/{slug}.json` (normalized but easy to edit).

```json
{
  "slug": "romperla",
  "word": "romperla",
  "type": "verbo idiomático",
  "definition_es": "Usado para indicar que alguien lo hizo muy bien en algo.",
  "definition_en": "To crush it / do really well.",
  "register": "coloquial",
  "tags": ["lunfardo", "coloquial", "positivo"],
  "regions": ["🇦🇷 Argentina", "🇺🇾 Uruguay"],
  "variants": { "m.s.": [], "m.p.": [], "f.s.": [], "f.p.": [] },
  "examples": [
    {
      "id": "ex_romperla_01",
      "es": "Messi la rompió en el partido.",
      "en": "Messi crushed it in the match.",
      "audio": "ex_romperla_01.mp3",
      "fuente": "Uso cotidiano",
      "tags": ["fútbol"]
    }
  ],
  "related": ["romper todo", "hacerla bien"],
  "created_by": "admin",
  "created_at": "2025-10-30T10:00:00Z"
}
```

**Additions**
* `glossary_senses.order` controls display order. ← **added**
* Multiword slugs use hyphens (e.g., `tener-fiaca`). ← **added**

## **3.4 Required Fields (JSON Schema)**

| Field | Type | Description |
| ----- | ----- | ----- |
| `slug` | string | auto-generated from the word (lowercase, hyphens). |
| `word` | string | canonical form. |
| `type` | string | e.g., *sustantivo masculino*, *verbo idiomático*. |
| `definition_es` | string | primary definition (Spanish). |
| `definition_en` | string | English equivalent(s). |
| `register` | string | *formal*, *coloquial*, *vulgar*, etc. |
| `tags[]` | array | thematic/usage tags. |
| `regions[]` | array | regions/flags. |
| `variants` | object | (m.s.), (m.p.), (f.s.), (f.p.) arrays. |
| `examples[]` | array | Spanish + English + optional audio. |
| `related[]` | array | list of slugs. |
| `created_by`, `created_at` | metadata. |

## **3.5 Audio & Media Conventions**

```
/uploads/glossary/{slug}/
  w_{slug}.mp3
  ex_{slug}_01.mp3
  ex_{slug}_02.mp3
```

Upload via `/admin/api/glossary/{slug}/media`.  
On rename, backend renames associated audio files automatically.

## **3.6 Admin UI (Editor Flow)**

**A. Glossary Library**
* Table with columns: **Word**, **Type**, **Tags**, **Regions**, **Last Edited**, **Actions**.
* Filters: region, tag, register, type.
* “+ New Entry”.

**B. Entry Editor**
* Collapsible sections: **Basic Info**, **Variants**, **Examples**, **Audio**, **Related**, **Metadata**.
* Right Sidebar: **Preview**, **History**, **Linked Articles** (reverse lookup from article tokens) ← **added**.

**C. Versioning**
* Save → new numbered version; `current.json` marks latest; restore creates new version.

**D. Permissions**
* **Author**: create/edit own drafts.
* **Editor**: edit others, publish.
* **Super**: manage everything + delete.

## **3.7 Public Display**

**Layout**
```
WORD (bold) [🔊]
(type) • [tags] • [flags]

Definition (ES)
Definition (EN)

Examples:
🔊 “Messi la rompió en el partido.”
   — Messi crushed it in the match.

Variants: (m.s.) — ; (f.s.) — ; …
Related terms: romper todo • hacerla bien
Tags: 🧩 lunfardo, 🇦🇷 Argentina
```

**Search & Navigation**
* Search supports lemma, English equivalent, tags, regions.
* Autocomplete shows word • flags • snippet.
* **Accent-insensitive matching** (e.g., “fiaca” == “fíaca”). ← **added**

**Cross-linking**
* From Articles: `{{ gloss:romperla }}` → hover tooltip with definition + audio.
* From Exercises: underlined links with hover.

## **3.8 Services (Python Layer)**

| Function | Description |
| ----- | ----- |
| `load_entry(slug)` | Loads JSON/DB record. |
| `save_entry(payload)` | Validates + saves version. |
| `validate_entry(payload)` | Schema validation. |
| `list_entries(filters)` | List with filters. |
| `delete_entry(slug)` | Archive. |
| `rebuild_index()` | Update search index. |
| `search_entries(query)` | Multi-field. |
| `get_related_entries(slug)` | Expand related list. |
| `get_audio(slug, type="word")` | Audio URL. |

## **3.9 Index File (if JSON-based)**

`data/glossary/index.json`
```json
{
  "romperla": {
    "word": "romperla",
    "type": "verbo idiomático",
    "tags": ["lunfardo"],
    "regions": ["🇦🇷 Argentina"],
    "definition_es": "Usado para indicar que alguien lo hizo muy bien.",
    "definition_en": "To crush it / do really well.",
    "version": "002",
    "status": "published"
  }
}
```

## **3.10 API Endpoints**

| Endpoint | Method | Description |
| ----- | ----- | ----- |
| `/admin/api/glossary` | `GET` | List all entries (filterable). |
| `/admin/api/glossary` | `POST` | Create new entry. |
| `/admin/api/glossary/{slug}` | `GET` | Fetch entry details. |
| `/admin/api/glossary/{slug}` | `PUT` | Save new version. |
| `/admin/api/glossary/{slug}/publish` | `POST` | Publish version. |
| `/admin/api/glossary/{slug}/restore/{ver}` | `POST` | Restore older version. |
| `/admin/api/glossary/{slug}/media` | `POST` | Upload audio files. |

## **3.11 Validation Rules**

* Must have `word`, `definition_es`, and `definition_en`.
* Must include at least one `example`.
* Audio optional but recommended.
* `tags` and `regions` validated against pre-approved sets.
* No duplicate slugs allowed (auto-generated).

## **3.12 Search & Indexing**

* Index updates automatically on publish.
* Search across: `word`, `definition_en`, `tags`, `regions`, `examples[].es/en`.
* Ranking: exact lemma > partial > tag relevance > region.

## **3.13 Acceptance Criteria (MVP)**

* Admin: create entries + examples with audio; save + publish; filter/search; restore.
* Public: search by region/tag/lemma; play word/example audio; follow related links.
* Articles: `{{ gloss:slug }}` renders hover tooltip with definition + audio.

## **3.14 Future Enhancements**

* Collaborative tagging/review.
* “Compare regional variants” view.
* Export CSV/JSON bundle.
* Bulk import (APIs or spreadsheets).
* User “Suggest a new word” (pending approval).

---

# **4) Unified Implementation Plan & Folder Structure**

## **4.1 Repo Layout (small, single-purpose files)**

```
app/
  __init__.py                  # App factory (create_app)
  config.py                    # BaseConfig, Dev/Prod/Test
  extensions/                  # Third-party init (tiny)
    db.py                      # SQLAlchemy
    migrate.py                 # Alembic
    login.py                   # Flask-Login
    babel.py                   # Flask-Babel
  common/                      # Cross-domain utilities
    utils.py                   # slugify, time, id helpers
    validators.py              # shared pydantic/jsonschema
    storage.py                 # local/S3 adapters
    security.py                # sanitizer + RBAC can()
    search.py                  # search index writer
    audit.py                   # write audit events
  shared/
    widgets/                   # shared widget templates (example-sentence, gloss-link)
    embeds/                    # safe iframe partials
  domains/
    articles/
      models.py                # Article + ArticleVersion + LangMap
      schemas.py               # pydantic request/response
      repo.py                  # DB I/O
      services.py              # create/clone/save/publish/restore
      routes_admin.py          # Jinja admin pages
      routes_public.py         # Public article routes
      api.py                   # JSON endpoints
      richtext/
        sanitizer.py
        embeds.py              # youtube/canva/h5p → safe components
        widgets.py             # token parsers (ppx, example-sentence, gloss-link)
    exercises/
      indexer.py               # rebuild data/exercises/index.json
      file_repo.py             # read/write versioned JSON
      media_repo.py            # exercise media file ops
      schemas/                 # jsonschema/pydantic per type
        tf.py
        mcq.py
        cloze.py
        dnd.py
      services.py              # list/save/validate/publish/restore
      routes_admin.py          # library + builder pages
      routes_public.py         # optional direct views
      api.py                   # JSON endpoints
    glossary/
      models.py                # if DB option chosen
      schemas.py               # JSON option or request/response
      repo.py                  # DB or file I/O
      services.py              # save/publish/restore/search
      routes_admin.py
      routes_public.py
      api.py
templates/
  _layout/
    base.html
    _admin_bar.html
    _flash_toast.html
    _exercise_modal.html       # shared PPX shell mount
  admin/
    articles/
      index.html
      editor.html              # tabs: Visual | Markdown + side panel (Versions/SEO/Schedule)
    exercises/
      library.html
      builder_tf.html
      builder_mcq.html
      builder_cloze.html
      builder_dnd.html
    glossary/
      index.html
      edit.html
  public/
    articles/show.html
    glossary/entry.html
    pages/tiles.html
static/
  css/
    app.css
    ppx.css                    # tokens + atoms for PPX shell
  js/
    admin/
      articles_editor.js
      widgets/                 # small files per admin widget
        example_sentence.js
        ppx_insert.js
        gloss_link.js
      builders/
        builder_tf.js
        builder_mcq.js
        builder_cloze.js
        builder_dnd.js
    ppx/
      core/
        ppx-core.js
        ppx-modal.js
        ppx-i18n.js
        ppx-validate.js
        ppx-media.js
      types/
        tf/tf.public.js
        mcq/mcq.public.js
        cloze/cloze.public.js
        dnd/dnd.public.js
data/
  exercises/
    tf/<slug>/{001.json, 002.json, current.json}
    mcq/<slug>/{...}
    cloze/<slug>/{...}
    dnd/<slug>/{...}
  glossary/ (if JSON option chosen)
    <slug>.json
    index.json
uploads/                       # dev only (prod → S3)
  articles/<article_id>/media/...
  glossary/<slug>/...
  exercises/<type>/<slug>/...
migrations/                    # Alembic
tests/
  test_articles_*.py
  test_exercises_*.py
  test_glossary_*.py
```

**Why this shape works**
* Domains are vertical slices (Articles / Exercises / Glossary), each with `models/schemas/repo/services/routes/api`.
* All cross-cutting utilities live in `common/`.
* Shared widget & embed partials live in `shared/`.
* Admin and public stay dumb (HTML only), with **zero inline CSS/JS**.
* PPX modal is **one** shared shell; types render only their body.

## **4.2 Environment & Config**

* `.env` (dev) → `APP_ENV=development`, `DATABASE_URL=...`, `S3_BUCKET=...`, `SECRET_KEY=...`
* `config.py`:
  * `BaseConfig`: `SECRET_KEY`, `BABEL_DEFAULT_LOCALE`, `UPLOADS_ROOT`, sanitizer options.
  * `DevConfig`: `DEBUG=True`, local uploads.
  * `ProdConfig`: S3 storage adapter, stricter security headers.
* Secrets via environment variables; never committed.

## **4.3 RBAC (roles & permissions)**

**Roles**: `author`, `editor`, `super`  
**Resources**: `articles`, `exercises`, `glossary`  
**Actions**: `create`, `edit`, `publish`, `delete`, `restore`, `translate`

Implementation:
* `common/security.py` exposes `can(user, resource, action)`.
* Decorator `@require("articles", "publish")` for endpoints/buttons.
* UI hides disallowed actions (defense-in-depth: backend still enforces).

## **4.4 Migrations (first pass)**

1. **Admin & RBAC**
   * `admin_users (id, name, email, role, status, preferences JSON)`
   * `admin_permissions (user_id, resource, action)`

2. **Articles**
   * `articles (id, slug, default_lang, status, created_at, updated_at)`
   * `article_versions (id, article_id, lang, title, content_html, content_md, widgets_json, embeds_json, meta_title, meta_description, og_image_url, status, version_num, published_at, author_id, editor_id, change_note, render_mode)`
   * `article_lang_map (article_id, lang, version_id, slug_lang)`

3. **Glossary (if DB option)**
   * `glossary_entries (id, slug, word, type, register, meta, created_by, created_at, status)`
   * `glossary_senses (id, entry_id, definition_es, definition_en, notes, order)`
   * `glossary_examples (id, sense_id, es, en, audio_url, fuente, tags, order)`
   * `glossary_tags (id, name)` + join table
   * `glossary_regions (id, code, name)` + join table
   * `glossary_links (entry_id, related_slug)`

If you choose **Glossary JSON**, skip those tables; keep `data/glossary/*.json` + `index.json`.

## **4.5 Endpoints (minimal, all JSON)**

**Articles**
* `POST /admin/api/articles` — create
* `POST /admin/api/articles/{id}/versions` — save draft
* `POST /admin/api/articles/{id}/versions/{ver}/publish` — publish/schedule
* `POST /admin/api/articles/{id}/versions/{ver}/restore` — restore → draft
* `POST /admin/api/articles/{id}/clone-language` — clone flow
* `GET /admin/api/articles/{id}/widgets` — parsed widgets metadata
* `POST /admin/api/uploads/articles/{id}/media` — upload

**Exercises**
* `GET/POST /admin/api/exercises` — list/create
* `GET /admin/api/exercises/{type}/{slug}` — fetch current or version
* `PUT /admin/api/exercises/{type}/{slug}` — save new version
* `POST /admin/api/exercises/{type}/{slug}/publish` — publish
* `POST /admin/api/exercises/{type}/{slug}/restore/{ver}` — restore
* `POST /admin/api/exercises/{type}/{slug}/media` — upload

**Glossary**
* `GET/POST /admin/api/glossary` — list/create
* `GET /admin/api/glossary/{slug}` — fetch
* `PUT /admin/api/glossary/{slug}` — save new version
* `POST /admin/api/glossary/{slug}/publish` — publish
* `POST /admin/api/glossary/{slug}/restore/{ver}` — restore
* `POST /admin/api/glossary/{slug}/media` — upload

**Envelope format (all writes):**
`{ "ok": true, "data": { ... }, "audit_id": "..." }`

## **4.6 Frontend rules (keep files tiny)**

* **One PPX shell** (`_exercise_modal.html` + `ppx-modal.js`).
* Each type lives in its own folder: `static/js/ppx/types/<type>/*.public.js`.
* **Design tokens live in `ppx.css`** (buttons, progress, chips). Types may only add tiny overrides.
* **Admin JS** is glue only: builder forms, token insertion, autosave, version list.
* **No inline CSS/JS** in templates (lint guard).

## **4.7 Sanitizer & Embeds**

* Allowlist tags/attrs: `p, h1–h4, strong, em, s, blockquote, ul/ol/li, a[href|rel|target], img[src|alt], span[data-*]` (+ custom `pf-embed`).
* Transform pasted iframes to neutral `<pf-embed provider="youtube" video="...">`.
* Strip inline styles except a curated subset; map colors to **token classes** when possible.

## **4.8 Storage & Uploads**

* **Dev**: local filesystem under `/uploads/<domain>/...`.
* **Prod**: S3-compatible bucket via `common/storage.py`.
* Per-domain folders:
  * Articles → `/uploads/articles/{article_id}/media/`
  * Exercises → `/uploads/exercises/{type}/{slug}/media/`
  * Glossary → `/uploads/glossary/{slug}/`
* Orphan cleanup: when an old version is pruned/archived, mark unused files and purge after grace period.

## **4.9 Testing & Quality Gates**

* **Unit tests**: services + sanitizer + token renderers + validators.
* **Integration**: admin save/publish flows; public render.
* **Pre-commit hooks**:
  * Black, Ruff (py)
  * Prettier + ESLint (js)
  * Grep fail for `<style>` or `<script>` in Jinja templates.
* CI: run tests + lint on PR.
* Fixtures: fake S3 and fake RBAC user contexts.

## **4.10 Analytics & Telemetry**

* Articles: editor actions (open, autosave, publish, restore), language switches, diffs/restore confirmations.
* Exercises: open, complete, score, hints used, duration; per type.
* Glossary: searches, entry views, audio plays; from Article/Exercise hover links.

## **4.11 Phased Execution (tiny, reversible steps)**

**Phase A — Foundations**  
1. App factory + extensions wired.  
2. RBAC scaffold (`admin_users`, `admin_permissions`) + `can()` helper.  
3. Sanitizer + storage adapters.

**Phase B — Articles MVP**  
4. Migrations for `articles/*`.  
5. Admin editor (Visual tab only) + autosave + preview.  
6. Publish & language clone; version history; Markdown tab.  
7. Example Sentence & PPX insert tokens (renderer + `widgets_json`).

**Phase C — PPX Unification**  
8. PPX shell + `ppx-core.js` + `ppx-modal.js`.  
9. Convert **TF** + **MCQ** to public plugins; builders for both.  
10. Indexer + versioning in `data/exercises`. Insert-from-Articles flow.

**Phase C2 — Shared Widgets Layer**  
11. Implement example-sentence and gloss-link partials as reusable components (used in Articles + Glossary + Exercises).

**Phase D — Glossary**  
12. Pick DB vs JSON; build importer if needed.  
13. Admin editor + public entry + hover token (`{{ gloss:slug }}`).

**Phase E — Hardening**  
14. SEO (sitemaps, canonical, hreflang), search hooks, accessibility checks.  
15. Analytics dashboards, scheduled publish, prune policies.

## **4.12 Initial Tickets (bite-sized)**

* **A1**: `create_app` + `config.py` + `extensions/*`
* **A2**: `common/security.py` (`can()`, @require decorator)
* **A3**: `common/security.py` sanitizer v1 + `domains/articles/richtext/embeds.py`
* **B1**: `domains/articles/models.py` + Alembic migration
* **B2**: `articles/services.create_article` + `routes_admin.index` + `editor.html` shell
* **B3**: Autosave endpoint + preview route
* **B4**: Publish + language clone + lang dropdown UI
* **B5**: Version list/restore + change notes
* **B6**: Markdown tab + live preview
* **C1**: `_exercise_modal.html` + `ppx-modal.js` + tokens render in Articles
* **C2**: `tf.public.js` + `builder_tf.js` + schema
* **C3**: `mcq.public.js` + `builder_mcq.js` + schema
* **D1**: Glossary importer (if DB) or `index.json` builder (if JSON)
* **D2**: Glossary editor + public entry + hover tooltip from Articles
* **E1**: Sitemaps + hreflang + search hooks; a11y checks

---

# 🔧 Additional Refinements and Enhancements (Merged)

## Articles Additions
- Added `render_mode` field to `article_versions` to distinguish between visual and markdown edits.
- Clarified that `content_md` is the authoritative source when both MD and HTML exist (based on `render_mode`).
- Specified that default language (e.g., English) omits `/en/` in canonical URLs to prevent SEO duplication.
- Added `get_public_url(article_id, lang)` service and audit logging requirement for all write operations.
- Added new API endpoint: `GET /admin/api/articles/{article_id}/widgets` for metadata inspection.
- Version numbers are sequential and never reused; deleted drafts skip their number.
- Tokens must be spaced or line-broken for parser recognition.
- Markdown preview runs in a worker thread for performance.
- Import process wraps unknown embeds as `<pf-embed provider="unknown">` for review.
- Telemetry includes `diff_viewed` and `restore_confirmed` for version recovery tracking.

## Exercises Additions
- Added `checksum` field to each exercise version for integrity validation.
- Added `order` field for deterministic item ordering.
- Modal now supports `data-ppx-theme` (light, dark, brand) for styling.
- Each restore action logs an audit entry with restored version reference.

## Glossary Additions
- Added `glossary_senses.order` field for display sequencing.
- Slugs for multiword entries use hyphens (`tener-fiaca`).
- Right sidebar in admin shows linked articles (reverse lookup from tokens).
- Search supports accent-insensitive matching and normalization.

## Unified Implementation Additions
- Added `shared/widgets` and `shared/embeds` folders to repo structure.
- All endpoints return envelopes: `{ "ok": true, "data": {…}, "audit_id": "…" }`.
- Recommended pytest fixtures for fake S3 and RBAC contexts.
- New Phase C2 added: Shared Widgets Layer (example-sentence and gloss-link partials).
- MVP Milestone Summary table added below.

---

# 🧭 MVP Milestone Summary

| Domain | Feature | Acceptance Criteria | Status |
| ------- | -------- | ------------------ | ------- |
| **Articles** | Editor (Visual & MD) | Autosave, publish, restore, color picker, version diff, PPX & Example Sentence widgets | ✅ |
|  | Multilingual Support | Clone language, globe switcher, hreflang | ✅ |
|  | SEO & a11y | Sitemaps, canonical tags, alt-text, contrast | ✅ |
| **Exercises** | Library & Builders | TF + MCQ creation, preview, versioning | ✅ |
|  | Modal Runtime | Shared PPX modal, score tracking, retry | ✅ |
|  | JSON Integrity | Versioned structure, index.json auto-update | ✅ |
| **Glossary** | Data Structure | Entries, examples, variants, tags, audio naming | ✅ |
|  | Admin Editor | Collapsible form, audio uploads, version restore | ✅ |
|  | Public Search | Accent-insensitive search, cross-links, hover tooltips | ✅ |
| **System** | RBAC & Audit | Permissions enforced, audit logs per action | ✅ |
|  | Storage & Orphans | Uploads per domain, cleanup jobs, S3-ready | ✅ |
|  | Analytics | Editor + user telemetry for key actions | ✅ |

# **5) TAXONOMY & Content Library (Integrated)**

## **5.1 Purpose**

- Provide a single grammar taxonomy used to tag and organize Articles and Exercises.
- Enable consistent admin tagging, public browsing, and list filtering by topic.

## **5.2 Data Model**

- Taxonomy JSON: `data/ui/taxonomy/grammar.json` with nodes: `path`, `title` `{es,en}`, `children[]`.
- Indices: `common/taxonomy.py` builds `by_path` and `children` maps for fast lookups.
- Articles: `article.json` includes `taxonomy_paths: [string]` (already present in admin form), persisted per article.
- Exercises: extend exercise payload to include `taxonomy_paths: [string]` (planned) and surface in builders.

## **5.3 Admin Experience**

- Picker (implemented): `static/js/admin_taxonomy_picker.js` embedded in `templates/admin/_article_meta.html` and `_article_taxonomy.html`.
  - Loads from `/taxonomy/grammar` and `/taxonomy/grammar/<path>`; writes hidden input `#taxonomy_paths` as a JSON array.
- Exercises builder (planned): reuse the same picker in TF/MCQ builders; save to payload.
- Taxonomy Manager (future): admin tool to add/rename/reorder nodes; persists `grammar.json` with versioning and validation.

## **5.4 Public Experience**

- Browse (implemented): `domains/taxonomy/routes.py` + `templates/taxonomy/grammar_browse.html` to navigate topics and children.
- Filters (planned): add topic filter (`?topic=verbs/subjunctive/...`) to public Articles and Exercises indexes; show breadcrumb.

## **5.5 APIs**

- `GET /taxonomy/grammar` → list roots.
- `GET /taxonomy/grammar/<path>` → node, breadcrumb, immediate children.
- `GET /taxonomy/grammar/browse` → HTML browse page.
- JSON includes `has_children` and optional `display_title` for the requested `lang`.

## **5.6 Helpers**

- `common/taxonomy.py` public API: `load_taxonomy`, `title_for`, `children_of`, `ancestors`, `is_ancestor`, `node_for`, `breadcrumb`.
- Uses `lru_cache` for performance; invalidate by app restart or explicit cache clear on updates.

## **5.7 Validation & Enforcement**

- On save (Articles and Exercises):
  - Validate that each entry in `taxonomy_paths` exists in `by_path`.
  - Dedupe; optionally cap topics per item.
  - Optional rule: require at least one taxonomy path to publish.

## **5.8 i18n & Accessibility**

- Dual-language titles in taxonomy; `display_title` respects `?lang=es|en`.
- Picker keyboard navigation and ARIA labels; breadcrumb uses localized titles.

## **5.9 Phases**

- Phase 1: Picker in Articles (done), browse page (done), helper library (done).
- Phase 2: Picker in Exercises (planned), validate on save, public list filters.
- Phase 3: Admin taxonomy manager (future), search integration and sitemap facets.

## **5.10 Acceptance Criteria**

- Article create/edit stores `taxonomy_paths` and persists to `data/articles/<slug>/article.json`.
- Public Articles list can filter by `?topic=` and render a localized breadcrumb.
- Exercises builder saves `taxonomy_paths`; admin API returns them in JSON.
- `common/taxonomy.py` functions behave per spec for known sample paths.
