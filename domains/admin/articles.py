# domains/admin/articles.py
from __future__ import annotations
import re
import json
from datetime import datetime, timezone
from flask import request, redirect, url_for, render_template, abort, jsonify
from app.storage import ensure_article_dirs, save_article
from . import bp  # use the existing admin blueprint

def _slugify(text: str) -> str:
    """
    Basic slugifier: lowercase, strip accents-ish, replace non-alphanum with hyphens, collapse dashes.
    """
    if not text:
        return ""
    t = text.lower()
    # remove accents (quick & dirty fallback)
    accents = (
        ("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"),
        ("ñ", "n"), ("ü", "u"),
    )
    for a, b in accents:
        t = t.replace(a, b)
    t = re.sub(r"[^a-z0-9]+", "-", t)
    t = re.sub(r"-{2,}", "-", t).strip("-")
    return t or "untitled"

@bp.get("/articles/new")
def admin_articles_new():
    """
    Render the New Article form using templates/admin/articles_new.html.
    """
    title = "Admin · New Article"
    return render_template("admin/articles_new.html", title=title)

@bp.post("/articles/new")
def admin_articles_create():
    """
    Create an article.json under data/articles/<slug>/ with:
      - unified 'html' body
      - optional 'image_url' (lead image saved under media/img)
      - optional 'summary_html' (minimal Quill HTML)
    Default behavior for modern (async) saves: return JSON so the editor can stay on the page.
    Fallback for legacy full-page posts: redirect to public view.
    """
    title = (request.form.get("title") or "").strip()
    body_html = (request.form.get("html") or "").strip()
    summary_html = (request.form.get("summary_html") or "").strip()

    if not title:
        abort(400)

    slug = _slugify(title)

    # Ensure folders exist
    ensure_article_dirs(slug)

    # Handle optional lead image upload
    image_url = (request.form.get("lead_image_url") or "").strip()
    try:
        file = request.files.get("lead_image_file")
        if file and getattr(file, "filename", ""):
            # Save into data/articles/<slug>/media/img/<generated>
            from app.storage import media_path  # lazy import to keep single-edit discipline
            import os
            name, ext = os.path.splitext(file.filename or "")
            ext = (ext or ".jpg").lower()
            if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
                ext = ".jpg"
            stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
            fname = f"lead_{stamp}{ext}"
            abs_path = media_path("articles", slug, "img", fname)
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            file.save(str(abs_path))
            image_url = f"/media/articles/{slug}/img/{fname}"
    except Exception:
        # Keep image_url empty if something goes wrong; we don't want to fail article creation
        image_url = image_url or ""

    # Parse taxonomy paths (expects a JSON array of strings)
    tx_raw = (request.form.get("taxonomy_paths") or "[]").strip()
    try:
        tx_val = json.loads(tx_raw)
        if not isinstance(tx_val, list):
            raise ValueError("taxonomy_paths must be a list")
        tx_paths = [str(p).strip() for p in tx_val if isinstance(p, (str, bytes)) and str(p).strip()]
    except Exception:
        tx_paths = []

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload = {
        "slug": slug,
        "title_es": None,   # reserved for future language variants
        "title_en": None,   # reserved for future language variants
        "title": title,     # canonical mother-article title
        "html": body_html,  # unified HTML body
        "summary_html": summary_html,  # minimal HTML for list summary
        "image_url": image_url,        # lead image path (served via /media)
        "status": "draft",
        "tags": [],
        "taxonomy_paths": tx_paths,
        "created_at": now,
        "updated_at": now,
    }

    ok = save_article(slug, payload)
    if not ok:
        abort(500)

    # If this was an async save (fetch/XHR or JSON-preferred), return JSON
    wants_json = (
        request.headers.get("X-Requested-With") in ("XMLHttpRequest", "fetch")
        or request.accept_mimetypes["application/json"] >= request.accept_mimetypes["text/html"]
    )
    if wants_json:
        return jsonify({
            "ok": True,
            "slug": slug,
            "public_url": url_for("public.article_detail", slug=slug),
        }), 200

    # Fallback: legacy full-page form POST should go to the Admin editor
    return redirect(url_for("admin.admin_articles_edit", slug=slug))

