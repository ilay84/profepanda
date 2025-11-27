# app/extensions/migrate.py
from __future__ import annotations
from flask_migrate import Migrate

# Global Flask-Migrate handle (initialized in app factory)
migrate: Migrate = Migrate()
