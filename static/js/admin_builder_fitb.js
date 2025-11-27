/* static/js/admin_builder_fitb.js */
(function(){
  const D = document;
  function ready(fn){ if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }
  const t = (es, en) => { const lang=(window.PPX_I18N&&PPX_I18N.currentLang)||D.documentElement.getAttribute('lang')||'es'; return lang.startsWith('en')?(en??es):(es??en); };

  ready(() => {
    const form = D.getElementById('ppx-fitb-form');
    if (!form) return;

    const itemsWrap = D.getElementById('ppx-items');
    const tpl = D.getElementById('ppx-item-template');
    const btnAdd = D.getElementById('ppx-add-item');

    const inputSlug = D.getElementById('ex-slug');
    const inputTitleEs = D.getElementById('ex-title-es');
    const inputTitleEn = D.getElementById('ex-title-en');
    const taInstEs = D.getElementById('ex-inst-es');
    const taInstEn = D.getElementById('ex-inst-en');
    const selLevel = D.getElementById('ex-level');
    const inputTx = D.querySelector('.ppx-taxonomy input[type=hidden]');
    const selStatus = (window.PPXBuilderBase && PPXBuilderBase.initStatusControl(D,'ex-status')) || D.getElementById('ex-status');

    function addItem(){
      if (!tpl || !itemsWrap) return null;
      const frag = tpl.content.cloneNode(true);
      const node = frag.querySelector('details[data-item-card]');
      if (node) wire(node);
      itemsWrap.appendChild(frag);
      return node;
    }
    function wire(node){
      // Caret is CSS-based now; just set up editor and blanks panel
      initQuillForNode(node);
      renderBlanksPanel(node);
      initMediaForNode(node);
    }

    function initQuillForNode(node){
      try {
        const wrap = node.querySelector('[data-field="text"].ppx-quill');
        const toolbar = wrap && wrap.querySelector('[data-quill-toolbar]');
        const editor = wrap && wrap.querySelector('[data-quill-editor]');
        if (!wrap || !toolbar || !editor) return;

        // Make editor contenteditable and style it
        editor.setAttribute('contenteditable', 'true');
        editor.style.outline = 'none';
        if (!editor.innerHTML || !editor.innerHTML.trim()) editor.innerHTML = '<p><br></p>';

        // Build a tiny toolbar: Bold, Italic, Ordered List, Bullet List (outside editor)
        toolbar.innerHTML = '';
        toolbar.style.display = 'flex';
        toolbar.style.gap = '8px';
        toolbar.style.flexWrap = 'wrap';
        toolbar.style.marginBottom = '.35rem';

        const BTN_BG = '#475dd7';
        const BTN_FG = '#ffffff';

        function makeBtn(cmd, renderIcon, aria){
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'ppx-btn';
          b.setAttribute('aria-label', aria);
          b.title = aria;
          b.style.padding = '.25rem .5rem';
          b.style.borderRadius = '8px';
          b.style.background = BTN_BG;
          b.style.color = BTN_FG;
          b.style.border = 'none';
          b.style.display = 'inline-flex';
          b.style.alignItems = 'center';
          b.style.justifyContent = 'center';
          b.style.minWidth = '34px';
          b.style.minHeight = '28px';
          b.innerHTML = renderIcon();
          b.addEventListener('click', (e) => {
            e.preventDefault();
            editor.focus();
            try { document.execCommand(cmd, false, null); } catch(_) {}
          });
          return b;
        }

        const iconB = () => '<span style="font-weight:800;line-height:1;">B</span>';
        const iconI = () => '<span style="font-style:italic;line-height:1;">I</span>';
        const iconUL = () => (
          '<svg width="14" height="18" viewBox="0 0 14 18" aria-hidden="true" focusable="false">'
          + '<circle cx="7" cy="3" r="1.6" fill="#ffffff"/>'
          + '<circle cx="7" cy="9" r="1.6" fill="#ffffff"/>'
          + '<circle cx="7" cy="15" r="1.6" fill="#ffffff"/>'
          + '</svg>'
        );
        const iconOL = () => (
          '<svg width="14" height="18" viewBox="0 0 14 18" aria-hidden="true" focusable="false">'
          + '<text x="7" y="6" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-weight="700" font-size="8" fill="#ffffff">1</text>'
          + '<text x="7" y="14" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-weight="700" font-size="8" fill="#ffffff">2</text>'
          + '</svg>'
        );

        const row = document.createElement('div');
        row.style.display = 'inline-flex';
        row.style.gap = '6px';
        row.appendChild(makeBtn('bold', iconB, t('Negrita','Bold')));
        row.appendChild(makeBtn('italic', iconI, t('Cursiva','Italic')));
        row.appendChild(makeBtn('insertUnorderedList', iconUL, t('Lista con viñetas','Bulleted list')));
        row.appendChild(makeBtn('insertOrderedList', iconOL, t('Lista numerada','Numbered list')));
        toolbar.appendChild(row);

        // Debounced blank parsing on change
        let tmr = null;
        function onChange(){
          clearTimeout(tmr);
          tmr = setTimeout(() => renderBlanksPanel(node), 250);
        }
        editor.addEventListener('input', onChange);
        editor.addEventListener('keyup', onChange);
      } catch(_) {}
    }

    function parseBlanksFromText(text){
      const parts = [];
      const blanks = [];
      let last = 0; let m;
      const re = /\*([^*]+)\*/g;
      while ((m = re.exec(text))){
        const opts = String(m[1]||'').split('/').map(s=>s.trim()).filter(Boolean);
        blanks.push({ index: blanks.length+1, options: opts });
      }
      return blanks;
    }

    function getNodePlainText(node){
      const editor = node.querySelector('[data-quill-editor]');
      return (editor?.textContent || '').trim();
    }

    function renderBlanksPanel(node){
      try {
        const wrap = node.querySelector('[data-blanks-wrap]');
        if (!wrap) return;
        // Keep previous meta to preserve hints/feedback across re-renders
        const prev = node._blanksMeta || {};
        const txt = getNodePlainText(node);
        const blanks = parseBlanksFromText(txt);
        node._detectedBlanks = blanks;
        wrap.querySelectorAll('[data-blank-panel]').forEach(n=>n.remove());
        blanks.forEach((b, i) => {
          const p = D.createElement('div'); p.setAttribute('data-blank-panel', String(b.index)); p.className = 'ppx-card'; p.style.padding='10px'; p.style.border='1px solid var(--ppx-line)'; p.style.borderRadius='10px';
          const h = D.createElement('div'); h.style.display='flex'; h.style.gap='8px'; h.style.alignItems='center'; h.style.marginBottom='6px';
          const num = D.createElement('span'); num.className='ppx-chip'; num.textContent = `#${b.index}`;
          const ttl = D.createElement('strong'); ttl.textContent = t('Hueco','Blank')+` ${b.index}`;
          const opts = D.createElement('span'); opts.className='ppx-muted'; opts.textContent = b.options.length ? `(${b.options.join(' | ')})` : '';
          h.appendChild(num); h.appendChild(ttl); h.appendChild(opts); p.appendChild(h);

          const row1 = D.createElement('div'); row1.className='ppx-row'; row1.style.gap='12px'; row1.style.flexWrap='wrap';
          const fHintEs = field(t('Pista (ES)','Hint (ES)'), 'text', prev[i]?.hint_es || '');
          const fHintEn = field(t('Pista (EN)','Hint (EN)'), 'text', prev[i]?.hint_en || '');
          row1.appendChild(fHintEs.wrap); row1.appendChild(fHintEn.wrap);
          const row2 = D.createElement('div'); row2.className='ppx-row'; row2.style.gap='12px'; row2.style.flexWrap='wrap';
          const fFCes = field(t('Feedback correcto (ES)','Correct feedback (ES)'), 'text', prev[i]?.feedback_correct_es || '');
          const fFCen = field(t('Feedback correcto (EN)','Correct feedback (EN)'), 'text', prev[i]?.feedback_correct_en || '');
          row2.appendChild(fFCes.wrap); row2.appendChild(fFCen.wrap);
          const row3 = D.createElement('div'); row3.className='ppx-row'; row3.style.gap='12px'; row3.style.flexWrap='wrap';
          const fFIes = field(t('Feedback incorrecto (ES)','Incorrect feedback (ES)'), 'text', prev[i]?.feedback_incorrect_es || '');
          const fFIen = field(t('Feedback incorrecto (EN)','Incorrect feedback (EN)'), 'text', prev[i]?.feedback_incorrect_en || '');
          row3.appendChild(fFIes.wrap); row3.appendChild(fFIen.wrap);

          p.appendChild(row1); p.appendChild(row2); p.appendChild(row3);
          wrap.appendChild(p);

          // Persist handlers
          const meta = prev[i] || {};
          meta.hint_es = fHintEs.input; meta.hint_en = fHintEn.input;
          meta.feedback_correct_es = fFCes.input; meta.feedback_correct_en = fFCen.input;
          meta.feedback_incorrect_es = fFIes.input; meta.feedback_incorrect_en = fFIen.input;
          (node._blanksMeta || (node._blanksMeta = {}))[i] = meta;
        });

        function field(labelText, type, val){
          const wrap = D.createElement('div'); wrap.className='ppx-field'; wrap.style.flex='1'; wrap.style.minWidth='280px';
          const lab = D.createElement('label'); lab.textContent = labelText;
          const input = D.createElement('input');
          input.className='ppx-input';
          // If val is an input element from a previous render, use its .value
          if (val && typeof val !== 'string' && typeof val.value !== 'undefined') {
            input.value = String(val.value || '');
          } else {
            input.value = val || '';
          }
          wrap.appendChild(lab); wrap.appendChild(input);
          return { wrap, input };
        }
      } catch(_){}
    }

    // -------- Media UI (uploads + URLs) --------
    function initMediaForNode(node){
      try {
        if (!Array.isArray(node._media)) node._media = [];
        const wrap = node.querySelector('[data-media-wrap]');
        const list = node.querySelector('[data-media-list]');
        const btnAdd = node.querySelector('[data-media-add]');
        if (!wrap || !list || !btnAdd) return;

        // Hidden picker for uploads
        let picker = wrap.querySelector('input[type=file][data-media-picker]');
        if (!picker) {
          picker = D.createElement('input');
          picker.type = 'file'; picker.multiple = true; picker.accept = 'image/*,audio/*,video/*';
          picker.setAttribute('data-media-picker','1'); picker.style.display = 'none';
          wrap.appendChild(picker);
        }

        function renderList(){
          list.innerHTML = '';
          node._media.forEach((m, idx) => {
            const row = D.createElement('div'); row.className='ppx-row'; row.style.gap='8px'; row.style.alignItems='center'; row.style.flexWrap='wrap';
            const sel = D.createElement('select'); sel.className='ppx-select'; ['image','audio','video'].forEach(k=>{ const o=D.createElement('option'); o.value=k; o.textContent=k; if((m.kind||'image')===k) o.selected=true; sel.appendChild(o); }); sel.addEventListener('change', ()=>{ m.kind = sel.value; });
            const inURL = D.createElement('input'); inURL.type='text'; inURL.className='ppx-input'; inURL.placeholder=t('URL','URL'); inURL.style.minWidth='260px'; inURL.value=m.src||''; inURL.addEventListener('input',()=>{ m.src=inURL.value.trim(); });
            const altES = D.createElement('input'); altES.type='text'; altES.className='ppx-input'; altES.placeholder=t('Alt (ES)','Alt (ES)'); altES.value=m.alt_es||''; altES.addEventListener('input',()=>{ m.alt_es=altES.value.trim(); });
            const altEN = D.createElement('input'); altEN.type='text'; altEN.className='ppx-input'; altEN.placeholder=t('Alt (EN)','Alt (EN)'); altEN.value=m.alt_en||''; altEN.addEventListener('input',()=>{ m.alt_en=altEN.value.trim(); });
            const capES = D.createElement('input'); capES.type='text'; capES.className='ppx-input'; capES.placeholder=t('Pie (ES)','Caption (ES)'); capES.value=m.caption_es||''; capES.addEventListener('input',()=>{ m.caption_es=capES.value.trim(); });
            const capEN = D.createElement('input'); capEN.type='text'; capEN.className='ppx-input'; capEN.placeholder=t('Pie (EN)','Caption (EN)'); capEN.value=m.caption_en||''; capEN.addEventListener('input',()=>{ m.caption_en=capEN.value.trim(); });
            const btnReplace = D.createElement('button'); btnReplace.type='button'; btnReplace.className='ppx-btn'; btnReplace.textContent=t('Reemplazar','Replace');
            btnReplace.addEventListener('click', ()=>{
              const fp = D.createElement('input'); fp.type='file'; fp.accept = (m.kind==='image')?'image/*':(m.kind==='audio'?'audio/*':'video/*');
              fp.onchange = async ()=>{
                const f = fp.files && fp.files[0]; if (!f) return;
                const slug = (inputSlug && inputSlug.value || '').trim().toLowerCase(); if (!slug) { alert(t('Primero completá el slug.','Please fill in the slug first.')); return; }
                try {
                  const fd = new FormData(); fd.append('file', f);
                  const url = `/admin/api/exercises/fitb/${encodeURIComponent(slug)}/upload?kind=${encodeURIComponent(m.kind||'image')}`;
                  const res = await fetch(url, { method:'POST', body: fd, credentials:'same-origin' });
                  let err=''; if (!res.ok){ try{ const jErr = await res.json(); err=(jErr && (jErr.error||jErr.message))||`HTTP ${res.status}`; } catch(_){ const txt=await res.text().catch(()=> ''); err = txt || `HTTP ${res.status}`; } throw new Error(err); }
                  const j = await res.json().catch(()=>null); if (!j || !j.ok || !j.data || !j.data.url) throw new Error((j && (j.error||j.message))||'Upload failed');
                  m.src = j.data.url; if ((m.kind||'image')==='image') m.thumb = j.data.url; renderList();
                } catch(e){ console.error(e); alert((e && e.message)? e.message : t('No se pudo subir el archivo.','Failed to upload file.')); }
              };
              fp.click();
            });
            const btnDel = D.createElement('button'); btnDel.type='button'; btnDel.className='ppx-wbtn'; btnDel.textContent=t('Quitar','Remove'); btnDel.addEventListener('click', ()=>{ node._media.splice(idx,1); renderList(); });
            row.appendChild(sel); row.appendChild(inURL); row.appendChild(altES); row.appendChild(altEN); row.appendChild(capES); row.appendChild(capEN); row.appendChild(btnReplace); row.appendChild(btnDel);
            list.appendChild(row);
          });
        }
        btnAdd.addEventListener('click', ()=>{ if (picker) picker.click(); else { node._media.push({ kind:'image', src:'', alt_es:'', alt_en:'', caption_es:'', caption_en:'' }); renderList(); } });
        picker.addEventListener('change', async ()=>{
          const files = Array.from(picker.files||[]); if (!files.length) return; const slug=(inputSlug && inputSlug.value || '').trim().toLowerCase(); if (!slug){ alert(t('Primero completá el slug.','Please fill in the slug first.')); picker.value=''; return; }
          for (const file of files){ const type=(file.type||'').toLowerCase(); const kind= type.startsWith('video')?'video':(type.startsWith('audio')?'audio':'image');
            try {
              const fd=new FormData(); fd.append('file', file); const url=`/admin/api/exercises/fitb/${encodeURIComponent(slug)}/upload?kind=${encodeURIComponent(kind)}`; const res=await fetch(url,{method:'POST',body:fd,credentials:'same-origin'});
              let err=''; if(!res.ok){ try{const jErr=await res.json(); err=(jErr&&(jErr.error||jErr.message))||`HTTP ${res.status}`;}catch(_){const txt=await res.text().catch(()=> ''); err=txt||`HTTP ${res.status}`;} throw new Error(err);} const j=await res.json().catch(()=>null); if(!j||!j.ok||!j.data||!j.data.url) throw new Error((j&&(j.error||j.message))||'Upload failed');
              node._media.push({ kind, src:j.data.url, alt_es:'', alt_en:'', caption_es:'', caption_en:'' });
            }catch(e){ console.error(e); alert((e&&e.message)? e.message : t('No se pudo subir el archivo.','Failed to upload file.')); }
          }
          renderList(); picker.value='';
        });
        node._renderMediaList = renderList; renderList();
      } catch(_){}
    }
    function renumber(){ let i=1; itemsWrap.querySelectorAll('details[data-item-card]').forEach(n=>{ const h=n.querySelector('[data-item-handle]'); if(h) h.textContent = `#${i}`; i+=1; }); }

    if (!itemsWrap.querySelector('details[data-item-card]')) { addItem(); renumber(); }
    btnAdd && btnAdd.addEventListener('click', (e) => { e.preventDefault(); addItem(); renumber(); });

    function collectItems(){
      const out=[]; let order=1;
      itemsWrap.querySelectorAll('details[data-item-card]').forEach((n)=>{
        // Rich text HTML
        const editor = n.querySelector('[data-quill-editor]');
        const html = (editor?.innerHTML || '').trim();
        const txt = (editor?.textContent || '').trim();
        const detected = parseBlanksFromText(txt);
        // Merge with per-blank meta
        const blanks = detected.map((b, i) => {
          const meta = (n._blanksMeta && n._blanksMeta[i]) || {};
          return {
            index: b.index,
            options: b.options,
            hint_es: meta.hint_es ? meta.hint_es.value.trim() : '',
            hint_en: meta.hint_en ? meta.hint_en.value.trim() : '',
            feedback_correct_es: meta.feedback_correct_es ? meta.feedback_correct_es.value.trim() : '',
            feedback_correct_en: meta.feedback_correct_en ? meta.feedback_correct_en.value.trim() : '',
            feedback_incorrect_es: meta.feedback_incorrect_es ? meta.feedback_incorrect_es.value.trim() : '',
            feedback_incorrect_en: meta.feedback_incorrect_en ? meta.feedback_incorrect_en.value.trim() : ''
          };
        });
        const media = Array.isArray(n._media) ? n._media.map(m=>({
          kind: (m.kind==='audio'||m.kind==='video')? m.kind : 'image',
          src: m.src||'',
          alt_es: m.alt_es||'', alt_en: m.alt_en||'',
          caption_es: m.caption_es||'', caption_en: m.caption_en||''
        })) : [];
        out.push({ id: `b${order}`, order, text: html, blanks, media });
        order+=1;
      });
      return out;
    }

    function assemble(){
      const titleSource = (inputTitleEs.value || inputTitleEn.value || '').trim();
      const autoSlug = titleSource
        ? titleSource.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-{2,}/g,'-').replace(/^-+|-+$/g,'')
        : '';
      const slug = ((inputSlug.value||'').trim().toLowerCase()) || autoSlug;
      if (!inputSlug.value && slug) inputSlug.value = slug;
      let taxonomy_paths = [];
      try { taxonomy_paths = inputTx && inputTx.value ? JSON.parse(inputTx.value) : []; } catch(_){ taxonomy_paths = []; }
      return {
        id: slug ? `fitb/${slug}` : '',
        type: 'fitb',
        slug,
        version: 1,
        title_es: inputTitleEs.value.trim(),
        title_en: inputTitleEn.value.trim(),
        instructions_es: taInstEs.value.trim() || t('Escribí la palabra que falta.', 'Type the missing word.'),
        instructions_en: taInstEn.value.trim() || 'Type the missing word.',
        level: selLevel.value || 'A2',
        taxonomy_paths,
        status: (selStatus && ['draft','published','archived'].includes(selStatus.value)) ? selStatus.value : 'draft',
        items: collectItems(),
        created_by: 'admin',
        created_at: new Date().toISOString()
      };
    }

    function validateStrict(p){
      const errs=[];
      if (!p.slug) errs.push(t('Falta el slug.','Slug is required.'));
      if (!p.title_es && !p.title_en) errs.push(t('Falta el título.','Title is required.'));
      if (!(p.instructions_es || p.instructions_en)) errs.push(t('Faltan instrucciones ES/EN.','Instructions ES/EN required.'));
      if (!Array.isArray(p.items) || !p.items.length) errs.push(t('Agregá al menos un ítem.','Add at least one item.'));
      (p.items||[]).forEach((it,i)=>{
        const plain = String(it.text||'').replace(/<[^>]*>/g,'').trim();
        const hasText = plain.length > 0;
        const hasBlanks = (Array.isArray(it.blanks) && it.blanks.length > 0) || /\*[^*]+\*/.test(plain);
        const hasMedia = Array.isArray(it.media) && it.media.some(m => (m && typeof m.src === 'string' && m.src.trim().length));
        if (!hasText && !hasBlanks && !hasMedia) {
          errs.push(t(`Item #${i+1}: falta el texto, huecos o multimedia.`,'Item needs text, *...* blanks, or media.'));
        }
      });
      return errs;
    }

    // Lenient validator for Save/Preview/Export/JSON apply
    function validateLenient(p){
      const errs=[];
      if (!p.slug) errs.push(t('Falta el slug.','Slug is required.'));
      if (!p.title_es && !p.title_en) errs.push(t('Falta el ttulo.','Title is required.'));
      if (!(p.instructions_es || p.instructions_en)) errs.push(t('Faltan instrucciones ES/EN.','Instructions ES/EN required.'));
      if (!Array.isArray(p.items) || !p.items.length) errs.push(t('Agreg al menos un tem.','Add at least one item.'));
      return errs;
    }

    async function save(){
      const payload = assemble();
      const errs = validateLenient(payload); if (errs.length){ alert(errs.join('\n')); return; }
      const isEdit = (String((form.getAttribute('data-builder-mode')||'')).toLowerCase()==='edit' && payload.slug);
      const url = isEdit ? `/admin/api/exercises/fitb/${encodeURIComponent(payload.slug)}` : '/admin/api/exercises';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(payload) });
      if (!res.ok){ const j = await res.json().catch(()=>({})); alert(j.error || `HTTP ${res.status}`); return; }
      alert(t('Guardado.','Saved.'));
    }

    async function publish(){
      const payload = assemble();
      const errs = validateStrict(payload); if (errs.length){ alert(errs.join('\n')); return; }
      // Ensure saved
      let res = await fetch('/admin/api/exercises', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(payload) });
      if (!res.ok){ const j = await res.json().catch(()=>({})); alert(j.error || `HTTP ${res.status}`); return; }
      // Publish convenience
      res = await fetch(`/admin/api/exercises/fitb/${encodeURIComponent(payload.slug)}/publish`, { method:'POST', credentials:'same-origin' });
      if (!res.ok){ const j = await res.json().catch(()=>({})); alert(j.error || `HTTP ${res.status}`); return; }
      alert(t('Publicado.','Published.'));
    }

    function preview(){
      const payload = assemble();
      const errs = validateLenient(payload); if (errs.length){ alert(errs.join('\n')); return; }
      const url = `/admin/api/exercises/fitb/${encodeURIComponent(payload.slug)}`;
      const orig = window.fetch; let armed = true;
      window.fetch = async function(input, init){ try { const req = (typeof input==='string')? input : input.url; if (armed && req && req.startsWith(url)) { return new Response(JSON.stringify(payload), { status:200, headers:{'Content-Type':'application/json'} }); } return orig.apply(this, arguments); } catch(e){ return orig.apply(this, arguments); } };
      const onClose = ()=>{ armed=false; window.fetch = orig; window.removeEventListener('ppx:modal:close', onClose); };
      window.addEventListener('ppx:modal:close', onClose);

      function ensureFitb(cb){
        const ready = () => (window.PPX && window.PPX_FITB_READY === true);
        if (ready()) { cb(); return; }
        // Listen for readiness event from the plugin
        const onReady = () => { try { window.removeEventListener('ppx:fitb:ready', onReady); } catch(_){} cb(); };
        window.addEventListener('ppx:fitb:ready', onReady, { once: true });
        // Dynamically load FITB script as a fallback (if not already present)
        let s = document.querySelector('script[data-ppx-fitb]');
        if (!s) {
          s = document.createElement('script'); s.defer = true; s.setAttribute('data-ppx-fitb','1');
          s.src = `/static/js/ppx-fitb.js?v=20251113c`;
          document.head.appendChild(s);
        }
        // Safety timeout in case the event is missed but flag gets set
        setTimeout(() => { if (ready()) onReady(); }, 800);
      }

      const run = () => window.PPX.openExercise({ type:'fitb', slug: payload.slug, lang: (D.documentElement.getAttribute('lang')||'es') });
      try { ensureFitb(run); } catch(e){ onClose(); alert(t('No se pudo abrir la vista previa.','Failed to open preview.')); }
    }

    D.getElementById('ppx-save-draft')?.addEventListener('click', save);
    D.getElementById('ppx-publish')?.addEventListener('click', publish);
    D.getElementById('ppx-preview')?.addEventListener('click', preview);
    D.getElementById('ppx-export-json')?.addEventListener('click', ()=>{
      const payload = assemble(); const errs=validateLenient(payload); if (errs.length){ alert(errs.join('\n')); return; }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
      const a = D.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${payload.slug || 'exercise'}.fitb.json`; a.click(); URL.revokeObjectURL(a.href);
    });

    // Prefill in edit mode
    const mode = (form.getAttribute('data-builder-mode')||'').toLowerCase();
    let slugFromPage = (form.getAttribute('data-builder-slug') || '').trim();
    // Fallback: infer slug from URL if attribute missing
    if (!slugFromPage) {
      try { const m = location.pathname.match(/\/admin\/exercises\/fitb\/([^/]+)\/edit/i); if (m && m[1]) slugFromPage = decodeURIComponent(m[1]); } catch(_){}
    }
    if (mode === 'edit' && slugFromPage){
      const bust = `_ts=${Date.now()}`;
      const url = `/admin/api/exercises/fitb/${encodeURIComponent(slugFromPage)}?${bust}`;
      fetch(url, { credentials:'same-origin', cache:'no-store' })
        .then(r=> r.ok ? r.json() : Promise.reject(r.status))
        .then(raw => {
          const data = raw && raw.data ? raw.data : raw;
          try { console.info('[FITB builder] loaded payload for', slugFromPage, 'items?', Array.isArray(data.items)? data.items.length : 'n/a'); } catch(_){}
          applyJsonToBuilder(data);
        })
        .catch(()=> alert(t('No se pudo cargar el ejercicio para editar.','Failed to load exercise for edit.')));
    }

    function applyJsonToBuilder(data){
      inputSlug.value = (data.slug||'').toLowerCase();
      inputTitleEs.value = data.title_es || '';
      inputTitleEn.value = data.title_en || '';
      taInstEs.value = data.instructions_es || '';
      taInstEn.value = data.instructions_en || '';
      selLevel.value = data.level || 'A2';
      try { if (inputTx) { inputTx.value = JSON.stringify(Array.isArray(data.taxonomy_paths)? data.taxonomy_paths: []); inputTx.dispatchEvent(new CustomEvent('ppx:taxonomy:set', { bubbles:true, detail:{ paths: Array.isArray(data.taxonomy_paths)? data.taxonomy_paths: [] } })); } } catch(_){ }
      if (selStatus) { selStatus.value = (data.status || 'draft'); }
      Array.from(itemsWrap.querySelectorAll('details[data-item-card]')).forEach(n=> n.remove());
      let items = Array.isArray(data.items)? data.items.slice().sort((a,b)=>(a.order||0)-(b.order||0)) : [];
      // Defensive: drop empty/ghost items and de-duplicate by content signature
      try {
        const seen = new Set();
        const cleaned = [];
        for (const it of items) {
          const html = String(it.text || it.text_es || it.text_en || '');
          const tmp = D.createElement('div'); tmp.innerHTML = html; const plain = (tmp.textContent||'').trim();
          const blanksArr = Array.isArray(it.blanks) ? it.blanks : [];
          const mediaArr = Array.isArray(it.media) ? it.media : [];
          const hasMedia = mediaArr.some(m => m && typeof m.src === 'string' && m.src.trim().length);
          const hasBlanks = blanksArr.length > 0 || /\*[^*]+\*/.test(plain);
          const hasText = plain.length > 0;
          if (!hasText && !hasBlanks && !hasMedia) { continue; }
          const sig = [plain, JSON.stringify(blanksArr||[]), JSON.stringify(mediaArr.map(m=>m&&m.src||''))].join('|');
          if (seen.has(sig)) { continue; }
          seen.add(sig); cleaned.push(it);
        }
        if (cleaned.length !== items.length) {
          try { console.info('[FITB builder] de-duplicated items:', cleaned.length, 'from', items.length); } catch(_){}
          items = cleaned;
        }
      } catch(_){}
      // Fallbacks for legacy payloads that may use other keys
      if (!items.length && Array.isArray(data.slides)) {
        items = data.slides.map((s, i) => ({ id: `b${i+1}`, order: (s.order||i+1), text: (s.text||s.text_es||s.text_en||''), blanks: Array.isArray(s.blanks)? s.blanks: [] }));
      }
      if (!items.length && Array.isArray(data.questions)) {
        items = data.questions.map((q, i) => ({ id: `b${i+1}`, order: (q.order||i+1), text: (q.text||q.text_es||q.text_en||q.statement||q.statement_es||q.statement_en||''), blanks: Array.isArray(q.blanks)? q.blanks: [] }));
      }
      try { console.info('[FITB builder] normalized items:', items.length); } catch(_){}
      if (!items.length){ const node = addItem(); if (node) renderBlanksPanel(node); renumber(); return; }
      items.forEach(it => {
        const node = addItem(); if (!node) return;
        try {
          const editor = node.querySelector('[data-quill-editor]');
          if (editor) editor.innerHTML = it.text || it.text_es || it.text_en || '';
          // seed blanks meta
          node._blanksMeta = {};
          const blanks = Array.isArray(it.blanks) ? it.blanks : [];
          // Render based on current (reparse to count)
          renderBlanksPanel(node);
          const detected = node._detectedBlanks || [];
          detected.forEach((b, i) => {
            const src = blanks[i] || {};
            const meta = node._blanksMeta[i] || (node._blanksMeta[i] = {});
            if (meta.hint_es) meta.hint_es.value = src.hint_es || '';
            if (meta.hint_en) meta.hint_en.value = src.hint_en || '';
            if (meta.feedback_correct_es) meta.feedback_correct_es.value = src.feedback_correct_es || '';
            if (meta.feedback_correct_en) meta.feedback_correct_en.value = src.feedback_correct_en || '';
            if (meta.feedback_incorrect_es) meta.feedback_incorrect_es.value = src.feedback_incorrect_es || '';
            if (meta.feedback_incorrect_en) meta.feedback_incorrect_en.value = src.feedback_incorrect_en || '';
          });
          // hydrate media
          node._media = Array.isArray(it.media) ? it.media.map(m=>({
            kind: (m.kind==='audio'||m.kind==='video')? m.kind : 'image',
            src: m.src||'',
            alt_es: m.alt_es||'', alt_en: m.alt_en||'',
            caption_es: m.caption_es||'', caption_en: m.caption_en||''
          })) : [];
          if (typeof node._renderMediaList === 'function') node._renderMediaList(); else initMediaForNode(node);
        } catch(_){}
      });
      renumber();
      try { console.info('[FITB builder] DOM items after hydrate:', itemsWrap.querySelectorAll('details[data-item-card]').length); } catch(_){}
    }

    // JSON editor button (simple modal)
    (function wireJsonEditButton(){
      try {
        let btn = D.getElementById('ppx-edit-json');
        if (!btn) {
          btn = D.createElement('button');
          btn.type = 'button';
          btn.id = 'ppx-edit-json';
          btn.className = 'ppx-btn';
          btn.title = t('Editar JSON','Edit JSON');
          btn.setAttribute('aria-label', t('Editar JSON','Edit JSON'));
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
          // Insert next to Export if available
          const btnExport = D.getElementById('ppx-export-json');
          if (btnExport && btnExport.parentNode) btnExport.parentNode.insertBefore(btn, btnExport.nextSibling);
          else form.appendChild(btn);
        }
        btn.addEventListener('click', () => {
          try {
            if (window.PPXJsonEditor && typeof window.PPXJsonEditor.open === 'function') {
              const payload = assemble();
              window.PPXJsonEditor.open({
                exerciseType: 'fitb',
                slug: payload.slug || '',
                title: payload.title_es || payload.title_en || payload.slug || '',
                level: payload.level || (selLevel ? selLevel.value : ''),
                initialData: payload,
                validate: (obj) => validateLenient(obj),
                apply: (obj) => { applyJsonToBuilder(obj); }
              });
              return;
            }
          } catch (e) { console.error(e); }
          const overlay = D.createElement('div'); overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,.5)'; overlay.style.zIndex='2000';
          const card = D.createElement('div'); card.className='ppx-card'; card.style.maxWidth='900px'; card.style.margin='5vh auto'; card.style.padding='12px'; card.style.background='#fff';
          const ta = D.createElement('textarea'); ta.className='ppx-textarea'; ta.style.width='100%'; ta.style.minHeight='60vh'; ta.value = JSON.stringify(assemble(), null, 2);
          const row = D.createElement('div'); row.className='ppx-row'; row.style.justifyContent='flex-end'; row.style.gap='8px';
          const btnCancel = D.createElement('button'); btnCancel.type='button'; btnCancel.className='ppx-wbtn'; btnCancel.textContent = t('Cancelar','Cancel');
          const btnApply = D.createElement('button'); btnApply.type='button'; btnApply.className='ppx-btn ppx-btn--primary'; btnApply.textContent = t('Aplicar','Apply');
          row.appendChild(btnCancel); row.appendChild(btnApply);
          card.appendChild(ta); card.appendChild(row); overlay.appendChild(card); D.body.appendChild(overlay);
          function close(){ overlay.remove(); }
          overlay.addEventListener('click', (e)=> { if (e.target === overlay) close(); });
          btnCancel.addEventListener('click', close);
          btnApply.addEventListener('click', () => {
            try {
              const obj = JSON.parse(ta.value);
              if (obj && obj.type !== 'fitb') obj.type = 'fitb';
              const errs = validateLenient(obj);
              if (errs.length){ alert(errs.join('\n')); return; }
              applyJsonToBuilder(obj);
              close();
            } catch(e){ alert(t('JSON inválido.','Invalid JSON.')); }
          });
        });
      } catch(_){ }
    })();
  });
})();

