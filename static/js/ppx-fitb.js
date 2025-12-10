/* static/js/ppx-fitb.js */
(function(){
  if (!window.PPX) { try { console.warn('[PPX FITB] Core not present yet; will register when available.'); } catch(_){} }

  function plugin({ data, lang, api, context }){
    const L = (es, en) => (api.t ? api.t(es, en) : ((lang||'es').startsWith('en') ? (en ?? es) : (es ?? en)));
    // Normalize + de-duplicate items defensively (unique by id|order)
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const seenKeys = new Set();
    const items = rawItems.filter((it)=>{
      const key = `${it && it.id ? String(it.id) : ''}|${Number(it && it.order || 0)}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key); return true;
    }).slice().sort((a,b)=>(a.order||0)-(b.order||0));
    try { console.info('[PPX FITB] items:', items.length, items.map(it=>it.id)); } catch(_){}
    if (!items.length){ const msg = document.createElement('div'); msg.className='ppx-state--bad'; msg.textContent=L('Sin ítems para mostrar.','No items to display.'); api.setBody(msg); api.setProgress(1); return ()=>{}; }

    let idx = 0; // 0..items.length (summary at items.length)
    const answers = new Map(); // id -> { value, correct }
    const cacheKey = (window.PPXPlayerUtils && typeof window.PPXPlayerUtils.makeCacheKey === 'function')
      ? window.PPXPlayerUtils.makeCacheKey({ type: 'fitb', slug: data.slug, version: data.version || 'current' })
      : `ppx:fitb:${data.slug || 'unknown'}:${data.version || 'current'}`;
    const progressKey = `ppx:progress:fitb/${data.slug || 'unknown'}`;

    function saveCache(){
      try {
        const payload = {
          idx,
          answers: Array.from(answers.entries()).reduce((acc,[k,v])=>{ acc[k]=v; return acc; }, {})
        };
        localStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch(_){}
    }
    (function loadCache(){
      try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return;
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object'){
          if (typeof obj.idx === 'number') idx = Math.max(0, Math.min(items.length, obj.idx));
          if (obj.answers && typeof obj.answers === 'object'){
            Object.entries(obj.answers).forEach(([k,v])=>{
              if (v && typeof v === 'object') answers.set(k, v);
            });
          }
        }
      } catch(_){}
    })();

    const root = document.createElement('div'); root.className='ppx-ex ppx-ex--fitb';
    const prompt = document.createElement('div'); prompt.className='ppx-ex__prompt'; prompt.style.whiteSpace = 'pre-wrap';
    const mediaToggle = document.createElement('button'); mediaToggle.type='button'; mediaToggle.className='ppx-ex__media-toggle ppx-ex__iconBtn ppx-tooltip'; mediaToggle.hidden = true; mediaToggle.setAttribute('aria-expanded','true');
    const media = document.createElement('div'); media.className='ppx-media-block';
    const inputsWrap = document.createElement('div'); inputsWrap.className='ppx-row'; inputsWrap.style.gap='8px';
    // Special character toolbar (between sentences and Check)
    const charBar = document.createElement('div'); charBar.className='ppx-row ppx-ex__chars'; charBar.style.gap='6px'; charBar.style.margin='8px 0';
    const chars = ['á','é','í','ó','ú','ö','ü','¿','¡'];
    function insertAtCursor(el, ch){
      try {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const before = el.value.slice(0, start);
        const after = el.value.slice(end);
        el.value = before + ch + after;
        const pos = start + ch.length;
        el.selectionStart = el.selectionEnd = pos;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
      } catch(_){}
    }
    let lastFocused = null;
    root.addEventListener('focusin', function(e){
      const t = e && e.target; if (!t) return;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') lastFocused = t;
    });
    chars.forEach(function(ch){
      const b = document.createElement('button'); b.type='button'; b.className='ppx-btn ppx-btn--sm'; b.textContent = ch;
      b.addEventListener('click', function(){
        let target = lastFocused && root.contains(lastFocused) ? lastFocused : (root.querySelector('input.ppx-fitb-inp'));
        if (target) insertAtCursor(target, ch);
      });
      charBar.appendChild(b);
    });
    const btnCheck = document.createElement('button'); btnCheck.type='button'; btnCheck.className='ppx-btn'; btnCheck.textContent=L('Comprobar','Check');
    // Separate inline feedback area for correctness messages
    const inlineFB = document.createElement('div'); inlineFB.className='ppx-ex__inline-feedback'; inlineFB.setAttribute('role','status'); inlineFB.setAttribute('aria-live','polite');

    // Footer (progress + nav)
    const progress = document.createElement('div'); progress.className='ppx-ex__progress';
    const fraction = document.createElement('div'); fraction.className='ppx-ex__fraction';
    const dots = document.createElement('div'); dots.className='ppx-ex__dots';
    progress.appendChild(fraction); progress.appendChild(dots);
    const btnResults = document.createElement('button'); btnResults.type='button'; btnResults.className='ppx-wbtn ppx-wbtn--primary ppx-ex__results'; btnResults.textContent = L('Ver resultados','See results'); btnResults.hidden = true; btnResults.addEventListener('click', ()=>{ idx = items.length; render(); }); progress.appendChild(btnResults);
    const nav = document.createElement('div'); nav.className='ppx-ex__nav';
    const btnPrev = document.createElement('button'); btnPrev.type='button'; btnPrev.className='ppx-ex__nav-btn ppx-ex__nav-btn--prev';
    const btnNext = document.createElement('button'); btnNext.type='button'; btnNext.className='ppx-ex__nav-btn ppx-ex__nav-btn--next';
    nav.appendChild(btnPrev); nav.appendChild(btnNext);
    const footer = document.createElement('div'); footer.className='ppx-ex__footer'; footer.appendChild(progress); footer.appendChild(nav);

    // Assemble (Toggle above media, then prompt and inputs)
    root.appendChild(mediaToggle);
    root.appendChild(media);
    root.appendChild(prompt);
    root.appendChild(charBar);
    root.appendChild(inputsWrap);
    root.appendChild(btnCheck);
    root.appendChild(inlineFB);
    root.appendChild(footer);
    // Show first-run instructions if available and not dismissed
    (function(){
      try {
        const slug = (data && (data.slug || data.id)) || 'fitb';
        const introKey = 'ppx:intro:dismissed:fitb/' + String(slug);
        const instr = (lang||'es').toLowerCase().startsWith('en')
          ? ((data.instructions_en || (data.options && data.options.instructions_en)) || (data.instructions_es || (data.options && data.options.instructions_es)) || '')
          : ((data.instructions_es || (data.options && data.options.instructions_es)) || (data.instructions_en || (data.options && data.options.instructions_en)) || '');
        const shouldShowIntro = !!instr && !localStorage.getItem(introKey);
        if (shouldShowIntro) {
          const intro = document.createElement('div');
          intro.className = 'ppx-card';
          intro.style.padding = '18px 20px'; intro.style.margin = '0 auto'; intro.style.maxWidth = '820px';
          const h = document.createElement('h2'); h.textContent = L('Instrucciones','Instructions'); h.style.marginTop='4px';
          const body = document.createElement('div'); body.className='ppx-p'; body.innerHTML = instr;
          const actions = document.createElement('div'); actions.className='ppx-row'; actions.style.justifyContent='center'; actions.style.marginTop='12px';
          const startBtn = document.createElement('button'); startBtn.type='button'; startBtn.className='ppx-btn ppx-btn--primary'; startBtn.textContent = L('Comenzar','Start');
          actions.appendChild(startBtn);
          intro.appendChild(h); intro.appendChild(body); intro.appendChild(actions);
          if (window.PPXModal && typeof PPXModal.setBody === 'function') {
            PPXModal.setBody(intro);
          } else {
            root.style.display = 'none'; root.parentNode && root.parentNode.insertBefore(intro, root);
          }
          startBtn.addEventListener('click', function(ev){
            try { ev && ev.preventDefault(); ev && ev.stopPropagation(); } catch(_){}
            try { localStorage.setItem(introKey, '1'); } catch(_){}
            if (window.PPXModal && typeof PPXModal.setBody === 'function') {
              PPXModal.setBody(root);
            } else {
              intro.remove(); root.style.display = '';
            }
            try { const m=document.querySelector('.ppx-modal'), o=document.querySelector('.ppx-modal__overlay'); if(m&&o){ m.classList.add('is-open'); o.classList.add('is-open'); m.setAttribute('aria-hidden','false'); } } catch(_){ }
          });
        } else {
          api.setBody(root);
        }
      } catch(_) { api.setBody(root); }
    })();

    function isSummary(){ return idx === items.length; }
    function getText(it){ return it.text || it.text_es || it.text_en || ''; }
    function plainTextFromHtml(html){
      let s = String(html || '');
      s = s.replace(/<br\s*\/?>/gi, '\n');
      s = s.replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n');
      s = s.replace(/<(p|div|li|tr|h[1-6])[^>]*>/gi, '');
      const tmp = document.createElement('div');
      tmp.innerHTML = s;
      return tmp.textContent || '';
    }
    function parseHtmlWithBlanks(html){
      const blanks = [];
      const frag = document.createDocumentFragment();
      const root = document.createElement('div');
      root.innerHTML = html || '';

      function walk(node, parent){
        if (node.nodeType === 3) {
          const text = node.nodeValue || '';
          const re = /\*([^*]+)\*/g;
          let last = 0; let m;
          while ((m = re.exec(text))){
            const before = text.slice(last, m.index);
            if (before) parent.appendChild(document.createTextNode(before));
            const idx = blanks.length + 1;
            const opts = String(m[1] || '').split('/').map(s => s.trim()).filter(Boolean);
            blanks.push({ index: idx, options: opts });
            const slot = document.createElement('span');
            slot.setAttribute('data-blank', String(idx));
            parent.appendChild(slot);
            last = m.index + m[0].length;
          }
          const tail = text.slice(last);
          if (tail) parent.appendChild(document.createTextNode(tail));
          return;
        }
        if (node.nodeType === 1) {
          const clone = node.cloneNode(false);
          parent.appendChild(clone);
          Array.from(node.childNodes || []).forEach(child => walk(child, clone));
        }
      }

      Array.from(root.childNodes || []).forEach(n => walk(n, frag));
      return { fragment: frag, blanks };
    }
    function parseBlanksFromText(str){
      const blanks = [];
      let last = 0; const out = [];
      const re = /\*([^*]+)\*/g; let m;
      while ((m = re.exec(str))){
        const before = str.slice(last, m.index); if (before) out.push({ type:'text', value: before });
        const raw = m[1]; const opts = raw.split('/').map(s=>s.trim()).filter(Boolean);
        blanks.push({ index: blanks.length+1, options: opts });
        out.push({ type:'blank', index: blanks.length });
        last = m.index + m[0].length;
      }
      const tail = str.slice(last); if (tail) out.push({ type:'text', value: tail });
      return { parts: out, blanks };
    }

    function circled(n){
      const base = 0x2460; // ①
      if (n >=1 && n <= 20) return String.fromCharCode(base + n - 1);
      return `[${n}]`;
    }
    function getHint(it){
      const h = (lang||'es').startsWith('en') ? (it.hint_en || it.hint_es) : (it.hint_es || it.hint_en);
      return h || '';
    }
    function pickFeedback(meta, ok){
      if (!meta) return '';
      const keyGood = (lang||'es').startsWith('en') ? 'feedback_correct_en' : 'feedback_correct_es';
      const keyBad  = (lang||'es').startsWith('en') ? 'feedback_incorrect_en' : 'feedback_incorrect_es';
      if (ok) return meta[keyGood] || meta.feedback_correct_es || meta.feedback_correct_en || '';
      return meta[keyBad] || meta.feedback_incorrect_es || meta.feedback_incorrect_en || '';
    }
    function hasRenderedMedia(){ return window.PPXPlayerUtils && PPXPlayerUtils.hasRenderedMedia(media); }
    function updateMediaToggle(){ if (!window.PPXPlayerUtils) return; PPXPlayerUtils.updateMediaToggle(media, mediaToggle, isSummary()); }

    function itemHasMedia(item){
      const raw = (item && (item.media || item.medias || item.image || item.images)) || item?.media_url || item?.image_url || null;
      if (!raw) return false;
      if (typeof raw === 'string') return raw.trim().length > 0;
      if (Array.isArray(raw)) {
        return raw.some((m)=>{
          if (!m) return false;
          if (typeof m === 'string') return m.trim().length > 0;
          if (typeof m === 'object') {
            const src = m.src ?? m.url ?? m.href ?? m.path ?? m.file ?? m.thumb ?? m.image ?? m.image_url;
            return typeof src === 'string' && src.trim().length > 0;
          }
          return false;
        });
      }
      if (typeof raw === 'object') {
        const src = raw.src ?? raw.url ?? raw.href ?? raw.path ?? raw.file ?? raw.thumb ?? raw.image ?? raw.image_url;
        return typeof src === 'string' && src.trim().length > 0;
      }
      return false;
    }

    function cacheBustMediaSrc(src){
      if (!src || typeof src !== 'string') return src;
      if (!src.startsWith('/media/')) return src;
      const ver = (data && data.version) || 'cur';
      return `${src}${src.includes('?') ? '&' : '?'}v=${ver}`;
    }

    // Preload media so slide-to-slide navigation doesn't feel laggy
    (function prefetchMedia(){
      const seen = new Set();
      items.forEach((it)=>{
        const arr = (it && (it.media || it.medias || it.image || it.images)) || [];
        const list = Array.isArray(arr) ? arr : (arr ? [arr] : []);
        list.forEach((m)=>{
          if (!m) return;
          let src = null; let kind = 'image';
          if (typeof m === 'string') { src = m; }
          else if (typeof m === 'object') {
            src = m.src ?? m.url ?? m.href ?? m.path ?? m.file ?? m.image ?? m.image_url;
            kind = (m.kind === 'audio' || m.kind === 'video') ? m.kind : 'image';
          }
          if (!src) return;
          const bust = cacheBustMediaSrc(src);
          if (seen.has(bust)) return;
          seen.add(bust);
          if (kind === 'image') {
            const img = new Image();
            img.loading = 'eager';
            img.decoding = 'async';
            img.src = bust;
          } else {
            try { fetch(bust, { method: 'HEAD', cache: 'force-cache' }); } catch(_){}
          }
        });
      });
    })();

    function renderMediaBlock(item){
      try { media.innerHTML=''; } catch(_){}
      try {
        const arr = (item && (item.media || item.medias || item.image || item.images)) || [];
        const list = Array.isArray(arr) ? arr : (arr ? [arr] : []);
        if (!list.length) return;
        const grid = document.createElement('div'); grid.className='ppx-media-grid';
        list.forEach((m)=>{
          if (!m) return;
          let src=null; let kind='image';
          if (typeof m === 'string') { src = m; kind='image'; }
          else if (typeof m === 'object') { src = m.src ?? m.url ?? m.href ?? m.path ?? m.file ?? m.image ?? m.image_url; kind = (m.kind==='audio'||m.kind==='video')? m.kind : 'image'; }
          if (!src) return;
          // Cache-bust media served from our /media/* to avoid stale 404s
          const cacheSrc = cacheBustMediaSrc(src);
          const tile = document.createElement('div'); tile.className='ppx-media-tile';
          if (kind==='image'){
            const box = document.createElement('div'); box.className='ppx-imgbox'; box.setAttribute('data-ppx-lightbox','true');
            const img = document.createElement('img'); img.className='ppx-media-img'; img.src = cacheSrc; img.alt = (lang==='en') ? (m.alt_en||'') : (m.alt_es||'');
            img.loading = 'lazy';
            img.decoding = 'async';
            box.appendChild(img); tile.appendChild(box);
            if (m.caption_es || m.caption_en) { const cap=document.createElement('div'); cap.className='ppx-media-caption'; cap.textContent = (lang==='en') ? (m.caption_en||m.caption_es||'') : (m.caption_es||m.caption_en||''); tile.appendChild(cap); }
          } else if (kind==='audio') {
            const row=document.createElement('div'); row.className='ppx-media-audio'; const a=document.createElement('audio'); a.controls=true; a.preload='metadata'; a.src=cacheSrc; a.style.width='100%'; row.appendChild(a); tile.appendChild(row);
          } else if (kind==='video') {
            const row=document.createElement('div'); row.className='ppx-media-video'; const v=document.createElement('video'); v.controls=true; v.preload='metadata'; v.src=cacheSrc; v.style.maxWidth='100%'; row.appendChild(v); tile.appendChild(row);
          }
          grid.appendChild(tile);
        });
        media.appendChild(grid);
      } catch(_){}
    }

    function updateMediaToggleForItem(item){
      const onSummary = isSummary();
      const has = !onSummary && hasRenderedMedia();
      mediaToggle.hidden = !has; mediaToggle.style.display = has ? '' : 'none';
      if (!has) return;
      const isHidden = media.hidden === true;
      const visibleLabel = isHidden ? L('Mostrar multimedia','Show media') : L('Ocultar multimedia','Hide media');
      const icon = isHidden ? '/static/assets/icons/preview.svg' : '/static/assets/icons/close_preview.svg';
      mediaToggle.innerHTML = '<img class="ppx-ex-icon" src="'+icon+'" alt="" width="36" height="36">';
      mediaToggle.setAttribute('aria-label', visibleLabel);
      mediaToggle.setAttribute('title', visibleLabel);
      mediaToggle.setAttribute('data-tooltip', visibleLabel);
      mediaToggle.setAttribute('aria-expanded', String(!isHidden));
    }
    mediaToggle.addEventListener('click', ()=>{
      if (isSummary()) return;
      const it = items[idx];
      if (!itemHasMedia(it)) return;
      media.hidden = !media.hidden;
      updateMediaToggleForItem(it);
    });

    function updateProgress(){
      try {
        fraction.textContent = isSummary()? `${items.length}/${items.length}` : `${idx+1}/${items.length}`;
        dots.innerHTML='';
        for(let i=0;i<items.length;i++){
          const d=document.createElement('button');
          d.type='button';
          d.className='ppx-ex__dot'+(i===idx? ' is-current' : (answers.has(items[i].id) ? ' is-done' : ''));
          d.addEventListener('click', ()=>{ if (!isSummary()){ idx=i; render(); }});
          dots.appendChild(d);
        }
        const onLastSlide = (idx === items.length - 1);
        const allAnswered = answers.size === items.length;
        btnResults.hidden = !(onLastSlide && allAnswered && !isSummary());
      } catch(_){}
    }

    function renderSummary(){
      // Hide in-summary controls that belong to exercise steps
      try { charBar.hidden = true; charBar.style.display = 'none'; } catch(_){}
      try { btnCheck.hidden = true; btnCheck.style.display = 'none'; } catch(_){}
      mediaToggle.hidden = true; mediaToggle.style.display='none'; media.hidden = false; media.innerHTML='';
      prompt.textContent=''; inlineFB.textContent='';
      const appendTextWithBreaks = (node, text) => {
        const parts = String(text || '').split(/\r?\n/);
        parts.forEach((seg, i) => {
          if (i > 0) node.appendChild(document.createElement('br'));
          node.appendChild(document.createTextNode(seg));
        });
      };
      // Compute overall score with partial credit by blanks when available
      let totalBlanksAll = 0;
      let correctBlanksAll = 0;
      items.forEach((it) => {
        const bParsed = parseHtmlWithBlanks(getText(it)||'');
        const totalBlanks = (bParsed.blanks && bParsed.blanks.length) || (Array.isArray(it.blanks) ? it.blanks.length : 0);
        if (totalBlanks > 0) {
          const itemBlanks = Array.isArray(it.blanks) ? it.blanks : null;
          const vals = (answers.get(it.id)||{}).values || [];
          let correctHere = 0;
          (bParsed.blanks || []).forEach((b, i) => {
            const opts = itemBlanks?.[i]?.options || b.options || [];
            const got = String(vals[i]||'').trim().toLowerCase();
            if (opts.some(o => String(o).toLowerCase() === got)) correctHere += 1;
          });
          totalBlanksAll += totalBlanks;
          correctBlanksAll += correctHere;
        }
      });
      let overallScorePct = 0; let metaCountLabel = '';
      if (totalBlanksAll > 0) {
        overallScorePct = Math.round((correctBlanksAll / totalBlanksAll) * 100);
        metaCountLabel = `${correctBlanksAll}/${totalBlanksAll}`;
      } else {
        const correctItems = Array.from(answers.values()).filter(v=>v && v.correct).length;
        overallScorePct = Math.round((correctItems / (items.length||1)) * 100);
        metaCountLabel = `${correctItems}/${items.length}`;
      }
      const wrap = document.createElement('div'); wrap.className='ppx-card'; wrap.style.padding='16px'; wrap.style.maxWidth='820px'; wrap.style.margin='0 auto';
      const hTitle = document.createElement('h3'); hTitle.style.textAlign='center'; hTitle.textContent=L('Resumen','Summary');
      const hMeta = document.createElement('p'); hMeta.style.textAlign='center';
      const scoreBadge = document.createElement('span'); scoreBadge.className='ppx-score'; scoreBadge.textContent = `${overallScorePct}%`;
      if (overallScorePct >= 90) scoreBadge.classList.add('ppx-score--green');
      else if (overallScorePct >= 80) scoreBadge.classList.add('ppx-score--blue');
      else if (overallScorePct >= 70) scoreBadge.classList.add('ppx-score--orange');
      else scoreBadge.classList.add('ppx-score--red');
      const metaLabel = document.createElement('span'); metaLabel.textContent = `${L('Puntaje','Score')}: `;
      const metaTail = document.createElement('span'); metaTail.textContent = ` - ${metaCountLabel}`;
      hMeta.appendChild(metaLabel); hMeta.appendChild(scoreBadge); hMeta.appendChild(metaTail);
      wrap.appendChild(hTitle); wrap.appendChild(hMeta);
      // Accordions per item with user answers + feedback
      const list = document.createElement('div'); list.setAttribute('role','list'); list.style.display='grid'; list.style.gap='10px';
      items.forEach((it, idx1) => {
        const det = document.createElement('details'); det.className='ppx-acc'; det.style.border='1px solid var(--ppx-color-line,#e5e7eb)'; det.style.borderRadius='12px'; det.style.overflow='hidden'; det.style.background='#fff';
        const sum = document.createElement('summary'); sum.style.cursor='pointer'; sum.style.listStyle='none'; sum.style.padding='12px 14px'; sum.style.display='flex'; sum.style.alignItems='center'; sum.style.gap='10px'; sum.style.flexWrap='nowrap';
        const stmt = plainTextFromHtml(getText(it)||'').trim();
        const stmtEl = document.createElement('span'); stmtEl.style.flex='1 1 auto'; stmtEl.style.minWidth='0'; stmtEl.style.whiteSpace='pre-wrap';
        appendTextWithBreaks(stmtEl, stmt);
        // Compute per-item score based on blanks
        const ans = answers.get(it.id) || { values: [], correct: false };
        const bParsed = parseHtmlWithBlanks(getText(it)||'');
        const totalBlanks = (bParsed.blanks && bParsed.blanks.length) || (Array.isArray(it.blanks) ? it.blanks.length : 0);
        let correctBlanks = 0;
        if (totalBlanks > 0) {
          const itemBlanks = Array.isArray(it.blanks) ? it.blanks : null;
          const vals = ans.values || [];
          (bParsed.blanks || []).forEach((b, i) => {
            const opts = itemBlanks?.[i]?.options || b.options || [];
            const got = String(vals[i]||'').trim().toLowerCase();
            if (opts.some(o => String(o).toLowerCase() === got)) correctBlanks += 1;
          });
        }
        const pct = totalBlanks ? Math.round((correctBlanks/totalBlanks)*100) : (ans.correct ? 100 : 0);
        const pill = document.createElement('span'); pill.className='ppx-score'; pill.textContent = `${pct}%`;
        if (pct >= 90) pill.classList.add('ppx-score--green');
        else if (pct >= 80) pill.classList.add('ppx-score--blue');
        else if (pct >= 70) pill.classList.add('ppx-score--orange');
        else pill.classList.add('ppx-score--red');
        const frac = document.createElement('span'); frac.className='ppx-muted'; frac.style.whiteSpace='nowrap'; frac.textContent = ` ${correctBlanks}/${totalBlanks}`;
        sum.appendChild(stmtEl); sum.appendChild(pill); sum.appendChild(frac);
        const panel = document.createElement('div'); panel.style.padding='12px 14px'; panel.style.display='grid'; panel.style.gap='6px';
        // Per-blank feedback lines
        const values = ((answers.get(it.id) || {}).values) || [];
        const itemBlanks = Array.isArray(it.blanks) ? it.blanks : null; const parsed = parseHtmlWithBlanks(getText(it)||'');
        (parsed.blanks || []).forEach((b,i)=>{
          const meta = itemBlanks?.[i] || {}; const opts = (meta.options||b.options||[]);
          const got = String(values[i]||'').trim(); const okB = opts.some(o=> String(o).toLowerCase() === got.toLowerCase());
          const box = document.createElement('div'); box.className = okB ? 'ppx-state--ok' : 'ppx-state--bad'; box.style.display='flex'; box.style.alignItems='baseline'; box.style.gap='6px';
          const num = document.createElement('span'); num.className='ppx-fitb-num'; num.textContent = `(${i+1})`;
          const text = document.createElement('div');
          const fb = pickFeedback(meta, okB);
          const user = got ? `<em>${got}</em>` : L('(sin respuesta)','(no answer)');
          text.innerHTML = `${user}${fb ? ' - ' + fb : ''}`;
          box.appendChild(num); box.appendChild(text); panel.appendChild(box);
        });
        det.appendChild(sum); det.appendChild(panel); list.appendChild(det);
      });
      wrap.appendChild(list);
      // Hide progress UI on summary to match other exercises
      try { fraction.style.display = 'none'; dots.style.display = 'none'; btnResults.hidden = true; } catch(_){}
      media.appendChild(wrap);
      btnNext.disabled = true; btnPrev.disabled = (items.length===0);
      api.setProgress(1); api.complete && api.complete({ score: overallScorePct, correct: correctBlanksAll || Array.from(answers.values()).filter(v=>v && v.correct).length, total: totalBlanksAll || items.length });
      // Restart button (summary only)
      const restartRow = document.createElement('div');
      restartRow.style.display = 'flex';
      restartRow.style.justifyContent = 'center';
      restartRow.style.marginTop = '12px';
      const restartBtn = document.createElement('button');
      restartBtn.type = 'button';
      restartBtn.className = 'ppx-btn ppx-btn--ghost';
      restartBtn.textContent = L('Reiniciar','Restart');
      restartBtn.style.border = '1px solid #f97316';
      restartBtn.style.color = '#f97316';
      restartBtn.style.display = 'inline-flex';
      restartBtn.style.alignItems = 'center';
      restartBtn.style.gap = '6px';
      restartBtn.style.width = 'fit-content';
      restartBtn.style.padding = '8px 14px';
      const restartIcon = document.createElement('img'); restartIcon.src='/static/assets/icons/refresh.svg'; restartIcon.alt=''; restartIcon.width=16; restartIcon.height=16; restartBtn.prepend(restartIcon);
      restartBtn.addEventListener('click', (ev)=>{
        ev.preventDefault(); ev.stopPropagation();
        try { localStorage.removeItem(cacheKey); } catch(_){}
        try { localStorage.removeItem(progressKey); } catch(_){}
        answers.clear();
        idx = 0;
        api.setProgress(0);
        render();
      });
      restartRow.appendChild(restartBtn);
      media.appendChild(restartRow);
    }

    function render(){
      updateProgress();
      if (isSummary()) { renderSummary(); return; }
      const it = items[idx];
      // Render text with inline blanks as inputs
      const txt = getText(it) || '';
      const itemBlanks = Array.isArray(it.blanks) ? it.blanks : null;
      prompt.innerHTML = '';
      inputsWrap.innerHTML = '';
      const answerState = answers.get(it.id);
      const values = (answerState?.values || []);
      const parsed = parseHtmlWithBlanks(txt);
    prompt.appendChild(parsed.fragment);
    Array.from(prompt.querySelectorAll('[data-blank]')).forEach((slot) => {
        const idx1 = Number(slot.getAttribute('data-blank')) || 0;
        const zero = Math.max(0, idx1 - 1);
        const meta = itemBlanks ? (itemBlanks[zero] || {}) : {};
        const hintText = (lang||'es').startsWith('en') ? (meta.hint_en || meta.hint_es || '') : (meta.hint_es || meta.hint_en || '');
        const group = document.createElement('span');
        group.style.display='inline-flex';
        group.style.alignItems='baseline';
        group.style.gap='4px';
        group.style.margin='0 4px';
        group.style.position = 'relative';
        group.style.paddingBottom = '0';
        const rowWrap = document.createElement('span');
        rowWrap.style.display='inline-flex'; rowWrap.style.gap='4px'; rowWrap.style.alignItems='baseline';
        rowWrap.style.position = 'relative';
        const num = document.createElement('span'); num.className='ppx-fitb-num'; num.textContent = `(${idx1})`;
        const inp = document.createElement('input'); inp.type='text'; inp.className='ppx-input ppx-fitb-inp'; inp.dataset.blk = String(zero);
        inp.setAttribute('aria-label', L('Respuesta del hueco','Blank answer')+` ${idx1}`);
        const prev = values[zero] || '';
        if (prev) inp.value = prev;
        const hintBtn = document.createElement('button'); hintBtn.type='button'; hintBtn.className='ppx-ex__iconBtn ppx-tooltip'; hintBtn.setAttribute('data-tooltip', L('Mostrar pista','Show hint'));
        hintBtn.style.alignSelf = 'center';
        hintBtn.style.marginLeft = '6px';
        hintBtn.style.width = '48px';
        hintBtn.style.height = '48px';
        const hbImg = document.createElement('img');
        hbImg.className = 'ppx-ex-icon';
        hbImg.src = '/static/assets/icons/hint.svg';
        hbImg.alt = '';
        hbImg.width = 42; hbImg.height = 42;
        hintBtn.appendChild(hbImg);
        // Floating popover hint (no layout shift)
        const showHintPopover = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          // remove any existing popover/closer
          if (window.__ppxFitbHint && window.__ppxFitbHint.remove) {
            try { window.__ppxFitbHint.remove(); } catch(_){}
          }
          if (window.__ppxFitbCloser) {
            try {
              document.removeEventListener('click', window.__ppxFitbCloser, true);
              document.removeEventListener('keydown', window.__ppxFitbCloser, true);
            } catch(_){}
          }
          const pop = document.createElement('div');
          pop.className = 'ppx-ex__hint ppx-hint--noicon';
          pop.textContent = hintText;
          pop.style.position = 'fixed';
          pop.style.maxWidth = '320px';
          pop.style.fontWeight = '400';
          pop.style.fontSize = '15px';
          pop.style.lineHeight = '1.35';
          pop.style.zIndex = '2147483647';
          pop.style.background = '#eef2ff';
          pop.style.border = '1px solid #c7d2fe';
          pop.style.color = '#1d4ed8';
          pop.style.boxShadow = '0 8px 20px rgba(0,0,0,.12)';
          pop.style.borderRadius = '12px';
          pop.style.padding = '12px 14px';
          pop.style.pointerEvents = 'auto';
          pop.style.display = 'block';
          document.body.appendChild(pop);
          // position below the hint button relative to viewport
          const r = hintBtn.getBoundingClientRect();
          const popW = pop.offsetWidth || 0;
          const viewportW = window.innerWidth || document.documentElement.clientWidth;
          const left = Math.max(8, Math.min(r.left, viewportW - popW - 8));
          pop.style.left = `${left}px`;
          pop.style.top = `${r.bottom + 10}px`;
          window.__ppxFitbHint = pop;
          const closer = (ev2) => {
            if (ev2 && ev2.type === 'keydown' && ev2.key !== 'Escape') return;
            if (ev2 && ev2.type === 'click' && (pop.contains(ev2.target) || hintBtn.contains(ev2.target))) return;
            try { pop.remove(); } catch(_){}
            window.__ppxFitbHint = null;
            document.removeEventListener('click', closer, true);
            document.removeEventListener('keydown', closer, true);
            window.__ppxFitbCloser = null;
          };
          window.__ppxFitbCloser = closer;
          // delay binding closer so the initial click won't immediately close
          setTimeout(()=> {
            document.addEventListener('click', closer, true);
            document.addEventListener('keydown', closer, true);
          }, 0);
          api.hint && api.hint({ item: it.id, blank: idx1 });
        };
        if (hintText) {
          hintBtn.addEventListener('click', showHintPopover);
        } else {
          hintBtn.disabled = true;
          hintBtn.style.opacity = '0.4';
        }
        const hintBtnWrapper = document.createElement('span');
        hintBtnWrapper.style.display = 'inline-flex';
        hintBtnWrapper.appendChild(hintBtn);
        rowWrap.appendChild(num); rowWrap.appendChild(inp); rowWrap.appendChild(hintBtnWrapper);
        group.appendChild(rowWrap);
        slot.replaceWith(group);
      });
      // If there are no blanks in this item, treat it as a content-only step
      const blanksCount = (parsed.blanks && parsed.blanks.length) || (itemBlanks ? itemBlanks.length : 0);
      if (blanksCount === 0) {
        btnCheck.style.display = 'none';
        // no hints to show on this step
        inlineFB.textContent=''; inlineFB.classList.remove('is-ok','is-bad');
        // Auto-complete this step so navigation works smoothly
        if (!answers.has(it.id)) {
          answers.set(it.id, { values: [], correct: true });
        }
        btnPrev.disabled = (idx===0);
        btnNext.disabled = false;
        renderMediaBlock(it);
        updateMediaToggleForItem(it);
        updateProgress();
        api.view && api.view({ item: it.id });
        return;
      } else {
        // Ensure Check is visible for interactive items
        btnCheck.style.display = '';
      }
      // Render media and configure toggle
      renderMediaBlock(it);
      updateMediaToggleForItem(it);
      // Reset feedback for each render
      inlineFB.textContent=''; inlineFB.innerHTML=''; inlineFB.classList.remove('is-ok','is-bad');
      // If checked before, lock inputs and restore feedback
      if (answerState && answerState.locked) {
        try {
          prompt.querySelectorAll('input.ppx-fitb-inp').forEach(inp => { inp.disabled = true; inp.classList.add('is-locked'); });
          prompt.querySelectorAll('button.ppx-ex__iconBtn').forEach(btn => { btn.disabled = true; });
          btnCheck.disabled = true;
          if (answerState.feedbackHtml) {
            inlineFB.innerHTML = answerState.feedbackHtml;
            inlineFB.classList.toggle('is-ok', !!answerState.correct);
            inlineFB.classList.toggle('is-bad', !answerState.correct);
          }
        } catch(_){}
      } else {
        btnCheck.disabled = false;
      }
      btnPrev.disabled = (idx===0);
      btnNext.disabled = !answers.has(it.id);
      api.view && api.view({ item: it.id });
    }

    function check(){
      if (isSummary()) return;
      const it = items[idx];
      const txt = getText(it) || '';
      // For checking, parse from HTML so formatting and blank positions stay aligned with the rendered view
      const itemBlanks = Array.isArray(it.blanks) ? it.blanks : null;
      const parsedBase = parseHtmlWithBlanks(txt);
      const parsed = { blanks: parsedBase.blanks.map((b, i) => ({ index: i+1, options: (itemBlanks?.[i]?.options || b.options || []), meta: (itemBlanks?.[i] || null) })) };
      const typed = parsed.blanks.map((_, i)=>{
        const inline = prompt.querySelector(`input[data-blk="${i}"]`);
        return (inline && inline.value || '').trim();
      });
      const okEach = parsed.blanks.map((b, i)=>{
        const opts = b.options || [];
        const got = (typed[i] || '').toLowerCase();
        return opts.some(o => String(o).toLowerCase() === got);
      });
      const allOk = okEach.every(Boolean);
      // Save locked state + feedback for this attempt
      const answerPayload = { values: typed, correct: allOk, locked: true };
      // Show per-blank feedback inline under inputs if supplied
      try {
        const fbWrap = document.createElement('div'); fbWrap.style.marginTop = '6px';
        parsed.blanks.forEach((b, i)=>{
        const ok = !!okEach[i];
        const fb = pickFeedback(b.meta, ok);
        if (fb){
          const box = document.createElement('div');
          box.className = ok ? 'ppx-state--ok' : 'ppx-state--bad';
          box.style.margin = '4px 0';
          box.style.display = 'flex';
            box.style.alignItems = 'baseline';
            box.style.gap = '6px';
            const num = document.createElement('span'); num.className='ppx-fitb-num'; num.textContent = `(${i+1})`;
            const content = document.createElement('div'); content.innerHTML = fb;
            box.appendChild(num); box.appendChild(content);
            fbWrap.appendChild(box);
          }
        });
        inlineFB.innerHTML = '';
        inlineFB.appendChild(fbWrap);
        answerPayload.feedbackHtml = inlineFB.innerHTML;
      } catch(_) { inlineFB.textContent = allOk ? L('Correcto','Correct') : L('Incorrecto','Incorrect'); }
      inlineFB.classList.toggle('is-ok', allOk); inlineFB.classList.toggle('is-bad', !allOk);
      answers.set(it.id, answerPayload);
      saveCache();
      // Lock inputs after check
      try {
        prompt.querySelectorAll('input.ppx-fitb-inp').forEach(inp => { inp.disabled = true; inp.classList.add('is-locked'); });
        prompt.querySelectorAll('button.ppx-ex__iconBtn').forEach(btn => { btn.disabled = true; });
        btnCheck.disabled = true;
      } catch(_){}
      btnNext.disabled = false;
      api.answer && api.answer({ item: it.id, correct: allOk, meta: { values: typed } });
      updateProgress();
    }

    btnCheck.addEventListener('click', check);
    btnPrev.addEventListener('click', ()=> { if (isSummary()) { idx = Math.max(0, items.length-1); render(); } else { idx = Math.max(0, idx-1); render(); } });
    btnNext.addEventListener('click', ()=> { if (isSummary()) return; if (idx < items.length-1) { idx += 1; render(); } else { idx = items.length; render(); } });

    render();

    if (context && context.startAt === 'summary' && answers.size) {
      idx = items.length;
      render();
    }
  }

  // Register with PPX core (with late fallback)
  (function ensureRegister(){
    if (window.PPX && typeof window.PPX.registerType === 'function') {
      window.PPX.registerType('fitb', plugin);
      try { window.PPX_FITB_READY = true; } catch(_){}
      try { window.dispatchEvent(new CustomEvent('ppx:fitb:ready')); } catch(_){}
      return;
    }
    // Fallback on window load in case core initializes later
    window.addEventListener('load', function late(){
      try {
        if (window.PPX && typeof window.PPX.registerType === 'function') {
          window.PPX.registerType('fitb', plugin);
          try { window.PPX_FITB_READY = true; } catch(_){}
          try { window.dispatchEvent(new CustomEvent('ppx:fitb:ready')); } catch(_){}
          window.removeEventListener('load', late);
        }
      } catch(_){}
    });
  })();
})();
