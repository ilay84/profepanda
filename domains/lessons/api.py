from flask import jsonify, request

from . import bp_api
from domains.lessons.models import Lesson
from app.extensions.db import db


@bp_api.get("/<slug_or_id>")
def api_get_lesson(slug_or_id: str):
    """Return published lesson JSON by slug or id; fallback to a sample.

    Matches `slug` first; if slug_or_id is numeric, also tries by id.
    """
    # Try by slug
    lesson: Lesson | None = Lesson.query.filter_by(slug=slug_or_id, status="published").first()
    # Fallback by numeric id
    if lesson is None and slug_or_id.isdigit():
        lesson = Lesson.query.filter_by(id=int(slug_or_id), status="published").first()

    if lesson is not None:
        payload = dict(lesson.json or {})
        payload.setdefault("id", lesson.id)
        payload.setdefault("slug", lesson.slug)
        payload.setdefault("title", lesson.title or "Lección")
        payload.setdefault("locale", lesson.locale or "es")
        payload.setdefault("settings", {"progress_gate": True, "pass_threshold": 0.8})
        slides = payload.get("slides")
        if not isinstance(slides, list):
            if isinstance(slides, dict):
                slides = list(slides.values())
            elif hasattr(slides, "items"):
                slides = list(slides.items())
            else:
                slides = []
        # Fallback: if no slides present, provide a simple MCQ so the player is never blank
        if not slides:
            slides = [{
                "id": "s1",
                "type": "exercise",
                "mode": "mcq",
                "prompt": "Seleccioná la forma correcta del verbo.",
                "stem_html": "Yo _____ español todos los días",
                "choices": [{"id": "a", "text": "hablo"}, {"id": "b", "text": "habla"}],
                "answer": "a"
            }]
        payload["slides"] = slides
        return jsonify(payload)

    # Fallback sample if nothing found
    sample = {
        "version": 1,
        "id": slug_or_id,
        "slug": slug_or_id,
        "locale": "es",
        "title": "Lección de ejemplo",
        "settings": {"progress_gate": True, "pass_threshold": 0.8},
        "slides": [
            {"id": "s1", "type": "exercise", "mode": "mcq",
             "prompt": "Seleccioná la forma correcta del verbo.",
             "stem_html": "Yo _____ español todos los días",
             "choices": [{"id": "a", "text": "hablo"}, {"id": "b", "text": "habla"}],
             "answer": "a"
            }
        ],
    }
    return jsonify(sample)


@bp_api.post("/<lesson_id>/attempt")
def api_post_attempt(lesson_id: str):
    """Accept an attempt payload; respond with correctness and score delta.

    TODO: Evaluate server-side where needed; persist attempt.
    """
    payload = request.get_json(silent=True) or {}
    # Echo back minimal response for now
    return jsonify({"ok": True, "lesson_id": lesson_id, "received": payload})


@bp_api.post("/<lesson_id>/progress")
def api_post_progress(lesson_id: str):
    """Accept progress updates (current slide, completion flag).

    TODO: Persist progress in DB and update streaks/badges.
    """
    payload = request.get_json(silent=True) or {}
    return jsonify({"ok": True, "lesson_id": lesson_id, "received": payload})
