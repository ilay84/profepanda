from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Any
from flask import abort, current_app, jsonify, render_template, g
from flask_login import login_required

from . import bp  # admin blueprint


def _lab_enabled() -> bool:
    return bool(current_app.config.get("ENABLE_CONTENT_LAB", False))


def _lab_root() -> Path:
    return Path(current_app.root_path).parent / "data" / "content_examples"


def _slugify(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "", name).strip()


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _list_resources() -> list[dict[str, str]]:
    root = _lab_root()
    resources: list[dict[str, str]] = []
    if not root.exists():
        return resources
    for path in sorted(root.glob("*.json")):
        if path.name.startswith("theme_"):
            continue
        try:
            data = _load_json(path)
            meta = data.get("meta") or {}
            resources.append(
                {
                    "id": path.stem,
                    "title": meta.get("title_en") or meta.get("title_es") or path.stem,
                    "path": str(path),
                }
            )
        except Exception:
            continue
    return resources


def _list_themes() -> list[dict[str, str]]:
    root = _lab_root()
    themes: list[dict[str, str]] = []
    if not root.exists():
        return themes
    for path in sorted(root.glob("theme_*.json")):
        try:
            data = _load_json(path)
            theme_id = data.get("theme_id") or path.stem
            themes.append(
                {
                    "id": path.stem,
                    "title": data.get("title") or theme_id,
                    "theme_id": theme_id,
                    "path": str(path),
                }
            )
        except Exception:
            continue
    return themes


@bp.get("/content-lab")
@login_required
def content_lab():
    if not _lab_enabled():
        abort(404)
    if not getattr(g, "is_admin", False):
        abort(403)
    return render_template(
        "admin/content_lab.html",
        lab_enabled=True,
        lab_resources=_list_resources(),
        lab_themes=_list_themes(),
    )


@bp.get("/api/content-lab/resources")
@login_required
def content_lab_resources():
    if not _lab_enabled():
        abort(404)
    if not getattr(g, "is_admin", False):
        abort(403)
    return jsonify({"items": _list_resources()})


@bp.get("/api/content-lab/resources/<slug>")
@login_required
def content_lab_resource(slug: str):
    if not _lab_enabled():
        abort(404)
    if not getattr(g, "is_admin", False):
        abort(403)
    safe_slug = _slugify(slug)
    root = _lab_root()
    path = root / f"{safe_slug}.json"
    if not path.exists():
        abort(404)
    return jsonify(_load_json(path))


@bp.get("/api/content-lab/themes")
@login_required
def content_lab_themes():
    if not _lab_enabled():
        abort(404)
    if not getattr(g, "is_admin", False):
        abort(403)
    return jsonify({"items": _list_themes()})


@bp.get("/api/content-lab/themes/<slug>")
@login_required
def content_lab_theme(slug: str):
    if not _lab_enabled():
        abort(404)
    if not getattr(g, "is_admin", False):
        abort(403)
    safe_slug = _slugify(slug)
    root = _lab_root()
    path = root / f"{safe_slug}.json"
    if not path.exists():
        abort(404)
    return jsonify(_load_json(path))
