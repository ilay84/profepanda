from __future__ import annotations
from datetime import datetime, timezone
from flask import request, redirect, url_for, render_template, abort, jsonify
from app.storage import load_article, save_article, ensure_article_dirs, media_path
from . import bp  # admin blueprint
import os
import re
import uuid
import json

@bp.get("/articles/<slug>/edit")
def admin_articles_edit(slug: str):
    data = load_article(slug)
    if not data:
        abort(404)

    title_display = data.get("title") or data.get("title_es") or data.get("title_en") or slug
    body_html = data.get("html") or data.get("html_es") or data.get("html_en") or ""
    page_title = f"Admin · Edit · {slug}"

    return render_template(
        "admin/articles_edit.html",
        page_title=page_title,
        slug=slug,
        title_display=title_display,
        body_html=body_html,
        status=(data.get("status") or "draft"),
        article=data,
    )

@bp.post("/articles/<slug>/edit", endpoint="admin_articles_edit_post")
def admin_articles_edit_post(slug: str):
    data = load_article(slug)
    if not data:
        abort(404)

    new_title = (request.form.get("title") or "").strip()
    new_html = (request.form.get("html") or "").strip()
    if not new_title:
        new_title = (data.get("title") or data.get("title_es") or data.get("title_en") or "Sin título").strip()

    ensure_article_dirs(slug)

    updated = dict(data)
    updated["title"] = new_title
    updated["html"] = new_html
    updated["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    if "created_at" not in updated:
        updated["created_at"] = updated["updated_at"]
    if "slug" not in updated:
        updated["slug"] = slug
    if "status" not in updated:
        updated["status"] = "draft"
    if "tags" not in updated:
        updated["tags"] = []

    # Parse taxonomy paths (expects a JSON array of strings)
    tx_raw = (request.form.get("taxonomy_paths") or "[]").strip()
    try:
        tx_val = json.loads(tx_raw)
        if not isinstance(tx_val, list):
            raise ValueError("taxonomy_paths must be a list")
        tx_paths = [str(p).strip() for p in tx_val if isinstance(p, (str, bytes)) and str(p).strip()]
    except Exception:
        tx_paths = []

    # Persist taxonomy selections on update
    updated["taxonomy_paths"] = tx_paths

    ok = save_article(slug, updated)
    if not ok:
        abort(500)

    return redirect(url_for("articles.article_view", slug=slug, _=updated["updated_at"]))

# ─────────────────────────────────────────────────────────────────────────────
# Audio upload endpoint for Example Blocks
# POST /admin/articles/<slug>/upload-audio
# form-data: file = <audio>, optional: basename
# Returns: { ok: true, url, filename }
# ─────────────────────────────────────────────────────────────────────────────

_ALLOWED_EXTS = {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".webm"}

def _safe_filename(name: str) -> str:
    # keep alnum, dash, underscore, dot; lower
    name = name.strip().lower()
    name = re.sub(r"[^a-z0-9._-]+", "-", name)
    name = re.sub(r"-{2,}", "-", name).strip("-")
    return name or "audio"

@bp.post("/articles/<slug>/upload-audio")
def admin_articles_upload_audio(slug: str):
    # Ensure article exists and folders exist
    data = load_article(slug)
    if not data:
        abort(404)
    ensure_article_dirs(slug)

    # Validate file
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"ok": False, "error": "missing_file"}), 400

    # Derive safe base name and extension
    orig = f.filename
    base, ext = os.path.splitext(orig)
    ext = ext.lower()
    if ext not in _ALLOWED_EXTS:
        return jsonify({"ok": False, "error": "unsupported_type", "allowed": sorted(_ALLOWED_EXTS)}), 400

    # Optional caller-provided basename hint
    hint = (request.form.get("basename") or "").strip()
    if hint:
        base = hint

    base = _safe_filename(base) or "audio"
    # Unique suffix
    short = uuid.uuid4().hex[:8]
    filename = f"ex_{base}_{short}{ext}"

    # Absolute path under data/articles/<slug>/media/audio/
    abs_path = media_path("articles", slug, "audio", filename)
    abs_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        f.save(str(abs_path))
    except Exception:
        return jsonify({"ok": False, "error": "save_failed"}), 500

    # Public URL served by app.media blueprint
    url = f"/media/articles/{slug}/audio/{filename}"
    return jsonify({"ok": True, "url": url, "filename": filename}), 200
