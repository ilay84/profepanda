# app/langs.py
from __future__ import annotations
from typing import Dict, List, Optional, Tuple

"""
Canonical language catalog for ProfePanda.

- Keys are stable base codes we store in JSON (article versions).
- Each entry includes a native-label for UI and a set of alias codes we normalize FROM.
- Keep this list small, predictable, and extensible.

Design notes
------------
• We include ~20 high-likelihood learner languages (plus Spanish itself).
• Alias lists capture common region/script variants so lookups are bullet-proof.
• Prefer ES/EN automatically as secondary fallbacks in preference_chain().
"""

# Base code -> { label, aliases }
LANGS: Dict[str, Dict[str, List[str]]] = {
    "es": {  # Spanish (site’s native target; include to host ES versions)
        "label": "Español",
        "aliases": [
            "es-es", "es-ar", "es-mx", "es-cl", "es-co", "es-pe", "es-uy", "es-ve", "es-ec", "es-bo",
            "es-py", "es-gt", "es-cr", "es-pa", "es-do", "es-sv", "es-hn", "es-ni", "es-pr", "es-419",
        ],
    },
    "en": {
        "label": "English",
        "aliases": ["en-us", "en-gb", "en-au", "en-ca", "en-nz", "en-ie", "en-in"],
    },
    "pt": {
        "label": "Português",
        "aliases": ["pt-br", "pt-pt", "pt-ao", "pt-mz"],
    },
    "fr": {
        "label": "Français",
        "aliases": ["fr-fr", "fr-ca", "fr-be", "fr-ch"],
    },
    "de": {
        "label": "Deutsch",
        "aliases": ["de-de", "de-at", "de-ch"],
    },
    "it": {
        "label": "Italiano",
        "aliases": ["it-it", "it-sm", "it-ch"],
    },
    "zh": {  # Chinese (rolled-up; normalize Han variants here)
        "label": "中文",
        "aliases": ["zh-cn", "zh-sg", "zh-hans", "zh-hant", "zh-tw", "zh-hk", "zh-mo"],
    },
    "ja": {
        "label": "日本語",
        "aliases": ["ja-jp"],
    },
    "ko": {
        "label": "한국어",
        "aliases": ["ko-kr"],
    },
    "ar": {
        "label": "العربية",
        "aliases": ["ar-sa", "ar-eg", "ar-ma", "ar-ly", "ar-ae", "ar-jo", "ar-tn", "ar-dz", "ar-iq", "ar-kw", "ar-bh", "ar-om", "ar-qa", "ar-sy", "ar-ye", "ar-lb"],
    },
    "ru": {
        "label": "Русский",
        "aliases": ["ru-ru", "ru-by", "ru-kz", "ru-ua"],
    },
    "hi": {
        "label": "हिन्दी",
        "aliases": ["hi-in"],
    },
    "tr": {
        "label": "Türkçe",
        "aliases": ["tr-tr", "tr-cy"],
    },
    "nl": {
        "label": "Nederlands",
        "aliases": ["nl-nl", "nl-be"],
    },
    "pl": {
        "label": "Polski",
        "aliases": ["pl-pl"],
    },
    "he": {
        "label": "עברית",
        "aliases": ["he-il", "iw-il"],  # legacy iw
    },
    "vi": {
        "label": "Tiếng Việt",
        "aliases": ["vi-vn"],
    },
    "th": {
        "label": "ไทย",
        "aliases": ["th-th"],
    },
    "id": {
        "label": "Bahasa Indonesia",
        "aliases": ["id-id"],
    },
    "uk": {
        "label": "Українська",
        "aliases": ["uk-ua"],
    },
}

# Precompute normalization maps
_supported_codes = set(LANGS.keys())
_alias_to_base: Dict[str, str] = {}
for base, meta in LANGS.items():
    _alias_to_base[base] = base  # base normalizes to itself
    for a in meta.get("aliases", []):
        _alias_to_base[a.lower()] = base


def supported_codes() -> List[str]:
    """Return stable, ordered list of base codes we support."""
    return list(LANGS.keys())


def normalize_lang(code: Optional[str]) -> Optional[str]:
    """
    Normalize an incoming lang code (cookie, querystring, browser, etc.)
    to a supported base code. Returns None if not recognized.
    """
    if not code:
        return None
    c = code.strip().lower()
    # quick exact hit
    if c in _supported_codes:
        return c
    # split on '-' to try primary subtag
    if c in _alias_to_base:
        return _alias_to_base[c]
    # try progressive truncation: xx-yy-zz -> xx-yy -> xx
    parts = c.split("-")
    while len(parts) > 1:
        parts = parts[:-1]
        cand = "-".join(parts)
        if cand in _alias_to_base:
            return _alias_to_base[cand]
        if cand in _supported_codes:
            return cand
    # final attempt: primary language subtag
    primary = parts[0]
    if primary in _supported_codes:
        return primary
    return None


def label_for(code: str) -> str:
    """
    Get the native label for a supported base code; falls back to the code.
    """
    base = normalize_lang(code) or code
    return LANGS.get(base, {}).get("label", base)


