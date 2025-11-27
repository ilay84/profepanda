# app/exercises_store.py
from __future__ import annotations
import os, json, re, hashlib, tempfile, shutil
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path

try:
    # Flask optional import for app root / config
    from flask import current_app
except Exception:  # pragma: no cover
    current_app = None  # type: ignore


# ─────────────────────────────────────────────────────────────
# Path helpers
# ─────────────────────────────────────────────────────────────
def _app_root() -> str:
    if current_app and current_app.root_path:
        return current_app.root_path
    return os.getcwd()

def _base_dir() -> str:
    """
    Base directory for exercises, defaulting to <project_root>/data/exercises.
    If EXERCISES_DIR is set in Flask config:
      - absolute paths are used as-is
      - relative paths are resolved under <project_root>/data/
    """
    cfg = (getattr(current_app, "config", {}) or {}) if current_app else {}
    rel = cfg.get("EXERCISES_DIR", os.path.join("exercises"))  # default subdir under data/
    try:
        from app.storage import get_data_root  # avoid early import loops
        data_root = str(get_data_root())
    except Exception:
        # Fallback to previous behavior (rare)
        data_root = os.path.join(_app_root(), "data")
    base = rel if os.path.isabs(rel) else os.path.join(data_root, rel)
    os.makedirs(base, exist_ok=True)
    return base

def _type_dir(ex_type: str) -> str:
    p = os.path.join(_base_dir(), ex_type)
    os.makedirs(p, exist_ok=True)
    return p

def _slug_dir(ex_type: str, slug: str) -> str:
    p = os.path.join(_type_dir(ex_type), slug)
    os.makedirs(p, exist_ok=True)
    return p

def _index_path() -> str:
    return os.path.join(_base_dir(), "index.json")

def _version_path(ex_type: str, slug: str, ver: str) -> str:
    return os.path.join(_slug_dir(ex_type, slug), f"{ver}.json")

def _current_path(ex_type: str, slug: str) -> str:
    return os.path.join(_slug_dir(ex_type, slug), "current.json")


# ─────────────────────────────────────────────────────────────
# Core utilities
# ─────────────────────────────────────────────────────────────
def _sha256_str(data: str) -> str:
    return "sha256:" + hashlib.sha256(data.encode("utf-8")).hexdigest()

def _atomic_write(path: str, data: str) -> None:
    d = os.path.dirname(path)
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".ppx-", dir=d, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(data)
        os.replace(tmp, path)
    finally:
        try:
            if os.path.exists(tmp):
                os.remove(tmp)
        except Exception:
            pass

def _read_json(path: str) -> Optional[Dict[str, Any]]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return None


# ─────────────────────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────────────────────
VALID_TYPES = {"tf", "mcq", "fitb", "dnd", "dictation"}

_slug_re = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

def _err(msg: str) -> Tuple[bool, List[str]]:
    return False, [msg]

