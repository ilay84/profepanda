# domains/public/__init__.py
from flask import Blueprint, render_template, render_template_string, request, g, make_response, abort, redirect, url_for
from flask_login import current_user
from app.storage import list_slugs, load_article
from app.pos_catalog import get_catalog as get_pos_catalog, get_aliases as get_pos_aliases

public_bp = Blueprint("public", __name__)

# ─────────────────────────────────────────────────────────────
# Language utilities (canonicalized via app.langs)
# ─────────────────────────────────────────────────────────────
from app.langs import normalize_lang, preference_chain, label_for, supported_codes

DEFAULT_LANG = "es"

def _coerce_lang(value: str) -> str:
    """
    Backwards-compatible shim used by existing routes.
    Normalizes any alias (e.g., 'es-AR', 'en-GB') to a base code; falls back to DEFAULT_LANG.
    """
    norm = normalize_lang(value)
    return norm if norm else DEFAULT_LANG

@public_bp.before_app_request
def _set_app_lang():
    # Order of precedence: query param → cookie → default
    lang_q = request.args.get("lang")
    if lang_q:
        g.app_lang = _coerce_lang(lang_q)
    else:
        g.app_lang = _coerce_lang(request.cookies.get("lang"))

    # Expose admin capability on public routes (author/editor/super, active only)
    try:
        role = getattr(current_user, "role", None)
        status = getattr(current_user, "status", None)
        g.is_admin = bool(getattr(current_user, "is_authenticated", False) and status == "active" and role in {"author", "editor", "super"})
    except Exception:
        g.is_admin = False

@public_bp.context_processor
def _inject_lang_helpers():
    # Simple translation helper: t(es, en, lang_override=None)
    def t(es_text: str, en_text: str, lang_override: str = None) -> str:
        lang = _coerce_lang(lang_override or getattr(g, "app_lang", DEFAULT_LANG))
        return es_text if lang == "es" else en_text

    # Expose normalized language, labels, and a preference chain for fallbacks
    return {
        "app_lang": getattr(g, "app_lang", DEFAULT_LANG),
        "t": t,
        "ppx_lang_label": lambda code: label_for(code),
        "ppx_supported_langs": supported_codes,
        "ppx_lang_preferences": lambda: preference_chain(getattr(g, "app_lang", DEFAULT_LANG)),
        # Enable inline i18n pencils on public pages ONLY for authenticated, active admins
        "can_edit_i18n": bool(
            getattr(current_user, "is_authenticated", False)
            and getattr(current_user, "status", None) == "active"
            and getattr(current_user, "role", None) in {"author", "editor", "super"}
        ),
        # Explicit endpoints for the inline editor (matches admin blueprint)
        "i18n_get_url": "/admin/i18n/key",
        "i18n_update_url": "/admin/i18n/update",
        # csrf_token is optional; include if you wire CSRF later
        "csrf_token": "",
        "ppx_pos_catalog": [{**entry, "value": (entry.get("value") or "").lower()} for entry in get_pos_catalog()],
        "ppx_pos_aliases": get_pos_aliases(),
    }

# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────
@public_bp.route("/")
def index():
    """
    Public homepage. If ?lang is present, persist it in a cookie (1 year).
    Also send no-cache headers so admin-enabled markup isn't reused after logout.
    """
    resp = make_response(render_template("public_index.html"))
    qlang = request.args.get("lang")
    if qlang:
        resp.set_cookie("lang", _coerce_lang(qlang), max_age=60 * 60 * 24 * 365, samesite="Lax")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp

# Stubs to satisfy current links from the homepage and navbar.
@public_bp.route("/articles/")
def articles_index():
    from datetime import datetime, timezone

    def _is_published(d: dict) -> bool:
        status = (d.get("status") or "draft").lower()
        if status != "published":
            return False
        pub = (d.get("published_at") or "").strip()
        if not pub:
            return True  # allow legacy publishes with no timestamp
        try:
            ts = datetime.fromisoformat(pub.replace("Z", "+00:00"))
        except Exception:
            return True
        return ts <= datetime.now(timezone.utc)

    slugs = list_slugs("articles") or []
    articles = []
    lang = getattr(g, "app_lang", DEFAULT_LANG)

    import re

    for s in slugs:
        data = load_article(s) or {}
        if not _is_published(data):
            continue

        meta = data.get("meta") or {}
        i18n = data.get("i18n") or {}
        slot = i18n.get(lang) or {}

        # Title preference: i18n[lang].title → base title → other known language fallbacks
        if slot.get("title"):
            display_title = slot["title"]
        else:
            # legacy fields/base
            title_any = data.get("title") or meta.get("title")
            # known EN/ES legacy fields kept as a soft fallback only
            title_es = data.get("title_es") or meta.get("title_es") or meta.get("title-es")
            title_en = data.get("title_en") or meta.get("title_en") or meta.get("title-en")
            display_title = (title_any or (title_es if lang == "es" else title_en) or title_es or title_en or s)

        # Summary preference: i18n[lang].summary_html → base summary_html → plain summary fields
        summary_html = slot.get("summary_html") or data.get("summary_html") or meta.get("summary_html") or ""
        if summary_html:
            display_summary = re.sub(r"<[^>]+>", "", summary_html).strip()
        else:
            # very old plain-text summary fields
            summary_es = data.get("summary_es") or meta.get("summary_es")
            summary_en = data.get("summary_en") or meta.get("summary_en")
            summary_any = data.get("summary") or meta.get("summary")
            display_summary = (summary_es if lang == "es" else summary_en) or summary_any or ""

        image_url = data.get("image_url") or meta.get("image_url")
        tags = data.get("tags") or meta.get("tags") or []
        # Taxonomy: build display titles for selected paths (deepest level preferred)
        topics = []
        try:
            from common.taxonomy import title_for
            tx_paths = data.get("taxonomy_paths") or []
            if isinstance(tx_paths, list):
                for p in tx_paths:
                    if not p:
                        continue
                    # prefer localized human title; fall back to prettified slug
                    t = title_for(str(p), lang=lang) or str(p).split("/")[-1].replace("-", " ").title()
                    topics.append(t)
        except Exception:
            pass

        articles.append({
            "slug": s,
            "title": display_title,
            "summary": display_summary,
            "tags": tags,
            "image_url": image_url,
            "topics": topics,
        })

    resp = make_response(render_template("public_articles_index.html", articles=articles))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp

@public_bp.route("/exercises/")
def exercises_index():
    # Public Exercises library page
    # Grid view with taxonomy navigation/filtering on the left.
    from app.exercises_store import list_exercises as ex_list
    from common.taxonomy import children_of, title_for

    q = (request.args.get("q") or "").strip().lower()
    flt_type = (request.args.get("type") or "").strip().lower()
    flt_level = (request.args.get("level") or "").strip().upper()
    flt_tax = (request.args.get("tax") or "").strip().strip("/")

    raw = ex_list() or {}

    # Build base list (published only)
    items = []
    for key, meta in raw.items():
        try:
            ex_type, slug = key.split("/", 1)
        except ValueError:
            continue
        status = (meta.get("status") or "draft").lower()
        if status != "published":
            continue

        if flt_type and ex_type != flt_type:
            continue
        level = (meta.get("level") or "").strip().upper()
        if flt_level and level != flt_level:
            continue

        title_es = (meta.get("title_es") or "").strip()
        title_en = (meta.get("title_en") or "").strip()
        if q:
            hay = f"{title_es} {title_en} {slug}".lower()
            if q not in hay:
                continue

        tax_paths = [str(p).strip().strip('/') for p in (meta.get("taxonomy_paths") or []) if str(p).strip()]
        # Taxonomy filter: include if any path is the selected tax or a descendant of it
        if flt_tax:
            keep = False
            for p in tax_paths:
                if p == flt_tax or p.startswith(flt_tax + "/"):
                    keep = True
                    break
            if not keep:
                continue

        # Derive up to two sub-topic titles (2nd and 3rd segments of a path)
        sub_topics = []
        if tax_paths:
            first = tax_paths[0]
            parts = first.split('/')
            if len(parts) >= 2:
                sub = parts[0] + '/' + parts[1]
                from common.taxonomy import title_for as _tx_title_for
                st = _tx_title_for(sub, lang=getattr(g, "app_lang", DEFAULT_LANG))
                if st:
                    sub_topics.append(st)
            if len(parts) >= 3:
                sub2 = parts[0] + '/' + parts[1] + '/' + parts[2]
                from common.taxonomy import title_for as _tx_title_for
                st2 = _tx_title_for(sub2, lang=getattr(g, "app_lang", DEFAULT_LANG))
                if st2 and st2 not in sub_topics:
                    sub_topics.append(st2)

        items.append({
            "key": key,
            "type": ex_type,
            "slug": slug,
            "title_es": title_es,
            "title_en": title_en,
            "level": level,
            "taxonomy_paths": tax_paths,
            "sub_topics": sub_topics,
            "version": meta.get("version"),
        })

    # Group by top-level taxonomy (first segment). If none, bucket into "_general".
    def top_bucket(paths):
        for p in paths:
            seg = p.split("/", 1)[0]
            if seg:
                return seg
        return "_general"

    groups = {}
    for ex in items:
        bucket = top_bucket(ex["taxonomy_paths"]) if not flt_tax else (flt_tax.split("/", 1)[0] or "_general")
        groups.setdefault(bucket, []).append(ex)

    # Sort exercises within each group by localized title
    lang = getattr(g, "app_lang", DEFAULT_LANG)
    for arr in groups.values():
        arr.sort(key=lambda e: ( (e["title_es"] if lang=='es' else e["title_en"]) or e["title_es"] or e["title_en"] or e["slug"]).lower())

    # Build ordered group metadata (alphabetical by group title)
    def group_title(path_first_seg: str) -> str:
        if path_first_seg == "_general":
            return "General" if lang != 'es' else "General"
        # Look up the top-level node title
        return title_for(path_first_seg, lang=lang) or path_first_seg.title()

    ordered = sorted(groups.items(), key=lambda kv: group_title(kv[0]).lower())

    # Left taxonomy tree (top-level + their children for quick filtering)
    top_nodes = children_of(None)

    resp = make_response(render_template(
        "public_exercises_index.html",
        exercises_groups=ordered,
        group_title=group_title,
        tax_selected=flt_tax,
        tax_top_nodes=top_nodes,
    ))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp

@public_bp.route("/glossary/")
def glossary_index():
    countries = _enabled_glossary_countries()
    country_map = {row["code"]: row for row in countries}
    resp = make_response(render_template("public_glossary_index.html", countries=countries, country_map=country_map))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp

@public_bp.route("/articles/<slug>")
def article_detail_noslash(slug):
    # Always normalize to the canonical trailing-slash URL
    return redirect(url_for("public.article_detail", slug=slug), code=308)