def preference_chain(current_code: Optional[str]) -> List[str]:
    """
    Build an ordered list of language codes to try for content resolution.
    Rule:
      1) current normalized lang (if recognized)
      2) ensure ES/EN are high-priority fallbacks (order depends on current)
      3) all remaining supported languages (stable order), excluding duplicates
    """
    seen = set()
    out: List[str] = []

    cur = normalize_lang(current_code)
    if cur and cur in _supported_codes:
        out.append(cur); seen.add(cur)

    # Prefer ES/EN as strong secondary fallbacks
    if cur != "es" and "es" in _supported_codes and "es" not in seen:
        out.append("es"); seen.add("es")
    if cur != "en" and "en" in _supported_codes and "en" not in seen:
        out.append("en"); seen.add("en")

    # The rest in catalog order
    for code in supported_codes():
        if code not in seen:
            out.append(code); seen.add(code)

    return out


def available_languages_for_article(versions: Dict[str, dict]) -> List[Tuple[str, str]]:
    """
    Given an article's versions dict, return [(code, label)] for codes we support
    and that exist in the article.
    """
    if not versions:
        return []
    found = []
    for code in supported_codes():
        if code in versions:
            found.append((code, label_for(code)))
    return found


def sanitize_versions_payload(raw: Dict[str, Dict[str, str]]) -> Dict[str, Dict[str, str]]:
    """
    Accept a raw versions payload (e.g., from form with keys like versions[en][title])
    and keep only supported base codes; strip empty entries.
    Each kept entry contains only 'label', 'title', 'html', 'summary_html' if present.
    """
    if not isinstance(raw, dict):
        return {}
    clean: Dict[str, Dict[str, str]] = {}
    for key, data in raw.items():
        base = normalize_lang(key)
        if not base:
            continue
        if base not in _supported_codes:
            continue
        if not isinstance(data, dict):
            continue
        # If everything is empty, skip
        has_content = any((data.get("title") or data.get("html") or data.get("summary_html")))
        if not has_content:
            continue
        clean[base] = {
            "label": LANGS[base]["label"],  # enforce canonical label
            "title": (data.get("title") or "").strip(),
            "html": (data.get("html") or "").strip(),
            "summary_html": (data.get("summary_html") or "").strip(),
        }
    return clean

# ─────────────────────────────────────────────────────────────
# UI strings (keyed) — inline-editable store for ES/EN
# Files live at app/i18n/ui_es.json and app/i18n/ui_en.json
# ─────────────────────────────────────────────────────────────
from pathlib import Path
import json

DEFAULT_LANG = "es"

_UI_DIR = Path(__file__).resolve().parent / "i18n"
_UI_CACHE: Dict[str, Dict[str, str]] = {"es": {}, "en": {}}
_UI_LOADED = False

def _ui_path(lang: str) -> Path:
    base = normalize_lang(lang) or DEFAULT_LANG
    return _UI_DIR / f"ui_{base}.json"

def _load_ui_store() -> None:
    """Lazy-load the UI key stores into memory."""
    global _UI_LOADED, _UI_CACHE
    if _UI_LOADED:
        return
    _UI_DIR.mkdir(parents=True, exist_ok=True)
    for code in ("es", "en"):
        p = _ui_path(code)
        if p.exists():
            try:
                _UI_CACHE[code] = json.loads(p.read_text(encoding="utf-8")) or {}
            except Exception:
                _UI_CACHE[code] = {}
        else:
            _UI_CACHE[code] = {}
    _UI_LOADED = True

def ui(key: str, lang: Optional[str] = None, fallback: bool = True) -> str:
    """
    Retrieve a localized UI string by key.
    - In public templates, call ui(key, g.app_lang, fallback=True).
    - In admin editing contexts, pass fallback=False so missing values show as empty.
    """
    _load_ui_store()
    lang = normalize_lang(lang) or DEFAULT_LANG
    if not fallback:
        return _UI_CACHE.get(lang, {}).get(key, "")
    # Try preference chain (current → ES → EN → others if ever added)
    for code in preference_chain(lang):
        store = _UI_CACHE.get(code, {})
        if key in store and store[key]:
            return store[key]
    return ""

def ui_get_pair(key: str) -> Dict[str, str]:
    """Return both ES/EN values for an editor modal."""
    _load_ui_store()
    return {
        "es": _UI_CACHE.get("es", {}).get(key, ""),
        "en": _UI_CACHE.get("en", {}).get(key, ""),
    }

def ui_update_pair(key: str, es: str, en: str) -> None:
    """
    Update a key in both stores and persist to disk.
    Intended for use by an admin-only POST handler.
    """
    _load_ui_store()
    _UI_CACHE.setdefault("es", {})[key] = (es or "").strip()
    _UI_CACHE.setdefault("en", {})[key] = (en or "").strip()

    # Persist
    for code in ("es", "en"):
        p = _ui_path(code)
        p.parent.mkdir(parents=True, exist_ok=True)
        # Compact JSON for speed; stable key order for diffs
        p.write_text(json.dumps(_UI_CACHE.get(code, {}), ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")

