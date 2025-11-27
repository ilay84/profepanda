# domains/articles/__init__.py
from __future__ import annotations
from flask import Blueprint, render_template_string, jsonify, abort
from app.storage import list_slugs, load_article
import re

bp = Blueprint("articles", __name__)

def _h3_sections_to_accordions(html: str) -> str:
    """
    Robust server-side converter:
    Split the HTML by <h3> blocks and wrap each section as an accordion.
    Adds HTML comments so you can verify in View Source.
    Works even if there are extra <br> or attributes in the <h3>.
    """
    if not isinstance(html, str) or not html:
        return html or ""

    # Split into [pre, <h3>title</h3>, body, <h3>title2</h3>, body2, ...]
    parts = re.split(r'(?is)(<h3[^>]*>.*?</h3>)', html)
    if len(parts) == 1:
        return html  # no h3s — return as-is

    out = [parts[0]]  # leading content before first h3 (keep raw)
    # Walk pairs of (h3, body)
    for i in range(1, len(parts), 2):
        h3 = parts[i] or ''
        body = parts[i+1] if (i+1) < len(parts) else ''

        # Extract plain title text
        title = re.sub(r'(?is)<[^>]+>', '', h3).strip() or 'Sección'

        # Build an accordion block
        block = (
            '<!-- ppx-acc start -->'
            '<div class="ppx-accordion">'
              '<details class="ppx-acc-item">'
                '<summary class="ppx-acc-summary"><strong>' + title + '</strong></summary>'
                '<div class="ppx-acc-body">' + body + '</div>'
              '</details>'
            '</div>'
            '<!-- ppx-acc end -->'
        )
        out.append(block)

    return ''.join(out)

@bp.get("/")
def articles_home():
    title = "Articles · ProfePanda"
    html = """
    {% extends "base.html" %}
    {% block title %}{{ title }}{% endblock %}
    {% block content %}
      <article class="ppx-card ppx-card--pad">
        <h1 class="ppx-h1">{{ title }}</h1>
        {% if app_lang == 'es' and body_es %}
          <div>{{ safe(body_es) }}</div>
        {% elif body_en %}
          <div>{{ safe(body_en) }}</div>
        {% else %}
          <p class="ppx-muted">{{ t('Este artículo no tiene contenido para este idioma.', 'This article has no content for this language.', app_lang) }}</p>
        {% endif %}
      </article>
    {% endblock %}

    {% block scripts %}
      <script src="{{ url_for('static', filename='js/public_acc.js') }}"></script>
    {% endblock %}
    """
    return render_template_string(html, title=title)

@bp.get("/healthz")
def articles_healthz():
    return jsonify({"status": "ok", "domain": "articles"}), 200

@bp.get("/list")
def articles_list():
    slugs = list_slugs("articles")
    title = "Articles · List"
    html = """
    {% extends "base.html" %}
    {% block title %}{{ title }}{% endblock %}
    {% block content %}
      <div class="ppx-card ppx-card--pad">
        <h1 class="ppx-h1">{{ t('Artículos disponibles', 'Available Articles', app_lang) }}</h1>
        {% if slugs %}
          <ul style="margin:.5rem 0 0 1rem;">
            {% for s in slugs %}
              <li><a class="ppx-link" href="{{ url_for('articles.article_view', slug=s) }}">{{ s }}</a></li>
            {% endfor %}
          </ul>
        {% else %}
          <p class="ppx-muted" style="margin:0;">{{ t('No hay artículos aún.', 'No articles yet.', app_lang) }}</p>
        {% endif %}
      </div>
    {% endblock %}
    """
    return render_template_string(html, title=title, slugs=slugs)

