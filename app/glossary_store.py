from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Iterable
import shutil
import shutil

from app.storage import get_data_root, get_project_root, read_json, write_json
from app.pos_catalog import canonicalize, POS_VALUES as CANONICAL_POS_VALUES

# -------------------------------
# Paths
# -------------------------------

def _root() -> Path:
    root = get_data_root() / "glossary"
    root.mkdir(parents=True, exist_ok=True)
    return root

def _entries_root() -> Path:
    p = _root() / "entries"
    p.mkdir(parents=True, exist_ok=True)
    return p

def _countries_root() -> Path:
    p = _root() / "countries"
    p.mkdir(parents=True, exist_ok=True)
    return p

def _master_root() -> Path:
    p = _root() / "_master"
    p.mkdir(parents=True, exist_ok=True)
    return p


def entry_path(slug: str) -> Path:
    return _entries_root() / f"{slug}.json"


def list_slugs() -> List[str]:
    slugs: set[str] = set()
    # Preferred location: entries/*.json
    for p in _entries_root().glob("*.json"):
        if p.stem and not p.stem.startswith("_"):
            slugs.add(p.stem)
    # Back-compat: any legacy files directly under data/glossary/*.json
    for p in _root().glob("*.json"):
        if p.stem and not p.stem.startswith("_"):
            slugs.add(p.stem)
    return sorted(slugs)

# -------------------------------
# Normalization
# -------------------------------

def _norm(s: str) -> str:
    s = (s or "").lower().strip()
    s = unicodedata.normalize("NFD", s)
    return "".join(ch for ch in s if unicodedata.category(ch) != "Mn")


SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

# -------------------------------
# Canonical normalization for UI tokens (accept accents/spaces)
# -------------------------------
def _canon(s: str) -> str:
    v = _norm(s or "")
    # Replace spaces and any non-alphanumeric/underscore with single underscores
    try:
        v = v.replace(" ", "_")
        v = re.sub(r"[^a-z0-9_]", "_", v)
        v = re.sub(r"_+", "_", v).strip("_")
    except Exception:
        pass
    return v

# Canonical token sets (no accents, spaces as underscores)
REGISTER_C = {None, "formal", "neutral", "informal", "vulgar"}
FREQ_C = {None, "raro", "menos_comun", "comun", "muy_comun"}
DOMAIN_C = {
    "comida", "salud", "emociones", "familia", "trabajo", "educacion",
    "tecnologia", "politica", "economia", "cultura_pop", "deporte",
    "naturaleza", "sociedad", "transporte"
}
TONE_C = {"afectuoso", "despectivo", "ironico", "humoristico", "poetico", "agresivo"}
STATUS_C = {"vigente", "en_desuso", "arcaico", "regionalismo_fuerte"}
SENSITIVITY_C = {"potencialmente_ofensivo", "lenguaje_explicito", "connotacion_sexual"}
# -------------------------------
# Normalize entry payload for save (canonical tokens, ids, ordering)
# -------------------------------
def _normalize_pos(pos_raw: Any) -> Optional[str]:
    """Return the canonical POS token from the shared catalog."""
    normalized = canonicalize(pos_raw)
    if normalized and normalized in CANONICAL_POS_VALUES:
        return normalized
    return None


POS_C = set(CANONICAL_POS_VALUES)


