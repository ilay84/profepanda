# domains/courses/courses.py
from __future__ import annotations

from pathlib import Path

from flask import Blueprint, jsonify, request, g, send_from_directory, current_app

from app.storage import get_data_root, read_json

bp = Blueprint("courses", __name__)


def _is_preview_allowed() -> bool:
    """
    Allow draft visibility only when:
      - ?preview=1 is present, AND
      - the user is an admin (g.is_admin is set by domains.admin before_app_request)
    """
    try:
        preview = (request.args.get("preview") or "").strip().lower() in {"1", "true", "yes"}
        is_admin = bool(getattr(g, "is_admin", False))
        return bool(preview and is_admin)
    except Exception:
        return False

def _filter_by_publish_status(items: list[dict]) -> list[dict]:
    """
    Hide drafts unless preview is allowed.
    """
    if _is_preview_allowed():
        return items
    out: list[dict] = []
    for it in items:
        status = str((it or {}).get("status") or "").strip().lower()
        if status == "published":
            out.append(it)
    return out

@bp.get("/api/legacy/courses")
def api_courses_list():
    """
    Read-only: list file-backed courses from data/courses/<course_slug>/course.json
    """
    root: Path = get_data_root() / "courses"
    if not root.exists() or not root.is_dir():
        return jsonify({"ok": True, "courses": []}), 200

    courses: list[dict] = []
    for p in sorted(root.iterdir(), key=lambda x: x.name):
        if not p.is_dir():
            continue
        course_json = p / "course.json"
        data = read_json(course_json)
        if not isinstance(data, dict):
            continue

        # Minimal, stable surface area for v1
        courses.append(
            {
                "slug": data.get("slug") or p.name,
                "title": data.get("title") or "",
                "description": data.get("description") or "",
                "status": data.get("status") or "draft",
                "updated_at": data.get("updated_at") or "",
            }
        )

    courses = _filter_by_publish_status(courses)
    return jsonify({"ok": True, "courses": courses}), 200


@bp.get("/api/legacy/courses/<course_slug>/lessons")
def api_course_lessons_list(course_slug: str):
    """
    Read-only: list lessons for a course from
    data/courses/<course_slug>/lessons/<lesson_slug>/lesson.json
    """
    course_root: Path = get_data_root() / "courses" / course_slug
    lessons_root: Path = course_root / "lessons"

    if not lessons_root.exists() or not lessons_root.is_dir():
        return jsonify({"ok": True, "course": course_slug, "lessons": []}), 200

    lessons: list[dict] = []
    for p in sorted(lessons_root.iterdir(), key=lambda x: x.name):
        if not p.is_dir():
            continue
        lesson_json = p / "lesson.json"
        data = read_json(lesson_json)
        if not isinstance(data, dict):
            continue

        lessons.append(
            {
                "slug": data.get("slug") or p.name,
                "title": data.get("title") or "",
                "description": data.get("description") or "",
                "status": data.get("status") or "draft",
                "xp": data.get("xp") or 0,
                "updated_at": data.get("updated_at") or "",
            }
        )

    lessons = _filter_by_publish_status(lessons)
    return jsonify({"ok": True, "course": course_slug, "lessons": lessons}), 200


@bp.get("/api/legacy/courses/<course_slug>/lessons/<lesson_slug>/content")
def api_lesson_content_list(course_slug: str, lesson_slug: str):
    """
    Read-only: list ordered content blocks for a lesson.

    Reads:
      data/courses/<course_slug>/lessons/<lesson_slug>/lesson.json  (optional content_order)
      data/courses/<course_slug>/lessons/<lesson_slug>/content/*.json
    """
    lesson_root: Path = get_data_root() / "courses" / course_slug / "lessons" / lesson_slug
    content_root: Path = lesson_root / "content"
    lesson_json: Path = lesson_root / "lesson.json"

    if not content_root.exists() or not content_root.is_dir():
        return jsonify({"ok": True, "course": course_slug, "lesson": lesson_slug, "content": []}), 200

    # Try to honor content_order from lesson.json, if present.
    order: list[str] = []
    meta = read_json(lesson_json)
    if isinstance(meta, dict):
        raw = meta.get("content_order")
        if isinstance(raw, list):
            order = [str(x) for x in raw if str(x).strip()]

    blocks: list[dict] = []

    if order:
        # Load files by explicit order: "001" -> "001.json"
        for cid in order:
            p = content_root / f"{cid}.json"
            data = read_json(p)
            if isinstance(data, dict):
                blocks.append(data)
    else:
        # Fallback: load all *.json files sorted by filename.
        for p in sorted(content_root.glob("*.json"), key=lambda x: x.name):
            data = read_json(p)
            if isinstance(data, dict):
                blocks.append(data)

    blocks = _filter_by_publish_status(blocks)
    return jsonify({"ok": True, "course": course_slug, "lesson": lesson_slug, "content": blocks}), 200


def _lessons_app_index():
    static_root = Path(current_app.static_folder or "")
    app_root = static_root / "lessons_app"
    index_path = app_root / "index.html"
    if not index_path.exists():
        return (
            "Lessons App build not found. Build the Lessons App and copy the dist/ folder "
            "to static/lessons_app.",
            500,
        )
    resp = send_from_directory(app_root, "index.html")
    # Always revalidate the shell so new asset hashes take effect immediately.
    resp.headers["Cache-Control"] = "no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    return resp


@bp.get("/courses")
@bp.get("/courses/<path:subpath>")
def courses_shell(subpath: str | None = None):
    return _lessons_app_index()


@bp.get("/lesson")
@bp.get("/lesson/<path:subpath>")
def lesson_shell(subpath: str | None = None):
    return _lessons_app_index()


@bp.get("/courses-admin")
@bp.get("/courses-admin/<path:subpath>")
def courses_admin_shell(subpath: str | None = None):
    return _lessons_app_index()
