from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Any
from flask import abort, current_app, jsonify, render_template, g, request
from flask_login import login_required

from . import bp  # admin blueprint


def _lab_enabled() -> bool:
    # Default to enabled unless explicitly disabled
    return bool(current_app.config.get("ENABLE_CONTENT_LAB", True))


def _lab_root() -> Path:
    return Path(current_app.root_path).parent / "data" / "content_examples"


def _block_registry_path() -> Path:
    return _lab_root() / "block_registry.json"


def _project_root() -> Path:
    # Flask app root is app/, project root is parent
    return Path(current_app.root_path).parent


def _content_root() -> Path:
    return _project_root() / "content"


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
            title_en = meta.get("title_en")
            title_es = meta.get("title_es")
            resources.append(
                {
                    "id": path.stem,
                    "title": title_en or title_es or path.stem,
                    "title_en": title_en,
                    "title_es": title_es,
                    "path": str(path),
                }
            )
        except Exception:
            continue
    return resources


def _load_block_registry() -> dict[str, Any]:
    path = _block_registry_path()
    if not path.exists():
        return {"blocks": []}
    return _load_json(path)


def _list_blocks() -> list[dict[str, Any]]:
    registry = _load_block_registry()
    items = registry.get("blocks") or []
    normalized: list[dict[str, Any]] = []
    for raw in items:
        if not isinstance(raw, dict):
            continue
        entry = dict(raw)
        entry["id"] = entry.get("id") or entry.get("type") or ""
        entry["type"] = entry.get("type") or entry["id"]
        normalized.append(entry)
    return normalized


def _safe_read_text(path_str: str, limit: int = 40000) -> tuple[str | None, str | None]:
    """
    Return (content, error) while ensuring the path stays inside the project root.
    Trims anchors (#something). Limits read size.
    """
    try:
        clean = path_str.split("#", 1)[0].strip()
        if not clean:
            return None, "empty path"
        if Path(clean).is_absolute():
            return None, "forbidden"
        root = _project_root()
        candidate = (root / clean.lstrip("/")).resolve()
        if not candidate.is_file():
            return None, "not found"
        if root not in candidate.parents and candidate != root:
            return None, "forbidden"
        data = candidate.read_text(encoding="utf-8")[:limit]
        return data, None
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def _safe_write_text(path_str: str, content: str) -> tuple[int | None, str | None]:
    try:
        clean = path_str.split("#", 1)[0].strip()
        if not clean or Path(clean).is_absolute():
            return None, "forbidden"
        root = _project_root()
        target = (root / clean.lstrip("/")).resolve()
        if root not in target.parents and target != root:
            return None, "forbidden"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return target.stat().st_size, None
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def _is_super_admin() -> bool:
    try:
        from flask_login import current_user
        return bool(
            getattr(current_user, "is_authenticated", False)
            and getattr(current_user, "status", None) == "active"
            and getattr(current_user, "role", None) == "super"
        )
    except Exception:
        return False


def _enrich_block(entry: dict[str, Any]) -> dict[str, Any]:
    """
    Attach file existence and optional content previews for readable assets.
    """
    files = entry.get("files") or []
    hydrated: list[dict[str, Any]] = []
    readable_exts = {".json", ".css", ".js", ".ts", ".html", ".md", ".txt"}
    for f in files:
        if not isinstance(f, dict):
            continue
        item = dict(f)
        path_str = str(item.get("path") or "")
        item["exists"] = False
        item["content"] = None
        item["error"] = None
        try:
            ext = Path(path_str.split("#", 1)[0]).suffix.lower()
            if ext in readable_exts and item.get("status") != "stub":
                content, err = _safe_read_text(path_str)
                if err is None and content is not None:
                    item["exists"] = True
                    item["content"] = content
                else:
                    item["error"] = err
            else:
                # still surface existence
                content, err = _safe_read_text(path_str)
                if err is None and content is not None:
                    item["exists"] = True
                else:
                    item["error"] = item.get("error") or err
        except Exception as e:  # defensive
            item["error"] = f"{type(e).__name__}: {e}"
        hydrated.append(item)
    entry = dict(entry)
    entry["files"] = hydrated
    return entry


def _list_themes() -> list[dict[str, str]]:
    root = _lab_root()
    themes: list[dict[str, str]] = []
    if not root.exists():
        return themes
    for path in sorted(root.glob("theme_*.json")):
        try:
            data = _load_json(path)
            theme_id = data.get("theme_id") or path.stem
            title_en = data.get("title_en")
            title_es = data.get("title_es")
            themes.append(
                {
                    "id": path.stem,
                    "title": data.get("title") or title_en or title_es or theme_id,
                    "title_en": title_en,
                    "title_es": title_es,
                    "theme_id": theme_id,
                    "path": str(path),
                }
            )
        except Exception:
            continue
    return themes


def _list_content_resources() -> list[dict[str, Any]]:
    """
    List existing content resources from /content/{lang}/{domain}/*.json so the
    Content Map can surface them in the accordions.
    """
    root = _content_root()
    resources: list[dict[str, Any]] = []
    if not root.exists():
        return resources
    for path in sorted(root.glob("*/*/*.json")):
        try:
            rel = path.relative_to(root)
            lang = rel.parts[0]
            domain = rel.parts[1]
            slug = path.stem
            data = _load_json(path)
            meta = data.get("meta") or {}
            title_es = meta.get("title_es")
            title_en = meta.get("title_en")
            levels = meta.get("levels") or meta.get("level") or []
            if isinstance(levels, str):
                levels = [levels]
            resources.append(
                {
                    "id": slug,
                    "lang": lang,
                    "domain": domain,
                    "title_es": title_es,
                    "title_en": title_en,
                    "levels": levels if isinstance(levels, list) else [],
                    "tags": meta.get("tags") or [],
                    "persisted": True,
                }
            )
        except Exception:
            continue
    return resources


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
        lab_can_edit_schemas=_is_super_admin(),
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