def _normalize_for_save(payload: Dict[str, Any]) -> Dict[str, Any]:
    d = dict(payload or {})
    d["word"] = (d.get("word") or "").strip()
    d["slug"] = make_slug(d.get("slug") or d.get("word") or "item")
    alts_in = d.get("alt_spellings") if isinstance(d.get("alt_spellings"), list) else []
    d["alt_spellings"] = [str(a).strip() for a in alts_in if str(a).strip()]
    senses_in = d.get("senses") if isinstance(d.get("senses"), list) else []
    senses_out: list[dict] = []
    for i, s in enumerate(senses_in, start=1):
        if not isinstance(s, dict):
            continue
        sn = dict(s)
        sn["id"] = sn.get("id") or f"s{i}"
        # countries
        cl = []
        for c in (sn.get("countries") or []):
            if isinstance(c, str) and c.upper() in COUNTRIES:
                cl.append(c.upper())
        sn["countries"] = sorted(set(cl))
        # tokens
        sn_pos = _normalize_pos(sn.get("pos"))
        sn["pos"] = sn_pos
        sn["register"] = _canon(sn.get("register")) if sn.get("register") else None
        sn["freq"] = _canon(sn.get("freq")) if sn.get("freq") else None
        sn["domain"] = sorted(set(_canon(x) for x in (sn.get("domain") or []) if _canon(x)))
        sn["tone"] = sorted(set(_canon(x) for x in (sn.get("tone") or []) if _canon(x)))
        st_val = sn.get("status")
        st_list = st_val if isinstance(st_val, list) else ([st_val] if st_val else [])
        sn["status"] = sorted(set(_canon(x) for x in st_list if _canon(x)))
        se_val = sn.get("sensitivity")
        se_list = se_val if isinstance(se_val, list) else ([se_val] if se_val else [])
        sn["sensitivity"] = sorted(set(_canon(x) for x in se_list if _canon(x)))
        # variants (optional, sense-level)
        variants = sn.get("variants") if isinstance(sn.get("variants"), dict) else {}
        if variants:
            def _clean(v): return (v or "").strip() or None
            sn["variants"] = {
                "masc_sg": _clean(variants.get("masc_sg")),
                "masc_pl": _clean(variants.get("masc_pl")),
                "fem_sg": _clean(variants.get("fem_sg")),
                "fem_pl": _clean(variants.get("fem_pl")),
                "augmentative": _clean(variants.get("augmentative")),
                "diminutive": _clean(variants.get("diminutive")),
            }
        else:
            sn["variants"] = None
        # alt_forms
        af_in = sn.get("alt_forms") if isinstance(sn.get("alt_forms"), list) else []
        af_out: list[dict] = []
        for af in af_in:
            if not isinstance(af, dict):
                continue
            form = (af.get("form") or "").strip()
            if not form:
                continue
            afn = {
                "form": form,
                "type": _canon(af.get("type") or ""),
                "regions": [c for c in (af.get("regions") or []) if isinstance(c, str) and c.upper() in COUNTRIES],
                "note_es": (af.get("note_es") or "").strip() or None,
                "note_en": (af.get("note_en") or "").strip() or None,
                "audio": af.get("audio") or None,
                "related_slug": (af.get("related_slug") or "").strip() or None,
            }
            af_out.append(afn)
        if af_out:
            sn["alt_forms"] = af_out
        senses_out.append(sn)
    d["senses"] = senses_out
    return d

## NOTE: Token normalization and canonical enums are defined above.
## Remove duplicate legacy definitions to avoid override issues.

# -------------------------------
# Slug helpers (clean, safe)
# -------------------------------

def make_slug(text: str) -> str:
    base = _norm(text or "")
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return base or "item"


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
COUNTRIES = {
    "AR","UY","CL","MX","ES","CO","PE","PY","BO","EC",
    "VE","PR","DO","CU","GT","CR","PA","HN","NI","SV","GQ","US"}
POS = {"sustantivo","verbo","adjetivo","adverbio","locución","expresión","interjección","pronombre","conector"}
REGISTER = {None, "formal","neutral","informal","vulgar"}
FREQ = {None, "raro","menos_comun","comun","muy_comun"}
DOMAIN = {"comida","salud","deportes","politica","tecnologia","transporte","trabajo","familia","educacion","economia","cultura_pop"}
TONE = {"afectuoso","despectivo","ironico","humoristico"}
# Allow Spanish labels with spaces, matching admin UI values
STATUS = {"vigente", "en desuso", "arcaico", "regionalismo fuerte"}
SENSITIVITY = {"potencialmente ofensivo", "lenguaje explícito", "connotación sexual"}

# -------------------------------
# Load/save entry
# -------------------------------

def load_entry(slug: str) -> Optional[Dict[str, Any]]:
    slug = (slug or "").strip().lower()
    if not SLUG_RE.match(slug):
        return None
    return read_json(entry_path(slug))


