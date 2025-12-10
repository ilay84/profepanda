/* static/js/admin_builder_ctw.js */
(function () {
  const D = document;

  function ready(fn){ if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(() => {
    const form = D.getElementById('ppx-ctw-form');
    if (!form) return;

    const itemsWrap = D.getElementById('ppx-items');
    const tpl = D.getElementById('ppx-item-template');

    const btnAdd = D.getElementById('ppx-add-item');
    const btnSave = D.getElementById('ppx-save-draft');
    const btnPreview = D.getElementById('ppx-preview');
    const btnExport = D.getElementById('ppx-export-json');
    const btnPublish = D.getElementById('ppx-publish');
    const selStatus = D.getElementById('ex-status');

    const inputSlug = D.getElementById('ex-slug');
    const inputTitleEs = D.getElementById('ex-title-es');
    const inputTitleEn = D.getElementById('ex-title-en');
    const taInstEs = D.getElementById('ex-inst-es');
    const taInstEn = D.getElementById('ex-inst-en');
    const selLevel = D.getElementById('ex-level');
    const inputTx = D.querySelector('.ppx-taxonomy input[type=hidden]');

    const appLang = (window.PPX_I18N && window.PPX_I18N.currentLang) || (D.documentElement.getAttribute('lang') || 'es');
    const t = (es, en) => (appLang.startsWith('en') ? (en ?? es) : (es ?? en));
    const isEdit = (window.PPX_BUILDER && window.PPX_BUILDER.mode === 'edit');

    function toast(msg){
      const el = D.createElement('div');
      el.textContent = msg;
      el.style.position = 'fixed';
      el.style.bottom = '12px';
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      el.style.background = '#0f172a';
      el.style.color = '#fff';
      el.style.padding = '8px 12px';
      el.style.borderRadius = '10px';
      el.style.zIndex = '2000';
      el.style.boxShadow = '0 6px 18px rgba(0,0,0,.25)';
      D.body.appendChild(el);
      setTimeout(() => el.remove(), 1400);
    }

    function slugify(str){
      return String(str || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    }

    function autoSetSlug(){
      if (isEdit) return; // keep existing slug on edit
      const current = (inputSlug.value || '').trim();
      const title = (inputTitleEs.value || inputTitleEn.value || '').trim();
      if (!title) return;
      const next = slugify(title);
      if (!current || current === slugify(inputTitleEs.dataset.prev || '') || current === slugify(inputTitleEn.dataset.prev || '')){
        inputSlug.value = next;
      }
      inputTitleEs.dataset.prev = inputTitleEs.value;
      inputTitleEn.dataset.prev = inputTitleEn.value;
    }

    if (inputSlug) inputSlug.readOnly = true;
    inputTitleEs?.addEventListener('input', autoSetSlug);
    inputTitleEn?.addEventListener('input', autoSetSlug);

    function ensureSlugOrAlert(){
      autoSetSlug();
      const slug = (inputSlug.value || '').trim().toLowerCase();
      if (!slug){
        alert(t('Completa un título para generar el slug.', 'Add a title to generate the slug.'));
        return null;
      }
      return slug;
    }

    function makeId(prefix='itm'){
      return `${prefix}_${Math.random().toString(36).slice(2,7)}_${Date.now().toString(36)}`;
    }

    function tokensFromSentence(src){
      // Treat any span between asterisks as one clickable token (spaces allowed).
      // Slashes at start/end inside the asterisks mark it as correct.
      if (!src) return [];
      const tokens = [];
      const re = /\*([^*]+?)\*/g;
      let m;
      while ((m = re.exec(src))) {
        let raw = (m[1] || '').trim();
        if (!raw) continue;
        let correct = false;
        if (raw.startsWith('/')) { correct = true; raw = raw.slice(1); }
        if (raw.endsWith('/')) { correct = true; raw = raw.slice(0, -1); }
        raw = raw.replace(/^\/+|\/+$/g, '').trim();
        if (raw) tokens.push({ text: raw, correct });
      }
      return tokens;
    }

    function previewTokens(previewEl, tokens, label){
      previewEl.innerHTML = '';
      const title = D.createElement('div');
      title.className = 'ppx-muted';
      title.textContent = label;
      previewEl.appendChild(title);
      const row = D.createElement('div');
      row.style.display = 'flex';
      row.style.flexWrap = 'wrap';
      row.style.gap = '6px';
      if (!tokens.length){
        const muted = D.createElement('span');
        muted.className = 'ppx-muted';
        muted.textContent = t('Sin palabras clickeables.', 'No clickable words.');
        row.appendChild(muted);
      }
      tokens.forEach(tok => {
        const chip = D.createElement('span');
        chip.className = 'ppx-chip';
        chip.textContent = tok.text;
        if (tok.correct) chip.classList.add('ppx-chip--ok');
        row.appendChild(chip);
      });
      previewEl.appendChild(row);
    }

    function attachPreview(node){
      const prev = node.querySelector('[data-preview]');
      const sentence = node.querySelector('[data-field="sentence"]');
      const render = () => {
        const toks = tokensFromSentence(sentence.value);
        prev.innerHTML = '';
        previewTokens(prev, toks, t('Vista previa', 'Preview'));
      };
      sentence.addEventListener('input', render);
      render();
    }

    function addMediaSection(node){
      node._media = node._media || [];
      const host = node.querySelector('.ppx-col') || node;
      const wrap = D.createElement('details');
      wrap.open = false;
      wrap.className = 'ppx-card';
      wrap.style.marginTop = '4px';
      wrap.style.border = '1px solid var(--ppx-line,#e5e7eb)';
      wrap.style.borderRadius = '12px';
      const sum = D.createElement('summary');
      sum.style.cursor = 'pointer';
      sum.style.listStyle = 'none';
      sum.style.padding = '12px 14px';
      sum.style.display = 'flex';
      sum.style.alignItems = 'center';
      sum.style.gap = '10px';
      sum.style.fontWeight = '600';

      const caret = D.createElement('span');
      caret.textContent = '▸';
      caret.style.display = 'inline-block';
      caret.style.transform = wrap.open ? 'rotate(90deg)' : 'rotate(0deg)';
      caret.style.transition = 'transform .15s ease';
      caret.style.marginRight = '4px';

      const title = D.createElement('span');
      title.textContent = t('Multimedia', 'Media');

      sum.appendChild(caret);
      sum.appendChild(title);
      wrap.appendChild(sum);

      const body = D.createElement('div');
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.gap = '8px';
      body.style.marginTop = '8px';

      // Upload
      const rowUpload = D.createElement('div');
      rowUpload.className = 'ppx-row';
      rowUpload.style.gap = '8px';
      const btnUp = D.createElement('button');
      btnUp.type = 'button';
      btnUp.className = 'ppx-btn';
      btnUp.textContent = t('Subir archivo', 'Upload file');
      const inpFile = D.createElement('input');
      inpFile.type = 'file';
      inpFile.accept = 'image/*,audio/*,video/*';
      inpFile.style.display = 'none';
      btnUp.addEventListener('click', () => inpFile.click());
      inpFile.addEventListener('change', async () => {
        const f = inpFile.files && inpFile.files[0];
        if (!f) return;
        const slug = ensureSlugOrAlert();
        if (!slug) return;
        let kind = 'image';
        if (f.type.startsWith('audio/')) kind = 'audio';
        if (f.type.startsWith('video/')) kind = 'video';
        const fd = new FormData();
        fd.append('file', f);
        try {
          const res = await fetch(`/admin/api/exercises/ctw/${encodeURIComponent(slug)}/upload?kind=${kind}`, {
            method: 'POST',
            body: fd,
            credentials: 'same-origin'
          });
          const j = await res.json();
          if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
          node._media.push({
            id: makeId(kind),
            kind,
            src: j.data.url,
            thumb: j.data.url,
            alt_es: '',
            alt_en: '',
            transcript_es: '',
            transcript_en: ''
          });
          renderList();
          toast(t('Multimedia subida.', 'Media uploaded.'));
        } catch (e) {
          console.error(e);
          alert(t('No se pudo subir el archivo.', 'Could not upload file.'));
        } finally {
          inpFile.value = '';
        }
      });
      rowUpload.appendChild(btnUp);
      rowUpload.appendChild(inpFile);
      body.appendChild(rowUpload);

      // External URL
      const rowURL = D.createElement('div');
      rowURL.style.display = 'flex';
      rowURL.style.gap = '8px';
      rowURL.style.flexWrap = 'wrap';
      const selKind = D.createElement('select');
      selKind.className = 'ppx-select';
      ['image','audio','video'].forEach(k => {
        const opt = D.createElement('option');
        opt.value = k; opt.textContent = k;
        selKind.appendChild(opt);
      });
      const inpUrl = D.createElement('input');
      inpUrl.className = 'ppx-input';
      inpUrl.placeholder = 'https://...';
      inpUrl.style.flex = '1 1 260px';
      const btnAddUrl = D.createElement('button');
      btnAddUrl.type = 'button';
      btnAddUrl.className = 'ppx-btn';
      btnAddUrl.textContent = t('Agregar URL', 'Add URL');
      btnAddUrl.addEventListener('click', async () => {
        const url = (inpUrl.value || '').trim();
        if (!url) return;
        const slug = ensureSlugOrAlert();
        if (!slug) return;
        try {
          const res = await fetch(`/admin/api/exercises/ctw/${encodeURIComponent(slug)}/upload?kind=${selKind.value}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ url })
          });
          const j = await res.json();
          if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
          node._media.push({
            id: makeId(selKind.value),
            kind: selKind.value,
            src: url,
            thumb: url,
            alt_es: '',
            alt_en: '',
            transcript_es: '',
            transcript_en: ''
          });
          inpUrl.value = '';
          renderList();
          toast(t('URL agregada.', 'URL added.'));
        } catch (e) {
          console.error(e);
          alert(t('No se pudo registrar la URL.', 'Could not register URL.'));
        }
      });
      rowURL.appendChild(selKind);
      rowURL.appendChild(inpUrl);
      rowURL.appendChild(btnAddUrl);
      body.appendChild(rowURL);

      const list = D.createElement('div');
      list.className = 'ppx-col';
      list.style.gap = '8px';
      body.appendChild(list);

      function renderList(){
        list.innerHTML = '';
        if (!node._media.length){
          const empty = D.createElement('div');
          empty.className = 'ppx-muted';
          empty.textContent = t('Sin multimedia.', 'No media.');
          list.appendChild(empty);
          return;
        }
        node._media.forEach((m, idx) => {
          const row = D.createElement('div');
          row.className = 'ppx-card';
          row.style.padding = '10px';
          row.style.display = 'flex';
          row.style.flexDirection = 'column';
          row.style.gap = '6px';
          const top = D.createElement('div');
          top.className = 'ppx-row';
          top.style.gap = '8px';
          top.style.alignItems = 'center';
          const kind = D.createElement('span');
          kind.className = 'ppx-chip';
          kind.textContent = m.kind;
          const link = D.createElement('a');
          link.href = m.src;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = m.src;
          link.style.wordBreak = 'break-all';
          const btnDel = D.createElement('button');
          btnDel.type = 'button';
          btnDel.className = 'ppx-btn ppx-btn--ghost';
          btnDel.textContent = t('Quitar', 'Remove');
          btnDel.addEventListener('click', () => {
            node._media.splice(idx,1);
            renderList();
          });
          top.appendChild(kind);
          top.appendChild(link);
          top.appendChild(btnDel);
          row.appendChild(top);

          const altEs = D.createElement('input');
          altEs.className = 'ppx-input';
          altEs.placeholder = t('Alt (ES)', 'Alt (ES)');
          altEs.value = m.alt_es || '';
          altEs.addEventListener('input', () => m.alt_es = altEs.value);
          const altEn = D.createElement('input');
          altEn.className = 'ppx-input';
          altEn.placeholder = t('Alt (EN)', 'Alt (EN)');
          altEn.value = m.alt_en || '';
          altEn.addEventListener('input', () => m.alt_en = altEn.value);
          row.appendChild(altEs);
          row.appendChild(altEn);

          if (m.kind === 'audio' || m.kind === 'video'){
            const trEs = D.createElement('textarea');
            trEs.className = 'ppx-textarea';
            trEs.rows = 2;
            trEs.placeholder = t('Transcripci�n (ES)', 'Transcript (ES)');
            trEs.value = m.transcript_es || '';
            trEs.addEventListener('input', () => m.transcript_es = trEs.value);
            const trEn = D.createElement('textarea');
            trEn.className = 'ppx-textarea';
            trEn.rows = 2;
            trEn.placeholder = t('Transcript (EN)', 'Transcript (EN)');
            trEn.value = m.transcript_en || '';
            trEn.addEventListener('input', () => m.transcript_en = trEn.value);
            row.appendChild(trEs);
            row.appendChild(trEn);
          }
          list.appendChild(row);
        });
      }

      renderList();
      wrap.appendChild(body);
      host.insertBefore(wrap, host.firstChild);
      node._renderMediaList = renderList;
    }

    function renumber(){
      const cards = itemsWrap.querySelectorAll(':scope > details[data-item-card]');
      cards.forEach((det, idx) => {
        const handle = det.querySelector('[data-item-handle]');
        if (handle) handle.textContent = `#${idx+1}`;
      });
    }

    function newItemNode() {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = makeId('ctw');
      node.dataset.itemCard = '1';
      addMediaSection(node);
      attachPreview(node);
      wireItem(node);
      return node;
    }

    function wireItem(node){
      const btnUp = node.querySelector('[data-item-up]');
      const btnDown = node.querySelector('[data-item-down]');
      const btnDup = node.querySelector('[data-item-dup]');
      const btnDel = node.querySelector('[data-item-del]');
      const title = node.querySelector('.ppx-item-title');
      const sentence = node.querySelector('[data-field="sentence"]');

      function updateTitle(){
        const txt = (sentence && sentence.value) ? sentence.value : t('Nuevo �tem','New item');
        title.textContent = (txt || '').slice(0, 80);
      }

      sentence.addEventListener('input', updateTitle);

      btnUp.addEventListener('click', () => {
        const prev = node.previousElementSibling;
        if (prev && prev.matches('details.ppx-card')) {
          itemsWrap.insertBefore(node, prev);
          renumber();
        }
      });
      btnDown.addEventListener('click', () => {
        const next = node.nextElementSibling;
        if (next && next.matches('details.ppx-card')) {
          itemsWrap.insertBefore(next, node);
          renumber();
        }
      });
      btnDup.addEventListener('click', () => {
        const clone = node.cloneNode(true);
        clone.dataset.id = makeId('ctw');
        clone._media = JSON.parse(JSON.stringify(node._media || []));
        wireItem(clone);
        itemsWrap.insertBefore(clone, node.nextElementSibling);
        renumber();
        if (typeof clone._renderMediaList === 'function') clone._renderMediaList();
      });
      btnDel.addEventListener('click', () => {
        node.remove();
        renumber();
      });
    }

    btnAdd?.addEventListener('click', () => {
      const node = newItemNode();
      itemsWrap.appendChild(node);
      renumber();
    });

    function buildItemPayload(node, idx){
      const mode = (node.querySelector('[data-field="mode"]')?.value || 'single');
      const sentence = node.querySelector('[data-field="sentence"]')?.value || '';
      const translation = node.querySelector('[data-field="translation"]')?.value || '';
      let tokens = tokensFromSentence(sentence);
      if ((!tokens || !tokens.length) && Array.isArray(node._tokensFromJson) && node._tokensFromJson.length){
        tokens = JSON.parse(JSON.stringify(node._tokensFromJson));
      }
      // For single mode, force exactly one correct token (first correct if present, else first token)
      if (mode === 'single' && Array.isArray(tokens) && tokens.length) {
        let idxCorrect = tokens.findIndex(t => t.correct);
        if (idxCorrect < 0) idxCorrect = 0;
        tokens = tokens.map((t, i) => ({ ...t, correct: i === idxCorrect }));
      }
      const countCorrect = (tokens || []).filter(t => t.correct).length;
      return {
        id: node.dataset.id || makeId('ctw'),
        order: idx + 1,
        mode,
        sentence,
        translation,
        tokens,
        correct_count: countCorrect,
        hint_es: node.querySelector('[data-field="hint_es"]')?.value || '',
        hint_en: node.querySelector('[data-field="hint_en"]')?.value || '',
        feedback_correct_es: node.querySelector('[data-field="feedback_correct_es"]')?.value || '',
        feedback_correct_en: node.querySelector('[data-field="feedback_correct_en"]')?.value || '',
        feedback_incorrect_es: node.querySelector('[data-field="feedback_incorrect_es"]')?.value || '',
        feedback_incorrect_en: node.querySelector('[data-field="feedback_incorrect_en"]')?.value || '',
        media: node._media || []
      };
    }

    function assembleJSON(statusOverride){
      autoSetSlug();
      // Build items and drop empties (no sentence and no tokens)
      let items = Array.from(itemsWrap.querySelectorAll(':scope > details[data-item-card]')).map((node, idx) => buildItemPayload(node, idx));
      items = items
        .filter(it => {
          const hasSentence = !!(it.sentence && it.sentence.trim());
          const hasTokens = Array.isArray(it.tokens) && it.tokens.length > 0;
          return hasSentence || hasTokens;
        })
        .map((it, idx) => ({ ...it, order: idx + 1 }));

      const payload = {
        type: 'ctw',
        slug: (inputSlug.value || '').trim().toLowerCase(),
        title_es: inputTitleEs.value || '',
        title_en: inputTitleEn.value || '',
        instructions_es: taInstEs.value || '',
        instructions_en: taInstEn.value || '',
        level: selLevel.value || 'A2',
        taxonomy_paths: (() => {
          try { return JSON.parse(inputTx.value || '[]') || []; } catch (_) { return []; }
        })(),
        status: statusOverride || (selStatus ? selStatus.value : 'draft'),
        items
      };
      return payload;
    }

    function validatePayload(payload){
      const errs = [];
      if (!payload.slug) errs.push(t('Completa el t�tulo para generar el slug.', 'Provide a title to generate the slug.'));
      if (!payload.title_es && !payload.title_en) errs.push(t('Completa un título.', 'Title is required.'));
      if (!payload.instructions_es && !payload.instructions_en) errs.push(t('Completa instrucciones.', 'Instructions are required.'));
      // Drop items without sentence or tokens before validation
      const filtered = Array.isArray(payload.items)
        ? payload.items.filter(it => {
            const hasSentence = !!(it.sentence && String(it.sentence).trim());
            const hasTokens = Array.isArray(it.tokens) && it.tokens.length > 0;
            return hasSentence || hasTokens;
          })
        : [];
      payload.items = filtered.map((it, i) => ({ ...it, order: i + 1 }));
      if (!payload.items.length) errs.push(t('Agrega al menos un �tem.', 'Add at least one item.'));
      payload.items.forEach((it, idx) => {
        const hasTokens = Array.isArray(it.tokens) && it.tokens.length;
        if (!hasTokens) errs.push(t(`�tem ${idx+1}: agrega palabras clickeables con asteriscos.`, `Item ${idx+1}: add clickable words with asterisks.`));
        if (it.mode === 'single') {
          if (Array.isArray(it.tokens) && it.tokens.length) {
            let idxCorrect = it.tokens.findIndex(t => t.correct);
            if (idxCorrect < 0) idxCorrect = 0;
            it.tokens = it.tokens.map((t, i) => ({ ...t, correct: i === idxCorrect }));
            it.correct_count = 1;
          }
          const count = (it.tokens || []).filter(t => t.correct).length;
          if (count !== 1) errs.push(t(`�tem ${idx+1}: modo single necesita exactamente una palabra correcta.`, `Item ${idx+1}: single mode needs exactly one correct word.`));
        }
      });
      return errs;
    }

    async function save(statusOverride){
      if (!ensureSlugOrAlert()) return null;
      const payload = assembleJSON(statusOverride || 'draft');
      const errs = validatePayload(payload);
      if (errs.length){
        alert(errs.join('\n'));
        return null;
      }
      try {
        const res = await fetch('/admin/api/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        const j = await res.json().catch(()=>({}));
        if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
        toast(t('Guardado.', 'Saved.'));
        return j.data || payload;
      } catch (e){
        console.error(e);
        alert(t('No se pudo guardar.', 'Could not save.'));
        return null;
      }
    }

    btnSave?.addEventListener('click', () => { save('draft'); });

    btnPreview?.addEventListener('click', async () => {
      const saved = await save(selStatus?.value || 'draft');
      if (!saved) return;
      try {
        window.PPX.openExercise({
          type: 'ctw',
          slug: saved.slug || (inputSlug.value || ''),
          version: 'current',
          lang: appLang
        });
      } catch (e){
        console.error(e);
        alert(t('No se pudo abrir la vista previa.', 'Could not open preview.'));
      }
    });

    btnExport?.addEventListener('click', () => {
      const payload = assembleJSON(selStatus?.value || 'draft');
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = D.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${payload.slug || 'ctw'}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    btnPublish?.addEventListener('click', async () => {
      const saved = await save('published');
      if (!saved) return;
      try {
        const res = await fetch(`/admin/api/exercises/ctw/${encodeURIComponent(saved.slug)}/publish`, {
          method: 'POST',
          credentials: 'same-origin'
        });
        const j = await res.json().catch(()=>({}));
        if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
        toast(t('Publicado.', 'Published.'));
        if (selStatus) selStatus.value = 'published';
      } catch (e){
        console.error(e);
        alert(t('No se pudo publicar.', 'Could not publish.'));
      }
    });

    // Autosave (localStorage)
    let dirty = false;
    form.addEventListener('input', () => { dirty = true; });
    setInterval(() => {
      if (!dirty) return;
      try {
        const payload = assembleJSON(selStatus?.value || 'draft');
        const key = `ppx:ex:ctw:${payload.slug || 'draft'}`;
        localStorage.setItem(key, JSON.stringify(payload));
        dirty = false;
      } catch (_) {}
    }, 8000);

    function applyJsonToBuilder(data){
      inputSlug.value = (data.slug || '').toLowerCase();
      inputTitleEs.value = data.title_es || '';
      inputTitleEn.value = data.title_en || '';
      taInstEs.value = data.instructions_es || '';
      taInstEn.value = data.instructions_en || '';
      selLevel.value = data.level || 'A2';
      try {
        const tx = Array.isArray(data.taxonomy_paths) ? data.taxonomy_paths : [];
        inputTx.value = JSON.stringify(tx);
        inputTx.dispatchEvent(new CustomEvent('ppx:taxonomy:set', { bubbles: true, detail: { paths: tx } }));
      } catch(_) {}

      Array.from(itemsWrap.querySelectorAll(':scope > details[data-item-card]')).forEach(n => n.remove());
      const items = Array.isArray(data.items) ? data.items.slice().sort((a,b)=>(a.order||0)-(b.order||0)) : [];
      if (!items.length){
        itemsWrap.appendChild(newItemNode());
        renumber();
        return;
      }
      items.forEach((it) => {
        const node = newItemNode();
        node.dataset.id = it.id || makeId('ctw');
        node._tokensFromJson = Array.isArray(it.tokens) ? JSON.parse(JSON.stringify(it.tokens)) : [];
        node.querySelector('[data-field="mode"]').value = it.mode || 'single';
        node.querySelector('[data-field="sentence"]').value = it.sentence || it.sentence_es || it.sentence_en || '';
        node.querySelector('[data-field="translation"]').value = it.translation || '';
        node.querySelector('[data-field="hint_es"]').value = it.hint_es || '';
        node.querySelector('[data-field="hint_en"]').value = it.hint_en || '';
        node.querySelector('[data-field="feedback_correct_es"]').value = it.feedback_correct_es || '';
        node.querySelector('[data-field="feedback_correct_en"]').value = it.feedback_correct_en || '';
        node.querySelector('[data-field="feedback_incorrect_es"]').value = it.feedback_incorrect_es || '';
        node.querySelector('[data-field="feedback_incorrect_en"]').value = it.feedback_incorrect_en || '';
        node._media = Array.isArray(it.media) ? JSON.parse(JSON.stringify(it.media)) : [];
        if (typeof node._renderMediaList === 'function') node._renderMediaList();
        // refresh previews/titles after setting values
        const sentenceEl = node.querySelector('[data-field="sentence"]');
        if (sentenceEl) sentenceEl.dispatchEvent(new Event('input', { bubbles: true }));
        const titleField = node.querySelector('.ppx-item-title');
        if (titleField) {
          const txt = sentenceEl?.value || '';
          titleField.textContent = txt.slice(0, 80) || titleField.textContent;
        }
        itemsWrap.appendChild(node);
      });
      renumber();
    }

    // JSON Editor
    (function injectJsonBtn(){
      let btn = D.getElementById('ppx-edit-json');
      if (!btn){
        btn = D.createElement('button');
        btn.type = 'button';
        btn.id = 'ppx-edit-json';
        btn.className = 'ppx-btn';
        if (btnExport && btnExport.parentNode){
          btnExport.parentNode.insertBefore(btn, btnExport.nextSibling);
        } else {
          form.appendChild(btn);
        }
      }
      const icon = btn.querySelector('img[src*=\"json.svg\"]') || (() => {
        const i = D.createElement('img');
        i.src = '/static/assets/icons/json.svg';
        i.alt = '';
        i.width = 18; i.height = 18;
        return i;
      })();
      const label = btn.querySelector('span') || (() => {
        const l = D.createElement('span');
        return l;
      })();
      label.textContent = 'JSON';
      btn.textContent = '';
      btn.appendChild(icon);
      btn.appendChild(label);
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.gap = '6px';
      btn.style.padding = '6px 10px';
      btn.style.borderRadius = '10px';
      btn.addEventListener('click', () => {
        const payload = assembleJSON(selStatus?.value || 'draft');
        if (!window.PPXJsonEditor){ alert(t('Editor JSON no disponible.', 'JSON editor not available.')); return; }
        window.PPXJsonEditor.open({
          exerciseType: 'ctw',
          slug: payload.slug,
          title: payload.title_es || payload.title_en || payload.slug,
          level: payload.level,
          initialData: payload,
          validate: (obj) => validatePayload(obj),
          apply: (obj) => applyJsonToBuilder(obj)
        });
      });
    })();

    // Prefill
    const BUILDER = window.PPX_BUILDER || {};
    if (window.__CTW_PREFILL && typeof window.__CTW_PREFILL === 'object'){
      applyJsonToBuilder(window.__CTW_PREFILL);
      if (selStatus) selStatus.value = window.__CTW_PREFILL.status || 'draft';
    } else {
      const cacheKey = `ppx:ex:ctw:${(BUILDER.slug || '').toLowerCase()}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) applyJsonToBuilder(JSON.parse(cached));
      } catch(_) {}
      if (!itemsWrap.querySelector('details.ppx-card')){
        itemsWrap.appendChild(newItemNode());
        renumber();
      }
    }
  });
})();
