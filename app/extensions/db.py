# app/extensions/db.py
from __future__ import annotations
from flask_sqlalchemy import SQLAlchemy

# Global SQLAlchemy handle (initialized in app factory)
db: SQLAlchemy = SQLAlchemy()