def _referenced_audio_basenames(data: Dict[str, Any]) -> tuple[set[str], set[str]]:
    """
    Collect referenced audio basenames for entry-level audio and example-level audio.
    Returns (entry_audio_names, example_audio_names).
    """
    def _basename(url: str) -> str:
        try:
            return Path(str(url).split("?")[0]).name
        except Exception:
            return ""

    entry_refs: set[str] = set()
    ex_refs: set[str] = set()
    if isinstance(data.get("audio"), str) and data.get("audio").strip():
        name = _basename(data["audio"])
        if name:
            entry_refs.add(name)
    for s in (data.get("senses") or []):
        for ex in (s.get("examples") or []):
            if isinstance(ex, dict) and isinstance(ex.get("audio"), str) and ex.get("audio").strip():
                name = _basename(ex.get("audio"))
                if name:
                    ex_refs.add(name)
        for af in (s.get("alt_forms") or []):
            if isinstance(af, dict) and isinstance(af.get("audio"), str) and af.get("audio").strip():
                name = _basename(af.get("audio"))
                if name:
                    ex_refs.add(name)
    return entry_refs, ex_refs


def _prune_audio_files(slug: str, data: Dict[str, Any]) -> None:
    """
    Remove orphaned audio files for this entry:
      - Entry audio under data/glossary/audio/entry/<slug>/
      - Example/alt_form audio under data/glossary/audio/examples/<slug>/
    Keeps only files referenced by the current payload.
    """
    try:
        base = get_data_root() / "glossary" / "audio"
        entry_dir = base / "entry" / slug
        ex_dir = base / "examples" / slug
        keep_entry, keep_ex = _referenced_audio_basenames(data)

        if entry_dir.exists():
            for f in entry_dir.iterdir():
                if f.is_file() and f.name not in keep_entry:
                    f.unlink(missing_ok=True)  # type: ignore[arg-type]
        if ex_dir.exists():
            for f in ex_dir.iterdir():
                if f.is_file() and f.name not in keep_ex:
                    f.unlink(missing_ok=True)  # type: ignore[arg-type]
    except Exception:
        # Best-effort; ignore prune failures
        pass


def save_entry(payload: Dict[str, Any]) -> Tuple[bool, List[str]]:
    data = _normalize_for_save(payload)
    ok, errs = validate_entry(data)
    if not ok:
        return False, errs
    if not write_json(entry_path(data["slug"]), data, pretty=True):
        return False, ["Failed to write entry JSON"]
    # Prune orphaned audio files (entry + examples) to match current payload
    _prune_audio_files(data["slug"], data)
    try:
        _update_indexes()
    except Exception:
        pass
    return True, []

# -------------------------------
# Utilities: rename/migrate an entry slug (JSON + audio)
# -------------------------------

def migrate_entry_slug(old_slug: str, new_slug: str) -> bool:
    """Move entry from old_slug to new_slug.
    - Deletes old JSON file if present (expects new JSON already written)
    - Moves centralized audio folders under data/glossary/audio/{entry|examples}/{slug}/
    - Rebuilds indexes
    Returns True on best-effort success.
    """
    try:
        # Move audio folders (best-effort)
        base = get_data_root() / 'glossary' / 'audio'
        for kind in ('entry', 'examples'):
            src = base / kind / old_slug
            dst = base / kind / new_slug
            try:
                if src.exists() and src.is_dir():
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(src), str(dst))
            except Exception:
                # continue but mark as partial success
                pass
        # Remove old JSON if still present
        try:
            p_old = entry_path(old_slug)
            if p_old.exists():
                p_old.unlink()
        except Exception:
            pass
        # Rebuild indexes
        try:
            _update_indexes()
        except Exception:
            pass
        return True
    except Exception:
        return False

# -------------------------------
# Delete entry (JSON + audio folders) and rebuild indexes
# -------------------------------

def delete_entry(slug: str) -> bool:
    slug = (slug or '').strip().lower()
    if not SLUG_RE.match(slug):
        return False
    ok = True
    try:
        # Remove entry JSON
        p = entry_path(slug)
        if p.exists():
            p.unlink(missing_ok=True)  # type: ignore[arg-type]
    except Exception:
        ok = False
    # Remove centralized audio folders if present
    try:
        base = get_data_root() / 'glossary' / 'audio'
        for kind in ('entry', 'examples'):
            d = base / kind / slug
            if d.exists() and d.is_dir():
                shutil.rmtree(d, ignore_errors=True)
    except Exception:
        ok = False
    # Rebuild indexes (best-effort)
    try:
        _update_indexes()
    except Exception:
        pass
    return ok