@public_bp.route("/articles/<slug>/")
def article_detail(slug):
    from datetime import datetime, timezone
    from urllib.parse import urlencode

    def _is_published(d: dict) -> bool:
        status = (d.get("status") or "draft").lower()
        if status != "published":
            return False
        pub = (d.get("published_at") or "").strip()
        if not pub:
            return True
        try:
            ts = datetime.fromisoformat(pub.replace("Z", "+00:00"))
        except Exception:
            return True
        return ts <= datetime.now(timezone.utc)

    data = load_article(slug)
    if not data or not _is_published(data):
        abort(404)

    # New: if the article defines modules, redirect to the first module page
    modules = data.get("modules") or []
    if isinstance(modules, list) and len(modules):
        first = None
        for m in modules:
            mslug = (m.get("slug") or "").strip()
            if mslug:
                first = mslug
                break
        if first:
            return redirect(url_for("public.article_module", slug=slug, module_slug=first), code=302)

    # UI language (site chrome) comes from cookie via before_app_request
    ui_lang = getattr(g, "app_lang", DEFAULT_LANG)

    # Gather available article versions
    i18n = data.get("i18n") or {}
    # Try to discover mother article language if present; otherwise None/"base"
    mother_lang = (data.get("mother_lang") or "").strip().lower()
    if not mother_lang:
        # quick heuristic: prefer explicit es/en keys, else None/base
        if "es" in i18n and not data.get("title"):
            mother_lang = "es"
        elif "en" in i18n and not data.get("title"):
            mother_lang = "en"
        else:
            mother_lang = ""  # treat as base (no specific code)

    # Which article language should be active?
    # 1) ?al=xx (article language) parameter overrides,
    # 2) else cookie "article_lang",
    # 3) else best fit: ui_lang if present in i18n/mother, otherwise mother/base, otherwise any i18n slot.
    q_al = (request.args.get("al") or "").strip().lower()
    # treat special tokens as an explicit request for the base/mother content
    if q_al in ("base", "mother", "root"):
        q_al = ""
    cookie_al = (request.cookies.get("article_lang") or "").strip().lower()

    def best_article_lang():
        # if UI lang matches a version, prefer that
        if ui_lang and (ui_lang == mother_lang or ui_lang in i18n):
            return ui_lang
        # else prefer mother/base
        if mother_lang:
            return mother_lang
        # else any existing translation
        if i18n:
            return sorted(i18n.keys())[0]
        return ""  # fallback to base

    active_al = q_al or cookie_al or best_article_lang()

    # Normalize: if user chose something that doesn't exist, fall back safely
    valid_codes = set(i18n.keys())
    if mother_lang:
        valid_codes.add(mother_lang)
    if active_al not in valid_codes:
        active_al = best_article_lang()

    # Build title/body for the chosen article language
    # Mother/base content lives at root; translations live in i18n[code]
    def resolve_content(lang_code: str):
        if not lang_code or (mother_lang and lang_code == mother_lang):
            # mother/base
            title_es = data.get("title_es")
            title_en = data.get("title_en")
            title_any = data.get("title")
            # UI preference for page title
            if ui_lang == "es":
                page_title = title_es or title_any or title_en or slug
            else:
                page_title = title_en or title_any or title_es or slug
            html = data.get("html") or data.get(f"html_{ui_lang}") or ""
            summary_html = data.get("summary_html") or ""
            return page_title, html, summary_html
        # a translation slot
        slot = i18n.get(lang_code) or {}
        page_title = slot.get("title") or slug
        html = slot.get("html") or ""
        summary_html = slot.get("summary_html") or ""
        return page_title, html, summary_html

    page_title, body, _summary_html = resolve_content(active_al)

    # Build the version dropdown list (mother/base first if present) using native labels
    version_options = []
    if mother_lang:
        version_options.append({"code": mother_lang, "label": label_for(mother_lang)})
    else:
        version_options.append({"code": "", "label": "BASE"})

    for code in sorted(i18n.keys()):
        version_options.append({"code": code, "label": label_for(code)})

    # Prepare links that switch ONLY the article language (?al=xx),
    # while preserving the current UI language (?lang=..) if present.
    def switch_href(target_code: str) -> str:
        lang_q = request.args.get("lang")
        qs = {}
        if lang_q:
            qs["lang"] = lang_q
        # Always send an explicit al to override any cookie:
        # - for base/mother use a sentinel "base" token
        # - for translations use their code
        qs["al"] = ("base" if not target_code else target_code)
        return url_for("public.article_detail", slug=slug) + ("?" + urlencode(qs) if qs else "")

    # Render with inline template (keeps your current pattern)
    html = """
    {% extends "public_base.html" %}
    {% block title %}{{ page_title or slug }} · ProfePanda{% endblock %}
    {% block public_content %}
      <article class="ppx-card ppx-card--pad">
        <header class="ppx-row" style="align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.75rem;flex-wrap:wrap;">
          <h1 class="ppx-h1" style="margin:0;">{{ page_title or slug }}</h1>

          {# Article-language dropdown (does NOT change UI lang) #}
          {% if version_options and (version_options|length) > 1 %}
          <details style="position:relative;">
            <summary class="ppx-btn" style="cursor:pointer;border-radius:999px;">
              🌐 {{ ppx_lang_label(active_al) if active_al else (ppx_lang_label(mother_lang) if mother_lang else 'BASE') }}
            </summary>
            <div style="position:absolute;right:0;margin-top:.4rem;min-width:240px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.08);padding:.35rem;">
              {% set original_code = mother_lang if mother_lang else '' %}
              {% set original_label = ppx_lang_label(original_code) if original_code else 'BASE' %}
              {% set other_codes = (version_options | map(attribute='code') | list) | reject('equalto', original_code) | list %}

              <!-- Original (header + single item, indented like editor) -->
              <div style="padding:.35rem .6rem .25rem .6rem;font:700 12px/1.2 Montserrat,system-ui;color:#475569;letter-spacing:.02em;">
                {{ 'Original' if app_lang != 'es' else 'Original' }}
              </div>
              <ul style="list-style:none;margin:0;padding:.15rem .25rem .25rem .25rem;">
                <li>
                  <a href="{{ switch_href(original_code) }}"
                     style="display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:#0f172a;padding:.45rem .6rem .45rem 1.25rem;border-radius:8px;"
                     onmouseover="this.style.background='#f3f4ff';"
                     onmouseout="this.style.background='transparent';"
                     aria-current="{{ 'true' if (active_al or '') == (original_code or '') else 'false' }}">
                    <span>{{ original_label }}</span>
                    {% if (active_al or '') == (original_code or '') %}<span aria-hidden="true">✓</span>{% endif %}
                  </a>
                </li>
              </ul>

              <!-- Existing versions (header + list, indented like editor) -->
              <div style="padding:.35rem .6rem .25rem .6rem;font:700 12px/1.2 Montserrat,system-ui;color:#475569;letter-spacing:.02em;">
                {{ t('Versiones existentes', 'Existing versions', app_lang) }}
              </div>

              {% if other_codes and (other_codes|length) %}
              <ul style="list-style:none;margin:0;padding:.15rem .25rem;">
                {% for code in other_codes %}
                  <li>
                    <a href="{{ switch_href(code) }}"
                       style="display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:#0f172a;padding:.45rem .6rem .45rem 1.25rem;border-radius:8px;"
                       onmouseover="this.style.background='#f3f4ff';"
                       onmouseout="this.style.background='transparent';"
                       aria-current="{{ 'true' if code == active_al else 'false' }}">
                      <span>{{ ppx_lang_label(code) }}</span>
                      {% if code == active_al %}<span aria-hidden="true">✓</span>{% endif %}
                    </a>
                  </li>
                {% endfor %}
              </ul>
              {% else %}
              <div style="padding:.35rem .6rem .25rem 1.25rem;color:#64748b;font:500 12px/1.2 Montserrat,system-ui;">
                {{ t('No hay otras versiones.', 'No other versions.', app_lang) }}
              </div>
              {% endif %}
            </div>
          </details>
          {% endif %}
        </header>

        {% if body %}
          <div>{{ body|safe }}</div>
        {% else %}
          <p class="ppx-muted">{{ t('Este artículo no tiene contenido para este idioma.', 'This article has no content for this language.', app_lang) }}</p>
        {% endif %}
      </article>
    {% endblock %}
    """

    # Set/refresh the article language cookie independently from UI language
    resp = make_response(
        render_template_string(
            html,
            page_title=page_title,
            slug=slug,
            body=body,
            active_al=active_al,
            mother_lang=mother_lang,
            version_options=version_options,
            switch_href=switch_href,
        )
    )
    resp.set_cookie("article_lang", active_al, max_age=60 * 60 * 24 * 180, samesite="Lax")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