@bp.get("/<slug>")
def article_view(slug: str):
    from flask import request, make_response, url_for
    from urllib.parse import urlencode

    data = load_article(slug)
    if not data:
        abort(404)

    # Native-name labels for common languages (extend as needed)
    LANG_NATIVE = {
        "es": "Español",
        "en": "English",
        "pt": "Português",
        "fr": "Français",
        "it": "Italiano",
        "de": "Deutsch",
        "zh": "中文",
        "ja": "日本語",
        "ko": "한국어",
        "ar": "العربية",
        "ru": "Русский",
        "hi": "हिन्दी",
        "tr": "Türkçe",
        "pl": "Polski",
        "nl": "Nederlands",
        "sv": "Svenska",
        "no": "Norsk",
        "da": "Dansk",
        "he": "עברית",
        "el": "Ελληνικά",
    }
    def native_label(code: str) -> str:
        if not code:
            return "Base"
        return LANG_NATIVE.get(code.lower(), code.upper())

    i18n = data.get("i18n") or {}
    # Mother/base language for the original article ('' means untagged base)
    mother_lang = (data.get("mother_lang") or "").strip().lower()

    # Choose active article language:
    # 1) ?al=xx, 2) cookie article_lang, 3) ui hint (app_lang) if it exists here,
    # 4) mother/base if present, 5) any available i18n key, else base.
    q_al = (request.args.get("al") or "").strip().lower()
    cookie_al = (request.cookies.get("article_lang") or "").strip().lower()
    ui_lang = (request.cookies.get("lang") or "es").lower()  # site chrome ES/EN cookie

    def best_article_lang():
        if ui_lang and (ui_lang == mother_lang or ui_lang in i18n):
            return ui_lang
        if mother_lang:
            return mother_lang
        if i18n:
            return sorted(i18n.keys())[0]
        return ""

    active_al = q_al or cookie_al or best_article_lang()

    # Normalize invalid selections
    valid = set(i18n.keys())
    if mother_lang:
        valid.add(mother_lang)
    if active_al not in valid:
        active_al = best_article_lang()

    # Resolve content for chosen language. Mother/base lives at root fields.
    def resolve_content(lang_code: str):
        # Legacy root fallbacks: title/title_es/title_en; html/html_es/html_en
        if not lang_code or (mother_lang and lang_code == mother_lang):
            title_any = data.get("title")
            title_es = data.get("title_es")
            title_en = data.get("title_en")
            display_title = title_any or title_es or title_en or slug
            html_raw = data.get("html") or data.get("html_es") or data.get("html_en") or ""
            return display_title, html_raw
        slot = i18n.get(lang_code) or {}
        return (slot.get("title") or slug), (slot.get("html") or "")

    display_title, body_raw = resolve_content(active_al)

    # Convert H3 sections into accordions on the server
    body_html = _h3_sections_to_accordions(body_raw)

    # Build dropdown options: an "Original" section (mother/base first), separator, then other languages.
    # Original item points to mother_lang (or base '').
    original_code = mother_lang or ""
    # Remaining languages: sorted codes except the original one
    other_codes = [c for c in sorted(i18n.keys()) if c != mother_lang]

    # Build href that switches ONLY article language (?al=xx), preserving any existing ?lang for site chrome.
    def switch_href(target_code: str) -> str:
        qs = {}
        site_lang = request.args.get("lang")
        if site_lang:
            qs["lang"] = site_lang
        if target_code:
            qs["al"] = target_code
        return url_for("articles.article_view", slug=slug) + ("?" + urlencode(qs) if qs else "")

    # Inline template with an article-language dropdown:
    # - Top "Original" block showing native name of mother/base
    # - Divider line
    # - Other available translations (native names)
    html = """
    {% extends "base.html" %}
    {% block title %}{{ page_title }}{% endblock %}
    {% block content %}
      <article class="ppx-card ppx-card--pad">
        <header class="ppx-row" style="align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;margin-bottom:.75rem;">
          <h1 class="ppx-h1" style="margin:0;">{{ page_title }}</h1>

          {% if (other_codes|length) or (original_code is not none) %}
          <details style="position:relative;">
            <summary class="ppx-btn" style="cursor:pointer;border-radius:999px;">
              🌐
              {% if active_al %}
                {{ native_label(active_al) }}
              {% else %}
                {{ 'Original' if (app_lang!='es') else 'Original' }}
              {% endif %}
            </summary>
            <div style="position:absolute;right:0;margin-top:.4rem;min-width:240px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.08);padding:.35rem;">
              <!-- Original section header -->
              <div style="padding:.35rem .6rem .25rem .6rem;font:700 12px/1.2 Montserrat,system-ui;color:#475569;letter-spacing:.02em;">
                {{ 'Original' if (app_lang!='es') else 'Original' }}
              </div>
              <ul style="list-style:none;margin:0;padding:.15rem .25rem .25rem .25rem;">
                <li>
                  <a href="{{ switch_href(original_code) }}"
                     style="display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:#0f172a;padding:.45rem .6rem .45rem 1.25rem;border-radius:8px;"
                     onmouseover="this.style.background='#f3f4ff';"
                     onmouseout="this.style.background='transparent';"
                     aria-current="{{ 'true' if (active_al or '') == (original_code or '') else 'false' }}">
                    <span>{{ native_label(original_code) }}</span>
                    {% if (active_al or '') == (original_code or '') %}<span aria-hidden="true">✓</span>{% endif %}
                  </a>
                </li>
              </ul>

              <!-- Existing versions header -->
              <div style="padding:.35rem .6rem .25rem .6rem;font:700 12px/1.2 Montserrat,system-ui;color:#475569;letter-spacing:.02em;">
                {{ t('Versiones existentes', 'Existing versions', app_lang) }}
              </div>

              {% if other_codes %}
              <ul style="list-style:none;margin:0;padding:.15rem .25rem;">
                {% for code in other_codes %}
                  <li>
                    <a href="{{ switch_href(code) }}"
                       style="display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:#0f172a;padding:.45rem .6rem .45rem 1.25rem;border-radius:8px;"
                       onmouseover="this.style.background='#f3f4ff';"
                       onmouseout="this.style.background='transparent';"
                       aria-current="{{ 'true' if code == active_al else 'false' }}">
                      <span>{{ native_label(code) }}</span>
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

        {% if body_html %}
          <div>{{ safe(body_html) }}</div>
        {% else %}
          <p class="ppx-muted">{{ t('Este artículo no tiene contenido para este idioma.', 'This article has no content for this language.', app_lang) }}</p>
        {% endif %}
      </article>
    {% endblock %}

    {% block scripts %}
      <script src="{{ url_for('static', filename='js/public_acc.js') }}"></script>
    {% endblock %}
    """

    resp = make_response(render_template_string(
        html,
        page_title=display_title,
        body_html=body_html,
        active_al=active_al,
        mother_lang=mother_lang,
        original_code=original_code,
        other_codes=other_codes,
        switch_href=switch_href,
        native_label=native_label,
    ))
    # Persist only the ARTICLE language (not the ES/EN site-chrome)
    resp.set_cookie("article_lang", active_al, max_age=60 * 60 * 24 * 180, samesite="Lax")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp

