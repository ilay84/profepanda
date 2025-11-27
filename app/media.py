# app/media.py
from __future__ import annotations
import os
from pathlib import Path
from flask import Blueprint, abort, send_from_directory
from app.storage import get_data_root, VALID_DOMAINS

bp = Blueprint("media", __name__)

@bp.get("/<domain>/<slug>/<path:rest>")
def serve_media(domain: str, slug: str, rest: str):
    """
    Serve files from:
      data/<domain>/<slug>/media/<rest>
    Special-case for exercises where the path is:
      /media/exercises/<ex_type>/<slug>/<subpath...>
      → data/exercises/<ex_type>/<slug>/media/<subpath...>
    """
    if domain not in VALID_DOMAINS:
        abort(404)

    # Normalize and prevent path traversal
    safe_rest = os.path.normpath(rest).replace("\\", "/")
    if safe_rest.startswith("../") or safe_rest.startswith("..\\") or safe_rest == "..":
        abort(404)

    # Domain-specific base directory
    if domain == "exercises":
        # Here, the URL variable `slug` is actually the exercise type (ex_type).
        ex_type = slug
        parts = [p for p in safe_rest.split("/") if p]
        if len(parts) < 2:
            abort(404)
        real_slug = parts[0]
        remaining = "/".join(parts[1:])
        base_dir = get_data_root() / "exercises" / ex_type / real_slug / "media"
        rel_path = remaining
    else:
        base_dir = get_data_root() / domain / slug / "media"
        rel_path = safe_rest

    file_path = base_dir / rel_path
    if not file_path.exists() or not file_path.is_file():
        abort(404)

    # send_from_directory requires directory + filename
    return send_from_directory(base_dir, rel_path, as_attachment=False)


@bp.get('/glossary-audio/<kind>/<slug>/<path:fname>')
def serve_glossary_audio(kind: str, slug: str, fname: str):
    """
    Serve glossary audio saved under:
      data/glossary/audio/<kind>/<slug>/<fname>
    where kind is 'entry' or 'examples'.
    """
    kind = (kind or '').strip().lower()
    if kind not in {'entry','examples'}:
        abort(404)
    # prevent traversal
    safe_name = os.path.normpath(fname).replace('\\','/')
    if safe_name.startswith('../') or safe_name == '..':
        abort(404)
    base = get_data_root() / 'glossary' / 'audio' / kind / slug
    file_path = base / safe_name
    if not file_path.exists() or not file_path.is_file():
        abort(404)
    return send_from_directory(base, safe_name, as_attachment=False)
