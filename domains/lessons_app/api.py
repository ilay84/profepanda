from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
import uuid

import re

from flask import jsonify, request, send_file
from flask_login import current_user

from app.storage import get_data_root, read_json, write_json
from . import bp

DATA_ROOT = get_data_root() / "lessons_app"
COURSES_PATH = DATA_ROOT / "courses.json"
LESSONS_PATH = DATA_ROOT / "lessons.json"
EXERCISES_PATH = DATA_ROOT / "exercises.json"
PROGRESS_PATH = DATA_ROOT / "progress.json"
ENROLLMENTS_PATH = DATA_ROOT / "enrollments.json"
UNITS_PATH = DATA_ROOT / "units.json"
AUDIO_ROOT = DATA_ROOT / "media" / "audio"
IMAGE_ROOT = DATA_ROOT / "media" / "images"

ALLOWED_AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".ogg", ".webm"}
ALLOWED_IMAGE_EXTS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".webp",
    ".avif",
}


def _read_list(path: Path) -> list[dict]:
    data = read_json(path)
    return data if isinstance(data, list) else []


def _write_list(path: Path, items: list[dict]) -> bool:
    return write_json(path, items, pretty=True)


def _is_admin() -> bool:
    if not getattr(current_user, "is_authenticated", False):
        return False
    if getattr(current_user, "status", None) != "active":
        return False
    return getattr(current_user, "role", None) in {"author", "editor", "super"}


def _current_user_email() -> str:
    if not getattr(current_user, "is_authenticated", False):
        return ""
    return (getattr(current_user, "email", "") or "").strip().lower()


def _find_course(course_id: str) -> dict | None:
    courses = _read_list(COURSES_PATH)
    for course in courses:
        if str(course.get("id") or "") == course_id:
            return course
    return None


def _course_access_level(course: dict) -> str:
    level = str(course.get("access_level") or "public").strip().lower()
    return level if level in {"public", "private", "paid"} else "public"


def _enrolled_course_ids(user_email: str) -> set[str]:
    if not user_email:
        return set()
    enrollments = _read_list(ENROLLMENTS_PATH)
    return {
        str(e.get("course_id") or "")
        for e in enrollments
        if (e.get("user_email") or "").strip().lower() == user_email
        and (e.get("status") or "active") != "canceled"
    }


def _is_enrolled_in_course(course_id: str, user_email: str) -> bool:
    if not user_email:
        return False
    return course_id in _enrolled_course_ids(user_email)


