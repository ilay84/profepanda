#!/usr/bin/env python3
"""
One-off migrator: data/glossaries/*.json -> data/glossary/{slug}.json

Tries to handle a few shapes:
- Array of entries
- Object with { entries: [...] }
- Object keyed by slug -> entry

Usage:
  python scripts/migrate_glossaries_to_entries.py
"""
from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, Iterable

from app.glossary_store import save_entry, unique_slug

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'data' / 'glossaries'


def _iter_entries(obj: Any) -> Iterable[Dict[str, Any]]:
    if isinstance(obj, list):
        for it in obj:
            if isinstance(it, dict):
                yield it
    elif isinstance(obj, dict):
        if 'entries' in obj and isinstance(obj['entries'], list):
            for it in obj['entries']:
                if isinstance(it, dict):
                    yield it
        else:
            for v in obj.values():
                if isinstance(v, dict):
                    yield v


def migrate_file(path: Path) -> dict:
    report = { 'file': str(path), 'ok': 0, 'err': 0, 'errors': [] }
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except Exception as e:
        report['errors'].append(f'read_error: {e}')
        report['err'] += 1
        return report

    for raw in _iter_entries(data):
        entry = dict(raw)
        if not isinstance(entry, dict):
            report['err'] += 1
            continue
        word = (entry.get('word') or '').strip()
        slug = (entry.get('slug') or '').strip()
        if not slug:
            slug = unique_slug(word or 'item')
            entry['slug'] = slug
        ok, errs = save_entry(entry)
        if ok:
            report['ok'] += 1
        else:
            report['err'] += 1
            report['errors'].append({ 'slug': slug, 'errors': errs })
    return report


def main():
    if not SRC.exists():
        print('No data/glossaries directory found; nothing to migrate.')
        return
    total = { 'files': 0, 'ok': 0, 'err': 0 }
    for js in SRC.glob('*.json'):
        total['files'] += 1
        rep = migrate_file(js)
        print(f"- {rep['file']}: ok={rep['ok']} err={rep['err']}")
        if rep['errors']:
            for e in rep['errors']:
                print(f"  ! {e}")
        total['ok'] += rep['ok']
        total['err'] += rep['err']
    print(f"Done. Files: {total['files']}  Entries OK: {total['ok']}  Errors: {total['err']}")


if __name__ == '__main__':
    main()

