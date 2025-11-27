// Admin Lessons Builder - slides + inspectors (MCQ/TF/TapWord/DragBlank/Flashcard + Content media)
console.log('[lessons_builder] loaded');
try{ window.lessons_builder_loaded = true; }catch(_){}

const shell = document.querySelector('.builder-shell');
// In modules, top-level `return` is illegal; guard instead
if (!shell) { console.warn('[lessons_builder] no .builder-shell on page'); }

let lessonId;
let preview;
let btnRefresh;
let btnOpen;

lessonId = shell?.dataset.lessonId;
if (shell && !lessonId) {
  console.warn('[lessons_builder] No lessonId on page; create the lesson first.');
}
preview = shell?.querySelector('.builder-preview');
btnRefresh = document.getElementById('btn-refresh-preview');
btnOpen = document.getElementById('btn-open-player');

let lesson = null;
let selectedSlideIndex = 0;
let saveTimer = null;

function debounceSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveLesson, 400);
}

async function loadLesson() {
  const res = await fetch(`/admin/api/lessons/${lessonId}`);
  if (!res.ok) throw new Error('Failed to load lesson');
  const data = await res.json();
  lesson = data.json || {};
  lesson.title = data.title || lesson.title || 'Lección';
  lesson.slug = data.slug || lesson.slug || `lesson-${data.id}`;
  lesson.locale = data.locale || lesson.locale || 'es';
  lesson.slides = Array.isArray(lesson.slides) ? lesson.slides : (lesson.slides ? Object.values(lesson.slides) : []);
  setPreviewSrc();
  renderTimeline();
  renderInspector();
}

function setPreviewSrc() {
  if (preview && lesson) {
    preview.src = `/lessons/${encodeURIComponent(lesson.slug)}?edit=1`;
    btnOpen?.setAttribute('href', `/lessons/${encodeURIComponent(lesson.slug)}`);
  }
}

function renderTimeline() {
  let host = shell.querySelector('.builder-palette');
  if (!host) return;
  host.innerHTML = '<h3>Slides</h3>' +
    '<div id="slides-list" class="ppx-stack-sm"></div>' +
    '<div class="ppx-stack-sm" style="margin-top:10px;">'
      + '<button id="add-content" class="ppx-pill">+ Add Content</button>'
      + '<button id="add-mcq" class="ppx-pill">+ Add MCQ</button>'
      + '<button id="add-tf" class="ppx-pill">+ Add True/False</button>'
      + '<button id="add-tapword" class="ppx-pill">+ Add Tap-Word</button>'
      + '<button id="add-dragblank" class="ppx-pill">+ Add Drag-Blank</button>'
      + '<button id="add-flash" class="ppx-pill">+ Add Flashcard</button>'
    + '</div>';
  const list = host.querySelector('#slides-list');
  (lesson.slides || []).forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'ppx-row';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.setAttribute('draggable', 'true');
    row.dataset.idx = String(i);

    // DnD handlers
    row.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', String(i));
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault(); // allow drop
      row.classList.add('dragover');
    });
    row.addEventListener('dragleave', () => {
      row.classList.remove('dragover');
    });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('dragover');
      const fromStr = e.dataTransfer?.getData('text/plain') || '';
      const from = parseInt(fromStr, 10);
      const toEl = e.currentTarget instanceof HTMLElement ? e.currentTarget : row;
      const to = parseInt(toEl.dataset.idx || String(i), 10);
      if (!Number.isNaN(from) && !Number.isNaN(to) && from !== to) {
        reorderSlides(from, to);
      }
    });

    const title = document.createElement('button');
    title.className = 'ppx-pill';
    title.textContent = `${i + 1}. ${s.mode || s.type || 'slide'}`;
    title.addEventListener('click', () => {
      selectedSlideIndex = i; renderInspector();
      // Sync preview to the selected slide (if loaded)
      try { preview?.contentWindow?.postMessage({ type: 'lp.goto', index: i }, '*'); } catch (_) {}
    });
    const ctrls = document.createElement('div');
    ctrls.className = 'ppx-row';
    ctrls.style.gap = '6px';
    const up = makeMiniBtn('↑', () => moveSlide(i, -1));
    const down = makeMiniBtn('↓', () => moveSlide(i, 1));
    const dup = makeMiniBtn('⧉', () => duplicateSlide(i));
    const del = makeMiniBtn('✕', () => deleteSlide(i));
    ctrls.append(up, down, dup, del);
    row.append(title, ctrls);
    list.appendChild(row);
  });
  host.querySelector('#add-content').onclick = () => {
    const idx = (lesson.slides || []).length;
    const slide = { id: `content_${Date.now()}`, type: 'content', elements: [ {type:'text', html:'Nuevo contenido'} ] };
    lesson.slides.push(slide);
    selectedSlideIndex = idx;
    renderTimeline(); renderInspector(); debounceSave();
  };
  host.querySelector('#add-mcq').onclick = () => {
    const idx = (lesson.slides || []).length;
    const slide = {
      id: `mcq_${Date.now()}`,
      type: 'exercise',
      mode: 'mcq',
      prompt: 'Seleccioná la forma correcta del verbo.',
      stem_html: 'Yo _____ …',
      choices: [ {id:'a',text:'opción A'}, {id:'b',text:'opción B'} ],
      answer: 'a'
    };
    lesson.slides.push(slide);
    selectedSlideIndex = idx;
    renderTimeline(); renderInspector(); debounceSave();
  };
  host.querySelector('#add-tf').onclick = () => addExercise('tf');
  host.querySelector('#add-tapword').onclick = () => addExercise('tapword');
  host.querySelector('#add-dragblank').onclick = () => addExercise('dragblank');
  host.querySelector('#add-flash').onclick = () => addExercise('flashcard');
}

