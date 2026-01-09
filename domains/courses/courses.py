# domains/courses/courses.py
from __future__ import annotations

from pathlib import Path
from flask import Blueprint, jsonify, render_template, request, g
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

@bp.get("/api/courses")
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


@bp.get("/api/courses/<course_slug>/lessons")
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


@bp.get("/api/courses/<course_slug>/lessons/<lesson_slug>/content")
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


@bp.get("/courses")
def courses_index():
    """
    Public: minimal Courses index page.
    Shows published courses by default.
    Admins can preview drafts via ?preview=1.
    """
    root: Path = get_data_root() / "courses"
    courses: list[dict] = []

    if root.exists() and root.is_dir():
        for p in sorted(root.iterdir(), key=lambda x: x.name):
            if not p.is_dir():
                continue
            course_json = p / "course.json"
            data = read_json(course_json)
            if not isinstance(data, dict):
                continue

            courses.append(
                {
                    "slug": data.get("slug") or p.name,
                    "title": data.get("title") or (data.get("slug") or p.name),
                    "description": data.get("description") or "",
                    "status": data.get("status") or "draft",
                }
            )

    courses = _filter_by_publish_status(courses)

    html = """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Courses</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; }
          h1 { margin: 0 0 12px 0; }
          .hint { color: #555; margin: 0 0 18px 0; }
          .card { border: 1px solid #e5e5e5; border-radius: 12px; padding: 14px 16px; margin: 12px 0; }
          .title { font-weight: 700; font-size: 16px; margin: 0 0 6px 0; }
          .desc { margin: 0; color: #333; }
          .meta { margin-top: 8px; font-size: 12px; color: #666; }
          a { color: inherit; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        {% include "_public_bar.html" %}
        <h1>Courses</h1>
        <p class="hint">Published courses only. Admin preview: add <code>?preview=1</code>.</p>

        {% if courses and courses|length > 0 %}
          {% for c in courses %}
            <div class="card">
              <div class="title">
                <a href="/courses/{{ c.slug }}">{{ c.title }}</a>
              </div>
              {% if c.description %}
                <p class="desc">{{ c.description }}</p>
              {% endif %}
              {% if is_preview %}
                <div class="meta">status: {{ c.status }} · slug: {{ c.slug }}</div>
              {% endif %}
            </div>
          {% endfor %}
        {% else %}
          <p>No courses found.</p>
        {% endif %}
      </body>
    </html>
    """
    return render_template("courses/index.html", courses=courses, is_preview=_is_preview_allowed())


@bp.get("/courses/<course_slug>")
def course_detail(course_slug: str):
    """
    Public: Course detail page (course metadata + lesson list).
    Shows published lessons by default.
    Admins can preview drafts via ?preview=1.
    """
    course_root: Path = get_data_root() / "courses" / course_slug
    course_json: Path = course_root / "course.json"
    lessons_root: Path = course_root / "lessons"

    course = read_json(course_json)
    if not isinstance(course, dict):
        return "Course not found.", 404

    lessons: list[dict] = []
    if lessons_root.exists() and lessons_root.is_dir():
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
                    "title": data.get("title") or (data.get("slug") or p.name),
                    "description": data.get("description") or "",
                    "status": data.get("status") or "draft",
                    "xp": data.get("xp") or 0,
                }
            )

    lessons = _filter_by_publish_status(lessons)

    html = """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{{ course_title }}</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; }
          a { color: inherit; }
          .top { display: flex; align-items: baseline; gap: 12px; }
          .back { font-size: 14px; color: #444; }
          h1 { margin: 0; }
          .desc { margin: 10px 0 18px 0; color: #333; max-width: 900px; }
          .hint { color: #555; margin: 0 0 18px 0; }
          .card { border: 1px solid #e5e5e5; border-radius: 12px; padding: 14px 16px; margin: 12px 0; }
          .title { font-weight: 700; font-size: 16px; margin: 0 0 6px 0; }
          .desc2 { margin: 0; color: #333; }
          .meta { margin-top: 8px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="top">
          <div class="back"><a href="/courses">← All courses</a></div>
        </div>

        <h1>{{ course_title }}</h1>

        {% if course_description %}
          <p class="desc">{{ course_description }}</p>
        {% endif %}

        <p class="hint">Published lessons only. Admin preview: add <code>?preview=1</code>.</p>

        {% if lessons and lessons|length > 0 %}
          {% for l in lessons %}
            <div class="card">
              <div class="title">
                <a href="/courses/{{ course_slug }}/{{ l.slug }}">{{ l.title }}</a>
              </div>
              {% if l.description %}
                <p class="desc2">{{ l.description }}</p>
              {% endif %}
              <div class="meta">
                XP: {{ l.xp }}
                {% if is_preview %}
                  · status: {{ l.status }} · slug: {{ l.slug }}
                {% endif %}
              </div>
            </div>
          {% endfor %}
        {% else %}
          <p>No lessons found for this course.</p>
        {% endif %}
      </body>
    </html>
    """
    return render_template_string(
        html,
        course_slug=course.get("slug") or course_slug,
        course_title=course.get("title") or (course.get("slug") or course_slug),
        course_description=course.get("description") or "",
        lessons=lessons,
        is_preview=_is_preview_allowed(),
    )


