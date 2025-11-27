/* static/js/admin_builder_dictation.js */
(function(){
  const D = document;
  function ready(fn){ if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(() => {
    const form = D.getElementById('ppx-dictation-form');
    if (!form) return;

    const itemsWrap = D.getElementById('ppx-items');
    const tpl = D.getElementById('ppx-item-template');
    const btnAdd = D.getElementById('ppx-add-item');
    const btnSave = D.getElementById('ppx-save-draft');
    const btnPreview = D.getElementById('ppx-preview');
    const btnExport = D.getElementById('ppx-export-json');
    const btnPublish = D.getElementById('ppx-publish');
    let btnJsonEdit = D.getElementById('ppx-edit-json');
    (function ensureJsonBtn(){
      try {
        if (!btnJsonEdit) {
          btnJsonEdit = D.createElement('button');
          btnJsonEdit.type = 'button';
          btnJsonEdit.id = 'ppx-edit-json';
          btnJsonEdit.className = 'ppx-btn';
          btnJsonEdit.title = t('Editar JSON', 'Edit JSON');
          btnJsonEdit.setAttribute('aria-label', t('Editar JSON', 'Edit JSON'));
          btnJsonEdit.style.display = 'inline-flex';
          btnJsonEdit.style.alignItems = 'center';
          btnJsonEdit.style.gap = '6px';
          btnJsonEdit.style.padding = '6px 10px';
          btnJsonEdit.style.borderRadius = '10px';
          const icon = D.createElement('img'); icon.src='/static/assets/icons/json.svg'; icon.alt=''; icon.width=18; icon.height=18;
          const label = D.createElement('span'); label.textContent = 'JSON';
          btnJsonEdit.appendChild(icon); btnJsonEdit.appendChild(label);
          // place near Export if available
          if (btnExport && btnExport.parentNode) btnExport.parentNode.insertBefore(btnJsonEdit, btnExport.nextSibling);
          else if (btnPreview && btnPreview.parentNode) btnPreview.parentNode.insertBefore(btnJsonEdit, btnPreview.nextSibling);
          else form.appendChild(btnJsonEdit);
        }
      } catch(_){}
    })();

    const inputSlug = D.getElementById('ex-slug');
    const inputTitleEs = D.getElementById('ex-title-es');
    const inputTitleEn = D.getElementById('ex-title-en');
    const taInstEs = D.getElementById('ex-inst-es');
    const taInstEn = D.getElementById('ex-inst-en');
    const selLevel = D.getElementById('ex-level');
    const inputTx = D.querySelector('.ppx-taxonomy input[type=hidden]');

    // i18n helper must be defined before any UI creation that uses it
    const appLang = (window.PPX_I18N && window.PPX_I18N.currentLang) || (D.documentElement.getAttribute('lang') || 'es');
    const t = (es, en) => (appLang && appLang.toLowerCase().startsWith('en') ? (en ?? es) : (es ?? en));

    const optIgnoreCase = D.getElementById('opt-ignore-case');
    const optIgnorePunct = D.getElementById('opt-ignore-punct');
    const optNormWS = D.getElementById('opt-normalize-ws');
    const optIgnoreAccents = D.getElementById('opt-ignore-accents');
    const optAutoPlay = D.getElementById('opt-autoplay');
    const optMultiline = D.getElementById('opt-multiline');
    const optMinChars = D.getElementById('opt-min-chars');
    const optAttempts = D.getElementById('opt-attempts');
    // Unlimited attempts checkbox (create if not present)
    let optUnlimited = D.getElementById('opt-unlimited');
    if (!optUnlimited && optAttempts) {
      const parentRow = optAttempts.closest('.ppx-field')?.parentElement;
      if (parentRow) {
        const label = D.createElement('label'); label.className='ppx-chip';
        optUnlimited = D.createElement('input'); optUnlimited.type='checkbox'; optUnlimited.id='opt-unlimited';
        label.appendChild(optUnlimited); label.appendChild(D.createTextNode(' ' + t('Intentos ilimitados','Unlimited attempts')));
        parentRow.appendChild(label);
      }
    }
    if (optUnlimited && optAttempts) {
      const sync = () => { optAttempts.disabled = !!optUnlimited.checked; };
      optUnlimited.addEventListener('change', sync); sync();
    }
    const optAllowRetry = D.getElementById('opt-allow-retry');

    // Prefill slug for edit routes
    (function prefillSlug(){
      if (inputSlug && !inputSlug.value) {
        const m = location.pathname.match(/\/admin\/exercises\/dictation\/([^\/]+)\/edit/);
        if (m && m[1]) inputSlug.value = decodeURIComponent(m[1]);
      }
    })();

    function renumber(){
      const rows = itemsWrap.querySelectorAll('details');
      rows.forEach((row, i) => {
        const chip = row.querySelector('[data-item-handle]');
        if (chip) chip.textContent = `#${i+1}`;
      });
    }

    function addItem(data){
      const node = tpl.content.firstElementChild.cloneNode(true);
      // Wire controls
      node.querySelector('[data-item-up]')?.addEventListener('click', () => { const prev = node.previousElementSibling; if (prev) { itemsWrap.insertBefore(node, prev); renumber(); }});
      node.querySelector('[data-item-down]')?.addEventListener('click', () => { const next = node.nextElementSibling; if (next) { itemsWrap.insertBefore(next, node); renumber(); }});
      node.querySelector('[data-item-del]')?.addEventListener('click', () => { node.remove(); renumber(); });
      node.querySelector('[data-audio-preview]')?.addEventListener('click', () => {
        const url = node.querySelector('[data-field="audio_url"]').value.trim();
        if (!url) { alert(t('Pegue una URL de audio.', 'Paste an audio URL.')); return; }
        const audio = new Audio(url);
        audio.controls = true; audio.playbackRate = 1.0;
        openLightbox(audio);
      });

      // Upload handler
      const fileInput = node.querySelector('[data-audio-file]');
      const btnUpload = node.querySelector('[data-audio-upload]');
      btnUpload?.addEventListener('click', () => {
        if (!inputSlug.value.trim()) { alert(t('Defina el slug antes de subir.', 'Set the slug before uploading.')); return; }
        fileInput && fileInput.click();
      });
      fileInput?.addEventListener('change', async () => {
        try {
          const f = fileInput.files && fileInput.files[0];
          if (!f) return;
          const slug = inputSlug.value.trim();
          const fd = new FormData();
          fd.append('file', f);
          const url = `/admin/api/exercises/dictation/${encodeURIComponent(slug)}/upload?kind=audio`;
          const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
          if (!res.ok) {
            const j = await res.json().catch(()=>({}));
            throw new Error(j.error || `HTTP ${res.status}`);
          }
          const j = await res.json();
          const media = (j && j.data) || {};
          if (media.url) {
            const input = node.querySelector('[data-field="audio_url"]');
            if (input) input.value = media.url;
          }
          // reset input so same file can be reselected
          try { fileInput.value = ''; } catch(_){ }
        } catch (e){
          console.error(e);
          alert(t('No se pudo subir el audio.', 'Audio upload failed.'));
        }
      });
      // Prefill
      if (data) {
        const set = (sel, val) => { const el = node.querySelector(sel); if (el) el.value = val ?? ''; };
        set('[data-field="audio_url"]', data.audio_url);
        set('[data-field="transcript"]', data.transcript);
        set('[data-field="variants"]', (Array.isArray(data.variants) ? data.variants.join('\n') : ''));
        set('[data-field="hint_es"]', data.hint_es);
        set('[data-field="hint_en"]', data.hint_en);
      }
      itemsWrap.insertBefore(node, itemsWrap.querySelector('.ppx-add-bar') || null);
      renumber();
    }

    // Lightbox utility (local, minimal)
    function openLightbox(child){
      const ov = D.createElement('div');
      ov.style.position = 'fixed'; ov.style.inset = '0'; ov.style.background = 'rgba(0,0,0,.65)';
      ov.style.zIndex = '2000'; ov.style.display = 'flex'; ov.style.alignItems = 'center'; ov.style.justifyContent = 'center';
      const close = () => ov.remove();
      ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
      const box = D.createElement('div'); box.style.maxWidth = '90vw'; box.style.maxHeight = '85vh'; box.style.background = '#fff'; box.style.borderRadius = '12px'; box.style.boxShadow = '0 10px 30px rgba(0,0,0,.35)'; box.style.overflow = 'hidden';
      box.appendChild(child);
      const x = D.createElement('button'); x.textContent = '×'; x.setAttribute('aria-label','Close'); x.style.position = 'fixed'; x.style.top = '16px'; x.style.right = '16px'; x.style.background = '#fff'; x.style.border = '1px solid #e5e7eb'; x.style.borderRadius = '999px'; x.style.padding = '.35rem .5rem'; x.style.cursor = 'pointer'; x.addEventListener('click', close);
      ov.appendChild(box); ov.appendChild(x); D.body.appendChild(ov);
    }

    // Add bar
    const addBar = D.createElement('div'); addBar.className = 'ppx-add-bar'; addBar.style.display = 'flex'; addBar.style.justifyContent = 'flex-end'; addBar.style.marginTop = '8px';
    if (btnAdd) addBar.appendChild(btnAdd); itemsWrap.appendChild(addBar);
    btnAdd?.addEventListener('click', () => addItem());

    function assembleJSON(status){
      const slug = (inputSlug.value || '').trim().toLowerCase();
      const payload = {
        type: 'dictation',
        slug,
        title_es: inputTitleEs.value || '',
        title_en: inputTitleEn.value || '',
        instructions_es: taInstEs.value || '',
        instructions_en: taInstEn.value || '',
        level: selLevel.value || '',
        taxonomy_paths: (()=>{ try { return JSON.parse(inputTx.value || '[]'); } catch(_) { return []; } })(),
        status: status || 'draft',
        options: {
          ignoreCase: !!optIgnoreCase.checked,
          ignorePunctuation: !!optIgnorePunct.checked,
          normalizeWhitespace: !!optNormWS.checked,
          ignoreAccents: !!optIgnoreAccents.checked,
          minCharsToEnableCheck: Math.max(0, parseInt(optMinChars.value||'0',10)||0),
          allowRetry: !!optAllowRetry.checked,
          attemptsMax: (optUnlimited && optUnlimited.checked) ? 0 : Math.max(1, parseInt(optAttempts.value||'1',10)||1),
          autoPlay: !!optAutoPlay.checked,
          multiline: !!optMultiline.checked
        },
        items: []
      };
      const rows = itemsWrap.querySelectorAll('details');
      rows.forEach((row, i) => {
        const get = (sel) => { const el = row.querySelector(sel); return el ? el.value : ''; };
        const variantsText = get('[data-field="variants"]');
        payload.items.push({
          order: i + 1,
          audio_url: (get('[data-field="audio_url"]').trim()),
          transcript: get('[data-field="transcript"]').trim(),
          variants: variantsText ? variantsText.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
          hint_es: get('[data-field="hint_es"]').trim(),
          hint_en: get('[data-field="hint_en"]').trim()
        });
      });
      return payload;
    }

    function validatePayload(p){
      const errs = [];
      if (!p.slug) errs.push(t('El slug es obligatorio.', 'Slug is required.'));
      if (!(p.title_es || p.title_en)) errs.push(t('Falta título ES/EN.', 'Title ES/EN required.'));
      if (!(p.instructions_es || p.instructions_en)) errs.push(t('Faltan instrucciones ES/EN.', 'Instructions ES/EN required.'));
      if (!Array.isArray(p.items) || !p.items.length) errs.push(t('Agregue al menos un ítem.', 'Add at least one item.'));
      (p.items||[]).forEach((it, i) => {
        if (!it.audio_url) errs.push(t(`Ítem ${i+1}: falta audio.`, `Item ${i+1}: audio is required.`));
        if (!it.transcript) errs.push(t(`Ítem ${i+1}: falta transcripción.`, `Item ${i+1}: transcript is required.`));
      });
      return errs;
    }

    // Apply a full payload into the form (used by JSON editor, edit-prefill, and draft restore)
    function applyPayload(next){
      if (!next || typeof next !== 'object') return;
      try { inputSlug.value = next.slug || ''; } catch(_) {}
      try { inputTitleEs.value = next.title_es || ''; } catch(_) {}
      try { inputTitleEn.value = next.title_en || ''; } catch(_) {}
      try { taInstEs.value = next.instructions_es || ''; } catch(_) {}
      try { taInstEn.value = next.instructions_en || ''; } catch(_) {}
      if (next.level) { try { selLevel.value = next.level; } catch(_) {} }
      try { inputTx.value = JSON.stringify(next.taxonomy_paths || []); } catch(_) {}
      const opt = next.options || {};
      try { optIgnoreCase.checked = !!opt.ignoreCase; } catch(_) {}
      try { optIgnorePunct.checked = !!opt.ignorePunctuation; } catch(_) {}
      try { optNormWS.checked = (opt.normalizeWhitespace !== undefined) ? !!opt.normalizeWhitespace : !!optNormWS.checked; } catch(_) {}
      try { optIgnoreAccents.checked = (opt.ignoreAccents !== undefined) ? !!opt.ignoreAccents : !!optIgnoreAccents.checked; } catch(_) {}
      try { optAutoPlay.checked = !!opt.autoPlay; } catch(_) {}
      try { optMultiline.checked = !!opt.multiline; } catch(_) {}
      if (Number.isInteger(opt.minCharsToEnableCheck)) { try { optMinChars.value = opt.minCharsToEnableCheck; } catch(_) {} }
      if (Number.isInteger(opt.attemptsMax)) {
        if (optUnlimited) { try { optUnlimited.checked = (opt.attemptsMax === 0); } catch(_) {} }
        if (opt.attemptsMax > 0) { try { optAttempts.value = opt.attemptsMax; } catch(_) {} }
        if (optUnlimited) { try { optAttempts.disabled = !!optUnlimited.checked; } catch(_) {} }
      }
      try { optAllowRetry.checked = !!opt.allowRetry; } catch(_) {}
      // Items
      try { itemsWrap.querySelectorAll('details').forEach(n => n.remove()); } catch(_) {}
      (next.items || []).forEach(it => addItem(it));
      renumber();
    }

    // Save Draft
    btnSave?.addEventListener('click', async () => {
      const payload = assembleJSON('draft');
      const errs = validatePayload(payload);
      if (errs.length) { alert(errs.join('\n')); return; }
      try {
        const isEdit = (form.getAttribute('data-builder-mode') === 'edit');
        const url = isEdit
          ? `/admin/api/exercises/${encodeURIComponent('dictation')}/${encodeURIComponent(payload.slug)}`
          : `/admin/api/exercises`;
        const method = isEdit ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
        if (!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.error || `HTTP ${res.status}`); }
        alert(t('Borrador guardado.', 'Draft saved.'));
        btnPublish && (btnPublish.disabled = false);
        // If we are on the NEW route, move to the EDIT URL so future reloads prefill from API
        if (!isEdit) {
          try {
            history.replaceState(null, '', `/admin/exercises/dictation/${encodeURIComponent(payload.slug)}/edit`);
          } catch(_) {
            window.location.href = `/admin/exercises/dictation/${encodeURIComponent(payload.slug)}/edit`;
            return; // bail (navigation)
          }
          form.setAttribute('data-builder-mode', 'edit');
          form.setAttribute('data-builder-slug', payload.slug);
        }
      } catch (e){ console.error(e); alert(t('Error al guardar el borrador.', 'Failed to save draft.')); }
    });

    // Preview (intercept fetch to return current payload)
    btnPreview?.addEventListener('click', () => {
      const payload = assembleJSON('draft');
      const errs = validatePayload(payload);
      if (errs.length) { alert(errs.join('\n')); return; }
      const url = `/admin/api/exercises/dictation/${encodeURIComponent(payload.slug)}`;
      const originalFetch = window.fetch; let armed = true;
      window.fetch = async function(input, init){
        try {
          const reqUrl = (typeof input === 'string') ? input : input.url;
          if (armed && reqUrl && reqUrl.startsWith(url)) {
            return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          return originalFetch.apply(this, arguments);
        } catch (e) { return originalFetch.apply(this, arguments); }
      };
      const onClose = () => { armed = false; window.fetch = originalFetch; window.removeEventListener('ppx:modal:close', onClose); };
      window.addEventListener('ppx:modal:close', onClose);
      try {
        window.PPX.openExercise({ type: 'dictation', slug: payload.slug, lang: appLang, context: { source: 'admin-preview' } });
      } catch (e) { onClose(); console.error(e); alert(t('No se pudo abrir la vista previa.', 'Failed to open preview.')); }
    });

    // Publish
    btnPublish?.addEventListener('click', async () => {
      const payload = assembleJSON('draft');
      const errs = validatePayload(payload);
      if (errs.length) { alert(errs.join('\n')); return; }
      try {
        const res1 = await fetch('/admin/api/exercises', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
        if (!res1.ok) { const j = await res1.json().catch(()=>({})); throw new Error(j.error || `HTTP ${res1.status}`); }
        const pubURL = `/admin/api/exercises/dictation/${encodeURIComponent(payload.slug)}/publish`;
        const res2 = await fetch(pubURL, { method: 'POST', credentials: 'same-origin' });
        if (!res2.ok) { const j = await res2.json().catch(()=>({})); throw new Error(j.error || `HTTP ${res2.status}`); }
        alert(t('Publicado.', 'Published.'));
      } catch (e) { console.error(e); alert(t('No se pudo publicar el ejercicio.', 'Failed to publish exercise.')); }
    });

    // Export JSON
    btnExport?.addEventListener('click', () => {
      const payload = assembleJSON('draft');
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = D.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${payload.slug || 'dictation'}.json`; a.click(); URL.revokeObjectURL(a.href);
    });

    // JSON Editor (modal textarea with round-trip)
    btnJsonEdit?.addEventListener('click', () => {
      try {
        if (window.PPXJsonEditor && typeof window.PPXJsonEditor.open === 'function') {
          const payload = assembleJSON('draft');
          window.PPXJsonEditor.open({
            exerciseType: 'dictation',
            slug: payload.slug || '',
            title: payload.title_es || payload.title_en || payload.slug || '',
            level: payload.level || (selLevel ? selLevel.value : ''),
            initialData: payload,
            validate: (obj) => validatePayload(obj),
            apply: (obj) => { applyPayload(obj); }
          });
          return;
        }
      } catch (e) { console.error(e); }
      const payload = assembleJSON('draft');
      const wrap = D.createElement('div'); wrap.style.width = 'min(90vw, 960px)'; wrap.style.height = '80vh'; wrap.style.display = 'flex'; wrap.style.flexDirection = 'column';
      const ta = D.createElement('textarea'); ta.value = JSON.stringify(payload, null, 2); ta.style.flex = '1'; ta.style.width = '100%';
      ta.style.border = 'none'; ta.style.outline = 'none'; ta.style.padding = '12px'; ta.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      const bar = D.createElement('div'); bar.style.display = 'flex'; bar.style.justifyContent = 'flex-end'; bar.style.gap = '8px'; bar.style.padding = '8px';
      const btnApply = D.createElement('button'); btnApply.className = 'ppx-btn ppx-btn--primary'; btnApply.textContent = t('Aplicar', 'Apply');
      const btnCancel = D.createElement('button'); btnCancel.className = 'ppx-btn'; btnCancel.textContent = t('Cancelar', 'Cancel');
      bar.appendChild(btnCancel); bar.appendChild(btnApply);
      wrap.appendChild(ta); wrap.appendChild(bar);
      let overlay;
      const close = () => overlay && overlay.remove();
      btnCancel.addEventListener('click', close);
      btnApply.addEventListener('click', () => {
        try {
          const next = JSON.parse(ta.value);
          const errs = validatePayload(next);
          if (errs.length) { alert(errs.join('\n')); return; }
          applyPayload(next);
          close();
        } catch (e){ alert(t('JSON inválido.', 'Invalid JSON.')); }
      });
      overlay = (function(){ const ov = D.createElement('div'); ov.style.position='fixed'; ov.style.inset='0'; ov.style.background='rgba(0,0,0,.65)'; ov.style.zIndex='3000'; ov.style.display='flex'; ov.style.alignItems='center'; ov.style.justifyContent='center'; ov.addEventListener('click', (e)=>{ if(e.target===ov) close(); }); const panel = D.createElement('div'); panel.style.background='#fff'; panel.style.borderRadius='12px'; panel.style.boxShadow='0 10px 30px rgba(0,0,0,.35)'; panel.appendChild(wrap); ov.appendChild(panel); D.body.appendChild(ov); return ov; })();
    });

    // Autosave (localStorage)
    let dirty = false;
    form.addEventListener('input', () => { dirty = true; });
    setInterval(() => {
      if (!dirty) return;
      try {
        const payload = assembleJSON('draft');
        const errs = validatePayload(payload);
        const slug = payload.slug || form.getAttribute('data-builder-slug') || '';
        if (!errs.length && slug) {
          const key = `ppx:ex:dictation:${slug}`;
          localStorage.setItem(key, JSON.stringify(payload));
          dirty = false;
        }
      } catch (_) {}
    }, 10000);

    // Prefill for EDIT mode or draft restore
    (function prefill(){
      const mode = form.getAttribute('data-builder-mode') || 'new';
      let editSlug = form.getAttribute('data-builder-slug') || '';
      if (!editSlug && window.PPX_BUILDER && window.PPX_BUILDER.slug) {
        editSlug = String(window.PPX_BUILDER.slug || '');
      }
      if (!editSlug) {
        const m = location.pathname.match(/\/admin\/exercises\/dictation\/([^\/]+)\/edit/);
        if (m && m[1]) editSlug = decodeURIComponent(m[1]);
      }
      const draftKey = editSlug ? `ppx:ex:dictation:${editSlug}` : '';

      const getDraft = () => {
        try {
          if (!draftKey) return null;
          const raw = localStorage.getItem(draftKey);
          if (!raw) return null;
          const obj = JSON.parse(raw);
          if (!obj || typeof obj !== 'object') return null;
          const errs = validatePayload(obj);
          return (errs.length === 0) ? obj : null;
        } catch (_) { return null; }
      };

      const applyFromAPI = () => {
        if (!(mode === 'edit' && editSlug)) return Promise.resolve(false);
        // If server embedded a prefill payload, use it immediately
        if (window.PPX_PREFILL && typeof window.PPX_PREFILL === 'object' && (window.PPX_PREFILL.slug || window.PPX_PREFILL.items)) {
          try { applyPayload(window.PPX_PREFILL); return Promise.resolve(true); } catch(_) {}
        }
        return fetch(`/admin/api/exercises/dictation/${encodeURIComponent(editSlug)}`, { credentials: 'same-origin' })
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
          .then(data => { if (data && typeof data === 'object') { applyPayload(data); return true; } return false; })
          .catch((e) => { console.warn('[Dictation Builder] Prefill fetch failed:', e); return false; });
      };

      // Strategy: always try API first to ensure we show saved content;
      // if a valid local draft exists, apply it on top (user’s latest changes).
      applyFromAPI().then((applied) => {
        const draft = getDraft();
        if (draft) { applyPayload(draft); return; }
        // If neither API nor draft applied, at least set the slug field so the user sees context
        if (!applied && editSlug) { try { inputSlug.value = editSlug; } catch(_) {} }
      });
    })();

    // Ensure at least one item for new exercises
    if (!itemsWrap.querySelector('details')) addItem();
  });
})();
