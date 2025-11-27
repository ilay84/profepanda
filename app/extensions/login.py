# app/extensions/login.py
from __future__ import annotations
from flask_login import LoginManager

# Global Flask-Login manager (initialized in app factory)
login: LoginManager = LoginManager()

# Optionally set a default login view (we'll confirm the endpoint name when routes exist)
# e.g., "admin.login" or "accounts.login"
login.login_view = "accounts.login_page"
login.login_message_category = "info"

@login.user_loader
def load_user(user_id: str):
    # Lazy import to avoid circular deps at import time
    try:
        from domains.accounts.models import AdminUser
        from app.extensions.db import db  # noqa: F401  # ensures db session exists
    except Exception:
        return None
    return AdminUser.query.get(user_id)
