from __future__ import annotations
from datetime import datetime, timezone
from typing import Any
import os
from pathlib import Path
from werkzeug.utils import secure_filename

from flask import request, jsonify, abort

from . import bp  # admin blueprint
from domains.lessons.models import Lesson
from app.extensions.db import db


def _now_utc():
    return datetime.now(timezone.utc)


def _json() -> dict[str, Any]:
    return request.get_json(silent=True) or {}


@bp.get("/api/lessons")
def api_admin_lessons_list():
    q = Lesson.query.order_by(Lesson.updated_at.desc()).limit(500).all()
    items = [
        {
            "id": l.id,
            "slug": l.slug,
            "title": l.title,
            "locale": l.locale,
            "status": l.status,
            "updated_at": l.updated_at.isoformat() if l.updated_at else None,
        }
        for l in q
    ]
    return jsonify({"items": items})


@bp.post("/api/lessons")
def api_admin_lessons_create():
    data = _json()
    title = (data.get("title") or "").strip() or "Sin título"
    slug = (data.get("slug") or title.lower().replace(" ", "-")).strip()
    locale = (data.get("locale") or "es").strip()
    # Minimal payload
    payload = {
        "version": 1,
        "locale": locale,
        "slug": slug,
        "title": title,
        "settings": {"progress_gate": True, "pass_threshold": 0.8},
        "slides": data.get("slides") or [{"id": "content_1", "type": "content", "elements": []}],
    }
    l = Lesson(slug=slug, title=title, locale=locale, status="draft", json=payload)
    db.session.add(l)
    db.session.commit()
    return jsonify({"id": l.id, "slug": l.slug}), 201


@bp.get("/api/lessons/<int:lesson_id>")
def api_admin_lessons_get(lesson_id: int):
    l = Lesson.query.get_or_404(lesson_id)
    return jsonify({
        "id": l.id,
        "slug": l.slug,
        "title": l.title,
        "locale": l.locale,
        "status": l.status,
        "json": l.json or {},
    })


@bp.put("/api/lessons/<int:lesson_id>")
def api_admin_lessons_update(lesson_id: int):
    l = Lesson.query.get_or_404(lesson_id)
    data = _json()
    # Update metadata
    if "title" in data:
        l.title = (data.get("title") or l.title or "").strip() or l.title
    if "slug" in data and (s := (data.get("slug") or "").strip()):
        l.slug = s
    if "locale" in data and (loc := (data.get("locale") or "").strip()):
        l.locale = loc
    # Update JSON payload
    if "json" in data and isinstance(data["json"], dict):
        l.json = data["json"]
    l.updated_at = _now_utc()
    db.session.commit()
    return jsonify({"ok": True})


@bp.post("/api/lessons/<int:lesson_id>/submit_review")
def api_admin_lessons_submit_review(lesson_id: int):
    l = Lesson.query.get_or_404(lesson_id)
    l.status = "in_review"
    l.updated_at = _now_utc()
    db.session.commit()
    return jsonify({"ok": True})


@bp.post("/api/lessons/<int:lesson_id>/publish")
def api_admin_lessons_publish(lesson_id: int):
    l = Lesson.query.get_or_404(lesson_id)
    l.status = "published"
    l.published_at = _now_utc()
    l.updated_at = _now_utc()
    # Ensure JSON has title/slug/locale sane defaults
    payload = l.json or {}
    payload.setdefault("title", l.title)
    payload.setdefault("slug", l.slug)
    payload.setdefault("locale", l.locale)
    l.json = payload
    db.session.commit()
    return jsonify({"ok": True})

@bp.delete("/api/lessons/<int:lesson_id>")
def api_admin_lessons_delete(lesson_id: int):
    l = Lesson.query.get_or_404(lesson_id)
    db.session.delete(l)
    db.session.commit()
    return jsonify({"ok": True})


@bp.post("/api/media/resolve")
def api_admin_media_resolve():
    """Normalize a Google Drive url -> media:gdrive:<fileId> and basic HEAD validation stub.

    For now, just parse fileId and return a resolved src string; add HEAD check later.
    """
    data = _json()
    url = (data.get("url") or "").strip()
    if not url:
        abort(400)
    file_id = None
    if "/file/d/" in url:
        try:
            file_id = url.split("/file/d/")[1].split("/")[0]
        except Exception:
            file_id = None
    if not file_id and "id=" in url:
        try:
            file_id = url.split("id=")[1].split("&")[0]
        except Exception:
            file_id = None
    if not file_id:
        abort(400)
    return jsonify({
        "storage": "gdrive",
        "file_id": file_id,
        "src": f"media:gdrive:{file_id}",
    })

@bp.post("/api/media/upload")
def api_admin_media_upload():
    """Basic audio upload to static/uploads; returns a src URL."""
    f = request.files.get("file")
    if not f:
        abort(400)
    filename = secure_filename(f.filename or "audio")
    if not filename:
        abort(400)
    root = Path("static") / "uploads"
    root.mkdir(parents=True, exist_ok=True)
    # Avoid collisions
    stem = Path(filename).stem
    suffix = Path(filename).suffix or ".mp3"
    counter = 0
    final_name = filename
    while (root / final_name).exists():
        counter += 1
        final_name = f"{stem}-{counter}{suffix}"
    f.save(root / final_name)
    src = f"/static/uploads/{final_name}"
    return jsonify({"storage": "local", "src": src, "filename": final_name})