function reorderSlides(from, to) {
  if (from < 0 || to < 0 || from >= lesson.slides.length || to >= lesson.slides.length) return;
  const [s] = lesson.slides.splice(from, 1);
  lesson.slides.splice(to, 0, s);
  selectedSlideIndex = to;
  renderTimeline();
  renderInspector();
  debounceSave();
}

function makeMiniBtn(label, onClick){
  const b = document.createElement('button');
  b.className = 'ppx-pill';
  b.style.padding = '2px 6px';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function moveSlide(i, delta){
  const j = i + delta;
  if (j < 0 || j >= lesson.slides.length) return;
  const [s] = lesson.slides.splice(i,1);
  lesson.slides.splice(j,0,s);
  selectedSlideIndex = j;
  renderTimeline(); renderInspector(); debounceSave();
}

function duplicateSlide(i){
  const s = JSON.parse(JSON.stringify(lesson.slides[i]));
  s.id = `${s.id}_copy_${Date.now()}`;
  lesson.slides.splice(i+1,0,s);
  selectedSlideIndex = i+1;
  renderTimeline(); renderInspector(); debounceSave();
}

function deleteSlide(i){
  if (!confirm('¿Eliminar esta diapositiva?')) return;
  lesson.slides.splice(i,1);
  selectedSlideIndex = Math.max(0, selectedSlideIndex-1);
  renderTimeline(); renderInspector(); debounceSave();
}

function addExercise(mode){
  const idx = (lesson.slides || []).length;
  const base = { id:`${mode}_${Date.now()}`, type:'exercise', mode };
  let slide = base;
  if (mode === 'tf') {
    slide = { ...base, prompt:'Verdadero o falso:', statement:'El cielo es verde.', answer:true };
  } else if (mode === 'tapword') {
    slide = { ...base, prompt:'Toca las palabras correctas', words:'uno dos tres cuatro', targets:'dos,cuatro' };
  } else if (mode === 'dragblank') {
    slide = { ...base, prompt:'Arrastra las palabras al espacio', text:'Yo [[hablo]] español todos los [[días]]', bank:['hablo','hablas','días','noche'] };
  } else if (mode === 'flashcard') {
    slide = { ...base, front_html:'Hola', back_html:'Hello' };
  }
  lesson.slides.push(slide);
  selectedSlideIndex = idx;
  renderTimeline(); renderInspector(); debounceSave();
}

function renderInspector() {
  const host = shell.querySelector('.inspector-fields');
  host.innerHTML = '';
  const s = lesson.slides[selectedSlideIndex];
  if (!s) { host.textContent = 'No slide selected.'; return; }
  if (s.type === 'content') return renderInspectorContent(host, s);
  if (s.mode === 'mcq') return renderInspectorMcq(host, s);
  if (s.mode === 'tf') return renderInspectorTf(host, s);
  if (s.mode === 'tapword') return renderInspectorTapWord(host, s);
  if (s.mode === 'dragblank') return renderInspectorDragBlank(host, s);
  if (s.mode === 'flashcard') return renderInspectorFlash(host, s);
  host.textContent = `Mode ${s.mode||s.type} not yet editable.`;
}

function renderInspectorContent(host, s){
  const form = document.createElement('div');
  form.innerHTML = `
    <div class="ppx-row" style="gap:6px;">
      <button id="add-txt" class="ppx-pill">+ Text</button>
      <button id="add-audio" class="ppx-pill">+ Audio</button>
      <button id="add-image" class="ppx-pill">+ Image</button>
      <button id="add-video" class="ppx-pill">+ Video</button>
    </div>
    <div id="content-elems" class="ppx-stack-sm" style="margin-top:8px;"></div>
  `;
  host.appendChild(form);
  const out = form.querySelector('#content-elems');
  (s.elements||[]).forEach((el, i) => {
    const block = document.createElement('div');
    block.className = 'ppx-card ppx-card--pad';
    block.innerHTML = `<div style="margin-bottom:6px;"><strong>${el.type}</strong></div>`;
    if (el.type === 'text') {
      const ta = document.createElement('textarea'); ta.className='ppx-textarea'; ta.value = el.html||'';
      ta.addEventListener('input', e=>{ el.html = e.target.value; debounceSave(); });
      block.appendChild(ta);
    } else if (el.type === 'audio' || el.type === 'image' || el.type==='video') {
      const url = document.createElement('input'); url.className='ppx-input'; url.placeholder='Paste GDrive or direct URL'; url.value = el.src||'';
      const norm = document.createElement('button'); norm.className='ppx-pill'; norm.textContent='Normalize'; norm.style.marginTop='6px';
      norm.addEventListener('click', async ()=>{
        const val = url.value.trim();
        if (!val) return; try {
          const resp = await fetch('/admin/api/media/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:val})});
          if (resp.ok){ const data = await resp.json(); el.src = data.src; url.value = el.src; debounceSave(); }
          else { alert('Invalid media URL'); }
        } catch(e){ alert('Media resolve failed'); }
      });
      block.appendChild(url); block.appendChild(norm);
    }
    // controls
    const ctrl = document.createElement('div'); ctrl.className='ppx-row'; ctrl.style.gap='6px'; ctrl.style.marginTop='6px';
    const del = makeMiniBtn('Remove', ()=>{ s.elements.splice(i,1); renderInspectorContent(host,s); debounceSave(); });
    ctrl.appendChild(del); block.appendChild(ctrl);
    out.appendChild(block);
  });
  form.querySelector('#add-txt').onclick = ()=>{ (s.elements=s.elements||[]).push({type:'text',html:'Texto'}); renderInspectorContent(host,s); debounceSave(); };
  form.querySelector('#add-audio').onclick = ()=>{ (s.elements=s.elements||[]).push({type:'audio',src:''}); renderInspectorContent(host,s); debounceSave(); };
  form.querySelector('#add-image').onclick = ()=>{ (s.elements=s.elements||[]).push({type:'image',src:''}); renderInspectorContent(host,s); debounceSave(); };
  form.querySelector('#add-video').onclick = ()=>{ (s.elements=s.elements||[]).push({type:'video',src:''}); renderInspectorContent(host,s); debounceSave(); };
}

function renderInspectorMcq(host,s){
  const form = document.createElement('div');
  form.innerHTML = `
    <label>Prompt<br><input id="mcq-prompt" class="ppx-input" value="${escapeHtml(s.prompt||'')}"></label>
    <label>Stem (HTML)<br><textarea id="mcq-stem" class="ppx-textarea">${s.stem_html||''}</textarea></label>
    <div style="margin-top:8px;"><strong>Choices</strong></div>
    <div id="mcq-choices"></div>
    <label>Answer<br><input id="mcq-answer" class="ppx-input" value="${s.answer||''}"></label>
  `;
  host.appendChild(form);
  const choicesHost = form.querySelector('#mcq-choices');
  (s.choices||[]).forEach((c,i)=>{
    const row=document.createElement('div'); row.style.marginBottom='6px';
    row.innerHTML = `<code style="margin-right:6px;">${c.id||String.fromCharCode(65+i)}</code><input class="ppx-input" data-idx="${i}" value="${escapeHtml(c.text||'')}">`;
    choicesHost.appendChild(row);
  });
  form.querySelector('#mcq-prompt').addEventListener('input', e=>{ s.prompt=e.target.value; debounceSave(); });
  form.querySelector('#mcq-stem').addEventListener('input', e=>{ s.stem_html=e.target.value; debounceSave(); });
  form.querySelector('#mcq-answer').addEventListener('input', e=>{ s.answer=e.target.value; debounceSave(); });
  choicesHost.querySelectorAll('input[data-idx]').forEach(inp=>{
    inp.addEventListener('input', e=>{ const i=+e.target.dataset.idx; s.choices[i].text=e.target.value; debounceSave(); });
  });
}

function renderInspectorTf(host,s){
  const form=document.createElement('div');
  form.innerHTML = `
    <label>Prompt<br><input id="tf-prompt" class="ppx-input" value="${escapeHtml(s.prompt||'Verdadero o falso:')}"></label>
    <label>Statement<br><textarea id="tf-stmt" class="ppx-textarea">${s.statement||''}</textarea></label>
    <label>Answer (true/false)<br><input id="tf-ans" class="ppx-input" value="${String(s.answer)}"></label>
  `;
  host.appendChild(form);
  form.querySelector('#tf-prompt').addEventListener('input', e=>{ s.prompt=e.target.value; debounceSave(); });
  form.querySelector('#tf-stmt').addEventListener('input', e=>{ s.statement=e.target.value; debounceSave(); });
  form.querySelector('#tf-ans').addEventListener('input', e=>{ s.answer = (e.target.value||'').toLowerCase().startsWith('t'); debounceSave(); });
}

function renderInspectorTapWord(host,s){
  const form=document.createElement('div');
  form.innerHTML = `
    <label>Prompt<br><input id="tw-prompt" class="ppx-input" value="${escapeHtml(s.prompt||'Toca las palabras correctas')}"></label>
    <label>Words (space-separated)<br><input id="tw-words" class="ppx-input" value="${escapeHtml(s.words||'')}"></label>
    <label>Targets (comma-separated words)<br><input id="tw-targets" class="ppx-input" value="${escapeHtml(s.targets||'')}"></label>
  `;
  host.appendChild(form);
  form.querySelector('#tw-prompt').addEventListener('input', e=>{ s.prompt=e.target.value; debounceSave(); });
  form.querySelector('#tw-words').addEventListener('input', e=>{ s.words=e.target.value; debounceSave(); });
  form.querySelector('#tw-targets').addEventListener('input', e=>{ s.targets=e.target.value; debounceSave(); });
}

function renderInspectorDragBlank(host,s){
  const form=document.createElement('div');
  form.innerHTML = `
    <label>Prompt<br><input id="db-prompt" class="ppx-input" value="${escapeHtml(s.prompt||'Arrastra las palabras al espacio')}"></label>
    <label>Text with [[blanks]]<br><textarea id="db-text" class="ppx-textarea">${s.text||''}</textarea></label>
    <label>Bank (comma-separated)<br><input id="db-bank" class="ppx-input" value="${escapeHtml((s.bank||[]).join(', '))}"></label>
  `;
  host.appendChild(form);
  form.querySelector('#db-prompt').addEventListener('input', e=>{ s.prompt=e.target.value; debounceSave(); });
  form.querySelector('#db-text').addEventListener('input', e=>{ s.text=e.target.value; debounceSave(); });
  form.querySelector('#db-bank').addEventListener('input', e=>{ s.bank = e.target.value.split(',').map(x=>x.trim()).filter(Boolean); debounceSave(); });
}

function renderInspectorFlash(host,s){
  const form=document.createElement('div');
  form.innerHTML = `
    <label>Front (HTML)<br><textarea id="fl-front" class="ppx-textarea">${s.front_html||''}</textarea></label>
    <label>Back (HTML)<br><textarea id="fl-back" class="ppx-textarea">${s.back_html||''}</textarea></label>
  `;
  host.appendChild(form);
  form.querySelector('#fl-front').addEventListener('input', e=>{ s.front_html=e.target.value; debounceSave(); });
  form.querySelector('#fl-back').addEventListener('input', e=>{ s.back_html=e.target.value; debounceSave(); });
}

async function saveLesson() {
  // Persist metadata + JSON in a single PUT
  const res = await fetch(`/admin/api/lessons/${lessonId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: lesson.title,
      slug: lesson.slug,
      locale: lesson.locale,
      json: lesson,
    })
  });
  if (!res.ok) {
    console.error('[lessons_builder] save failed', await res.text());
    return;
  }
  console.log('[lessons_builder] saved');
}

if (btnRefresh) btnRefresh.addEventListener('click', () => setPreviewSrc());

// Wire admin actions
if (shell) {
  shell.querySelector('.btn-save')?.addEventListener('click', () => saveLesson());
  shell.querySelector('.btn-review')?.addEventListener('click', async () => {
    await saveLesson();
    await fetch(`/admin/api/lessons/${lessonId}/submit_review`, {method:'POST'});
    alert('Submitted for review');
  });
  shell.querySelector('.btn-publish')?.addEventListener('click', async () => {
    await saveLesson();
    await fetch(`/admin/api/lessons/${lessonId}/publish`, {method:'POST'});
    alert('Published'); setPreviewSrc();
  });
}

function escapeHtml(s) {
  return (s||'').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

if (lessonId) {
  loadLesson().catch(err => { console.error(err); alert('Failed to load lesson'); });
}

// Receive inline edits from the preview iframe
window.addEventListener('message', (e) => {
  const msg = e?.data || {};
  if (!lesson || !msg || msg.type !== 'lp.updateField') return;
  const slideIndex = Number(msg.index);
  if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= (lesson.slides||[]).length) return;
  const slide = lesson.slides[slideIndex];
  if (msg.field === 'prompt') {
    slide.prompt = msg.value || '';
  } else if (msg.field === 'stem_html') {
    slide.stem_html = msg.value || '';
  } else if (msg.field === 'choice_text') {
    const ci = Number(
      (Number.isInteger(msg.choiceIndex) ? msg.choiceIndex : (
        Number.isInteger(msg.idx) ? msg.idx : (
          Number.isInteger(msg.choice) ? msg.choice : -1
        )
      ))
    );
    if (Array.isArray(slide.choices) && Number.isInteger(ci) && ci >= 0 && ci < slide.choices.length) {
      slide.choices[ci].text = msg.value || '';
    }
  }
  selectedSlideIndex = slideIndex;
  renderTimeline();
  renderInspector();
  debounceSave();
});

// Inline editing inside the preview (no player changes required)
function enableInlineEditing() {
  const doc = preview?.contentDocument;
  if (!doc) return;
  const shellEl = doc.querySelector('.lp-shell');
  if (!shellEl) return;
  const getSlideIndex = () => {
    try { return Number(shellEl.__lp_state?.state?.index ?? 0); } catch (_) { return 0; }
  };
  const mark = (el) => { el.setAttribute('data-ppx-edit', '1'); el.style.outlineOffset = '2px'; };

  // Prompt
  doc.querySelectorAll('.lp-prompt:not([data-ppx-edit])').forEach(el => {
    el.contentEditable = 'true'; mark(el);
    el.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); el.blur(); }});
    el.addEventListener('blur', () => {
      const i = getSlideIndex();
      const s = (lesson.slides||[])[i]; if (!s) return;
      s.prompt = el.textContent || '';
      debounceSave();
    });
  });
  // Stem (HTML)
  doc.querySelectorAll('.lp-stem:not([data-ppx-edit])').forEach(el => {
    el.contentEditable = 'true'; mark(el);
    el.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); el.blur(); }});
    el.addEventListener('blur', () => {
      const i = getSlideIndex();
      const s = (lesson.slides||[])[i]; if (!s) return;
      s.stem_html = el.innerHTML || '';
      debounceSave();
    });
  });
  // Choice texts
  doc.querySelectorAll('.lp-choice__text:not([data-ppx-edit])').forEach((el, idx) => {
    el.contentEditable = 'true'; mark(el);
    el.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); el.blur(); }});
    el.addEventListener('blur', () => {
      const i = getSlideIndex();
      const s = (lesson.slides||[])[i]; if (!s || !Array.isArray(s.choices)) return;
      // Find index by DOM order
      const nodes = Array.from(doc.querySelectorAll('.lp-choice__text'));
      const j = nodes.indexOf(el);
      if (j >= 0 && j < s.choices.length) {
        s.choices[j].text = el.textContent || '';
        debounceSave();
      }
    });
  });
}

function observePreviewForEdits() {
  if (!preview) return;
  preview.addEventListener('load', () => {
    try {
      enableInlineEditing();
      const doc = preview.contentDocument;
      const vp = doc?.querySelector('.lp-viewport');
      if (vp) {
        const mo = new MutationObserver(() => enableInlineEditing());
        mo.observe(vp, { childList: true, subtree: true });
      }
    } catch (_) {}
  });
}

observePreviewForEdits();
