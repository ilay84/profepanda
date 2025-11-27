# app/__init__.py
from __future__ import annotations
from flask import Flask, request
from markupsafe import Markup
from app.extensions.db import db
from app.extensions.migrate import migrate
from app.extensions.login import login
from app.langs import ui as ui_text

# ─────────────────────────────────────────────────────────────
# Language options (20 common learner languages; native names)
# Keep codes simple (mostly ISO 639-1).
# ─────────────────────────────────────────────────────────────
LANG_OPTIONS = [
    {"code": "es", "name_native": "Español"},
    {"code": "en", "name_native": "English"},
    {"code": "pt", "name_native": "Português"},
    {"code": "fr", "name_native": "Français"},
    {"code": "it", "name_native": "Italiano"},
    {"code": "de", "name_native": "Deutsch"},
    {"code": "zh", "name_native": "中文"},
    {"code": "ja", "name_native": "日本語"},
    {"code": "ko", "name_native": "한국어"},
    {"code": "ru", "name_native": "Русский"},
    {"code": "ar", "name_native": "العربية"},
    {"code": "hi", "name_native": "हिन्दी"},
    {"code": "bn", "name_native": "বাংলা"},
    {"code": "tr", "name_native": "Türkçe"},
    {"code": "pl", "name_native": "Polski"},
    {"code": "nl", "name_native": "Nederlands"},
    {"code": "sv", "name_native": "Svenska"},
    {"code": "el", "name_native": "Ελληνικά"},
    {"code": "he", "name_native": "עברית"},
    {"code": "vi", "name_native": "Tiếng Việt"},
]
_LANG_CODES = {opt["code"] for opt in LANG_OPTIONS}

def create_app(config_name: str | None = None) -> Flask:
    """
    ProfePanda — Flask application factory.
    Minimal, runnable core. Domain blueprints are optional and can be added later.
    """
    app = Flask(
        __name__,
        static_folder="../static",
        template_folder="../templates",
        instance_relative_config=True,
    )

    # ─────────────────────────────────────────────────────────────
    # Config (environment-aware via config.py)
    # ─────────────────────────────────────────────────────────────
    # Load DevConfig by default; override via FLASK_ENV or later if needed.
    app.config.from_object("config.DevConfig")
    # Optionally load instance config if present (instance/config.py)
    app.config.from_pyfile("config.py", silent=True)

    # ─────────────────────────────────────────────────────────────
    # Extensions: DB + Migrations
    # ─────────────────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    login.init_app(app)

    # ─────────────────────────────────────────────────────────────
    # Jinja: i18n helpers (simple stub; replace with full i18n later)
    # ─────────────────────────────────────────────────────────────
    app.jinja_env.trim_blocks = True
    app.jinja_env.lstrip_blocks = True

    @app.context_processor
    def _inject_globals():
        # Resolve current language from cookie, fallback to 'es'
        cur = (request.cookies.get("lang") or "es").lower()
        if cur not in _LANG_CODES:
            cur = "es"

        def t(es_text, en_text=None, lang=None):
            active = (lang or cur) or "es"
            # Minimal bilingual helper for now (ES/EN). If EN missing, fall back to ES.
            return es_text if active == "es" else (en_text if en_text is not None else es_text)

        return {
            "app_lang": cur,
            "t": t,
            "safe": lambda html: Markup(html),
            # Expose languages for dropdowns (public/admin)
            "lang_options": LANG_OPTIONS,
            "ui": ui_text,
            # Static assets version for cache-busting if needed
            "assets_ver": app.config.get("STATIC_ASSETS_VERSION", "dev"),
            # Helper: build a static URL with optional version param
            "static_ver": lambda path: (
                app.static_url_path.rstrip("/") + "/" + path.lstrip("/") +
                (f"?v={app.config.get('STATIC_ASSETS_VERSION')}" if app.config.get('STATIC_ASSETS_VERSION') else "")
            ),
        }

    # ─────────────────────────────────────────────────────────────
    # Blueprint registration (optional; won’t crash if missing)
    # ─────────────────────────────────────────────────────────────
    def _maybe_register(import_path: str, attr: str, url_prefix: str):
        try:
            module = __import__(import_path, fromlist=[attr])
            bp = getattr(module, attr)
            app.register_blueprint(bp, url_prefix=url_prefix)
            print(f"[boot] registered {import_path}.{attr} at {url_prefix}")
        except Exception as e:
            import traceback
            print(f"[boot][ERROR] failed to register {import_path}.{attr} at {url_prefix}: {e}")
            traceback.print_exc()

    _maybe_register("domains.public", "public_bp", "/")
    _maybe_register("domains.admin", "bp", "/admin")
    _maybe_register("domains.accounts.routes_admin", "bp", "/admin")
    _maybe_register("domains.accounts.routes_manage", "bp", "/admin")
    _maybe_register("domains.articles", "bp", "/articles")
    _maybe_register("domains.exercises", "bp", "/exercises")
    # glossary blueprint removed
    _maybe_register("app.media", "bp", "/media")
    _maybe_register("domains.taxonomy", "taxonomy_bp", "/taxonomy")

    # Lessons domain (public + API). Uses an init_app helper that registers
    # its own blueprints (public at /lessons and API at /api/lessons).
    try:
        from domains.lessons import init_app as lessons_init_app  # type: ignore
        lessons_init_app(app)
        print("[boot] registered domains.lessons blueprints (/lessons, /api/lessons)")
    except Exception as e:
        import traceback
        print(f"[boot][WARN] lessons domain not registered: {e}")
        traceback.print_exc()

    # ─────────────────────────────────────────────────────────────
    # Health check
    # ─────────────────────────────────────────────────────────────
    @app.get("/healthz")
    def _healthz():
        return {"status": "ok", "app": "ProfePanda"}, 200

    # -------------------------------------------------------------
    # HTTP caching: aggressively cache static assets (icons, css, js)
    # -------------------------------------------------------------
    @app.after_request
    def _static_cache_headers(response):
        try:
            p = request.path or ""
            # Only touch static responses
            if p.startswith(app.static_url_path) or p.startswith("/media/"):
                # Default strong caching for static files
                # One year + immutable to allow far-future caching
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        except Exception:
            pass
        return response

    return app