@bp.get("/api/content-lab/blocks")
@login_required
def content_lab_blocks():
    if not _lab_enabled():
        abort(404)
    if not getattr(g, "is_admin", False):
        abort(403)
    return jsonify({"items": _list_blocks()})


@bp.get("/api/content-lab/blocks/<slug>")
@login_required
def content_lab_block(slug: str):
    if not _lab_enabled():
        abort(404)
    if not getattr(g, "is_admin", False):
        abort(403)
    safe_slug = _slugify(slug)
    items = _list_blocks()
    for item in items:
        if item.get("id") == safe_slug or item.get("type") == safe_slug:
            return jsonify(_enrich_block(item))
    abort(404)


@bp.post("/api/content-lab/blocks/<slug>/schema")
@login_required
def content_lab_block_update_schema(slug: str):
    # Backwards-compatible alias to the generic file update
    return _content_lab_block_update_file(slug, allow_kinds={"schema"})


def _content_lab_block_update_file(slug: str, allow_kinds: set[str] | None = None):
    if not _lab_enabled():
        abort(404)
    if not _is_super_admin():
        abort(403)
    safe_slug = _slugify(slug)
    items = _list_blocks()
    target: dict[str, Any] | None = None
    for item in items:
        if item.get("id") == safe_slug or item.get("type") == safe_slug:
            target = item
            break
    if not target:
        abort(404)
    payload = request.get_json(silent=True) or {}
    path = (payload.get("path") or "").strip()
    content = payload.get("content")
    if not path or not isinstance(content, str):
        return jsonify({"ok": False, "error": "path and content required"}), 400
    files = target.get("files") or []
    match = None
    for f in files:
        if not isinstance(f, dict):
            continue
        if f.get("path") == path and (allow_kinds is None or f.get("kind") in allow_kinds):
            match = f
            break
    if not match:
        return jsonify({"ok": False, "error": "file not registered for this block"}), 400
    suffix = Path(path.split("#", 1)[0]).suffix.lower()
    if suffix == ".json":
        try:
            json.loads(content)
        except Exception as e:
            return jsonify({"ok": False, "error": f"invalid JSON: {e}"}), 400
    bytes_written, err = _safe_write_text(path, content)
    if err:
        return jsonify({"ok": False, "error": err}), 400
    return jsonify({"ok": True, "bytes_written": bytes_written or 0, "kind": match.get("kind")})


@bp.post("/api/content-lab/blocks/<slug>/file")
@login_required
def content_lab_block_update_file(slug: str):
    # Allow schema, css, and example files
    return _content_lab_block_update_file(slug, allow_kinds={"schema", "css", "example"})


@bp.get("/api/content-lab/resource/<lang>/<domain>/<slug>", endpoint="content_lab_resource_file_get")
@login_required
def content_lab_resource_file_get(lang: str, domain: str, slug: str):
    if not _lab_enabled():
        abort(404)
    if not getattr(g, "is_admin", False):
        abort(403)
    safe_lang = _slugify(lang).lower()
    safe_domain = _slugify(domain).lower()
    safe_slug = _slugify(slug).lower()
    path = _content_root() / safe_lang / safe_domain / f"{safe_slug}.json"
    if not path.is_file():
        abort(404)
    try:
        data = _load_json(path)
        return jsonify({"ok": True, "data": data, "path": str(path.relative_to(_project_root()))})
    except Exception as e:
        return jsonify({"ok": False, "error": f"{type(e).__name__}: {e}"}), 500


@bp.put("/api/content-lab/resource/<lang>/<domain>/<slug>", endpoint="content_lab_resource_file_save")
@login_required
def content_lab_resource_file_save(lang: str, domain: str, slug: str):
    if not _lab_enabled():
        abort(404)
    if not _is_super_admin():
        abort(403)
    safe_lang = _slugify(lang).lower()
    safe_domain = _slugify(domain).lower()
    safe_slug = _slugify(slug).lower()
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "error": "invalid JSON payload"}), 400
    path = _content_root() / safe_lang / safe_domain / f"{safe_slug}.json"
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return jsonify({"ok": True, "path": str(path.relative_to(_project_root()))})
    except Exception as e:
        return jsonify({"ok": False, "error": f"{type(e).__name__}: {e}"}), 500


@bp.get("/content-lab/map")
@login_required
def content_lab_map():
    if not _lab_enabled():
        abort(404)
    if not getattr(g, "is_admin", False):
        abort(403)
    return render_template(
        "admin/content_lab_map.html",
        resource_seed=_list_content_resources(),
    )


@bp.get("/content-lab/editor/<resource_id>")
@login_required
def content_lab_editor(resource_id: str):
    if not _lab_enabled():
        abort(404)
    if not getattr(g, "is_admin", False):
        abort(403)
    safe_id = _slugify(resource_id)
    return render_template("admin/content_lab_editor.html", resource_id=safe_id)