# -------------------------------
# List meta
# -------------------------------

def list_entries_meta() -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for slug in list_slugs():
        data = load_entry(slug) or {}
        word = (data.get("word") or slug).strip()
        senses = data.get("senses") or []
        sense_countries: set[str] = set()
        register_set: set[str] = set()
        status_set: set[str] = set()
        sensitivity_set: set[str] = set()
        domain_set: set[str] = set()
        tone_set: set[str] = set()
        examples_count = 0

        for s in senses:
            for c in (s.get("countries") or []):
                if isinstance(c, str):
                    sense_countries.add(c)
            reg = s.get("register")
            if isinstance(reg, str) and reg.strip():
                register_set.add(reg.strip())
            # status/sensitivity may be a list or a string
            st = s.get("status")
            if isinstance(st, list):
                status_set.update([x for x in st if isinstance(x, str) and x.strip()])
            elif isinstance(st, str) and st.strip():
                status_set.add(st.strip())
            se = s.get("sensitivity")
            if isinstance(se, list):
                sensitivity_set.update([x for x in se if isinstance(x, str) and x.strip()])
            elif isinstance(se, str) and se.strip():
                sensitivity_set.add(se.strip())
            domain_set.update([d for d in (s.get("domain") or []) if isinstance(d, str) and d.strip()])
            tone_set.update([t for t in (s.get("tone") or []) if isinstance(t, str) and t.strip()])
            examples_count += len(s.get("examples") or [])

        first = senses[0] if senses else {}
        def _clean_html(val: str) -> str:
            txt = re.sub(r"<[^>]+>", "", val or "").strip()
            return txt

        items.append({
            "slug": slug,
            "word": word,
            "countries": sorted(sense_countries),
            "pos": first.get("pos"),
            "register": sorted(register_set),
            "freq": first.get("freq"),
            "status": sorted(status_set),
            "sensitivity": sorted(sensitivity_set),
            "domain": sorted(domain_set),
            "tone": sorted(tone_set),
            "has_audio": bool((data.get("audio") or "").strip()),
            "definition_es": _clean_html(first.get("definition_es") or ""),
            "definition_en": _clean_html(first.get("definition_en") or ""),
            "examples_count": examples_count,
        })
    return items

def find_duplicate_entries(word: str, countries: Optional[Iterable[str]] = None, exclude_slug: Optional[str] = None) -> List[Dict[str, Any]]:
    norm_word = _norm(word or '')
    if not norm_word:
        return []
    exclude = (exclude_slug or '').strip().lower()
    allowed_countries = {c.upper() for c in (countries or []) if isinstance(c, str) and c.strip()}
    matches: List[Dict[str, Any]] = []
    for slug in list_slugs():
        if exclude and slug == exclude:
            continue
        data = load_entry(slug) or {}
        entry_norm = _norm(data.get("word") or slug)
        if entry_norm != norm_word:
            continue
        senses = data.get("senses") or []
        found_countries: set[str] = set()
        matched = False
        for sense in senses:
            sense_countries = [str(c).upper().strip() for c in (sense.get("countries") or []) if isinstance(c, str) and c.strip()]
            sense_countries = [c for c in sense_countries if c]
            if allowed_countries and not allowed_countries.intersection(sense_countries):
                continue
            found_countries.update(sense_countries)
            if sense_countries or not allowed_countries:
                matched = True
        if allowed_countries and not found_countries:
            continue
        if matched or not allowed_countries:
            matches.append({
                "slug": slug,
                "word": (data.get("word") or slug),
                "countries": sorted(found_countries),
                "definition_es": (senses[0].get("definition_es") if senses and isinstance(senses[0], dict) else "") or "",
                "definition_en": (senses[0].get("definition_en") if senses and isinstance(senses[0], dict) else "") or "",
            })
    return matches

# -------------------------------
# Indexing (simple JSON indexes for public use)
# -------------------------------

