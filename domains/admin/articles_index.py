# domains/admin/articles_index.py
from __future__ import annotations
from flask import render_template, url_for
from app.storage import list_slugs, load_article
from . import bp

@bp.get("/articles/")
def admin_articles_index():
    # local import to avoid changing header imports
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
        })

    title = "Admin · Articles"
    return render_template("admin/articles_index.html", title=title, rows=rows)
