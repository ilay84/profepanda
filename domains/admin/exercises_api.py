# domains/admin/exercises_api.py
from __future__ import annotations
import os
from datetime import datetime
from flask import request, jsonify
from werkzeug.utils import secure_filename
from . import bp  # existing admin blueprint
from app import exercises_store as store


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
def _json_error(msg: str, code: int = 400):
    resp = jsonify({"ok": False, "error": msg})
    resp.status_code = code
    return resp


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────
@bp.get("/api/exercises")
def api_exercises_list():
    """
    Returns metadata index. Optional filters: type, status, level.
    """
    filters = {}
    f_type = request.args.get("type")
    f_status = request.args.get("status")
    f_level = request.args.get("level")
    if f_type:
        filters["type"] = f_type
    if f_status:
        filters["status"] = f_status
    if f_level:
        filters["level"] = f_level

    data = store.list_exercises(filters or None)
    resp = jsonify({"ok": True, "data": data})
    # Prevent any intermediary/browser caching so previews always reflect latest draft
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


@bp.get("/api/exercises/<ex_type>/<slug>")
def api_exercises_get(ex_type: str, slug: str):
    """
    Fetch latest (or specific) version of an exercise JSON.
    Query param: version=NNN or 'current' (default).
    """
    version = request.args.get("version", "current")
    ex = store.load_exercise(ex_type, slug, version=version)
    if not ex:
        return _json_error("Not found", 404)
    resp = jsonify(ex)
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


@bp.post("/api/exercises")
def api_exercises_create():
    """
    Validate and save a new exercise payload as next version.
    Body: JSON payload including at least: type, slug, items[].
    """
    try:
        payload = request.get_json(force=True, silent=False)
    except Exception:
        return _json_error("Invalid JSON body.", 400)

    ok, errs, saved = store.save_exercise(payload, user="admin")
    if not ok:
        return _json_error("; ".join(errs), 400)
    return jsonify({"ok": True, "data": saved})


@bp.put("/api/exercises/<ex_type>/<slug>")
def api_exercises_update(ex_type: str, slug: str):
    """
    Save the next version for an existing exercise.
    Body payload must include 'type' and 'slug' consistent with URL.
    """
    try:
        payload = request.get_json(force=True, silent=False)
    except Exception:
        return _json_error("Invalid JSON body.", 400)

    if payload.get("type") != ex_type or payload.get("slug") != slug:
        return _json_error("Type/slug in body must match URL.", 400)

    ok, errs, saved = store.save_exercise(payload, user="admin")
    if not ok:
        return _json_error("; ".join(errs), 400)
    return jsonify({"ok": True, "data": saved})


@bp.post("/api/exercises/<ex_type>/<slug>/publish")
def api_exercises_publish(ex_type: str, slug: str):
    """
    Publish: loads current, sets status='published', saves as new version.
    """
    current = store.load_exercise(ex_type, slug, version="current")
    if not current:
        return _json_error("Not found", 404)
    current = dict(current)
    current["status"] = "published"
    ok, errs, saved = store.save_exercise(current, user="publish")
    if not ok:
        return _json_error("; ".join(errs), 400)
    return jsonify({"ok": True, "data": saved})


@bp.patch("/api/exercises/<ex_type>/<slug>/status")
def api_exercises_set_status(ex_type: str, slug: str):
    """
    Quick status update. Body JSON: { "status": "draft"|"published"|"archived" }
    Persists by cloning current to next version with updated status.
    """
    try:
        body = request.get_json(force=True, silent=False) or {}
    except Exception:
        return _json_error("Invalid JSON body.", 400)

    new_status = str(body.get("status") or "").lower().strip()
    if new_status not in {"draft", "published", "archived"}:
        return _json_error("Invalid status.", 400)

    current = store.load_exercise(ex_type, slug, version="current")
    if not current:
        return _json_error("Not found", 404)
    current = dict(current)
    current["status"] = new_status
    ok, errs, saved = store.save_exercise(current, user=f"set-status:{new_status}")
    if not ok:
        return _json_error("; ".join(errs), 400)
    return jsonify({"ok": True, "data": {"status": saved.get("status"), "version": saved.get("version")}})


@bp.post("/api/exercises/<ex_type>/<slug>/restore/<ver>")
def api_exercises_restore(ex_type: str, slug: str, ver: str):
    """
    Restore older version NNN by cloning to a new version.
    """
    ok, err = store.restore_exercise(ex_type, slug, version=ver)
    if not ok:
        return _json_error(err or "Restore failed.", 400)
    # return the new current
    cur = store.load_exercise(ex_type, slug, version="current")
    return jsonify({"ok": True, "data": cur})


@bp.delete("/api/exercises/<ex_type>/<slug>")
def api_exercises_delete(ex_type: str, slug: str):
    """
    Delete an exercise.
    - Soft-delete by default (mirrors /archive behavior).
    - To request a hard delete (if supported by store), pass ?hard=1|true.
    """
    hard_flag = (request.args.get("hard") or "").strip().lower() in {"1", "true", "yes"}

    # Call store; tolerate older signatures without `hard` parameter.
    try:
        ok = store.delete_exercise(ex_type, slug, hard=hard_flag)
    except TypeError:
        ok = store.delete_exercise(ex_type, slug)

    if not ok:
        return _json_error("Not found", 404)
    return jsonify({"ok": True, "hard": bool(hard_flag)})

