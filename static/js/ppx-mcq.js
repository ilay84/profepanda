/* static/js/ppx-mcq.js */
(function () {
  if (!window.PPX) { console.error('[PPX MCQ] PPX core not found'); return; }

  function legacyPlugin({ data, lang, api }) {
    const L = (es, en) => api.t(es, en);
    let idx = 0;
    let answers = new Map(); // itemId -> Set(optionIndex)
    let results = new Map(); // itemId -> { correct:boolean, selected:Set<number> }
    let hintsUsed = 0;
    let attempts = 1;
    let summaryShown = false;

    // Cache (persist progress)
    const exType = 'mcq';
    const exSlug = data.slug || (data.id && String(data.id).split('/').pop()) || 'unknown';
    const exVer  = (data.version ?? 'current');
    const cacheKey = `ppx:${exType}:${exSlug}:${exVer}`;

    function saveCache(){
      try {
        const payload = {
          idx,
          hintsUsed,
          attempts,
          answers: Array.from(answers.entries()).map(([k,s]) => [k, Array.from(s||[])]),
          results: Array.from(results.entries()).map(([k,v]) => [k, { correct: !!v.correct, selected: Array.from(v.selected||[]) }]),
          summaryShown
        };
        localStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch {}
    }
    function clearCache(){ try { localStorage.removeItem(cacheKey); } catch {} }
    function loadCache(){
      try {
        const raw = localStorage.getItem(cacheKey); if (!raw) return;
        const parsed = JSON.parse(raw); if (!parsed || typeof parsed !== 'object') return;
        idx = Math.max(0, Math.min(items.length-1, Number(parsed.idx)||0));
        hintsUsed = Math.max(0, Number(parsed.hintsUsed)||0);
        attempts = Math.max(1, Number(parsed.attempts)||1);
        summaryShown = !!parsed.summaryShown;
        answers.clear(); (parsed.answers||[]).forEach(([k,arr])=>{ if(k) answers.set(k, new Set(arr||[])); });
        results.clear(); (parsed.results||[]).forEach(([k,v])=>{ if(k&&v) results.set(k,{correct:!!v.correct, selected:new Set(v.selected||[])}); });
        // If user had completed previously (all results present) or summary was shown,
        // reopen directly to the summary slide until they restart.
        if (summaryShown || results.size === items.length) {
          idx = items.length; // sentinel for summary
        }
      } catch {}
    }

    const items = (data.items || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Defensive: if no items, show an inline error instead of rendering a blank modal
    if (!items.length) {
      const msg = document.createElement('div');
      msg.className = 'ppx-state--bad';
      msg.setAttribute('role', 'alert');
      msg.innerHTML = `<strong>${L('Sin ítems para mostrar.', 'No items to display.')}</strong>`;
      api.setBody(msg);
      api.setActions({
        next: { label: L('Cerrar', 'Close'), variant: 'primary', onClick: () => window.PPXModal && window.PPXModal.close && window.PPXModal.close() }
      });
      api.setProgress(1);
      return function cleanup(){};
    }

    function isMulti(item) {
      const opts = item.options_es || item.options_en || item.options || [];
      return opts.filter(o => !!o.correct).length > 1;
    }

    function getQuestion(item) {
      const k = (lang === 'en') ? 'question_en' : 'question_es';
      const alt = (lang === 'en') ? 'question_es' : 'question_en';
      return item[k] || item[alt] || '';
    }

    function getOptions(item) {
      // Options are language-specific arrays: options_es/options_en
      const k = (lang === 'en') ? 'options_en' : 'options_es';
      const alt = (lang === 'en') ? 'options_es' : 'options_en';
      const arr = item[k] || item[alt] || item.options || [];
      // Normalize to {text, correct, feedback?}
      return arr.map(o => ({
        text: (typeof o === 'string') ? o : (o.text || ''),
        correct: !!(o.correct),
        feedback: o.feedback || ''
      }));
    }

    function getHint(item) {
      const k = (lang === 'en') ? 'hint_en' : 'hint_es';
      const alt = (lang === 'en') ? 'hint_es' : 'hint_en';
      return item[k] || item[alt] || '';
    }

    // UI nodes
    const root = document.createElement('div');
    root.className = 'ppx-ex ppx-ex--mcq';

    const srLive = document.createElement('div');
    srLive.setAttribute('aria-live', 'polite');
    srLive.className = 'ppx-visually-hidden';
    root.appendChild(srLive);

    const headRow = document.createElement('div');
    headRow.className = 'ppx-row';
    headRow.style.alignItems = 'center';
    headRow.style.justifyContent = 'space-between';

    const counter = document.createElement('div');
    counter.className = 'ppx-chip';
    headRow.appendChild(counter);

    const hintBtn = document.createElement('button');
    hintBtn.className = 'ppx-btn ppx-btn--ghost';
    hintBtn.type = 'button';
    hintBtn.textContent = L('Pista', 'Hint');
    hintBtn.style.marginLeft = 'auto';
    hintBtn.hidden = true;
    headRow.appendChild(hintBtn);

    const card = document.createElement('div');
    card.className = 'ppx-card';
    card.style.padding = '16px';

    // Optional media block + toggle (parity with TF)
    const mediaToggle = document.createElement('button');
    mediaToggle.type = 'button';
    mediaToggle.className = 'ppx-ex__media-toggle ppx-ex__iconBtn ppx-tooltip';
    mediaToggle.hidden = true;
    mediaToggle.setAttribute('aria-expanded', 'true');

    const media = document.createElement('div');
    media.className = 'ppx-media-block';

    const qEl = document.createElement('div');
    qEl.style.fontSize = '1.05rem';
    qEl.style.lineHeight = '1.55';
    qEl.style.fontWeight = '600';

    const optsWrap = document.createElement('div');
    optsWrap.className = 'ppx-col';
    optsWrap.style.gap = '10px';
    optsWrap.style.marginTop = '10px';

    const feedback = document.createElement('div');
    feedback.style.display = 'none';
    feedback.setAttribute('role', 'status');

    card.appendChild(qEl);
    card.appendChild(optsWrap);

    // TF keeps counters near the dots; hide this header row in MCQ
    // root.appendChild(headRow);
    // Place media controls above the question card
    root.appendChild(mediaToggle);
    root.appendChild(media);
    root.appendChild(card);

    // Summary host (hidden except on final slide)
    const summaryWrap = document.createElement('div');
    summaryWrap.style.display = 'none';
    root.appendChild(summaryWrap);

    // In‑content scaffold (match TF layout)
    const inlineFB = document.createElement('div');
    inlineFB.className = 'ppx-ex__inline-feedback';
    root.appendChild(inlineFB);

    const hintToggle = document.createElement('button');
    hintToggle.className = 'ppx-ex__hint-toggle';
    hintToggle.type = 'button';
    hintToggle.textContent = L('Ver pista', 'Show hint');
    hintToggle.hidden = true;
    hintToggle.setAttribute('aria-expanded', 'false');
    const hintBlock = document.createElement('div');
    hintBlock.className = 'ppx-ex__hint';
    hintBlock.hidden = true;
    root.appendChild(hintToggle);
    root.appendChild(hintBlock);

    const progressWrap = document.createElement('div');
    progressWrap.className = 'ppx-ex__progress';
    const fraction = document.createElement('div'); fraction.className = 'ppx-ex__fraction';
    const dots = document.createElement('div'); dots.className = 'ppx-ex__dots';
    progressWrap.appendChild(fraction); progressWrap.appendChild(dots);
    const btnResults = document.createElement('button');
    btnResults.type='button'; btnResults.className='ppx-wbtn ppx-wbtn--primary ppx-ex__results';
    btnResults.textContent = L('Ver resultados','See results'); btnResults.hidden = true;
    // Jump to the summary slide (sentinel idx === items.length), like TF
    btnResults.addEventListener('click', (e)=> { try { e.preventDefault(); e.stopPropagation && e.stopPropagation(); } catch(_){} attemptSummary(); });
    progressWrap.appendChild(btnResults);
    const btnRestart = document.createElement('button');
    btnRestart.type='button'; btnRestart.className='ppx-wbtn';
    btnRestart.textContent = L('Reiniciar','Restart'); btnRestart.hidden = true;
    btnRestart.addEventListener('click', ()=> resetAll());
    progressWrap.appendChild(btnRestart);
    // Footer row groups progress + arrows (match TF)
    const nav = document.createElement('div'); nav.className = 'ppx-ex__nav';
    const btnPrev = document.createElement('button'); btnPrev.type='button'; btnPrev.className='ppx-ex__nav-btn ppx-ex__nav-btn--prev';
    const btnNext = document.createElement('button'); btnNext.type='button'; btnNext.className='ppx-ex__nav-btn ppx-ex__nav-btn--next';
    nav.appendChild(btnPrev); nav.appendChild(btnNext);
    const footer = document.createElement('div'); footer.className = 'ppx-ex__footer';
    footer.appendChild(progressWrap); footer.appendChild(nav);
    const btnCheck = document.createElement('button');
    btnCheck.type = 'button';
    btnCheck.className = 'ppx-wbtn';
    btnCheck.textContent = L('Comprobar', 'Check');
    btnCheck.disabled = true;
    // Place Check above feedback and before footer (so feedback sits under the button)
    root.appendChild(btnCheck);
    root.appendChild(feedback);
    root.appendChild(footer);

    // First-run instructions (like Dictation/FITB)
    (function(){
      try {
        const slug = data.slug || (data.id && String(data.id).split('/').pop()) || 'mcq';
        const introKey = 'ppx:intro:dismissed:mcq/' + String(slug);
        const langIsEn = (String(lang||'es').toLowerCase().startsWith('en'));
        const instr = langIsEn
          ? ((data.instructions_en) || (data.instructions_es) || '')
          : ((data.instructions_es) || (data.instructions_en) || '');
        const shouldShow = !!instr && !localStorage.getItem(introKey);
        if (shouldShow) {
          const intro = document.createElement('div'); intro.className='ppx-card'; intro.style.padding='18px 20px'; intro.style.margin='0 auto'; intro.style.maxWidth='820px';
          const h = document.createElement('h2'); h.textContent = L('Instrucciones','Instructions'); h.style.marginTop='4px';
          const body = document.createElement('div'); body.className='ppx-p'; body.innerHTML = instr;
          const actions = document.createElement('div'); actions.className='ppx-row'; actions.style.justifyContent='center'; actions.style.marginTop='12px';
          const startBtn = document.createElement('button'); startBtn.type='button'; startBtn.className='ppx-btn ppx-btn--primary'; startBtn.textContent = L('Comenzar','Start');
          actions.appendChild(startBtn);
          intro.appendChild(h); intro.appendChild(body); intro.appendChild(actions);
          if (window.PPXModal && typeof PPXModal.setBody==='function') {
            PPXModal.setBody(intro);
          } else {
            root.style.display='none'; root.parentNode && root.parentNode.insertBefore(intro, root);
          }
          startBtn.addEventListener('click', function(ev){
            try { ev && ev.preventDefault(); ev && ev.stopPropagation(); } catch(_){}
            try { localStorage.setItem(introKey,'1'); } catch(_){}
            if (window.PPXModal && typeof PPXModal.setBody==='function') {
              PPXModal.setBody(root);
            } else {
              intro.remove(); root.style.display='';
            }
            try { const m=document.querySelector('.ppx-modal'), o=document.querySelector('.ppx-modal__overlay'); if(m&&o){ m.classList.add('is-open'); o.classList.add('is-open'); m.setAttribute('aria-hidden','false'); } } catch(_){ }
          });
        } else {
          api.setBody(root);
        }
      } catch(_) { api.setBody(root); }
    })();

    function currentItem() { return items[idx]; }

    function updateCounter() { counter.textContent = `${idx + 1} / ${items.length}`; }

    function updateProgressUI(){
      try { const atSummary = (idx === items.length); fraction.textContent = atSummary ? `${items.length} / ${items.length}` : `${idx + 1} / ${items.length}`; } catch(_){}
      try {
        dots.innerHTML = '';
        for (let i=0;i<items.length;i++){
          const d = document.createElement('button'); d.type='button'; d.className='ppx-ex__dot' + (i===idx ? ' is-current' : (results.has(items[i].id) ? ' is-done' : ''));
          d.addEventListener('click', ()=>{ idx = i; renderItem(); });
          dots.appendChild(d);
        }
      } catch (_){ }
      try { btnPrev.disabled = (idx === 0); } catch(_){ }
      try { btnNext.disabled = !results.has(currentItem().id); } catch(_){ }
      const allAnswered = (results.size === items.length);
      try { btnResults.hidden = !(allAnswered && !summaryShown); } catch(_){ }
      try { btnRestart.hidden = !allAnswered; } catch(_){ }
    }

    // Render media grid for current item (subset of TF logic)
    function renderMediaBlock(item){
      try { media.innerHTML = ''; } catch(_){}
      try {
        const arr = (item && (item.media || item.medias || item.image || item.images)) || [];
        const list = Array.isArray(arr) ? arr : (arr ? [arr] : []);
        if (!list.length) return;
        const grid = document.createElement('div');
        grid.className = 'ppx-media-grid';
        list.forEach((m) => {
          if (!m || !m.src) return;
          const kind = (m.kind === 'audio' || m.kind === 'video') ? m.kind : 'image';
          const tile = document.createElement('div'); tile.className = 'ppx-media-tile';
          if (kind === 'image') {
            const box = document.createElement('div'); box.className = 'ppx-imgbox'; box.setAttribute('data-ppx-lightbox','true');
            const img = document.createElement('img'); img.className = 'ppx-media-img'; img.src = m.src; img.alt = (lang === 'en') ? (m.alt_en || '') : (m.alt_es || '');
            box.appendChild(img); tile.appendChild(box);
          } else if (kind === 'audio') {
            const row = document.createElement('div'); row.className = 'ppx-media-audio';
            const a = document.createElement('audio'); a.controls = true; a.src = m.src; a.style.width = '100%';
            row.appendChild(a); tile.appendChild(row);
          } else {
            const row = document.createElement('div'); row.className = 'ppx-media-video';
            const v = document.createElement('video'); v.controls = true; v.src = m.src; v.style.maxWidth = '100%';
            row.appendChild(v); tile.appendChild(row);
          }
          grid.appendChild(tile);
        });
        media.appendChild(grid);
      } catch(_){}
    }

    function itemHasMedia(item){
      const raw = (item && (item.media || item.medias || item.image || item.images)) || item?.media_url || item?.image_url || null;
      if (!raw) return false;
      if (typeof raw === 'string') return raw.trim().length > 0;
      if (Array.isArray(raw)) {
        return raw.some((m) => {
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

    function updateMediaToggleForItem(item){
      const onSummary = (idx === items.length);
      const hasRendered = !onSummary && !!media.querySelector('.ppx-media-grid, .ppx-media-audio, .ppx-media-video, img, audio, video');
      mediaToggle.hidden = !hasRendered;
      if (!hasRendered) { try { media.hidden = true; } catch(_){} }
      mediaToggle.style.display = mediaToggle.hidden ? 'none' : '';
      if (mediaToggle.hidden) return;
      const isHidden = media.hidden === true;
      const visibleLabel = isHidden ? L('Mostrar multimedia','Show media') : L('Ocultar multimedia','Hide media');
      const icon = isHidden ? '/static/assets/icons/preview.svg' : '/static/assets/icons/close_preview.svg';
      mediaToggle.innerHTML = '<img class="ppx-ex-icon" src="' + icon + '" alt="" width="36" height="36">';
      mediaToggle.setAttribute('aria-label', visibleLabel);
      mediaToggle.setAttribute('title', visibleLabel);
      mediaToggle.setAttribute('data-tooltip', visibleLabel);
      mediaToggle.setAttribute('aria-expanded', String(!isHidden));
    }
    mediaToggle.addEventListener('click', () => {
      if (idx === items.length) return; // ignore on summary
      const item = currentItem();
      if (!itemHasMedia(item)) return;
      media.hidden = !media.hidden;
      updateMediaToggleForItem(item);
    });

    function selectedSetFor(item) {
      let s = answers.get(item.id);
      if (!s) { s = new Set(); answers.set(item.id, s); }
      return s;
    }

    function toggleSelect(item, i) {
      const multi = isMulti(item);
      const set = selectedSetFor(item);
      if (multi) {
        if (set.has(i)) set.delete(i); else set.add(i);
      } else {
        set.clear(); set.add(i);
      }
      try {
        const hasSel = (selectedSetFor(item).size > 0);
        btnCheck.disabled = !hasSel;
        btnCheck.className = hasSel ? 'ppx-btn' : 'ppx-wbtn';
      } catch(_){ }
    }

    function renderOptions(item) {
      const options = getOptions(item);
      const multi = isMulti(item);
      const set = selectedSetFor(item);
      optsWrap.innerHTML = '';

      options.forEach((opt, i) => {
        const row = document.createElement('label');
        row.className = 'ppx-row ppx-mcq__opt';
        row.style.alignItems = 'center';
        row.style.gap = '10px';
        row.style.cursor = 'pointer';
        row.dataset.index = String(i);

        const box = document.createElement('input');
        box.type = multi ? 'checkbox' : 'radio';
        box.name = `ppx-mcq-${item.id}`;
        box.checked = set.has(i);
        box.addEventListener('change', () => toggleSelect(item, i));

        const text = document.createElement('div');
        text.style.flex = '1';
        text.textContent = opt.text;

        row.appendChild(box);
        row.appendChild(text);
        optsWrap.appendChild(row);
      });
    }

    function validate(item) {
      const options = getOptions(item);
      const set = selectedSetFor(item);
      if (set.size === 0) return { ok: false, message: L('Elegí al menos una opción.', 'Choose at least one option.') };
      const correctIdx = new Set(options.map((o, i) => o.correct ? i : -1).filter(i => i >= 0));
      const sameSize = set.size === correctIdx.size;
      const allMatch = sameSize && Array.from(set).every(i => correctIdx.has(i));
      return {
        ok: allMatch,
        correctSet: correctIdx,
        selected: new Set(set),
        options
      };
    }

    function renderFeedback(res, item) {
      const options = res.options;
      // Show feedback as a callout like TF hints (green/red box)
      feedback.style.display = 'block';
      feedback.className = res.ok ? 'ppx-state--ok' : 'ppx-state--bad';
      feedback.style.marginTop = '12px';
      feedback.style.textAlign = 'left';
      try { feedback.style.justifySelf = 'stretch'; } catch(_) {}
      feedback.style.width = 'min(720px, 100%)';

      // Per-answer feedback lines (only for selected options, show their feedback if present)
      const lines = Array.from(res.selected).map(i => {
        const fb = options[i]?.feedback || '';
        return fb ? `<li>${fb}</li>` : '';
      }).filter(Boolean);

      const summaryText = res.ok
        ? L('¡Correcto!', 'Correct!')
        : L('Hay alguna opción incorrecta o falta seleccionar una correcta.', 'Some choices are wrong or missing.');

      feedback.innerHTML = `
        <div><strong>${summaryText}</strong></div>
        ${lines.length ? `<ul style="margin:.5rem 0 0 .9rem;">${lines.join('')}</ul>` : ''}
      `;
      srLive.textContent = summaryText;
      // Overwrite content to show only authored sentences, no heading/bullets
      try {
        const __fbs = Array.from(res.selected).map(i => (options[i]?.feedback || '').trim()).filter(Boolean);
        if (__fbs.length) {
          const __html = __fbs.map(t => `<div>${t}</div>`).join('');
          feedback.innerHTML = __html;
          const tmp = document.createElement('div'); tmp.innerHTML = __html; srLive.textContent = (tmp.textContent || '').trim();
        } else {
          // If no authored feedback, hide the callout
          feedback.style.display = 'none';
        }
      } catch(_){}

      // Color selected options: red for wrong selections, green for correct selections
      try {
        const rows = Array.from(optsWrap.querySelectorAll('.ppx-mcq__opt'));
        rows.forEach(r => { r.style.color = ''; const input = r.querySelector('input'); if (input) input.style.accentColor = ''; });
        Array.from(res.selected).forEach((idx) => {
          const row = optsWrap.querySelector(`.ppx-mcq__opt[data-index="${idx}"]`);
          if (!row) return;
          const ok = !!options[idx]?.correct;
          const colorOK = getComputedStyle(document.documentElement).getPropertyValue('--ppx-color-success') || '#80ac5f';
          const colorBAD = getComputedStyle(document.documentElement).getPropertyValue('--ppx-color-danger') || '#c46374';
          row.style.color = ok ? colorOK.trim() : colorBAD.trim();
          const input = row.querySelector('input');
          if (input) input.style.accentColor = ok ? '#80ac5f' : '#c46374';
        });
      } catch (_) {}
    }

    function check() {
      const item = currentItem();
      const res = validate(item);
      if (!res.ok) {
        renderFeedback(res, item);
        // Even a wrong answer counts as an attempt event
        api.answer({ item: item.id, correct: false, meta: { selected: Array.from(res.selected) } });
        results.set(item.id, { correct: false, selected: res.selected });
        // Allow moving on after checking, even if wrong
      updateProgressUI();
      // Lock inputs and disable Check in review state
      try { optsWrap.querySelectorAll('input').forEach(i => i.disabled = true); } catch(_){ }
      try { btnCheck.disabled = true; btnCheck.textContent = L('Verificado', 'Checked'); } catch(_){ }
      saveCache();
      return;
      }
      renderFeedback(res, item);
      api.answer({ item: item.id, correct: true, meta: { selected: Array.from(res.selected) } });
      results.set(item.id, { correct: true, selected: res.selected });
      updateProgressUI();
      // Lock inputs and disable Check in review state
      try { optsWrap.querySelectorAll('input').forEach(i => i.disabled = true); } catch(_){ }
      try { btnCheck.disabled = true; btnCheck.textContent = L('Verificado', 'Checked'); } catch(_){ }
      saveCache();
    }

    function go(dir) {
      idx = Math.max(0, Math.min(items.length - 1, idx + dir));
      renderItem();
      saveCache();
    }

    function resetAll() {
      answers.clear();
      results.clear();
      hintsUsed = 0;
      attempts += 1;
      idx = 0;
      renderItem();
      api.retry();
      summaryShown = false;
      saveCache();
    }

    function complete() {
      let correct = 0; items.forEach(it => { if (results.get(it.id)?.correct) correct += 1; });
      const score = Math.round((correct / (items.length || 1)) * 100);

      const wrap = document.createElement('div');
      wrap.className = 'ppx-card';
      wrap.style.padding = '16px';
      wrap.style.width = '80%';
      wrap.style.maxWidth = 'none';
      wrap.style.margin = '0 auto';

      const hTitle = document.createElement('h3'); hTitle.style.margin='0 0 .25rem 0'; hTitle.style.textAlign='center'; hTitle.textContent = L('Resumen','Summary');
      const hMeta = document.createElement('p'); hMeta.style.margin='.25rem 0 1rem 0'; hMeta.style.textAlign='center';
      const scoreBadge = document.createElement('span'); scoreBadge.className='ppx-score';
      if (score >= 90) scoreBadge.classList.add('ppx-score--green'); else if (score >= 80) scoreBadge.classList.add('ppx-score--blue'); else if (score >= 70) scoreBadge.classList.add('ppx-score--orange'); else scoreBadge.classList.add('ppx-score--red');
      scoreBadge.textContent = `${score}%`;
      const metaLabel = document.createElement('span'); metaLabel.textContent = `${L('Puntaje','Score')}: `;
      const metaTail = document.createElement('span'); metaTail.textContent = ` - ${correct}/${items.length}`;
      hMeta.appendChild(metaLabel); hMeta.appendChild(scoreBadge); hMeta.appendChild(metaTail);
      wrap.appendChild(hTitle); wrap.appendChild(hMeta);

      const list = document.createElement('div'); list.setAttribute('role','list'); list.style.display='grid'; list.style.gap='10px';
      items.forEach((it) => {
        const res = results.get(it.id) || { correct:false, selected:new Set() };
        const ok = !!res.correct; const question = getQuestion(it) || '';
        const details = document.createElement('details'); details.className='ppx-acc'; details.style.border='1px solid var(--ppx-color-line,#e5e7eb)'; details.style.borderRadius='12px'; details.style.overflow='hidden'; details.style.background='#fff';
        const sum = document.createElement('summary'); sum.style.cursor='pointer'; sum.style.listStyle='none'; sum.style.padding='12px 14px'; sum.style.display='flex'; sum.style.alignItems='center'; sum.style.gap='10px';
        const stmtEl = document.createElement('span'); stmtEl.style.fontWeight='700'; stmtEl.style.flex='1 1 auto'; stmtEl.textContent = question;
        const chipState = document.createElement('span'); chipState.className = `ppx-chip ${ok ? 'ppx-chip--ok':'ppx-chip--bad'}`; chipState.style.whiteSpace='nowrap'; chipState.style.flex='0 0 auto'; chipState.textContent = ok ? L('Correcto','Correct') : L('Incorrecto','Incorrect');
        sum.style.flexWrap = 'nowrap'; stmtEl.style.minWidth = '0';
        sum.appendChild(stmtEl); sum.appendChild(chipState);
        const panel = document.createElement('div'); panel.style.padding='12px 14px 14px 14px';
        const ul = document.createElement('ul'); ul.style.margin='0 0 10px 1rem';
        const opts = getOptions(it);
        (Array.from(res.selected || [])).forEach(i => { const li = document.createElement('li'); const o = opts[i] || { text:'', feedback:'' }; li.textContent = o.text || ''; if (o.feedback) { const fb = document.createElement('div'); fb.className = ok ? 'ppx-state--ok' : 'ppx-state--bad'; fb.style.marginTop='6px'; fb.innerHTML = o.feedback; li.appendChild(fb); } ul.appendChild(li); });
        if (ul.childNodes.length) panel.appendChild(ul);
        details.appendChild(sum); details.appendChild(panel); list.appendChild(details);
      });
      wrap.appendChild(list);

      const restartRow = document.createElement('div'); restartRow.style.display='flex'; restartRow.style.justifyContent='center'; restartRow.style.marginTop='14px';
      const restartBtn = document.createElement('button'); restartBtn.type='button'; restartBtn.className='ppx-wbtn ppx-wbtn--orange'; restartBtn.textContent = L('Reiniciar','Restart'); restartBtn.addEventListener('click', ()=> resetAll()); restartRow.appendChild(restartBtn);
      wrap.appendChild(restartRow);

      api.setBody(wrap);
      api.setProgress(1);
      api.complete({ score, correct, total: items.length, hints_used: hintsUsed, attempts });
      summaryShown = true;
      saveCache();
    }

    // In-content navigation
    function isSummary(){ return idx === items.length; }
    function attemptSummary(){ idx = items.length; renderItem(); }
    btnPrev.addEventListener('click', ()=> { if (isSummary()) { idx = Math.max(0, items.length - 1); renderItem(); } else { go(-1); } });
    btnNext.addEventListener('click', ()=> { if (isSummary()) return; if (idx < items.length - 1) go(1); else attemptSummary(); });
    btnCheck.addEventListener('click', ()=> check());

    function renderItem() {
      updateCounter();

      // Summary slide handling (renders inside summaryWrap and hides exercise UI)
      if (isSummary()) {
        // Hide exercise controls
        card.style.display = 'none';
        feedback.style.display = 'none';
        inlineFB.style.display = 'none';
        hintToggle.style.display = 'none';
        hintBlock.style.display = 'none';
        btnCheck.style.display = 'none';
        mediaToggle.hidden = true; mediaToggle.style.display = 'none'; media.innerHTML = '';
        try { media.hidden = false; } catch(_){}

        // Build summary content
        summaryWrap.style.display = '';
        summaryWrap.innerHTML = '';
        const correct = Array.from(results.values()).filter(v => v && v.correct).length;
        const score = Math.round((correct / (items.length || 1)) * 100);

        const wrap = document.createElement('div');
        wrap.className = 'ppx-card';
        wrap.style.padding = '16px';
        wrap.style.maxWidth = '820px';
        wrap.style.margin = '0 auto';

        const hTitle = document.createElement('h3'); hTitle.style.margin='0 0 .25rem 0'; hTitle.style.textAlign='center'; hTitle.textContent = L('Resumen','Summary');
        const hMeta = document.createElement('p'); hMeta.style.margin='.25rem 0 1rem 0'; hMeta.style.textAlign='center';
        const scoreBadge = document.createElement('span'); scoreBadge.className='ppx-score';
        if (score >= 90) scoreBadge.classList.add('ppx-score--green'); else if (score >= 80) scoreBadge.classList.add('ppx-score--blue'); else if (score >= 70) scoreBadge.classList.add('ppx-score--orange'); else scoreBadge.classList.add('ppx-score--red');
        scoreBadge.textContent = `${score}%`;
        const metaLabel = document.createElement('span'); metaLabel.textContent = `${L('Puntaje','Score')}: `;
        const metaTail = document.createElement('span'); metaTail.textContent = ` - ${correct}/${items.length}`;
        hMeta.appendChild(metaLabel); hMeta.appendChild(scoreBadge); hMeta.appendChild(metaTail);
        wrap.appendChild(hTitle); wrap.appendChild(hMeta);

        const list = document.createElement('div'); list.setAttribute('role','list'); list.style.display='grid'; list.style.gap='10px';
        items.forEach((it) => {
          const r = results.get(it.id) || { correct:false, selected:new Set() };
          const ok = !!r.correct; const question = getQuestion(it) || '';
          const details = document.createElement('details'); details.className='ppx-acc'; details.style.border='1px solid var(--ppx-color-line,#e5e7eb)'; details.style.borderRadius='12px'; details.style.overflow='hidden'; details.style.background='#fff';
          const sum = document.createElement('summary'); sum.style.cursor='pointer'; sum.style.listStyle='none'; sum.style.padding='12px 14px'; sum.style.display='flex'; sum.style.alignItems='center'; sum.style.gap='10px';
          const stmtEl = document.createElement('span'); stmtEl.style.fontWeight='700'; stmtEl.style.flex='1 1 auto'; stmtEl.textContent = question;
          const chipState = document.createElement('span'); chipState.className = `ppx-chip ${ok ? 'ppx-chip--ok':'ppx-chip--bad'}`; chipState.textContent = ok ? L('Correcto','Correct') : L('Incorrecto','Incorrect');
        // Only show the state pill; the chevron is provided via CSS (::after)
        sum.appendChild(stmtEl);
        sum.appendChild(chipState);
          const panel = document.createElement('div'); panel.style.padding='12px 14px 14px 14px';
        // Your answer: <bold>
        const opts = getOptions(it);
        const pickedTexts = Array.from(r.selected || []).map(i => (opts[i]?.text || '')).filter(Boolean);
        const ansRow = document.createElement('div');
        const label = document.createElement('span'); label.style.fontWeight='600'; label.textContent = L('Tu respuesta: ','Your answer: ');
        const ans = document.createElement('strong'); ans.textContent = pickedTexts.join('; ');
        ansRow.appendChild(label); ansRow.appendChild(ans);
        panel.appendChild(ansRow);
        // Authored feedback copy (callout)
        const fbTexts = Array.from(r.selected || []).map(i => (opts[i]?.feedback || '').trim()).filter(Boolean);
        if (fbTexts.length) {
          const fbBox = document.createElement('div'); fbBox.className = ok ? 'ppx-state--ok' : 'ppx-state--bad'; fbBox.style.marginTop='8px'; fbBox.innerHTML = fbTexts.map(t=>`<div>${t}</div>`).join(''); panel.appendChild(fbBox);
        }
          details.appendChild(sum); details.appendChild(panel); list.appendChild(details);
        });
        wrap.appendChild(list);

        const restartRow = document.createElement('div'); restartRow.style.display='flex'; restartRow.style.justifyContent='center'; restartRow.style.marginTop='14px';
        const restartBtn = document.createElement('button'); restartBtn.type='button'; restartBtn.className='ppx-wbtn ppx-wbtn--orange'; restartBtn.textContent = L('Reiniciar','Restart'); restartBtn.addEventListener('click', ()=> { resetAll(); }); restartRow.appendChild(restartBtn);
        wrap.appendChild(restartRow);

        summaryWrap.appendChild(wrap);

        // Disable navigation on summary (stay until Restart)
        btnNext.disabled = true; btnNext.setAttribute('aria-disabled','true');
        btnPrev.disabled = true; btnPrev.setAttribute('aria-disabled','true');
        // Hide progress-level controls that duplicate summary controls
        try { btnResults.hidden = true; } catch(_){}
        try { btnRestart.hidden = true; } catch(_){}

        // Analytics complete once
        if (!summaryShown) {
          api.setProgress(1);
          api.complete({ score, correct, total: items.length, hints_used: hintsUsed, attempts });
          summaryShown = true; try { localStorage.setItem(cacheKey, JSON.stringify({ ...(JSON.parse(localStorage.getItem(cacheKey)||'{}')), summaryShown:true })); } catch(_){ }
        }
        return;
      }

      // Regular slide
      summaryWrap.style.display = 'none';
      card.style.display = '';
      inlineFB.style.display = '';
      btnCheck.style.display = '';

      // Media for current item
      const item = currentItem();
      try { renderMediaBlock(item); } catch(_){}
      updateMediaToggleForItem(item);

      // Question
      qEl.textContent = getQuestion(item);

      // Options
      renderOptions(item);

      // Hint availability (toggle like TF)
      const hint = getHint(item);
      if (!hint) { hintToggle.hidden = true; hintBlock.hidden = true; }
      else {
        hintToggle.hidden = false; hintBlock.hidden = true; hintBlock.textContent = '';
        try { hintBlock.innerHTML = `<em>${hint}</em>`; } catch { const em=document.createElement('em'); em.textContent=String(hint); hintBlock.appendChild(em); }
        hintToggle.textContent = L('Ver pista','Show hint'); hintToggle.setAttribute('aria-expanded','false');
        hintToggle.onclick = () => { const willShow = hintBlock.hidden; hintBlock.hidden = !willShow; hintToggle.setAttribute('aria-expanded', String(willShow)); hintToggle.textContent = willShow ? L('Ocultar pista','Hide hint') : L('Ver pista','Show hint'); if (willShow) { hintsUsed += 1; api.hint({ item: item.id }); srLive.textContent = hint; } };
      }

      // Restore prior result feedback if any
      const res = results.get(item.id);
      if (res) {
        renderFeedback(res, item);
        // Rehydrate review state: lock inputs and mark as checked
        try { optsWrap.querySelectorAll('input').forEach(i => i.disabled = true); } catch(_){ }
        try { btnCheck.disabled = true; btnCheck.textContent = L('Verificado', 'Checked'); } catch(_){ }
      } else {
        feedback.style.display = 'none';
        feedback.className = '';
        feedback.innerHTML = '';
        srLive.textContent = '';
        // Ensure inputs are enabled; Check reflects current selection
        try { optsWrap.querySelectorAll('input').forEach(i => i.disabled = false); } catch(_){ }
        try {
          const hasSel = (selectedSetFor(item).size > 0);
          btnCheck.disabled = !hasSel;
          btnCheck.className = hasSel ? 'ppx-btn' : 'ppx-wbtn';
          btnCheck.textContent = L('Comprobar', 'Check');
        } catch(_){ }
      }

      // Progress: proportion of answered results or index position
      const done = Array.from(results.keys()).length;
      api.setProgress(Math.max(done / items.length, idx / items.length));
      updateProgressUI();

      // Keyboard affordance: Enter submits check
      root.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); check(); }
      };
    }

    // Load cache then render
    try { loadCache(); } catch(_){}
    renderItem();

    return function cleanup() {
      try { hintToggle.onclick = null; } catch(_){}
      root.onkeydown = null;
    };
  }

  // Expose legacy implementation so other modules (object wrapper) can reuse it
  try { window.PPX_MCQ_LEGACY = legacyPlugin; } catch(_){}
  window.PPX.registerType('mcq', legacyPlugin);
})();


// -- Object-style API wrapper for MCQ (adapts legacy implementation)
(function(){
  if (!window.PPX) return;
  const Obj = {
    _cleanup: null,
    init(ctx){
      if (!ctx.api || typeof ctx.api.t !== 'function') {
        ctx.api = Object.assign({ t: (es,en)=> (ctx.lang === 'en' ? (en ?? es) : (es ?? en)) }, ctx.api || {});
      }
      const impl = (window.PPX_MCQ_LEGACY || null);
      if (!impl) {
        const msg = document.createElement('div');
        msg.className = 'ppx-state--bad';
        msg.setAttribute('role', 'alert');
        msg.innerHTML = '<strong>MCQ plugin missing.</strong>';
        try { ctx.api.setBody(msg); } catch(_){}
        this._cleanup = null;
        return;
      }
      this._cleanup = impl({ data: ctx.opts, lang: ctx.lang, api: ctx.api });
    },
    start(ctx){},
    validate(ctx){ return { ok: true, issues: [] }; },
    grade(ctx){ return null; },
    reset(ctx){},
    getState(){ return null; },
    setState(_s){},
    destroy(){ try { typeof this._cleanup === 'function' && this._cleanup(); } catch(_){} this._cleanup = null; }
  };
  window.PPX.registerType('mcq', Obj);
})();
