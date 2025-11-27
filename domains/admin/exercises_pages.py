# domains/admin/exercises_pages.py
from __future__ import annotations
from flask import render_template, request, abort, url_for
from app import exercises_store as store
from app.exercise_types import get_registry
from . import bp  # admin blueprint

@bp.get("/exercises/", endpoint="admin_exercises_index")
def admin_exercises_index():
    """
    Exercises library list (admin).
    Renders templates/admin/exercises_list.html
    """
    # Build a simple list for "New" buttons from the registry
    reg = get_registry()
    types = []
    for key, meta in reg.items():
        try:
            types.append({
                "type": key,
                "label": meta.get("label", key.upper()),
                "new_url": url_for(meta.get("new_endpoint")),
                "icon": meta.get("icon", "assets/icons/exercise.svg"),
            })
        except Exception:
            # If any endpoint missing, skip it to avoid breaking the page
            continue
    return render_template("admin/exercises_list.html", ex_types=types)

@bp.get("/exercises/new/tf", endpoint="admin_exercises_new_tf")
def admin_exercises_new_tf():
    """
    New True/False exercise builder (admin).
    Uses the same builder template as 'edit', with mode='new'.
    """
    return render_template(
        "admin/exercises_tf_new.html",
        builder_mode="new",
        builder_slug=""
    )

@bp.get("/exercises/tf/<slug>/edit", endpoint="admin_exercises_edit_tf")
def admin_exercises_edit_tf(slug: str):
    """
    Edit True/False exercise builder (admin).
    Reuses the builder template; JS will prefill based on builder_slug.
    """
    slug = (slug or "").strip().lower()
    if not slug:
        abort(404)
    # Eager prefill to avoid client fetch timing/caching issues
    try:
        prefill = store.load_exercise('tf', slug, version='current') or {}
    except Exception:
        prefill = {}
    return render_template(
        "admin/exercises_tf_new.html",
        builder_mode="edit",
        builder_slug=slug,
        prefill_json=prefill
    )

# Drag & Drop (DnD) builder (new + edit)
@bp.get("/exercises/new/dnd", endpoint="admin_exercises_new_dnd")
def admin_exercises_new_dnd():
    return render_template(
        "admin/exercises_dnd_new.html",
        builder_mode="new",
        builder_slug=""
    )

@bp.get("/exercises/dnd/<slug>/edit", endpoint="admin_exercises_edit_dnd")
def admin_exercises_edit_dnd(slug: str):
    slug = (slug or "").strip().lower()
    if not slug:
        abort(404)
    # Prefill not required; builder JS will fetch current via API when editing
    return render_template(
        "admin/exercises_dnd_new.html",
        builder_mode="edit",
        builder_slug=slug
    )

@bp.get("/exercises/new/mcq", endpoint="admin_exercises_new_mcq")
def admin_exercises_new_mcq():
    """
    New Multiple Choice (MCQ) exercise builder (admin).
    """
    return render_template(
        "admin/exercises_mcq_new.html",
        builder_mode="new",
        builder_slug=""
    )

@bp.get("/exercises/mcq/<slug>/edit", endpoint="admin_exercises_edit_mcq")
def admin_exercises_edit_mcq(slug: str):
    """
    Edit Multiple Choice (MCQ) exercise builder (admin).
    """
    slug = (slug or "").strip().lower()
    if not slug:
        abort(404)
    return render_template(
        "admin/exercises_mcq_new.html",
        builder_mode="edit",
        builder_slug=slug
    )

# Fill-in-the-Blank (FIB) builder (new + edit)
@bp.get("/exercises/new/fitb", endpoint="admin_exercises_new_fitb")
def admin_exercises_new_fitb():
    return render_template(
        "admin/exercises_fitb_new.html",
        builder_mode="new",
        builder_slug=""
    )

@bp.get("/exercises/fitb/<slug>/edit", endpoint="admin_exercises_edit_fitb")
def admin_exercises_edit_fitb(slug: str):
    slug = (slug or "").strip().lower()
    if not slug:
        abort(404)
    return render_template(
        "admin/exercises_fitb_new.html",
        builder_mode="edit",
        builder_slug=slug
    )

# Dictation builder (new + edit)
@bp.get("/exercises/new/dictation", endpoint="admin_exercises_new_dictation")
def admin_exercises_new_dictation():
    return render_template(
        "admin/exercises_dictation_new.html",
        builder_mode="new",
        builder_slug=""
    )

@bp.get("/exercises/dictation/<slug>/edit", endpoint="admin_exercises_edit_dictation")
def admin_exercises_edit_dictation(slug: str):
    slug = (slug or "").strip().lower()
    if not slug:
        abort(404)
    # Eagerly load current payload to embed for prefill (avoids client fetch timing/cache issues)
    prefill = store.load_exercise('dictation', slug, version='current') or {}
    return render_template(
        "admin/exercises_dictation_new.html",
        builder_mode="edit",
        builder_slug=slug,
        builder_prefill=prefill
    )