# New: per-module route with sticky footer and left-pane navigator
@public_bp.route("/articles/<slug>/<module_slug>/")
def article_module(slug: str, module_slug: str):
    from datetime import datetime, timezone

    def _is_published(d: dict) -> bool:
        status = (d.get("status") or "draft").lower()
        if status != "published":
            return False
        pub = (d.get("published_at") or "").strip()
        if not pub:
            return True
        try:
            ts = datetime.fromisoformat(pub.replace("Z", "+00:00"))
        except Exception:
            return True
        return ts <= datetime.now(timezone.utc)

    data = load_article(slug)
    if not data or not _is_published(data):
        abort(404)

    modules = data.get("modules") or []
    if not isinstance(modules, list) or not modules:
        # If no modules, fall back to the single-article page
        return redirect(url_for("public.article_detail", slug=slug), code=302)

    # Normalize modules list and locate current index
    normalized = []
    cur_index = -1
    for idx, m in enumerate(modules):
        title = (m.get("title") or "").strip() or f"Module {idx+1}"
        mslug = (m.get("slug") or "").strip() or f"m{idx+1}"
        html = (m.get("html") or "").strip()
        row = {"title": title, "slug": mslug, "html": html}
        normalized.append(row)
        if cur_index < 0 and mslug == module_slug:
            cur_index = idx

    if cur_index < 0:
        abort(404)

    prev_mod = normalized[cur_index - 1] if cur_index > 0 else None
    next_mod = normalized[cur_index + 1] if cur_index < (len(normalized) - 1) else None

    page_title = (data.get("title") or slug)

    # Render dedicated template
    resp = make_response(
        render_template(
            "public_article_module.html",
            slug=slug,
            page_title=page_title,
            modules=normalized,
            current_index=cur_index,
            current=normalized[cur_index],
            prev_mod=prev_mod,
            next_mod=next_mod,
        )
    )
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp

# -------------------------------
# Regional Glossary (public)
# -------------------------------


@public_bp.get('/glossary/api/entry/<slug>', endpoint='glossary_api_entry')
def glossary_api_entry(slug: str):
    from flask import jsonify
    from app import glossary_store as glossary
    data = glossary.load_entry(slug)
    if not data:
        return jsonify({'ok': False, 'error': 'not_found'}), 404
    return jsonify({'ok': True, 'entry': data})



@public_bp.get('/glossary/api/list', endpoint='glossary_api_list')
def glossary_api_list():
    from flask import jsonify, request
    from app import glossary_store as glossary
    cfg = glossary.load_config()
    allowed = cfg.get('enabled_countries') or []
    q = (request.args.get('q') or '').strip()
    # Single-country shortcut (existing param)
    country = (request.args.get('country') or '').strip().upper() or None
    # Letter paging params
    letter = (request.args.get('letter') or '').strip().upper()
    try:
        offset = max(0, int(request.args.get('offset') or 0))
    except Exception:
        offset = 0
    try:
        limit = max(1, min(500, int(request.args.get('limit') or 50)))
    except Exception:
        limit = 50

    # Optional tag filters (now all support multi-value via comma-separated list)
    def _split(k):
        v = (request.args.get(k) or '').strip()
        return [s.strip() for s in v.split(',') if s.strip()] if v else []

    f_pos_set = set(_split('pos'))
    f_reg_set = set(_split('register'))
    f_freq_set = set(_split('freq'))
    f_status_set = set(_split('status'))
    f_sens_set = set(_split('sensitivity'))
    f_domain = set(_split('domain'))
    f_tone = set(_split('tone'))
    # Optional multi-country filter: comma-separated ISO codes
    f_countries = set([c.upper() for c in _split('countries')])
    # If multiple countries requested, search across all and filter per-sense later
    # Otherwise, keep single-country fast path via index
    if f_countries:
        country = None

    base = glossary.search_entries(q=q, country=country, allowed_countries=allowed, limit=2000)
    # Sort by word for stable paging
    base.sort(key=lambda r: (r.get("word") or r.get("slug") or "").lower())

    def _bucket_word(m):
        w = (m.get("word") or m.get("slug") or "").strip()
        return w[0].upper() if w else "#"

    letters = sorted({_bucket_word(m) for m in base if _bucket_word(m).isalpha()})
    letter_filtered = letter.upper() if letter and len(letter) == 1 else letter

    # Letter filter/paging
    if letter_filtered:
        filtered = [m for m in base if _bucket_word(m) == letter_filtered]
    else:
        filtered = base

    total_filtered = len(filtered)
    slice_items = filtered[offset: offset + limit]
    has_more = (offset + limit) < total_filtered

    # If no filters beyond q/country, return quickly
    if not any([f_pos_set, f_reg_set, f_freq_set, f_status_set, f_sens_set, f_domain, f_tone, f_countries]):
        return jsonify({'ok': True, 'count': total_filtered, 'items': slice_items, 'has_more': has_more, 'letters': letters})

    # Load each entry and keep if any sense matches all provided filters
    out_all = []
    for meta in filtered:
        data = glossary.load_entry(meta.get('slug') or '') or {}
        senses = data.get('senses') or []
        matched = False
        for s in senses:
            # country constraint per sense
            sc = set((s.get('countries') or []))
            if country and country not in sc:
                continue
            if f_countries and not (sc & f_countries):
                continue
            if f_pos_set and (s.get('pos') or None) not in f_pos_set:
                continue
            if f_reg_set and (s.get('register') or None) not in f_reg_set:
                continue
            if f_freq_set and (s.get('freq') or None) not in f_freq_set:
                continue
            # status/sensitivity may be arrays; treat match as set intersection
            if f_status_set:
                st = s.get('status')
                if isinstance(st, list):
                    if not (set(st) & f_status_set):
                        continue
                else:
                    if (st or None) not in f_status_set:
                        continue
            if f_sens_set:
                se = s.get('sensitivity')
                if isinstance(se, list):
                    if not (set(se) & f_sens_set):
                        continue
                else:
                    if (se or None) not in f_sens_set:
                        continue
            if f_domain and not (set(s.get('domain') or []) & f_domain):
                continue
            if f_tone and not (set(s.get('tone') or []) & f_tone):
                continue
            matched = True
            break
        if matched:
            out_all.append(meta)
    total = len(out_all)
    slice_filtered = out_all[offset: offset + limit]
    has_more_filtered = (offset + limit) < total
    return jsonify({'ok': True, 'count': total, 'items': slice_filtered, 'has_more': has_more_filtered, 'letters': letters})

