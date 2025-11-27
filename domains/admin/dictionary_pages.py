from __future__ import annotations

from flask import render_template, request, jsonify, redirect, url_for, abort
from flask_login import login_required

from . import bp  # admin blueprint


@bp.get('/dictionary/manage', endpoint='admin_dictionary_manage')
@login_required
def admin_dictionary_manage():
    from app import dictionary_store as ds
    items = ds.list_entries_meta()
    return render_template('admin/dictionary_manage.html', items=items)


@bp.get('/dictionary/new', endpoint='admin_dictionary_new')
@login_required
def admin_dictionary_new():
    return render_template('admin/dictionary_editor.html', mode='new', entry={})


@bp.post('/dictionary/new', endpoint='admin_dictionary_create')
@login_required
def admin_dictionary_create():
    from app import dictionary_store as ds
    f = request.form
    word = (f.get('word') or '').strip()
    pos = f.get('pos') or ''
    def_es = f.get('definition_es') or ''
    def_en = f.get('definition_en') or ''
    equivalents = [e.strip() for e in (f.get('equivalents_en') or '').split(',') if e.strip()]

    slug = ds.unique_slug(word or 'item')
    data = {
        'word': word or slug,
        'slug': slug,
        'audio': None,
        'alt_spellings': [],
        'senses': [
            {
                'id': 's1',
                'pos': pos,
                'register': None,
                'freq': None,
                'domain': [],
                'tone': [],
                'status': None,
                'sensitivity': None,
                'definition_es': def_es,
                'definition_en': def_en,
                'equivalents_en': equivalents,
                'related_slugs': [],
                'examples': []
            }
        ]
    }
    ok, errs = ds.validate_entry(data)
    if not ok:
        return render_template('admin/dictionary_editor.html', mode='new', entry=data, errors=errs), 400
    ok2, errs2 = ds.save_entry(data)
    if not ok2:
        return render_template('admin/dictionary_editor.html', mode='new', entry=data, errors=errs2), 400
    return redirect(url_for('admin.admin_dictionary_edit', slug=slug))


@bp.get('/dictionary/edit/<slug>', endpoint='admin_dictionary_edit')
@login_required
def admin_dictionary_edit(slug: str):
    from app import dictionary_store as ds
    data = ds.load_entry(slug)
    if not data:
        abort(404)
    return render_template('admin/dictionary_editor.html', mode='edit', entry=data)


@bp.post('/dictionary/edit/<slug>', endpoint='admin_dictionary_update')
@login_required
def admin_dictionary_update(slug: str):
    from app import dictionary_store as ds
    data = ds.load_entry(slug) or {}
    if not data:
        abort(404)
    f = request.form
    word = (f.get('word') or '').strip()
    pos = f.get('pos') or ''
    def_es = f.get('definition_es') or ''
    def_en = f.get('definition_en') or ''
    equivalents = [e.strip() for e in (f.get('equivalents_en') or '').split(',') if e.strip()]

    if word:
        data['word'] = word
    senses = data.get('senses') or []
    if senses and isinstance(senses[0], dict):
        s = senses[0]
        s['pos'] = pos
        s['definition_es'] = def_es
        s['definition_en'] = def_en
        s['equivalents_en'] = equivalents
    ok, errs = ds.validate_entry(data)
    if not ok:
        return render_template('admin/dictionary_editor.html', mode='edit', entry=data, errors=errs), 400
    ok2, errs2 = ds.save_entry(data)
    if not ok2:
        return render_template('admin/dictionary_editor.html', mode='edit', entry=data, errors=errs2), 400
    return redirect(url_for('admin.admin_dictionary_edit', slug=slug))