def _index_root() -> Path:
    p = _root() / "_index"
    p.mkdir(parents=True, exist_ok=True)
    (p / "by_country").mkdir(parents=True, exist_ok=True)
    return p

def _update_indexes() -> None:
    # Rebuild by-country and a light search index; also materialize per-country entry views and master all.json
    metas = list_entries_meta()
    # by_country
    byc: dict[str, list[dict]] = {}
    for m in metas:
        for c in (m.get("countries") or []):
            byc.setdefault(c, []).append({"slug": m["slug"], "word": m.get("word") or m["slug"]})
    for code, rows in byc.items():
        rows.sort(key=lambda r: (r["word"].lower(), r["slug"]))
        write_json(_index_root() / "by_country" / f"{code}.json", rows, pretty=True)
        # Materialize country-specific entry files (filtered by sense country)
        out_dir = _countries_root() / code
        out_dir.mkdir(parents=True, exist_ok=True)
        for m in rows:
            slug = m["slug"]
            data = load_entry(slug) or {}
            senses = []
            for s in (data.get("senses") or []):
                sc = set(s.get("countries") or [])
                if code in sc:
                    senses.append(s)
            entry_view = {
                "word": data.get("word") or slug,
                "slug": slug,
                "audio": data.get("audio"),
                "alt_spellings": data.get("alt_spellings") or [],
                "senses": senses,
            }
            write_json(out_dir / f"{slug}.json", entry_view, pretty=True)
    # search index
    items: list[dict] = []
    for m in metas:
        d = load_entry(m["slug"]) or {}
        first = (d.get("senses") or [{}])[0]
        snip = (first.get("definition_en") or first.get("definition_es") or "")
        try:
            snip = re.sub(r"<[^>]+>", "", snip).strip()
        except Exception:
            pass
        items.append({
            "slug": m["slug"],
            "word": m.get("word") or m["slug"],
            "countries": m.get("countries") or [],
            "pos": first.get("pos"),
            "snippet": snip[:240]
        })
    write_json(_index_root() / "search.json", items, pretty=True)
    # master all.json (full entries array)
    all_entries: list[dict] = []
    for m in metas:
        all_entries.append(load_entry(m["slug"]) or {})
    write_json(_master_root() / "all.json", all_entries, pretty=True)

def rebuild_indexes() -> bool:
    try:
        _update_indexes()
        return True
    except Exception:
        return False

# -------------------------------
# Search (with optional allow-list of countries)
# -------------------------------

def search_entries(
    q: str = "",
    country: Optional[str] = None,
    limit: Optional[int] = None,
    allowed_countries: Optional[Iterable[str]] = None,
) -> List[Dict[str, Any]]:
    qn = _norm(q or "")
    ctry = (country or "").upper().strip() or None
    allowed_set = set(str(c).upper() for c in (allowed_countries or [])) if allowed_countries is not None else None

    results: List[Dict[str, Any]] = []
    limit_value: Optional[int]
    if limit is None:
        limit_value = None
    else:
        try:
            limit_value = max(1, int(limit))
        except Exception:
            limit_value = None
    for meta in list_entries_meta():
        countries = meta.get("countries") or []
        if ctry and ctry not in countries:
            continue
        if allowed_set is not None and not any(c in allowed_set for c in countries):
            continue
        if qn:
            if qn not in _norm(meta.get("word") or "") and qn not in _norm(meta.get("slug") or ""):
                full = load_entry(meta.get("slug") or "") or {}
                found = False
                # entry-level alt_spellings quick check
                try:
                    for alt in (full.get("alt_spellings") or []):
                        if qn in _norm(str(alt)):
                            found = True
                            break
                except Exception:
                    pass
                # first-sense quick scan: definitions and alt_forms
                if not found:
                    for s in (full.get("senses") or [])[:1]:
                        if qn in _norm(s.get("definition_es") or "") or qn in _norm(s.get("definition_en") or ""):
                            found = True
                            break
                        for af in (s.get("alt_forms") or []):
                            try:
                                if qn in _norm(str(af.get("form") or "")):
                                    found = True
                                    break
                            except Exception:
                                pass
                        if found:
                            break
                if not found:
                    continue
        results.append(meta)
        if limit_value is not None and len(results) >= limit_value:
            break
    return results