@bp.get("/courses/<course_slug>/<lesson_slug>")
def lesson_detail(course_slug: str, lesson_slug: str):
    """
    Public: Lesson page (lesson metadata + rendered content blocks).
    Shows published-only by default.
    Admins can preview drafts via ?preview=1.
    """
    is_preview = _is_preview_allowed()

    course_root: Path = get_data_root() / "courses" / course_slug
    course_json: Path = course_root / "course.json"
    course = read_json(course_json)
    if not isinstance(course, dict):
        return "Course not found.", 404

    lesson_root: Path = course_root / "lessons" / lesson_slug
    lesson_json: Path = lesson_root / "lesson.json"
    lesson = read_json(lesson_json)
    if not isinstance(lesson, dict):
        return "Lesson not found.", 404

    lesson_status = str(lesson.get("status") or "draft").strip().lower()
    if (lesson_status != "published") and (not is_preview):
        return "Lesson not found.", 404

    content_root: Path = lesson_root / "content"
    blocks: list[dict] = []

    if content_root.exists() and content_root.is_dir():
        order: list[str] = []
        raw = lesson.get("content_order")
        if isinstance(raw, list):
            order = [str(x) for x in raw if str(x).strip()]

        if order:
            for cid in order:
                p = content_root / f"{cid}.json"
                data = read_json(p)
                if isinstance(data, dict):
                    blocks.append(data)
        else:
            for p in sorted(content_root.glob("*.json"), key=lambda x: x.name):
                data = read_json(p)
                if isinstance(data, dict):
                    blocks.append(data)

    blocks = _filter_by_publish_status(blocks)

    html = """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{{ lesson_title }}</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; }
          a { color: inherit; }
          .top { display: flex; gap: 14px; align-items: baseline; margin-bottom: 12px; }
          .back { font-size: 14px; color: #444; }
          h1 { margin: 0 0 8px 0; }
          .desc { margin: 0 0 18px 0; color: #333; max-width: 900px; }
          .meta { color: #666; font-size: 12px; margin: 0 0 18px 0; }
          .block { border: 1px solid #e5e5e5; border-radius: 12px; padding: 14px 16px; margin: 12px 0; }
          .type { font-size: 12px; color: #666; margin: 0 0 10px 0; }
          .md { white-space: pre-wrap; line-height: 1.45; }
          .pair { margin: 0; }
          .pair strong { display: inline-block; min-width: 18px; }
          .choices { margin: 8px 0 0 0; padding-left: 18px; }
          code { background: #f6f6f6; padding: 1px 5px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="top">
          <div class="back"><a href="/courses">← All courses</a></div>
          <div class="back"><a href="/courses/{{ course_slug }}">← {{ course_title }}</a></div>
        </div>

        <h1>{{ lesson_title }}</h1>

        {% if lesson_description %}
          <p class="desc">{{ lesson_description }}</p>
        {% endif %}

        <p class="meta">
          XP: {{ lesson_xp }}
          {% if is_preview %}
            · status: {{ lesson_status }} · preview: <code>?preview=1</code>
          {% endif %}
        </p>

        {% if blocks and blocks|length > 0 %}
          {% for b in blocks %}
            <div class="block">
              <div class="type">type: {{ b.type or "unknown" }}{% if is_preview %} · status: {{ b.status or "" }} · id: {{ b.id or "" }}{% endif %}</div>

              {% if (b.type or "") == "markdown" %}
                <div class="md">{{ b.body or "" }}</div>

              {% elif (b.type or "") == "example_pair" %}
                {% if b.items %}
                  {% for it in b.items %}
                    <p class="pair"><strong>ES:</strong> {{ it.es or "" }}</p>
                    <p class="pair"><strong>EN:</strong> {{ it.en or "" }}</p>
                    {% if not loop.last %}<hr />{% endif %}
                  {% endfor %}
                {% else %}
                  <div class="md">(No items)</div>
                {% endif %}

              {% elif (b.type or "") == "mcq" %}
                {% if b.prompt %}<div class="md"><strong>{{ b.prompt }}</strong></div>{% endif %}
                {% if b.stem %}<div class="md">{{ b.stem }}</div>{% endif %}
                {% if b.choices %}
                  <ol class="choices">
                    {% for c in b.choices %}
                      <li>{{ c }}</li>
                    {% endfor %}
                  </ol>
                {% endif %}
                {% if is_preview and (b.answer_index is not none) %}
                  <div class="meta">answer_index: {{ b.answer_index }}</div>
                {% endif %}

              {% else %}
                <div class="md">Unsupported block type for now.</div>
              {% endif %}
            </div>
          {% endfor %}
        {% else %}
          <p>No content found for this lesson.</p>
        {% endif %}
      </body>
    </html>
    """

    return render_template_string(
        html,
        course_slug=course.get("slug") or course_slug,
        course_title=course.get("title") or (course.get("slug") or course_slug),
        lesson_title=lesson.get("title") or (lesson.get("slug") or lesson_slug),
        lesson_description=lesson.get("description") or "",
        lesson_xp=lesson.get("xp") or 0,
        lesson_status=lesson_status,
        blocks=blocks,
        is_preview=is_preview,
    )
