/* static/js/ppx-ctc.js */
(function(){
  if (!window.PPX) return console.error('[PPX CTC] PPX core missing');

  function createPill(data, lang){
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'ppx-chip';
    pill.style.fontFamily = 'Montserrat, "Segoe UI", system-ui, sans-serif';
    pill.style.fontSize = '15px';
    pill.style.fontWeight = '600';
    pill.style.padding = '8px 12px';
    pill.style.minHeight = '38px';
    pill.style.border = '1px solid #d0d7e2';
    pill.style.borderRadius = '999px';
    pill.style.boxShadow = '0 1px 2px rgba(16,24,40,0.08)';
    pill.style.transition = 'transform 0.12s ease, box-shadow 0.12s ease';
    pill.addEventListener('mouseenter', ()=>{ pill.style.transform='translateY(-1px)'; pill.style.boxShadow='0 4px 8px rgba(16,24,40,0.12)'; });
    pill.addEventListener('mouseleave', ()=>{ pill.style.transform=''; pill.style.boxShadow='0 1px 2px rgba(16,24,40,0.08)'; });
    pill.draggable = true;
    pill.dataset.cid = data.id;
    const isEn = String(lang || 'es').toLowerCase().startsWith('en');
    pill.textContent = isEn ? (data.text_en || data.text_es || data.id) : (data.text_es || data.text_en || data.id);
    return pill;
  }

  window.PPX.registerType('ctc', function(ctx){
    // Prevent the exercise modal from being closed unintentionally while CTC is active.
    // Restore the original close handler when the modal is closed.
    try {
      const W = window;
      if (W.PPXModal) {
        const origClose = W.PPXModal.__ctcOrigClose || W.PPXModal.close?.bind(W.PPXModal);
        if (!W.PPXModal.__ctcPatched && origClose) {
          W.PPXModal.close = function(force){
            if (force === true || force === 'override') {
              return origClose(force);
            }
            return; // ignore incidental closes while CTC modal is open
          };
          W.PPXModal.__ctcPatched = true;
          W.PPXModal.__ctcOrigClose = origClose;
          const restore = () => {
            try {
              if (W.PPXModal && W.PPXModal.__ctcPatched && W.PPXModal.__ctcOrigClose) {
                W.PPXModal.close = W.PPXModal.__ctcOrigClose;
                W.PPXModal.__ctcPatched = false;
              }
            } catch(_){}
            W.removeEventListener('ppx:modal:close', restore);
          };
          W.addEventListener('ppx:modal:close', restore);
        }
      }
    } catch(_){}
    const api = ctx && ctx.api ? ctx.api : {};
    const data = (ctx && (ctx.data || ctx.payload)) || {};
    const lang = ctx?.lang || api.lang || 'es';
    const IS_EN = String(lang || 'es').toLowerCase().startsWith('en');
    const t = (es, en) => (IS_EN ? (en ?? es) : (es ?? en));
    const pick = (es, en) => (IS_EN ? (en || es || '') : (es || en || ''));
    const items = Array.isArray(data.items) ? data.items.slice().sort((a,b)=>(a.order||0)-(b.order||0)) : [];
    const sanitize = (html) => String(html||'').replace(/<(?!\/?(b|strong|i|em)\b)[^>]*>/gi,'');

    const cacheKey = (
      ctx?.opts?.slug ||
      ctx?.opts?.id ||
      data.slug ||
      data.id ||
      ctx?.payload?.slug ||
      ctx?.payload?.id ||
      ctx?.exercise?.slug ||
      ctx?.exercise?.id ||
      (`ctc:${(location && location.pathname) ? location.pathname : ''}`)
    ).toString().toLowerCase();
    const storageKey = `ppx_ctc_state:${cacheKey}`;
    const STATE = window.__PPX_CTC_STATE || (window.__PPX_CTC_STATE = {});

    function loadStored(){
      try { const raw = localStorage.getItem(storageKey); if (raw) return JSON.parse(raw); } catch(_) {}
      return null;
    }
    function saveStored(obj){
      try { localStorage.setItem(storageKey, JSON.stringify(obj)); } catch(_) {}
    }

    let saved = loadStored() || STATE[cacheKey] || { idx: 0, items: {}, completed: false };
    saved.idx = Math.min(saved.idx || 0, items.length);

    const results = [];
    let idx = saved.idx || 0;

    function persistAll(){
      if (!cacheKey) return;
      STATE[cacheKey] = saved;
      saveStored(saved);
    }
    function clearAllState(){
      saved = { idx: 0, items: {}, completed: false };
      STATE[cacheKey] = saved;
      try { localStorage.removeItem(storageKey); } catch(_){}
      persistAll();
    }

    function scorePill(pct){
      const pill = document.createElement('span');
      pill.className = 'ppx-score';
      pill.textContent = `${pct}%`;
      if (pct >= 90) pill.classList.add('ppx-score--green');
      else if (pct >= 80) pill.classList.add('ppx-score--blue');
      else if (pct >= 70) pill.classList.add('ppx-score--orange');
      else pill.classList.add('ppx-score--red');
      return pill;
    }

    function showSummary(){
      let totalPrompts = 0, correctPrompts = 0;
      const wrap = document.createElement('div');
      wrap.className = 'ppx-col';
      wrap.style.gap = '12px';

      const header = document.createElement('div'); header.className='ppx-col'; header.style.alignItems='center'; header.style.textAlign='center'; header.style.gap='6px';
      const h = document.createElement('h2'); h.textContent = t('Resumen','Summary'); h.style.margin='0'; h.style.textAlign='center';
      header.appendChild(h);

      const list = document.createElement('div'); list.className='ppx-col'; list.style.gap='10px';

      items.forEach((it, idxItem) => {
        const contMap = new Map((it.continuations||[]).map(c => [c.id, c]));
        const savedItem = saved.items[it.id] || {};
        const placementsObj = savedItem.placements || {};
        let itemCorrect = 0;
        const promptCount = Array.isArray(it.prompts) ? it.prompts.length : 0;
        totalPrompts += promptCount;
        const det = document.createElement('details'); det.className='ppx-acc'; det.style.border='1px solid var(--ppx-color-line,#e5e7eb)'; det.style.borderRadius='12px'; det.style.overflow='hidden'; det.style.background='#fff';
        const sum = document.createElement('summary'); sum.style.cursor='pointer'; sum.style.listStyle='none'; sum.style.padding='12px 14px'; sum.style.display='flex'; sum.style.alignItems='center'; sum.style.gap='10px'; sum.style.flexWrap='nowrap';
        const title = document.createElement('span'); title.style.flex='1 1 auto'; title.style.minWidth='0'; title.style.whiteSpace='pre-wrap';
        const promptNames = (it.prompts||[]).slice(0,2).map(p => sanitize(IS_EN ? (p.prompt_en || p.prompt_es || '') : (p.prompt_es || p.prompt_en || ''))).filter(Boolean);
        const idxLabel = `<strong>${idxItem+1}.</strong> `;
        title.innerHTML = idxLabel + (promptNames.length ? promptNames.join(' / ') : `${t('Item','Item')} ${idxItem+1}`);
        sum.appendChild(title);
        det.appendChild(sum);

        const body = document.createElement('div'); body.className='ppx-col'; body.style.gap='8px'; body.style.padding='10px 14px 14px 14px';

        (it.prompts||[]).forEach((p) => {
          const chosenId = placementsObj[p.id];
          const cont = contMap.get(chosenId);
          const ok = chosenId && chosenId === p.expects;
          if (ok) itemCorrect += 1;
          const card = document.createElement('div'); card.className='ppx-card'; card.style.padding='10px'; card.style.gap='8px'; card.style.display='flex'; card.style.flexDirection='column';
          const rowTop = document.createElement('div'); rowTop.className='ppx-row'; rowTop.style.gap='8px'; rowTop.style.alignItems='center';
          const promptTxt = document.createElement('div'); promptTxt.innerHTML = sanitize(IS_EN ? (p.prompt_en || p.prompt_es || '') : (p.prompt_es || p.prompt_en || ''));
          promptTxt.style.flex='1';
          const status = document.createElement('span'); status.className = ok ? 'ppx-chip ppx-chip--ok' : 'ppx-chip ppx-chip--bad';
          status.textContent = ok ? t('Correcto','Correct') : t('Incorrecto','Incorrect');
          rowTop.appendChild(promptTxt); rowTop.appendChild(status);
          card.appendChild(rowTop);
          const chosenRow = document.createElement('div'); chosenRow.className='ppx-row'; chosenRow.style.gap='6px'; chosenRow.style.alignItems='center';
          const lblChosen = document.createElement('span'); lblChosen.className='ppx-muted'; lblChosen.textContent = t('Tu elección:','Your choice:');
          const chosenTxt = document.createElement('span'); chosenTxt.textContent = cont ? (IS_EN ? (cont.text_en || cont.text_es || cont.id) : (cont.text_es || cont.text_en || cont.id)) : t('Sin respuesta','No answer');
          chosenRow.appendChild(lblChosen); chosenRow.appendChild(chosenTxt);
          card.appendChild(chosenRow);
          const hintText = pick(p.hint_es, p.hint_en);
          if (hintText) {
            const hintRow = document.createElement('div');
            hintRow.className = 'ppx-state--info';
            hintRow.style.display='flex';
            hintRow.style.alignItems='flex-start';
            hintRow.style.gap='8px';
            hintRow.style.padding='8px 10px';
            hintRow.style.borderRadius='12px';
            const hIcon = document.createElement('img'); hIcon.src='/static/assets/icons/hint.svg'; hIcon.alt=''; hIcon.width=18; hIcon.height=18;
            const hSpan = document.createElement('span'); hSpan.textContent = hintText;
            hintRow.appendChild(hIcon); hintRow.appendChild(hSpan);
            card.appendChild(hintRow);
          }
          const fbText = document.createElement('div'); fbText.className = ok ? 'ppx-state--ok' : 'ppx-state--bad';
          fbText.style.display = 'flex';
          fbText.style.alignItems = 'flex-start';
          fbText.style.gap = '8px';
          fbText.dataset.hasIcon = 'true';
          const fbIcon = document.createElement('img'); fbIcon.src = ok ? '/static/assets/icons/correct.svg' : '/static/assets/icons/incorrect.svg'; fbIcon.alt=''; fbIcon.width=18; fbIcon.height=18;
          fbText.appendChild(fbIcon);
          const contMsg = ok
            ? (cont && pick(cont.feedback_correct_es, cont.feedback_correct_en))
            : (cont && pick(cont.feedback_incorrect_es, cont.feedback_incorrect_en));
          const promptMsg = ok
            ? pick(p.feedback_correct_es, p.feedback_correct_en)
            : pick(p.feedback_incorrect_es, p.feedback_incorrect_en);
          const fbTextContent = contMsg || promptMsg || (ok ? t('¡Bien hecho!','Nice job!') : t('Revisa esta continuación.','Check this continuation.'));
          fbText.appendChild(document.createTextNode(fbTextContent));
          card.appendChild(fbText);
          body.appendChild(card);
        });

        const pct = promptCount ? Math.round((itemCorrect / promptCount) * 100) : 0;
        correctPrompts += itemCorrect;
        const pill = scorePill(pct);
        sum.appendChild(pill);
        det.appendChild(body);
        list.appendChild(det);
      });

      const overallPct = Math.round((correctPrompts/Math.max(1,totalPrompts))*100);
      const metaRow = document.createElement('div'); metaRow.className='ppx-row'; metaRow.style.alignItems='center'; metaRow.style.gap='10px'; metaRow.style.flexWrap='wrap';
      metaRow.style.justifyContent='center';
      const overallLabel = document.createElement('div'); overallLabel.textContent = `${t('Puntaje','Score')}: ${correctPrompts}/${totalPrompts}`;
      metaRow.appendChild(overallLabel);
      metaRow.appendChild(scorePill(overallPct));

      wrap.appendChild(metaRow);
      wrap.appendChild(list);
      const btn = document.createElement('button'); btn.type='button'; btn.className='ppx-btn ppx-btn--ghost'; btn.textContent=t('Reiniciar','Restart');
      btn.style.alignSelf='center';
      btn.style.border='1px solid #f97316';
      btn.style.color='#f97316';
      btn.style.display='inline-flex';
      btn.style.alignItems='center';
      btn.style.gap='6px';
      btn.style.width='fit-content';
      btn.style.minWidth='0';
      btn.style.padding='8px 14px';
      btn.style.flexGrow='0';
      btn.style.flexShrink='0';
      btn.style.margin='8px auto 0 auto';
      const icon = document.createElement('img'); icon.src='/static/assets/icons/refresh.svg'; icon.alt=''; icon.width=16; icon.height=16;
      btn.prepend(icon);
      btn.addEventListener('click', ()=> {
        clearAllState();
        idx = 0;
        results.length = 0;
        renderItem();
      });
      wrap.appendChild(btn);
      api.setActions({});
      api.setBody(wrap);
      saved.completed = true;
      saved.idx = items.length;
      persistAll();
    }

    function renderItem(){
      if (saved.completed && idx >= items.length) { showSummary(); return; }
      if (!items[idx]) { showSummary(); return; }
      const item = items[idx];
      const continuations = Array.isArray(item.continuations) ? item.continuations : [];
      const prompts = Array.isArray(item.prompts) ? item.prompts : [];
      const body = document.createElement('div');
      body.className = 'ppx-col';
      body.style.gap = '12px';

      const top = document.createElement('div'); top.className='ppx-row'; top.style.gap='8px'; top.style.alignItems='center';
      const info = document.createElement('span'); info.className='ppx-chip'; info.textContent = t('Item','Item') + ` ${idx+1}/${items.length}`;
      top.appendChild(info);
      body.appendChild(top);

      const bank = document.createElement('div'); bank.className='ppx-row'; bank.style.flexWrap='wrap'; bank.style.gap='8px';
      bank.setAttribute('data-bank','1');

      const slotsWrap = document.createElement('div'); slotsWrap.className='ppx-col'; slotsWrap.style.gap='12px';

      const placements = new Map(); // promptId -> contId
      const pillHome = new Map(); // contId -> node

      function updateCheckState(){
        const allFilled = prompts.every(p => placements.get(p.id));
        btnCheck.disabled = !allFilled || locked;
        // Nav next availability mirrors check status once locked
        if (!locked) {
          btnNext.disabled = !allFilled;
        }
      }

      function clearFeedback(){
        slotsWrap.querySelectorAll('[data-state]').forEach(n => { n.textContent=''; n.className=''; });
      }

      function resetItem(lockCorrect=false, clearItem=false){
        placements.clear();
        locked = false;
        clearFeedback();
        pillHome.clear();
        bank.innerHTML='';
        continuations.forEach(c => {
          const pill = createPill(c, lang);
          attachDrag(pill);
          bank.appendChild(pill);
          pillHome.set(c.id, pill);
        });
        slotsWrap.querySelectorAll('[data-slot]').forEach(slot => {
          slot.innerHTML = '';
          slot.classList.remove('is-correct','is-wrong');
        });
        updateCheckState();
        if (clearItem) {
          delete saved.items[item.id];
          persistState();
        }
      }

      function attachDrag(pill){
        pill.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('text/plain', pill.dataset.cid||''); e.dataTransfer.effectAllowed='move'; pill.classList.add('is-dragging'); });
        pill.addEventListener('dragend', ()=> pill.classList.remove('is-dragging'));
      }

      const dropHandler = (slot) => (e) => {
        e.preventDefault();
        const cid = e.dataTransfer.getData('text/plain');
        if (!cid) return;
        const pill = bank.querySelector(`[data-cid=\"${cid}\"]`) || pillHome.get(cid);
        if (!pill) return;
        // remove previous mapping holding this pill
        Array.from(placements.entries()).forEach(([pid, mapped]) => {
          if (mapped === cid) placements.delete(pid);
        });
        // Remove existing occupant
        const current = slot.querySelector('[data-cid]');
        if (current) bank.appendChild(current);
        // Move pill
        slot.innerHTML = '';
        slot.appendChild(pill);
        placements.set(slot.dataset.slot, cid);
        updateCheckState();
        persistState();
      };

      prompts.forEach((p, pi) => {
        const card = document.createElement('div'); card.className='ppx-card'; card.style.padding='12px'; card.style.display='flex'; card.style.flexDirection='column'; card.style.gap='8px';
        const txt = document.createElement('div'); txt.innerHTML = sanitize(IS_EN ? (p.prompt_en || p.prompt_es || '') : (p.prompt_es || p.prompt_en || ''));
        card.appendChild(txt);
        const slotRow = document.createElement('div'); slotRow.className='ppx-row'; slotRow.style.gap='6px'; slotRow.style.alignItems='center';
        const arrow = document.createElement('img'); arrow.src='/static/assets/icons/arrow_right.svg'; arrow.alt=''; arrow.width=20; arrow.height=20;
        arrow.style.marginLeft='8px';
        const slot = document.createElement('div'); slot.className='ppx-chip'; slot.style.minWidth='180px'; slot.style.minHeight='38px'; slot.style.justifyContent='flex-start'; slot.dataset.slot = p.id;
        slot.setAttribute('data-slot', p.id);
        slot.addEventListener('dragover', (e)=>{ e.preventDefault(); });
        slot.addEventListener('drop', dropHandler(slot));
        slotRow.appendChild(arrow); slotRow.appendChild(slot);
        const hintText = pick(p.hint_es, p.hint_en);
        if (hintText) {
          const hintBtn = document.createElement('button');
          hintBtn.type = 'button';
          hintBtn.className = 'ppx-ex__iconBtn ppx-tooltip';
          hintBtn.style.display = 'inline-flex';
          hintBtn.style.alignItems = 'center';
          hintBtn.style.justifyContent = 'center';
          hintBtn.style.padding = '4px';
          hintBtn.style.border = 'none';
          hintBtn.style.background = 'transparent';
          hintBtn.style.cursor = 'pointer';
          hintBtn.style.width = '48px';
          hintBtn.style.height = '48px';
          hintBtn.style.minWidth = '48px';
          hintBtn.style.minHeight = '48px';
          const hIcon = document.createElement('img');
          hIcon.src = '/static/assets/icons/hint.svg';
          hIcon.alt = '';
          hIcon.style.setProperty('width','42px','important');
          hIcon.style.setProperty('height','42px','important');
          hIcon.style.maxWidth = '42px';
          hIcon.style.maxHeight = '42px';
          hIcon.style.flexShrink = '0';
          hintBtn.appendChild(hIcon);
          const hintLabel = t('Pista','Hint');
          hintBtn.setAttribute('data-tooltip', hintLabel);
          hintBtn.setAttribute('aria-label', hintLabel);
          hintBtn.setAttribute('aria-expanded','false');
          // Place button inline to the right of the drop slot initially
          slotRow.appendChild(hintBtn);

          // Hint row lives below the slot and will hold the button when opened
          const hintRow = document.createElement('div');
          hintRow.style.display = 'none';
          hintRow.style.alignItems = 'center';
          hintRow.style.gap = '8px';
          hintRow.style.margin = '8px 0';

          const hintBox = document.createElement('div');
          hintBox.className = 'ppx-ex__hint ppx-hint--noicon';
          hintBox.hidden = true;
          hintBox.innerHTML = `<span>${hintText}</span>`;
          hintRow.appendChild(hintBox);

          hintBtn.addEventListener('click', (ev)=>{
            ev.preventDefault();
            ev.stopPropagation();
            const willShow = hintBox.hidden;
            hintBox.hidden = !willShow;
            hintRow.style.display = willShow ? 'flex' : 'none';
            if (willShow) {
              hintRow.prepend(hintBtn);
            } else {
              slotRow.appendChild(hintBtn);
            }
            hintBtn.setAttribute('aria-expanded', String(willShow));
            hintBtn.setAttribute('data-tooltip', willShow ? t('Ocultar pista','Hide hint') : t('Ver pista','Show hint'));
            if (willShow) {
              try { api.hint && api.hint({ item: p.id }); } catch(_){}
            }
          });

          card.appendChild(slotRow);
          card.appendChild(hintRow);
        } else {
          card.appendChild(slotRow);
        }
          const fb = document.createElement('div'); fb.dataset.state='1'; fb.style.minHeight='18px';
          fb.style.display='flex'; fb.style.alignItems='flex-start'; fb.style.gap='8px'; fb.style.padding='8px 10px'; fb.style.borderRadius='12px';
          card.appendChild(fb);
        slotsWrap.appendChild(card);
      });

      continuations.forEach(c => {
        const pill = createPill(c, lang);
        pillHome.set(c.id, pill);
        attachDrag(pill);
        bank.appendChild(pill);
      });

      body.appendChild(slotsWrap);
      const bankBox = document.createElement('div'); bankBox.className='ppx-card'; bankBox.style.padding='10px';
      const bankTitle = document.createElement('div'); bankTitle.className='ppx-muted'; bankTitle.textContent = t('Continuaciones','Continuations');
      bankBox.appendChild(bankTitle); bankBox.appendChild(bank);
      body.appendChild(bankBox);

      // Footer nav (aligned with other exercises: progress + icon nav)
      const footer = document.createElement('div'); footer.className='ppx-ex__footer';
      const progress = document.createElement('div'); progress.className='ppx-ex__progress';
      const fraction = document.createElement('div'); fraction.className='ppx-ex__fraction';
      const dots = document.createElement('div'); dots.className='ppx-ex__dots';
      progress.appendChild(fraction); progress.appendChild(dots);
      const nav = document.createElement('div'); nav.className='ppx-ex__nav';
      const btnPrev = document.createElement('button'); btnPrev.type='button'; btnPrev.className='ppx-ex__nav-btn ppx-ex__nav-btn--prev'; btnPrev.disabled = (idx===0);
      const btnNext = document.createElement('button'); btnNext.type='button'; btnNext.className='ppx-ex__nav-btn ppx-ex__nav-btn--next'; btnNext.disabled = true;
      nav.appendChild(btnPrev); nav.appendChild(btnNext);

      const btnCheck = document.createElement('button'); btnCheck.type='button'; btnCheck.className='ppx-btn ppx-btn--primary'; btnCheck.textContent=t('Comprobar','Check');

      const controls = document.createElement('div'); controls.className='ppx-row'; controls.style.gap='8px'; controls.style.flexWrap='wrap';
      controls.appendChild(btnCheck);
      body.appendChild(controls);

      footer.appendChild(progress);
      footer.appendChild(nav);
      body.appendChild(footer);

      api.setActions({});
      api.setBody(body);

      function persistState(lockFlag, correctCount, totalCount){
        if (!cacheKey) return;
        const itemState = saved.items[item.id] || {};
        itemState.placements = Object.fromEntries(placements);
        itemState.locked = lockFlag;
        if (typeof correctCount === 'number') itemState.correct = correctCount;
        if (typeof totalCount === 'number') itemState.total = totalCount;
        saved.items[item.id] = itemState;
        saved.idx = Math.max(0, idx);
        persistAll();
      }

      let locked = false;
      function doCheck(){
        if (locked) return;
        const contMap = new Map((item.continuations||[]).map(c => [c.id, c]));
        let correct = 0;
        prompts.forEach((p, i) => {
          const cid = placements.get(p.id);
          const fb = slotsWrap.querySelectorAll('[data-state]')[i];
          const slot = slotsWrap.querySelector(`[data-slot=\"${p.id}\"]`);
          const cont = contMap.get(cid);
          const ok = cid && cid === p.expects;
          if (ok) correct += 1;
          if (slot) {
            slot.classList.toggle('is-correct', ok);
            slot.classList.toggle('is-wrong', !ok);
          }
          if (fb) {
            fb.className = ok ? 'ppx-state--ok' : 'ppx-state--bad';
            fb.style.display = 'flex';
            fb.style.alignItems = 'flex-start';
            fb.style.gap = '8px';
            fb.style.padding = '8px 10px';
            fb.style.borderRadius = '12px';
            fb.dataset.hasIcon = 'true';
            const contMsg = ok
              ? (cont && pick(cont.feedback_correct_es, cont.feedback_correct_en))
              : (cont && pick(cont.feedback_incorrect_es, cont.feedback_incorrect_en));
            const promptMsg = ok
              ? pick(p.feedback_correct_es, p.feedback_correct_en)
              : pick(p.feedback_incorrect_es, p.feedback_incorrect_en);
            const text = contMsg || promptMsg || (ok
              ? t('¡Bien hecho!','Nice job!')
              : t('Revisa esta continuación.','Check the continuation.'));
            fb.innerHTML = '';
            const fbIcon = document.createElement('img'); fbIcon.src = ok ? '/static/assets/icons/correct.svg' : '/static/assets/icons/incorrect.svg'; fbIcon.alt=''; fbIcon.width=18; fbIcon.height=18;
            const fbSpan = document.createElement('span'); fbSpan.textContent = text;
            fb.appendChild(fbIcon);
            fb.appendChild(fbSpan);
          }
        });
        locked = true;
        btnCheck.disabled = true;
        btnNext.disabled = false;
        results[idx] = { correct, total: prompts.length };
        persistState(true, correct, prompts.length);
      }

      btnCheck.addEventListener('click', doCheck);
      btnPrev.addEventListener('click', (e)=> {
        e.preventDefault();
        if (idx>0){
          idx-=1;
          persistState();
          renderItem();
        }
      });
      btnNext.addEventListener('click', (e)=> {
        e.preventDefault();
        const lastIdx = items.length - 1;
        if (idx < lastIdx){
          idx+=1;
          persistState();
          renderItem();
        } else {
          idx = items.length;
          saved.completed = true;
          persistState();
          showSummary();
        }
      });

      // Rehydrate prior state if available
      const savedItem = saved.items[item.id];
      resetItem();
        if (savedItem && savedItem.placements) {
          Object.entries(savedItem.placements).forEach(([pid, cid]) => {
            const slot = slotsWrap.querySelector(`[data-slot="${pid}"]`);
            const pill = bank.querySelector(`[data-cid="${cid}"]`) || pillHome.get(cid);
            if (slot && pill) {
              const current = slot.querySelector('[data-cid]');
              if (current) bank.appendChild(current);
              slot.innerHTML = '';
              slot.appendChild(pill);
              placements.set(pid, cid);
            }
          });
          updateCheckState();
          if (savedItem.locked) {
            locked = false; // allow doCheck to run
            doCheck();
          } else {
            btnNext.disabled = !prompts.every(p => placements.get(p.id));
          }
        }

        // Progress fraction + dots
        fraction.textContent = `${Math.min(idx+1, items.length)}/${items.length}`;
        dots.innerHTML = '';
        for (let i = 0; i < items.length; i++) {
          const d = document.createElement('button');
          d.type = 'button';
          let cls = 'ppx-ex__dot';
          const itemSaved = saved.items[items[i].id];
          const isDone = !!(itemSaved && itemSaved.locked) || i < idx;
          if (i === idx) {
            cls += ' is-current';
            d.style.background = 'var(--ppx-primary, #4f46e5)';
            d.style.border = 'none';
          } else if (isDone) {
            cls += ' is-done';
            d.style.background = 'color-mix(in srgb, var(--ppx-primary, #4f46e5) 55%, #ffffff)';
            d.style.border = 'none';
          } else {
            d.style.border = 'none';
          }
          d.className = cls;
          d.setAttribute('aria-label', `${t('Ir al ítem','Go to item')} ${i+1}`);
          d.addEventListener('click', () => {
            if (i === idx) return;
            idx = i;
            persistState();
            renderItem();
          });
          dots.appendChild(d);
        }
      }

    if (!items.length){
      api.setBody('<div class=\"ppx-state--bad\">'+t('Ejercicio sin items.','Exercise has no items.')+'</div>');
      return;
    }
    renderItem();
  });
})();
