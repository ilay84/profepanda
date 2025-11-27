# ProfePanda Taxonomy & Content Library Plan

## 0. Purpose
Build a unified **taxonomy system** to classify and organize **Articles** and **Exercises** by grammatical topic.  
Enable a **public library** that automatically renders topics (H1) and subtopics (H2, H3, …) with nested content lists and full filtering/search.

---

## 1. Design Overview

### 🔹 Core Concept
- One canonical **taxonomy** file defines all grammar topics and subtopics.  
- Articles and Exercises attach to topic paths (e.g., `verbs/subjunctive/present`).
- The system supports **infinite nesting** of subtopics.
- Public library pages dynamically render content grouped by topic level.

### 🔹 Visual Philosophy
- Public pages are **orchestrators**, not galleries.  
- Use **Row Lists** for content (clean, scannable, lightweight).
- Headings (H1–H4) define logical hierarchy; no cards needed except for featured items.

---

## 2. Data Model

### Taxonomy File
`data/ui/taxonomy/grammar.json`
```json
{
  "id": "grammar",
  "version": 1,
  "title": {"es": "Gramática", "en": "Grammar"},
  "nodes": [
    {
      "id": "verbs",
      "path": "verbs",
      "title": {"es": "Verbos", "en": "Verbs"},
      "children": [
        {
          "id": "subjunctive",
          "path": "verbs/subjunctive",
          "title": {"es": "Subjuntivo", "en": "Subjunctive"},
          "children": [
            {
              "id": "present",
              "path": "verbs/subjunctive/present",
              "title": {"es": "Presente del subjuntivo", "en": "Present Subjunctive"},
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

### Article JSON
```json
{
  "title_es": "El subjuntivo presente",
  "title_en": "The Present Subjunctive",
  "topics": ["verbs/subjunctive/present"]
}
```

### Exercise JSON
```json
{
  "type": "tf",
  "title_es": "Ser vs. Estar (A2)",
  "tags": ["verbs/ser-vs-estar", "level/A2"]
}
```

*Articles use `topics`; Exercises continue to use `tags` for backward compatibility.*

---

## 3. Topic Paths
- Slash-delimited: `nouns/gender/irregular`  
- Arbitrary depth (no technical limit).  
- Breadcrumbs and filters derived from path segments.  
- URLs follow same path:  
  `/topics/verbs/subjunctive/present`

---

## 4. Admin Experience

### A. Taxonomy Manager
A container on the **Admin Dashboard** for creating and managing topics.

**Features**
- Expandable tree with search.
- Add, rename, or delete nodes.
- Edit ES/EN titles.
- Create parent/child topics dynamically.
- Auto-validate unique paths.
- Auto-save via API.

### B. Create-on-the-Fly
When tagging content:
- If the searched topic doesn’t exist → option to **create it right there**.
- Opens a mini modal (title ES/EN) → adds it via Admin API → selectable immediately.

### C. Validation Rules
- At least **one main topic** (root-level) is required.
- Subtopics optional.
- Unknown paths rejected unless created by an authorized admin.

---

## 5. Public Experience

### A. Page Structure
Route: `/topics/<path:topic>`

**Layout**
```
<H1> Current Topic </H1>
Breadcrumbs → Grammar › Verbs › Subjunctive › Present
[Filter bar: Search | Level | Type | Topic tree]
-----------------------------------------------
<H2> Subtopic 1 </H2>
<ul class="ppx-item-list">
  <li>ItemRow (Article or Exercise)</li>
  ...
</ul>

<H2> Subtopic 2 </H2>
<ul>...</ul>
```

### B. Row List Design
Compact, scannable, and accessible.

| Element | Description |
| :------ | :----------- |
| **Title (link)** | Opens item. |
| **Meta chips** | Type (`Article`, `TF`, `MCQ`, etc.), Level (`A1–C2`). |
| **Topic breadcrumb** | e.g. `Verbs › Subjunctive › Present` (truncated on overflow). |
| **Actions** | Preview ▸ , Edit ✏️ (admins only). |

**Behavior**
- Click breadcrumb chunk → filter to that subtopic.
- Hover → show summary tooltip.
- Keyboard and screen-reader friendly (`<li>` inside `<ul>`).

### C. Filters
- **Topic** (multi-select tree, prefix-match)
- **Level** (A1–C2)
- **Type** (Article / Exercise / Both)
- **Search** (title text)
- Reflect filter state in URL params for shareability.

---

## 6. APIs

### Admin
| Method | Endpoint | Purpose |
| :------ | :-------- | :------ |
| `GET` | `/admin/api/taxonomy/grammar` | Load registry |
| `POST` | `/admin/api/taxonomy/grammar/node` | Create/update topic node |

### Public
| Method | Endpoint | Params | Purpose |
| :------ | :-------- | :------ | :------ |
| `GET` | `/api/content` | `topic`, `type`, `level`, `q`, `limit`, `offset` | Unified feed of Articles + Exercises filtered by topic |

---

## 7. Helpers

`taxonomy.py` utility functions:
- `load_taxonomy(name)` → dict
- `title_for(path, lang)`
- `children_of(path)`
- `ancestors(path)`
- `is_ancestor(ancestor, path)`

---

## 8. Routing & SEO
- Flask route uses `<path:topic>` to support infinite depth.
- Canonical URLs + JSON-LD breadcrumbs for SEO.
- Sitemap auto-includes all topic paths.

---

## 9. Validation & Enforcement
- Save actions for content require one valid main topic.
- Subtopics optional.
- Orphaned content (no topic) displayed under “Uncategorized”.

---

## 10. Performance
- Taxonomy cached in memory.
- Public `/api/content` responses cached by `(topic, type, level, q)` tuple.
- Lazy pagination per topic section.

---

## 11. i18n
- Registry stores ES/EN titles.
- UI language determines which label renders.
- URLs remain language-neutral.

---

## 12. Accessibility
- Semantic headings: one `<h1>` per page; subsequent depth-based `<h2>` / `<h3>` / `<h4>`.
- Keyboard nav for tree and filters.
- Focus ring + ARIA for chips and modals.

---

## 13. Implementation Phases

1. **Core helpers** (`taxonomy.py`)  
2. **Seed file** (`grammar.json`)  
3. **Admin API** (CRUD)  
4. **Admin Taxonomy Manager** container  
5. **Topic Picker** (create-on-the-fly)  
6. **Public API** `/api/content`  
7. **Public topic pages** `/topics/<path>`  
8. **Migration script** (optional for old tags)  
9. **Polish** (analytics, SEO, caching)

---

## 14. Acceptance Criteria
✅ Can create/edit topics & subtopics of any depth.  
✅ Can tag content with main + optional subtopics.  
✅ Topic Picker supports create-on-the-fly.  
✅ Public pages render nested headings and Row Lists.  
✅ Filters/search work across all topic levels.  
✅ Localization and accessibility pass audit.  
✅ Existing content still visible (fallback “Uncategorized”).  

---

## 15. Why Row Lists (not Cards)
- Scale gracefully to large libraries.  
- Maintain visual hierarchy under H1/H2/H3.  
- Easier to scan, filter, and compare.  
- Cards reserved only for “Featured” or “Popular” sections.

---

## 16. Optional Enhancements
- Analytics: track topic visits & filter usage.
- “Featured” tag to promote content on homepage cards.
- Inline “suggested subtopics” under each list (for UX discovery).
- “Learning Path” mode: auto-ordered chain of related exercises/articles.

---

*End of document.*