# -------------------------------
# Validation
# -------------------------------

def validate_entry(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    errs: List[str] = []
    if not isinstance(data, dict):
        return False, ["Entry must be an object"]

    word = (data.get("word") or "").strip()
    slug = (data.get("slug") or "").strip()
    if not word:
        errs.append("'word' is required")
    if not slug or not SLUG_RE.match(slug):
        errs.append("'slug' is required (lowercase-with-hyphens)")

    # alt_spellings (optional)
    if data.get("alt_spellings") is not None:
        if not isinstance(data.get("alt_spellings"), list) or any(not isinstance(x, str) for x in data.get("alt_spellings")):
            errs.append("'alt_spellings' must be an array of strings")

    senses = data.get("senses")
    if not isinstance(senses, list) or not senses:
        errs.append("'senses' must be a non-empty array")
        return (len(errs) == 0), errs

    for i, s in enumerate(senses, start=1):
        if not isinstance(s, dict):
            errs.append(f"sense #{i}: must be an object")
            continue
        c_list = s.get("countries") or []
        if not isinstance(c_list, list) or not c_list:
            errs.append(f"sense #{i}: countries[] required")
        else:
            for c in c_list:
                if c not in COUNTRIES:
                    errs.append(f"sense #{i}: invalid country {c!r}")
        pos_c = _normalize_pos(s.get("pos"))
        # Be permissive: accept any normalized POS token (including new ones) and default to 'sustantivo' if missing.
        s["pos"] = pos_c or "sustantivo"
        reg = s.get("register") if s.get("register") is not None else None
        reg_c = (_canon(reg) if reg is not None else None)
        if reg_c not in REGISTER_C:
            errs.append(f"sense #{i}: register invalid")
        freq = s.get("freq") if s.get("freq") is not None else None
        freq_c = (_canon(freq) if freq is not None else None)
        if freq_c not in FREQ_C:
            errs.append(f"sense #{i}: freq invalid")
        for d in (s.get("domain") or []):
            if _canon(d) not in DOMAIN_C:
                errs.append(f"sense #{i}: unknown domain {d!r}")
        for t in (s.get("tone") or []):
            if _canon(t) not in TONE_C:
                errs.append(f"sense #{i}: unknown tone {t!r}")
        # status: accept string or list of strings; store as-is
        st_val = s.get("status")
        if st_val in (None, ""):
            st_list: list[str] = []
        elif isinstance(st_val, list):
            st_list = [str(x) for x in st_val]
        else:
            st_list = [str(st_val)]
        for st in st_list:
            if _canon(st) not in STATUS_C:
                errs.append(f"sense #{i}: status invalid value {st!r}")

        # sensitivity: accept string or list of strings; store as-is
        se_val = s.get("sensitivity")
        if se_val in (None, ""):
            se_list: list[str] = []
        elif isinstance(se_val, list):
            se_list = [str(x) for x in se_val]
        else:
            se_list = [str(se_val)]
        for se in se_list:
            if _canon(se) not in SENSITIVITY_C:
                errs.append(f"sense #{i}: sensitivity invalid value {se!r}")
        # alt_forms (optional)
        af_list = s.get("alt_forms")
        if af_list is not None:
            if not isinstance(af_list, list):
                errs.append(f"sense #{i}: alt_forms must be an array")
            else:
                for j, af in enumerate(af_list, start=1):
                    if not isinstance(af, dict):
                        errs.append(f"sense #{i} alt_form #{j}: must be an object")
                        continue
                    if not (af.get("form") or "").strip():
                        errs.append(f"sense #{i} alt_form #{j}: 'form' required")
                    # type is optional but recommended
                    if af.get("regions") is not None:
                        regs = af.get("regions")
                        if not isinstance(regs, list) or any(r not in COUNTRIES for r in regs):
                            errs.append(f"sense #{i} alt_form #{j}: regions invalid")

        if not (s.get("definition_es") or s.get("definition_en")):
            errs.append(f"sense #{i}: definition_es/en required")

    return (len(errs) == 0), errs

# -------------------------------
# Config + countries (driven by assets/flags)
# -------------------------------
SPANISH_COUNTRY_NAMES: Dict[str, Dict[str, str]] = {
    "AR": {"es": "Argentina", "en": "Argentina"},
    "BO": {"es": "Bolivia", "en": "Bolivia"},
    "CL": {"es": "Chile", "en": "Chile"},
    "CO": {"es": "Colombia", "en": "Colombia"},
    "CR": {"es": "Costa Rica", "en": "Costa Rica"},
    "CU": {"es": "Cuba", "en": "Cuba"},
    "DO": {"es": "República Dominicana", "en": "Dominican Republic"},
    "EC": {"es": "Ecuador", "en": "Ecuador"},
    "SV": {"es": "El Salvador", "en": "El Salvador"},
    "GQ": {"es": "Guinea Ecuatorial", "en": "Equatorial Guinea"},
    "GT": {"es": "Guatemala", "en": "Guatemala"},
    "HN": {"es": "Honduras", "en": "Honduras"},
    "MX": {"es": "México", "en": "Mexico"},
    "NI": {"es": "Nicaragua", "en": "Nicaragua"},
    "PA": {"es": "Panamá", "en": "Panama"},
    "PY": {"es": "Paraguay", "en": "Paraguay"},
    "PE": {"es": "Perú", "en": "Peru"},
    "PR": {"es": "Puerto Rico", "en": "Puerto Rico"},
    "ES": {"es": "España", "en": "Spain"},
    "UY": {"es": "Uruguay", "en": "Uruguay"},
    "VE": {"es": "Venezuela", "en": "Venezuela"},
    "US": {"es": "Estados Unidos", "en": "United States"}
}

_config_path = _root() / "_config.json"


def load_config() -> Dict[str, Any]:
    cfg = read_json(_config_path) or {}
    enabled = cfg.get("enabled_countries") or []
    if not isinstance(enabled, list):
        enabled = []
    enabled = [str(c).upper() for c in enabled if isinstance(c, str) and str(c).upper() in COUNTRIES]
    return {"enabled_countries": enabled}


def save_config(cfg: Dict[str, Any]) -> bool:
    payload = load_config()
    if isinstance(cfg, dict) and isinstance(cfg.get("enabled_countries"), list):
        payload["enabled_countries"] = [str(c).upper() for c in cfg["enabled_countries"] if str(c).upper() in COUNTRIES]
    return write_json(_config_path, payload, pretty=True)


def _flags_root() -> Path:
    return get_project_root() / "static" / "assets" / "flags"



def _flag_asset_for(code: str) -> Optional[str]:
    m = (code or '').lower()
    root = _flags_root()
    candidates = [m]
    if m in ('us', 'usa'):
        candidates = ['us', 'usa']
    for cand in candidates:
        svg = root / f'{cand}.svg'
        if svg.exists():
            return f'assets/flags/{cand}.svg'
        png = root / f'{cand}.png'
        if png.exists():
            return f'assets/flags/{cand}.png'
    # fallback to a reasonable asset name
    return f'assets/flags/{candidates[-1]}.svg'
def list_countries() -> List[Dict[str, Any]]:
    cfg = load_config()
    enabled = set(cfg.get("enabled_countries") or [])
    out: List[Dict[str, Any]] = []
    for code, names in SPANISH_COUNTRY_NAMES.items():
        asset = _flag_asset_for(code)
        out.append({
            "code": code,
            "name_es": names["es"],
            "name_en": names["en"],
            "enabled": code in enabled,
            "flag_url": asset,
        })
    out.sort(key=lambda r: (r["name_es"], r["code"]))
    return out


def entries_for_country(country: str) -> List[Dict[str, Any]]:
    code = (country or "").upper()
    items: List[Dict[str, Any]] = []
    for slug in list_slugs():
        data = load_entry(slug) or {}
        sense_countries: set[str] = set()
        for s in (data.get("senses") or []):
            for c in (s.get("countries") or []):
                if isinstance(c, str):
                    sense_countries.add(c)
        if code in sense_countries:
            items.append({"slug": slug, "word": (data.get("word") or slug)})
    return sorted(items, key=lambda x: (x["word"].lower(), x["slug"]))


