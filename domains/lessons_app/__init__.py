from __future__ import annotations

from flask import Blueprint

bp = Blueprint("lessons_app", __name__)

from . import api  # noqa: E402,F401
