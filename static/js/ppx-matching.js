/* static/js/ppx-matching.js */
(function(){
  if (!window.PPX) return console.error('[PPX Matching] PPX core missing');

  const PILL_W = 320;
  const PILL_H = 64;

  function shuffle(arr){
    const a = arr.slice();
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  window.PPX.registerType('matching', function(ctx){
    const api = ctx && ctx.api ? ctx.api : {};
    const data = (ctx && (ctx.opts || ctx.data)) || {};
    const lang = (ctx && ctx.lang) || api.lang || 'es';
    const t = (es, en) => (String(lang||'es').toLowerCase().startsWith('en') ? (en ?? es) : (es ?? en));

    const items = (Array.isArray(data.items) ? data.items.slice() : []).sort((a,b)=> (a.order||0)-(b.order||0));
    if (!items.length){
      api.setBody('<div class="ppx-state--bad">'+t('Ejercicio sin pares.','Exercise has no pairs.')+'</div>');
      return;
    }

  const metaById = new Map();
  const leftList = items.map(it => {
    const feedback = t(it.feedback_correct_es || '', it.feedback_correct_en || '') || '';
    metaById.set(it.id, { feedback });
    return { id: it.id, text: it.left };
  });
  const rightList = shuffle(items.map(it => ({ id: it.id, text: it.right })));

  let selectedLeft = null;
  let lastCursor = null;
  let matches = new Map(); // leftId -> rightId
  let rightRows = [];

    const root = document.createElement('div');
    root.className = 'ppx-ex ppx-ex--matching ppx-col';
    root.style.gap = '18px';

    const canvas = document.createElement('div');
    canvas.className = 'ppx-matching__canvas';
    canvas.style.position = 'relative';

    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','ppx-matching__svg');
    svg.style.position = 'absolute';
    svg.style.inset = '0';
    svg.style.pointerEvents = 'none';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.overflow = 'visible';
    svg.setAttribute('overflow','visible');

    const layout = document.createElement('div');
    layout.className = 'ppx-matching__layout';

    const leftCol = document.createElement('div');
    leftCol.className = 'ppx-matching__col';

    const rightCol = document.createElement('div');
    rightCol.className = 'ppx-matching__col';

    layout.appendChild(leftCol);
    layout.appendChild(rightCol);
    canvas.appendChild(svg);
    canvas.appendChild(layout);
    root.appendChild(canvas);

    const controls = document.createElement('div');
    controls.className = 'ppx-row';
    controls.style.justifyContent = 'center';
    const btnReset = document.createElement('button');
    btnReset.type = 'button';
    btnReset.className = 'ppx-btn ppx-btn--ghost ppx-reset';
    const resetIcon = document.createElement('img');
    resetIcon.src = '/static/assets/icons/refresh.svg';
    resetIcon.alt = '';
    resetIcon.width = 16; resetIcon.height = 16;
    btnReset.appendChild(resetIcon);
    const resetLabel = document.createElement('span');
    resetLabel.textContent = t('Reiniciar','Restart');
    btnReset.appendChild(resetLabel);
    controls.appendChild(btnReset);
    root.appendChild(controls);

    api.setBody(root);

    const leftAnchors = new Map();
    const rightAnchors = new Map();

    function pill(text, extraCls=''){
      const el = document.createElement('div');
      el.className = `ppx-matching__pill ${extraCls}`.trim();
      el.style.width = `${PILL_W}px`;
      el.style.height = `${PILL_H}px`;
      el.textContent = text || '';
      el.setAttribute('role','button');
      el.tabIndex = 0;
      return el;
    }

    function getAnchor(el, side){
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const p = canvas.getBoundingClientRect();
      const x = side === 'left' ? r.right - p.left : r.left - p.left;
      const y = r.top - p.top + r.height/2;
      return { x, y };
    }

  function drawLines(cursor){
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    matches.forEach((rid, lid) => {
      const a = getAnchor(leftAnchors.get(lid), 'left');
      const b = getAnchor(rightAnchors.get(rid), 'right');
      if (a && b){
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        line.setAttribute('stroke', 'var(--ppx-success,#80ac5f)');
        line.setAttribute('stroke-width','3');
        line.setAttribute('stroke-linecap','round');
        svg.appendChild(line);
      }
    });
    if (selectedLeft){
      const a = getAnchor(leftAnchors.get(selectedLeft), 'left');
      if (a){
        const gridRect = canvas.getBoundingClientRect();
        const target = cursor
            ? { x: cursor.x - gridRect.left, y: cursor.y - gridRect.top }
            : { x: a.x + 120, y: a.y };
          const line = document.createElementNS('http://www.w3.org/2000/svg','line');
          line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
          line.setAttribute('x2', target.x); line.setAttribute('y2', target.y);
          line.setAttribute('stroke', 'var(--ppx-primary,#4f46e5)');
          line.setAttribute('stroke-width','2');
          line.setAttribute('stroke-dasharray','6 6');
          line.setAttribute('stroke-linecap','round');
          svg.appendChild(line);
        }
      }
    }

    function clearSelection(){
      selectedLeft = null;
      lastCursor = null;
      leftAnchors.forEach(p => p.classList.remove('is-selected'));
      drawLines();
    }

    function selectLeft(id){
      if (matches.has(id)) return;
      if (selectedLeft === id){
        clearSelection();
        return;
      }
      selectedLeft = id;
      leftAnchors.forEach(p => p.classList.toggle('is-selected', p.dataset.leftId === id));
      drawLines(lastCursor);
    }

    function swapRightRows(aIdx, bIdx){
      if (aIdx === bIdx || aIdx < 0 || bIdx < 0) return;
      const rowA = rightRows[aIdx];
      const rowB = rightRows[bIdx];
      if (!rowA || !rowB) return;
      const nextA = rowA.nextSibling;
      const nextB = rowB.nextSibling;

      // Swap without changing horizontal position (stay in same column)
      if (nextA === rowB){
        rightCol.insertBefore(rowB, rowA);
      } else if (nextB === rowA){
        rightCol.insertBefore(rowA, rowB);
      } else {
        rightCol.insertBefore(rowA, nextB);
        rightCol.insertBefore(rowB, nextA);
      }
      [rightRows[aIdx], rightRows[bIdx]] = [rightRows[bIdx], rightRows[aIdx]];
    }

    function showFeedback(leftId){
      const fbWrap = leftCol.querySelector(`.ppx-matching__fb[data-fb-for="${leftId}"]`);
      const fbText = metaById.get(leftId)?.feedback;
      if (fbWrap && fbText){
        fbWrap.textContent = fbText;
        fbWrap.classList.add('is-ok');
        fbWrap.style.display = 'block';
        requestAnimationFrame(()=> {
          const h = fbWrap.offsetHeight || 0;
          const idx = leftList.findIndex(l => l.id === leftId);
          if (idx > -1 && rightRows[idx]){
            const extra = h + 12;
            rightRows[idx].style.paddingBottom = `${extra}px`;
            rightRows[idx].style.marginBottom = `${extra}px`;
          }
        });
      }
    }

    function handleRight(id){
      if (!selectedLeft) return;
      if (matches.has(selectedLeft)) { clearSelection(); return; }
      const lp = leftAnchors.get(selectedLeft);
      const rp = rightAnchors.get(id);
      if (!lp || !rp) { clearSelection(); return; }
      const ok = selectedLeft === id;
      if (ok){
        // swap the right rows so the matched pill aligns horizontally with its left
        const targetIndex = leftList.findIndex(l => l.id === selectedLeft);
        const currentIndex = rightRows.findIndex(r => r.contains(rp));
        swapRightRows(targetIndex, currentIndex);
        // refresh anchors after swap
        rightAnchors.clear();
        rightRows.forEach(row => {
          const pill = row.querySelector('.ppx-matching__pill--right');
          if (pill && pill.dataset.rightId){
            pill.classList.remove('is-wrong','is-selected');
            rightAnchors.set(pill.dataset.rightId, pill);
          }
        });
        matches.set(selectedLeft, id);
        lp.classList.add('is-correct');
        const rpUpdated = rightAnchors.get(id);
        if (rpUpdated) rpUpdated.classList.add('is-correct');
        showFeedback(selectedLeft);
        clearSelection();
        drawLines();
        api.setProgress && api.setProgress(matches.size / items.length);
      } else {
        rp.classList.add('is-wrong','is-shake');
        setTimeout(()=> rp.classList.remove('is-wrong','is-shake'), 850);
        lp.classList.add('is-wrong','is-shake');
        setTimeout(()=> lp.classList.remove('is-wrong','is-shake'), 850);
        drawLines(lastCursor);
      }
    }

    function renderColumns(){
      leftCol.innerHTML = '';
      rightCol.innerHTML = '';
      leftAnchors.clear();
      rightAnchors.clear();
      rightRows = [];
      matches = new Map();

      leftList.forEach(it => {
        const row = document.createElement('div');
        row.className = 'ppx-matching__row';
        const p = pill(it.text, 'ppx-matching__pill--left');
        p.dataset.leftId = it.id;
        row.appendChild(p);
        const fb = document.createElement('div');
        fb.className = 'ppx-matching__fb';
        fb.dataset.fbFor = it.id;
        row.appendChild(fb);
        leftCol.appendChild(row);
        leftAnchors.set(it.id, p);
        p.addEventListener('click', ()=> selectLeft(it.id));
        p.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault(); selectLeft(it.id);} });
      });

      rightList.forEach(it => {
        const row = document.createElement('div');
        row.className = 'ppx-matching__row';
        const p = pill(it.text, 'ppx-matching__pill--right');
        p.dataset.rightId = it.id;
        row.appendChild(p);
        rightCol.appendChild(row);
        rightRows.push(row);
        rightAnchors.set(it.id, p);
        p.addEventListener('click', (e)=> { e.preventDefault(); handleRight(it.id); });
        p.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault(); handleRight(it.id);} });
      });
    }

    function resetAll(){
      matches = new Map();
      selectedLeft = null;
      lastCursor = null;
      leftCol.querySelectorAll('.ppx-matching__fb').forEach(fb => {
        fb.style.display = 'none';
        fb.textContent = '';
        fb.classList.remove('is-ok');
      });
      rightCol.querySelectorAll('.ppx-matching__row').forEach(r => {
        r.style.marginBottom = '';
        r.style.paddingBottom = '';
      });
      renderColumns();
      clearSelection();
      api.setProgress && api.setProgress(0);
    }

    btnReset.addEventListener('click', ()=> {
      resetAll();
      api.retry && api.retry();
    });

    document.addEventListener('mousemove', (e)=> {
      if (!selectedLeft) return;
      lastCursor = { x: e.clientX, y: e.clientY };
      drawLines(lastCursor);
    });

    renderColumns();
    drawLines();
  });
})();
