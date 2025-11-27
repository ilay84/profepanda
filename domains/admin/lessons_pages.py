from __future__ import annotations
from datetime import datetime, timezone
from flask import request, render_template, redirect, url_for, abort, flash

from . import bp  # admin blueprint
from domains.lessons.models import Lesson, Unit
from app.extensions.db import db


@bp.get("/lessons")
def lessons_index():
    lessons = Lesson.query.order_by(Lesson.updated_at.desc()).limit(200).all()
    return render_template("admin/lessons_index.html", lessons=lessons)


@bp.get("/lessons/new")
def lessons_new():
    return render_template("admin/lessons_edit.html", lesson=None)


@bp.post("/lessons/new")
def lessons_create():
    title = (request.form.get("title") or "").strip() or "Sin título"
    slug = (request.form.get("slug") or title.lower().replace(" ", "-")).strip()
    locale = (request.form.get("locale") or "es").strip()
    json_payload = {
        "version": 1,
        "locale": locale,
        "slug": slug,
        "title": title,
        "settings": {"progress_gate": True, "pass_threshold": 0.8},
        "slides": [],
    }
    l = Lesson(slug=slug, title=title, locale=locale, status="draft", json=json_payload)
    db.session.add(l)
    db.session.commit()
    return redirect(url_for("admin.lessons_edit", lesson_id=l.id))


@bp.get("/lessons/<int:lesson_id>")
def lessons_edit(lesson_id: int):
    lesson = Lesson.query.get_or_404(lesson_id)
    return render_template("admin/lessons_edit.html", lesson=lesson)


@bp.post("/lessons/<int:lesson_id>/publish")
def lessons_publish(lesson_id: int):
    lesson = Lesson.query.get_or_404(lesson_id)
    lesson.status = "published"
    lesson.published_at = datetime.now(timezone.utc)
    db.session.commit()
    flash("Lesson published", "success")
    return redirect(url_for("admin.lessons_edit", lesson_id=lesson.id))


@bp.get("/lessons/examples")
def lessons_examples():
    """Simple page listing example preview slugs that route to the public player.

    The API stub serves placeholder JSON for any slug, so these links will work
    without needing real DB content yet.
    """
    examples = [
        {"title": "MCQ Demo", "slug": "mcq-demo"},
        {"title": "Dictation Demo", "slug": "dictation-demo"},
    ]
    return render_template("admin/lessons_examples.html", examples=examples)


def _ensure_lesson(slug: str, title: str, slides: list[dict], locale: str = "es") -> Lesson:
    existing = Lesson.query.filter_by(slug=slug).first()
    if existing:
        # update slides minimally to keep idempotent behavior
        payload = existing.json or {}
        payload.update({"version": 1, "locale": locale, "slug": slug, "title": title, "slides": slides})
        existing.json = payload
        existing.status = existing.status or "published"
        if existing.status == "published" and not existing.published_at:
            existing.published_at = datetime.now(timezone.utc)
        db.session.commit()
        return existing
    payload = {
        "version": 1,
        "locale": locale,
        "slug": slug,
        "title": title,
        "settings": {"progress_gate": True, "pass_threshold": 0.8},
        "slides": slides,
    }
    l = Lesson(slug=slug, title=title, locale=locale, status="published", json=payload)
    l.published_at = datetime.now(timezone.utc)
    db.session.add(l)
    db.session.commit()
    return l


@bp.post("/lessons/seed")
def lessons_seed():
    """Seed a couple of demo lessons (idempotent)."""
    mcq_slides = [
        {"id": "mcq1", "type": "exercise", "mode": "mcq",
         "prompt": "Seleccioná la forma correcta del verbo.",
         "stem_html": "Yo _____ español todos los días",
         "choices": [
            {"id": "a", "text": "hablo"}, {"id": "b", "text": "habla"},
            {"id": "c", "text": "hablamos"}, {"id": "d", "text": "hablás"}
         ],
         "answer": "a",
         "feedback": {"correct": "¡Bien!", "incorrect": "Revisa la terminación para 'yo'."}
        },
        {"id": "mcq2", "type": "exercise", "mode": "mcq",
         "prompt": "Seleccioná la forma correcta del verbo.",
         "stem_html": "Ella _____ café por la mañana",
         "choices": [
            {"id": "a", "text": "bebo"}, {"id": "b", "text": "bebe"},
            {"id": "c", "text": "bebemos"}, {"id": "d", "text": "bebés"}
         ],
         "answer": "b",
         "feedback": {"correct": "¡Correcto!", "incorrect": "Para 'ella', usá -e."}
        },
        {"id": "mcq3", "type": "exercise", "mode": "mcq",
         "prompt": "Seleccioná la forma correcta del verbo.",
         "stem_html": "Nosotros _____ en Buenos Aires",
         "choices": [
            {"id": "a", "text": "vive"}, {"id": "b", "text": "vivo"},
            {"id": "c", "text": "vivimos"}, {"id": "d", "text": "vivís"}
         ],
         "answer": "c",
         "feedback": {"correct": "¡Excelente!", "incorrect": "Para 'nosotros', usá -imos."}
        }
    ]
    dict_slides = [
        {"id": "d1", "type": "exercise", "mode": "dictation",
         "answer": "Hola, ¿cómo estás?", "grading": {"accents": "required", "punctuation": "advisory"}}
    ]

    _ensure_lesson("mcq-demo", "Unidad 1 · Presente regular", mcq_slides)
    _ensure_lesson("dictation-demo", "Dictation Demo", dict_slides)
    flash("Seeded example lessons.", "success")
    return redirect(url_for("admin.lessons_index"))


# Convenience: allow GET to trigger the same seeding logic from the address bar.
# Note: This performs a write on GET, but is limited to the admin blueprint.
@bp.get("/lessons/seed")
def lessons_seed_get():
    return lessons_seed()