@bp.post("/articles/<slug>/delete")
def admin_articles_delete(slug: str):
    """
    Delete an article directory under data/articles/<slug> and return to index.
    Uses app.storage.delete_article(slug). If it returns falsy or raises, 404.
    """
    try:
        # Lazy import to avoid changing the import header above (single-edit rule)
        from app.storage import delete_article
        ok = bool(delete_article(slug))
    except Exception:
        ok = False

    if not ok:
        abort(404)

    return redirect(url_for("admin.admin_articles_index"))

@bp.get("/articles/<slug>/preview")
def admin_articles_preview(slug: str):
    """
    Admin-only preview rendered with the admin layout/bar.
    Loads the article and displays it via templates/admin/articles_preview.html.
    """
    # Lazy import to keep single-edit discipline on imports
    from app.storage import load_article
    from flask import make_response

    article = load_article(slug)
    if not article:
        abort(404)

    title = f"Admin · Preview · {(article.get('title') or slug)}"
    resp = make_response(render_template("admin/articles_preview.html", title=title, slug=slug, article=article))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp

@bp.post("/articles/<slug>/update")
def admin_articles_update(slug: str):
    from app.storage import load_article, save_article
    from flask import jsonify

    article = load_article(slug)
    if not article:
        abort(404)

    i18n = article.get("i18n")
    if not isinstance(i18n, dict):
        i18n = {}
        article["i18n"] = i18n

    edit_lang = (request.form.get("edit_lang") or "").strip().lower()
    if edit_lang in ("base", "mother", "root"):
        edit_lang = ""

    title = (request.form.get("title") or "").strip()
    html = (request.form.get("html") or "").strip()
    summary_html = (request.form.get("summary_html") or "").strip()

    mother_lang_in = (request.form.get("mother_lang") or "").strip().lower()
    if mother_lang_in:
        article["mother_lang"] = mother_lang_in

    status_in = (request.form.get("status") or "").strip().lower()
    action = (request.form.get("action") or "").strip().lower()

    status_old = (article.get("status") or "draft").lower()
    if action == "publish":
        status_new = "published"
    elif action == "unpublish":
        status_new = "draft"
    else:
        status_new = status_in if status_in in ("draft", "published") else status_old

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    if edit_lang:
        slot = dict(i18n.get(edit_lang) or {})
        if title:
            slot["title"] = title
        slot["html"] = html
        if summary_html or ("summary_html" in request.form):
            slot["summary_html"] = summary_html
        i18n[edit_lang] = slot
    else:
        if title:
            article["title"] = title
        article["html"] = html
        if summary_html or ("summary_html" in request.form):
            article["summary_html"] = summary_html

    image_url_keep = (request.form.get("lead_image_url") or "").strip()
    try:
        file = request.files.get("lead_image_file")
        if file and getattr(file, "filename", ""):
            from app.storage import media_path
            import os
            name, ext = os.path.splitext(file.filename or "")
            ext = (ext or ".jpg").lower()
            if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
                ext = ".jpg"
            stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
            fname = f"lead_{stamp}{ext}"
            abs_path = media_path("articles", slug, "img", fname)
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            file.save(str(abs_path))
            article["image_url"] = f"/media/articles/{slug}/img/{fname}"
        else:
            if image_url_keep or ("lead_image_url" in request.form):
                article["image_url"] = image_url_keep
    except Exception:
        if image_url_keep:
            article["image_url"] = image_url_keep

    # Optional taxonomy update on edit
    if "taxonomy_paths" in request.form:
        tx_raw = (request.form.get("taxonomy_paths") or "[]").strip()
        try:
            tx_val = json.loads(tx_raw)
            if not isinstance(tx_val, list):
                raise ValueError("taxonomy_paths must be a list")
            article["taxonomy_paths"] = [str(p).strip() for p in tx_val if isinstance(p, (str, bytes)) and str(p).strip()]
        except Exception:
            # If invalid, leave existing taxonomy_paths untouched
            pass

    # -------------------------------
    # Modules (experimental): accept JSON or field arrays
    # -------------------------------
    def _apply_modules(cleaned_list: list[dict]):
        if cleaned_list:
            article["modules"] = cleaned_list
        else:
            article.pop("modules", None)

    def _clean_modules(rows):
        cleaned: list[dict] = []
        for i, m in enumerate(rows or []):
            try:
                title_m = str((m.get("title") if isinstance(m, dict) else "") or "").strip()
                slug_m = str((m.get("slug") if isinstance(m, dict) else "") or "").strip()
                html_m = str((m.get("html") if isinstance(m, dict) else "") or "").strip()
            except Exception:
                continue
            if not title_m and not html_m:
                continue
            if not slug_m:
                slug_m = f"m{i+1}"
            cleaned.append({"title": title_m or f"Module {i+1}", "slug": slug_m, "html": html_m})
        return cleaned

    modules_applied = False
    raw_modules = request.form.get("modules_json")
    if raw_modules is not None:
        try:
            arr = json.loads((raw_modules or "").strip()) if raw_modules else []
            if isinstance(arr, list):
                _apply_modules(_clean_modules(arr))
                modules_applied = True
        except Exception:
            modules_applied = False

    if not modules_applied:
        try:
            t_list = request.form.getlist("mod_title")
            s_list = request.form.getlist("mod_slug")
            h_list = request.form.getlist("mod_html")
            if t_list or s_list or h_list:
                rows = []
                maxlen = max(len(t_list), len(s_list), len(h_list))
                for i in range(maxlen):
                    rows.append({
                        "title": (t_list[i] if i < len(t_list) else ""),
                        "slug":  (s_list[i] if i < len(s_list) else ""),
                        "html":  (h_list[i] if i < len(h_list) else ""),
                    })
                _apply_modules(_clean_modules(rows))
        except Exception:
            pass

    article["status"] = status_new
    article["updated_at"] = now
    if status_new == "published":
        if not article.get("published_at"):
            article["published_at"] = now
    else:
        article.pop("published_at", None)

    ok = save_article(slug, article)
    if not ok:
        abort(500)

    wants_json = (
        request.headers.get("X-Requested-With") in ("XMLHttpRequest", "fetch")
        or request.accept_mimetypes["application/json"] >= request.accept_mimetypes["text/html"]
    )
    if wants_json:
        return jsonify({
            "ok": True,
            "slug": slug,
            "status": status_new,
            "published_at": article.get("published_at"),
            "public_url": url_for("public.article_detail", slug=slug),
            "edit_lang": (edit_lang or "base"),
            "i18n": list(sorted(i18n.keys())),
            "mother_lang": article.get("mother_lang") or "",
            "modules_count": len(article.get("modules") or []),
        }), 200

    return redirect(url_for("public.article_detail", slug=slug))

