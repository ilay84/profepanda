# config.py
from __future__ import annotations
import os
from pathlib import Path


# ─────────────────────────────────────────────────────────────
# Base config
# ─────────────────────────────────────────────────────────────
class BaseConfig:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-not-secret-change-me")
    PREFERRED_URL_SCHEME = os.getenv("PREFERRED_URL_SCHEME", "https")
    JSON_AS_ASCII = False
    # Static assets caching: long-lived by default; rely on URL versioning for busting
    # One year in seconds
    SEND_FILE_MAX_AGE_DEFAULT = 31536000
    # Optional global assets version (appended as ?v=... when used from templates/JS)
    STATIC_ASSETS_VERSION = os.getenv("STATIC_ASSETS_VERSION", "20251114a")

    # Instance folder (for sqlite db, uploads, etc.)
    PROJECT_ROOT = Path(__file__).resolve().parent
    INSTANCE_DIR = PROJECT_ROOT / "instance"
    INSTANCE_DIR.mkdir(exist_ok=True)

    # Database (default: SQLite in instance/)
    _default_sqlite = f"sqlite:///{(INSTANCE_DIR / 'profepanda.db').as_posix()}"
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", _default_sqlite)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Migrations
    # (flask db init/migrate/upgrade will create/use ./migrations by default)
    MIGRATIONS_DIR = os.getenv("MIGRATIONS_DIR", "migrations")

    # Cookies / Sessions
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")

    # App toggles
    DEBUG_TOOLBAR = os.getenv("DEBUG_TOOLBAR", "false").lower() == "true"


# ─────────────────────────────────────────────────────────────
# Environments
# ─────────────────────────────────────────────────────────────
class DevConfig(BaseConfig):
    DEBUG = True
    TESTING = False
    # In dev, allow insecure cookies by default (override via env if desired)
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"


class TestConfig(BaseConfig):
    DEBUG = False
    TESTING = True
    # Ephemeral in-memory DB for tests unless overridden
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")
    SESSION_COOKIE_SECURE = False


class ProdConfig(BaseConfig):
    DEBUG = False
    TESTING = False
    # In prod, default to secure cookies unless explicitly disabled
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"