def validate_exercise(payload: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Minimal schema validation (shared + type-specific for tf/mcq).
    Returns (ok, errors[]).
    """
    errs: List[str] = []
    if not isinstance(payload, dict):
        return _err("Payload must be a JSON object.")

    ex_type = payload.get("type")
    slug = payload.get("slug") or ""
    items = payload.get("items")

    if ex_type not in VALID_TYPES:
        errs.append(f'Unsupported "type": {ex_type!r}')
    if not slug or not _slug_re.match(str(slug)):
        errs.append('Field "slug" is required (lowercase-with-hyphens).')
    if not isinstance(items, list) or not items:
        errs.append('Field "items" must be a non-empty array.')

    # Titles / instructions (at least one language)
    if not (payload.get("title_es") or payload.get("title_en")):
        errs.append('One of "title_es"/"title_en" is required.')
    if not (payload.get("instructions_es") or payload.get("instructions_en")):
        errs.append('One of "instructions_es"/"instructions_en" is required.')

    # Type-specific
    if ex_type == "tf" and isinstance(items, list):
        for i, it in enumerate(items, start=1):
            if not (it.get("statement_es") or it.get("statement_en")):
                errs.append(f"Item #{i}: statement_es/en required.")
            if str(it.get("answer")).lower() not in {"true", "false"}:
                errs.append(f"Item #{i}: answer must be 'true' or 'false'.")
            if not isinstance(it.get("order"), int):
                errs.append(f"Item #{i}: integer 'order' is required.")
    if ex_type == "mcq" and isinstance(items, list):
        for i, it in enumerate(items, start=1):
            if not (it.get("question_es") or it.get("question_en")):
                errs.append(f"Item #{i}: question_es/en required.")
            # Options array (language-specific)
            opt_list = it.get("options_es") or it.get("options_en") or it.get("options")
            if not isinstance(opt_list, list) or not opt_list:
                errs.append(f"Item #{i}: options array required.")
            else:
                if not any(bool(getattr(o, "get", lambda k, d=None: o.get(k, d))("correct")) for o in opt_list if isinstance(o, dict)):
                    errs.append(f"Item #{i}: at least one option must be correct.")
            if not isinstance(it.get("order"), int):
                errs.append(f"Item #{i}: integer 'order' is required.")

    if ex_type == "dnd" and isinstance(items, list):
        # Exactly one slide for MVP
        if len(items) != 1:
            errs.append("For 'dnd', exactly one item is required (single slide).")
        else:
            it = items[0]
            if not isinstance(it.get("order"), int):
                errs.append("Item #1: integer 'order' is required.")
            cols = it.get("columns")
            toks = it.get("tokens")
            if not isinstance(cols, list) or len(cols) < 2:
                errs.append("Item #1: at least two columns are required.")
            else:
                col_ids = set()
                for ci, c in enumerate(cols, start=1):
                    cid = c.get("id")
                    if not isinstance(cid, str) or not cid:
                        errs.append(f"Item #1: column #{ci} must have string 'id'.")
                    if cid in col_ids:
                        errs.append(f"Item #1: duplicate column id '{cid}'.")
                    col_ids.add(cid)
                    if not (c.get("label_es") or c.get("label_en")):
                        errs.append(f"Item #1: column #{ci} needs label_es/en.")
            if not isinstance(toks, list) or len(toks) < 1:
                errs.append("Item #1: at least one token is required.")
            else:
                for ti, t in enumerate(toks, start=1):
                    if not (t.get("text_es") or t.get("text_en")):
                        errs.append(f"Item #1: token #{ti} needs text_es/en.")
                    corr = t.get("correct")
                    if not isinstance(corr, str) or not corr:
                        errs.append(f"Item #1: token #{ti} must have 'correct' column id.")
                    # Only validate membership if columns parsed OK
                    try:
                        if isinstance(cols, list):
                            ids = {c.get('id') for c in cols if isinstance(c, dict)}
                            if isinstance(corr, str) and corr and corr not in ids:
                                errs.append(f"Item #1: token #{ti} 'correct' refers to unknown column '{corr}'.")
                    except Exception:
                        pass
                    # Disallow per-token media; media is global for DnD
                    if isinstance(t, dict) and 'media' in t and t.get('media'):
                        errs.append(f"Item #1: token #{ti} may not define 'media' (use top-level media).")

        # Optional top-level media (single)
        media = payload.get("media")
        if media is not None:
            if not isinstance(media, dict):
                errs.append("Field 'media' must be an object if provided.")
            else:
                for k in list(media.keys()):
                    if k not in {"image_url", "audio_url", "video_url"}:
                        errs.append(f"media.{k}: unsupported key (allowed: image_url, audio_url, video_url)")
                for k in ["image_url", "audio_url", "video_url"]:
                    if k in media and not (isinstance(media.get(k), str) and media.get(k).strip()):
                        errs.append(f"media.{k} must be a non-empty string if provided.")

    if ex_type == "dictation" and isinstance(items, list):
        # Dictation requirements per planning/dictation.txt
        for i, it in enumerate(items, start=1):
            # Require audio and transcript (neutral)
            au = it.get("audio_url")
            if not isinstance(au, str) or not au.strip():
                errs.append(f"Item #{i}: audio_url is required.")
            tr = it.get("transcript")
            if not (isinstance(tr, str) and tr.strip()):
                errs.append(f"Item #{i}: transcript is required.")
            # Variants, if present, must be an array of strings
            variants = it.get("variants")
            if variants is not None:
                if not isinstance(variants, list) or not all(isinstance(v, str) for v in variants):
                    errs.append(f"Item #{i}: variants must be an array of strings if provided.")
            if not isinstance(it.get("order"), int):
                errs.append(f"Item #{i}: integer 'order' is required.")

        # Validate known options types when present
        opts = payload.get("options") or {}
        if opts and isinstance(opts, dict):
            for k in ["ignoreCase", "ignorePunctuation", "normalizeWhitespace", "ignoreAccents", "autoPlay", "allowRetry"]:
                if k in opts and not isinstance(opts.get(k), (bool, type(None))):
                    errs.append(f"Option '{k}' must be boolean.")
            for k in ["minCharsToEnableCheck"]:
                if k in opts and not (isinstance(opts.get(k), int) and opts.get(k) >= 0):
                    errs.append(f"Option '{k}' must be a non-negative integer.")
            # attemptsMax: 0 means unlimited (builder uses 0 for unlimited)
            for k in ["attemptsMax"]:
                if k in opts and not (isinstance(opts.get(k), int) and opts.get(k) >= 0):
                    errs.append(f"Option '{k}' must be an integer >= 0.")

        # Hint: related JSON Schema (if present)
    try:
        from pathlib import Path as _PP
        _schema = _PP(__file__).resolve().parents[1] / 'data' / 'schemas' / 'exercises' / f"{ex_type}.schema.json"
        if _schema.exists() and errs:
            errs.append(f"See schema: /data/schemas/exercises/{ex_type}.schema.json")
    except Exception:
        pass

    return (len(errs) == 0, errs)


# ─────────────────────────────────────────────────────────────
# Versioning helpers
# ─────────────────────────────────────────────────────────────
def _list_versions(ex_type: str, slug: str) -> List[str]:
    folder = _slug_dir(ex_type, slug)
    if not os.path.isdir(folder):
        return []
    vers = []
    for name in os.listdir(folder):
        if re.fullmatch(r"\d{3}\.json", name):
            vers.append(name[:3])
    return sorted(vers)

def _next_version(ex_type: str, slug: str) -> str:
    vers = _list_versions(ex_type, slug)
    if not vers:
        return "001"
    nxt = int(vers[-1]) + 1
    return f"{nxt:03d}"

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


# ─────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────
def load_exercise(ex_type: str, slug: str, version: str = "current") -> Optional[Dict[str, Any]]:
    """
    Returns parsed JSON for the given exercise (or None).
    version can be 'current' or a 'NNN' string.
    """
    if version == "current":
        cur = _read_json(_current_path(ex_type, slug))
        if not cur or "version" not in cur:
            return None
        version = f'{int(cur["version"]):03d}'
    path = _version_path(ex_type, slug, version)
    return _read_json(path)

def list_exercises(filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Returns index metadata dict. If filters provided, returns a filtered subset.
    """
    idx = _read_json(_index_path()) or {}
    if not filters:
        return idx
    out = {}
    for k, v in idx.items():
        ok = True
        for fk, fv in filters.items():
            if v.get(fk) != fv:
                ok = False
                break
        if ok:
            out[k] = v
    return out

def save_exercise(payload: Dict[str, Any], user: str = "admin") -> Tuple[bool, List[str], Optional[Dict[str, Any]]]:
    """
    Validates and saves payload as the next immutable version, updates
    current.json and global index.json. Returns (ok, errs, saved_payload).
    """
    ok, errs = validate_exercise(payload)
    if not ok:
        return False, errs, None

    ex_type = payload["type"]
    slug = payload["slug"]
    folder = _slug_dir(ex_type, slug)

    # Prepare version + metadata
    version = _next_version(ex_type, slug)
    payload = dict(payload)  # shallow copy
    payload["version"] = int(version)
    payload["created_at"] = payload.get("created_at") or _now_iso()
    payload["created_by"] = payload.get("created_by") or user

    # Compute checksum on normalized JSON
    normalized = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    payload["checksum"] = _sha256_str(normalized)

    # Write version file atomically
    ver_path = _version_path(ex_type, slug, version)
    _atomic_write(ver_path, json.dumps(payload, ensure_ascii=False, indent=2))

    # Update current pointer
    _atomic_write(_current_path(ex_type, slug), json.dumps({"version": version}, ensure_ascii=False))

    # Update global index.json
    idx_path = _index_path()
    idx = _read_json(idx_path) or {}
    key = f"{ex_type}/{slug}"
    idx[key] = {
        "title_es": payload.get("title_es"),
        "title_en": payload.get("title_en"),
        "type": ex_type,
        "level": payload.get("level"),
        # New taxonomy-based classification (replaces tags)
        "taxonomy_paths": payload.get("taxonomy_paths") or [],
        # Legacy field kept for compatibility (unused by UI)
        "tags": payload.get("tags") or [],
        "version": version,
        "status": payload.get("status", "draft"),
        "updated_at": _now_iso(),
        "checksum": payload["checksum"],
    }
    _atomic_write(idx_path, json.dumps(idx, ensure_ascii=False, indent=2))

    return True, [], payload

def delete_exercise(ex_type: str, slug: str, hard: bool = False) -> bool:
    """
    Delete an exercise.
    - Soft delete (default): mark as 'archived' in index.json, keep files.
    - Hard delete: remove all files and index entry entirely.
    """
    idx_path = _index_path()
    idx = _read_json(idx_path) or {}
    key = f"{ex_type}/{slug}"
    if key not in idx:
        return False

    if hard:
        # Remove folder and index entry
        folder = os.path.join(_type_dir(ex_type), slug)
        try:
            shutil.rmtree(folder, ignore_errors=True)
        except Exception:
            pass
        idx.pop(key, None)
    else:
        # Soft delete
        idx[key]["status"] = "archived"
        idx[key]["updated_at"] = _now_iso()

    _atomic_write(idx_path, json.dumps(idx, ensure_ascii=False, indent=2))
    return True

def restore_exercise(ex_type: str, slug: str, version: str) -> Tuple[bool, Optional[str]]:
    """
    Restores an old version by cloning it to a new version number, updating current.json and index.json.
    """
    old = load_exercise(ex_type, slug, version)
    if not old:
        return False, "Version not found"
    # Clear version/checksum/created_at to be regenerated
    old = dict(old)
    old.pop("checksum", None)
    old["created_at"] = _now_iso()
    ok, errs, _ = save_exercise(old, user="restore")
    if not ok:
        return False, "; ".join(errs)
    return True, None

def get_media_dir(ex_type: str, slug: str) -> str:
    """
    Returns the media directory path for an exercise; ensures it exists.
    """
    path = os.path.join(_slug_dir(ex_type, slug), "media")
    os.makedirs(path, exist_ok=True)
    return path


