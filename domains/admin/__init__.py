# domains/admin/__init__.py
from __future__ import annotations
from flask import Blueprint, render_template, render_template_string, jsonify, current_app, request, redirect, url_for, make_response, g, abort
import json
from pathlib import Path
from flask_login import login_required
from datetime import datetime, timezone

bp = Blueprint("admin", __name__, template_folder="../../templates/admin")

@bp.before_app_request
def _admin_flag_guard():
    """
    App-wide guard that sets g.is_admin based on the current session user.
    This runs for every request (not just /admin/*), which lets public pages
    show pencils only for authenticated admins.

    Allowed roles: author | editor | super
    Status must be 'active'.
    """
    try:
        from flask_login import current_user  # import here to avoid early import loops
        is_auth = getattr(current_user, "is_authenticated", False)
        role = getattr(current_user, "role", None)
        status = getattr(current_user, "status", None)
        g.is_admin = bool(is_auth and status == "active" and role in {"author", "editor", "super"})
    except Exception:
        g.is_admin = False

# register admin subroutes
from domains.admin import articles          # /admin/articles (create/delete/update)
from domains.admin import articles_index    # /admin/articles/ (index)
from domains.admin import articles_edit     # /admin/articles/<slug>/edit (editor)
from domains.admin import i18n              # /admin/i18n/... (inline UI strings)
from domains.admin import exercises_pages as _ex_pages  # /admin/exercises (library & builders)
from domains.admin import glossary_pages    # /admin/glossary (index + validate)
from domains.admin import lessons_pages     # /admin/lessons (interactive lessons)
from domains.admin import lessons_api       # /admin/api/lessons (CRUD)
from domains.admin import content_lab       # /admin/content-lab (UI/UX sandbox)
from app.storage import get_project_root
from app.storage import load_article, save_article, ensure_article_dirs

# Safe-import exercises_api so we can surface any import errors
_exercises_api_error = None
try:
    from domains.admin import exercises_api as _ex_api  # /admin/api/exercises (CRUD + upload)
except Exception as e:
    _exercises_api_error = f"{type(e).__name__}: {e}"

@bp.get("/api/exercises/_import_status")
def _api_exercises_import_status():
    """
    Diagnostic: confirms whether domains.admin.exercises_api imported successfully.
    """
    return jsonify({"ok": _exercises_api_error is None, "error": _exercises_api_error})


# ─────────────────────────────────────────────────────────────
# Structured Article (minimal JSON editor + preview)
# ─────────────────────────────────────────────────────────────

def _is_admin_user():
    try:
        return bool(getattr(g, "is_admin", False))
    except Exception:
        return False

def _article_structured_path(slug: str) -> Path:
    return get_project_root() / "data" / "articles" / slug / "article_structured.json"

@bp.get("/language-structures-and-lessons/new", endpoint="admin_lsl_new")
@login_required
def admin_lsl_new():
    """
    Start a new language-structure/lesson using the same editor as /<slug>/edit.
    We create a temporary draft slug and seed a minimal article.json, then redirect
    into the full modules/submodules editor so the UX matches the existing resources.
    """
    if not _is_admin_user():
        abort(403)
    slug = f"draft-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    # Only seed if it does not already exist (highly unlikely collision)
    if not load_article(slug):
        ensure_article_dirs(slug)
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        seed = {
            "slug": slug,
            "title": "",
            "title_es": "",
            "title_en": "",
            "html": "<p><br></p>",
            "modules": [],
            "status": "draft",
            "type": "structure",
            "tags": [],
            "created_at": now,
            "updated_at": now,
        }
        save_article(slug, seed)
    return redirect(url_for("admin.admin_lsl_edit", slug=slug))

@bp.get("/article-structured/<slug>")
@login_required
def article_structured(slug: str):
    if not _is_admin_user():
        abort(403)
    return render_template("admin/article_structured.html", slug=slug)

