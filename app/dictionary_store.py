from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.storage import get_data_root, read_json, write_json

# -------------------------------
# Paths
# -------------------------------

def _root() -> Path:
    root = get_data_root() / 'dictionary'
    root.mkdir(parents=True, exist_ok=True)
    return root


def entry_path(slug: str) -> Path:
    return _root() / f"{slug}.json"


def list_slugs() -> List[str]:
    return sorted([p.stem for p in _root().glob('*.json')])

# -------------------------------
# Normalization & slugs
# -------------------------------

def _norm(s: str) -> str:
    s = (s or '').lower().strip()
    s = unicodedata.normalize('NFD', s)
    return ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')


SLUG_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')


def make_slug(text: str) -> str:
    base = _norm(text or '')
    base = re.sub(r'[^a-z0-9]+', '-', base).strip('-')
    return base or 'item'


def slug_exists(slug: str) -> bool:
    try:
        return entry_path(slug).exists()
    except Exception:
        return False


def unique_slug(text: str) -> str:
    base = make_slug(text)
    s = base
    i = 2
    while slug_exists(s):
        s = f"{base}-{i}"
        i += 1
    return s

# -------------------------------
# Controlled enums
# -------------------------------

POS = {
    'sustantivo','verbo','adjetivo','adverbio','pronombre','determinante','preposición','conjunción','interjección',
    'locución_nominal','locución_verbal','locución_adjetival','locución_adverbial','locución_preposicional',
    'expresión_idiomática','modismo','frase_hecha',
    'marcador_discursivo','muletilla','fórmula_social','intensificador','exclamación',
}

REGISTER = {'formal','neutral','informal','vulgar'}
DOMAIN = {'comida','salud','emociones','familia','trabajo','educación','tecnología','política','economía','cultura pop','deporte','naturaleza','sociedad','transporte'}
TONE = {'afectuoso','despectivo','irónico','humorístico','poético'}
FREQ = {'muy común','común','menos común','raro'}
STATUS = {'vigente','en desuso','arcaico','regionalismo fuerte'}
SENSITIVITY = {None,'potencialmente ofensivo','lenguaje explícito','connotación sexual'}

# -------------------------------
# Load/save entry
# -------------------------------

def load_entry(slug: str) -> Optional[Dict[str, Any]]:
    slug = (slug or '').strip().lower()
    if not SLUG_RE.match(slug):
        return None
    return read_json(entry_path(slug))


def save_entry(payload: Dict[str, Any]) -> Tuple[bool, List[str]]:
    ok, errs = validate_entry(payload)
    if not ok:
        return False, errs
    if not write_json(entry_path(payload['slug']), payload, pretty=True):
        return False, ['Failed to write entry JSON']
    return True, []


def list_entries_meta() -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for slug in list_slugs():
        data = load_entry(slug) or {}
        word = (data.get('word') or slug).strip()
        senses = data.get('senses') or []
        pos = (senses[0].get('pos') if senses and isinstance(senses[0], dict) else '') if isinstance(senses, list) else ''
        items.append({'slug': slug, 'word': word, 'pos': pos})
    return items

# -------------------------------
# Validation
# -------------------------------

def _err(msg: str, out: List[str]) -> None:
    out.append(msg)


def validate_entry(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    errs: List[str] = []
    if not isinstance(data, dict):
        return False, ['Entry must be an object']

    word = (data.get('word') or '').strip()
    slug = (data.get('slug') or '').strip()
    if not word:
        _err("'word' is required", errs)
    if not slug or not SLUG_RE.match(slug):
        _err("'slug' is required (lowercase-with-hyphens)", errs)

    senses = data.get('senses')
    if not isinstance(senses, list) or not senses:
        _err("'senses' must be a non-empty array", errs)
        return (len(errs) == 0), errs

    for i, s in enumerate(senses, start=1):
        if not isinstance(s, dict):
            _err(f"sense #{i}: must be an object", errs)
            continue
        pos = s.get('pos')
        if pos not in POS:
            _err(f"sense #{i}: pos invalid", errs)
        reg = s.get('register')
        if reg is not None and reg not in REGISTER:
            _err(f"sense #{i}: register invalid", errs)
        freq = s.get('freq')
        if freq is not None and freq not in FREQ:
            _err(f"sense #{i}: freq invalid", errs)
        for d in (s.get('domain') or []):
            if d not in DOMAIN:
                _err(f"sense #{i}: unknown domain {d!r}", errs)
        for t in (s.get('tone') or []):
            if t not in TONE:
                _err(f"sense #{i}: unknown tone {t!r}", errs)
        st = s.get('status')
        if st is not None and st not in STATUS:
            _err(f"sense #{i}: status invalid", errs)
        sens = s.get('sensitivity')
        if sens not in SENSITIVITY:
            _err(f"sense #{i}: sensitivity invalid", errs)
        if not (s.get('definition_es') or s.get('definition_en')):
            _err(f"sense #{i}: definition_es/en required", errs)

    return (len(errs) == 0), errs
