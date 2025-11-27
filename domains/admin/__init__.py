# domains/admin/__init__.py
from __future__ import annotations
from flask import Blueprint, render_template, render_template_string, jsonify, current_app, request, redirect, url_for, make_response, g
from flask_login import login_required

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
    return render_template("admin_index.html")

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


