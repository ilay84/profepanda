# domains/accounts/authz.py
from __future__ import annotations
from functools import wraps
from flask import abort
from flask_login import current_user

SUPER_ROLE = "super"

def is_super() -> bool:
    return bool(getattr(current_user, "role", None) == SUPER_ROLE and getattr(current_user, "is_authenticated", False))

def require_super():
    """
    Decorator for routes that only super admins can access.
    Returns 403 if the current user isn't allowed.
    """
    def _decorator(fn):
        @wraps(fn)
        def _wrapped(*args, **kwargs):
            if not is_super():
                abort(403)
            return fn(*args, **kwargs)
        return _wrapped
    return _decorator
