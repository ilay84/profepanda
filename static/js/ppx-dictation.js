/* static/js/ppx-dictation.js */
(function(){
  if (!window.PPX) { console.error('[PPX Dictation] PPX core not found'); return; }

  function norm(text, opts){
    let s = String(text || '');
    if (opts.normalizeWhitespace) s = s.replace(/\s+/g, ' ').trim();
    if (opts.ignoreCase) s = s.toLowerCase();
    if (opts.ignoreAccents) { try { s = s.normalize('NFD').replace(/\p{Diacritic}+/gu, ''); } catch(_) {} }
    if (opts.ignorePunctuation) s = s.replace(/[\p{P}\p{S}]+/gu, '');
    return s;
  }
  const getTranscript = (item) => item.transcript || '';

  function plugin({ data, lang, api }){
    const L = (es, en) => api.t(es, en);
    const items = (data.items||[]).slice().sort((a,b)=> (a.order||0)-(b.order||0));
    const opts = Object.assign({ ignoreCase:true, ignorePunctuation:true, normalizeWhitespace:true, ignoreAccents:true, minCharsToEnableCheck:1, allowRetry:false, attemptsMax:1, autoPlay:false, multiline:false }, data.options||{});

    if (!items.length){
      const msg = document.createElement('div'); msg.className = 'ppx-state--bad'; msg.setAttribute('role','alert');
      msg.innerHTML = `<strong>${L('Sin ítems para mostrar.','No items to display.')}</strong>`;
      api.setBody(msg); api.setProgress(1); return function(){};
    }

    let idx = 0; const answers = new Map(); const results = new Map(); const attempts = new Map();

    const root = document.createElement('div'); root.className = 'ppx-ex ppx-ex--dictation';
    const sr = document.createElement('div'); sr.className = 'ppx-visually-hidden'; sr.setAttribute('aria-live','polite'); root.appendChild(sr);

    const card = document.createElement('div'); card.className = 'ppx-card'; card.style.padding = '16px';
    const media = document.createElement('div'); media.className = 'ppx-media-block';
    const audio = document.createElement('audio'); audio.controls = true; audio.preload = 'metadata'; media.appendChild(audio);
    const rateWrap = document.createElement('div'); rateWrap.className='ppx-row'; rateWrap.style.gap='8px'; rateWrap.style.alignItems='center';
    const rateLbl = document.createElement('span'); rateLbl.className='ppx-muted'; rateLbl.textContent = L('Velocidad','Speed');
    const rate = document.createElement('input'); rate.type='range'; rate.min='0.5'; rate.max='1.5'; rate.step='0.05'; rate.value='1.0'; rate.addEventListener('input', ()=> { audio.playbackRate = parseFloat(rate.value)||1; });
    rateWrap.appendChild(rateLbl); rateWrap.appendChild(rate); media.appendChild(rateWrap);

    const input = document.createElement(opts.multiline ? 'textarea' : 'input'); if (!opts.multiline) input.type='text'; input.className = opts.multiline ? 'ppx-textarea' : 'ppx-input'; if (opts.multiline) input.rows=3; input.setAttribute('aria-label', L('Transcripción','Transcript'));
    // Special character toolbar under the input, above actions
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
    chars.forEach(function(ch){
      const b = document.createElement('button'); b.type='button'; b.className='ppx-btn ppx-btn--sm'; b.textContent = ch;
      b.addEventListener('click', function(){ insertAtCursor(input, ch); });
      charBar.appendChild(b);
    });
    const counter = document.createElement('div'); counter.className='ppx-muted'; counter.style.marginTop='6px';
    const attemptsLine = document.createElement('div'); attemptsLine.className='ppx-muted'; attemptsLine.style.marginTop='4px';
    const fb = document.createElement('div'); fb.className='ppx-ex__inline-feedback';

    // In-content actions
    const btnRow = document.createElement('div'); btnRow.className='ppx-row'; btnRow.style.justifyContent='flex-end';
    const btnCheck = document.createElement('button'); btnCheck.type='button'; btnCheck.className='ppx-wbtn ppx-wbtn--primary'; btnCheck.textContent=L('Verificar','Check');
    const btnRetry = document.createElement('button'); btnRetry.type='button'; btnRetry.className='ppx-wbtn'; btnRetry.textContent=L('Reintentar','Retry'); btnRetry.style.display='none';
    const btnNext = document.createElement('button'); btnNext.type='button'; btnNext.className='ppx-wbtn'; btnNext.textContent=L('Siguiente','Next'); btnNext.style.display='none';
    const btnResults = document.createElement('button'); btnResults.type='button'; btnResults.className='ppx-wbtn ppx-wbtn--primary'; btnResults.textContent=L('Ver resultados','See results'); btnResults.style.display='none';
    btnRow.appendChild(btnCheck); btnRow.appendChild(btnRetry); btnRow.appendChild(btnNext); btnRow.appendChild(btnResults);

    card.appendChild(media); card.appendChild(input); card.appendChild(charBar); card.appendChild(counter); card.appendChild(attemptsLine); card.appendChild(btnRow);
    root.appendChild(card); root.appendChild(fb);

    // Optional first-run instructions screen
    try {
      const slug = (data && (data.slug || data.id)) || 'dictation';
      const introKey = 'ppx:intro:dismissed:dictation/' + String(slug);
      const instr = (lang && lang.startsWith('en'))
        ? (data.instructions_en || data.instructions_es || '')
        : (data.instructions_es || data.instructions_en || '');
      const shouldShowIntro = !!instr && !localStorage.getItem(introKey);
      if (shouldShowIntro) {
        const intro = document.createElement('div');
        intro.className = 'ppx-card';
        intro.style.padding = '18px 20px';
        intro.style.margin = '0 auto';
        intro.style.maxWidth = '820px';
        const h = document.createElement('h2'); h.textContent = L('Instrucciones','Instructions'); h.style.marginTop='4px';
        const body = document.createElement('div'); body.className='ppx-p'; body.innerHTML = instr;
        const actions = document.createElement('div'); actions.className='ppx-row'; actions.style.justifyContent='center'; actions.style.marginTop='12px';
        const startBtn = document.createElement('button'); startBtn.type='button'; startBtn.className='ppx-btn ppx-btn--primary'; startBtn.textContent = L('Comenzar','Start');
        actions.appendChild(startBtn);
        intro.appendChild(h); intro.appendChild(body); intro.appendChild(actions);
        // Show intro instead of the main card
        if (window.PPXModal && typeof PPXModal.setBody === 'function') {
          PPXModal.setBody(intro);
        } else {
          root.insertBefore(intro, card);
          card.style.display = 'none';
        }
        startBtn.addEventListener('click', function(ev){
          try { ev && ev.preventDefault && ev.preventDefault(); } catch(_){}
          try { ev && ev.stopPropagation && ev.stopPropagation(); } catch(_){}
          try { localStorage.setItem(introKey, '1'); } catch(_) {}
          if (window.PPXModal && typeof PPXModal.setBody === 'function') {
            PPXModal.setBody(root);
          } else {
            intro.remove();
            card.style.display = '';
          }
          // Ensure modal remains open
          try {
            const modal = document.querySelector('.ppx-modal');
            const overlay = document.querySelector('.ppx-modal__overlay');
            if (modal && overlay) {
              modal.classList.add('is-open');
              overlay.classList.add('is-open');
              modal.setAttribute('aria-hidden','false');
            }
          } catch(_){ }
        });
      }
    } catch(_){}

    // Summary container
    const summaryWrap = document.createElement('div'); summaryWrap.style.display='none'; root.appendChild(summaryWrap);

    // If an intro was shown via PPXModal.setBody, body is already set.
    // Otherwise, mount the main root immediately.
    try {
      const slug = (data && (data.slug || data.id)) || 'dictation';
      const introKey = 'ppx:intro:dismissed:dictation/' + String(slug);
      const hasIntro = !!((lang && lang.startsWith('en')) ? (data.instructions_en || data.instructions_es || '') : (data.instructions_es || data.instructions_en || ''));
      const suppressed = !!localStorage.getItem(introKey);
      if (!hasIntro || suppressed) {
        api.setBody(root);
      }
    } catch(_) { api.setBody(root); }

    function updateCounter(){
      const txt = String(input.value||''); const words = txt.trim()? txt.trim().split(/\s+/).length : 0; const chars = txt.length;
      counter.textContent = L(`${words} palabras · ${chars} caracteres`, `${words} words · ${chars} chars`);
    }
    // Helpers for completion state
    function isUnlimited(){ return Number(opts.attemptsMax||0) === 0; }
    function isMaxed(id){ if (isUnlimited()) return false; const max = Math.max(1, Number(opts.attemptsMax||1)); return (attempts.get(id)||0) >= max; }
    function isDoneIndex(i){ const id = items[i].order||i; const r = results.get(id); return (r && !!r.ok) || isMaxed(id); }
    function doneCount(){ let c=0; for (let i=0;i<items.length;i++){ if (isDoneIndex(i)) c++; } return c; }
    function allDone(){ return doneCount() >= items.length; }

    function refreshActions(){
      const txt = String(input.value||''); const canCheck = (txt.trim().length >= (opts.minCharsToEnableCheck||1));
      btnCheck.disabled = !canCheck;
      const id = items[idx].order||idx; const r = results.get(id);
      const used = attempts.get(id) || 0; const unlimited = isUnlimited(); const maxed = isMaxed(id);
      btnRetry.style.display = (!r || r.ok || !opts.allowRetry || maxed) ? 'none' : '';
      const isLast = (idx === items.length - 1);
      btnNext.textContent = isLast ? L('Ver resultados','See results') : L('Siguiente','Next');
      btnNext.style.display = (r && (r.ok || maxed || unlimited)) ? '' : 'none';
      // Attempts left indicator
      if (unlimited) {
        attemptsLine.textContent = L('Intentos: ilimitados','Attempts: unlimited');
      } else {
        const left = Math.max(0, Number(opts.attemptsMax||1) - used);
        attemptsLine.textContent = L(`Intentos restantes: ${left}`, `Attempts left: ${left}`);
      }
      // Show results CTA when everything is completed (correct or maxed)
      btnResults.style.display = allDone() ? '' : 'none';
      // Progress is ratio of completed items
      api.setProgress(doneCount()/items.length);
    }
    function mount(){
      const item = items[idx]; audio.src = item.audio_url || ''; input.value = answers.get(item.order||idx) || '';
      updateCounter(); fb.innerHTML=''; if (opts.autoPlay) { try { audio.play().catch(()=>{});} catch(_){} } refreshActions();
    }
    function doCheck(){
      const item = items[idx]; const user = String(input.value||''); const ref = getTranscript(item);
      const ok = !!ref && (norm(user, opts) === norm(ref, opts) || (Array.isArray(item.variants) && item.variants.some(v=> norm(user, opts) === norm(v, opts))));
      const id = item.order||idx; attempts.set(id, (attempts.get(id)||0) + 1);
      const unlimited = Number(opts.attemptsMax||0) === 0; const maxed = !unlimited && Number(opts.attemptsMax||1) > 0 && (attempts.get(id)||0) >= Number(opts.attemptsMax||1);
      results.set(id, { ok, locked: (!opts.allowRetry) || maxed });

      fb.innerHTML='';
      const callout = document.createElement('div');
      callout.className = 'ppx-card';
      callout.style.padding = '12px';
      callout.style.background = '#fff';
      callout.style.marginTop = '8px';

      const head = document.createElement('div');
      head.className = ok ? 'ppx-state--ok' : 'ppx-state--bad';
      head.setAttribute('role','status');
      head.textContent = ok ? L('Correcto','Correct') : L('Incorrecto','Incorrect');
      callout.appendChild(head);

      const diffWrap = document.createElement('div');
      diffWrap.style.marginTop = '8px';
      diffWrap.appendChild(renderDiff(user, ref));
      callout.appendChild(diffWrap);

      fb.appendChild(callout);

      try { sr.textContent = ok ? L('Respuesta correcta','Answer correct') : L('Respuesta incorrecta','Answer incorrect'); } catch(_){}
      refreshActions();
    }

    function renderDiff(userRaw, refRaw){
      // Dual-line diff using dynamic programming alignment (prevents cascade errors)
      const wrap = document.createElement('div'); wrap.className='ppx-diff';
      const topLabel = document.createElement('div'); topLabel.className='ppx-muted'; topLabel.textContent=L('Esperado','Expected');
      const botLabel = document.createElement('div'); botLabel.className='ppx-muted'; botLabel.style.marginTop='6px'; botLabel.textContent=L('Tu respuesta','Your answer');
      const top = document.createElement('div'); top.className='ppx-diff__line';
      const bot = document.createElement('div'); bot.className='ppx-diff__line';

      const seg = (s) => (window.Intl && Intl.Segmenter) ? Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(String(s))).map(x=>x.segment) : Array.from(String(s||''));
      const a = seg(userRaw); const b = seg(refRaw);
      const isPunct = (ch) => /[\p{P}\p{S}]/u.test(ch||'');
      const key = (ch) => {
        let s = ch;
        if (opts.ignoreCase) s = s.toLowerCase();
        if (opts.ignoreAccents) { try { s = s.normalize('NFD').replace(/\p{Diacritic}+/gu,''); } catch(_){} }
        return s;
      };

      const m=a.length, n=b.length;
      const dp = Array(m+1); const bt = Array(m+1);
      for (let i=0;i<=m;i++){ dp[i]=Array(n+1).fill(0); bt[i]=Array(n+1).fill(null); }
      for (let i=1;i<=m;i++){ const cost = (opts.ignorePunctuation && isPunct(a[i-1])) ? 0 : 1; dp[i][0]=dp[i-1][0]+cost; bt[i][0]='delA'; }
      for (let j=1;j<=n;j++){ const cost = (opts.ignorePunctuation && isPunct(b[j-1])) ? 0 : 1; dp[0][j]=dp[0][j-1]+cost; bt[0][j]='insB'; }
      for (let i=1;i<=m;i++){
        for (let j=1;j<=n;j++){
          const match = (key(a[i-1]) === key(b[j-1]));
          const soft = match && (a[i-1] !== b[j-1]);
          const subCost = match ? 0 : 2;
          let best = dp[i-1][j-1] + subCost; let tag = match ? (soft?'soft':'match') : 'sub';
          const delCost = dp[i-1][j] + ((opts.ignorePunctuation && isPunct(a[i-1])) ? 0 : 1);
          if (delCost < best){ best = delCost; tag = 'delA'; }
          const insCost = dp[i][j-1] + ((opts.ignorePunctuation && isPunct(b[j-1])) ? 0 : 1);
          if (insCost < best){ best = insCost; tag = 'insB'; }
          dp[i][j]=best; bt[i][j]=tag;
        }
      }
      // backtrace
      let i=m,j=n,ops=[]; while (i>0 || j>0){ const t = bt[i][j]; if (t==='match' || t==='soft' || t==='sub'){ ops.push({op:t,a:a[i-1],b:b[j-1]}); i--; j--; } else if (t==='delA'){ ops.push({op:'extra',a:a[i-1]}); i--; } else if (t==='insB'){ ops.push({op:'miss',b:b[j-1]}); j--; } else { // fallback
          if (i>0 && j>0){ ops.push({op:'sub',a:a[i-1],b:b[j-1]}); i--; j--; } else if (i>0){ ops.push({op:'extra',a:a[i-1]}); i--; } else { ops.push({op:'miss',b:b[j-1]}); j--; }
        } }
      ops.reverse();

      // render + compute stats
      let correct=0; let total = b.filter(ch => !(opts.ignorePunctuation && isPunct(ch))).length;
      for (const o of ops){
        if (o.op==='match'){
          const t1=document.createElement('span'); t1.textContent=o.b; t1.className='ppx-diff__ok';
          const t2=document.createElement('span'); t2.textContent=o.a; t2.className='ppx-diff__ok';
          top.appendChild(t1); bot.appendChild(t2);
          if (!(opts.ignorePunctuation && isPunct(o.b))) correct++;
        } else if (o.op==='soft'){
          const t1=document.createElement('span'); t1.textContent=o.b; t1.className='ppx-diff__soft';
          const t2=document.createElement('span'); t2.textContent=o.a; t2.className='ppx-diff__soft';
          top.appendChild(t1); bot.appendChild(t2);
          if (!(opts.ignorePunctuation && isPunct(o.b))) correct++;
        } else if (o.op==='sub'){
          const t1=document.createElement('span');
          if (opts.ignorePunctuation && isPunct(o.b||'')) { t1.className='ppx-diff__ghost'; }
          else { t1.textContent='*'; t1.className='ppx-diff__aster'; }
          const t2=document.createElement('span'); t2.textContent=o.a||''; t2.className='ppx-diff__bad';
          top.appendChild(t1); bot.appendChild(t2);
        } else if (o.op==='miss'){
          const t1=document.createElement('span');
          if (opts.ignorePunctuation && isPunct(o.b||'')) { t1.className='ppx-diff__ghost'; }
          else { t1.textContent='_'; t1.className='ppx-diff__underscore'; }
          const t2=document.createElement('span'); t2.className='ppx-diff__missing';
          top.appendChild(t1); bot.appendChild(t2);
        } else if (o.op==='extra'){
          const t1=document.createElement('span'); t1.textContent='*'; t1.className='ppx-diff__aster';
          const t2=document.createElement('span'); t2.textContent=o.a||''; t2.className='ppx-diff__extra';
          top.appendChild(t1); bot.appendChild(t2);
        }
      }

      const stat = document.createElement('div'); stat.className='ppx-muted'; stat.style.marginTop='8px'; stat.textContent=L(`${correct} de ${total} caracteres correctos`, `${correct} of ${total} characters correct`);
      const legend = document.createElement('div'); legend.className='ppx-row'; legend.style.gap='10px'; legend.style.marginTop='6px';
      legend.innerHTML = `
        <span class="ppx-diff__key"><i class="ppx-diff__swatch ppx-diff__ok"></i>${L('Correcto','Correct')}</span>
        <span class="ppx-diff__key"><i class="ppx-diff__swatch ppx-diff__bad"></i>${L('Sustitución/Extra','Substitution/Extra')}</span>
        <span class="ppx-diff__key"><i class="ppx-diff__swatch ppx-diff__missing"></i>${L('Falta','Missing')}</span>
        <span class="ppx-diff__key"><i class="ppx-diff__swatch ppx-diff__soft"></i>${L('Acento/Mayúscula','Accent/Case')}</span>
      `;

      wrap.appendChild(topLabel); wrap.appendChild(top); wrap.appendChild(botLabel); wrap.appendChild(bot); wrap.appendChild(stat); wrap.appendChild(legend);
      return wrap;
    }
    // Build a single-line summary of the user's answer highlighting mistakes
    function renderSummaryUserLine(userRaw, refRaw){
      const seg = (s) => (window.Intl && Intl.Segmenter) ? Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(String(s))).map(x=>x.segment) : Array.from(String(s||''));
      const a = seg(userRaw); const b = seg(refRaw);
      const isPunct = (ch) => /[\p{P}\p{S}]/u.test(ch||'');
      const key = (ch) => {
        let s = ch;
        if (opts.ignoreCase) s = s.toLowerCase();
        if (opts.ignoreAccents) { try { s = s.normalize('NFD').replace(/\p{Diacritic}+/gu,''); } catch(_){} }
        return s;
      };
      const m=a.length, n=b.length; const dp = Array(m+1), bt = Array(m+1);
      for (let i=0;i<=m;i++){ dp[i]=Array(n+1).fill(0); bt[i]=Array(n+1).fill(null); }
      for (let i=1;i<=m;i++){ const cost = (opts.ignorePunctuation && isPunct(a[i-1])) ? 0 : 1; dp[i][0]=dp[i-1][0]+cost; bt[i][0]='delA'; }
      for (let j=1;j<=n;j++){ const cost = (opts.ignorePunctuation && isPunct(b[j-1])) ? 0 : 1; dp[0][j]=dp[0][j-1]+cost; bt[0][j]='insB'; }
      for (let i=1;i<=m;i++){
        for (let j=1;j<=n;j++){
          const match = (key(a[i-1]) === key(b[j-1]));
          const soft = match && (a[i-1] !== b[j-1]);
          const subCost = match ? 0 : 2;
          let best = dp[i-1][j-1] + subCost; let tag = match ? (soft?'soft':'match') : 'sub';
          const delCost = dp[i-1][j] + ((opts.ignorePunctuation && isPunct(a[i-1])) ? 0 : 1);
          if (delCost < best){ best = delCost; tag = 'delA'; }
          const insCost = dp[i][j-1] + ((opts.ignorePunctuation && isPunct(b[j-1])) ? 0 : 1);
          if (insCost < best){ best = insCost; tag = 'insB'; }
          dp[i][j]=best; bt[i][j]=tag;
        }
      }
      let i=m,j=n,ops=[]; while (i>0 || j>0){ const t = bt[i][j]; if (t==='match' || t==='soft' || t==='sub'){ ops.push({op:t,a:a[i-1],b:b[j-1]}); i--; j--; } else if (t==='delA'){ ops.push({op:'extra',a:a[i-1]}); i--; } else if (t==='insB'){ ops.push({op:'miss',b:b[j-1]}); j--; } else { if (i>0 && j>0){ ops.push({op:'sub',a:a[i-1],b:b[j-1]}); i--; j--; } else if (i>0){ ops.push({op:'extra',a:a[i-1]}); i--; } else { ops.push({op:'miss',b:b[j-1]}); j--; } } }
      ops.reverse();
      const line = document.createElement('div'); line.className='ppx-diff__line';
      let correct=0; let total = b.filter(ch => !(opts.ignorePunctuation && isPunct(ch))).length;
      let extras=0, misses=0, subs=0, softCnt=0;
      for (const o of ops){
        if (o.op==='match'){
          const t=document.createElement('span'); t.textContent=o.a; t.className='ppx-diff__ok'; line.appendChild(t); if (!(opts.ignorePunctuation && isPunct(o.b))) correct++;
        } else if (o.op==='soft'){
          const t=document.createElement('span'); t.textContent=o.a; t.className='ppx-diff__soft'; line.appendChild(t); if (!(opts.ignorePunctuation && isPunct(o.b))) { correct++; softCnt++; }
        } else if (o.op==='sub'){
          const t=document.createElement('span'); t.textContent=o.a||''; t.className='ppx-diff__bad'; line.appendChild(t); subs++;
        } else if (o.op==='miss'){
          const t1=document.createElement('span'); t1.textContent='*'; t1.className='ppx-diff__aster';
          const t2=document.createElement('span'); t2.textContent='_'; t2.className='ppx-diff__underscore';
          line.appendChild(t1); line.appendChild(t2); misses++;
        } else if (o.op==='extra'){
          const t=document.createElement('span'); t.textContent=o.a||''; t.className='ppx-diff__extra'; line.appendChild(t);
          if (!(opts.ignorePunctuation && isPunct(o.a||''))) extras++;
        }
      }
      return { line, correct, total, extras, misses, subs, soft: softCnt };
    }
    function resetCurrent(){ answers.set(items[idx].order||idx, ''); input.value=''; fb.innerHTML=''; refreshActions(); input.focus(); }
    function goto(newIdx){ idx = Math.max(0, Math.min(items.length-1, newIdx)); mount(); }
    function showSummary(){
      summaryWrap.innerHTML='';
      const title = document.createElement('h3'); title.textContent=L('Resumen','Summary'); title.style.textAlign='center'; summaryWrap.appendChild(title);
      summaryWrap.style.maxWidth = '1100px'; summaryWrap.style.margin = '0 auto';
      let totCorrect = 0, totChars = 0, totExtras = 0;
      const list = document.createElement('div');
      list.className='ppx-col ppx-summary-list';
      list.style.gap='10px'; list.style.width='75%'; list.style.maxWidth='980px'; list.style.minWidth='520px'; list.style.margin='8px auto 0'; list.style.alignItems='stretch';
      list.style.marginBottom = '12px';

  items.forEach((it,i)=>{
    const row = document.createElement('details'); row.className='ppx-acc ppx-card'; row.style.padding='12px';
    const head = document.createElement('summary'); head.className='ppx-row'; head.style.justifyContent='space-between';
    head.innerHTML = `<strong>#${i+1}.</strong>`;

    const stat = renderSummaryUserLine(String(answers.get(it.order||i)||''), getTranscript(it));
    const totalEff = stat.total + stat.extras;
    totCorrect += stat.correct; totChars += stat.total; totExtras += stat.extras;
    const pct = totalEff ? Math.round((stat.correct/totalEff)*100) : 0;
    const pill = document.createElement('span'); pill.className='ppx-score'; pill.textContent = `${pct}%`;
    if (pct >= 90) pill.classList.add('ppx-score--green');
    else if (pct >= 80) pill.classList.add('ppx-score--blue');
    else if (pct >= 70) pill.classList.add('ppx-score--orange');
    else pill.classList.add('ppx-score--red');
    const cnt = document.createElement('span'); cnt.className='ppx-muted'; cnt.style.marginLeft='8px'; cnt.textContent = `(${stat.correct}/${totalEff})`;
    const right = document.createElement('span'); right.appendChild(pill); right.appendChild(cnt);
    head.appendChild(right);

    const mediaRow = document.createElement('div'); mediaRow.style.margin='6px 0 10px';
    const aud = document.createElement('audio'); aud.controls=true; aud.preload='metadata'; aud.src = it.audio_url || '';
    mediaRow.appendChild(aud);

    const your = document.createElement('div');
    const yourLbl = document.createElement('div'); yourLbl.className='ppx-muted'; yourLbl.textContent=L('Tu respuesta:','Your answer:');
    const yourLine = document.createElement('div'); yourLine.appendChild(stat.line);
    your.appendChild(yourLbl); your.appendChild(yourLine);

    const corr = document.createElement('div');
    const corrLbl = document.createElement('div'); corrLbl.className='ppx-muted'; corrLbl.textContent=L('Respuesta correcta:','Correct answer:');
    const corrBox = document.createElement('div'); corrBox.className='ppx-callout--ok'; corrBox.textContent=getTranscript(it);
    corr.appendChild(corrLbl); corr.appendChild(corrBox);

    row.appendChild(head); row.appendChild(mediaRow); row.appendChild(your); row.appendChild(corr);
    list.appendChild(row);
  });

  const overallEff = totChars + totExtras;
  const overallPct = overallEff ? Math.round((totCorrect/overallEff)*100) : 0;
  const overall = document.createElement('span'); overall.className='ppx-score'; overall.textContent = `${overallPct}%`;
  if (overallPct >= 90) overall.classList.add('ppx-score--green');
  else if (overallPct >= 80) overall.classList.add('ppx-score--blue');
  else if (overallPct >= 70) overall.classList.add('ppx-score--orange');
  else overall.classList.add('ppx-score--red');
  const overallWrap = document.createElement('div'); overallWrap.style.marginTop='4px'; overallWrap.style.textAlign='center';
  const overallLabel = document.createElement('span'); overallLabel.className='ppx-muted'; overallLabel.textContent = L('Puntaje:','Score:'); overallLabel.style.marginRight='8px';
  const overallCounts = document.createElement('span'); overallCounts.className='ppx-muted'; overallCounts.style.marginLeft='8px'; overallCounts.textContent = ` - ${totCorrect}/${overallEff}`;
  overallWrap.appendChild(overallLabel); overallWrap.appendChild(overall); overallWrap.appendChild(overallCounts);
  summaryWrap.appendChild(overallWrap);

      const actions = document.createElement('div'); actions.className='ppx-row'; actions.style.justifyContent='center'; actions.style.marginTop='12px';
  const btnRestart = document.createElement('button'); btnRestart.type='button'; btnRestart.className='ppx-wbtn ppx-wbtn--orange'; btnRestart.textContent=L('Reiniciar','Restart');
  btnRestart.addEventListener('click', ()=>{ results.clear(); answers.clear(); idx=0; summaryWrap.style.display='none'; card.style.display=''; mount(); });
  actions.appendChild(btnRestart);

  summaryWrap.appendChild(list); summaryWrap.appendChild(actions);
  card.style.display='none'; fb.innerHTML=''; summaryWrap.style.display='';
}

    input.addEventListener('input', ()=>{ answers.set(items[idx].order||idx, input.value||''); updateCounter(); refreshActions(); });
    btnCheck.addEventListener('click', ()=> doCheck());
    btnRetry.addEventListener('click', ()=> resetCurrent());
    btnNext.addEventListener('click', ()=> { if (idx < items.length-1) goto(idx+1); else showSummary(); });
    btnResults.addEventListener('click', ()=> showSummary());

    // Title/meta done by core
    mount(); return function cleanup(){};
  }
  window.PPX.registerType('dictation', plugin);
})();



