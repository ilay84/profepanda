# domains/admin/articles_index.py
from __future__ import annotations
from flask import render_template
from app.storage import list_slugs, load_article
from . import bp
import json
from pathlib import Path


def _load_grammar_chapters():
    try:
        base = Path(__file__).resolve().parents[1].parent  # project root
        path = base / "data" / "taxonomy" / "grammar_chapters.json"
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []


@bp.get("/articles/")
def admin_articles_index():
    from flask import request

    status_filter = (request.args.get("status") or "").lower()  # '', 'draft', 'published', 'archived'

    slugs = list_slugs("articles")
    rows = []
    for s in slugs:
        data = load_article(s) or {}
        status = (data.get("status") or "draft").lower()
        if status_filter in ("draft", "published", "archived") and status != status_filter:
            continue
        title = data.get("title") or data.get("title_es") or data.get("title_en") or s
        rows.append({
            "slug": s,
            "title": title,
            "status": status,
            "type": (data.get("type") or "structure").lower(),
            "category_id": (data.get("category_id") or "").strip(),
            "order_index": data.get("order_index"),
        })

    chapters = _load_grammar_chapters()
    grammar_sections = []
    for c in chapters:
        if isinstance(c, dict):
            grammar_sections.append({
                "id": c.get("id") or "",
                "title_es": c.get("title_es") or "",
                "title_en": c.get("title_en") or "",
                "items": []
            })
    gram_misc = {"id": "_misc", "title_es": "Sin sección", "title_en": "No section", "items": []}
    comm_items = []

    def sort_key(item):
        oi = item.get("order_index")
        try:
            oi = int(oi)
        except Exception:
            oi = 10**6
        return (oi, item.get("title", "").lower())

    for r in rows:
        if r["type"] == "structure":
            cid = r.get("category_id") or ""
            target = None
            for sec in grammar_sections:
                if sec["id"] == cid:
                    target = sec
                    break
            if not target:
                target = gram_misc
            target["items"].append(r)
        else:
            comm_items.append(r)

    for sec in grammar_sections:
        sec["items"] = sorted(sec["items"], key=sort_key)
    gram_misc["items"] = sorted(gram_misc["items"], key=sort_key)
    comm_items = sorted(comm_items, key=sort_key)

    title = "Estructuras y lecciones"
    return render_template(
        "admin/articles_index.html",
        title=title,
        rows=rows,
        grammar_sections=grammar_sections,
        grammar_misc=gram_misc,
        comm_items=comm_items,
        status_filter=status_filter,
    )


@bp.get("/language-structures-and-lessons/")
def admin_articles_index_alt():
    return admin_articles_index()
