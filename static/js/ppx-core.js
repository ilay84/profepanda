/* static/js/ppx-core.js */
(function () {
  const W = window;
  const D = document;

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));
  const nowISO = () => new Date().toISOString();

  function dispatch(name, detail) {
    W.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  function pickLang(obj, lang, fallbackKeyPairs) {
    // Resolve bilingual fields like title_es/title_en with pref order.
    if (!obj) return '';
    const pref = (lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
    for (const [esKey, enKey] of (fallbackKeyPairs || [])) {
      if (pref === 'es' && obj[esKey]) return obj[esKey];
      if (pref === 'en' && obj[enKey]) return obj[enKey];
      // fallback other side
      if (obj[esKey]) return obj[esKey];
      if (obj[enKey]) return obj[enKey];
    }
    return '';
  }

  function skeletonBody() {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="ppx-col" style="gap:16px;">
        <div class="ppx-row" style="align-items:center;gap:12px;">
          <div class="ppx-chip">Loading…</div>
        </div>
        <div class="ppx-imgbox" aria-hidden="true" style="max-width:360px;"></div>
        <div class="ppx-state--ok" aria-hidden="true"> </div>
        <div class="ppx-state--bad" aria-hidden="true"> </div>
      </div>
    `;
    return wrap;
  }

  function errorBody(msg, detail) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="ppx-state--bad" role="alert">
        <strong>Oops.</strong> ${msg}
        ${detail ? `<div class="ppx-field__help" style="margin-top:8px;">${detail}</div>` : ''}
      </div>
    `;
    return wrap;
  }

  // ─────────────────────────────────────────────────────────────
  // PPX Core
  // ─────────────────────────────────────────────────────────────
  const Registry = Object.create(null);
  const TypeMeta = Object.create(null); // type -> { style: 'fn'|'obj' }

  const PPX = {
    _lang: (W.PPX_I18N && W.PPX_I18N.currentLang) || 'es',
    _ctx: null, // arbitrary context (e.g., article slug) for analytics

    registerType(type, plugin) {
      assert(type && typeof type === 'string', 'registerType: invalid type');
      const isFn = typeof plugin === 'function';
      const isObj = !!plugin && typeof plugin === 'object';
      assert(isFn || isObj, 'registerType: plugin must be a function or an object');
      Registry[type] = plugin;
      TypeMeta[type] = { style: isFn ? 'fn' : 'obj' };
    },

    setLang(lang) {
      this._lang = (lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
      return this._lang;
    },

    async openExercise({ type, slug, version, lang, context } = {}) {
      try {
        assert(type && slug, 'openExercise: "type" and "slug" are required');

        // Lazy-load plugins on demand if not yet registered (guards non-builder flows)
        async function ensurePluginLoaded(t){
          if (Registry[t]) return;
          if (t === 'fitb') {
            // If FITB plugin signaled ready, nothing to do
            if (window.PPX_FITB_READY === true) return;
            await new Promise((resolve) => {
              const done = () => { resolve(); };
              try { window.addEventListener('ppx:fitb:ready', done, { once: true }); } catch(_) {}
              let s = document.querySelector('script[data-ppx-fitb]');
              if (!s) {
                s = document.createElement('script'); s.defer = true; s.setAttribute('data-ppx-fitb','1');
                s.src = '/static/js/ppx-fitb.js?v=20251113c';
                s.onload = done;
                document.head.appendChild(s);
              } else {
                s.addEventListener('load', done, { once: true });
              }
              // Failsafe in case the ready event fired before we attached
              setTimeout(done, 1000);
            });
          }
        }

        await ensurePluginLoaded(type);

        const plugin = Registry[type];
        const meta = TypeMeta[type] || { style: (typeof plugin === 'function' ? 'fn' : 'obj') };
        assert(plugin, `No plugin registered for type "${type}"`);

        this._ctx = context || null;
        const activeLang = this.setLang(lang || this._lang);

        // Fetch data
        const url = version
          ? `/admin/api/exercises/${encodeURIComponent(type)}/${encodeURIComponent(slug)}?version=${encodeURIComponent(version)}`
          : `/admin/api/exercises/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`;

        // Open modal early with skeleton to guarantee layout stability
        PPXModal.open({
          title: '',
          meta: '',
          progress: 0,
          body: skeletonBody(),
          actions: {
            retry: { label: (activeLang === 'en' ? 'Retry' : 'Intentar de nuevo'), variant: 'ghost', disabled: true },
            prev: { label: (activeLang === 'en' ? 'Prev' : 'Anterior'), variant: 'ghost', disabled: true },
            check: { label: (activeLang === 'en' ? 'Check' : 'Comprobar'), variant: 'primary', disabled: true },
            next: { label: (activeLang === 'en' ? 'Next' : 'Siguiente'), variant: 'ok', disabled: true }
          }
        });

        const t0 = performance.now();
        // Avoid cached payloads: add cache-busting param and request no-store
        const bust = `_=${Date.now()}`;
        const urlBusted = url + (url.includes('?') ? '&' : '?') + bust;
        const res = await fetch(urlBusted, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin', cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();

        // Validate minimal schema
        assert(data && typeof data === 'object', 'Invalid exercise payload');
        assert(data.type === type, `Type mismatch: expected "${type}", got "${data.type}"`);
        assert(Array.isArray(data.items), 'Missing items[] on exercise payload');

        // Resolve title & instructions
        const title = pickLang(data, activeLang, [['title_es', 'title_en']]) || slug;
        const instr = pickLang(data, activeLang, [['instructions_es', 'instructions_en']]);

        // Open modal with resolved header + empty body (plugin will render)
        PPXModal.setTitle(title);
        PPXModal.setMeta(instr);

        PPXModal.setTitle(title);
        PPXModal.setMeta(instr);

        // ─────────────────────────────────────────────────────────
        // Update modal options so the scaffold rows can render:
        // top row (headerTitle + type pill) and bottom row (level pill + logo).
        // We re-open with the same skeleton to refresh state.opts before the plugin sets the body.
        // Resolve localized instructions if provided by payload
        const instructionsHTML = (activeLang === 'en')
          ? (data.instructions_en || data.instructions_es || '')
          : (data.instructions_es || data.instructions_en || '');
        const instructionsTitle = (activeLang === 'en') ? 'Instructions' : 'Instrucciones';
        const instructionsCloseLabel = (activeLang === 'en') ? 'Close' : 'Cerrar';

        PPXModal.open({
          title: '',
          meta: '',
          progress: 0,
          body: skeletonBody(),
          headerTitle: title,
          typeLabel: (function () {
            if (type === 'tf') return (activeLang === 'en') ? 'True/False' : '¿Verdadero o falso?';
            if (type === 'mcq') return (activeLang === 'en') ? 'Multiple Choice' : 'Respuesta Múltiple';
            if (type === 'dictation') return (activeLang === 'en') ? 'Dictation' : 'Dictado';
            if (type === 'fitb') return (activeLang === 'en') ? 'Fill in the blanks' : 'Llenar los huecos';
            if (type === 'dnd') return (activeLang === 'en') ? 'Drag-and-drop' : 'Arrastrar y soltar';
            return type.toUpperCase();
          })(),
          level: data.level || '',
          levelLabel: (activeLang === 'en') ? 'Level:' : 'Nivel:',
          logoPath: '/static/assets/logo/header_logo.png',
          instructionsHTML: instructionsHTML,
          instructionsTitle: instructionsTitle,
          instructionsCloseLabel: instructionsCloseLabel,
          // Footer nav hidden by default; types render their own controls
          footerNav: false
        });

        // Analytics: start
        const startPayload = {
          id: data.id || `${type}/${slug}`,
          type,
          slug,
          version: data.version ?? 'current',
          lang: activeLang,
          level: data.level || null,
          taxonomy_paths: data.taxonomy_paths || [],
          // legacy alias for downstreams expecting `tags`
          tags: Array.isArray(data.tags) ? data.tags : (data.taxonomy_paths || []),
          started_at: nowISO(),
          context: this._ctx
        };
        dispatch('ppx:exercise:start', startPayload);

        // Prepare lifecycle API passed to plugin (old + new contracts)
        let answeredCount = 0;
        const total = Math.max(1, data.items.length);
        const api = {
          lang: activeLang,
          t: (es, en) => (activeLang === 'en' ? (en ?? es) : (es ?? en)),
          setProgress: (ratio) => PPXModal.setProgress(clamp01(ratio) * 100),
          setActions: (actions) => PPXModal.setActions(actions),
          setBody: (nodeOrHTML) => PPXModal.setBody(nodeOrHTML),
          answer: (detail) => {
            answeredCount = Math.min(total, answeredCount + 1);
            PPXModal.setProgress((answeredCount / total) * 100);
            dispatch('ppx:exercise:answer', {
              ...startPayload,
              item: detail?.item || null,
              correct: !!detail?.correct,
              meta: detail?.meta || null,
              at: nowISO()
            });
          },
          hint: (detail) => {
            dispatch('ppx:exercise:hint', {
              ...startPayload,
              item: detail?.item || null,
              at: nowISO()
            });
          },
          complete: (summary) => {
            const elapsed_ms = Math.max(0, performance.now() - t0);
            dispatch('ppx:exercise:complete', {
              ...startPayload,
              completed_at: nowISO(),
              elapsed_ms,
              score: summary?.score ?? null,
              correct: summary?.correct ?? null,
              total,
              hints_used: summary?.hints_used ?? null,
              attempts: summary?.attempts ?? 1
            });
          },
          retry: () => {
            dispatch('ppx:exercise:retry', {
              ...startPayload,
              at: nowISO()
            });
          }
        };

        let cleanup = null;
        if (meta.style === 'fn') {
          // Old function-style plugin
          cleanup = plugin({ container: null, data, lang: activeLang, api });
        } else {
          // New object-style plugin
          const bus = new EventTarget();
          const mount = document.createElement('div');
          mount.className = `ppx-ex ppx-ex--${type}`;
          PPXModal.setBody(mount);
          const ctx = {
            el: mount,
            lang: activeLang,
            theme: (document.documentElement.getAttribute('data-ppx-theme') || 'light'),
            i18n: (key, vars) => String(key || ''),
            opts: data,
            bus,
            api
          };
          try { typeof plugin.init === 'function' && plugin.init(ctx); } catch (e) { console.error(e); }
          try { typeof plugin.start === 'function' && plugin.start(ctx); } catch (e) { /* ignore */ }
          cleanup = function objCleanup() {
            try { typeof plugin.destroy === 'function' && plugin.destroy(ctx); } catch (e) { /* ignore */ }
          };
        }

        // Failsafe: if the plugin didn't populate the body, render an inline error instead
        try {
          const checkBlank = () => {
            const slot = document.querySelector('.ppx-modal__body .ppx-ex__content');
            const hasContent = !!(slot && slot.firstChild && slot.firstChild.childNodes && slot.firstChild.childNodes.length);
            if (!hasContent) {
              PPXModal.setBody(errorBody(
                (activeLang === 'en' ? 'Exercise failed to render.' : 'No se pudo renderizar el ejercicio.'),
                (activeLang === 'en' ? 'Please reload this page or check the console.' : 'Recarg la pEgina o revisE la consola.')
              ));
            }
          };
          // Give the plugin a moment to mount DOM
          setTimeout(checkBlank, 0);
        } catch (_) {}

        // Allow Escape to prompt plugin cleanup when modal closes
        const onClose = () => {
          try { typeof cleanup === 'function' && cleanup(); } catch (e) {}
          W.removeEventListener('ppx:modal:close', onClose);
        };
        W.addEventListener('ppx:modal:close', onClose);

      } catch (err) {
        console.error('[PPX] openExercise error:', err);
        dispatch('ppx:exercise:error', {
          message: String(err && err.message || err),
          type, slug, version: version || 'current'
        });
        PPXModal.open({
          title: 'Error',
          meta: '',
          progress: 0,
          body: errorBody(
            'No pudimos cargar el ejercicio.',
            (String(err && err.message || err))
          ),
          actions: {
            retry: {
              label: 'Reintentar',
              variant: 'ghost',
              onClick: () => PPX.openExercise({ type, slug, version, lang, context })
            },
            next: { label: 'Cerrar', variant: 'primary', onClick: () => PPXModal.close() }
          }
        });
      }
    }
  };

  // Expose globally once
  if (!W.PPX) W.PPX = PPX;

  // Optional: autowire [data-ppx-exercise] triggers for quick testing
  D.addEventListener('click', (e) => {
    const t = e.target.closest('[data-ppx-exercise]');
    if (!t) return;
    e.preventDefault();
    const type = t.getAttribute('data-ppx-type') || t.dataset.ppxType || 'tf';
    const slug = t.getAttribute('data-ppx-slug') || t.dataset.ppxSlug;
    const version = t.getAttribute('data-ppx-version') || t.dataset.ppxVersion || null;
    const lang = t.getAttribute('data-ppx-lang') || t.dataset.ppxLang || null;
    const context = t.getAttribute('data-ppx-context') || t.dataset.ppxContext || null;
    if (!slug) return console.warn('[PPX] Missing data-ppx-slug on trigger');
    PPX.openExercise({ type, slug, version, lang, context });
  });
})();
