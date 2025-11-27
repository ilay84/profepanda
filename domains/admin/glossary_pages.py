from __future__ import annotations
import json

from flask import render_template, jsonify, request, redirect, url_for, abort
from flask_login import login_required

from . import bp  # admin blueprint

from app.pos_catalog import (
    get_catalog as get_pos_catalog,
    get_aliases as get_pos_aliases,
)


def _pos_context():
    catalog = [
        {**entry, "value": (entry.get("value") or "").lower()}
        for entry in get_pos_catalog()
    ]
    return catalog, get_pos_aliases()

@bp.get('/glossary/', endpoint='admin_glossary_index')
@login_required
def admin_glossary_index():
    return redirect(url_for('admin.admin_glossary_manage'))


@bp.get('/glossary/manage', endpoint='admin_glossary_manage')
@login_required
def admin_glossary_manage():
    return render_template('admin/glossary_manage.html')


# --- Admin APIs ---
@bp.get('/glossary/api/validate', endpoint='admin_glossary_validate')
@login_required
def admin_glossary_validate():
    from app import glossary_store as glossary
    errs_total = 0
    results = []
    for slug in glossary.list_slugs():
        data = glossary.load_entry(slug) or {}
        ok, errs = glossary.validate_entry(data)
        errs_total += len(errs)
        results.append({'slug': slug, 'ok': ok, 'errors': errs})
    return jsonify({'ok': errs_total == 0, 'total_errors': errs_total, 'results': results})


@bp.get('/api/glossary/config', endpoint='admin_glossary_config_get')
@login_required
def admin_glossary_config_get():
    try:
        from app import glossary_store as glossary
        cfg = glossary.load_config()
        countries = glossary.list_countries()
        return jsonify({"ok": True, "config": cfg, "countries": countries})
    except Exception as e:
        import traceback
        return jsonify({"ok": False, "error": str(e), "trace": traceback.format_exc()}), 500


@bp.post('/api/glossary/config', endpoint='admin_glossary_config_set')
@login_required
def admin_glossary_config_set():
    from app import glossary_store as glossary
    payload = request.get_json(silent=True) or {}
    ok = glossary.save_config({"enabled_countries": payload.get('enabled_countries') or []})
    return jsonify({"ok": bool(ok)})


@bp.get('/api/glossary/list', endpoint='admin_glossary_list')
@login_required
def admin_glossary_list():
    from app import glossary_store as glossary
    q = (request.args.get('q') or '').strip()
    country = (request.args.get('country') or '').upper().strip() or None
    limit_arg = request.args.get('limit')
    limit = None
    if limit_arg is not None and limit_arg.strip():
        try:
            limit = int(limit_arg)
        except ValueError:
            limit = None
    items = glossary.search_entries(q=q, country=country, limit=limit)
    return jsonify({"ok": True, "items": items})


@bp.get('/api/glossary/duplicate', endpoint='admin_glossary_duplicate_check')
@login_required
def admin_glossary_duplicate_check():
    from app import glossary_store as glossary
    word = (request.args.get('word') or '').strip()
    country_params = request.args.getlist('country')
    countries = [c for c in country_params if c and c.strip()]
    exclude_slug = (request.args.get('exclude_slug') or '').strip().lower()
    matches = glossary.find_duplicate_entries(word, countries, exclude_slug)
    return jsonify({
        "ok": True,
        "duplicate": bool(matches),
        "matches": matches
    })


@bp.get('/glossary/new', endpoint='admin_glossary_new')
@login_required
def admin_glossary_new():
    country = (request.args.get('country') or '').upper()
    from app import glossary_store as glossary
    opts = [{'code': r['code'], 'name': r['name_es']} for r in glossary.list_countries()]
    pos_catalog, pos_aliases = _pos_context()
    return render_template(
        'admin/glossary_editor.html',
        mode='new',
        country=country,
        entry={},
        country_opts=opts,
        pos_catalog=pos_catalog,
        ppx_pos_aliases=pos_aliases,
    )


@bp.post('/glossary/new', endpoint='admin_glossary_create')
@login_required
def admin_glossary_create():
    from app import glossary_store as glossary
    f = request.form
    word = (f.get('word') or '').strip()
    country = (f.get('country') or '').upper()
    senses_json = (f.get('senses_json') or '').strip()

    senses = []
    if senses_json:
        try:
            senses = json.loads(senses_json)
        except Exception:
            senses = []
    if not senses:
        pos = f.get('pos') or 'sustantivo'
        def_es = f.get('definition_es') or ''
        def_en = f.get('definition_en') or ''
        senses = [{
            'id': 's1',
            'countries': [country] if country else [],
            'pos': glossary._normalize_pos(pos) or 'sustantivo',
            'register': None,
            'freq': None,
            'domain': [],
            'tone': [],
            'status': [],
            'sensitivity': [],
            'definition_es': def_es,
            'definition_en': def_en,
            'equivalents_en': [],
            'related_slugs': [],
            'examples': []
        }]
    else:
        # Normalize POS on all supplied senses
        from app.glossary_store import _normalize_pos, POS_C  # type: ignore
        for s in senses:
            if not isinstance(s, dict):
                continue
            pos_norm = _normalize_pos(s.get('pos'))
            s['pos'] = pos_norm if pos_norm in POS_C else 'sustantivo'
    for i, s in enumerate(senses, start=1):
        s['id'] = s.get('id') or f's{i}'
        if country and isinstance(s.get('countries'), list) and country not in s['countries']:
            s['countries'].append(country)

    slug = glossary.unique_slug(word or 'item')
    alt_spellings_json = (f.get('alt_spellings_json') or '').strip()
    try:
        alt_spellings = json.loads(alt_spellings_json) if alt_spellings_json else []
    except Exception:
        alt_spellings = []
    entry_audio = (f.get('entry_audio') or '').strip() or None
    data = {'word': word or slug, 'slug': slug, 'audio': entry_audio, 'alt_spellings': alt_spellings, 'senses': senses}
    # If slug will change, rewrite any stored audio URLs to the new slug
    # Compute new_slug from submitted term/title; fall back to provided slug
    term = (request.form.get('term') or request.form.get('title') or request.form.get('name') or request.form.get('lemma') or '').strip()
    def _slugify(s):
        s = s.lower()
        # Keep alphanumeric and spaces/hyphens; collapse to hyphens
        cleaned = []
        for ch in s:
            if ch.isalnum() or ch in ' -_':
                cleaned.append(ch)
            else:
                cleaned.append(' ')
        s = ''.join(cleaned).replace('_', ' ')
        s = '-'.join([p for p in s.strip().split() if p])
        return s
    new_slug = _slugify(term) if term else slug
    if new_slug != slug:
        try:
            def _rew(url: str) -> str:
                if not url: return url
                return (url
                    .replace(f"/glossary-audio/entry/{slug}/", f"/glossary-audio/entry/{new_slug}/")
                    .replace(f"/glossary-audio/examples/{slug}/", f"/glossary-audio/examples/{new_slug}/"))
            if isinstance(data.get('audio'), str):
                data['audio'] = _rew(data.get('audio') or '')
            for s in (data.get('senses') or []):
                for ex in (s.get('examples') or []):
                    if isinstance(ex.get('audio'), str):
                        ex['audio'] = _rew(ex.get('audio') or '')
                for af in (s.get('alt_forms') or []):
                    if isinstance(af.get('audio'), str):
                        af['audio'] = _rew(af.get('audio') or '')
        except Exception:
            pass

    ok, errs = glossary.validate_entry(data)
    if not ok:
        pos_catalog, pos_aliases = _pos_context()
        return render_template(
            'admin/glossary_editor.html',
            mode='new',
            country=country,
            entry=data,
            errors=errs,
            pos_catalog=pos_catalog,
            ppx_pos_aliases=pos_aliases,
        ), 400
    ok2, errs2 = glossary.save_entry(data)
    if not ok2:
        pos_catalog, pos_aliases = _pos_context()
        return render_template(
            'admin/glossary_editor.html',
            mode='new',
            country=country,
            entry=data,
            errors=errs2,
            pos_catalog=pos_catalog,
            ppx_pos_aliases=pos_aliases,
        ), 400
    return redirect(url_for('admin.admin_glossary_edit', slug=slug))


@bp.get('/glossary/edit/<slug>', endpoint='admin_glossary_edit')
@login_required
def admin_glossary_edit(slug: str):
    from app import glossary_store as glossary
    data = glossary.load_entry(slug)
    if not data:
        abort(404)
    from app import glossary_store as glossary
    opts = [{'code': r['code'], 'name': r['name_es']} for r in glossary.list_countries()]
    pos_catalog, pos_aliases = _pos_context()
    return render_template(
        'admin/glossary_editor.html',
        mode='edit',
        country='',
        entry=data,
        country_opts=opts,
        pos_catalog=pos_catalog,
        ppx_pos_aliases=pos_aliases,
    )


@bp.post('/glossary/edit/<slug>', endpoint='admin_glossary_update')
@login_required
def admin_glossary_update(slug: str):
    from app import glossary_store as glossary
    data = glossary.load_entry(slug) or {}
    if not data:
        abort(404)
    f = request.form
    word = (f.get('word') or '').strip()
    senses_json = (f.get('senses_json') or '').strip()
    if word:
        data['word'] = word
    if senses_json:
        try:
            senses = json.loads(senses_json)
            # map existing senses by id to fall back when a label doesn't normalize cleanly
            existing_by_id = {s.get('id'): s for s in (data.get('senses') or []) if isinstance(s, dict)}
            from app.glossary_store import _normalize_pos, POS_C  # type: ignore
            for i, s in enumerate(senses, start=1):
                if not isinstance(s, dict):
                    continue
                s['id'] = s.get('id') or f's{i}'
                candidate = s.get('pos')
                pos_norm = _normalize_pos(candidate)
                if not pos_norm:
                    prev = existing_by_id.get(s['id'])
                    prev_pos = prev.get('pos') if isinstance(prev, dict) else None
                    if prev_pos and prev_pos in POS_C:
                        pos_norm = prev_pos
                s['pos'] = pos_norm if pos_norm in POS_C else 'sustantivo'
            data['senses'] = senses
        except Exception:
            pass
    entry_audio = (f.get('entry_audio') or '').strip()
    if entry_audio:
        data['audio'] = entry_audio
    alt_spellings_json = (f.get('alt_spellings_json') or '').strip()
    if alt_spellings_json:
        try:
            data['alt_spellings'] = json.loads(alt_spellings_json)
        except Exception:
            pass
    # If the word changed, compute a desired new slug; ensure uniqueness
    new_slug = slug
    try:
        if word:
            desired = glossary.make_slug(word)
            if desired and desired != slug:
                # unique_slug ensures no collision
                new_slug = glossary.unique_slug(desired)
                data['slug'] = new_slug
    except Exception:
        new_slug = slug

    ok, errs = glossary.validate_entry(data)
    if not ok:
        pos_catalog, pos_aliases = _pos_context()
        return render_template(
            'admin/glossary_editor.html',
            mode='edit',
            country='',
            entry=data,
            errors=errs,
            pos_catalog=pos_catalog,
            ppx_pos_aliases=pos_aliases,
        ), 400
    ok2, errs2 = glossary.save_entry(data)
    if not ok2:
        pos_catalog, pos_aliases = _pos_context()
        return render_template(
            'admin/glossary_editor.html',
            mode='edit',
            country='',
            entry=data,
            errors=errs2,
            pos_catalog=pos_catalog,
            ppx_pos_aliases=pos_aliases,
        ), 400
    # If slug changed, migrate media folders and remove old JSON
    if new_slug != slug:
        try:
            glossary.migrate_entry_slug(slug, new_slug)
        except Exception:
            pass
        return redirect(url_for('admin.admin_glossary_edit', slug=new_slug))
    return redirect(url_for('admin.admin_glossary_edit', slug=slug))


@bp.post('/glossary/<slug>/upload-audio', endpoint='admin_glossary_upload_audio')
@login_required
def admin_glossary_upload_audio(slug: str):
    from werkzeug.utils import secure_filename
    import time
    from app.storage import ensure_glossary_audio_dirs
    # Basic checks
    if not slug:
        return jsonify({"ok": False, "error": "missing_slug"}), 400
    if 'file' not in request.files:
        return jsonify({"ok": False, "error": "missing_file"}), 400
    f = request.files['file']
    if not f or not (f.filename or '').strip():
        return jsonify({"ok": False, "error": "empty_file"}), 400
    kind = (request.form.get('kind') or 'entry').strip().lower()
    idx = (request.form.get('index') or '').strip()

    # Build recommended filename: slug (hyphens -> underscores)
    base = (slug or 'item').lower().replace('-', '_')
    filename = secure_filename(f.filename)
    ext = ''
    if '.' in filename:
        ext = '.' + filename.rsplit('.', 1)[-1].lower()

    entry_dir, ex_dir = ensure_glossary_audio_dirs(slug)
    cache_bust = f"?v={int(time.time())}"
    if kind == 'example':
        # prefer provided index; else compute next available
        if idx and idx.isdigit():
            n = int(idx)
        else:
            # find next index
            n = 1
            existing = {p.stem for p in ex_dir.glob('*.*')}
            while True:
                probe = f"{base}_ex_{n:02d}"
                if probe not in existing:
                    break
                n += 1
        stem = f"{base}_ex_{n:02d}"
        save_path = ex_dir / (stem + (ext or '.mp3'))
        url = f"/media/glossary-audio/examples/{slug}/{save_path.name}{cache_bust}"
    else:
        stem = base
        save_path = entry_dir / (stem + (ext or '.mp3'))
        url = f"/media/glossary-audio/entry/{slug}/{save_path.name}{cache_bust}"

    try:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        f.save(save_path)
    except Exception as e:
        return jsonify({"ok": False, "error": "save_failed", "detail": str(e)}), 500

    return jsonify({"ok": True, "url": url})


# Redirect legacy dictionary routes to the glossary manager
@bp.get('/dictionary/manage')
@login_required
def _redir_dict_manage():
    return redirect(url_for('admin.admin_glossary_manage'))


@bp.post('/glossary/delete/<slug>', endpoint='admin_glossary_delete')
@login_required
def admin_glossary_delete(slug: str):
    from flask import jsonify
    from app import glossary_store as glossary
    try:
        ok = glossary.delete_entry(slug)
        return jsonify({"ok": bool(ok)}) if ok else (jsonify({"ok": False}), 400)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@bp.get('/dictionary/new')
@login_required
def _redir_dict_new():
    return redirect(url_for('admin.admin_glossary_manage'))


@bp.get('/dictionary/edit/<slug>')
@login_required
def _redir_dict_edit(slug: str):
    return redirect(url_for('admin.admin_glossary_manage'))
