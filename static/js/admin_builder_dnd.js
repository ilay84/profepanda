/* static/js/admin_builder_dnd.js */
(function () {
  const D = document;
  function ready(fn){ if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(() => {
    const form = D.getElementById('ppx-dnd-form');
    if (!form) return;

    const mode = form.getAttribute('data-builder-mode') || 'new';
    const editSlug = form.getAttribute('data-builder-slug') || '';

    const inputSlug = D.getElementById('ex-slug');
    const inputTitleEs = D.getElementById('ex-title-es');
    const inputTitleEn = D.getElementById('ex-title-en');
    const taInstEs = D.getElementById('ex-inst-es');
    const taInstEn = D.getElementById('ex-inst-en');
    const selLevel = D.getElementById('ex-level');
    const inputTx = D.querySelector('.ppx-taxonomy input#taxonomy_paths');

    const colsWrap = D.getElementById('ppx-cols');
    const colTpl = D.getElementById('ppx-col-template');
    const btnAddCol = D.getElementById('ppx-add-col');
    const tokensWrap = D.getElementById('ppx-tokens');
    const tokTpl = D.getElementById('ppx-token-template');
    const btnAddToken = D.getElementById('ppx-add-token');
    const inputMediaUrl = D.getElementById('ex-media-url');
    const btnMediaUpload = D.getElementById('ex-media-upload');

    const btnSave = D.getElementById('ppx-save-draft');
    const btnPublish = D.getElementById('ppx-publish');
    const btnPreview = D.getElementById('ppx-preview');
    let btnEditJson = D.getElementById('ppx-edit-json');

    const appLang = (window.PPX_I18N && window.PPX_I18N.currentLang) || (D.documentElement.getAttribute('lang') || 'es');
    const t = (es, en) => (appLang.startsWith('en') ? (en ?? es) : (es ?? en));

    // Slug helpers
    function slugify(s) {
      try {
        return (s || '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 80);
      } catch (_) {
        return String(s || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]+/g, '').slice(0,80);
      }
    }
    let slugManuallyEdited = false;
    inputSlug.addEventListener('input', () => { slugManuallyEdited = true; });

    function autoSlugFromTitle() {
      if (slugManuallyEdited) return;
      const src = (inputTitleEs.value || inputTitleEn.value || '').trim();
      if (!src) return;
      inputSlug.value = slugify(src);
    }

    // Prefill slug for edit routes
    if (mode === 'edit' && !inputSlug.value && editSlug) inputSlug.value = editSlug;
    // Auto-create slug while typing title until user edits slug manually
    ['input','blur'].forEach(evt => {
      inputTitleEs.addEventListener(evt, autoSlugFromTitle);
      inputTitleEn.addEventListener(evt, autoSlugFromTitle);
    });

    function makeId(prefix='id') { return `${prefix}_${Math.random().toString(36).slice(2,8)}`; }

    function refreshColumnSelects() {
      const allCols = Array.from(colsWrap.querySelectorAll('.ppx-card'));
      const options = allCols.map((node, i) => {
        const id = node._id || (node._id = makeId('col'));
        const labelEs = node.querySelector('.col-label-es')?.value?.trim();
        const labelEn = node.querySelector('.col-label-en')?.value?.trim();
        return { id, label_es: labelEs || '', label_en: labelEn || '' };
      });
      tokensWrap.querySelectorAll('.tok-correct').forEach(sel => {
        const cur = sel.value;
        sel.innerHTML = '';
        options.forEach(opt => {
          const o = D.createElement('option');
          o.value = opt.id; o.textContent = opt.label_es || opt.label_en || opt.id;
          sel.appendChild(o);
        });
        if (cur && Array.from(sel.options).some(o => o.value === cur)) {
          sel.value = cur;
        } else if (sel.options.length) {
          sel.value = sel.options[0].value;
        }
      });
      return options;
    }

    function addColumn(pref = {}) {
      const node = colTpl.content.firstElementChild.cloneNode(true);
      node._id = (pref.id && String(pref.id)) || makeId('col');
      node.querySelector('.col-label-es').value = pref.label_es || '';
      node.querySelector('.col-label-en').value = pref.label_en || '';
      // Refresh token selects when user types labels
      const onLabelInput = () => refreshColumnSelects();
      node.querySelector('.col-label-es').addEventListener('input', onLabelInput);
      node.querySelector('.col-label-en').addEventListener('input', onLabelInput);
      node.querySelector('.btn-del-col').addEventListener('click', () => { node.remove(); refreshColumnSelects(); });
      colsWrap.appendChild(node);
      refreshColumnSelects();
    }

    function addToken(pref = {}) {
      const node = tokTpl.content.firstElementChild.cloneNode(true);
      node._id = makeId('tok');
      node.querySelector('.tok-text-es').value = pref.text_es || '';
      node.querySelector('.tok-text-en').value = pref.text_en || '';
      const hintEsEl = node.querySelector('.tok-hint-es');
      const hintEnEl = node.querySelector('.tok-hint-en');
      const fbOkEsEl = node.querySelector('.tok-fb-ok-es');
      const fbOkEnEl = node.querySelector('.tok-fb-ok-en');
      const fbBadEsEl = node.querySelector('.tok-fb-bad-es');
      const fbBadEnEl = node.querySelector('.tok-fb-bad-en');
      if (hintEsEl) hintEsEl.value = pref.hint_es || '';
      if (hintEnEl) hintEnEl.value = pref.hint_en || '';
      if (fbOkEsEl) fbOkEsEl.value = pref.feedback_correct_es || '';
      if (fbOkEnEl) fbOkEnEl.value = pref.feedback_correct_en || '';
      if (fbBadEsEl) fbBadEsEl.value = pref.feedback_incorrect_es || '';
      if (fbBadEnEl) fbBadEnEl.value = pref.feedback_incorrect_en || '';
      const sel = node.querySelector('.tok-correct');
      node.querySelector('.btn-del-token').addEventListener('click', () => node.remove());
      // Append first so refreshColumnSelects sees this select
      tokensWrap.appendChild(node);
      // Populate select options for this and all tokens
      refreshColumnSelects();
      // Then set default/desired selection
      setTimeout(() => {
        if (pref.correct && Array.from(sel.options).some(o => o.value === pref.correct)) sel.value = pref.correct;
        else if (sel.options.length && !sel.value) sel.value = sel.options[0].value;
      }, 0);
    }

    function pickFile(accept) {
      return new Promise((resolve) => {
        const inp = D.createElement('input');
        inp.type = 'file'; if (accept) inp.accept = accept;
        inp.addEventListener('change', () => resolve(inp.files && inp.files[0]));
        inp.click();
      });
    }

    async function uploadMedia(kind, slug, file) {
      const fd = new FormData();
      fd.append('file', file);
      const url = `/admin/api/exercises/dnd/${encodeURIComponent(slug)}/upload?kind=${encodeURIComponent(kind)}`;
      const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      return j.data && j.data.url;
    }

    // Global media upload button
    btnMediaUpload.addEventListener('click', async () => {
      const slug = (inputSlug.value || '').trim();
      if (!slug) { alert(t('Primero complete el slug.', 'Fill slug first.')); return; }
      const file = await pickFile('image/*');
      if (!file) return;
      try {
        const url = await uploadMedia('image', slug, file);
        inputMediaUrl.value = url;
      } catch (e) {
        alert(String(e && e.message || e));
      }
    });

    function collectPayload() {
      const slug = (inputSlug.value || '').trim();
      const cols = Array.from(colsWrap.querySelectorAll('.ppx-card')).map(node => {
        const id = node._id || makeId('col');
        node._id = id;
        return {
          id,
          label_es: node.querySelector('.col-label-es')?.value?.trim() || '',
          label_en: node.querySelector('.col-label-en')?.value?.trim() || ''
        };
      });
      const tokens = Array.from(tokensWrap.querySelectorAll('.ppx-card')).map(node => {
        const tok = {
          id: node._id || makeId('tok'),
          text_es: node.querySelector('.tok-text-es')?.value?.trim() || '',
          text_en: node.querySelector('.tok-text-en')?.value?.trim() || '',
          correct: node.querySelector('.tok-correct')?.value || ''
        };
        const hint_es = node.querySelector('.tok-hint-es')?.value?.trim();
        const hint_en = node.querySelector('.tok-hint-en')?.value?.trim();
        const fboe = node.querySelector('.tok-fb-ok-es')?.value?.trim();
        const fboen = node.querySelector('.tok-fb-ok-en')?.value?.trim();
        const fbie = node.querySelector('.tok-fb-bad-es')?.value?.trim();
        const fbien = node.querySelector('.tok-fb-bad-en')?.value?.trim();
        if (hint_es) tok.hint_es = hint_es;
        if (hint_en) tok.hint_en = hint_en;
        if (fboe) tok.feedback_correct_es = fboe;
        if (fboen) tok.feedback_correct_en = fboen;
        if (fbie) tok.feedback_incorrect_es = fbie;
        if (fbien) tok.feedback_incorrect_en = fbien;
        return tok;
      });
      const tx = (() => { try { return JSON.parse(inputTx?.value || '[]') } catch { return [] } })();
      const payload = {
        id: `dnd/${slug}`,
        type: 'dnd',
        slug,
        title_es: inputTitleEs.value || '',
        title_en: inputTitleEn.value || '',
        instructions_es: taInstEs.value || '',
        instructions_en: taInstEn.value || '',
        level: selLevel.value || 'A2',
        taxonomy_paths: Array.isArray(tx) ? tx : [],
        status: 'draft',
        items: [ { id: 'i1', order: 1, columns: cols, tokens } ]
      };
      const mediaUrl = (inputMediaUrl.value || '').trim();
      if (mediaUrl) payload.media = { image_url: mediaUrl };
      return payload;
    }

    function validatePayload(p) {
      const errs = [];
      if (!p.slug) errs.push(t('El slug es obligatorio.', 'Slug is required.'));
      if (!(p.instructions_es || p.instructions_en)) errs.push(t('Faltan instrucciones ES/EN.', 'Instructions ES/EN required.'));
      const item = (Array.isArray(p.items) && p.items[0]) || null;
      const cols = (item && Array.isArray(item.columns)) ? item.columns : [];
      const toks = (item && Array.isArray(item.tokens)) ? item.tokens : [];
      if (cols.length < 2) errs.push(t('Agregue al menos dos columnas.', 'Add at least two columns.'));
      if (toks.length < 2) errs.push(t('Agregue al menos dos fichas.', 'Add at least two tokens.'));
      toks.forEach((tk, i) => {
        if (!(tk.text_es || tk.text_en)) errs.push(t(`Ficha ${i+1}: texto ES/EN requerido.`, `Token ${i+1}: text ES/EN required.`));
        if (!tk.correct) errs.push(t(`Ficha ${i+1}: seleccione la columna correcta.`, `Token ${i+1}: choose the correct column.`));
      });
      return errs;
    }

    // JSON Editor (modal) modeled after TF builder
    function openJsonEditor() {
      const payload = collectPayload();
      let lastGoodJson = JSON.stringify(payload, null, 2);

      const ov = D.createElement('div');
      ov.style.position = 'fixed';
      ov.style.inset = '0';
      ov.style.background = 'rgba(0,0,0,.55)';
      ov.style.zIndex = '2500';
      ov.style.display = 'flex';
      ov.style.alignItems = 'center';
      ov.style.justifyContent = 'center';

      const modal = D.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'ppx-json-title');
      modal.style.width = 'min(960px, 86vw)';
      modal.style.maxWidth = '100%';
      modal.style.maxHeight = '90vh';
      modal.style.display = 'flex';
      modal.style.flexDirection = 'column';
      modal.style.background = '#fff';
      modal.style.borderRadius = '14px';
      modal.style.boxShadow = '0 14px 40px rgba(0,0,0,.35)';
      modal.style.overflow = 'hidden';

      const header = D.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.padding = '.75rem 1rem';
      header.style.borderBottom = '1px solid #e5e7eb';

      const h = D.createElement('h3');
      h.id = 'ppx-json-title';
      h.textContent = t('Editar como JSON', 'Edit as JSON');
      h.style.margin = '0';
      h.style.fontSize = '1rem';

      const closeX = D.createElement('button');
      closeX.type = 'button';
      closeX.textContent = '✕';
      closeX.setAttribute('aria-label', t('Cerrar', 'Close'));
      closeX.className = 'ppx-btn ppx-btn--ghost';
      closeX.style.borderRadius = '999px';
      closeX.style.padding = '.25rem .5rem';

      header.appendChild(h);
      header.appendChild(closeX);

      const body = D.createElement('div');
      body.style.padding = '.75rem 1rem';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.gap = '.5rem';
      body.style.minHeight = '300px';

      const textarea = D.createElement('textarea');
      textarea.value = lastGoodJson;
      textarea.style.width = '100%';
      textarea.style.height = '46vh';
      textarea.style.boxSizing = 'border-box';
      textarea.style.resize = 'vertical';
      textarea.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
      textarea.style.fontSize = '13px';
      textarea.style.lineHeight = '1.45';
      textarea.style.padding = '.75rem';
      textarea.style.border = '1px solid #e5e7eb';
      textarea.style.borderRadius = '8px';

      const status = D.createElement('div');
      status.setAttribute('aria-live', 'polite');
      status.style.fontSize = '.9rem';
      status.style.color = '#6b7280';

      const footer = D.createElement('div');
      footer.style.display = 'flex';
      footer.style.alignItems = 'center';
      footer.style.justifyContent = 'space-between';
      footer.style.gap = '.5rem';
      footer.style.padding = '.75rem 1rem';
      footer.style.borderTop = '1px solid #e5e7eb';
      footer.style.background = '#f8fafc';

      const left = D.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '.5rem';

      const btnValidate = D.createElement('button');
      btnValidate.type = 'button';
      btnValidate.className = 'ppx-btn ppx-btn--subtle';
      btnValidate.textContent = t('Validar', 'Validate');

      const btnApply = D.createElement('button');
      btnApply.type = 'button';
      btnApply.className = 'ppx-btn';
      btnApply.textContent = t('Aplicar', 'Apply');

      const btnCancel = D.createElement('button');
      btnCancel.type = 'button';
      btnCancel.className = 'ppx-btn ppx-btn--ghost';
      btnCancel.textContent = t('Cancelar', 'Cancel');

      left.appendChild(btnValidate);

      const right = D.createElement('div');
      right.style.display = 'flex';
      right.style.gap = '.5rem';
      right.appendChild(btnCancel);
      right.appendChild(btnApply);

      footer.appendChild(left);
      footer.appendChild(right);

      body.appendChild(textarea);
      body.appendChild(status);

      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);

      ov.appendChild(modal);
      D.body.appendChild(ov);

      function close() { ov.remove(); }

      closeX.addEventListener('click', close);
      btnCancel.addEventListener('click', close);
      ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
      D.addEventListener('keydown', function esc(e){ if (e.key === 'Escape'){ close(); D.removeEventListener('keydown', esc); } });

      function computeSyntaxErrorPosition(err) {
        try {
          const msg = String(err && err.message || '');
          const m1 = msg.match(/position\s+(\d+)/i);
          if (m1) {
            const pos = parseInt(m1[1], 10);
            const src = textarea.value;
            let line = 1, col = 1;
            for (let i = 0; i < pos && i < src.length; i++) {
              if (src[i] === '\n') { line++; col = 1; } else { col++; }
            }
            return { line, col };
          }
          const m2 = msg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
          if (m2) return { line: parseInt(m2[1],10), col: parseInt(m2[2],10) };
        } catch(_) {}
        return null;
      }

      function validateNow() {
        try {
          const obj = JSON.parse(textarea.value);
          status.style.color = '#15803d';
          status.textContent = t('JSON válido.', 'Valid JSON.');
          btnApply.disabled = false;
          return obj;
        } catch (err) {
          const pos = computeSyntaxErrorPosition(err);
          status.style.color = '#b91c1c';
          status.textContent = pos
            ? t(`Error de sintaxis (línea ${pos.line}, col ${pos.col}).`, `Syntax error (line ${pos.line}, col ${pos.col}).`)
            : t('Error de sintaxis.', 'Syntax error.');
          btnApply.disabled = true;
          return null;
        }
      }

      // Initial validate
      validateNow();
      btnValidate.addEventListener('click', validateNow);
      textarea.addEventListener('input', () => validateNow());

      function applyJsonToBuilder(data) {
        inputSlug.value = (data.slug || '').toLowerCase();
        inputTitleEs.value = data.title_es || '';
        inputTitleEn.value = data.title_en || '';
        taInstEs.value = data.instructions_es || '';
        taInstEn.value = data.instructions_en || '';
        selLevel.value = data.level || 'A2';
        try {
          const tx = Array.isArray(data.taxonomy_paths) ? data.taxonomy_paths : [];
          if (inputTx) {
            inputTx.value = JSON.stringify(tx);
            inputTx.dispatchEvent(new CustomEvent('ppx:taxonomy:set', { bubbles: true, detail: { paths: tx } }));
          }
        } catch (_) {}
        try { inputMediaUrl.value = (data.media && data.media.image_url) || ''; } catch(_) {}

        // Clear columns and tokens
        Array.from(colsWrap.children).forEach(n => n.remove());
        Array.from(tokensWrap.children).forEach(n => n.remove());

        const item = (Array.isArray(data.items) && data.items[0]) || null;
        const cols = (item && Array.isArray(item.columns)) ? item.columns : [];
        const toks = (item && Array.isArray(item.tokens)) ? item.tokens : [];
        cols.forEach(c => addColumn(c));
        // Refresh selects after columns
        refreshColumnSelects();
        toks.forEach(tok => addToken(tok));
      }

      btnApply.addEventListener('click', () => {
        const obj = validateNow();
        if (!obj) return;
        if (obj.type && obj.type !== 'dnd') {
          alert(t('Este editor es para ejercicios de tipo DnD.', 'This editor is for Drag-and-drop (dnd) exercises.'));
          return;
        }
        try {
          applyJsonToBuilder(obj);
          lastGoodJson = JSON.stringify(obj, null, 2);
          close();
        } catch (err) {
          alert(t('No se pudo aplicar el JSON.', 'Failed to apply JSON.'));
        }
      });
    }

    async function saveDraft() {
      const payload = collectPayload();
      const errs = validatePayload(payload);
      if (errs.length) { alert(errs.join('\n')); return null; }
      const method = (mode === 'edit') ? 'PUT' : 'POST';
      const url = (mode === 'edit')
        ? `/admin/api/exercises/dnd/${encodeURIComponent(payload.slug)}`
        : '/admin/api/exercises';
      try {
        if (method === 'POST') delete payload.id; // store generates id from type/slug
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.ok === false) {
          alert(j.error || `HTTP ${res.status}`);
          return null;
        }
        return j.data || payload;
      } catch (e) {
        alert(String(e && e.message || e));
        return null;
      }
    }

    async function publishNow() {
      const saved = await saveDraft();
      if (!saved) return;
      const slug = saved.slug;
      const res = await fetch(`/admin/api/exercises/dnd/${encodeURIComponent(slug)}/publish`, {
        method: 'POST', credentials: 'same-origin'
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) { alert(j.error || `HTTP ${res.status}`); return; }
      alert(t('Publicado.', 'Published.'));
    }

    async function preview() {
      const saved = await saveDraft();
      if (!saved) return;
      try {
        if (!window.PPX) throw new Error('PPX not loaded');
        window.PPX.openExercise({ type: 'dnd', slug: saved.slug });
      } catch (e) {
        alert(String(e && e.message || e));
      }
    }

    btnAddCol.addEventListener('click', () => addColumn());
    btnAddToken.addEventListener('click', () => addToken());
    btnSave.addEventListener('click', async () => {
      const saved = await saveDraft();
      if (saved) {
        alert(t('Borrador guardado.', 'Draft saved.'));
        // Switch to edit mode and normalize URL so subsequent loads are consistent
        try {
          form.setAttribute('data-builder-mode', 'edit');
          const editUrl = `/admin/exercises/dnd/${encodeURIComponent(saved.slug)}/edit`;
          if (history && history.replaceState) history.replaceState({}, '', editUrl);
        } catch (_) {}
      }
    });
    btnPublish.addEventListener('click', () => publishNow());
    btnPreview.addEventListener('click', () => preview());
    // Ensure a JSON button exists and has the JSON icon (consistent across builders)
    (function ensureJsonBtn(){
      try {
        if (!btnEditJson) {
          btnEditJson = D.createElement('button');
          btnEditJson.type = 'button';
          btnEditJson.id = 'ppx-edit-json';
          btnEditJson.className = 'ppx-btn';
          btnEditJson.title = t('Editar JSON', 'Edit JSON');
          btnEditJson.setAttribute('aria-label', t('Editar JSON', 'Edit JSON'));
          btnEditJson.style.display = 'inline-flex';
          btnEditJson.style.alignItems = 'center';
          btnEditJson.style.gap = '6px';
          btnEditJson.style.padding = '6px 10px';
          btnEditJson.style.borderRadius = '10px';
          const icon = D.createElement('img');
          icon.src = '/static/assets/icons/json.svg'; icon.alt = ''; icon.width = 18; icon.height = 18;
          const label = D.createElement('span'); label.textContent = 'JSON';
          btnEditJson.appendChild(icon); btnEditJson.appendChild(label);
          if (btnPreview && btnPreview.parentNode) btnPreview.parentNode.insertBefore(btnEditJson, btnPreview);
          else if (btnSave && btnSave.parentNode) btnSave.parentNode.insertBefore(btnEditJson, btnSave);
          else form.appendChild(btnEditJson);
        } else {
          // If present but plain, decorate with icon
          if (!btnEditJson.querySelector('img')) {
            btnEditJson.textContent = '';
            const icon = D.createElement('img'); icon.src = '/static/assets/icons/json.svg'; icon.alt=''; icon.width=18; icon.height=18;
            const label = D.createElement('span'); label.textContent = 'JSON';
            btnEditJson.appendChild(icon); btnEditJson.appendChild(label);
          }
        }
        btnEditJson.addEventListener('click', () => {
          try {
            if (window.PPXJsonEditor && typeof window.PPXJsonEditor.open === 'function') {
              const payload = collectPayload();
              window.PPXJsonEditor.open({
                exerciseType: 'dnd',
                slug: payload.slug || '',
                title: payload.title_es || payload.title_en || payload.slug || '',
                level: payload.level || (selLevel ? selLevel.value : ''),
                initialData: payload,
                validate: (obj) => validatePayload(obj),
                apply: (obj) => {
                  // Reapply core fields
                  inputTitleEs.value = obj.title_es || '';
                  inputTitleEn.value = obj.title_en || '';
                  taInstEs.value = obj.instructions_es || '';
                  taInstEn.value = obj.instructions_en || '';
                  selLevel.value = obj.level || selLevel.value;
                  try { inputTx.value = JSON.stringify(obj.taxonomy_paths || []); } catch(_) {}
                  // Reset columns/tokens
                  colWrap.innerHTML = '';
                  tokWrap.innerHTML = '';
                  const item = (Array.isArray(obj.items) && obj.items[0]) || null;
                  if (item) {
                    (Array.isArray(item.columns) ? item.columns : []).forEach(c => addColumn(c));
                    (Array.isArray(item.tokens) ? item.tokens : []).forEach(tok => addToken(tok));
                  }
                }
              });
            } else {
              openJsonEditor();
            }
          } catch (e) {
            console.error(e);
            try { openJsonEditor(); } catch(_){}
          }
        });
      } catch(_){}
    })();

    // Seed a minimal setup for new exercises
    if (mode === 'new') {
      addColumn({ label_es: t('Categoría A', 'Category A'), label_en: 'Category A' });
      addColumn({ label_es: t('Categoría B', 'Category B'), label_en: 'Category B' });
      addToken({ text_es: t('ejemplo', 'example'), text_en: 'example' });
    }

    // Load existing for edit
    (async function loadEdit(){
      if (mode !== 'edit' || !editSlug) return;
      try {
        const res = await fetch(`/admin/api/exercises/dnd/${encodeURIComponent(editSlug)}`, { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || typeof data !== 'object') return;
        inputTitleEs.value = data.title_es || '';
        inputTitleEn.value = data.title_en || '';
        taInstEs.value = data.instructions_es || '';
        taInstEn.value = data.instructions_en || '';
        selLevel.value = data.level || selLevel.value;
        try { inputTx.value = JSON.stringify(data.taxonomy_paths || []); } catch(_) {}
        const item = (Array.isArray(data.items) && data.items[0]) || null;
        if (item) {
          (Array.isArray(item.columns) ? item.columns : []).forEach(c => addColumn(c));
          (Array.isArray(item.tokens) ? item.tokens : []).forEach(tok => addToken(tok));
        }
        try { inputMediaUrl.value = (data.media && data.media.image_url) || ''; } catch(_) {}
      } catch (_) {}
    })();
  });
})();