def _enabled_glossary_countries():
    from app import glossary_store as glossary
    cfg = glossary.load_config()
    enabled = set(cfg.get('enabled_countries') or [])
    rows = []
    for row in (glossary.list_countries() or []):
        if row.get('code') in enabled:
            rows.append({
                'code': row['code'],
                'name_es': row['name_es'],
                'name_en': row['name_en'],
                'flag_url': row.get('flag_url'),
            })
    rows.sort(key=lambda r: (r.get('name_es') or r.get('name_en') or r['code']))
    return rows


@public_bp.get('/glossary/api/countries', endpoint='glossary_api_countries')
def glossary_api_countries():
    """Public list of enabled glossary countries with flags and names.
    Filters to only countries marked enabled in glossary config.
    """
    from flask import jsonify
    rows = _enabled_glossary_countries()
    return jsonify({'ok': True, 'countries': rows})

@public_bp.route('/dictionary/<slug>/')
def dictionary_entry(slug: str):
    from app.dictionary_store import load_entry
    data = load_entry(slug)
    if not data:
        abort(404)
    return render_template('public_dictionary_entry.html', entry=data)

# Redirect legacy dictionary routes to glossary
@public_bp.route('/dictionary/')
def _redir_dict_root():
    return redirect(url_for('public.glossary_index'), code=302)

@public_bp.route('/dictionary/<path:any>')
def _redir_dict_any(any: str):
    return redirect(url_for('public.glossary_index'), code=302)
