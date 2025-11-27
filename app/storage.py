# app/storage.py
from __future__ import annotations

import io
import json
import os
from pathlib import Path
from typing import Any, Iterable, Optional, Tuple

# ─────────────────────────────────────────────────────────────
# Project & data roots
# ─────────────────────────────────────────────────────────────

def get_project_root() -> Path:
    """
    Resolve the project root as the parent of the 'app' package directory.
    e.g., .../ProfePanda WebApp (new build)/
    """
    # This file lives at <project_root>/app/storage.py
    return Path(__file__).resolve().parents[1]

def get_data_root() -> Path:
    """Absolute path to the 'data' directory under project root."""
    return get_project_root() / "data"

# ─────────────────────────────────────────────────────────────
# Generic JSON read/write (UTF-8, pretty, safe)
# ─────────────────────────────────────────────────────────────

def read_json(abs_path: os.PathLike | str) -> Optional[dict]:
    """
    Read a JSON file. Returns dict on success, None if file missing or malformed.
    """
    p = Path(abs_path)
    try:
        if not p.exists() or not p.is_file():
            return None
        with p.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

def write_json(abs_path: os.PathLike | str, obj: Any, *, pretty: bool = True) -> bool:
    """
    Write a JSON file (creates parent dirs). Returns True on success, False on failure.
    """
    p = Path(abs_path)
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        kwargs = {"ensure_ascii": False}
        if pretty:
            kwargs.update({"indent": 2, "sort_keys": True})
        data = json.dumps(obj, **kwargs)
        # Use atomic write to reduce risk of partial files
        tmp = p.with_suffix(p.suffix + ".tmp")
        with io.open(tmp, "w", encoding="utf-8") as f:
            f.write(data)
        tmp.replace(p)
        return True
    except Exception:
        return False

# ─────────────────────────────────────────────────────────────
# Content-specific helpers (Articles / Exercises / Glossary)
# ─────────────────────────────────────────────────────────────

VALID_DOMAINS = {"articles", "exercises", "glossary", "ui"}

def _domain_root(domain: str) -> Path:
    if domain not in VALID_DOMAINS:
        raise ValueError(f"Invalid domain: {domain!r}. Expected one of {sorted(VALID_DOMAINS)}.")
    return get_data_root() / domain

def list_slugs(domain: str) -> list[str]:
    """
    Return a list of folder names (slugs) under data/<domain>/.
    Does not validate inner structure; just lists directories.
    """
    root = _domain_root(domain)
    if not root.exists():
        return []
    return sorted([p.name for p in root.iterdir() if p.is_dir()])

def article_folder(slug: str) -> Path:
    """Absolute path to data/articles/<slug>/."""
    return _domain_root("articles") / slug

def article_json_path(slug: str) -> Path:
    """Absolute path to data/articles/<slug>/article.json."""
    return article_folder(slug) / "article.json"

def ensure_article_dirs(slug: str) -> Tuple[Path, Path, Path]:
    """
    Ensure standard article directories exist:
      data/articles/<slug>/
      data/articles/<slug>/media/audio/
      data/articles/<slug>/media/img/
    Returns (root, audio_dir, img_dir).
    """
    root = article_folder(slug)
    audio_dir = root / "media" / "audio"
    img_dir = root / "media" / "img"
    for d in (root, audio_dir.parent, audio_dir, img_dir):
        d.mkdir(parents=True, exist_ok=True)
    return root, audio_dir, img_dir

def media_path(domain: str, slug: str, *parts: Iterable[str]) -> Path:
    """
    Build an absolute path for a media file under a content item.
    Example:
      media_path("articles", "ser-y-estar", "audio", "w_ejemplo_01.mp3")
      -> <project>/data/articles/ser-y-estar/media/audio/w_ejemplo_01.mp3
    """
    base = _domain_root(domain) / slug / "media"
    return base.joinpath(*parts)

# -------------------------------
# Glossary-specific helpers
# -------------------------------

def glossary_folder(slug: str) -> Path:
    return _domain_root("glossary") / slug

def ensure_glossary_dirs(slug: str) -> tuple[Path, Path, Path]:
    """
    Ensure standard glossary directories exist:
      data/glossary/<slug>/
      data/glossary/<slug>/media/audio/entry/
      data/glossary/<slug>/media/audio/examples/
    Returns (root, entry_audio_dir, examples_audio_dir)
    """
    root = glossary_folder(slug)
    entry_dir = media_path("glossary", slug, "audio", "entry")
    ex_dir = media_path("glossary", slug, "audio", "examples")
    for d in (root, entry_dir.parent, entry_dir, ex_dir):
        d.mkdir(parents=True, exist_ok=True)
    return root, entry_dir, ex_dir

# New centralized audio layout under data/glossary/audio/{entry|examples}/{slug}/
def ensure_glossary_audio_dirs(slug: str) -> tuple[Path, Path]:
    base = get_data_root() / 'glossary' / 'audio'
    entry_dir = base / 'entry' / slug
    ex_dir = base / 'examples' / slug
    for d in (entry_dir, ex_dir):
        d.mkdir(parents=True, exist_ok=True)
    return entry_dir, ex_dir

# ─────────────────────────────────────────────────────────────
# Convenience: safe loaders/savers for articles (extend later)
# ─────────────────────────────────────────────────────────────

def load_article(slug: str) -> Optional[dict]:
    """Load article.json for a slug, or None if missing/invalid."""
    return read_json(article_json_path(slug))

def save_article(slug: str, payload: dict) -> bool:
    """Save article.json for a slug; creates folders if needed."""
    ensure_article_dirs(slug)
    return write_json(article_json_path(slug), payload, pretty=True)

def delete_article(slug: str) -> bool:
    """
    Delete the entire article directory at data/articles/<slug>/.
    Returns True on success, False if slug invalid or nothing removed.
    """
    # Very conservative slug check (lowercase letters, digits, hyphen; must start alnum)
    if not slug or not slug[0].isalnum() or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-" for c in slug):
        return False

    root = article_folder(slug)
    try:
        if not root.exists() or not root.is_dir():
            return False
        # Lazy import to avoid header changes
        import shutil  # noqa: WPS433
        shutil.rmtree(root)
        return True
    except Exception:
        return False
