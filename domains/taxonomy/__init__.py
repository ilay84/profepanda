# domains/taxonomy/__init__.py
from flask import Blueprint
from .routes import bp as taxonomy_bp

__all__ = ["taxonomy_bp"]