@bp.patch("/articles/<slug>/status")
def admin_articles_set_status(slug: str):
    """
    Quick status update for an article from the admin list.
    Body JSON: { "status": "draft"|"published"|"archived" }
    """
    from app.storage import load_article

    try:
        body = request.get_json(force=True, silent=False) or {}
    except Exception:
        return jsonify({"ok": False, "error": "Invalid JSON body."}), 400

    status = str(body.get("status") or "").lower().strip()
    if status not in {"draft", "published", "archived"}:
        return jsonify({"ok": False, "error": "Invalid status."}), 400

    article = load_article(slug)
    if not article:
        return jsonify({"ok": False, "error": "Not found"}), 404

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # Optional: Modules (experimental)
    # Accept either a JSON payload in 'modules_json' or parallel arrays
    # of fields named mod_title/mod_slug/mod_html.
    def _apply_modules(cleaned_list: list[dict]):
        if cleaned_list:
            article["modules"] = cleaned_list
        else:
            article.pop("modules", None)

    def _clean_modules(rows):
        cleaned = []
        for i, m in enumerate(rows):
            try:
                title = str(m.get("title") or "").strip()
                slug_m = str(m.get("slug") or "").strip()
                html_m = str(m.get("html") or "").strip()
            except Exception:
                continue
            if not title and not html_m:
                continue
            if not slug_m:
                slug_m = f"m{i+1}"
            cleaned.append({"title": title or f"Module {i+1}", "slug": slug_m, "html": html_m})
        return cleaned

    modules_applied = False
    raw = request.form.get("modules_json")
    if raw is not None:
        try:
            arr = json.loads((raw or "").strip()) if raw else []
            if isinstance(arr, list):
                _apply_modules(_clean_modules(arr))
                modules_applied = True
        except Exception:
            # fall back to field arrays
            modules_applied = False

    if not modules_applied:
        try:
            titles = request.form.getlist("mod_title")
            slugs = request.form.getlist("mod_slug")
            htmls = request.form.getlist("mod_html")
            if titles or slugs or htmls:
                rows = []
                maxlen = max(len(titles), len(slugs), len(htmls))
                for i in range(maxlen):
                    rows.append({
                        "title": (titles[i] if i < len(titles) else ""),
                        "slug": (slugs[i] if i < len(slugs) else ""),
                        "html": (htmls[i] if i < len(htmls) else ""),
                    })
                _apply_modules(_clean_modules(rows))
        except Exception:
            pass

    # Modules (experimental): accept JSON or parallel arrays
    def _apply_modules(cleaned_list: list[dict]):
        if cleaned_list:
            article["modules"] = cleaned_list
        else:
            article.pop("modules", None)

    def _clean_modules(rows):
        cleaned = []
        for i, m in enumerate(rows):
            try:
                title_m = str((m.get("title") if isinstance(m, dict) else "") or "").strip()
                slug_m = str((m.get("slug") if isinstance(m, dict) else "") or "").strip()
                html_m = str((m.get("html") if isinstance(m, dict) else "") or "").strip()
            except Exception:
                continue
            if not title_m and not html_m:
                continue
            if not slug_m:
                slug_m = f"m{i+1}"
            cleaned.append({"title": title_m or f"Module {i+1}", "slug": slug_m, "html": html_m})
        return cleaned

    modules_applied = False
    raw_modules = request.form.get("modules_json")
    if raw_modules is not None:
        try:
            arr = json.loads((raw_modules or "").strip()) if raw_modules else []
            if isinstance(arr, list):
                _apply_modules(_clean_modules(arr))
                modules_applied = True
        except Exception:
            modules_applied = False

    if not modules_applied:
        try:
            t_list = request.form.getlist("mod_title")
            s_list = request.form.getlist("mod_slug")
            h_list = request.form.getlist("mod_html")
            if t_list or s_list or h_list:
                rows = []
                maxlen = max(len(t_list), len(s_list), len(h_list))
                for i in range(maxlen):
                    rows.append({
                        "title": (t_list[i] if i < len(t_list) else ""),
                        "slug":  (s_list[i] if i < len(s_list) else ""),
                        "html":  (h_list[i] if i < len(h_list) else ""),
                    })
                _apply_modules(_clean_modules(rows))
        except Exception:
            pass
    article["status"] = status
    article["updated_at"] = now
    if status == "published":
        if not article.get("published_at"):
            article["published_at"] = now
    else:
        article.pop("published_at", None)

    ok = save_article(slug, article)
    if not ok:
        return jsonify({"ok": False, "error": "Failed to save"}), 500
    return jsonify({"ok": True, "status": status})
