/* static/js/ppx-ctw.js */
(function () {
  if (!window.PPX) return;

  function plugin({ data, lang, api, context }) {
    const L = (es, en) => api.t(es, en);
    const opts = Object(data && data.options) || {};
    const AUTO_ADV_SINGLE = !!opts.autoAdvanceSingle;
    const ALLOW_RETRY_MULTI = opts.allowRetryMulti !== false;

    // Normalize items
    const items = (data.items || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'ppx-card';
      empty.style.padding = '16px';
      empty.textContent = L('No hay ítems.', 'No items.');
      api.setBody(empty);
      api.setProgress(0);
      return () => {};
    }

    // State per item: { selected: number[], graded, correct, locked, tokens: [], parts: [] }
    const states = {};
    let idx = 0;
    let summaryReported = false;
    const hintOpened = new Set();
    const mediaHidden = new Set();

    // UI skeleton
    const root = document.createElement('section');
    root.className = 'ppx-ex ppx-ex--ctw';
    root.dataset.type = 'ctw';

    const prompt = document.createElement('div');
    prompt.className = 'ppx-ex__prompt';

    const mediaToggle = document.createElement('button');
    mediaToggle.type = 'button';
    mediaToggle.className = 'ppx-ex__media-toggle ppx-ex__iconBtn ppx-tooltip';
    mediaToggle.hidden = true;
    mediaToggle.setAttribute('aria-expanded', 'true');

    const media = document.createElement('div');
    media.className = 'ppx-media-block';

    const tokensWrap = document.createElement('div');
    tokensWrap.className = 'ppx-ctw__tokens';
    tokensWrap.setAttribute('role', 'group');

    const inlineFB = document.createElement('div');
    inlineFB.className = 'ppx-ex__inline-feedback';
    inlineFB.setAttribute('role', 'status');
    inlineFB.setAttribute('aria-live', 'polite');
    inlineFB.hidden = true;

    const hintToggle = document.createElement('button');
    hintToggle.type = 'button';
    hintToggle.className = 'ppx-ex__iconBtn ppx-tooltip';
    hintToggle.hidden = true;
    hintToggle.setAttribute('aria-expanded', 'false');
    hintToggle.style.padding = '4px';
    const hintIcon = document.createElement('img');
    hintIcon.src = '/static/assets/icons/hint.svg';
    hintIcon.alt = '';
    hintIcon.style.setProperty('width','42px','important');
    hintIcon.style.setProperty('height','42px','important');
    hintToggle.appendChild(hintIcon);

    const hintBlock = document.createElement('div');
    hintBlock.className = 'ppx-ex__hint';
    hintBlock.hidden = true;

    const hintRow = document.createElement('div');
    hintRow.style.display = 'flex';
    hintRow.style.justifyContent = 'center';
    hintRow.style.alignItems = 'center';
    hintRow.style.gap = '8px';
    hintRow.style.margin = '8px 0';
    hintRow.appendChild(hintToggle);
    hintRow.appendChild(hintBlock);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'ppx-row';
    actionsRow.style.gap = '8px';
    const btnCheck = document.createElement('button');
    btnCheck.type = 'button';
    btnCheck.className = 'ppx-btn ppx-btn--primary';
    btnCheck.textContent = L('Comprobar', 'Check');
    btnCheck.hidden = true;
    // Per-slide retry removed; stub to avoid reference errors
    const btnRetry = { hidden: true, style: { display: 'none' }, addEventListener: () => {} };
    actionsRow.appendChild(btnCheck);

    const progress = document.createElement('div');
    progress.className = 'ppx-ex__progress';
    const fraction = document.createElement('div');
    fraction.className = 'ppx-ex__fraction';
    const dots = document.createElement('div');
    dots.className = 'ppx-ex__dots';
    progress.appendChild(fraction);
    progress.appendChild(dots);

    const nav = document.createElement('div');
    nav.className = 'ppx-ex__nav';
    const btnPrev = document.createElement('button');
    btnPrev.className = 'ppx-ex__nav-btn ppx-ex__nav-btn--prev';
    btnPrev.type = 'button';
    btnPrev.setAttribute('aria-label', L('Anterior', 'Previous'));
    const btnNext = document.createElement('button');
    btnNext.className = 'ppx-ex__nav-btn ppx-ex__nav-btn--next';
    btnNext.type = 'button';
    btnNext.setAttribute('aria-label', L('Siguiente', 'Next'));
    nav.appendChild(btnPrev);
    nav.appendChild(btnNext);

    const footer = document.createElement('div');
    footer.className = 'ppx-ex__footer';
    footer.appendChild(progress);
    footer.appendChild(nav);

    root.appendChild(prompt);
    root.appendChild(mediaToggle);
    root.appendChild(media);
    root.appendChild(tokensWrap);
    root.appendChild(inlineFB);
    root.appendChild(hintRow);
    root.appendChild(actionsRow);
    root.appendChild(footer);
    api.setBody(root);

    // Helpers
    const cacheKey = (window.PPXPlayerUtils && typeof window.PPXPlayerUtils.makeCacheKey === 'function')
      ? window.PPXPlayerUtils.makeCacheKey({ type: 'ctw', slug: data.slug, version: data.version || 'current' })
      : `ppx:ctw:${data.slug || 'unknown'}:${data.version || 'current'}`;
    const progressKey = `ppx:progress:ctw/${data.slug || 'unknown'}`;

    function saveCache(){
      try {
        const payload = {
          idx,
          states,
          hintOpened: Array.from(hintOpened),
          mediaHidden: Array.from(mediaHidden)
        };
        localStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch(_) {}
    }
    function loadCache(){
      try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return;
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object'){
          if (obj.states) Object.assign(states, obj.states);
          if (Array.isArray(obj.hintOpened)) obj.hintOpened.forEach(id => hintOpened.add(id));
          if (Array.isArray(obj.mediaHidden)) obj.mediaHidden.forEach(id => mediaHidden.add(id));
          if (typeof obj.idx === 'number') idx = Math.max(0, Math.min(items.length, obj.idx));
        }
      } catch(_){}
    }
    loadCache();

    function parseSentenceParts(sentenceRaw){
      // Treat anything between asterisks as a single clickable token (spaces allowed).
      // Slashes immediately inside the asterisks mark the token as correct.
      const src = String(sentenceRaw || '');
      const parts = [];
      const re = /\*([^*]+?)\*/g;
      let last = 0;
      let m;
      function pushPlain(str){
        (str.match(/\S+/g) || []).forEach(w => parts.push({ text: w, clickable: false, correct: false }));
      }
      while ((m = re.exec(src))) {
        const before = src.slice(last, m.index);
        if (before) pushPlain(before);
        let raw = (m[1] || '').trim();
        let correct = false;
        if (raw.startsWith('/')) { correct = true; raw = raw.slice(1); }
        if (raw.endsWith('/')) { correct = true; raw = raw.slice(0, -1); }
        raw = raw.replace(/^\/+|\/+$/g, '').trim();
        if (raw) parts.push({ text: raw, clickable: true, correct });
        last = re.lastIndex;
      }
      const after = src.slice(last);
      if (after) pushPlain(after);
      return parts;
    }

    function displaySentence(sentenceRaw){
      return (String(sentenceRaw || '').replace(/\*\/?/g, '').replace(/\/\*/g, '').trim());
    }

    function buildTokens(item){
      const parts = parseSentenceParts(item.sentence);
      const markers = parts.filter(p => p.clickable).map(p => ({ text: p.text, correct: !!p.correct }));
      if (markers.length) return { parts, tokens: markers };
      if (Array.isArray(item.tokens) && item.tokens.length){
        return { parts, tokens: item.tokens.map(t => ({ text: t.text, correct: !!t.correct })) };
      }
      return { parts, tokens: [] };
    }

    function renderMedia(it){
      media.innerHTML = '';
      const arr = Array.isArray(it.media) ? it.media : [];
      if (!arr.length) { media.hidden = true; return; }
      media.hidden = mediaHidden.has(it.id);
      const grid = document.createElement('div');
      grid.className = 'ppx-media-grid';
      arr.forEach(m => {
        if (m.kind === 'image'){
          const img = document.createElement('img');
          img.src = m.thumb || m.src;
          img.alt = m.alt_es || m.alt_en || '';
          grid.appendChild(img);
        } else if (m.kind === 'audio'){
          const aud = document.createElement('audio');
          aud.controls = true;
          aud.src = m.src;
          grid.appendChild(aud);
        } else if (m.kind === 'video'){
          const vid = document.createElement('video');
          vid.controls = true;
          vid.src = m.src;
          vid.style.maxHeight = '260px';
          grid.appendChild(vid);
        }
      });
      media.appendChild(grid);
    }

    function updateMediaToggle(it, onSummary){
      const util = window.PPXPlayerUtils;
      if (util && typeof util.updateMediaToggle === 'function'){
        util.updateMediaToggle(media, mediaToggle, onSummary);
        if (!mediaToggle.hidden){
          mediaToggle.setAttribute('aria-expanded', media.hidden ? 'false' : 'true');
          const label = media.hidden ? L('Mostrar multimedia','Show media') : L('Ocultar multimedia','Hide media');
          mediaToggle.setAttribute('aria-label', label);
          mediaToggle.setAttribute('title', label);
        }
        return;
      }
      const has = !onSummary && !!media.querySelector('img, audio, video');
      mediaToggle.hidden = !has;
      mediaToggle.style.display = has ? '' : 'none';
      mediaToggle.setAttribute('aria-expanded', media.hidden ? 'false' : 'true');
    }

    function setInlineFeedback(msg, ok){
      inlineFB.textContent = msg;
      inlineFB.classList.toggle('is-ok', !!ok);
      inlineFB.classList.toggle('is-bad', !ok && !!msg);
      inlineFB.hidden = !msg;
    }

    function renderHint(it, show){
      const hint = lang.startsWith('en') ? (it.hint_en || it.hint_es || '') : (it.hint_es || it.hint_en || '');
      if (!hint){
        hintToggle.hidden = true;
        hintBlock.hidden = true;
        return;
      }
      const label = show ? L('Ocultar pista', 'Hide hint') : L('Ver pista', 'Show hint');
      hintToggle.hidden = false;
      hintToggle.setAttribute('aria-expanded', show ? 'true' : 'false');
      hintToggle.setAttribute('data-tooltip', label);
      hintToggle.setAttribute('aria-label', label);
      hintBlock.hidden = !show;
      hintBlock.dataset.hasIcon = 'true';
      hintBlock.classList.add('ppx-hint--noicon');
      hintBlock.innerHTML = `<span>${hint}</span>`;
      if (show) { hintOpened.add(it.id); saveCache(); }
    }

    function renderDots(){
      dots.innerHTML = '';
      items.forEach((it, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'ppx-ex__dot';
        const st = states[it.id];
        if (i === idx) {
          dot.classList.add('is-current');
          dot.setAttribute('aria-current', 'step');
        }
        if (st?.graded) {
          dot.classList.add('is-done');
          if (st.correct) dot.classList.add('is-ok'); else dot.classList.add('is-bad');
        }
        dot.addEventListener('click', () => { idx = i; render(); saveCache(); });
        dots.appendChild(dot);
      });
      if (idx === items.length){
        const sum = document.createElement('span');
        sum.className = 'ppx-ex__dot is-current';
        sum.setAttribute('aria-current', 'step');
        dots.appendChild(sum);
      }
    }

    function renderProgress(){
      const total = items.length;
      const answered = Object.values(states).filter(s => s.graded).length;
      api.setProgress(total ? (answered / total) : 0);
      fraction.textContent = idx === items.length
        ? `${total}/${total}`
        : `${idx + 1}/${total}`;
      renderDots();
    }

    function grade(item, tokenList){
      const mode = String(item.mode || 'single').toLowerCase();
      const list = Array.isArray(tokenList) ? tokenList : [];
      const state = states[item.id] || { selected: [], graded: false, correct: false, locked: false, tokenList: list };
      if (!list.length) {
        state.correct = false;
        state.graded = true;
        state.locked = true;
        states[item.id] = state;
        return false;
      }
      if (mode === 'single'){
        const picked = state.selected[0];
        const tok = list[picked];
        state.correct = !!(tok && tok.correct);
      } else {
        const pickedSet = new Set(state.selected || []);
        const correctSet = new Set(list.map((t,i)=> t.correct ? i : -1).filter(i=>i>=0));
        let allGood = pickedSet.size === correctSet.size;
        correctSet.forEach(c => { if (!pickedSet.has(c)) allGood = false; });
        state.correct = allGood;
      }
      state.graded = true;
      state.locked = true;
      states[item.id] = state;
      api.answer && api.answer({ item: item.id, correct: state.correct });
      return state.correct;
    }

    function renderTokens(item){
      tokensWrap.innerHTML = '';
      const state = states[item.id];
      const parts = state.parts || [];
      const tokenList = state.tokenList || [];
      const markerTokens = parts.filter(p => p.clickable);

      const sentenceLine = document.createElement('div');
      sentenceLine.className = 'ppx-ctw__sentence-line';

      if (markerTokens.length){
        let clickIdx = 0;
        parts.forEach(part => {
          if (part.clickable){
            const idxLocal = clickIdx++;
            sentenceLine.appendChild(makeTokenButton(part.text, idxLocal, tokenList, state, item));
          } else {
            const span = document.createElement('span');
            span.textContent = part.text;
            sentenceLine.appendChild(span);
          }
          sentenceLine.appendChild(document.createTextNode(' '));
        });
        tokensWrap.appendChild(sentenceLine);
      } else {
        const span = document.createElement('span');
        span.textContent = displaySentence(item.sentence);
        sentenceLine.appendChild(span);
        tokensWrap.appendChild(sentenceLine);
        if (tokenList.length){
          const row = document.createElement('div');
          row.className = 'ppx-ctw__token-row';
          tokenList.forEach(tok => row.appendChild(makeTokenButton(tok.text, tok.idx, tokenList, state, item)));
          tokensWrap.appendChild(row);
        }
      }

      if (!tokenList.length){
        const empty = document.createElement('div');
        empty.className = 'ppx-state--bad';
        empty.textContent = L('No hay palabras para hacer clic.', 'No clickable words found.');
        tokensWrap.appendChild(empty);
      }

      if (state.graded){
        setInlineFeedback(state.correct ? (item.feedback_correct_es || item.feedback_correct_en || L('Correcto','Correct')) : (item.feedback_incorrect_es || item.feedback_incorrect_en || L('Incorrecto','Incorrect')), state.correct);
      } else {
        setInlineFeedback('', false);
      }
    }

    function makeTokenButton(label, idxLocal, tokenList, state, item){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ppx-ctw__token';
      const selected = state.selected.includes(idxLocal);
      btn.textContent = label;
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      // Always keep buttons enabled; we visually lock via classes after grading
      btn.disabled = !!state.graded;
      if (selected) btn.classList.add('is-selected');
      if (state.graded){
        const tok = tokenList[idxLocal];
        const tokCorrect = tok ? !!tok.correct : false;
        const cls = tokCorrect ? 'is-correct' : (selected ? 'is-wrong' : '');
        if (cls) btn.classList.add(cls);
      }
      btn.addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        // Block further changes once graded/locked
        if (state.graded) return;
        if (String(item.mode || 'single').toLowerCase() === 'single'){
          state.selected = [idxLocal];
          const ok = grade(item, tokenList);
          renderTokens(item);
          renderProgress();
          setInlineFeedback(ok ? (item.feedback_correct_es || item.feedback_correct_en || L('Correcto','Correct')) : (item.feedback_incorrect_es || item.feedback_incorrect_en || L('Incorrecto','Incorrect')), ok);
          if (AUTO_ADV_SINGLE && ok && idx < items.length - 1){
            setTimeout(() => { idx += 1; render(); saveCache(); }, 420);
          }
        } else {
          if (state.selected.includes(idxLocal)){
            state.selected = state.selected.filter(n => n !== idxLocal);
          } else {
            state.selected.push(idxLocal);
          }
          states[item.id] = state;
          renderTokens(item);
        }
        saveCache();
      });
      return btn;
    }

    function renderSummary(){
      prompt.textContent = '';
      media.innerHTML = '';
      media.hidden = false;
      mediaToggle.hidden = true;
      tokensWrap.innerHTML = '';
      hintToggle.hidden = true;
      hintBlock.hidden = true;
      btnCheck.hidden = true;
      inlineFB.textContent = '';
      inlineFB.hidden = true;

      const total = items.length;
      const correct = items.reduce((acc, it) => acc + (states[it.id]?.correct ? 1 : 0), 0);
      const score = Math.round((correct / total) * 100);
      const scoreClass = score >= 90 ? 'ppx-score--green' : (score >= 80 ? 'ppx-score--blue' : (score >= 70 ? 'ppx-score--orange' : 'ppx-score--red'));

      const wrap = document.createElement('div');
      wrap.className = 'ppx-card';
      wrap.style.padding = '16px';

      // Title centered
      const titleBox = document.createElement('div');
      titleBox.style.textAlign = 'center';
      const h = document.createElement('h3');
      h.textContent = L('Resumen', 'Summary');
      h.style.margin = '0 0 6px 0';
      titleBox.appendChild(h);

      // Score line like MCQ/TF
      const scoreLine = document.createElement('div');
      scoreLine.style.display = 'flex';
      scoreLine.style.alignItems = 'center';
      scoreLine.style.justifyContent = 'center';
      scoreLine.style.gap = '8px';
      const scoreLabel = document.createElement('span');
      scoreLabel.textContent = L('Puntaje:', 'Score:');
      const badge = document.createElement('span');
      badge.className = `ppx-score ${scoreClass}`;
      badge.textContent = `${score}%`;
      const meta = document.createElement('span');
      meta.textContent = `${correct}/${total}`;
      scoreLine.appendChild(scoreLabel);
      scoreLine.appendChild(badge);
      scoreLine.appendChild(meta);
      titleBox.appendChild(scoreLine);
      titleBox.style.marginBottom = '10px';
      wrap.appendChild(titleBox);

      const list = document.createElement('div');
      list.className = 'ppx-col';
      list.style.gap = '10px';
      list.setAttribute('role', 'list');
      items.forEach(it => {
        const s = states[it.id] || { selected: [], graded: false, correct: false };
        const built = buildTokens(it);
        const parts = built.parts || [];
        const tokens = built.tokens || [];
        const selSet = new Set(s.selected || []);

        const det = document.createElement('details');
        det.className = 'ppx-acc';
        det.open = false;
        det.setAttribute('role', 'listitem');

        const sum = document.createElement('summary');
        sum.style.cursor = 'pointer';
        sum.style.listStyle = 'none';
        sum.style.display = 'flex';
        sum.style.alignItems = 'center';
        sum.style.gap = '10px';
        sum.style.padding = '10px 12px';
        sum.style.border = '1px solid var(--ppx-line,#e5e7eb)';
        sum.style.borderRadius = '12px';

        const caret = document.createElement('img');
        caret.src = '/static/assets/icons/chevron_collapsed.svg';
        caret.alt = '';
        caret.width = 16; caret.height = 16;
        caret.dataset.caret = '1';

        const textCol = document.createElement('div');
        textCol.style.display = 'flex';
        textCol.style.flexWrap = 'wrap';
        textCol.style.gap = '2px';
        textCol.style.flex = '1';

        let tIdx = 0;
        if (parts.length){
          parts.forEach((p, idxPart) => {
            if (p.clickable){
              const tok = tokens[tIdx] || { text: p.text, correct: !!p.correct };
              const chip = document.createElement('span');
              chip.className = 'ppx-chip';
              chip.textContent = tok.text;
              if (selSet.has(tIdx)) {
                chip.classList.add(tok.correct ? 'ppx-chip--ok' : 'ppx-chip--bad');
              }
              textCol.appendChild(chip);
              tIdx += 1;
            } else {
              const span = document.createElement('span');
              span.textContent = p.text;
              textCol.appendChild(span);
            }
            // add a tiny text node space except after the last part to tighten spacing
            if (idxPart !== parts.length - 1) {
              textCol.appendChild(document.createTextNode(''));
            }
          });
        } else {
          const span = document.createElement('span');
          span.textContent = displaySentence(it.sentence);
          textCol.appendChild(span);
          if (tokens.length){
            tokens.forEach((tok, i) => {
              const chip = document.createElement('span');
              chip.className = 'ppx-chip';
              chip.textContent = tok.text;
              if (selSet.has(i)) {
                chip.classList.add(tok.correct ? 'ppx-chip--ok' : 'ppx-chip--bad');
              }
              textCol.appendChild(chip);
            });
          }
        }

        const status = document.createElement('span');
        status.className = 'ppx-chip';
        status.classList.add(s.correct ? 'ppx-chip--ok' : 'ppx-chip--bad');
        status.textContent = s.correct ? L('Correcto','Correct') : L('Incorrecto','Incorrect');

        const rightCol = document.createElement('div');
        rightCol.style.display = 'flex';
        rightCol.style.alignItems = 'center';
        rightCol.style.gap = '8px';
        rightCol.style.minWidth = '120px';
        rightCol.style.justifyContent = 'flex-end';

        const chev = document.createElement('img');
        chev.src = '/static/assets/icons/chevron_down.svg';
        chev.alt = '';
        chev.width = 16; chev.height = 16;
        chev.style.visibility = det.open ? 'visible' : 'hidden';

        rightCol.appendChild(status);
        rightCol.appendChild(chev);

        sum.appendChild(caret);
        sum.appendChild(textCol);
        sum.appendChild(rightCol);
        det.appendChild(sum);

        const body = document.createElement('div');
        body.style.padding = '8px 12px 12px 28px';
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexWrap = 'wrap';
        row.style.gap = '6px';
        const label = document.createElement('strong');
        label.textContent = L('Respuesta correcta:', 'Correct answer:');
        row.appendChild(label);
        const correctTokens = tokens.filter(t => t.correct);
        if (correctTokens.length){
          correctTokens.forEach(tok => {
            const chip = document.createElement('span');
            chip.className = 'ppx-chip ppx-chip--ok';
            chip.textContent = tok.text;
            row.appendChild(chip);
          });
        }
        // Feedback row (based on user's answer)
        const fbRow = document.createElement('div');
        fbRow.style.marginTop = '8px';
        fbRow.className = 'ppx-col';
        const fbLabel = document.createElement('div');
        fbLabel.style.fontWeight = '700';
        fbLabel.textContent = L('Tu feedback:', 'Your feedback:');
        const fbText = document.createElement('div');
        fbText.className = s.correct ? 'ppx-chip ppx-chip--ok' : 'ppx-chip ppx-chip--bad';
        fbText.style.display = 'inline-block';
        fbText.style.marginTop = '4px';
        fbText.textContent = s.correct
          ? (it.feedback_correct_es || it.feedback_correct_en || L('Correcto', 'Correct'))
          : (it.feedback_incorrect_es || it.feedback_incorrect_en || L('Incorrecto', 'Incorrect'));
        fbRow.appendChild(fbLabel);
        fbRow.appendChild(fbText);

        body.appendChild(row);
        body.appendChild(fbRow);
        body.hidden = !det.open;
        det.appendChild(body);

        det.addEventListener('toggle', () => {
          const c = det.querySelector('img[data-caret="1"]');
          if (c) c.src = det.open ? '/static/assets/icons/chevron_down.svg' : '/static/assets/icons/chevron_collapsed.svg';
          chev.style.visibility = det.open ? 'visible' : 'hidden';
          body.hidden = !det.open;
        });

        list.appendChild(det);
      });

      wrap.appendChild(list);
      // Restart button (summary only)
      const restartRow = document.createElement('div');
      restartRow.style.display = 'flex';
      restartRow.style.justifyContent = 'center';
      restartRow.style.marginTop = '14px';
      const again = document.createElement('button');
      again.type = 'button';
      again.className = 'ppx-btn ppx-btn--ghost';
      again.style.border = '1px solid #f97316';
      again.style.color = '#f97316';
      again.style.display = 'inline-flex';
      again.style.alignItems = 'center';
      again.style.gap = '6px';
      again.style.width = 'fit-content';
      again.style.padding = '8px 14px';
      again.textContent = L('Reiniciar','Restart');
      const rIcon = document.createElement('img');
      rIcon.src = '/static/assets/icons/refresh.svg';
      rIcon.alt = '';
      rIcon.width = 16; rIcon.height = 16;
      again.prepend(rIcon);
      again.addEventListener('click', (ev)=>{
        ev.preventDefault(); ev.stopPropagation();
        try { localStorage.removeItem(cacheKey); } catch(_){}
        try { localStorage.removeItem(progressKey); } catch(_){}
        for (const k in states) delete states[k];
        hintOpened.clear(); mediaHidden.clear();
        summaryReported = false;
        idx = 0;
        api.setProgress(0);
        render();
      });
      restartRow.appendChild(again);
      wrap.appendChild(restartRow);
      media.appendChild(wrap);

      if (!summaryReported){
        api.setProgress(1);
        api.complete && api.complete({ score, correct, total, hints_used: hintOpened.size, attempts: 1 });
        summaryReported = true;
      }
    }

    function render(){
      if (idx === items.length){
        renderSummary();
        renderProgress();
        btnPrev.disabled = (items.length === 0);
        btnNext.disabled = true;
        btnNext.setAttribute('aria-disabled', 'true');
        return;
      }
      const item = items[idx];
      const mode = String(item.mode || 'single').toLowerCase();
      // Hide prompt sentence to avoid duplicates (pills render inline)
      prompt.textContent = '';
      if (item.translation) {
        prompt.title = item.translation;
        prompt.setAttribute('data-tooltip', item.translation);
        tokensWrap.title = item.translation;
        tokensWrap.setAttribute('data-tooltip', item.translation);
      } else {
        prompt.removeAttribute('title');
        prompt.removeAttribute('data-tooltip');
        tokensWrap.removeAttribute('title');
        tokensWrap.removeAttribute('data-tooltip');
      }

      renderMedia(item);
      updateMediaToggle(item, false);

      // Build tokens/parts once per item and persist on state
      if (!states[item.id] || !states[item.id].tokenList){
        const built = buildTokens(item);
        states[item.id] = Object.assign(states[item.id] || {}, {
          tokenList: built.tokens.map((t,i)=>({ text:t.text, correct:!!t.correct, idx:i })),
          parts: built.parts,
          selected: (states[item.id]?.selected) || [],
          graded: states[item.id]?.graded || false,
          correct: states[item.id]?.correct || false,
          locked: states[item.id]?.locked || false
        });
      }

      const state = states[item.id];
      // Fresh/ungaded items must be clickable; unlock any stale lock
      if (!state.graded) {
        state.locked = false;
        if (!Array.isArray(state.selected)) state.selected = [];
      }
      if (!state.graded) setInlineFeedback('', false);
      renderTokens(item);

      const hasHint = (lang.startsWith('en') ? item.hint_en || item.hint_es : item.hint_es || item.hint_en);
      renderHint(item, hintOpened.has(item.id));

      if (mode === 'multi'){
        btnCheck.hidden = false;
        btnCheck.disabled = !state.selected.length;
        btnRetry.hidden = !state.graded || !ALLOW_RETRY_MULTI;
        btnCheck.style.display = '';
        btnRetry.style.display = '';
      } else {
        btnCheck.hidden = true;
        btnRetry.hidden = true;
        btnCheck.style.display = 'none';
        btnRetry.style.display = 'none';
      }

      btnPrev.disabled = (idx === 0);
      btnNext.disabled = (idx === items.length - 1) ? false : false;
      btnNext.setAttribute('aria-label', (idx === items.length - 1) ? L('Terminar', 'Finish') : L('Siguiente', 'Next'));

      renderProgress();
    }

    btnPrev.addEventListener('click', () => {
      if (idx > 0){ idx -= 1; render(); saveCache(); }
    });
    btnNext.addEventListener('click', () => {
      if (idx === items.length - 1){
        idx = items.length;
        render();
      } else {
        idx = Math.min(items.length, idx + 1);
        render();
      }
      saveCache();
    });

    btnCheck.addEventListener('click', () => {
      if (idx >= items.length) return;
      const item = items[idx];
      const state = states[item.id] || { selected: [], graded: false, correct: false, locked: false };
      if (!state.selected.length) return;
      const tokenList = state.tokenList || [];
      const ok = grade(item, tokenList);
      renderTokens(item);
      btnRetry.hidden = !ALLOW_RETRY_MULTI ? true : false;
      renderProgress();
      saveCache();
    });

    btnRetry.addEventListener('click', () => {
      if (idx >= items.length) return;
      const item = items[idx];
      const built = buildTokens(item);
      states[item.id] = {
        selected: [],
        graded: false,
        correct: false,
        locked: false,
        tokenList: built.tokens.map((t,i)=>({ text:t.text, correct:!!t.correct, idx:i })),
        parts: built.parts
      };
      renderTokens(item);
      setInlineFeedback('', false);
      btnRetry.hidden = true;
      saveCache();
    });

    hintToggle.addEventListener('click', () => {
      if (idx >= items.length) return;
      const item = items[idx];
      const willShow = hintBlock.hidden;
      renderHint(item, willShow);
      saveCache();
    });

    mediaToggle.addEventListener('click', () => {
      if (idx >= items.length) return;
      const item = items[idx];
      const nowHidden = !media.hidden;
      media.hidden = nowHidden;
      if (nowHidden) mediaHidden.add(item.id); else mediaHidden.delete(item.id);
      updateMediaToggle(item, false);
      saveCache();
    });

    root.addEventListener('keydown', (e) => {
      if (idx === items.length) return;
      if (e.key === 'ArrowLeft'){ e.preventDefault(); btnPrev.click(); }
      if (e.key === 'ArrowRight'){ e.preventDefault(); btnNext.click(); }
      if (e.key === 'Enter' && !btnCheck.hidden){
        e.preventDefault(); btnCheck.click();
      }
    });

    render();

    if (context && context.startAt === 'summary') {
      idx = items.length;
      render();
    }

    return () => {};
  }

  try { window.PPX.registerType('ctw', plugin); } catch (_) {}
})();
