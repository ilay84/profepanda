/* static/js/admin_builder_mcq.js */
(function () {
  const D = document;
  function ready(fn){ if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }
  function t(es, en){
    const lang = (window.PPX_I18N && window.PPX_I18N.currentLang) || D.documentElement.getAttribute('lang') || 'es';
    return lang.startsWith('en') ? (en ?? es) : (es ?? en);
  }

  ready(() => {
    const form = D.getElementById('ppx-mcq-form');
    if (!form) return;

    const itemsWrap = D.getElementById('ppx-items');
    const itemTpl = D.getElementById('ppx-item-template');
    const optTpl = D.getElementById('ppx-option-template');

    const btnAddItem = D.getElementById('ppx-add-item');
    const btnSave = D.getElementById('ppx-save-draft');
    const btnPreview = D.getElementById('ppx-preview');
    const btnExport = D.getElementById('ppx-export-json');
    // If template provides a JSON edit button in footer, wire it
    try { const btnJson = D.getElementById('ppx-edit-json'); if (btnJson) btnJson.addEventListener('click', openJsonEditor); } catch(_){}
    const btnPublish = D.getElementById('ppx-publish');

    const inputSlug = D.getElementById('ex-slug');
    const inputTitleEs = D.getElementById('ex-title-es');
    const inputTitleEn = D.getElementById('ex-title-en');
    const taInstEs = D.getElementById('ex-inst-es');
    const taInstEn = D.getElementById('ex-inst-en');
    const selLevel = D.getElementById('ex-level');
    const inputTx = D.querySelector('.ppx-taxonomy input[type=hidden]');

    const appLang = (window.PPX_I18N && window.PPX_I18N.currentLang) || (D.documentElement.getAttribute('lang') || 'es');

    // Prefill slug from URL for edit
    if (inputSlug && !inputSlug.value) {
      const m = location.pathname.match(/\/admin\/exercises\/mcq\/([^\/]+)\/edit/);
      if (m && m[1]) inputSlug.value = decodeURIComponent(m[1]);
    }

    // Media panel builder (per-item) - styled like TF builder
    // Stores media on the item's <details> node as `._media` and persists in JSON.
    function buildMediaPanel(slug, containerNode){
      // Lightbox helper (simple overlay)
      function openLightbox(child){
        const ov = D.createElement('div');
        ov.style.position='fixed'; ov.style.inset='0'; ov.style.background='rgba(0,0,0,.65)';
        ov.style.zIndex='2000'; ov.style.display='flex'; ov.style.alignItems='center'; ov.style.justifyContent='center';
        const close = () => ov.remove(); ov.addEventListener('click', (e)=>{ if(e.target===ov) close(); });
        const x = D.createElement('button'); x.textContent='×'; x.className='ppx-btn'; x.style.position='fixed'; x.style.top='16px'; x.style.right='16px'; x.addEventListener('click', close);
        const box = D.createElement('div'); box.style.maxWidth='90vw'; box.style.maxHeight='85vh'; box.style.background='#fff'; box.style.borderRadius='12px'; box.style.overflow='hidden';
        box.appendChild(child); ov.appendChild(box); ov.appendChild(x); D.body.appendChild(ov);
      }

      function providerEmbed(u){
        try{
          const url = new URL(u); const h = url.hostname.toLowerCase();
          if (h.includes('youtube.com')){ const id = url.searchParams.get('v') || url.pathname.split('/').pop(); if (id) return {provider:'youtube', embed:`https://www.youtube.com/embed/${id}`}; }
          if (h==='youtu.be'){ const id = url.pathname.replace(/^\/+/, ''); if (id) return {provider:'youtube', embed:`https://www.youtube.com/embed/${id}`}; }
          if (h.includes('vimeo.com')){ const id = (url.pathname.replace(/^\/+/, '').split('/')[0]||'').trim(); if (/^\d+$/.test(id)) return {provider:'vimeo', embed:`https://player.vimeo.com/video/${id}`}; }
        }catch(_){}
        return null;
      }

      const acc = D.createElement('details');
      acc.className = 'ppx-card ppx-media-acc';
      // Match TF builder container styling
      acc.style.width = '100%';
      acc.style.maxWidth = '100%';
      acc.style.boxSizing = 'border-box';
      acc.style.margin = '8px 0';
      acc.style.border = '1px solid var(--ppx-color-line,#e5e7eb)';
      acc.style.borderRadius = '12px';
      acc.style.background = '#fff';
      acc.style.overflow = 'hidden';

      const sum = D.createElement('summary');
      // Match TF summary row spacing/weight
      sum.style.listStyle = 'none';
      sum.style.cursor = 'pointer';
      sum.style.padding = '.6rem .8rem';
      sum.style.paddingLeft = '2rem';
      sum.style.display = 'flex';
      sum.style.alignItems = 'center';
      sum.style.gap = '.5rem';
      sum.style.userSelect = 'none';
      sum.style.fontWeight = '600';
      sum.textContent = t('Cargar multimedia', 'Upload media');
      acc.appendChild(sum);

      const body = D.createElement('div');
      // Match TF body padding
      body.style.padding = '.75rem .8rem .9rem';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.gap = '.6rem';

      // Row: Upload file
      const rowUpload = D.createElement('div'); rowUpload.style.display='flex'; rowUpload.style.gap='.5rem';
      const btnUpload = D.createElement('button'); btnUpload.type='button'; btnUpload.className='ppx-btn'; btnUpload.textContent=t('Subir archivo', 'Upload file');
      const inputFile = D.createElement('input'); inputFile.type='file'; inputFile.accept='image/*,audio/*,video/*'; inputFile.multiple=true; inputFile.style.display='none';
      rowUpload.appendChild(btnUpload); rowUpload.appendChild(inputFile);
      body.appendChild(rowUpload);

      // Row: External URL
      const rowURL = D.createElement('div'); rowURL.style.display='flex'; rowURL.style.gap='.5rem';
      const urlInput = D.createElement('input'); urlInput.className='ppx-input'; urlInput.placeholder = t('Pegar URL (YouTube, Vimeo, imagen, etc.)', 'Paste URL (YouTube, Vimeo, image, etc.)'); urlInput.style.flex='1';
      const btnAddURL = D.createElement('button'); btnAddURL.type='button'; btnAddURL.className='ppx-btn'; btnAddURL.textContent=t('Agregar URL', 'Add URL');
      rowURL.appendChild(urlInput); rowURL.appendChild(btnAddURL);
      body.appendChild(rowURL);

      // List
      const list = D.createElement('div'); list.style.display='flex'; list.style.flexDirection='column'; list.style.gap='.5rem'; body.appendChild(list);
      // Expose list so callers can rehydrate from JSON
      acc._listEl = list;

      // Ensure per-item media storage exists
      const getItemNode = () => (containerNode || acc.closest('details'));
      const ensureStore = () => {
        const node = getItemNode();
        if (node && !Array.isArray(node._media)) node._media = [];
        return node;
      };
      // Simple id helper
      const makeId = (pfx) => `${pfx}-${Math.random().toString(36).slice(2, 8)}`;

      function makeMediaRow(kind, url, id){
        const row = D.createElement('div'); row.className='ppx-card'; row.style.padding='.6rem';
        if (id) row.setAttribute('data-media-id', id);
        const head = D.createElement('div'); head.style.display='flex'; head.style.gap='.5rem'; head.style.alignItems='center'; head.style.justifyContent='space-between';
        const meta = D.createElement('div'); meta.className='ppx-row'; meta.style.gap='.5rem';
        const chip = D.createElement('span'); chip.className='ppx-chip'; chip.textContent = kind.toUpperCase(); meta.appendChild(chip);
        const link = D.createElement('a'); link.href=url; link.target='_blank'; link.rel='noopener'; link.textContent=t('Abrir', 'Open'); link.className='ppx-btn ppx-btn--ghost';
        const btnRemove = D.createElement('button'); btnRemove.type='button'; btnRemove.className='ppx-btn ppx-btn--danger'; btnRemove.textContent=t('Quitar', 'Remove');
        head.appendChild(meta);
        const right = D.createElement('div'); right.className='ppx-row'; right.style.gap='.5rem'; right.appendChild(link); right.appendChild(btnRemove); head.appendChild(right);
        row.appendChild(head);

        const prev = D.createElement('div'); prev.style.marginTop='.5rem';
        if (kind==='image'){
          const img = D.createElement('img'); img.src=url; img.style.maxWidth='320px'; img.style.height='auto'; img.style.cursor='zoom-in';
          img.addEventListener('click', ()=>{ const big = D.createElement('img'); big.src=url; big.style.maxWidth='90vw'; big.style.maxHeight='85vh'; openLightbox(big); });
          prev.appendChild(img);
        } else if (kind==='audio'){
          const audio = D.createElement('audio'); audio.controls=true; audio.src=url; audio.style.width='100%'; prev.appendChild(audio);
        } else {
          const emb = providerEmbed(url);
          if (emb){ const iframe = D.createElement('iframe'); iframe.src = emb.embed; iframe.width='560'; iframe.height='315'; iframe.allowFullscreen=true; iframe.style.width='100%'; prev.appendChild(iframe); }
          else { const video = D.createElement('video'); video.controls=true; video.src=url; video.style.width='100%'; prev.appendChild(video); }
        }
        row.appendChild(prev);

        btnRemove.addEventListener('click', ()=> {
          // Remove from UI and backing store
          const node = ensureStore();
          const mediaId = row.getAttribute('data-media-id');
          row.remove();
          if (node && mediaId) {
            node._media = (node._media || []).filter(m => m.id !== mediaId);
          }
        });
        return row;
      }
      // Expose row factory for rehydration
      acc._makeRow = makeMediaRow;

      btnUpload.addEventListener('click', () => inputFile.click());
      inputFile.addEventListener('change', async () => {
        const files = Array.from(inputFile.files||[]);
        for (const f of files){
          const kind = f.type.startsWith('image/') ? 'image' : (f.type.startsWith('audio/') ? 'audio' : 'video');
          const form = new FormData(); form.append('file', f);
          const url = `/admin/api/exercises/mcq/${encodeURIComponent(slug)}/upload?kind=${encodeURIComponent(kind)}`;
          try{
            const res = await fetch(url, { method:'POST', body: form, credentials:'same-origin' });
            const j = await res.json(); if(!res.ok || !j.ok) throw new Error(j.error||('HTTP '+res.status));
            const media = j.data||{};
            const node = ensureStore();
            const id = makeId(kind === 'image' ? 'img' : (kind === 'audio' ? 'aud' : 'vid'));
            if (node) {
              node._media.push({ id, kind: (media.kind||kind), src: media.url, thumb: null, alt_es: '', alt_en: '', transcript_es: '', transcript_en: '' });
            }
            list.appendChild(makeMediaRow(media.kind||kind, media.url, id));
          }catch(e){ console.error(e); alert(t('No se pudo subir el archivo.', 'Failed to upload file.')); }
        }
        inputFile.value='';
      });

      btnAddURL.addEventListener('click', () => {
        const raw = (urlInput.value||'').trim(); if(!raw) return;
        let kind='video';
        if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(raw)) kind='image';
        if (/\.(mp3|wav|ogg)(\?|$)/i.test(raw)) kind='audio';
        const node = ensureStore();
        const id = makeId(kind === 'image' ? 'img' : (kind === 'audio' ? 'aud' : 'vid'));
        if (node) {
          node._media.push({ id, kind, src: raw, thumb: null, alt_es: '', alt_en: '', transcript_es: '', transcript_en: '' });
        }
        list.appendChild(makeMediaRow(kind, raw, id));
        urlInput.value='';
      });

      body.appendChild(list);
      acc.appendChild(body);
      return acc;
    }

    function makeOptionRow() {
      const frag = optTpl.content.cloneNode(true);
      const row = frag.firstElementChild;
      // Add reorder buttons if not present in template
      const headerRow = row.querySelector('.ppx-row');
      if (headerRow) {
        const btnUp = D.createElement('button');
        btnUp.type = 'button'; btnUp.className = 'ppx-btn ppx-btn--ghost'; btnUp.textContent = '▲'; btnUp.title = t('Subir', 'Move up');
        const btnDown = D.createElement('button');
        btnDown.type = 'button'; btnDown.className = 'ppx-btn ppx-btn--ghost'; btnDown.textContent = '▼'; btnDown.title = t('Bajar', 'Move down');
        // insert near delete button within its own container if present
        const delBtn = row.querySelector('[data-opt-del]');
        const rightRow = delBtn && delBtn.parentElement ? delBtn.parentElement : headerRow;
        if (delBtn) {
          rightRow.insertBefore(btnUp, delBtn);
          rightRow.insertBefore(btnDown, delBtn);
        } else {
          rightRow.appendChild(btnUp);
          rightRow.appendChild(btnDown);
        }
        btnUp.addEventListener('click', () => {
          const parent = row.parentElement;
          const prev = row.previousElementSibling;
          if (parent && prev) parent.insertBefore(row, prev);
        });
        btnDown.addEventListener('click', () => {
          const parent = row.parentElement;
          const next = row.nextElementSibling;
          if (parent && next) parent.insertBefore(next, row);
        });
      }
      const btnDel = row.querySelector('[data-opt-del]');
      btnDel && btnDel.addEventListener('click', () => row.remove());
      return row;
    }

    function makeItem() {
      const frag = itemTpl.content.cloneNode(true);
      const det = frag.querySelector('details');
      det.addEventListener('toggle', () => { if (!caret) return; caret.src = det.open ? '/static/assets/icons/chevron_down.svg' : '/static/assets/icons/chevron_right.svg'; });

      const sumTitle = det.querySelector('.ppx-item-title');
      const qEs = det.querySelector('[data-field="question_es"]');
      const qEn = det.querySelector('[data-field="question_en"]');
      const updateTitle = () => {
        const txt = (appLang.startsWith('en') ? (qEn.value || qEs.value) : (qEs.value || qEn.value)) || t('Nuevo ítem', 'New item');
        sumTitle.textContent = txt.length > 80 ? txt.slice(0, 77) + '…' : txt;
      };
      qEs.addEventListener('input', updateTitle);
      qEn.addEventListener('input', updateTitle);

      const addOpt = det.querySelector('[data-add-opt]');
      const optsList = det.querySelector('[data-opts-list]');
      addOpt.addEventListener('click', () => { optsList.appendChild(makeOptionRow()); });
      // Seed two options
      optsList.appendChild(makeOptionRow());
      optsList.appendChild(makeOptionRow());

      const btnUp = det.querySelector('[data-item-up]');
      const btnDown = det.querySelector('[data-item-down]');
      const btnDup = det.querySelector('[data-item-dup]');
      const btnDel = det.querySelector('[data-item-del]');
      btnUp && btnUp.addEventListener('click', () => { const prev = det.previousElementSibling; if (prev) det.parentNode.insertBefore(det, prev); updateSummaries(); });
      btnDown && btnDown.addEventListener('click', () => { const next = det.nextElementSibling; if (next) det.parentNode.insertBefore(next, det); updateSummaries(); });
      btnDel && btnDel.addEventListener('click', () => { det.remove(); updateSummaries(); });
      btnDup && btnDup.addEventListener('click', () => { const clone = det.cloneNode(true); det.parentNode.insertBefore(clone, det.nextElementSibling); updateSummaries(); });

      // Media panel (per item)
      const slug = (inputSlug.value||'').trim() || 'untitled';
      try { det.querySelector('.ppx-col').prepend(buildMediaPanel(slug, det)); } catch(_){}

      return det;
    }

    function addItem() {
      if (!itemsWrap || !itemTpl) return;
      try { itemsWrap.appendChild(makeItem()); updateSummaries(); }
      catch (err) { console.error('[MCQ] add item failed', err); }
    }

    // Direct binding and seed first item on empty
    if (btnAddItem) {
      btnAddItem.addEventListener('click', (e) => { e.preventDefault(); addItem(); });
      try { console.debug('[MCQ] add-item bound'); } catch (_) {}
    }
    // Only check for direct child items; ignore nested <details> (e.g., media panel)
    try { if (itemsWrap && !itemsWrap.querySelector(':scope > details')) addItem(); } catch (_) {}

    // Delegated click fallback for Add item
    document.addEventListener('click', (e) => {
      const trigger = e.target && e.target.closest('#ppx-add-item,[data-add-item]');
      if (!trigger) return;
      e.preventDefault();
      addItem();
    });

    function readTaxonomy(){ try { return JSON.parse(inputTx?.value || '[]'); } catch { return []; } }

    function assembleJSON(status) {
      // Only consider top-level item <details> under #ppx-items
      const items = Array.from(itemsWrap.querySelectorAll(':scope > details')).map((det, i) => {
        const getVal = (sel) => (det.querySelector(sel)?.value || '').trim();
        const question_es = getVal('[data-field="question_es"]');
        const question_en = getVal('[data-field="question_en"]');
        const hint_es = getVal('[data-field="hint_es"]');
        const hint_en = getVal('[data-field="hint_en"]');
        const opts = Array.from(det.querySelectorAll('[data-opts-list] > .ppx-card')).map((row) => ({
          text_es: (row.querySelector('[data-opt-text-es]')?.value || '').trim(),
          text_en: (row.querySelector('[data-opt-text-en]')?.value || '').trim(),
          fb_es: (row.querySelector('[data-opt-fb-es]')?.value || '').trim(),
          fb_en: (row.querySelector('[data-opt-fb-en]')?.value || '').trim(),
          correct: !!row.querySelector('[data-opt-correct]')?.checked
        }));
        const options_es = opts.map(o => ({ text: o.text_es, correct: o.correct, feedback: o.fb_es }));
        const options_en = opts.map(o => ({ text: o.text_en, correct: o.correct, feedback: o.fb_en }));
        const media = Array.isArray(det._media) ? det._media.map(m => ({
          id: m.id,
          kind: (m.kind === 'audio' || m.kind === 'video') ? m.kind : 'image',
          src: m.src,
          thumb: m.thumb || null,
          alt_es: m.alt_es || '',
          alt_en: m.alt_en || '',
          transcript_es: m.transcript_es || '',
          transcript_en: m.transcript_en || ''
        })) : [];
        return { id: `q${i+1}`, order: i+1, question_es, question_en, hint_es, hint_en, options_es, options_en, media };
      });
      return {
        type: 'mcq',
        slug: (inputSlug.value || '').trim().toLowerCase(),
        title_es: (inputTitleEs.value || '').trim(),
        title_en: (inputTitleEn.value || '').trim(),
        instructions_es: (taInstEs.value || '').trim(),
        instructions_en: (taInstEn.value || '').trim(),
        level: selLevel.value || 'A2',
        status: status || 'draft',
        taxonomy_paths: readTaxonomy(),
        items
      };
    }

    function validatePayload(p){
      const errs = [];
      if (!p.slug) errs.push(t('Falta el slug.', 'Slug is required.'));
      if (!p.title_es && !p.title_en) errs.push(t('Falta el título.', 'Title is required.'));
      if (!(p.instructions_es || p.instructions_en)) errs.push(t('Faltan instrucciones ES/EN.', 'Instructions ES/EN required.'));
      if (!Array.isArray(p.items) || p.items.length === 0) errs.push(t('Agregá al menos un ítem.', 'Add at least one item.'));
      p.items.forEach((it, i) => {
        if (!it.question_es && !it.question_en) errs.push(t(`Item #${i+1}: falta la pregunta.`, `Item #${i+1}: question required.`));
        const opts = (it.options_es || it.options_en || []);
        if (!opts.length) errs.push(t(`Item #${i+1}: agregá opciones.`, `Item #${i+1}: add options.`));
        const anyCorrect = (it.options_es || []).some(o => o && o.correct) || (it.options_en || []).some(o => o && o.correct);
        if (!anyCorrect) errs.push(t(`Item #${i+1}: marcá al menos una opción correcta.`, `Item #${i+1}: mark at least one correct option.`));
      });
      return errs;
    }

    function toast(msg){
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.position = 'fixed'; el.style.bottom = '12px'; el.style.left = '50%'; el.style.transform = 'translateX(-50%)';
      el.style.background = '#0f172a'; el.style.color = '#fff'; el.style.padding = '8px 12px'; el.style.borderRadius = '10px'; el.style.zIndex = '2000'; el.style.boxShadow = '0 6px 18px rgba(0,0,0,.25)';
      document.body.appendChild(el); setTimeout(() => el.remove(), 1400);
    }

    // Save Draft
    btnSave && btnSave.addEventListener('click', async () => {
      const payload = assembleJSON('draft');
      const errs = validatePayload(payload);
      if (errs.length) { alert(errs.join('\n')); return; }
      const mode = (form.getAttribute('data-builder-mode') || '').toLowerCase();
      const isEdit = mode === 'edit' && payload.slug;
      const url = isEdit ? `/admin/api/exercises/${encodeURIComponent('mcq')}/${encodeURIComponent(payload.slug)}` : `/admin/api/exercises`;
      const method = isEdit ? 'PUT' : 'POST';
      try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
        if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `HTTP ${res.status}`); }
        const j = await res.json(); const saved = j.data || {};
        toast(t(`Borrador guardado (v${saved.version || '?'})`, `Draft saved (v${saved.version || '?'})`));
        if (btnPublish) btnPublish.disabled = false;
      } catch (e) {
        console.error(e); alert(t('Error al guardar el borrador.', 'Failed to save draft.'));
      }
    });

    // Export JSON
    btnExport && btnExport.addEventListener('click', () => {
      const payload = assembleJSON('draft');
      const errs = validatePayload(payload);
      if (errs.length) { alert(errs.join('\n')); return; }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${payload.slug || 'exercise'}.mcq.json`; a.click(); URL.revokeObjectURL(a.href);
    });

    // Preview
    btnPreview && btnPreview.addEventListener('click', () => {
      const payload = assembleJSON('draft');
      const errs = validatePayload(payload);
      if (errs.length) { alert(errs.join('\n')); return; }
      const url = `/admin/api/exercises/mcq/${encodeURIComponent(payload.slug)}`;
      const originalFetch = window.fetch; let armed = true;
      window.fetch = async function (input, init) {
        try {
          const reqUrl = (typeof input === 'string') ? input : input.url;
          const wantsSpecificVersion = reqUrl && reqUrl.startsWith(url);
          if (armed && wantsSpecificVersion) { return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
          return originalFetch.apply(this, arguments);
        } catch (e) { return originalFetch.apply(this, arguments); }
      };
      const onClose = () => { armed = false; window.fetch = originalFetch; window.removeEventListener('ppx:modal:close', onClose); };
      window.addEventListener('ppx:modal:close', onClose);
      try { window.PPX.openExercise({ type: 'mcq', slug: payload.slug, lang: appLang, context: { source: 'admin-preview' } }); }
      catch (e) { onClose(); console.error(e); alert(t('No se pudo abrir la vista previa.', 'Failed to open preview.')); }
    });

    // Publish
    if (btnPublish) {
      btnPublish.addEventListener('click', async () => {
        const payload = assembleJSON('draft');
        const errs = validatePayload(payload);
        if (errs.length) { alert(errs.join('\n')); return; }
        try {
          const res1 = await fetch('/admin/api/exercises', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
          if (!res1.ok) { const j = await res1.json().catch(() => ({})); throw new Error(j.error || `HTTP ${res1.status}`); }
          const pubURL = `/admin/api/exercises/mcq/${encodeURIComponent(payload.slug)}/publish`;
          const res2 = await fetch(pubURL, { method: 'POST', credentials: 'same-origin' });
          if (!res2.ok) { const j = await res2.json().catch(() => ({})); throw new Error(j.error || `HTTP ${res2.status}`); }
          const j2 = await res2.json(); const saved = j2.data || {};
          toast(t(`Publicado (v${saved.version || '?'})`, `Published (v${saved.version || '?'})`));
        } catch (e) { console.error(e); alert(t('No se pudo publicar el ejercicio.', 'Failed to publish exercise.')); }
      });
    }

    // Autosave
    let dirty = false; form.addEventListener('input', () => { dirty = true; });
    setInterval(() => {
      if (!dirty) return;
      try {
        const payload = assembleJSON('draft');
        const errs = validatePayload(payload);
        if (!errs.length && payload.slug) { const key = `ppx:ex:mcq:${payload.slug}`; localStorage.setItem(key, JSON.stringify(payload)); dirty = false; }
      } catch (_) {}
    }, 10000);

    // EDIT mode prefill
    const BUILDER = window.PPX_BUILDER || {};
    if (BUILDER.mode === 'edit' && BUILDER.slug) { prefillFromSlug(BUILDER.slug); }
    async function prefillFromSlug(slug){
      try {
        const res = await fetch(`/admin/api/exercises/mcq/${encodeURIComponent(slug)}`, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json(); const data = raw && raw.data ? raw.data : raw;
        applyJsonToBuilder(data, { silent: true }); dirty = false; toast(t('Ejercicio cargado para edición.', 'Exercise loaded for edit.'));
      } catch (e) { console.error(e); alert(t('No se pudo cargar el ejercicio para editar.', 'Failed to load exercise for edit.')); }
    }

    function applyJsonToBuilder(data){
      inputSlug.value = data.slug || '';
      inputTitleEs.value = data.title_es || '';
      inputTitleEn.value = data.title_en || '';
      taInstEs.value = data.instructions_es || '';
      taInstEn.value = data.instructions_en || '';
      selLevel.value = data.level || 'A2';
      try { inputTx && (inputTx.value = JSON.stringify(data.taxonomy_paths || [])); } catch {}
      itemsWrap.innerHTML = '';
      const items = Array.isArray(data.items) ? data.items.slice().sort((a,b)=> (a.order||0)-(b.order||0)) : [];
      items.forEach((it) => {
        const det = makeItem();
        det.querySelector('[data-field="question_es"]').value = it.question_es || '';
        det.querySelector('[data-field="question_en"]').value = it.question_en || '';
        det.querySelector('[data-field="hint_es"]').value = it.hint_es || '';
        det.querySelector('[data-field="hint_en"]').value = it.hint_en || '';
        const optsList = det.querySelector('[data-opts-list]'); optsList.innerHTML = '';
        const es = it.options_es || []; const en = it.options_en || [];
        const n = Math.max(es.length, en.length);
        for (let i=0;i<n;i++) {
          const row = makeOptionRow();
          const esOpt = es[i] || {}; const enOpt = en[i] || {};
          row.querySelector('[data-opt-correct]').checked = !!(esOpt.correct || enOpt.correct);
          row.querySelector('[data-opt-text-es]').value = esOpt.text || '';
          row.querySelector('[data-opt-text-en]').value = enOpt.text || '';
          row.querySelector('[data-opt-fb-es]').value = esOpt.feedback || '';
          row.querySelector('[data-opt-fb-en]').value = enOpt.feedback || '';
          optsList.appendChild(row);
        }
        // Rehydrate media
        try {
          const panel = det.querySelector('.ppx-media-acc');
          const list = panel && panel._listEl;
          det._media = Array.isArray(it.media) ? it.media.map(m => ({
            id: m.id || (m.kind === 'audio' ? `aud-${Math.random().toString(36).slice(2,8)}` : (m.kind === 'video' ? `vid-${Math.random().toString(36).slice(2,8)}` : `img-${Math.random().toString(36).slice(2,8)}`)),
            kind: (m.kind === 'audio' || m.kind === 'video') ? m.kind : 'image',
            src: m.src,
            thumb: m.thumb || null,
            alt_es: m.alt_es || '',
            alt_en: m.alt_en || '',
            transcript_es: m.transcript_es || '',
            transcript_en: m.transcript_en || ''
          })) : [];
          if (list && panel && typeof panel._makeRow === 'function') {
            list.innerHTML = '';
            det._media.forEach(m => list.appendChild(panel._makeRow(m.kind, m.src, m.id)));
          }
        } catch(_){}
        itemsWrap.appendChild(det);
      });
      updateSummaries();
    }

  function updateSummaries(){
      // Keep numbering based on direct children only
      const items = itemsWrap.querySelectorAll(':scope > details');
      items.forEach((det, i) => {
        const sum = det.querySelector('summary');
        if (sum) sum.setAttribute('data-index', String(i + 1));
        const handle = det.querySelector('[data-item-handle]'); if (handle) handle.textContent = '#' + String(i+1);
      });
  }
    
    // JSON Editor (modal) - same UX as TF builder
    let __mcq_lastJson = null;
    function mcqCreateJsonEditButton(){
      try {
        const btn = D.createElement('button');
        btn.type = 'button';
        btn.id = 'ppx-edit-json';
        btn.className = 'ppx-btn';
        btn.title = t('Editar JSON', 'Edit JSON');
        btn.setAttribute('aria-label', t('Editar JSON', 'Edit JSON'));
        btn.style.display = 'inline-flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '6px';
        btn.style.padding = '6px 10px';
        btn.style.borderRadius = '10px';

        const icon = D.createElement('img');
        icon.src = '/static/assets/icons/json.svg';
        icon.alt = '';
        icon.width = 18; icon.height = 18;
        const label = D.createElement('span');
        label.textContent = 'JSON';
        btn.appendChild(icon); btn.appendChild(label);

        if (btnExport && btnExport.parentNode) {
          btnExport.parentNode.insertBefore(btn, btnExport.nextSibling);
        } else if (form) {
          form.appendChild(btn);
        }
        btn.addEventListener('click', () => {
          try {
            if (window.PPXJsonEditor && typeof window.PPXJsonEditor.open === 'function') {
              const payload = assembleJSON('draft');
              window.PPXJsonEditor.open({
                exerciseType: 'mcq',
                slug: payload.slug || '',
                title: payload.title_es || payload.title_en || payload.slug || '',
                level: payload.level || (selLevel ? selLevel.value : ''),
                initialData: payload,
                validate: (obj) => validatePayload(obj),
                apply: (obj) => { applyJsonToBuilder(obj, { silent: true }); }
              });
            } else {
              mcqOpenJsonEditor();
            }
          } catch (e) {
            console.error(e);
            try { mcqOpenJsonEditor(); } catch(_){}
          }
        });
      } catch(_){}
    }

    function mcqOpenJsonEditor(){
      const payload = assembleJSON('draft');
      __mcq_lastJson = JSON.stringify(payload, null, 2);

      const ov = D.createElement('div');
      ov.style.position = 'fixed'; ov.style.inset = '0';
      ov.style.background = 'rgba(0,0,0,.55)'; ov.style.zIndex = '2500';
      ov.style.display = 'flex'; ov.style.alignItems = 'center'; ov.style.justifyContent = 'center';

      const modal = D.createElement('div');
      modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'ppx-json-title');
      modal.style.width = 'min(960px, 86vw)'; modal.style.maxWidth = '100%';
      modal.style.maxHeight = '90vh'; modal.style.display = 'flex'; modal.style.flexDirection = 'column';
      modal.style.background = '#fff'; modal.style.borderRadius = '14px'; modal.style.boxShadow = '0 14px 40px rgba(0,0,0,.35)'; modal.style.overflow = 'hidden';

      const header = D.createElement('div');
      header.style.display = 'flex'; header.style.alignItems = 'center'; header.style.justifyContent = 'space-between';
      header.style.padding = '.75rem 1rem'; header.style.borderBottom = '1px solid #e5e7eb';

      const h = D.createElement('h3'); h.id = 'ppx-json-title'; h.textContent = t('Editar como JSON', 'Edit as JSON'); h.style.margin = '0'; h.style.fontSize = '1rem';
      const closeX = D.createElement('button'); closeX.type = 'button'; closeX.textContent = 'x'; closeX.setAttribute('aria-label', t('Cerrar', 'Close')); closeX.className = 'ppx-btn ppx-btn--ghost'; closeX.style.borderRadius='999px'; closeX.style.padding='.25rem .5rem';
      header.appendChild(h); header.appendChild(closeX);

      const body = D.createElement('div'); body.style.padding = '.75rem 1rem'; body.style.display = 'flex'; body.style.flexDirection = 'column'; body.style.gap = '.5rem'; body.style.minHeight = '300px';
      const textarea = D.createElement('textarea');
      textarea.value = __mcq_lastJson; textarea.style.width='100%'; textarea.style.height='46vh'; textarea.style.boxSizing='border-box'; textarea.style.resize='vertical';
      textarea.style.fontFamily='ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'; textarea.style.fontSize='13px'; textarea.style.lineHeight='1.45';
      textarea.style.padding='.75rem'; textarea.style.border='1px solid #e5e7eb'; textarea.style.borderRadius='8px';
      const status = D.createElement('div'); status.setAttribute('aria-live','polite'); status.style.fontSize='.9rem'; status.style.color='#6b7280';

      const footer = D.createElement('div'); footer.style.display='flex'; footer.style.alignItems='center'; footer.style.justifyContent='space-between'; footer.style.gap='.5rem'; footer.style.padding='.75rem 1rem'; footer.style.borderTop='1px solid #e5e7eb'; footer.style.background='#f8fafc';
      const left = D.createElement('div'); left.style.display='flex'; left.style.alignItems='center'; left.style.gap='.5rem';
      const btnValidate = D.createElement('button'); btnValidate.type='button'; btnValidate.className='ppx-btn ppx-btn--subtle'; btnValidate.textContent = t('Validar', 'Validate');
      const btnApply = D.createElement('button'); btnApply.type='button'; btnApply.className='ppx-btn'; btnApply.textContent = t('Aplicar', 'Apply');
      const btnCancel = D.createElement('button'); btnCancel.type='button'; btnCancel.className='ppx-btn ppx-btn--ghost'; btnCancel.textContent = t('Cancelar', 'Cancel');
      left.appendChild(btnValidate);
      const right = D.createElement('div'); right.style.display='flex'; right.style.gap='.5rem'; right.appendChild(btnCancel); right.appendChild(btnApply);
      footer.appendChild(left); footer.appendChild(right);

      body.appendChild(textarea); body.appendChild(status);
      modal.appendChild(header); modal.appendChild(body); modal.appendChild(footer);
      ov.appendChild(modal); D.body.appendChild(ov);

      function close(){ try { D.body.removeChild(ov); } catch(_){} }
      ov.addEventListener('click', (e)=>{ if (e.target === ov) close(); });
      D.addEventListener('keydown', function esc(e){ if (e.key === 'Escape'){ close(); D.removeEventListener('keydown', esc); } });
      closeX.addEventListener('click', close); btnCancel.addEventListener('click', close);

      function validateText(src){
        try{
          const obj = JSON.parse(src);
          const errs = validatePayload(obj);
          if (errs.length){ status.style.color = '#b45309'; status.textContent = errs.join(' • '); return false; }
          status.style.color = '#059669'; status.textContent = t('JSON valido.', 'Valid JSON.');
          __mcq_lastJson = JSON.stringify(obj, null, 2);
          return true;
        } catch(e){ status.style.color = '#b91c1c'; status.textContent = t('JSON invalido: ', 'Invalid JSON: ') + (e && e.message ? e.message : ''); return false; }
      }
      btnValidate.addEventListener('click', ()=> validateText(textarea.value));
      textarea.addEventListener('input', ()=>{ status.textContent=''; });
      btnApply.addEventListener('click', () => {
        try {
          const obj = JSON.parse(textarea.value);
          const errs = validatePayload(obj);
          if (errs.length){ alert(errs.join('\n')); return; }
          applyJsonToBuilder(obj, { silent: true });
          try { const key = `ppx:ex:mcq:${obj.slug||''}`; if (obj.slug) localStorage.setItem(key, JSON.stringify(obj)); } catch(_){ }
          close();
        } catch(e){ alert(t('JSON invalido.', 'Invalid JSON.')); }
      });
    }

    // Place the JSON edit button next to Export
    mcqCreateJsonEditButton();
  });
})();


