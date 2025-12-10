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
let btnPrevSlide;
let btnNextSlide;
let slideLabel;
let btnSampleJson;
let btnEditJson;
let jsonModal;
let jsonTextarea;
let jsonClose;
let jsonApply;
let jsonInsertWrap;
let jsonFormat;
let jsonValidate;
let hiddenAudioInput = null;

const SAMPLE_LESSON = {
  version: 1,
  locale: "es",
  slug: "sample-lesson",
  title: "Lección de ejemplo",
  settings: { progress_gate: true, pass_threshold: 0.8 },
  slides: [
    {
      id: "content_intro",
      type: "content",
      elements: [
        { type: "text", html: "<h2>Bienvenida</h2><p>Personaliza esta lección.</p>" },
        { type: "explainer", title: "Explicación", html: "<p>Texto con <b>negrita</b>, <i>cursiva</i> y <span class=\"is-colored\">color</span>.</p>" },
        { type: "audio", src: "media:gdrive:FILE_ID", caption: "Audio breve" },
        { type: "audio_example", src: "media:gdrive:FILE_ID", html: "<b>Ejemplo</b> con audio.", hint_html: "Tip opcional." },
        {
          type: "dialog",
          turns: [
            { speaker: "A", html: "¡Hola!", audio: "media:gdrive:FILE_ID" },
            { speaker: "B", html: "¿Qué tal?", audio: "media:gdrive:FILE_ID2" }
          ]
        },
        { type: "image", src: "https://picsum.photos/400/200", caption: "Imagen" },
        { type: "video", src: "https://example.com/video.mp4", caption: "Video" }
      ]
    },
    {
      id: "mcq1",
      type: "exercise",
      mode: "mcq",
      prompt: "Selecciona la forma correcta.",
      stem_html: "Yo _____ español.",
      choices: [
        { id: "a", text: "hablo" },
        { id: "b", text: "hablas" },
        { id: "c", text: "habla" }
      ],
      answer: "a"
    },
    { id: "tf1", type: "exercise", mode: "tf", prompt: "Verdadero o falso:", statement: "El sol es una estrella.", answer: true },
    { id: "tap1", type: "exercise", mode: "tapword", prompt: "Selecciona las palabras correctas", words: "uno dos tres cuatro", targets: "dos,cuatro" },
    { id: "drag1", type: "exercise", mode: "dragblank", prompt: "Arrastra al espacio", text: "Yo [[hablo]] todos los [[días]].", bank: ["hablo", "hablas", "días", "noche"] },
    { id: "dict1", type: "exercise", mode: "dictation", answer: "Hola, ¿cómo estás?", grading: { accents: "required", punctuation: "advisory" } },
    { id: "flash1", type: "exercise", mode: "flashcard", front_html: "Hola", back_html: "Hello" }
  ]
};

lessonId = shell?.dataset.lessonId;
if (shell && !lessonId) {
  console.warn('[lessons_builder] No lessonId on page; create the lesson first.');
}
preview = shell?.querySelector('.builder-preview');
btnRefresh = document.getElementById('btn-refresh-preview');
btnOpen = document.getElementById('btn-open-player');
btnPrevSlide = document.getElementById('btn-prev-slide');
btnNextSlide = document.getElementById('btn-next-slide');
slideLabel = document.getElementById('slide-label');
btnSampleJson = document.getElementById('btn-sample-json');
btnEditJson = document.getElementById('btn-edit-json');
jsonModal = document.getElementById('json-modal');
jsonTextarea = document.getElementById('json-textarea');
jsonClose = document.getElementById('json-close');
jsonApply = document.getElementById('json-apply');
jsonInsertWrap = document.getElementById('json-insert-wrap');
jsonFormat = document.getElementById('json-format');
jsonValidate = document.getElementById('json-validate');

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
  if (!lesson.slides || lesson.slides.length === 0) {
    lesson.slides = [{ id: 'content_1', type: 'content', elements: [] }];
  }
  setPreviewSrc();
  renderTimeline();
  renderInspector();
  updateSlideLabel();
}

function setPreviewSrc() {
  if (preview && lesson) {
    const base = `/lessons/${encodeURIComponent(lesson.slug)}?edit=1`;
    const withId = lessonId ? `${base}&id=${lessonId}` : base;
    preview.src = withId;
    btnOpen?.setAttribute('href', `/lessons/${encodeURIComponent(lesson.slug)}`);
  }
}

function updateSlideLabel() {
  if (!slideLabel || !lesson) return;
  const total = (lesson.slides || []).length || 1;
  const cur = Math.min(Math.max(selectedSlideIndex + 1, 1), total);
  slideLabel.textContent = `Slide ${cur}/${total}`;
  if (btnPrevSlide) btnPrevSlide.disabled = selectedSlideIndex <= 0;
  if (btnNextSlide) btnNextSlide.disabled = selectedSlideIndex >= total - 1;
}

function goToSlide(index) {
  if (!lesson || !Array.isArray(lesson.slides)) return;
  const max = Math.max((lesson.slides.length || 1) - 1, 0);
  const idx = Math.min(Math.max(0, index), max);
  selectedSlideIndex = idx;
  renderTimeline();
  renderInspector();
  updateSlideLabel();
  try { preview?.contentWindow?.postMessage({ type: 'lp.goto', index: idx }, '*'); } catch (_) {}
}

function openJsonModal(data, readOnly=false) {
  if (!jsonModal || !jsonTextarea) return;
  const payload = data || {};
  jsonTextarea.value = JSON.stringify(payload, null, 2);
  jsonTextarea.readOnly = readOnly;
  if (jsonApply) jsonApply.style.display = readOnly ? 'none' : 'inline-flex';
  jsonModal.style.display = 'flex';
  renderJsonPalette();
}

function closeJsonModal() {
  if (jsonModal) jsonModal.style.display = 'none';
}

function applyJsonModal() {
  if (!jsonTextarea) return;
  try {
    const parsed = JSON.parse(jsonTextarea.value || '{}');
    if (!parsed.slides || !Array.isArray(parsed.slides)) {
      parsed.slides = [];
    }
    lesson = parsed;
    goToSlide(0);
    setPreviewSrc();
    debounceSave();
    closeJsonModal();
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
  }
}

function formatJsonModal() {
  if (!jsonTextarea || jsonTextarea.readOnly) return;
  try {
    const parsed = JSON.parse(jsonTextarea.value || '{}');
    jsonTextarea.value = JSON.stringify(parsed, null, 2);
  } catch (e) {
    alert('Cannot format: ' + e.message);
  }
}

function validateJsonModal() {
  if (!jsonTextarea) return;
  try {
    JSON.parse(jsonTextarea.value || '{}');
    alert('JSON looks valid');
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
  }
}

function insertSnippet(snippet) {
  if (!jsonTextarea || !snippet) return;
  const ta = jsonTextarea;
  const start = ta.selectionStart || 0;
  const end = ta.selectionEnd || start;
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  ta.value = `${before}${snippet}${after}`;
  const pos = start + snippet.length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
}

function renderJsonPalette() {
  if (!jsonInsertWrap) return;
  const snippets = [
    { key: 'content', label: 'Content slide', get: () => JSON.stringify({
      id: `content_${Date.now()}`,
      type: 'content',
      elements: [
        { type:'text', html:'<h2>Título</h2><p>Texto descriptivo.</p>' },
        { type:'conjugation_table', title:'Poder — presente', rows:[
          {person:'yo', value_html:'<u>pued</u><span style=\"color:#475dd7\">o</span>'},
          {person:'tú / vos', value_html:'<u>pued</u><span style=\"color:#475dd7\">es</span> / <u>pod</u><span style=\"color:#475dd7\">és</span>'},
          {person:'usted, él / ella', value_html:'<u>pued</u><span style=\"color:#475dd7\">e</span>'},
          {person:'nosotros, -as', value_html:'<u>pod</u><span style=\"color:#475dd7\">emos</span>'},
          {person:'vosotros, -as', value_html:'<u>pod</u><span style=\"color:#475dd7\">éis</span>'},
          {person:'ustedes, ellos / ellas', value_html:'<u>pued</u><span style=\"color:#475dd7\">en</span>'}
        ]},
        { type:'audio_example', src:'media:gdrive:FILE_ID', html:'<b>Ejemplo</b> con audio.', hint_html:'Tip opcional.' }
      ]
    }, null, 2) },
    { key: 'conj-drag', label: 'Conjugation drag', get: () => JSON.stringify({
      id:`conj_${Date.now()}`,
      type:'exercise',
      mode:'conjugation_drag',
      prompt:'Arrastrá la conjugación correcta a cada persona.',
      rows:[
        {person:'yo', answer:'puedo'},
        {person:'tú / vos', answer:'puedes / podés'},
        {person:'usted, él / ella', answer:'puede'},
        {person:'nosotros, -as', answer:'podemos'},
        {person:'vosotros, -as', answer:'podéis'},
        {person:'ustedes, ellos / ellas', answer:'pueden'}
      ],
      bank:[
        {id:'puedo', label_html:'<u>pued</u><span style=\"color:#475dd7\">o</span>'},
        {id:'puedes / podés', label_html:'<u>pued</u><span style=\"color:#475dd7\">es</span> / <u>pod</u><span style=\"color:#475dd7\">és</span>'},
        {id:'puede', label_html:'<u>pued</u><span style=\"color:#475dd7\">e</span>'},
        {id:'podemos', label_html:'<u>pod</u><span style=\"color:#475dd7\">emos</span>'},
        {id:'podéis', label_html:'<u>pod</u><span style=\"color:#475dd7\">éis</span>'},
        {id:'pueden', label_html:'<u>pued</u><span style=\"color:#475dd7\">en</span>'}
      ]
    }, null, 2) },
    { key: 'mcq', label: 'MCQ', get: () => JSON.stringify({
      id:`mcq_${Date.now()}`,
      type:'exercise',
      mode:'mcq',
      prompt:'Selecciona la forma correcta.',
      stem_html:'Yo _____ español.',
      choices:[{id:'a',text:'hablo'},{id:'b',text:'hablas'},{id:'c',text:'habla'}],
      answer:'a'
    }, null, 2) },
    { key: 'dialog', label: 'Dialog', get: () => JSON.stringify({
      type:'dialog',
      turns:[{speaker:'A', html:'Hola', audio:''},{speaker:'B', html:'¿Qué tal?', audio:''}]
    }, null, 2) },
    { key: 'audio', label: 'Audio', get: () => JSON.stringify({ type:'audio', src:'media:gdrive:FILE_ID', caption:'Audio breve' }, null, 2) },
    { key: 'audio-example', label: 'Audio example', get: () => JSON.stringify({
      type:'audio_example',
      src:'media:gdrive:FILE_ID',
      html:'<b>Ejemplo</b> con audio.',
      hint_html:'Tip opcional.'
    }, null, 2) },
    { key: 'image', label: 'Image', get: () => JSON.stringify({ type:'image', src:'https://picsum.photos/400/200', caption:'Imagen' }, null, 2) },
    { key: 'video', label: 'Video', get: () => JSON.stringify({ type:'video', src:'https://example.com/video.mp4', caption:'Video' }, null, 2) },
    { key: 'tf', label: 'True/False', get: () => JSON.stringify({ id:`tf_${Date.now()}`, type:'exercise', mode:'tf', prompt:'Verdadero o falso:', statement:'El sol es una estrella.', answer:true }, null, 2) },
    { key: 'dragblank', label: 'Drag-Blank', get: () => JSON.stringify({
      id:`drag_${Date.now()}`,
      type:'exercise',
      mode:'dragblank',
      prompt:'Arrastra la opción correcta a cada espacio.',
      text:'Yo [[hablo]] español [[todos los días]].',
      bank:['hablo','hablas','todos los días','ayer']
    }, null, 2) },
    { key: 'tapword', label: 'Tap-Word', get: () => JSON.stringify({
      id:`tap_${Date.now()}`,
      type:'exercise',
      mode:'tapword',
      prompt:'Selecciona las palabras clave:',
      words:'uno dos tres cuatro cinco',
      targets:'dos,cuatro'
    }, null, 2) },
    { key: 'dictation', label: 'Dictation', get: () => JSON.stringify({
      id:`dict_${Date.now()}`,
      type:'exercise',
      mode:'dictation',
      audio:'media:gdrive:FILE_ID',
      answer:'Hola, ¿cómo estás?',
      grading:{accents:'required', punctuation:'advisory'}
    }, null, 2) },
    { key: 'flashcard', label: 'Flashcard', get: () => JSON.stringify({
      id:`flash_${Date.now()}`,
      type:'exercise',
      mode:'flashcard',
      front_html:'<h3>perro</h3>',
      back_html:'<h3>dog</h3>'
    }, null, 2) }
  ];
  jsonInsertWrap.innerHTML = '';
  snippets.forEach(sn => {
    const btn = document.createElement('button');
    btn.className = 'ppx-pill';
    btn.type = 'button';
    btn.textContent = sn.label;
    btn.addEventListener('click', () => insertSnippet(sn.get()));
    jsonInsertWrap.appendChild(btn);
  });
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
      + '<button id="add-conjdrag" class="ppx-pill">+ Add Conjugation Drag</button>'
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
      goToSlide(i);
    });
    if (i === selectedSlideIndex) {
      title.style.background = '#e6e9ff';
    }
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
    goToSlide(idx);
    debounceSave();
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
    goToSlide(idx);
    debounceSave();
  };
  host.querySelector('#add-tf').onclick = () => addExercise('tf');
  host.querySelector('#add-tapword').onclick = () => addExercise('tapword');
  host.querySelector('#add-dragblank').onclick = () => addExercise('dragblank');
  host.querySelector('#add-flash').onclick = () => addExercise('flashcard');
  host.querySelector('#add-conjdrag').onclick = () => addExercise('conjugation_drag');
}

function reorderSlides(from, to) {
  if (from < 0 || to < 0 || from >= lesson.slides.length || to >= lesson.slides.length) return;
  const [s] = lesson.slides.splice(from, 1);
  lesson.slides.splice(to, 0, s);
  goToSlide(to);
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
  goToSlide(j);
  debounceSave();
}

function duplicateSlide(i){
  const s = JSON.parse(JSON.stringify(lesson.slides[i]));
  s.id = `${s.id}_copy_${Date.now()}`;
  lesson.slides.splice(i+1,0,s);
  goToSlide(i+1);
  debounceSave();
}

function deleteSlide(i){
  if (!confirm('Delete this slide?')) return;
  lesson.slides.splice(i,1);
  const nextIndex = Math.max(0, Math.min(selectedSlideIndex, (lesson.slides.length||1)-1));
  goToSlide(nextIndex);
  debounceSave();
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
  } else if (mode === 'conjugation_drag') {
    slide = {
      ...base,
      prompt:'Arrastrá la conjugación correcta a cada persona.',
      rows:[
        {person:'yo', answer:'puedo'},
        {person:'tú / vos', answer:'puedes / podés'},
        {person:'usted, él / ella', answer:'puede'},
        {person:'nosotros, -as', answer:'podemos'},
        {person:'vosotros, -as', answer:'podéis'},
        {person:'ustedes, ellos / ellas', answer:'pueden'}
      ],
      bank:[
        {id:'puedo', label_html:'<u>pued</u><span style="color:#475dd7">o</span>'},
        {id:'puedes / podés', label_html:'<u>pued</u><span style="color:#475dd7">es</span> / <u>pod</u><span style="color:#475dd7">és</span>'},
        {id:'puede', label_html:'<u>pued</u><span style="color:#475dd7">e</span>'},
        {id:'podemos', label_html:'<u>pod</u><span style="color:#475dd7">emos</span>'},
        {id:'podéis', label_html:'<u>pod</u><span style="color:#475dd7">eís</span>'},
        {id:'pueden', label_html:'<u>pued</u><span style="color:#475dd7">en</span>'}
      ]
    };
  }
  lesson.slides.push(slide);
  goToSlide(idx);
  debounceSave();
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
  if (s.mode === 'conjugation_drag') return renderInspectorConjugationDrag(host, s);
  host.textContent = `Mode ${s.mode||s.type} not yet editable.`;
}

function renderInspectorContent(host, s){
  const form = document.createElement('div');
  form.innerHTML = `
    <div class="ppx-row" style="gap:6px;">
      <button id="add-txt" class="ppx-pill">+ Text</button>
      <button id="add-explainer" class="ppx-pill">+ Explainer</button>
      <button id="add-audio" class="ppx-pill">+ Audio</button>
      <button id="add-audioexample" class="ppx-pill">+ Audio Example</button>
      <button id="add-dialog" class="ppx-pill">+ Dialog</button>
      <button id="add-image" class="ppx-pill">+ Image</button>
      <button id="add-video" class="ppx-pill">+ Video</button>
      <button id="add-conj" class="ppx-pill">+ Conjugation Table</button>
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
    } else if (el.type === 'explainer') {
      const title = document.createElement('input'); title.className='ppx-input'; title.placeholder='Title (optional)'; title.value = el.title||'';
      title.addEventListener('input', e=>{ el.title = e.target.value; debounceSave(); });
      const ta = document.createElement('textarea'); ta.className='ppx-textarea'; ta.placeholder='HTML or rich text'; ta.value = el.html||'';
      ta.addEventListener('input', e=>{ el.html = e.target.value; debounceSave(); });
      block.appendChild(title); block.appendChild(ta);
    } else if (el.type === 'conjugation_table') {
      const title = document.createElement('input'); title.className='ppx-input'; title.placeholder='Title (optional)'; title.value = el.title||'';
      title.addEventListener('input', e=>{ el.title = e.target.value; debounceSave(); });
      block.appendChild(title);
      const rowsHost = document.createElement('div'); rowsHost.className='ppx-stack-sm'; rowsHost.style.marginTop='8px';
      (el.rows||[]).forEach((r, ri)=>{
        const rowCard=document.createElement('div'); rowCard.className='ppx-card ppx-card--pad';
        const person=document.createElement('input'); person.className='ppx-input'; person.placeholder='Person'; person.value=r.person||'';
        person.addEventListener('input', e=>{ r.person=e.target.value; debounceSave(); });
        const val=document.createElement('textarea'); val.className='ppx-textarea'; val.placeholder='Value (HTML allowed)'; val.value=r.value_html||'';
        val.addEventListener('input', e=>{ r.value_html=e.target.value; debounceSave(); });
        const del=makeMiniBtn('Remove row', ()=>{ el.rows.splice(ri,1); renderInspectorContent(host,s); debounceSave(); });
        rowCard.append(person,val,del); rowsHost.appendChild(rowCard);
      });
      const addRow=makeMiniBtn('Add row', ()=>{ (el.rows=el.rows||[]).push({person:'',value_html:''}); renderInspectorContent(host,s); debounceSave(); });
      block.append(rowsHost, addRow);
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
      block.appendChild(url);
      if (el.type === 'audio') {
        const upload = document.createElement('button'); upload.className='ppx-pill'; upload.textContent='Upload audio'; upload.style.marginTop='6px';
        wireAudioUpload(upload, (src)=>{ el.src=src; url.value=src; debounceSave(); });
        block.appendChild(upload);
      }
      block.appendChild(norm);
    } else if (el.type === 'audio_example') {
      const url = document.createElement('input'); url.className='ppx-input'; url.placeholder='Audio URL or GDrive'; url.value = el.src||'';
      const label = document.createElement('textarea'); label.className='ppx-textarea'; label.placeholder='Rich label (supports <b>/<i>/<span class=\"is-colored\">)'; label.value = el.html||'';
      const hint = document.createElement('textarea'); hint.className='ppx-textarea'; hint.placeholder='Hint text (HTML allowed)'; hint.value = el.hint_html||'';
      const norm = document.createElement('button'); norm.className='ppx-pill'; norm.textContent='Normalize'; norm.style.marginTop='6px';
      norm.addEventListener('click', async ()=>{
        const val = url.value.trim();
        if (!val) return; try {
          const resp = await fetch('/admin/api/media/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:val})});
          if (resp.ok){ const data = await resp.json(); el.src = data.src; url.value = el.src; debounceSave(); }
          else { alert('Invalid media URL'); }
        } catch(e){ alert('Media resolve failed'); }
      });
        url.addEventListener('input', e=>{ el.src = e.target.value; debounceSave(); });
        label.addEventListener('input', e=>{ el.html = e.target.value; debounceSave(); });
        hint.addEventListener('input', e=>{ el.hint_html = e.target.value; debounceSave(); });
        const upload = document.createElement('button'); upload.className='ppx-pill'; upload.textContent='Upload audio'; upload.style.marginTop='6px';
        wireAudioUpload(upload, (src)=>{ el.src=src; url.value=src; debounceSave(); });
        block.append(url, upload, norm, label, hint);
      } else if (el.type === 'dialog') {
        const turnsHost = document.createElement('div'); turnsHost.className='ppx-stack-sm';
        const addTurn = document.createElement('button'); addTurn.className='ppx-pill'; addTurn.textContent='+ Add Turn';
        addTurn.addEventListener('click', ()=>{ (el.turns=el.turns||[]).push({speaker:'',text:'',audio:''}); renderInspectorContent(host,s); debounceSave(); });
        (el.turns||[]).forEach((t,i)=>{
          const card=document.createElement('div'); card.className='ppx-card ppx-card--pad';
          const speaker=document.createElement('input'); speaker.className='ppx-input'; speaker.placeholder='Speaker'; speaker.value=t.speaker||'';
          speaker.addEventListener('input', e=>{ t.speaker=e.target.value; debounceSave(); });
          const text=document.createElement('textarea'); text.className='ppx-textarea'; text.placeholder='Text or HTML'; text.value=t.html||t.text||'';
          text.addEventListener('input', e=>{ t.html=e.target.value; t.text=e.target.value; debounceSave(); });
          const audio=document.createElement('input'); audio.className='ppx-input'; audio.placeholder='Audio URL or GDrive'; audio.value=t.audio||'';
          audio.addEventListener('input', e=>{ t.audio=e.target.value; debounceSave(); });
          const norm=document.createElement('button'); norm.className='ppx-pill'; norm.textContent='Normalize'; norm.style.marginTop='6px';
          norm.addEventListener('click', async ()=>{
            const val = audio.value.trim();
            if (!val) return; try {
              const resp = await fetch('/admin/api/media/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:val})});
              if (resp.ok){ const data = await resp.json(); t.audio = data.src; audio.value = t.audio; debounceSave(); }
              else { alert('Invalid media URL'); }
            } catch(e){ alert('Media resolve failed'); }
          });
          const upload = document.createElement('button'); upload.className='ppx-pill'; upload.textContent='Upload audio'; upload.style.marginTop='6px';
          wireAudioUpload(upload, (src)=>{ t.audio=src; audio.value=src; debounceSave(); });
          const del=makeMiniBtn('Remove', ()=>{ el.turns.splice(i,1); renderInspectorContent(host,s); debounceSave(); });
          card.append(speaker,text,audio,upload,norm,del); turnsHost.appendChild(card);
        });
        block.append(addTurn,turnsHost);
      }
    // controls
    const ctrl = document.createElement('div'); ctrl.className='ppx-row'; ctrl.style.gap='6px'; ctrl.style.marginTop='6px';
    const del = makeMiniBtn('Remove', ()=>{ s.elements.splice(i,1); renderInspectorContent(host,s); debounceSave(); });
    ctrl.appendChild(del); block.appendChild(ctrl);
    out.appendChild(block);
  });
  form.querySelector('#add-txt').onclick = ()=>{ (s.elements=s.elements||[]).push({type:'text',html:'Texto'}); renderInspectorContent(host,s); debounceSave(); };
  form.querySelector('#add-explainer').onclick = ()=>{ (s.elements=s.elements||[]).push({type:'explainer',title:'Explainer',html:'<p>Texto con <b>negrita</b>, <i>cursiva</i> y <span class=\"is-colored\">color</span>.</p>'}); renderInspectorContent(host,s); debounceSave(); };
  form.querySelector('#add-audio').onclick = ()=>{ (s.elements=s.elements||[]).push({type:'audio',src:''}); renderInspectorContent(host,s); debounceSave(); };
  form.querySelector('#add-audioexample').onclick = ()=>{ (s.elements=s.elements||[]).push({type:'audio_example',src:'',html:'<b>Ejemplo</b> con <span class=\"is-colored\">audio</span>.', hint_html:''}); renderInspectorContent(host,s); debounceSave(); };
  form.querySelector('#add-dialog').onclick = ()=>{ (s.elements=s.elements||[]).push({type:'dialog',turns:[{speaker:'',text:'',audio:''}]}); renderInspectorContent(host,s); debounceSave(); };
  form.querySelector('#add-image').onclick = ()=>{ (s.elements=s.elements||[]).push({type:'image',src:''}); renderInspectorContent(host,s); debounceSave(); };
  form.querySelector('#add-video').onclick = ()=>{ (s.elements=s.elements||[]).push({type:'video',src:''}); renderInspectorContent(host,s); debounceSave(); };
  form.querySelector('#add-conj').onclick = ()=>{ (s.elements=s.elements||[]).push({
    type:'conjugation_table',
    title:'Conjugaciones',
    rows:[
      {person:'yo', value_html:'<u>pued</u><span style=\"color:#475dd7\">o</span>'},
      {person:'t\u00fa / vos', value_html:'<u>pued</u><span style=\"color:#475dd7\">es</span> / <u>pod</u><span style=\"color:#475dd7\">\u00e9s</span>'},
      {person:'usted, \u00e9l / ella', value_html:'<u>pued</u><span style=\"color:#475dd7\">e</span>'},
      {person:'nosotros, -as', value_html:'<u>pod</u><span style=\"color:#475dd7\">emos</span>'},
      {person:'vosotros, -as', value_html:'<u>pod</u><span style=\"color:#475dd7\">e\u00eds</span>'},
      {person:'ustedes, ellos / ellas', value_html:'<u>pued</u><span style=\"color:#475dd7\">en</span>'}
    ]
  }); renderInspectorContent(host,s); debounceSave(); };
}

async function uploadAudioFile(file){
  const fd = new FormData();
  fd.append('file', file);
  const resp = await fetch('/admin/api/media/upload', { method:'POST', body: fd });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  return data.src;
}

function wireAudioUpload(btn, onDone){
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!hiddenAudioInput) {
      hiddenAudioInput = document.createElement('input');
      hiddenAudioInput.type = 'file';
      hiddenAudioInput.accept = 'audio/*';
      hiddenAudioInput.style.display = 'none';
      document.body.appendChild(hiddenAudioInput);
    }
    hiddenAudioInput.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      btn.disabled = true;
      btn.textContent = 'Uploading...';
      try {
        const src = await uploadAudioFile(file);
        if (onDone) onDone(src);
      } catch (err) {
        alert('Upload failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Upload audio';
        hiddenAudioInput.value = '';
      }
    };
    hiddenAudioInput.click();
  });
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

function renderInspectorConjugationDrag(host, s){
  const form=document.createElement('div');
  const rows = Array.isArray(s.rows) ? s.rows : (s.rows = []);
  const bank = Array.isArray(s.bank) ? s.bank : (s.bank = []);
  form.innerHTML = `
    <label>Prompt<br><input id="cj-prompt" class="ppx-input" value="${escapeHtml(s.prompt||'Arrastrá la conjugación correcta a cada persona.')}"></label>
    <div style="margin-top:8px;"><strong>Rows</strong></div>
    <div id="cj-rows"></div>
    <button id="cj-add-row" class="ppx-pill" type="button" style="margin:6px 0;">+ Add Row</button>
    <div style="margin-top:12px;"><strong>Bank</strong></div>
    <div id="cj-bank"></div>
    <button id="cj-add-bank" class="ppx-pill" type="button" style="margin-top:6px;">+ Add Bank Item</button>
  `;
  host.appendChild(form);
  form.querySelector('#cj-prompt').addEventListener('input', e=>{ s.prompt=e.target.value; debounceSave(); });
  const rowsHost=form.querySelector('#cj-rows');
  rows.forEach((r,i)=>{
    const row=document.createElement('div'); row.className='ppx-card ppx-card--pad';
    row.innerHTML=`<label>Person<br><input data-field="person" data-idx="${i}" class="ppx-input" value="${escapeHtml(r.person||'')}"></label>
    <label>Answer (id)<br><input data-field="answer" data-idx="${i}" class="ppx-input" value="${escapeHtml(r.answer||'')}"></label>`;
    const del=makeMiniBtn('Remove', ()=>{ s.rows.splice(i,1); renderInspectorConjugationDrag(host,s); debounceSave(); });
    row.appendChild(del);
    rowsHost.appendChild(row);
  });
  rowsHost.querySelectorAll('input[data-field]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const i=+e.target.dataset.idx; const f=e.target.dataset.field;
      s.rows[i][f]=e.target.value; debounceSave();
    });
  });
  form.querySelector('#cj-add-row').addEventListener('click', ()=>{
    (s.rows=s.rows||[]).push({person:'', answer:''}); renderInspectorConjugationDrag(host,s); debounceSave();
  });
  const bankHost=form.querySelector('#cj-bank');
  bank.forEach((b,i)=>{
    const row=document.createElement('div'); row.className='ppx-card ppx-card--pad';
    row.innerHTML=`<label>ID<br><input data-field="id" data-idx="${i}" class="ppx-input" value="${escapeHtml(b.id||'')}"></label>
    <label>Label (HTML)<br><textarea data-field="label_html" data-idx="${i}" class="ppx-textarea">${b.label_html||''}</textarea></label>`;
    const del=makeMiniBtn('Remove', ()=>{ s.bank.splice(i,1); renderInspectorConjugationDrag(host,s); debounceSave(); });
    row.appendChild(del);
    bankHost.appendChild(row);
  });
  bankHost.querySelectorAll('[data-field]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const i=+e.target.dataset.idx; const f=e.target.dataset.field;
      const val = e.target.tagName === 'TEXTAREA' ? e.target.value : e.target.value;
      s.bank[i][f]=val; debounceSave();
    });
  });
  form.querySelector('#cj-add-bank').addEventListener('click', ()=>{
    (s.bank=s.bank||[]).push({id:'', label_html:''}); renderInspectorConjugationDrag(host,s); debounceSave();
  });
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
  setPreviewSrc();
}

if (btnRefresh) btnRefresh.addEventListener('click', () => setPreviewSrc());
if (btnPrevSlide) btnPrevSlide.addEventListener('click', () => goToSlide(selectedSlideIndex - 1));
if (btnNextSlide) btnNextSlide.addEventListener('click', () => goToSlide(selectedSlideIndex + 1));
if (btnSampleJson) btnSampleJson.addEventListener('click', () => openJsonModal(SAMPLE_LESSON, true));
if (btnEditJson) btnEditJson.addEventListener('click', () => openJsonModal(lesson || {}, false));
if (jsonClose) jsonClose.addEventListener('click', closeJsonModal);
if (jsonApply) jsonApply.addEventListener('click', applyJsonModal);
if (jsonFormat) jsonFormat.addEventListener('click', formatJsonModal);
if (jsonValidate) jsonValidate.addEventListener('click', validateJsonModal);

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
  if (!lesson || !msg) return;
  const slideIndex = Number(msg.index);
  if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= (lesson.slides||[]).length) return;
  const slide = lesson.slides[slideIndex];
  if (msg.type === 'lp.updateField') {
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
  } else if (msg.type === 'lp.updateElement') {
    const elIndex = Number(msg.elIndex);
    if (Array.isArray(slide.elements) && Number.isInteger(elIndex) && elIndex >= 0 && elIndex < slide.elements.length) {
      const el = slide.elements[elIndex];
      const field = msg.field || 'html';
      el[field] = msg.value || '';
    }
  } else if (msg.type === 'lp.updateConjugationRow') {
    const elIndex = Number(msg.elIndex);
    const rowIndex = Number(msg.rowIndex);
    if (Array.isArray(slide.elements) && Number.isInteger(elIndex)) {
      const el = slide.elements[elIndex];
      if (el && el.type === 'conjugation_table' && Array.isArray(el.rows) && Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < el.rows.length) {
        el.rows[rowIndex].value_html = msg.value || '';
      }
    }
  }
  goToSlide(slideIndex);
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