# ─────────────────────────────────────────────────────────────
# Media upload (image/audio/video) + URL passthrough
# → data/exercises/<type>/<slug>/media/{img|audio|video}/...
# ─────────────────────────────────────────────────────────────
@bp.post("/api/exercises/<ex_type>/<slug>/upload")
@bp.post("/api/exercises/<ex_type>/<slug>/upload/")
def api_exercises_upload_media(ex_type: str, slug: str):
    """
    Upload a media file (image/audio/video) or register an external media URL.

    Saves files to:
      data/exercises/<ex_type>/<slug>/media/img/<filename>
      data/exercises/<ex_type>/<slug>/media/audio/<filename>
      data/exercises/<ex_type>/<slug>/media/video/<filename>

    URL mode:
      - Provide the same `kind` and a `url` field (form or JSON).
        We do NOT download the URL; we return it verbatim.

    Returns JSON:
      { ok: true, data: { url, kind, via: "upload"|"external" } }
    """
    # Determine kind from override or (later) file mimetype
    kind_override = (request.args.get("kind") or "").strip().lower()
    if kind_override and kind_override not in {"image", "audio", "video"}:
        return _json_error("Invalid kind (expected 'image', 'audio', or 'video').", 400)

    # URL mode (url provided via form or JSON body)
    url_from_form = (request.form.get("url") or "").strip()
    url_from_json = ""
    if not url_from_form:
        try:
            j = request.get_json(force=False, silent=True) or {}
            url_from_json = (j.get("url") or "").strip()
        except Exception:
            url_from_json = ""
    incoming_url = url_from_form or url_from_json

    if incoming_url:
        if not (incoming_url.startswith("http://") or incoming_url.startswith("https://")):
            return _json_error("URL must start with http:// or https://", 400)
        if not kind_override:
            return _json_error("URL mode requires ?kind=image|audio|video", 400)
        return jsonify({
            "ok": True,
            "data": {
                "url": incoming_url,
                "kind": kind_override,
                "via": "external"
            }
        })

    # File mode
    f = request.files.get("file")
    if not f or not getattr(f, "filename", ""):
        return _json_error("Missing file (and no 'url' provided).", 400)

    mimetype = (f.mimetype or "").lower()
    if kind_override in {"image", "audio", "video"}:
        kind = kind_override
    elif mimetype.startswith("image/"):
        kind = "image"
    elif mimetype.startswith("audio/"):
        kind = "audio"
    elif mimetype.startswith("video/"):
        kind = "video"
    else:
        return _json_error(f"Unsupported file type: {mimetype or 'unknown'}", 400)

    subdir = "img" if kind == "image" else ("audio" if kind == "audio" else "video")

    # Ensure media directory exists
    media_root = store.get_media_dir(ex_type, slug)  # .../data/exercises/<type>/<slug>/media
    target_dir = os.path.join(media_root, subdir)
    os.makedirs(target_dir, exist_ok=True)

    # Secure filename and add timestamp
    orig = secure_filename(f.filename)
    base, ext = os.path.splitext(orig or "")
    if not ext:
        if kind == "image":
            ext = ".png"
        elif kind == "audio":
            ext = ".mp3"
        else:
            ext = ".mp4"
    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{base or subdir}_{stamp}{ext.lower()}"

    # Save file
    target_path = os.path.join(target_dir, filename)
    try:
        f.save(target_path)
    except Exception as e:
        return _json_error(f"Failed to save file: {e}", 500)

    # Public URL via media blueprint (served from data/<domain>/<slug>/media/...)
    public_url = f"/media/exercises/{ex_type}/{slug}/{subdir}/{filename}"
    return jsonify({
        "ok": True,
        "data": {
            "url": public_url,
            "kind": kind,
            "via": "upload"
        }
    })

    return jsonify({
        "ok": True,
        "data": {
            "url": public_url,
            "kind": kind,
            "filename": filename,
            "mimetype": mimetype,
            "size": os.path.getsize(target_path) if os.path.exists(target_path) else None,
        },
    })


# ─────────────────────────────────────────────────────────────
# Debug helpers (to verify route registration)
# ─────────────────────────────────────────────────────────────
@bp.get("/api/exercises/ping")
def api_exercises_ping():
    return jsonify({"ok": True, "msg": "admin.exercises_api is loaded"})


@bp.get("/api/exercises/_debug_routes")
def api_exercises_debug_routes():
    try:
        from flask import current_app
        rules = []
        for rule in current_app.url_map.iter_rules():
            if "/api/exercises" in str(rule):
                rules.append({
                    "rule": str(rule),
                    "endpoint": rule.endpoint,
                    "methods": sorted([m for m in rule.methods if m in {"GET", "POST", "PUT", "DELETE"}]),
                })
        return jsonify({"ok": True, "rules": rules})
    except Exception as e:
        return _json_error(f"route-map error: {e}", 500)