@bp.get("/api/article-structured/<slug>")
@login_required
def api_article_structured_get(slug: str):
    if not _is_admin_user():
        abort(403)
    path = _article_structured_path(slug)
    if not path.is_file():
        default = {
            "schema_version": "1.0.0",
            "title": slug.replace("-", " ").title(),
            "slug": slug,
            "language": "es",
            "summary": "",
            "modules": [
                {
                    "slug": "mod1",
                    "title": "Módulo 1",
                    "blocks": [
                        { "type": "heading", "data": { "text": "Título", "translations": {} } },
                        { "type": "text", "data": { "html": "<p>Contenido en español.</p>", "translations": {} } },
                        { "type": "example_sentence", "data": { "sentence": "Ejemplo en español.", "translations": {}, "audio_url": "" } }
                    ]
                }
            ]
        }
        return jsonify({"ok": True, "data": default})
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return jsonify({"ok": True, "data": data})
    except Exception as e:
        return jsonify({"ok": False, "error": f"{type(e).__name__}: {e}"}), 500

@bp.put("/api/article-structured/<slug>")
@login_required
def api_article_structured_save(slug: str):
    if not _is_admin_user():
        abort(403)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "error": "invalid JSON payload"}), 400
    path = _article_structured_path(slug)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return jsonify({"ok": True, "path": str(path.relative_to(get_project_root()))})
    except Exception as e:
        return jsonify({"ok": False, "error": f"{type(e).__name__}: {e}"}), 500

# fixed admin UI language options (ES/EN only for site chrome)
_ADMIN_LANG_OPTIONS = [
    {"code": "es", "name_native": "Español"},
    {"code": "en", "name_native": "English"},
]

def _coerce_ui_lang(val: str | None) -> str:
    v = (val or "").lower()
    return v if v in ("es", "en") else "es"

@bp.context_processor
def _inject_admin_lang():
    from app.langs import ui as _ui  # import here to avoid circulars
    cur = _coerce_ui_lang(request.cookies.get("lang"))
    def t(es_text: str, en_text: str, lang_override: str | None = None) -> str:
        active = _coerce_ui_lang(lang_override or cur)
        return es_text if active == "es" else en_text
    # ui(key, lang_override=None, fallback=True) – ES/EN keyed string
    def ui(key: str, lang_override: str | None = None, fallback: bool = True) -> str:
        return _ui(key, (lang_override or cur), fallback)
    return {
        "app_lang": cur,
        "t": t,
        "ui": ui,
        # expose ES/EN options for the admin header dropdown
        "lang_options": _ADMIN_LANG_OPTIONS,
        # enable inline i18n pencils on admin pages for admins
        "can_edit_i18n": bool(getattr(g, "is_admin", False)),
        # explicit endpoints (the include has safe defaults)
        "i18n_get_url": "/admin/i18n/key",
        "i18n_update_url": "/admin/i18n/update",
        "csrf_token": "",
    }

@bp.get("/", endpoint="admin_home")
@login_required
def admin_home():
    """
    Minimal Admin landing page.
    Renders templates/admin/admin_index.html via blueprint template_folder.
    """
    return render_template(
        "admin_index.html",
        content_lab_enabled=bool(current_app.config.get("ENABLE_CONTENT_LAB", False)),
    )

@bp.get("/healthz")
def admin_healthz():
    return jsonify({"status": "ok", "domain": "admin"}), 200

@bp.get("/lang", endpoint="admin_set_lang")
def admin_set_lang():
    """
    Set UI language via cookie and redirect back.
    Accepts optional ?next=/safe/path to force the post-toggle destination.
    Usage: /admin/lang?set=en&next=/admin/articles/  (must be same-origin & start with '/')
    """
    lang = _coerce_ui_lang(request.args.get("set"))

    # 1) Prefer explicit, safe 'next' param
    next_param = (request.args.get("next") or "").strip()
    target = next_param if next_param.startswith("/") else ""

    # 2) Else, try Referer (same-origin only)
    if not target:
        ref = request.headers.get("Referer") or ""
        try:
            from urllib.parse import urlparse
            p = urlparse(ref)
            if p.netloc == request.host:
                target = p.path + (("?" + p.query) if p.query else "")
        except Exception:
            target = ""

    # 3) Last resort: a known-safe page that exists
    if not target or not target.startswith("/"):
        target = url_for("admin.admin_articles_index")

    resp = redirect(target)
    # Write both cookies for compatibility with existing templates
    resp.set_cookie("lang", lang, max_age=60 * 60 * 24 * 180, samesite="Lax", secure=False)
    resp.set_cookie("ppx_lang", lang, max_age=60 * 60 * 24 * 180, samesite="Lax", secure=False)
    return resp


