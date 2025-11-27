/* static/js/ppx-dnd.js */
(function(){
  if (!window.PPX) return console.error('[PPX DnD] PPX core missing');

  function renderBoard(ctx) {
    const { el, opts, api, lang } = ctx;
    const t = (es, en) => (lang === 'en' ? (en ?? es) : (es ?? en));
    const item = (Array.isArray(opts.items) && opts.items[0]) || { columns: [], tokens: [] };
    const cols = Array.isArray(item.columns) ? item.columns : [];
    const toks = Array.isArray(item.tokens) ? item.tokens : [];
    function shuffle(arr){
      try {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
      } catch(_){}
      return arr;
    }

    // State
    const placements = new Map(); // tokenId -> columnId
    let checked = false;
    let correctCount = 0;
    let attempts = 1;
    let hintsUsed = 0;
    let locked = false; // lock interactions after check

    // Layout
    const root = document.createElement('div');
    root.className = 'ppx-ex__content-inner ppx-dnd';
    root.style.display = 'grid';
    root.style.gridTemplateColumns = '1fr';
    root.style.gap = '16px';

    // Optional global media (rendered below controls; toggleable)
    function renderExerciseMedia() {
      try {
        const m = opts.media || {};
        const hasImage = !!m.image_url;
        const hasVideo = !!m.video_url;
        const hasAudio = !!m.audio_url;
        const has = hasImage || hasVideo || hasAudio;
        if (!has) return false;

        media.innerHTML = '';
        // IMAGE
        if (hasImage) {
          const tile = document.createElement('div'); tile.className = 'ppx-media-tile';
          tile.style.width = '100%'; tile.style.margin = '6px 0';
          const box = document.createElement('div'); box.className = 'ppx-imgbox'; box.setAttribute('data-ppx-lightbox','true');
          const img = document.createElement('img');
          img.src = String(m.image_url);
          img.alt = '';
          img.className = 'ppx-media-img';
          img.style.display = 'block'; img.style.width = '100%'; img.style.height = 'auto';
          img.style.objectFit = 'contain'; img.style.margin = '0 auto';
          img.style.maxHeight = '360px';
          box.appendChild(img);
          tile.appendChild(box);
          media.appendChild(tile);
        }
        // VIDEO
        if (hasVideo) {
          const tile = document.createElement('div'); tile.className = 'ppx-media-tile';
          const row = document.createElement('div'); row.className = 'ppx-media-video';
          const v = document.createElement('video'); v.controls = true; v.preload = 'metadata'; v.src = String(m.video_url);
          v.style.maxWidth = '100%'; v.style.maxHeight = '420px';
          row.appendChild(v); tile.appendChild(row); media.appendChild(tile);
        }
        // AUDIO
        if (hasAudio) {
          const tile = document.createElement('div'); tile.className = 'ppx-media-tile';
          const row = document.createElement('div'); row.className = 'ppx-media-audio';
          const a = document.createElement('audio'); a.controls = true; a.preload = 'metadata'; a.src = String(m.audio_url);
          a.style.width = '100%'; row.appendChild(a); tile.appendChild(row); media.appendChild(tile);
        }

        // Toggle visibility and label
        mediaToggle.hidden = false;
        const updateToggle = () => {
          const isHidden = media.hidden === true;
          const visibleLabel = isHidden ? t('Mostrar multimedia','Show media') : t('Ocultar multimedia','Hide media');
          const icon = isHidden ? '/static/assets/icons/preview.svg' : '/static/assets/icons/close_preview.svg';
          mediaToggle.innerHTML = '<img class="ppx-ex-icon" src="' + icon + '" alt="" width="36" height="36">';
          mediaToggle.setAttribute('aria-label', visibleLabel);
          mediaToggle.setAttribute('title', visibleLabel);
          mediaToggle.setAttribute('data-tooltip', visibleLabel);
          mediaToggle.setAttribute('aria-expanded', String(!isHidden));
        };
        updateToggle();
        mediaToggle.onclick = () => { media.hidden = !media.hidden; updateToggle(); };
        return true;
      } catch(_) { return false; }
    }

    // Inline controls (top bar)
    const controls = document.createElement('div');
    controls.className = 'ppx-row';
    controls.style.alignItems = 'center';
    controls.style.gap = '8px';
    const btnCheck = document.createElement('button');
    btnCheck.type = 'button';
    btnCheck.className = 'ppx-btn ppx-btn--primary';
    btnCheck.textContent = t('Comprobar','Check');
    const btnReset = document.createElement('button');
    btnReset.type = 'button';
    btnReset.className = 'ppx-btn';
    btnReset.textContent = t('Reiniciar','Reset');
    controls.appendChild(btnCheck);
    controls.appendChild(btnReset);

    // Optional media block + toggle (exercise-level)
    const mediaToggle = document.createElement('button');
    mediaToggle.type = 'button';
    mediaToggle.className = 'ppx-ex__media-toggle ppx-ex__iconBtn ppx-tooltip';
    mediaToggle.hidden = true;
    mediaToggle.setAttribute('aria-expanded', 'true');

    const media = document.createElement('div');
    media.className = 'ppx-media-block';

    // Tokens pool
    const pool = document.createElement('div');
    pool.className = 'ppx-dnd__pool';
    pool.style.display = 'flex';
    pool.style.flexWrap = 'wrap';
    pool.style.gap = '10px';

    // Columns area
    const colsWrap = document.createElement('div');
    colsWrap.className = 'ppx-dnd__cols';
    colsWrap.style.display = 'grid';
    colsWrap.style.gap = '12px';
    colsWrap.style.gridTemplateColumns = `repeat(${Math.max(2, cols.length || 2)}, minmax(0,1fr))`;

    // Score pill helpers (appears above the columns after checking)
    function ensureScorePill() {
      let bar = root.querySelector('.ppx-dnd__score');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'ppx-dnd__score';
        bar.style.display = 'flex';
        bar.style.alignItems = 'center';
        bar.style.gap = '8px';
        bar.style.margin = '4px 0 0 0';
        // Insert just before the columns grid
        root.insertBefore(bar, colsWrap);
      }
      return bar;
    }

    function setScore(scorePct) {
      const bar = ensureScorePill();
      bar.innerHTML = '';
      const pill = document.createElement('span');
      pill.className = 'ppx-pill';
      pill.textContent = `${scorePct}%`;
      pill.style.fontWeight = '700';
      const ok = (scorePct >= 60);
      const col = ok ? 'var(--ppx-success, #166534)' : 'var(--ppx-danger, #991b1b)';
      pill.style.color = col;
      pill.style.border = `1px solid ${col}`;
      bar.appendChild(pill);
    }

    function expandModal(){
      try {
        const modal = document.querySelector('.ppx-modal');
        if (modal && !modal.classList.contains('ppx-modal--fullscreen')) {
          modal.classList.add('ppx-modal--fullscreen');
        }
      } catch(_) {}
    }

    function tokenNode(tok){
      const n = document.createElement('button');
      n.type = 'button';
      n.className = 'ppx-pill';
      n.style.cursor = 'grab';
      n.setAttribute('data-tok', tok.id);
      const label = (lang === 'en' ? tok.text_en : tok.text_es) || tok.text_es || tok.text_en || tok.id;
      n.textContent = label;
      n.draggable = true;
      n.addEventListener('dragstart', (e) => {
        if (locked) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', tok.id);
      });
      // Keyboard move: focus token then use number keys 1..N to drop into a column
      n.addEventListener('keydown', (e) => {
        if (locked) return;
        const idx = Number(e.key) - 1;
        if (Number.isInteger(idx) && idx >= 0 && idx < cols.length) {
          place(tok.id, cols[idx].id);
        }
      });
      // Hint button (if present)
      const hasHint = !!(tok.hint_es || tok.hint_en);
      if (hasHint) {
        const hb = document.createElement('button');
        hb.type = 'button';
        hb.className = 'ppx-ex__iconBtn';
        hb.title = t('Ver pista', 'Show hint');
        hb.setAttribute('aria-label', hb.title);
        hb.style.marginLeft = '6px';
        hb.style.display = 'inline-flex';
        hb.style.alignItems = 'center';
        hb.style.justifyContent = 'center';
        hb.style.verticalAlign = 'middle';
        const img = document.createElement('img');
        img.src = '/static/assets/icons/hint.svg';
        img.alt = '';
        img.width = 16; img.height = 16;
        hb.appendChild(img);
        hb.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const hintText = (lang === 'en' ? tok.hint_en : tok.hint_es) || tok.hint_es || tok.hint_en || '';
          if (!hintText) return;
          try { api.hint({ item: tok.id }); } catch(_) {}
          expandModal();
          // Small tooltip-like modal anchored to button
          const rect = hb.getBoundingClientRect();
          const panel = document.createElement('div');
          panel.className = 'ppx-card';
          panel.style.position = 'fixed';
          panel.style.zIndex = '2147483647';
          panel.style.maxWidth = '420px';
          panel.style.background = '#fff';
          panel.style.border = '1px solid var(--ppx-color-line,#e5e7eb)';
          panel.style.borderRadius = '10px';
          panel.style.boxShadow = '0 10px 24px rgba(0,0,0,.25)';
          panel.style.padding = '.6rem .75rem';
          panel.textContent = hintText;
          // position below and aligned left with some offset
          const top = Math.min(window.innerHeight - 80, rect.bottom + 8);
          const left = Math.max(8, Math.min(window.innerWidth - 440, rect.left));
          panel.style.top = top + 'px';
          panel.style.left = left + 'px';
          const modalRoot = document.querySelector('.ppx-modal') || document.body;
          modalRoot.appendChild(panel);
          const closer = (e) => { try { panel.remove(); } catch(_){} window.removeEventListener('click', closer, true); window.removeEventListener('keydown', esc, true); };
          const esc = (e) => { if (e.key === 'Escape') closer(); };
          setTimeout(() => { window.addEventListener('click', closer, true); window.addEventListener('keydown', esc, true); }, 0);
        });
        n.appendChild(hb);
      }
      return n;
    }

    function columnNode(col, idx){
      const card = document.createElement('div');
      card.className = 'ppx-card ppx-dnd__col';
      card.style.minHeight = '120px';
      card.style.padding = '12px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '10px';
      card.setAttribute('data-col', col.id);

      const head = document.createElement('div');
      head.className = 'ppx-row';
      head.style.alignItems = 'center';
      head.style.justifyContent = 'space-between';
      head.style.gap = '8px';
      const title = document.createElement('div');
      title.className = 'ppx-pill ppx-pill--type';
      title.textContent = (lang === 'en' ? col.label_en : col.label_es) || col.label_es || col.label_en || t('Columna', 'Column') + ' ' + (idx+1);
      const hint = document.createElement('div');
      hint.className = 'ppx-muted';
      hint.textContent = `${idx+1}`;
      head.appendChild(title); head.appendChild(hint);

      const drop = document.createElement('div');
      drop.className = 'ppx-dnd__drop';
      drop.style.minHeight = '60px';
      drop.style.border = '1px dashed var(--ppx-color-line,#e5e7eb)';
      drop.style.borderRadius = '8px';
      drop.style.padding = '8px';
      drop.style.display = 'flex';
      drop.style.flexWrap = 'wrap';
      drop.style.gap = '8px';
      drop.setAttribute('data-drop', col.id);
      drop.addEventListener('dragover', (e) => e.preventDefault());
      drop.addEventListener('drop', (e) => {
        e.preventDefault();
        const tokId = e.dataTransfer.getData('text/plain');
        if (tokId) place(tokId, col.id);
      });

      card.appendChild(head);
      card.appendChild(drop);
      return card;
    }

    function ensureTokWrap(btn){
      let wrap = btn.closest && btn.closest('.ppx-dnd__item');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'ppx-dnd__item';
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';
        wrap.style.alignItems = 'flex-start';
        wrap.style.gap = '6px';
        wrap.style.transition = 'transform 220ms ease, opacity 120ms ease';
        // Replace button with wrapper and reattach button inside
        const parent = btn.parentElement;
        if (parent) parent.replaceChild(wrap, btn);
        wrap.appendChild(btn);
      }
      return wrap;
    }

    function place(tokId, colId){
      if (locked) return;
      placements.set(tokId, colId);
      const btn = root.querySelector(`[data-tok="${CSS.escape(tokId)}"]`);
      const target = root.querySelector(`[data-drop="${CSS.escape(colId)}"]`);
      if (!btn || !target) return;
      // FLIP animation: measure start
      const startRect = (btn.closest('.ppx-dnd__item') || btn).getBoundingClientRect();
      // Ensure wrapper exists
      const wrap = ensureTokWrap(btn);
      target.appendChild(wrap);
      // Measure end
      const endRect = wrap.getBoundingClientRect();
      const dx = startRect.left - endRect.left;
      const dy = startRect.top - endRect.top;
      // Apply transform from old position to new, then animate to identity
      wrap.style.transform = `translate(${dx}px, ${dy}px)`;
      wrap.style.willChange = 'transform';
      requestAnimationFrame(() => {
        wrap.style.transform = 'translate(0, 0)';
        // cleanup willChange later
        setTimeout(() => { try { wrap.style.willChange = ''; } catch(_){} }, 250);
      });
    }

    function reset() {
      placements.clear();
      checked = false; correctCount = 0; attempts += 1; hintsUsed = 0;
      locked = false;
      // Move all tokens back to pool and clear styles
      const btns = Array.from(root.querySelectorAll('[data-tok]'));
      shuffle(btns);
      btns.forEach(btn => {
        btn.classList.remove('ppx-state--ok','ppx-state--bad');
        const wrap = btn.closest('.ppx-dnd__item');
        if (wrap && wrap.parentElement) {
          // unwrap
          try { wrap.parentElement.replaceChild(btn, wrap); } catch(_) {}
        }
        pool.appendChild(btn);
      });
      // Remove results/feedback
      root.querySelectorAll('.ppx-dnd__fb, .ppx-dnd__results').forEach(n => n.remove());
      // Re-enable Check
      btnCheck.disabled = false;
      api.setProgress(0);
      api.retry();
    }

    function check() {
      checked = true; correctCount = 0;
      const total = toks.length || 1;
      // clear previous feedback nodes and results
      root.querySelectorAll('.ppx-dnd__fb, .ppx-dnd__results').forEach(n => n.remove());
      toks.forEach(tok => {
        const assigned = placements.get(tok.id);
        const ok = !!assigned && assigned === tok.correct;
        const btn = root.querySelector(`[data-tok="${CSS.escape(tok.id)}"]`);
        if (btn) {
          btn.classList.remove('ppx-state--ok','ppx-state--bad');
          btn.classList.add(ok ? 'ppx-state--ok' : 'ppx-state--bad');
          // Inline feedback
          const fb = ok
            ? ((lang === 'en' ? tok.feedback_correct_en : tok.feedback_correct_es) || tok.feedback_correct_es || tok.feedback_correct_en)
            : ((lang === 'en' ? tok.feedback_incorrect_en : tok.feedback_incorrect_es) || tok.feedback_incorrect_es || tok.feedback_incorrect_en);
          if (fb) {
            const wrap = btn.closest('.ppx-dnd__item') || btn.parentElement || btn;
            const fbEl = document.createElement('div');
            fbEl.className = 'ppx-dnd__fb ' + (ok ? 'ppx-state--ok' : 'ppx-state--bad');
            fbEl.style.fontSize = '.95rem';
            fbEl.style.marginTop = '6px';
            fbEl.style.lineHeight = '1.35';
            fbEl.textContent = fb;
            wrap.appendChild(fbEl);
          }
        }
        api.answer({ item: tok.id, correct: ok });
        if (ok) correctCount += 1;
      });
      api.setProgress(correctCount / total);
      expandModal();
      locked = true;
      // prevent further dragging
      root.querySelectorAll('[data-tok]').forEach(btn => { try { btn.draggable = false; btn.style.cursor = 'default'; } catch(_){} });
      // Summary score pill at the very top (above columns)
      const scorePct = Math.round((correctCount / total) * 100);
      setScore(scorePct);
      // Disable Check; Reset becomes orange wide button like others
      btnCheck.disabled = true;
      btnReset.className = 'ppx-wbtn ppx-wbtn--orange';
    }

    // Mount initial UI
    // Initial token order: shuffle for public viewing
    shuffle(toks.slice()).forEach(tok => pool.appendChild(tokenNode(tok)));
    cols.forEach((c, i) => colsWrap.appendChild(columnNode(c, i)));
    root.appendChild(controls);
    // Render media (if present) and mount its toggle just below controls
    const hasMedia = renderExerciseMedia();
    if (hasMedia) { root.appendChild(mediaToggle); root.appendChild(media); }
    root.appendChild(pool);
    root.appendChild(colsWrap);

    // First-run instructions screen (consistent with other types)
    (function(){
      try {
        const slug = opts.slug || (opts.id && String(opts.id).split('/').pop()) || 'dnd';
        const introKey = 'ppx:intro:dismissed:dnd/' + String(slug);
        const langIsEn = (String(lang||'es').toLowerCase().startsWith('en'));
        const instr = langIsEn
          ? ((opts.instructions_en) || (opts.instructions_es) || '')
          : ((opts.instructions_es) || (opts.instructions_en) || '');
        const shouldShow = !!instr && !localStorage.getItem(introKey);
        if (shouldShow) {
          const intro = document.createElement('div'); intro.className='ppx-card'; intro.style.padding='18px 20px'; intro.style.margin='0 auto'; intro.style.maxWidth='820px';
          const h = document.createElement('h2'); h.textContent = (langIsEn ? 'Instructions' : 'Instrucciones'); h.style.marginTop='4px';
          const body = document.createElement('div'); body.className='ppx-p'; body.innerHTML = instr;
          const actionsRow = document.createElement('div'); actionsRow.className='ppx-row'; actionsRow.style.justifyContent='center'; actionsRow.style.marginTop='12px';
          const startBtn = document.createElement('button'); startBtn.type='button'; startBtn.className='ppx-btn ppx-btn--primary'; startBtn.textContent = (langIsEn ? 'Start' : 'Comenzar');
          actionsRow.appendChild(startBtn);
          intro.appendChild(h); intro.appendChild(body); intro.appendChild(actionsRow);
          if (window.PPXModal && typeof PPXModal.setBody==='function') {
            PPXModal.setBody(intro);
          } else {
            root.style.display='none'; el.appendChild(intro);
          }
          startBtn.addEventListener('click', function(ev){
            try { ev && ev.preventDefault(); ev && ev.stopPropagation(); } catch(_){ }
            try { localStorage.setItem(introKey,'1'); } catch(_){ }
            if (window.PPXModal && typeof PPXModal.setBody==='function') {
              PPXModal.setBody(root);
            } else {
              try { intro.remove(); } catch(_){}
              root.style.display='';
            }
            try { const m=document.querySelector('.ppx-modal'), o=document.querySelector('.ppx-modal__overlay'); if(m&&o){ m.classList.add('is-open'); o.classList.add('is-open'); m.setAttribute('aria-hidden','false'); } } catch(_){ }
          });
        } else {
          api.setBody(root);
        }
      } catch(_) { api.setBody(root); }
    })();
    // Hide footer actions for DnD (inline controls only)
    api.setActions({});
    api.setProgress(0);

    // Wire inline controls
    btnCheck.addEventListener('click', () => check());
    btnReset.addEventListener('click', () => reset());
  }

  const plugin = {
    init(ctx){ /* no-op for now */ },
    start(ctx){ renderBoard(ctx); },
    destroy(ctx){ /* no-op */ }
  };

  window.PPX.registerType('dnd', plugin);
})();
