# domains/courses/__init__.py
from __future__ import annotations

from flask import Flask

from .courses import bp


def init_app(app: Flask) -> None:
    """
    Register Courses API (read-only for now).
    """
    app.register_blueprint(bp)