def _today_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def _yesterday_iso() -> str:
    return (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")


def _require_admin():
    if not _is_admin():
        return jsonify({"error": "Admin required"}), 403
    return None


def _log_exercise_debug(action: str, payload: dict, ok: bool, error: str | None = None) -> None:
    try:
        log_path = DATA_ROOT / "exercises_save_debug.log"
        entry = {
            "ts": datetime.utcnow().isoformat() + "Z",
            "action": action,
            "ok": ok,
            "error": error or "",
            "lesson_id": payload.get("lesson_id"),
            "type": payload.get("type"),
            "id": payload.get("id"),
        }
        with log_path.open("a", encoding="utf-8") as handle:
            handle.write(f"{entry}\n")
    except Exception:
        return None


def _safe_path_segment(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9_-]+", "-", value.strip())
    return value.strip("-") or "misc"


@bp.get("/api/me")
def api_me():
    is_auth = bool(getattr(current_user, "is_authenticated", False))
    if is_auth:
        role = "admin" if _is_admin() else "student"
        return jsonify(
            {
                "email": getattr(current_user, "email", "") or "",
                "full_name": getattr(current_user, "name", "") or "",
                "role": role,
                "role_raw": getattr(current_user, "role", None),
                "status_raw": getattr(current_user, "status", None),
                "user_id": getattr(current_user, "id", None),
                "is_authenticated": is_auth,
            }
        )
    return jsonify(
        {
            "email": "",
            "full_name": "",
            "role": "student",
            "role_raw": None,
            "status_raw": None,
            "user_id": None,
            "is_authenticated": False,
        }
    )


@bp.get("/api/courses")
def api_courses():
    courses = _read_list(COURSES_PATH)
    preview = (request.args.get("preview") or "").strip().lower() in {"1", "true", "yes"}
    view = (request.args.get("view") or "").strip().lower()
    user_email = _current_user_email()
    enrolled_course_ids = _enrolled_course_ids(user_email)
    if not (preview and _is_admin()):
        courses = [c for c in courses if c.get("is_published")]
    if view != "my":
        courses = [c for c in courses if _course_access_level(c) != "private"]
    if view == "my":
        if not user_email:
            return jsonify([])
        courses = [c for c in courses if str(c.get("id") or "") in enrolled_course_ids]
    if user_email:
        for course in courses:
            course["is_enrolled"] = str(course.get("id") or "") in enrolled_course_ids
    courses.sort(key=lambda c: (c.get("order") or 0, str(c.get("title") or "")))
    return jsonify(courses)


@bp.post("/api/courses")
def api_courses_create():
    guard = _require_admin()
    if guard:
        return guard
    payload = request.get_json(silent=True) or {}
    courses = _read_list(COURSES_PATH)
    course_id = str(payload.get("id") or "").strip()
    if not course_id:
        course_id = f"course-{int(datetime.utcnow().timestamp())}"
    if any(str(c.get("id") or "") == course_id for c in courses):
        return jsonify({"error": "Course id already exists"}), 400
    payload["id"] = course_id
    courses.append(payload)
    if not _write_list(COURSES_PATH, courses):
        return jsonify({"error": "Failed to save course"}), 500
    return jsonify(payload), 201


@bp.put("/api/courses/<course_id>")
def api_courses_update(course_id: str):
    guard = _require_admin()
    if guard:
        return guard
    payload = request.get_json(silent=True) or {}
    courses = _read_list(COURSES_PATH)
    for idx, course in enumerate(courses):
        if str(course.get("id") or "") == course_id:
            payload["id"] = course_id
            courses[idx] = {**course, **payload}
            if not _write_list(COURSES_PATH, courses):
                return jsonify({"error": "Failed to save course"}), 500
            return jsonify(courses[idx])
    return jsonify({"error": "Course not found"}), 404


@bp.delete("/api/courses/<course_id>")
def api_courses_delete(course_id: str):
    guard = _require_admin()
    if guard:
        return guard
    courses = _read_list(COURSES_PATH)
    next_courses = [c for c in courses if str(c.get("id") or "") != course_id]
    if len(next_courses) == len(courses):
        return jsonify({"error": "Course not found"}), 404
    if not _write_list(COURSES_PATH, next_courses):
        return jsonify({"error": "Failed to delete course"}), 500
    return jsonify({"ok": True})


@bp.get("/api/courses/<course_id>")
def api_course(course_id: str):
    courses = _read_list(COURSES_PATH)
    preview = (request.args.get("preview") or "").strip().lower() in {"1", "true", "yes"}
    user_email = _current_user_email()
    for c in courses:
        if str(c.get("id") or "") == course_id:
            if preview and _is_admin():
                return jsonify(c)
            if not c.get("is_published"):
                return jsonify({"error": "Course not found"}), 404
            if _course_access_level(c) == "private" and not _is_enrolled_in_course(
                course_id, user_email
            ):
                return jsonify({"error": "Course not found"}), 404
            return jsonify(c)
    return jsonify({"error": "Course not found"}), 404


@bp.get("/api/courses/<course_id>/lessons")
def api_course_lessons(course_id: str):
    lessons = _read_list(LESSONS_PATH)
    preview = (request.args.get("preview") or "").strip().lower() in {"1", "true", "yes"}
    user_email = _current_user_email()
    course = _find_course(course_id)
    if not course:
        return jsonify([])
    if not (preview and _is_admin()):
        if not course.get("is_published"):
            return jsonify([])
        if _course_access_level(course) == "private" and not _is_enrolled_in_course(
            course_id, user_email
        ):
            return jsonify([])
    lessons = [l for l in lessons if str(l.get("course_id") or "") == course_id]
    if not (preview and _is_admin()):
        lessons = [l for l in lessons if l.get("is_published")]
    lessons.sort(key=lambda l: (l.get("order") or 0, str(l.get("title") or "")))
    return jsonify(lessons)


@bp.post("/api/lessons")
def api_lessons_create():
    guard = _require_admin()
    if guard:
        return guard
    payload = request.get_json(silent=True) or {}
    lessons = _read_list(LESSONS_PATH)
    lesson_id = str(payload.get("id") or "").strip()
    if not lesson_id:
        lesson_id = f"lesson-{int(datetime.utcnow().timestamp())}"
    if any(str(l.get("id") or "") == lesson_id for l in lessons):
        return jsonify({"error": "Lesson id already exists"}), 400
    payload["id"] = lesson_id
    lessons.append(payload)
    if not _write_list(LESSONS_PATH, lessons):
        return jsonify({"error": "Failed to save lesson"}), 500
    return jsonify(payload), 201


@bp.put("/api/lessons/<lesson_id>")
def api_lessons_update(lesson_id: str):
    guard = _require_admin()
    if guard:
        return guard
    payload = request.get_json(silent=True) or {}
    lessons = _read_list(LESSONS_PATH)
    for idx, lesson in enumerate(lessons):
        if str(lesson.get("id") or "") == lesson_id:
            payload["id"] = lesson_id
            lessons[idx] = {**lesson, **payload}
            if not _write_list(LESSONS_PATH, lessons):
                return jsonify({"error": "Failed to save lesson"}), 500
            return jsonify(lessons[idx])
    return jsonify({"error": "Lesson not found"}), 404


@bp.delete("/api/lessons/<lesson_id>")
def api_lessons_delete(lesson_id: str):
    guard = _require_admin()
    if guard:
        return guard
    lessons = _read_list(LESSONS_PATH)
    next_lessons = [l for l in lessons if str(l.get("id") or "") != lesson_id]
    if len(next_lessons) == len(lessons):
        return jsonify({"error": "Lesson not found"}), 404
    if not _write_list(LESSONS_PATH, next_lessons):
        return jsonify({"error": "Failed to delete lesson"}), 500
    return jsonify({"ok": True})


@bp.get("/api/lessons/<lesson_id>")
def api_lesson(lesson_id: str):
    lessons = _read_list(LESSONS_PATH)
    preview = (request.args.get("preview") or "").strip().lower() in {"1", "true", "yes"}
    for l in lessons:
        if str(l.get("id") or "") == lesson_id:
            if l.get("is_published") or (preview and _is_admin()):
                return jsonify(l)
            return jsonify({"error": "Lesson not found"}), 404
    return jsonify({"error": "Lesson not found"}), 404


@bp.get("/api/lessons/<lesson_id>/exercises")
def api_lesson_exercises(lesson_id: str):
    exercises = _read_list(EXERCISES_PATH)
    out = [e for e in exercises if str(e.get("lesson_id") or "") == lesson_id]
    out.sort(key=lambda e: (e.get("order") or 0, str(e.get("id") or "")))
    return jsonify(out)


@bp.get("/api/units")
def api_units_list():
    course_id = (request.args.get("course_id") or request.args.get("courseId") or "").strip()
    if not course_id:
        return jsonify([]), 400

    course = _find_course(course_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404
    if not (_is_admin() or course.get("is_published")):
        return jsonify({"error": "Course not found"}), 404

    units = _read_list(UNITS_PATH)
    out = [u for u in units if str(u.get("course_id") or "") == course_id]
    out.sort(key=lambda u: (u.get("order") or 0, str(u.get("title") or "")))
    return jsonify(out)


@bp.post("/api/units")
def api_units_create():
    guard = _require_admin()
    if guard:
        return guard

    payload = request.get_json(silent=True) or {}
    course_id = str(payload.get("course_id") or "").strip()
    title = str(payload.get("title") or "").strip()
    if not course_id or not title:
        return jsonify({"error": "Missing course_id or title"}), 400

    units = _read_list(UNITS_PATH)
    unit_id = str(payload.get("id") or "").strip()
    if not unit_id:
        unit_id = f"unit-{int(datetime.utcnow().timestamp())}"
    if any(str(u.get("id") or "") == unit_id for u in units):
        return jsonify({"error": "Unit id already exists"}), 400

    order = payload.get("order")
    if not isinstance(order, int):
        max_order = max((int(u.get("order") or 0) for u in units if str(u.get("course_id") or "") == course_id), default=0)
        order = max_order + 1

    unit = {
        "id": unit_id,
        "course_id": course_id,
        "title": title,
        "description": str(payload.get("description") or "").strip(),
        "order": int(order),
    }
    units.append(unit)
    if not _write_list(UNITS_PATH, units):
        return jsonify({"error": "Failed to save unit"}), 500
    return jsonify(unit), 201


@bp.put("/api/units/<unit_id>")
def api_units_update(unit_id: str):
    guard = _require_admin()
    if guard:
        return guard

    payload = request.get_json(silent=True) or {}
    units = _read_list(UNITS_PATH)
    for idx, unit in enumerate(units):
        if str(unit.get("id") or "") == unit_id:
            payload["id"] = unit_id
            units[idx] = {**unit, **payload}
            if not _write_list(UNITS_PATH, units):
                return jsonify({"error": "Failed to save unit"}), 500
            return jsonify(units[idx])
    return jsonify({"error": "Unit not found"}), 404


@bp.delete("/api/units/<unit_id>")
def api_units_delete(unit_id: str):
    guard = _require_admin()
    if guard:
        return guard

    units = _read_list(UNITS_PATH)
    next_units = [u for u in units if str(u.get("id") or "") != unit_id]
    if len(next_units) == len(units):
        return jsonify({"error": "Unit not found"}), 404

    lessons = _read_list(LESSONS_PATH)
    updated_lessons = []
    for lesson in lessons:
        if str(lesson.get("unit_id") or "") == unit_id:
            lesson = {**lesson, "unit_id": ""}
        updated_lessons.append(lesson)

    if not _write_list(UNITS_PATH, next_units):
        return jsonify({"error": "Failed to delete unit"}), 500
    if updated_lessons != lessons:
        _write_list(LESSONS_PATH, updated_lessons)

    return jsonify({"ok": True})


@bp.post("/api/exercises")
def api_exercises_create():
    guard = _require_admin()
    if guard:
        return guard
    payload = request.get_json(silent=True) or {}
    exercises = _read_list(EXERCISES_PATH)
    ex_id = str(payload.get("id") or "").strip()
    if not ex_id:
        ex_id = f"ex-{int(datetime.utcnow().timestamp())}"
    if any(str(e.get("id") or "") == ex_id for e in exercises):
        ex_id = f"ex-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:8]}"
        while any(str(e.get("id") or "") == ex_id for e in exercises):
            ex_id = f"ex-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:8]}"
    payload["id"] = ex_id
    exercises.append(payload)
    if not _write_list(EXERCISES_PATH, exercises):
        _log_exercise_debug("create", payload, False, "write_failed")
        return jsonify({"error": "Failed to save exercise"}), 500
    _log_exercise_debug("create", payload, True, None)
    return jsonify(payload), 201


@bp.put("/api/exercises/<exercise_id>")
def api_exercises_update(exercise_id: str):
    guard = _require_admin()
    if guard:
        return guard
    payload = request.get_json(silent=True) or {}
    exercises = _read_list(EXERCISES_PATH)
    for idx, ex in enumerate(exercises):
        if str(ex.get("id") or "") == exercise_id:
            payload["id"] = exercise_id
            exercises[idx] = {**ex, **payload}
            if not _write_list(EXERCISES_PATH, exercises):
                _log_exercise_debug("update", payload, False, "write_failed")
                return jsonify({"error": "Failed to save exercise"}), 500
            _log_exercise_debug("update", payload, True, None)
            return jsonify(exercises[idx])
    _log_exercise_debug("update", {**payload, "id": exercise_id}, False, "not_found")
    return jsonify({"error": "Exercise not found"}), 404


@bp.delete("/api/exercises/<exercise_id>")
def api_exercises_delete(exercise_id: str):
    guard = _require_admin()
    if guard:
        return guard
    exercises = _read_list(EXERCISES_PATH)
    next_exercises = [e for e in exercises if str(e.get("id") or "") != exercise_id]
    if len(next_exercises) == len(exercises):
        return jsonify({"error": "Exercise not found"}), 404
    if not _write_list(EXERCISES_PATH, next_exercises):
        return jsonify({"error": "Failed to delete exercise"}), 500
    return jsonify({"ok": True})


@bp.post("/api/lessons-audio")
def api_lessons_audio_upload():
    guard = _require_admin()
    if guard:
        return guard
    if "file" not in request.files:
        return jsonify({"error": "Missing file"}), 400

    uploaded = request.files["file"]
    if not uploaded or not uploaded.filename:
        return jsonify({"error": "Missing filename"}), 400

    suffix = Path(uploaded.filename).suffix.lower()
    if suffix not in ALLOWED_AUDIO_EXTS:
        return jsonify({"error": "Unsupported file type"}), 400

    lesson_id = (request.form.get("lesson_id") or "").strip()
    context = (request.form.get("context") or "").strip()
    parts = []
    if lesson_id:
        parts.append(_safe_path_segment(lesson_id))
    if context:
        parts.append(_safe_path_segment(context))
    target_dir = AUDIO_ROOT.joinpath(*parts) if parts else AUDIO_ROOT
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{suffix}"
    target_path = target_dir / filename
    uploaded.save(target_path)

    rel_path = target_path.relative_to(AUDIO_ROOT).as_posix()
    return jsonify({"url": f"/media/lessons-audio/{rel_path}", "path": rel_path}), 201


@bp.get("/media/lessons-audio/<path:filename>")
def api_lessons_audio_fetch(filename: str):
    audio_root = AUDIO_ROOT.resolve()
    target = (audio_root / filename).resolve()
    if not str(target).startswith(str(audio_root)):
        return jsonify({"error": "Not found"}), 404
    if not target.exists() or not target.is_file():
        return jsonify({"error": "Not found"}), 404
    return send_file(target, conditional=True)


@bp.post("/api/lessons-images")
def api_lessons_images_upload():
    guard = _require_admin()
    if guard:
        return guard
    if "file" not in request.files:
        return jsonify({"error": "Missing file"}), 400

    uploaded = request.files["file"]
    if not uploaded or not uploaded.filename:
        return jsonify({"error": "Missing filename"}), 400

    suffix = Path(uploaded.filename).suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTS:
        return jsonify({"error": "Unsupported file type"}), 400

    lesson_id = (request.form.get("lesson_id") or "").strip()
    course_id = (request.form.get("course_id") or "").strip()
    context = (request.form.get("context") or "").strip()
    parts = []
    if course_id:
        parts.append(_safe_path_segment(course_id))
    if lesson_id:
        parts.append(_safe_path_segment(lesson_id))
    if context:
        parts.append(_safe_path_segment(context))
    target_dir = IMAGE_ROOT.joinpath(*parts) if parts else IMAGE_ROOT
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{suffix}"
    target_path = target_dir / filename
    uploaded.save(target_path)

    rel_path = target_path.relative_to(IMAGE_ROOT).as_posix()
    return jsonify({"url": f"/media/lessons-images/{rel_path}", "path": rel_path}), 201


@bp.get("/media/lessons-images/<path:filename>")
def api_lessons_images_fetch(filename: str):
    image_root = IMAGE_ROOT.resolve()
    target = (image_root / filename).resolve()
    if not str(target).startswith(str(image_root)):
        return jsonify({"error": "Not found"}), 404
    if not target.exists() or not target.is_file():
        return jsonify({"error": "Not found"}), 404
    return send_file(target, conditional=True)


@bp.get("/api/progress/user")
def api_progress_user():
    email = (request.args.get("email") or "").strip()
    if not email and getattr(current_user, "is_authenticated", False):
        email = getattr(current_user, "email", "") or ""
    if not email:
        email = "guest"
    progress = _read_list(PROGRESS_PATH)
    return jsonify([p for p in progress if p.get("user_email") == email])


@bp.post("/api/progress/lesson-complete")
def api_progress_lesson_complete():
    payload = request.get_json(silent=True) or {}
    user_email = (payload.get("userEmail") or payload.get("user_email") or "").strip()
    if not user_email and getattr(current_user, "is_authenticated", False):
        user_email = getattr(current_user, "email", "") or ""
    if not user_email:
        user_email = "guest"

    course_id = str(payload.get("courseId") or payload.get("course_id") or "").strip()
    lesson_id = str(payload.get("lessonId") or payload.get("lesson_id") or "").strip()
    xp_reward = payload.get("xpReward") or payload.get("xp_reward") or 0

    if not course_id or not lesson_id:
        return jsonify({"error": "Missing courseId or lessonId"}), 400

    progress = _read_list(PROGRESS_PATH)
    existing = None
    for p in progress:
        if p.get("user_email") == user_email and p.get("course_id") == course_id:
            existing = p
            break

    today = _today_iso()
    yesterday = _yesterday_iso()

    if existing is None:
        existing = {
            "id": f"{user_email}::{course_id}",
            "user_email": user_email,
            "course_id": course_id,
            "completed_lessons": [],
            "total_xp": 0,
            "current_streak": 0,
            "enrolled_date": today,
            "last_activity_date": "",
        }
        progress.append(existing)

    completed = set(existing.get("completed_lessons") or [])
    completed.add(lesson_id)

    streak = int(existing.get("current_streak") or 0)
    if existing.get("last_activity_date") != today:
        streak = streak + 1 if existing.get("last_activity_date") == yesterday else 1

    try:
        xp_value = int(xp_reward)
    except Exception:
        xp_value = 0

    existing["completed_lessons"] = sorted(completed)
    existing["total_xp"] = int(existing.get("total_xp") or 0) + xp_value
    existing["current_streak"] = streak
    existing["last_activity_date"] = today

    if not _write_list(PROGRESS_PATH, progress):
        return jsonify({"error": "Failed to save progress"}), 500

    return jsonify(existing)


@bp.get("/api/enrollments")
def api_enrollments_list():
    user_email = _current_user_email()
    if not user_email and not _is_admin():
        return jsonify([]), 401

    enrollments = _read_list(ENROLLMENTS_PATH)
    if _is_admin() and (request.args.get("all") or "").strip().lower() in {"1", "true", "yes"}:
        return jsonify(enrollments)

    return jsonify(
        [
            e
            for e in enrollments
            if (e.get("user_email") or "").strip().lower() == user_email
        ]
    )


@bp.post("/api/enrollments")
def api_enrollments_create():
    user_email = _current_user_email()
    if not user_email:
        return jsonify({"error": "Authentication required"}), 401

    payload = request.get_json(silent=True) or {}
    course_id = str(payload.get("course_id") or payload.get("courseId") or "").strip()
    if not course_id:
        return jsonify({"error": "Missing course_id"}), 400

    enrollments = _read_list(ENROLLMENTS_PATH)
    for e in enrollments:
        if (
            (e.get("user_email") or "").strip().lower() == user_email
            and str(e.get("course_id") or "") == course_id
            and (e.get("status") or "active") != "canceled"
        ):
            return jsonify(e)

    enrollment = {
        "id": f"{user_email}::{course_id}",
        "user_email": user_email,
        "course_id": course_id,
        "status": "active",
        "enrolled_at": datetime.utcnow().isoformat(),
    }
    enrollments.append(enrollment)
    if not _write_list(ENROLLMENTS_PATH, enrollments):
        return jsonify({"error": "Failed to save enrollment"}), 500
    return jsonify(enrollment), 201


@bp.delete("/api/enrollments/<course_id>")
def api_enrollments_delete(course_id: str):
    user_email = _current_user_email()
    if not user_email:
        return jsonify({"error": "Authentication required"}), 401

    enrollments = _read_list(ENROLLMENTS_PATH)
    updated = []
    removed = None
    for e in enrollments:
        if (
            (e.get("user_email") or "").strip().lower() == user_email
            and str(e.get("course_id") or "") == course_id
            and (e.get("status") or "active") != "canceled"
        ):
            e = {**e, "status": "canceled", "canceled_at": datetime.utcnow().isoformat()}
            removed = e
        updated.append(e)

    if removed is None:
        return jsonify({"error": "Enrollment not found"}), 404
    if not _write_list(ENROLLMENTS_PATH, updated):
        return jsonify({"error": "Failed to update enrollment"}), 500
    return jsonify(removed)
