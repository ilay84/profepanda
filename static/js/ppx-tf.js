/* static/js/ppx-tf.js */
(function () {
  if (!window.PPX) { console.error('[PPX TF] PPX core not found'); return; }

  function legacyPlugin({ data, lang, api }) {
    const L = (es, en) => api.t(es, en);

    // ─────────────────────────────────────────────────────────────
    // Config flags (with safe defaults)
    // ─────────────────────────────────────────────────────────────
    const opts = Object(data && data.options) || {};
    const AUTO_ADVANCE = !!opts.autoAdvanceTF;              // correct-only
    const ALLOW_RETRY = Number(opts.allowRetryTF || 0) > 0; // 0 or 1
    const LOCK_NAV_UNTIL_ANSWERED = !!opts.lockNavUntilAnswered;
    const ENABLE_SFX = !!opts.sfx;
    const WARN_ON_UNANSWERED = opts.warnOnUnanswered !== 0; // default on
    const DOTS_ONLY_ANSWERED = !!opts.dotsOnlyAnswered;

    const reduceMotion = (() => {
      try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
      catch { return false; }
    })();

    // ─────────────────────────────────────────────────────────────
    // Persistence (localStorage)
    // ─────────────────────────────────────────────────────────────
    const exType = 'tf';
    const exSlug = data.slug || (data.id && String(data.id).split('/').pop()) || 'unknown';
    const exVer  = (data.version ?? 'current');
    const cacheKey = `ppx:${exType}:${exSlug}:${exVer}`;

    function saveCache() {
      try {
        const payload = {
          idx,
          hintsUsed,
          attempts,
          answers: Array.from(answers.entries()),        // [ [itemId, {choice, correct}], ... ]
          wrongCount: Array.from(wrongCount.entries()),  // [ [itemId, n], ... ]
          hintOnce: Array.from(hintOpenedOnce.values()), // [ itemId, ... ]
          mediaHidden: Array.from(mediaHidden.values())  // [ itemId, ... ]
        };
        localStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch { /* ignore */ }
    }

    function clearCache() {
      try { localStorage.removeItem(cacheKey); } catch { /* ignore */ }
    }

    function loadCache() {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;

        // idx within bounds (0..items.length)
        idx = Math.max(0, Math.min(items.length, Number(parsed.idx) || 0));
        hintsUsed = Math.max(0, Number(parsed.hintsUsed) || 0);
        attempts = Math.max(1, Number(parsed.attempts) || 1);

        answers.clear();
        (Array.isArray(parsed.answers) ? parsed.answers : []).forEach(([k, v]) => {
          if (k && v && (v.choice === 'true' || v.choice === 'false')) {
            answers.set(k, { choice: v.choice, correct: !!v.correct });
          }
        });

        wrongCount.clear();
        (Array.isArray(parsed.wrongCount) ? parsed.wrongCount : []).forEach(([k, n]) => {
          if (k) wrongCount.set(k, Math.max(0, Number(n) || 0));
        });

        hintOpenedOnce.clear();
        (Array.isArray(parsed.hintOnce) ? parsed.hintOnce : []).forEach(id => {
          if (id) hintOpenedOnce.add(id);
        });

        mediaHidden.clear();
        (Array.isArray(parsed.mediaHidden) ? parsed.mediaHidden : []).forEach(id => {
          if (id) mediaHidden.add(id);
        });

        // If user completed all items previously (all answers present),
        // reopen directly to the summary until they restart.
        try {
          const answeredCount = answers.size;
          if (answeredCount === items.length) {
            idx = items.length; // summary sentinel
          }
        } catch (_) {}
      } catch {
        // corrupted cache - ignore
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Model
    // ─────────────────────────────────────────────────────────────
    let idx = 0;                    // 0..items.length (summary when === items.length)
    let hintsUsed = 0;
    let attempts = 1;
    let summaryReported = false;    // ensure api.complete fires once
    const answers = new Map();       // itemId -> { choice: 'true'|'false', correct: boolean }
    const wrongCount = new Map();    // itemId -> number of wrong selections so far
    const hintOpenedOnce = new Set();// itemId where hint was opened at least once
    const mediaHidden = new Set();    // itemIds where the media is hidden by user toggle

    const items = (data.items || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'ppx-card';
      empty.style.padding = '16px';
      empty.textContent = L('No hay ítems para este ejercicio.', 'No items in this exercise.');
      api.setBody(empty);
      api.setProgress(0);
      return () => {};
    }

    const isSummary = () => idx === items.length;
    const currentItem = () => items[Math.max(0, Math.min(items.length - 1, idx))];

    const getText = (item) => {
      const key = (lang === 'en') ? 'statement_en' : 'statement_es';
      const alt = (lang === 'en') ? 'statement_es' : 'statement_en';
      return item[key] || item[alt] || '';
    };
    const getHint = (item) => {
      const key = (lang === 'en') ? 'hint_en' : 'hint_es';
      const alt = (lang === 'en') ? 'hint_es' : 'hint_en';
      return item[key] || item[alt] || '';
    };
    const feedbackCopy = (item, correct) => {
      const kOk = (lang === 'en') ? 'feedback_correct_en' : 'feedback_correct_es';
      const kBad = (lang === 'en') ? 'feedback_incorrect_en' : 'feedback_incorrect_es';
      const altOk = (lang === 'en') ? 'feedback_correct_es' : 'feedback_correct_en';
      const altBad = (lang === 'en') ? 'feedback_incorrect_es' : 'feedback_incorrect_en';
      return correct
        ? (item[kOk] || item[altOk] || L('Correcto ✅', 'Correct ✅'))
        : (item[kBad] || item[altBad] || L('Incorrecto ❌', 'Incorrect ❌'));
    };

    // ─────────────────────────────────────────────────────────────
    // DOM (PPX Exercise Contract)
    // ─────────────────────────────────────────────────────────────
    const root = document.createElement('section');
    root.className = 'ppx-ex ppx-ex--tf';
    root.dataset.type = 'tf';
    root.dataset.state = 'idle';
    root.setAttribute('role', 'group');

    const srLivePolite = document.createElement('div');
    srLivePolite.className = 'ppx-visually-hidden';
    srLivePolite.setAttribute('aria-live', 'polite');
    root.appendChild(srLivePolite);

    const srLiveAssert = document.createElement('div');
    srLiveAssert.className = 'ppx-visually-hidden';
    srLiveAssert.setAttribute('aria-live', 'assertive');
    root.appendChild(srLiveAssert);

    // Header
    const header = document.createElement('header');
    header.className = 'ppx-ex__header';

    const badge = document.createElement('div');
    badge.className = 'ppx-ex__badge';
    badge.setAttribute('aria-hidden', 'true');
    header.appendChild(badge);

    const prompt = document.createElement('div');
    prompt.className = 'ppx-ex__prompt';
    header.appendChild(prompt);

    // Optional media block + toggle (separate class to avoid hint icon styles)
    const mediaToggle = document.createElement('button');
    mediaToggle.type = 'button';
    mediaToggle.className = 'ppx-ex__media-toggle ppx-ex__iconBtn ppx-tooltip';
    mediaToggle.hidden = true; // only visible when the item actually has media
    mediaToggle.setAttribute('aria-expanded', 'true');

    const media = document.createElement('div');
    media.className = 'ppx-media-block';

    // Actions (two pill buttons)
    const actions = document.createElement('div');
    actions.className = 'ppx-ex__actions';
    actions.setAttribute('role', 'radiogroup');
    actions.setAttribute('aria-label', L('Verdadero o Falso', 'True or False'));

    const btnTrue = document.createElement('button');
    btnTrue.className = 'ppx-ex__btn ppx-ex__btn--true';
    btnTrue.type = 'button';
    const trueLabel = L('Verdadero', 'True');
    btnTrue.dataset.baseLabel = trueLabel;
    btnTrue.textContent = trueLabel;
    btnTrue.setAttribute('role', 'radio');
    btnTrue.setAttribute('aria-checked', 'false');

    const btnFalse = document.createElement('button');
    btnFalse.className = 'ppx-ex__btn ppx-ex__btn--false';
    btnFalse.type = 'button';
    const falseLabel = L('Falso', 'False');
    btnFalse.dataset.baseLabel = falseLabel;
    btnFalse.textContent = falseLabel;
    btnFalse.setAttribute('role', 'radio');
    btnFalse.setAttribute('aria-checked', 'false');

    actions.appendChild(btnTrue);
    actions.appendChild(btnFalse);

    // Visible inline feedback under the pills
    const inlineFB = document.createElement('div');
    inlineFB.className = 'ppx-ex__inline-feedback';
    inlineFB.setAttribute('role', 'status');
    inlineFB.setAttribute('aria-live', 'polite');

    // Hint toggle + block
    const hintToggle = document.createElement('button');
    hintToggle.className = 'ppx-ex__hint-toggle';
    hintToggle.type = 'button';
    hintToggle.textContent = L('Ver pista', 'Show hint');
    hintToggle.setAttribute('aria-expanded', 'false');
    hintToggle.hidden = true;

    const hintBlock = document.createElement('div');
    hintBlock.className = 'ppx-ex__hint';
    hintBlock.hidden = true;

    // Inline warning bar (pre-summary)
    const warnBar = document.createElement('div');
    warnBar.className = 'ppx-ex__warn';
    warnBar.hidden = true;
    const warnMsg = document.createElement('span');
    const btnReviewUn = document.createElement('button');
    btnReviewUn.type = 'button';
    btnReviewUn.className = 'ppx-wbtn ppx-wbtn--ghost';
    btnReviewUn.textContent = L('Revisar sin responder', 'Review unanswered');
    const btnContinue = document.createElement('button');
    btnContinue.type = 'button';
    btnContinue.className = 'ppx-wbtn ppx-wbtn--primary';
    btnContinue.textContent = L('Continuar', 'Continue');
    warnBar.appendChild(warnMsg);
    warnBar.appendChild(btnReviewUn);
    warnBar.appendChild(btnContinue);

    // Progress (fraction + dots)
    const progress = document.createElement('div');
    progress.className = 'ppx-ex__progress';
    const fraction = document.createElement('div');
    fraction.className = 'ppx-ex__fraction';
    const dots = document.createElement('div');
    dots.className = 'ppx-ex__dots';
    progress.appendChild(fraction);
    progress.appendChild(dots);
    // Results shortcut (appears when all answered)
    const btnResults = document.createElement('button');
    btnResults.type = 'button';
    btnResults.className = 'ppx-wbtn ppx-wbtn--primary ppx-ex__results';
    btnResults.textContent = L('Ver resultados', 'See results');
    btnResults.hidden = true;
    btnResults.addEventListener('click', () => {
      if (idx === items.length) return; // already on summary
      idx = items.length; renderItem(); saveCache();
    });
    progress.appendChild(btnResults);

    // Restart shortcut (appears when all answered)
    const btnRestart = document.createElement('button');
    btnRestart.type = 'button';
    btnRestart.className = 'ppx-wbtn';
    btnRestart.textContent = L('Reiniciar', 'Restart');
    btnRestart.hidden = true;
    btnRestart.addEventListener('click', () => {
      clearCache();
      resetAll();
    });
    progress.appendChild(btnRestart);

    // Nav pods
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

    // Assemble & mount (footer groups dots + arrows in one row)
    const footer = document.createElement('div');
    footer.className = 'ppx-ex__footer';
    footer.appendChild(progress);
    footer.appendChild(nav);

    root.appendChild(header);
    root.appendChild(mediaToggle);
    root.appendChild(media);
    root.appendChild(actions);
    root.appendChild(inlineFB);
    root.appendChild(hintToggle);
    root.appendChild(hintBlock);
    root.appendChild(warnBar);
    root.appendChild(footer);

    // Keyboard help tip (first-time, disabled by default)\n    const SHOW_KBD_HELP = !!opts.kbdHelp;\n    if (SHOW_KBD_HELP) {\n      const kbdHelp = document.createElement('div');\n      kbdHelp.className = 'ppx-ex__kbd-help';\n      const helpMsg = L('Teclas: V/F selecciona, H pista, Ctrl\\u2192 siguiente, \\u2190/\\u2192 mueve entre opciones', 'Keys: V/F select, H hint, Ctrl\\u2192 next, \\u2190/\\u2192 move between options');\n      const helpKey = cacheKey + ':kbdhelp';\n      const dismissed = (() => { try { return localStorage.getItem(helpKey) === '1'; } catch { return false; } })();\n      const helpText = document.createElement('span');\n      helpText.textContent = helpMsg;\n      const helpDismiss = document.createElement('button');\n      helpDismiss.type = 'button';\n      helpDismiss.className = 'ppx-ex__kbd-help-close';\n      helpDismiss.setAttribute('aria-label', L('Ocultar ayuda de teclado', 'Hide keyboard help'));\n      helpDismiss.innerHTML = '&times;';\n      helpDismiss.addEventListener('click', () => { try { localStorage.setItem(helpKey, '1'); } catch {}; kbdHelp.style.display = 'none'; });\n      kbdHelp.appendChild(helpText);\n      kbdHelp.appendChild(helpDismiss);\n      if (!dismissed) { try { root.insertBefore(kbdHelp, footer); } catch { root.appendChild(kbdHelp); } }\n    }\n\n    // Mount inside shared frame if available so header/footer rows share width with content
    let frameRef = null;
    (function () {
      const titleText =
        (lang === 'en'
          ? (data.title_en || data.title_es)
          : (data.title_es || data.title_en)) || '';
      if (window.PPXFrame && typeof window.PPXFrame.create === 'function') {
        frameRef = window.PPXFrame.create({
          lang,
          title: titleText,
          typeLabel: L('¿Verdadero o falso?', 'True or False?'),
          level: data.level || ''
        });
        frameRef.slots.content.appendChild(root);
        api.setBody(frameRef.root);
      } else {
        api.setBody(root);
      }
    })();

    // First-run instructions screen (like Dictation/FITB/MCQ)
    (function(){
      try {
        const slug = data.slug || (data.id && String(data.id).split('/').pop()) || 'tf';
        const introKey = 'ppx:intro:dismissed:tf/' + String(slug);
        const langIsEn = (String(lang||'es').toLowerCase().startsWith('en'));
        const instr = langIsEn
          ? ((data.instructions_en) || (data.instructions_es) || '')
          : ((data.instructions_es) || (data.instructions_en) || '');
        const shouldShow = !!instr && !localStorage.getItem(introKey);
        if (!shouldShow) return;
        const intro = document.createElement('div'); intro.className='ppx-card'; intro.style.padding='18px 20px'; intro.style.margin='0 auto'; intro.style.maxWidth='820px';
        const h = document.createElement('h2'); h.textContent = L('Instrucciones','Instructions'); h.style.marginTop='4px';
        const body = document.createElement('div'); body.className='ppx-p'; body.innerHTML = instr;
        const actionsRow = document.createElement('div'); actionsRow.className='ppx-row'; actionsRow.style.justifyContent='center'; actionsRow.style.marginTop='12px';
        const startBtn = document.createElement('button'); startBtn.type='button'; startBtn.className='ppx-btn ppx-btn--primary'; startBtn.textContent = L('Comenzar','Start');
        actionsRow.appendChild(startBtn);
        intro.appendChild(h); intro.appendChild(body); intro.appendChild(actionsRow);
        if (window.PPXModal && typeof PPXModal.setBody==='function') {
          PPXModal.setBody(intro);
        } else {
          root.style.display='none'; (frameRef ? frameRef.root : root).parentNode && (frameRef ? frameRef.root : root).parentNode.insertBefore(intro, (frameRef ? frameRef.root : root));
        }
        startBtn.addEventListener('click', function(ev){
          try { ev && ev.preventDefault(); ev && ev.stopPropagation(); } catch(_){}
          try { localStorage.setItem(introKey,'1'); } catch(_){}
          if (window.PPXModal && typeof PPXModal.setBody==='function') {
            PPXModal.setBody(frameRef ? frameRef.root : root);
          } else {
            intro.remove(); (frameRef ? frameRef.root : root).style.display='';
          }
          try { const m=document.querySelector('.ppx-modal'), o=document.querySelector('.ppx-modal__overlay'); if(m&&o){ m.classList.add('is-open'); o.classList.add('is-open'); m.setAttribute('aria-hidden','false'); } } catch(_){ }
        });
      } catch(_){ /* ignore */ }
    })();

    // helper to toggle visibility groups
    function setExerciseUIVisible(show) {
      [actions, hintToggle, hintBlock].forEach(el => { el.style.display = show ? '' : 'none'; });
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────
    function setState(state) {
      root.dataset.state = state; // idle | answered | correct | wrong | review
    }
    function lockChoices(lock) {
      btnTrue.disabled = lock;
      btnFalse.disabled = lock;
    }
    function clearChoiceStyles() {
      [btnTrue, btnFalse].forEach(b => {
        b.classList.remove('ppx-ex__btn--correct', 'ppx-ex__btn--wrong', 'ppx-ex__btn--shake');
        b.setAttribute('aria-checked', 'false');
      });
      // reset to text-only labels (icons only appear on feedback)
      btnTrue.textContent = btnTrue.dataset.baseLabel || '';
      btnFalse.textContent = btnFalse.dataset.baseLabel || '';
      updateRadioFocusability();
    }
    function applyChoiceStyles(choice, correct, shakeOnWrong) {
      const picked = (choice === 'true') ? btnTrue : btnFalse;
      const other = (choice === 'true') ? btnFalse : btnTrue;
      picked.classList.add(correct ? 'ppx-ex__btn--correct' : 'ppx-ex__btn--wrong');
      other.classList.remove('ppx-ex__btn--correct', 'ppx-ex__btn--wrong');
      picked.setAttribute('aria-checked', 'true');
      other.setAttribute('aria-checked', 'false');
      // Show feedback icon only on the selected pill
      if (correct) {
        picked.innerHTML = '<img class="ppx-ex-icon" src="/static/assets/icons/check.svg" alt="" width="22" height="22">\u00A0' + (picked.dataset.baseLabel || '');
      } else {
        picked.innerHTML = '<img class="ppx-ex-icon" src="/static/assets/icons/close.svg" alt="" width="22" height="22">\u00A0' + (picked.dataset.baseLabel || '');
      }
      // Other returns to text-only
      other.textContent = other.dataset.baseLabel || '';
      if (!correct && shakeOnWrong && !reduceMotion) {
        picked.classList.add('ppx-ex__btn--shake');
        setTimeout(() => picked.classList.remove('ppx-ex__btn--shake'), 320);
      }
      updateRadioFocusability();
    }
    function updateRadioFocusability() {
      const trueChecked = btnTrue.getAttribute('aria-checked') === 'true';
      const falseChecked = btnFalse.getAttribute('aria-checked') === 'true';
      if (trueChecked) { btnTrue.tabIndex = 0; btnFalse.tabIndex = -1; }
      else if (falseChecked) { btnTrue.tabIndex = -1; btnFalse.tabIndex = 0; }
      else { btnTrue.tabIndex = 0; btnFalse.tabIndex = -1; }
    }
    function renderDots() {
      dots.innerHTML = '';
      const totalDots = items.length; // exclude summary
      let lastAnswered = -1;
      if (DOTS_ONLY_ANSWERED) {
        for (let j = 0; j < items.length; j++) { if (answers.has(items[j].id)) lastAnswered = Math.max(lastAnswered, j); }
      }
      for (let i = 0; i < totalDots; i++) {
        const dot = document.createElement('span');
        dot.className = 'ppx-ex__dot';
        dot.setAttribute('role', 'button');
        const disabledByDotsOption = DOTS_ONLY_ANSWERED && i > lastAnswered;
        dot.tabIndex = disabledByDotsOption ? -1 : 0;
        dot.setAttribute('aria-label', L(`Ir a la pregunta ${i+1}`, `Go to question ${i+1}`));
        dot.setAttribute('aria-disabled', String(!!disabledByDotsOption));
        if (isSummary()) {
          dot.classList.add('is-done');
          if (i === totalDots - 1) dot.classList.add('is-current');
        } else {
          if (i < idx) dot.classList.add('is-done');
          if (i === idx) dot.classList.add('is-current');
        }
        const jumpTo = () => {
          const curAnswered = isSummary() ? true : answers.has(currentItem().id);
          if (disabledByDotsOption) return;
          if (LOCK_NAV_UNTIL_ANSWERED && !isSummary() && !curAnswered && i > idx) return;
          idx = Math.max(0, Math.min(items.length, i));
          renderItem();
          saveCache();
        };
        dot.addEventListener('click', (e) => { if (disabledByDotsOption) return; jumpTo(); });
        dot.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpTo(); }
        });
        dots.appendChild(dot);
      }
    }
    function renderFraction() {
      const cur = isSummary() ? items.length : (idx + 1);
      const tot = items.length;
      fraction.textContent = `${cur} / ${tot}`;
    }
    function progressPct() {
      if (isSummary()) return 1;
      const doneCount = Array.from(answers.keys()).length;
      const base = Math.max(doneCount / items.length, idx / items.length);
      return Math.min(1, base);
    }
    function renderProgressBar() {
      renderFraction();
      renderDots();
      api.setProgress(progressPct());
      // Show results shortcut if everything is answered and we are not on the summary
      try {
        const allAnswered = (Array.from(answers.keys()).length === items.length);
        btnResults.hidden = !(allAnswered && !isSummary());
        btnRestart.hidden = !allAnswered;
      } catch { btnResults.hidden = true; }
    }
    function unansweredCount() {
      const answered = new Set(answers.keys());
      return items.reduce((acc, it) => acc + (answered.has(it.id) ? 0 : 1), 0);
    }
    function firstUnansweredIndex() {
      for (let i = 0; i < items.length; i++) { if (!answers.has(items[i].id)) return i; }
      return -1;
    }
    function unansweredIndices() {
      const list = [];
      for (let i = 0; i < items.length; i++) { if (!answers.has(items[i].id)) list.push(i + 1); }
      return list;
    }
    function hideWarnBar() { warnBar.hidden = true; }
    function showWarnBar(count) {
      const idxs = unansweredIndices();
      const list = idxs.join(', ');
      warnMsg.textContent = L(`Sin responder: ${list}`, `Unanswered: ${list}`);
      btnReviewUn.disabled = (idxs.length === 0);
      btnReviewUn.textContent = L('Revisar sin responder', 'Review unanswered');
      btnContinue.textContent = L('Continuar', 'Continue');
      warnBar.hidden = false;
      try { btnContinue.focus({ preventScroll: true }); } catch {}
    }
    function attemptSummary() {
      if (!WARN_ON_UNANSWERED) {
        idx = items.length; renderItem(); saveCache(); return;
      }
      const n = unansweredCount();
      if (n > 0) { showWarnBar(n); return; }
      idx = items.length; renderItem(); saveCache();
    }

    // Warning bar actions
    btnReviewUn.addEventListener('click', () => {
      const i = firstUnansweredIndex();
      if (i >= 0) { idx = i; renderItem(); saveCache(); }
      hideWarnBar();
    });
    btnContinue.addEventListener('click', () => {
      idx = items.length; renderItem(); saveCache(); hideWarnBar();
    });
    function renderMediaBlock(item) {
      media.innerHTML = '';

      // Accept multiple shapes/keys for media
      const raw =
        (item && (item.media ?? item.medias ?? item.image ?? item.images)) ??
        item?.media_url ?? item?.image_url ?? null;

      let mlist = [];
      if (Array.isArray(raw)) {
        mlist = raw;
      } else if (raw && typeof raw === 'object') {
        mlist = [raw];
      } else if (typeof raw === 'string') {
        mlist = [{ kind: 'image', src: raw }];
      }

      if (!mlist.length) return;

      // Ensure a singleton zoom overlay
      let zoomRoot = renderMediaBlock._zoomRoot;
      function ensureZoom() {
        if (zoomRoot) return zoomRoot;
        const z = document.createElement('div');
        z.className = 'ppx-zoom';
        z.setAttribute('role', 'dialog');
        z.setAttribute('aria-modal', 'true');
        z.style.display = 'none';
        z.style.zIndex = '2147483648';

        const backdrop = document.createElement('div');
        backdrop.className = 'ppx-zoom__backdrop';

        const box = document.createElement('div');
        box.className = 'ppx-zoom__box';

        const img = document.createElement('img');
        img.alt = '';
        img.className = 'ppx-zoom__img';

        box.appendChild(img);
        z.appendChild(backdrop);
        z.appendChild(box);
        document.body.appendChild(z);

        function closeZoom() {
          z.style.display = 'none';
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('keydown', onTrapTab);
          try { z._prevFocus && z._prevFocus.focus({ preventScroll: true }); } catch {}
        }
        function onKey(e) {
          if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeZoom(); }
        }
        function onTrapTab(e) { if (e.key === 'Tab') { e.preventDefault(); } }
        z.addEventListener('click', closeZoom);

        z._open = (src, alt) => {
          z._prevFocus = document.activeElement;
          img.src = src;
          img.alt = alt || '';
          z.style.display = '';
          document.addEventListener('keydown', onKey);
          document.addEventListener('keydown', onTrapTab);
          try { box.setAttribute('tabindex', '-1'); box.focus({ preventScroll: true }); } catch {}
        };

        renderMediaBlock._zoomRoot = z;
        return z;
      }

      const grid = document.createElement('div');
      grid.className = 'ppx-media-grid';
      media.appendChild(grid);

      mlist.forEach(m => {
        // Normalize kind/src/alt across many possible keys
        let kind = String(m?.kind || m?.type || '').toLowerCase();

        const src = String(
          m?.src ?? m?.url ?? m?.href ?? m?.path ?? m?.file ?? m?.thumb ?? m?.image ?? m?.image_url ?? ''
        ).trim();

        // alt fallback → caption → current item statement
        const alt = String(
          (m?.alt || m?.alt_es || m?.alt_en || m?.caption || getText(item) || '')
        ).trim();

        // Infer kind when missing
        if (!kind && src) {
          if (/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(src)) kind = 'image';
          else if (/\.(mp3|ogg|wav)(\?|#|$)/i.test(src)) kind = 'audio';
          else if (/\.(mp4|webm|ogv)(\?|#|$)/i.test(src)) kind = 'video';
        }
        if (kind === 'img' || kind === 'picture' || kind === 'photo') kind = 'image';
        if (kind === 'sound') kind = 'audio';

        // IMAGE
        if (kind === 'image' && src) {
          const tile = document.createElement('div');
          tile.className = 'ppx-media-tile';
          tile.style.width = '100%';
          tile.style.margin = '6px 0';

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'ppx-media-imgbtn';
          btn.setAttribute('aria-label', L('Ampliar imagen', 'Expand image'));
          btn.style.display = 'block';
          btn.style.width = '100%';

          const img = document.createElement('img');
          img.src = src;
          img.alt = alt || '';
          img.className = 'ppx-media-img';
          img.decoding = 'async';
          img.loading = 'eager';
          img.style.display = 'block';
          img.style.width = '100%';
          img.style.height = 'auto';
          img.style.objectFit = 'contain';
          img.style.margin = '0 auto';
          img.style.maxHeight = '360px';

          img.addEventListener('error', () => {
            try { console.error('[PPX TF] Image failed to load:', src); } catch {}
            const fallback = document.createElement('div');
            fallback.style.margin = '6px 0';
            fallback.style.padding = '10px 12px';
            fallback.style.border = '1px solid var(--ppx-color-line,#e5e7eb)';
            fallback.style.borderRadius = '10px';
            fallback.style.background = '#fff8f8';
            fallback.style.color = '#7f1d1d';
            fallback.style.fontSize = '.9rem';
            fallback.textContent = L('No se pudo cargar la imagen', 'Failed to load image') + ' (' + src + ')';
            if (btn.parentNode) { btn.replaceWith(fallback); } else { tile.appendChild(fallback); }
          });

          btn.appendChild(img);
          tile.appendChild(btn);

          if (m.caption) {
            const cap = document.createElement('div');
            cap.className = 'ppx-media-caption';
            cap.textContent = String(m.caption);
            tile.appendChild(cap);
          }

          btn.addEventListener('click', () => {
            const zr = ensureZoom();
            zr._open(src, alt || '');
          });

          grid.appendChild(tile);
          return;
        }

        // AUDIO
        if (kind === 'audio' && src) {
          const tile = document.createElement('div');
          tile.className = 'ppx-media-tile';
          const row = document.createElement('div');
          row.className = 'ppx-media-audio';
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.preload = 'none';
          audio.src = src;
          row.appendChild(audio);
          tile.appendChild(row);

          const link = document.createElement('a');
          link.href = src;
          link.textContent = L('Abrir URL de audio', 'Open audio URL');
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.style.fontSize = '.85rem';
          link.style.color = 'var(--ppx-color-text-subtle,#64748b)';
          link.style.marginTop = '6px';
          tile.appendChild(link);

          grid.appendChild(tile);
          return;
        }

        // VIDEO
        if (kind === 'video' && src) {
          const tile = document.createElement('div');
          tile.className = 'ppx-media-tile';
          const row = document.createElement('div');
          row.className = 'ppx-media-video';
          const video = document.createElement('video');
          video.controls = true;
          video.preload = 'metadata';
          video.src = src;
          video.style.maxWidth = '100%';
          video.style.height = 'auto';
          row.appendChild(video);
          tile.appendChild(row);

          const link = document.createElement('a');
          link.href = src;
          link.textContent = L('Abrir URL de video', 'Open video URL');
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.style.fontSize = '.85rem';
          link.style.color = 'var(--ppx-color-text-subtle,#64748b)';
          link.style.marginTop = '6px';
          tile.appendChild(link);

          grid.appendChild(tile);
          return;
        }

        // Unsupported or missing
        const note = document.createElement('div');
        note.className = 'ppx-media-tile';
        const msg = document.createElement('div');
        msg.style.margin = '6px 0';
        msg.style.padding = '10px 12px';
        msg.style.border = '1px solid var(--ppx-color-line,#e5e7eb)';
        msg.style.borderRadius = '10px';
        msg.style.background = '#fffef5';
        msg.style.color = '#92400e';
        msg.style.fontSize = '.9rem';
        msg.textContent = (!src)
          ? L('Falta la URL del medio.', 'Missing media URL.')
          : L('Medio no soportado o no se pudo renderizar.', 'Unsupported or failed to render.');
        note.appendChild(msg);
        if (src) {
          const a = document.createElement('a');
          a.href = src;
          a.textContent = L('Abrir URL', 'Open URL');
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.style.fontSize = '.85rem';
          a.style.color = 'var(--ppx-color-text-subtle,#64748b)';
          a.style.marginTop = '6px';
          note.appendChild(a);
        }
        grid.appendChild(note);
      });

      // If the loop produced nothing, show a single diagnostic note.
      if (!grid.children.length) {
        const diag = document.createElement('div');
        diag.style.margin = '6px 0';
        diag.style.padding = '10px 12px';
        diag.style.border = '1px dashed var(--ppx-color-line,#e5e7eb)';
        diag.style.borderRadius = '10px';
        diag.style.background = '#fffef5';
        diag.style.color = '#92400e';
        diag.style.fontSize = '.9rem';
        diag.textContent = L('No se pudo mostrar la multimedia de este ítem.', 'Could not render media for this item.');
        grid.appendChild(diag);
      }
    }
    function renderHint(item, show) {
      const hint = getHint(item);
      if (!hint) {
        hintBlock.hidden = true;
        hintBlock.textContent = '';
        hintToggle.hidden = true;
        hintToggle.setAttribute('aria-expanded', 'false');
        hintToggle.textContent = L('Ver pista', 'Show hint');
        return;
      }
      hintToggle.hidden = false;
      hintBlock.textContent = '';
      if (opts.allowHintHTML) {
        try { hintBlock.innerHTML = `<em>${hint}</em>`; }
        catch { const em = document.createElement('em'); em.textContent = String(hint); hintBlock.appendChild(em); }
      } else {
        const em = document.createElement('em');
        em.textContent = String(hint);
        hintBlock.appendChild(em);
      }
      hintBlock.hidden = !show;
      hintToggle.setAttribute('aria-expanded', String(show));
      hintToggle.textContent = show ? L('Ocultar pista', 'Hide hint') : L('Ver pista', 'Show hint');
      if (show) { srLivePolite.textContent = hint; }
    }
    function openHintOnce(item) {
      const id = item.id;
      if (!hintOpenedOnce.has(id)) {
        hintOpenedOnce.add(id);
        hintsUsed += 1;
        api.hint && api.hint({ item: id });
        saveCache();
      }
    }
    function sfx(kind) {
      if (!ENABLE_SFX || !api.sfx) return;
      try { api.sfx(kind); } catch {}
    }

    function itemHasMedia(item) {
      const raw =
        (item && (item.media ?? item.medias ?? item.image ?? item.images)) ??
        item?.media_url ?? item?.image_url ?? null;

      if (!raw) return false;

      // String: must be a non-empty URL-ish value
      if (typeof raw === 'string') return raw.trim().length > 0;

      // Array: at least one entry with a valid src-like field or non-empty string
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

      // Object: must expose a valid src-like field
      if (typeof raw === 'object') {
        const src = raw.src ?? raw.url ?? raw.href ?? raw.path ?? raw.file ?? raw.thumb ?? raw.image ?? raw.image_url;
        return typeof src === 'string' && src.trim().length > 0;
      }

      return false;
    }

    function updateMediaToggleForItem(item) {
      const onSummary = isSummary();
      // Base visibility on actually rendered media elements to avoid false positives
      const hasRendered = !onSummary && !!media.querySelector('.ppx-media-grid, .ppx-media-audio, .ppx-media-video, img, audio, video');
      mediaToggle.hidden = !hasRendered;
      if (!hasRendered) { try { media.hidden = true; } catch(_){} }
      mediaToggle.style.display = mediaToggle.hidden ? 'none' : '';
      if (mediaToggle.hidden) return;
      const isHidden = mediaHidden.has(item.id);
      const visibleLabel = isHidden ? L('Mostrar multimedia', 'Show media') : L('Ocultar multimedia', 'Hide media');
      const icon = isHidden ? '/static/assets/icons/preview.svg' : '/static/assets/icons/close_preview.svg';
      mediaToggle.innerHTML = '<img class="ppx-ex-icon" src="' + icon + '" alt="" width="36" height="36">';
      mediaToggle.setAttribute('aria-label', visibleLabel);
      mediaToggle.setAttribute('title', visibleLabel);
      mediaToggle.setAttribute('data-tooltip', visibleLabel);
      mediaToggle.setAttribute('aria-expanded', String(!isHidden));
    }

    // ─────────────────────────────────────────────────────────────
    // Answering & navigation
    // ─────────────────────────────────────────────────────────────
    function setChoice(val) {
      if (isSummary()) return;

      const item = currentItem();
      const correct = String(item.answer).toLowerCase() === String(val).toLowerCase();

      // Retry logic
      const prevWrongCount = wrongCount.get(item.id) || 0;
      const willLockAfterThis =
        correct || !ALLOW_RETRY || prevWrongCount >= 1; // second selection or retries disabled

      // Record/overwrite current answer
      answers.set(item.id, { choice: String(val), correct });
      api.answer && api.answer({ item: item.id, correct });

      // Persist
      saveCache();

      // Visual state
      setState(correct ? 'correct' : 'wrong');
      clearChoiceStyles();
      applyChoiceStyles(String(val), correct, true);
      lockChoices(willLockAfterThis);

      // SFX
      sfx(correct ? 'correct' : 'wrong');

      // Announce result
      srLiveAssert.textContent = feedbackCopy(item, correct);
      inlineFB.textContent = feedbackCopy(item, correct);
      inlineFB.classList.toggle('is-ok', !!correct);
      inlineFB.classList.toggle('is-bad', !correct);

      // Handle hint on wrong
      if (!correct && getHint(item)) {
        openHintOnce(item);
        renderHint(item, true);
        wrongCount.set(item.id, prevWrongCount + 1);
        saveCache();
      }

      // If warning is visible, hide after making a selection
      if (!warnBar.hidden) { hideWarnBar(); }

      renderProgressBar();
      updateNav();

      // Focus management: move to Next/Finish after a selection
      queueMicrotask(() => btnNext.focus({ preventScroll: true }));

      // Auto-advance on correct (if enabled, not last, and motion allowed)
      if (correct && AUTO_ADVANCE && !reduceMotion && idx < items.length - 1) {
        setTimeout(() => { go(1); }, 420);
      }
    }

    function clearForNewItem() {
      setState('idle');
      clearChoiceStyles();
      lockChoices(false);
      renderHint(currentItem(), false);
      srLivePolite.textContent = '';
      srLiveAssert.textContent = '';
      inlineFB.textContent = '';
      inlineFB.classList.remove('is-ok', 'is-bad');
    }

    function renderItem() {
      // Summary slide
      if (isSummary()) {
        // Hide choice/hint UI, keep the media slot visible as the summary host
        setExerciseUIVisible(false);
        mediaToggle.hidden = true;
        mediaToggle.style.display = 'none';
        media.style.display = '';
        try { media.hidden = false; } catch(_){}
        media.innerHTML = '';
        prompt.textContent = '';
        renderProgressBar();

        const correct = Array.from(answers.values()).filter(v => v.correct).length;
        const score = Math.round((correct / (items.length || 1)) * 100);

        const labelForVal = (val) => {
          const v = String(val).toLowerCase() === 'true';
          return v ? L('Verdadero', 'True') : L('Falso', 'False');
        };

        const wrap = document.createElement('div');
        wrap.className = 'ppx-card';
        wrap.style.padding = '16px';
        wrap.style.width = '80%';
        wrap.style.maxWidth = 'none';
        wrap.style.margin = '0 auto';

        const hTitle = document.createElement('h3');
        hTitle.style.margin = '0 0 .25rem 0';
        hTitle.style.textAlign = 'center';
        hTitle.textContent = L('Resumen', 'Summary');

        const hMeta = document.createElement('p');
        hMeta.style.margin = '.25rem 0 1rem 0';
        hMeta.style.textAlign = 'center';

        const scoreBadge = document.createElement('span');
        scoreBadge.className = 'ppx-score';
        if (score >= 90) scoreBadge.classList.add('ppx-score--green');
        else if (score >= 80) scoreBadge.classList.add('ppx-score--blue');
        else if (score >= 70) scoreBadge.classList.add('ppx-score--orange');
        else scoreBadge.classList.add('ppx-score--red');
        scoreBadge.textContent = `${score}%`;

        const metaLabel = document.createElement('span');
        metaLabel.textContent = `${L('Puntaje', 'Score')}: `;
        const metaTail = document.createElement('span');
        metaTail.textContent = ` — ${correct}/${items.length}`;

        hMeta.appendChild(metaLabel);
        hMeta.appendChild(scoreBadge);
        hMeta.appendChild(metaTail);

        wrap.appendChild(hTitle);
        wrap.appendChild(hMeta);

        const list = document.createElement('div');
        list.setAttribute('role', 'list');
        list.style.display = 'grid';
        list.style.gap = '10px';

        items.forEach((it) => {
          const s = answers.get(it.id) || { choice: null, correct: false };
          const ok = !!s.correct;
          const stmt = getText(it) || L('(sin enunciado)', '(no statement)');
          const fb = feedbackCopy(it, ok);

          const details = document.createElement('details');
          details.className = 'ppx-acc';
          details.style.border = '1px solid var(--ppx-color-line, #e5e7eb)';
          details.style.borderRadius = '12px';
          details.style.overflow = 'hidden';
          details.style.background = '#fff';

          const summary = document.createElement('summary');
          summary.style.cursor = 'pointer';
          summary.style.listStyle = 'none';
          summary.style.padding = '12px 14px';
          summary.style.display = 'flex';
          summary.style.alignItems = 'center';
          summary.style.gap = '10px';

          const stmtEl = document.createElement('span');
          stmtEl.style.fontWeight = '700';
          stmtEl.style.flex = '1 1 auto';
          stmtEl.textContent = stmt;

          const chipState = document.createElement('span');
          chipState.className = `ppx-chip ${ok ? 'ppx-chip--ok' : 'ppx-chip--bad'}`;
          chipState.textContent = ok ? L('Correcto', 'Correct') : L('Incorrecto', 'Incorrect');

          summary.appendChild(stmtEl);
          summary.appendChild(chipState);

          const panel = document.createElement('div');
          panel.style.padding = '12px 14px 14px 14px';

          const yourAns = document.createElement('div');
          yourAns.style.margin = '2px 0 10px 0';
          yourAns.style.color = 'var(--ppx-color-text-subtle,#334155)';

          const ansLabel = document.createElement('span');
          ansLabel.textContent = `${L('Tu respuesta', 'Your answer')}: `;

          const ansStrong = document.createElement('strong');
          ansStrong.textContent = s.choice ? labelForVal(s.choice) : '-';
          yourAns.appendChild(ansLabel);
          yourAns.appendChild(ansStrong);

          const fbBox = document.createElement('div');
          fbBox.className = ok ? 'ppx-state--ok' : 'ppx-state--bad';
          fbBox.setAttribute('role', 'status');
          fbBox.setAttribute('aria-live', 'polite');
          fbBox.innerHTML = fb;

          panel.appendChild(yourAns);
          panel.appendChild(fbBox);

          details.appendChild(summary);
          details.appendChild(panel);
          list.appendChild(details);
        });

        wrap.appendChild(list);

        // Restart button (below last accordion)
        const restartRow = document.createElement('div');
        restartRow.style.display = 'flex';
        restartRow.style.justifyContent = 'center';
        restartRow.style.marginTop = '14px';

        const restartBtn = document.createElement('button');
        restartBtn.type = 'button';
        restartBtn.className = 'ppx-wbtn ppx-wbtn--orange';
        restartBtn.setAttribute('id', 'ppx-tf-restart');
        restartBtn.textContent = L('Reiniciar', 'Restart');
        restartRow.appendChild(restartBtn);
        wrap.appendChild(restartRow);

        // Place the summary card inside the visible media slot
        media.appendChild(wrap);

        // Fire completion once
        if (!summaryReported) {
          api.setProgress(1);
          api.complete({ score, correct, total: items.length, hints_used: hintsUsed, attempts });
          summaryReported = true;
          saveCache();
        }

        // Nav states (arrow-only UI): disable Next on summary
        btnNext.disabled = true;
        btnNext.setAttribute('aria-disabled', 'true');
        btnNext.setAttribute('aria-label', L('Siguiente (deshabilitado)', 'Next (disabled)'));
        btnPrev.disabled = (items.length === 0);
        btnPrev.setAttribute('aria-disabled', String(btnPrev.disabled));

        // Restart wiring
        restartBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation(); // prevent modal from closing
          clearCache();
          resetAll();
          try { btnTrue?.focus({ preventScroll: true }); } catch {}
        });

        return;
      }

      // Regular item
      setExerciseUIVisible(true);

      const item = currentItem();

      // Impression hook
      api.view && api.view({ item: item.id });

      const text = getText(item);
      prompt.textContent = text;
      prompt.title = text;

      // apply user’s per-item hidden state, then (re)render media and toggle
      media.hidden = mediaHidden.has(item.id);
      renderMediaBlock(item);
      updateMediaToggleForItem(item);

      renderProgressBar();

      // Restore prior selection if any
      const prev = answers.get(item.id);
      if (prev) {
        setState(prev.correct ? 'correct' : 'wrong');
        applyChoiceStyles(prev.choice, prev.correct, false);
        const prevWrong = wrongCount.get(item.id) || 0;
        const lockNow = prev.correct || !ALLOW_RETRY || prevWrong >= 1;
        lockChoices(lockNow);
        const shouldShowHint = !prev.correct && !!getHint(item);
        if (shouldShowHint) openHintOnce(item);
        renderHint(item, shouldShowHint);
        inlineFB.textContent = feedbackCopy(item, !!prev.correct);
        inlineFB.classList.toggle('is-ok', !!prev.correct);
        inlineFB.classList.toggle('is-bad', !prev.correct);
      } else {
        clearForNewItem();
      }

      updateNav();

      // After navigating, ensure roving tabindex is set and focus first pill
      updateRadioFocusability();
      queueMicrotask(() => btnTrue.focus({ preventScroll: true }));
    }

    function updateNav() {
      const atFirst = idx === 0;
      const atSummary = isSummary();

      btnPrev.disabled = atFirst && !atSummary;
      btnPrev.setAttribute('aria-disabled', String(btnPrev.disabled));

      if (atSummary) {
        // Next is disabled on summary; label updated in renderItem()
        btnNext.disabled = true;
        btnNext.setAttribute('aria-disabled', 'true');
        return;
      }

      // Lock Next until answered if flag is on
      const item = currentItem();
      const isAnswered = answers.has(item.id);
      btnNext.disabled = LOCK_NAV_UNTIL_ANSWERED ? !isAnswered : false;
      btnNext.setAttribute('aria-disabled', String(btnNext.disabled));
      // Arrow-only UI: aria-label only
      btnNext.setAttribute('aria-label', (idx === items.length - 1) ? L('Terminar', 'Finish') : L('Siguiente', 'Next'));
    }

    function go(delta) {
      const newIdx = Math.max(0, Math.min(items.length, idx + delta)); // allow summary
      if (newIdx === idx) return;
      idx = newIdx;
      hideWarnBar();
      renderItem();
      saveCache();
    }

    function resetAll() {
      answers.clear();
      wrongCount.clear();
      hintOpenedOnce.clear();
      mediaHidden.clear();
      hintsUsed = 0;
      attempts += 1;
      summaryReported = false;
      idx = 0;
      renderItem();
      saveCache();
      api.retry && api.retry();
    }

    // ─────────────────────────────────────────────────────────────
    // Events & Keyboard
    // ─────────────────────────────────────────────────────────────
    btnTrue.addEventListener('click', () => setChoice('true'));
    btnFalse.addEventListener('click', () => setChoice('false'));

    // Radiogroup keyboard UX (Left/Right to move, Space/Enter to choose)
    actions.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      if (active !== btnTrue && active !== btnFalse) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (active === btnTrue) { btnFalse.focus({ preventScroll: true }); }
        else { btnTrue.focus({ preventScroll: true }); }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (active === btnTrue) setChoice('true');
        else if (active === btnFalse) setChoice('false');
      }
    });

    btnPrev.addEventListener('click', () => {
      if (isSummary()) { idx = Math.max(0, items.length - 1); renderItem(); saveCache(); return; }
      go(-1);
    });
    btnNext.addEventListener('click', () => {
      // On summary, the Next is disabled and should do nothing
      if (isSummary()) return;
      if (btnNext.disabled) return;
      if (idx < items.length - 1) {
        go(1);
      } else {
        // from last item -> attempt summary (may warn)
        attemptSummary();
      }
    });

    hintToggle.addEventListener('click', () => {
      if (isSummary()) return;
      const item = currentItem();
      if (!getHint(item)) return;
      const willShow = hintBlock.hidden;
      if (willShow) openHintOnce(item);
      renderHint(item, willShow);
      saveCache();
    });

    mediaToggle.addEventListener('click', () => {
      if (isSummary()) return;
      const item = currentItem();
      if (!itemHasMedia(item)) return;
      const nowHidden = !media.hidden;
      media.hidden = nowHidden;
      if (nowHidden) mediaHidden.add(item.id);
      else mediaHidden.delete(item.id);
      updateMediaToggleForItem(item);
      saveCache();
    });

    root.addEventListener('keydown', (e) => {
      if (isSummary()) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); idx = Math.max(0, items.length - 1); renderItem(); saveCache(); }
        // ArrowRight/Enter no longer close the modal on summary
        return;
      }
      // If a radio is focused, let radiogroup handle Arrow keys
      const active = document.activeElement;
      if ((active === btnTrue || active === btnFalse) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        return;
      }
      // Selection shortcuts (V/F)
      if (e.key === 'v' || e.key === 'V') { e.preventDefault(); setChoice('true'); return; }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setChoice('false'); return; }
      // Navigation
      if (e.ctrlKey && e.key === 'ArrowRight') { e.preventDefault(); (idx < items.length - 1) ? go(1) : attemptSummary(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); (idx < items.length - 1) ? go(1) : attemptSummary(); return; }
      // Hint toggle
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        const item = currentItem();
        if (!getHint(item)) return;
        const willShow = hintBlock.hidden;
        if (willShow) openHintOnce(item);
        renderHint(item, willShow);
        saveCache();
      }
      // Enter/Space activate focused radio
      if (e.key === 'Enter' || e.key === ' ') {
        const active = document.activeElement;
        if (active === btnTrue) { e.preventDefault(); setChoice('true'); }
        else if (active === btnFalse) { e.preventDefault(); setChoice('false'); }
      }
    });

    // Initial load from cache (if any), then render
    loadCache();
    updateRadioFocusability();
    renderItem();

    // Cleanup
    return function cleanup() {};
  }

  // Expose legacy implementation for the object wrapper below
  try { window.PPX_TF_LEGACY = legacyPlugin; } catch(_){}
  window.PPX.registerType('tf', legacyPlugin);
})();


// -- Object-style API wrapper for TF (adapts legacy implementation)
(function(){
  if (!window.PPX) return;
  const Obj = {
    _cleanup: null,
    init(ctx){
      if (!ctx.api || typeof ctx.api.t !== 'function') {
        ctx.api = Object.assign({ t: (es,en)=> (ctx.lang === 'en' ? (en ?? es) : (es ?? en)) }, ctx.api || {});
      }
      const impl = (window.PPX_TF_LEGACY || null);
      if (!impl) {
        try {
          const msg = document.createElement('div');
          msg.className = 'ppx-state--bad';
          msg.setAttribute('role', 'alert');
          msg.innerHTML = '<strong>TF plugin missing.</strong>';
          ctx.api.setBody(msg);
        } catch(_){}
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
  window.PPX.registerType('tf', Obj);
})();
