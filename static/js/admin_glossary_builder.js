// Admin Glossary Builder (collapsible, bilingual)
(function(){
  const elSenses = document.getElementById('senses');
  const btnAdd = document.getElementById('add-sense');
  const form = document.getElementById('ppx-glossary-form');
  const hid = document.getElementById('senses_json');
  const btnJson = document.getElementById('btn-json-editor');
  // Infer slug from URL on edit pages: /admin/glossary/edit/<slug>
  const path = (location && location.pathname) || '';
  const m = path.match(/\/glossary\/edit\/([^/]+)/);
  const EDIT_SLUG = m ? decodeURIComponent(m[1]) : '';
  const hidAlt = document.getElementById('alt_spellings_json');
  const altTokensWrap = document.getElementById('alt-spellings-tokens');
  const altInput = document.getElementById('alt-spellings-input');
  const wordInput = form && form.querySelector('input[name="word"]');
  const duplicateNotice = document.createElement('div');
  duplicateNotice.className = 'ppx-hint';
  duplicateNotice.style.color = '#dc2626';
  duplicateNotice.style.fontSize = '.85rem';
  duplicateNotice.style.marginTop = '.25rem';
  duplicateNotice.style.lineHeight = '1.2';
  duplicateNotice.setAttribute && duplicateNotice.setAttribute('aria-live', 'polite');
  duplicateNotice.hidden = true;
  if (wordInput) wordInput.insertAdjacentElement('afterend', duplicateNotice);
  let duplicateTimer = null;
  let duplicateRequestId = 0;
  let duplicateCache = { key:'', duplicate:false };

  function collectSenseCountries(){
    const set = new Set();
    const countryInput = form && form.querySelector('input[name="country"]');
    if (countryInput && countryInput.value){
      set.add(countryInput.value.toUpperCase().trim());
    }
    Array.from(elSenses.children).forEach(card => {
      const sense = card && typeof card._get === 'function' ? card._get() : null;
      if (!sense) return;
      (sense.countries || []).forEach(c => {
        if (c && typeof c === 'string'){
          set.add(c.toUpperCase().trim());
        }
      });
    });
    return Array.from(set).filter(Boolean);
  }

  async function checkEntryDuplicate(force=false){
    if (!wordInput) return true;
    const word = (wordInput.value || '').trim();
    if (!word){
      duplicateNotice.hidden = true;
      duplicateCache.key = '';
      duplicateCache.duplicate = false;
      return true;
    }
    const countries = collectSenseCountries();
    const key = `${word.toLowerCase()}|${countries.join(',')}`;
    if (!force && duplicateCache.key === key){
      duplicateNotice.hidden = !duplicateCache.duplicate;
      return !duplicateCache.duplicate;
    }
    duplicateRequestId += 1;
    const currentId = duplicateRequestId;
    const params = new URLSearchParams();
    params.set('word', word);
    countries.forEach(c => params.append('country', c));
    if (EDIT_SLUG) params.set('exclude_slug', EDIT_SLUG);
    try{
      const response = await fetch(`/admin/api/glossary/duplicate?${params.toString()}`, { credentials:'same-origin' });
      const data = response.ok ? await response.json() : {};
      if (currentId !== duplicateRequestId) {
        return true;
      }
      const matches = Array.isArray(data.matches) ? data.matches : [];
      const duplicate = !!data.duplicate && matches.length > 0;
      duplicateCache.key = key;
      duplicateCache.duplicate = duplicate;
      const baseMsg = APP_LANG === 'en' ? 'Duplicate entry already exists' : 'Esta entrada ya existe';
      if (duplicate){
        const match = matches[0];
        const slug = match && match.slug ? match.slug : '';
        const where = countries.length ? ` for ${countries.join(', ')}` : '';
        duplicateNotice.textContent = `${baseMsg}${where}${slug ? ` (${slug})` : ''}.`;
        duplicateNotice.hidden = false;
      } else {
        duplicateNotice.hidden = true;
      }
      return !duplicate;
    }catch(_){
      duplicateNotice.hidden = true;
      return true;
    }
  }

  function scheduleDuplicateCheck(){
    clearTimeout(duplicateTimer);
    duplicateTimer = setTimeout(() => checkEntryDuplicate(), 450);
  }

  if (wordInput){
    wordInput.addEventListener('input', ()=> {
      duplicateNotice.hidden = true;
      scheduleDuplicateCheck();
    });
    wordInput.addEventListener('blur', ()=> checkEntryDuplicate());
  }
  if (elSenses && MutationObserver){
    const sensesObserver = new MutationObserver(()=> scheduleDuplicateCheck());
    sensesObserver.observe(elSenses, { childList:true, subtree:true });
  }

  const APP_LANG = (document.documentElement.getAttribute('lang')||'es').slice(0,2);
  const TAGS = (window.PPX_TAG_OPTS || {});
  const POS_ALIAS = (window.PPX_POS_ALIASES || {});
  const FALLBACK_POS = [
    { value:'adjetivo', es:'adjetivo', en:'adjective' },
    { value:'adverbio', es:'adverbio', en:'adverb' },
    { value:'conjuncion', es:'conjuncion', en:'conjunction' },
    { value:'determinante', es:'determinante', en:'determiner' },
    { value:'expresion_idiomatica', es:'expresion idiomatica', en:'idiom' },
    { value:'exclamacion', es:'exclamacion', en:'exclamation' },
    { value:'formula_social', es:'formula social', en:'social formula' },
    { value:'frase_hecha', es:'frase hecha', en:'set phrase' },
    { value:'intensificador', es:'intensificador', en:'intensifier' },
    { value:'interjeccion', es:'interjeccion', en:'interjection' },
    { value:'locucion_adjetival', es:'locucion adjetival', en:'adjectival phrase' },
    { value:'locucion_adverbial', es:'locucion adverbial', en:'adverbial phrase' },
    { value:'locucion_interjectiva', es:'locucion interjectiva', en:'interjective phrase' },
    { value:'locucion_nominal', es:'locucion nominal', en:'noun phrase' },
    { value:'locucion_preposicional', es:'locucion preposicional', en:'prepositional phrase' },
    { value:'locucion_verbal', es:'locucion verbal', en:'verbal phrase' },
    { value:'marcador_discursivo', es:'marcador discursivo', en:'discourse marker' },
    { value:'modismo', es:'modismo', en:'colloquialism' },
    { value:'muletilla', es:'muletilla', en:'filler' },
    { value:'preposicion', es:'preposicion', en:'preposition' },
    { value:'pronombre', es:'pronombre', en:'pronoun' },
    { value:'sustantivo_masculino', es:'sustantivo masculino', en:'masculine noun' },
    { value:'sustantivo_femenino', es:'sustantivo femenino', en:'feminine noun' },
    { value:'sustantivo_masculino_y_femenino', es:'sustantivo masculino y femenino', en:'masculine and feminine noun' },
    { value:'verbo_intransitivo', es:'verbo (intransitivo)', en:'verb (intransitive)' },
    { value:'verbo_pronominal_intransitivo', es:'verbo pronominal (intransitivo)', en:'pronominal verb (intransitive)' },
    { value:'verbo_pronominal_transitivo', es:'verbo pronominal (transitivo)', en:'pronominal verb (transitive)' },
    { value:'verbo_transitivo', es:'verbo (transitivo)', en:'verb (transitive)' },
    { value:'verbo_transitivo_e_intransitivo', es:'verbo (transitivo e intransitivo)', en:'verb (transitive & intransitive)' },
  ];
  const POS_CATALOG = ((Array.isArray(window.PPX_POS_CATALOG) && window.PPX_POS_CATALOG.length) ? window.PPX_POS_CATALOG : FALLBACK_POS)
    .map(entry => ({ ...entry, value: (entry.value || '').toString().toLowerCase() }));
  const DEFAULT_POS = POS_CATALOG.map(p=>p.value);
  const POS_MAP = new Map();
  POS_CATALOG.forEach(entry => POS_MAP.set(entry.value, entry));
  const CANON_POS_SET = new Set(DEFAULT_POS);
  const CANON_POS_BY_BARE = new Map();
  for (const token of DEFAULT_POS){
    const bare = token.replace(/_/g,'');
    if (!CANON_POS_BY_BARE.has(bare)) CANON_POS_BY_BARE.set(bare, token);
  }
  const POS_ALIAS_MAP = new Map();
  Object.entries(POS_ALIAS || {}).forEach(([alias, canonical]) => {
    const k = canonToken(alias);
    const v = canonToken(canonical);
    if (k && v && CANON_POS_SET.has(v)) {
      POS_ALIAS_MAP.set(k, v);
    }
  });
  function normalizeToCanonical(token){
    if (!token) return null;
    const key = canonToken(token);
    if (!key) return null;
    if (CANON_POS_SET.has(key)) return key;
    if (POS_ALIAS_MAP.has(key)) return POS_ALIAS_MAP.get(key);
    const bare = key.replace(/_/g,'');
    if (CANON_POS_BY_BARE.has(bare)) return CANON_POS_BY_BARE.get(bare);
    return key;
  }
function labelForPos(val){
  const key = normalizeToCanonical(val) || canonToken(val);
  const found = POS_MAP.get(key);
  if (found) return APP_LANG === 'en' ? found.en : found.es;
  const pretty = (val||'').toString().replace(/_/g,' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}
const LABELS = (window.PPX_LABELS || {});

  function normOpts(arr){
    return (arr||[]).map(o => typeof o === 'string' ? ({value:o, label:o}) : ({value:o.value, label:o.label}));
  }

  function h(tag, attrs={}, children=[]) {
    const el = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs||{})) {
      if (k === 'class') el.className = v; else if (k==='html') el.innerHTML=v; else el.setAttribute(k, v);
    }
    for (const ch of (children||[])) el.appendChild(ch);
    return el;
  }

  function select(name, opts, val, extra) {
    const allowFallback = extra && extra.allowFallback !== false;
    const legacyLabel = extra && extra.legacyLabel;
    const s = h('select', {name, class:'ppx-select', style:'padding:.5rem; border:1px solid #e5e7eb; border-radius:8px;'});
    const list = normOpts(opts);
    let matched = false;
    for (const o of list) {
      const opt = h('option');
      opt.value = o.value;
      opt.textContent = o.label;
      if (o.value === val) { opt.selected = true; matched = true; }
      s.appendChild(opt);
    }
    // If the desired value isn't in the option list (e.g., cached/legacy token), preserve it to avoid defaulting to the first option.
    if (val && !matched) {
      if (allowFallback) {
        const opt = h('option');
        opt.value = val;
        opt.textContent = legacyLabel || val;
        opt.selected = true;
        s.appendChild(opt);
      } else if (legacyLabel) {
        const opt = h('option');
        opt.value = val;
        opt.textContent = legacyLabel;
        opt.selected = true;
        s.appendChild(opt);
      }
    }
    return s;
  }

  function chipMulti(name, opts, vals) {
    const wrap = h('div', {style:'display:flex; flex-wrap:wrap; gap:.35rem;'});
    const list = normOpts(opts).filter(o => (o.value || '') !== '');
    for (const o of list) {
      const lab = h('label', {class:'gl-chip'});
      const cb = h('input', {type:'checkbox', value:o.value}); if ((vals||[]).includes(o.value)) cb.checked=true; lab.appendChild(cb); lab.appendChild(h('span',{html:o.label}));
      wrap.appendChild(lab);
    }
    wrap._get = () => Array.from(wrap.querySelectorAll('input[type=checkbox]:checked')).map(i=>i.value);
    return wrap;
  }

  // Cache the last source data per type so new example rows can be prefilled
  const SourceCache = (function(){
    const KEY = 'ppx_gl_source_cache';
    let cache = { types:{}, _lastType:'' };
    try{
      const raw = (window.localStorage && localStorage.getItem(KEY)) || '';
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') cache = Object.assign({types:{}, _lastType:''}, parsed);
      }
    }catch(_){ cache = { types:{}, _lastType:'' }; }
    function persist(){
      try{
        if (window.localStorage) localStorage.setItem(KEY, JSON.stringify(cache));
      }catch(_){ /* ignore */ }
    }
    function remember(type, data){
      if (!type || !data) return;
      const store = cache.types[type] = cache.types[type] || {};
      Object.entries(data||{}).forEach(([k,v])=>{
        if (!v || k === 'type') return;
        const arr = store[k] = store[k] || [];
        if (!arr.includes(v)) arr.push(v);
      });
      cache._lastType = type;
      persist();
    }
    function get(type){
      if (!type || !cache.types || !cache.types[type]) return null;
      const obj = {};
      Object.entries(cache.types[type]||{}).forEach(([k,arr])=>{
        if (Array.isArray(arr) && arr.length) obj[k] = arr[arr.length-1];
      });
      return obj;
    }
    function suggestions(type, key){
      if (!cache.types || !type || !key) return [];
      const arr = (cache.types[type] && cache.types[type][key]) || [];
      return Array.isArray(arr) ? arr : [];
    }
    function lastType(){
      return cache._lastType || '';
    }
    return { remember, get, lastType, suggestions };
  })();

  // Normalize tokens to the same canonical form the backend expects
  function canonToken(v){
    try{
      return (v || '')
        .toString()
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'') // strip diacritics
        .replace(/[^a-z0-9_ ]/g,'_')
        .replace(/[\\s]+/g,'_')
        .replace(/_+/g,'_')
        .replace(/^_+|_+$/g,'');
    }catch(_){ return (v || ''); }
  }

  // -----------------------------
  // Inject Entry Audio uploader (DOM)
  // -----------------------------
  (function initEntryAudioUpload(){
    if (!form) return;
    if (document.getElementById('entry_audio_upload')) return; // already present
    // Find the first details card (Entry section)
    const firstDetails = form.querySelector('details.ppx-card');
    if (!firstDetails) return;
    const summary = firstDetails.querySelector('summary');
    if (!summary) return;

    const row = h('div', {style:'display:flex; gap:.75rem; align-items:center; margin:.5rem 0 .25rem 0;'});
    const wrap = h('label', {class:'ppx-field', style:'min-width:300px;'});
    wrap.appendChild(h('div',{html: (window.PPX_LABELS && (window.PPX_LABELS.entry_audio||'')) || 'Entry audio'}));
    const hidden = form.querySelector('#entry_audio') || h('input',{type:'hidden', id:'entry_audio', name:'entry_audio'});
    if (!hidden.parentNode) form.appendChild(hidden);
    const file = h('input',{type:'file', id:'entry_audio_file', accept:'audio/*', class:'ppx-input', style:'padding:.4rem;'});
    const btn = h('button',{type:'button', id:'entry_audio_upload', class:'ppx-btn'}, [document.createTextNode('Upload')]);
    const info = h('div',{style:'margin-top:.25rem; color:#64748b; font-size:.85rem;'});
    function renderInfo(){
      const p = (hidden.value||'').trim();
      if (p){ info.innerHTML = `Current: <code>${p}</code> `; }
      else { info.textContent = ''; }
    }
    if (!EDIT_SLUG) btn.disabled = true;
    const ctrls = h('div',{style:'display:flex; gap:.35rem; align-items:center;'});
    ctrls.appendChild(file); ctrls.appendChild(btn);
    wrap.appendChild(ctrls);
    wrap.appendChild(info);
    row.appendChild(wrap);
    summary.insertAdjacentElement('afterend', row);
    renderInfo();

    btn.addEventListener('click', async ()=>{
      if (!EDIT_SLUG) return;
      const f = file.files && file.files[0];
      if (!f){ alert('Select an audio file first'); return; }
      const fd = new FormData();
      fd.append('file', f);
      fd.append('kind','entry');
      try{
        const res = await fetch(`/admin/glossary/${encodeURIComponent(EDIT_SLUG)}/upload-audio`, {
          method:'POST',
          body: fd,
          credentials: 'same-origin'
        });
        let data = {};
        try { data = await res.json(); } catch(_) {}
        if (!res.ok || !data.ok){
          const msg = (data && (data.error || data.detail)) || `HTTP ${res.status}`;
          alert('Upload failed: ' + msg);
          return;
        }
        hidden.value = data.url || data.path || '';
        btn.textContent = 'Uploaded';
        setTimeout(()=> btn.textContent = 'Upload', 1500);
        renderInfo();
      }catch(e){ alert('Upload error'); }
    });
    // Replace logic: any subsequent upload overwrites hidden; to remove, clear hidden
    const removeBtn = h('button',{type:'button', class:'ppx-btn ppx-btn--subtle'},[document.createTextNode('Remove')]);
    removeBtn.addEventListener('click', ()=>{ hidden.value=''; renderInfo(); });
    ctrls.appendChild(removeBtn);
  })();

  // Alt spellings chips (entry-level)
  const AltSpellings = (function(){
    const set = new Set();
    function sync(){
      try{
        if (hidAlt) hidAlt.value = JSON.stringify(Array.from(set));
        if (EDIT_SLUG && window.localStorage){ localStorage.setItem('ppx_gl_alt_'+EDIT_SLUG, hidAlt ? (hidAlt.value||'') : JSON.stringify(Array.from(set))); }
      }catch(_){ /* ignore */ }
    }
    function render(){
      if (!altTokensWrap) return;
      altTokensWrap.innerHTML='';
      Array.from(set).forEach(v=>{
        const chip = h('span',{class:'gl-chip'},[document.createTextNode(v)]);
        const x = h('button',{type:'button', class:'ppx-btn ppx-btn--sm', style:'margin-left:.25rem;'},[document.createTextNode('x')]);
        x.addEventListener('click', ()=>{ set.delete(v); render(); sync(); });
        const wrap = h('span'); wrap.appendChild(chip); wrap.appendChild(x); altTokensWrap.appendChild(wrap);
      });
    }
    function add(v){ const s=(v||'').trim(); if(!s) return; set.add(s); render(); sync(); }
    function init(prefill){
      // Prefer hidden (unsaved) state or localStorage, then prefill
      let start = prefill||[];
      try{
        const hidVal = (hidAlt && hidAlt.value) ? JSON.parse(hidAlt.value) : null;
        const cache = (EDIT_SLUG && localStorage && localStorage.getItem('ppx_gl_alt_'+EDIT_SLUG)) ? JSON.parse(localStorage.getItem('ppx_gl_alt_'+EDIT_SLUG)) : null;
        if (Array.isArray(hidVal) && hidVal.length) start = hidVal;
        else if (Array.isArray(cache) && cache.length) start = cache;
      }catch(_){ /* ignore */ }
      (start||[]).forEach(add);
      if (altInput){
        altInput.addEventListener('keydown', (e)=>{
          if (e.key === 'Enter' || e.key === ','){
            e.preventDefault(); add(altInput.value); altInput.value='';
          }
        });
        altInput.addEventListener('blur', ()=>{ add(altInput.value); altInput.value=''; });
      }
      // If DOM is mutated or tokens cleared by accident, re-render from set
      document.addEventListener('click', ()=>{ if (altTokensWrap && altTokensWrap.childNodes.length===0 && set.size>0) render(); }, true);
      // Observe chip container for unexpected removals
      try{
        if (altTokensWrap){
          const mo = new MutationObserver(()=>{
            if (altTokensWrap.childNodes.length===0 && set.size>0) render();
          });
          mo.observe(altTokensWrap, { childList: true });
        }
        const entryDetails = form && form.querySelector('details.ppx-card');
        if (entryDetails){
          entryDetails.addEventListener('toggle', ()=> render());
          const mo2 = new MutationObserver(()=>{
            const wrap = document.getElementById('alt-spellings-tokens');
            if (wrap && wrap.childNodes.length===0 && set.size>0) render();
          });
          mo2.observe(entryDetails, { childList:true, subtree:true });
        }
      }catch(_){ }
      render();
    }
    function get(){ return Array.from(set); }
    function setAll(arr){ set.clear(); (arr||[]).forEach(add); sync(); }
    return { init, get, set: setAll };
  })();

  // Minimal rich-text editor (bold/italic)
  function makeRTE(value){
    const wrap = h('div',{class:'ppx-rte'});
    const bar = h('div',{class:'ppx-rte-bar'});
    const b = h('button',{type:'button', class:'ppx-btn'},[document.createTextNode('Bold')]);
    b.style.fontWeight = '700';
    const i = h('button',{type:'button', class:'ppx-btn'},[document.createTextNode('Italic')]);
    i.style.fontStyle = 'italic';
    const area = h('div',{class:'ppx-rte-area', contenteditable:'true'});
    area.innerHTML = value || '';
    function exec(cmd){ area.focus(); document.execCommand(cmd,false,null); }
    b.addEventListener('click', ()=> exec('bold'));
    i.addEventListener('click', ()=> exec('italic'));
    bar.appendChild(b); bar.appendChild(i);
    wrap.appendChild(bar); wrap.appendChild(area);
    wrap._get = ()=> (area.innerHTML || '').trim();

    function inArea(){
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const node = sel.anchorNode;
      return !!(node && (node === area || area.contains(node)));
    }
    function updateState(){
      if (!inArea()){ b.classList.remove('is-on'); i.classList.remove('is-on'); return; }
      try{
        if (document.queryCommandState('bold')) b.classList.add('is-on'); else b.classList.remove('is-on');
        if (document.queryCommandState('italic')) i.classList.add('is-on'); else i.classList.remove('is-on');
      }catch(e){ /* no-op */ }
    }
    ['keyup','mouseup','input','focus'].forEach(ev=> area.addEventListener(ev, updateState));
    document.addEventListener('selectionchange', updateState);
    // Initialize state
    setTimeout(updateState, 0);
    return wrap;
  }

  function exampleRow(ex){
    const row = h('div', {class:'ppx-card', style:'padding:.75rem;'});
    const es = h('textarea',{placeholder:'ES', style:'width:100%; padding:.4rem; border:1px solid #e5e7eb; border-radius:8px;'}); es.value = ex?.es||'';
    const en = h('textarea',{placeholder:'EN', style:'width:100%; padding:.4rem; border:1px solid #e5e7eb; border-radius:8px; margin-top:.35rem;'}); en.value = ex?.en||'';
    const file = h('input',{type:'file', accept:'audio/*', style:'margin-top:.35rem;', class:'ppx-ex-audio-file'});
    const audioPath = h('input',{type:'hidden', class:'ppx-ex-audio-path'}); audioPath.value = ex?.audio || '';
    const audioInfo = h('div',{style:'margin-top:.25rem; color:#64748b; font-size:.85rem;'});
    function renderAudioInfo(){ const p=(audioPath.value||'').trim(); audioInfo.innerHTML = p? `Current: <code>${p}</code>` : ''; }
    renderAudioInfo();
    // Keep the type the user last chose, but don't auto-fill other fields.
    const lastType = ex?.source?.type || SourceCache.lastType() || '';
    const sourceType = select('source_type', [
      {value:'', label:'-'},
      {value:'movie', label:'Movie'},
      {value:'series', label:'Series'},
      {value:'song', label:'Song'},
      {value:'social', label:'Social Media'},
      {value:'book', label:'Book'},
      {value:'other', label:'Other'},
    ], lastType);
    sourceType.style.marginTop = '.35rem';

    // One-column layout for source metadata; constrain width so it stays inside the card
    const sourceFields = h('div', {style:'display:grid; grid-template-columns: 1fr; gap:.5rem; margin-top:.35rem; align-items:start; justify-items:stretch; max-width:640px; width:100%;'});
    let currentType = sourceType.value || '';
    let rowSourceCache = (ex?.source && ex.source.type) ? {...ex.source} : null;
    function renderSource(type, src){
      sourceFields.innerHTML='';
      if (!type) return;
      const mk = (label,key,val='')=>{
        const i=h('input',{type:'text', 'data-key':key, placeholder:label, value:val, style:'width:100%; padding:.4rem; border:1px solid #e5e7eb; border-radius:8px;'});
        const listId = `sc-${type}-${key}`;
        i.setAttribute('list', listId);
        const dl = h('datalist',{id:listId});
        (SourceCache.suggestions(type, key)||[]).forEach(v=> dl.appendChild(h('option',{value:v})));
        const wrap = h('div');
        wrap.appendChild(i);
        wrap.appendChild(dl);
        sourceFields.appendChild(wrap);
        return i;
      };
      if (type==='movie'){
        sourceFields.appendChild(mk('Title','title', src?.title||''));
        sourceFields.appendChild(mk('Year','year', src?.year||''));
      } else if (type==='series'){
        sourceFields.appendChild(mk('Title','title', src?.title||''));
        sourceFields.appendChild(mk('Season','season', src?.season||''));
        sourceFields.appendChild(mk('Episode','episode', src?.episode||''));
        sourceFields.appendChild(mk('Year','year', src?.year||''));
      } else if (type==='song'){
        sourceFields.appendChild(mk('Artist','artist', src?.artist||''));
        sourceFields.appendChild(mk('Song title','song_title', src?.song_title || src?.title || ''));
      } else if (type==='social'){
        sourceFields.appendChild(mk('Platform','platform', src?.platform||''));
        sourceFields.appendChild(mk('Post URL','post_url', src?.post_url || src?.url || ''));
        sourceFields.appendChild(mk('Username','username', src?.username||''));
        sourceFields.appendChild(mk('Profile URL','profile_url', src?.profile_url || src?.profile || ''));
      } else if (type==='book'){
        sourceFields.appendChild(mk('Author','author', src?.author||''));
        sourceFields.appendChild(mk('Book title','book_title', src?.book_title || src?.title || ''));
      } else if (type==='other'){
        sourceFields.appendChild(mk('Label (<= 20 chars)','label', src?.label||''));
      }
    }
    // Pre-fill existing source data when editing, otherwise leave empty (only suggestions in datalist).
    renderSource(currentType, (rowSourceCache && rowSourceCache.type === currentType) ? rowSourceCache : (ex?.source && ex.source.type ? ex.source : null));

    function collectSource(typeOverride){
      const type = typeOverride || sourceType.value;
      if (!type) return null;
      const payload = { type };
      sourceFields.querySelectorAll('input[data-key]').forEach(inp=>{
        const k = inp.getAttribute('data-key');
        const v = (inp.value||'').trim();
        if (v) payload[k] = v;
      });
      return payload;
    }
    function persistSource(){
      const cur = collectSource(currentType || sourceType.value);
      if (cur){ rowSourceCache = cur; SourceCache.remember(cur.type, cur); }
    }

    sourceType.addEventListener('change', ()=>{
      // Save what was typed for the previous type before swapping fields
      persistSource();
      currentType = sourceType.value || '';
      renderSource(currentType, (rowSourceCache && rowSourceCache.type === currentType) ? rowSourceCache : null);
    });
    sourceFields.addEventListener('input', ()=> persistSource(), true);
    sourceFields.addEventListener('blur', ()=> persistSource(), true);

    const del = h('button',{type:'button', class:'ppx-btn', style:'margin-top:.35rem;'}, [document.createTextNode('Eliminar')]);
    del.addEventListener('click', ()=> row.remove());
    row.appendChild(es); row.appendChild(en); row.appendChild(file); row.appendChild(audioPath); row.appendChild(audioInfo); row.appendChild(sourceType); row.appendChild(sourceFields); row.appendChild(del);
    row._get = ()=> {
      const source = collectSource() || null;
      if (source) SourceCache.remember(source.type, source);
      return { es: es.value.trim(), en: en.value.trim()||null, audio: (audioPath.value||null), source };
    };
    return row;
  }

  // Alternate forms row (per-sense)
  function altFormRow(af){
    const row = h('div',{class:'ppx-card', style:'padding:.5rem; display:grid; grid-template-columns: 1fr 180px; gap:.5rem; align-items:start;'});
    const formInput = h('input',{type:'text', placeholder:(LABELS.alt_form_ph||'form'), value: af?.form||'', class:'ppx-input', style:'padding:.35rem; border:1px solid #e5e7eb; border-radius:8px;'});
    const typeOpts = (window.PPX_ALT_OPTS && window.PPX_ALT_OPTS.alt_type) ? window.PPX_ALT_OPTS.alt_type : [
      {value:'diminutivo', label:'diminutivo'},
      {value:'aumentativo', label:'aumentativo'},
      {value:'variante_ortográfica', label:'variante_ortográfica'},
      {value:'variante_regional', label:'variante_regional'}
    ];
    const typeSel = select('alt_type', typeOpts, af?.type||'diminutivo');
    const regions = h('input',{type:'text', placeholder:(LABELS.alt_regions_ph||'regions (comma-separated)'), value: (af?.regions||[]).join(', '), class:'ppx-input', style:'padding:.35rem; border:1px solid #e5e7eb; border-radius:8px;'});
    const noteES = h('textarea',{placeholder:(LABELS.alt_note_es_ph||'Nota (ES)'), class:'ppx-textarea', style:'min-height:40px; padding:.35rem; border:1px solid #e5e7eb; border-radius:8px;'}); noteES.value = af?.note_es||'';
    const noteEN = h('textarea',{placeholder:(LABELS.alt_note_en_ph||'Note (EN)'), class:'ppx-textarea', style:'min-height:40px; padding:.35rem; border:1px solid #e5e7eb; border-radius:8px;'}); noteEN.value = af?.note_en||'';
    const audio = h('input',{type:'text', placeholder:(LABELS.alt_audio_ph||'audio URL (optional)'), value: af?.audio||'', class:'ppx-input', style:'padding:.35rem; border:1px solid #e5e7eb; border-radius:8px;'});
    const rel = h('input',{type:'text', placeholder:(LABELS.alt_related_slug_ph||'related slug (optional)'), value: af?.related_slug||'', class:'ppx-input', style:'padding:.35rem; border:1px solid #e5e7eb; border-radius:8px;'});
    const del = h('button',{type:'button', class:'ppx-btn', style:'justify-self:start;'},[document.createTextNode('Eliminar')]);
    del.addEventListener('click', ()=> row.remove());
    row.appendChild(formInput); row.appendChild(typeSel);
    row.appendChild(regions); row.appendChild(audio);
    row.appendChild(noteES); row.appendChild(noteEN);
    row.appendChild(rel); row.appendChild(del);
    row._get = ()=> ({
      form: formInput.value.trim(),
      type: typeSel.value,
      regions: (regions.value||'').split(',').map(s=>s.trim()).filter(Boolean),
      note_es: noteES.value.trim()||null,
      note_en: noteEN.value.trim()||null,
      audio: audio.value.trim()||null,
      related_slug: rel.value.trim()||null,
    });
    return row;
  }

  function senseCard(data, idx){
    const card = h('details', {open:true, class:'ppx-card', style:'padding:1rem;'});
    const lang = (document.documentElement.getAttribute('lang')||'es').slice(0,2);
    const title = (LABELS.sense || (lang==='en'?'Sense':'Sentido')) + ' ' + (idx||'');
    card.appendChild(h('summary',{html:title, style:'cursor:pointer; font-weight:700;'}));

    // Build POS options from curated list; append any backend extras (humanized) without overriding curated labels.
    const backendPos = Array.isArray(TAGS.pos) ? TAGS.pos : [];
    const curatedMap = new Map();
    POS_CATALOG.forEach(p => curatedMap.set(canonToken(p.value), { value: canonToken(p.value), label: labelForPos(p.value) }));
    backendPos.forEach(it => {
      const raw = typeof it === 'string' ? it : (it && it.value);
      const normalized = normalizeToCanonical(raw) || canonToken(raw || '');
      const val = normalized || '';
      // Do not re-add generic sustantivo from backend config
      if (!val || val === 'sustantivo' || curatedMap.has(val)) return;
      const pretty = (typeof it === 'string' ? it : (it && (it.label || it.value || ''))).toString().replace(/_/g,' ');
      const lbl = pretty ? (pretty.charAt(0).toUpperCase() + pretty.slice(1)) : val;
      curatedMap.set(val, { value: val, label: lbl });
    });
    // Remove generic 'sustantivo' from the dropdown options (legacy only via fallback)
    curatedMap.delete('sustantivo');
    const posOpts = Array.from(curatedMap.values()).sort((a,b)=> a.label.localeCompare(b.label,'es'));
    let posVal = normalizeToCanonical(data?.pos) || 'sustantivo_masculino_y_femenino';
    // Map legacy generic verb token to transitive; honor explicit combined subtype
    let normalizedPosVal = (posVal === 'verbo') ? 'verbo_transitivo' : posVal;
    // If legacy generic noun, default to the inclusive noun option
    if (normalizedPosVal === 'sustantivo') normalizedPosVal = 'sustantivo_masculino_y_femenino';
    const pos = select('pos', posOpts, normalizedPosVal, { allowFallback: false });
    const reg = select('register', [{value:'', label:'-'}, ...(TAGS.register||[])], data?.register||'');
    const freq = select('freq', [{value:'', label:'-'}, ...(TAGS.freq||[])], data?.freq||'');
    const status = chipMulti('status', TAGS.status || [], Array.isArray(data?.status) ? data.status : (data?.status ? [data.status] : []));
    const sens = chipMulti('sensitivity', TAGS.sensitivity || [], Array.isArray(data?.sensitivity) ? data.sensitivity : (data?.sensitivity ? [data.sensitivity] : []));
    const dom = chipMulti('domain', TAGS.domain || [], data?.domain||[]);
    const tone = chipMulti('tone', TAGS.tone || [], data?.tone||[]);

    const defes = makeRTE(data?.definition_es||'');
    const defen = makeRTE(data?.definition_en||'');
    const eqen = h('input',{type:'text', class:'ppx-input', style:'padding:.5rem; border:1px solid #e5e7eb; border-radius:8px;', placeholder:(LABELS.eq_en_ph||'e.g., closet, trunk'), value: (Array.isArray(data?.equivalents_en)? data.equivalents_en.join(', ') : '')});
    // Variants (sense-level) for noun/adjective POS
    const variants = Object.assign({
      masc_sg: null, masc_pl: null, fem_sg: null, fem_pl: null, augmentative: null, diminutive: null
    }, data?.variants || {});
    const variantsWrap = h('div',{style:'display:flex; flex-direction:column; gap:.35rem; padding:.5rem; border:1px dashed #e2e8f0; border-radius:8px; background:#f8fafc;'});
    const variantsGrid = h('div',{style:'display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:.5rem;'});
    const vInputs = {
      masc_sg: h('input',{type:'text', class:'ppx-input', placeholder:(LABELS.var_masc_sg||'Masculino (singular)'), value: variants.masc_sg||''}),
      masc_pl: h('input',{type:'text', class:'ppx-input', placeholder:(LABELS.var_masc_pl||'Masculino (plural)'), value: variants.masc_pl||''}),
      fem_sg: h('input',{type:'text', class:'ppx-input', placeholder:(LABELS.var_fem_sg||'Femenino (singular)'), value: variants.fem_sg||''}),
      fem_pl: h('input',{type:'text', class:'ppx-input', placeholder:(LABELS.var_fem_pl||'Femenino (plural)'), value: variants.fem_pl||''}),
      augmentative: h('input',{type:'text', class:'ppx-input', placeholder:(LABELS.var_aug||'Aumentativo'), value: variants.augmentative||''}),
      diminutive: h('input',{type:'text', class:'ppx-input', placeholder:(LABELS.var_dim||'Diminutivo'), value: variants.diminutive||''}),
    };
    Object.values(vInputs).forEach(inp=> variantsGrid.appendChild(inp));
    variantsWrap.appendChild(h('div',{style:'font-weight:600;'}, [document.createTextNode(LABELS.variants || 'Variantes')]));
    variantsWrap.appendChild(h('div',{style:'font-size:.9rem; color:#475569;'}, [document.createTextNode(LABELS.variants_hint || 'Opcional. Se muestra por sentido para sustantivos/adjetivos.')]));
    variantsWrap.appendChild(variantsGrid);
    function isNounAdj(posTok){
      const k = (posTok || '').toString().toLowerCase();
      return k.includes('sustantivo') || k.includes('adjetiv');
    }
    function selectedPosToken(select){
      const opt = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
      const candidate = (opt && opt.value) ? opt.value : (select.value || '');
      if (candidate && candidate !== '') {
        return candidate;
      }
      if (opt){
        return canonToken(opt.textContent || '');
      }
      return '';
    }
    function currentPosVal(){
      const opt = pos.options && pos.selectedIndex >= 0 ? pos.options[pos.selectedIndex] : null;
      const raw = selectedPosToken(pos);
      const canonical = normalizeToCanonical(raw) || canonToken(raw || '');
      return {
        val: canonical,
        label: (opt ? (opt.textContent || '') : '')
      };
    }
    function updateVariantsVisibility(){
      const { val, label } = currentPosVal();
      const show = isNounAdj(val) || isNounAdj(label);
      variantsWrap.style.display = show ? 'flex' : 'none';
    }
    // Ensure variants visibility updates immediately and after render
    updateVariantsVisibility();
    setTimeout(updateVariantsVisibility, 0);
    setTimeout(updateVariantsVisibility, 100);
    pos.addEventListener('change', updateVariantsVisibility);
    pos.addEventListener('input', updateVariantsVisibility);

    // Related entries (tokens + typeahead)
    const relatedWrap = h('div');
    const relatedTokens = h('div',{style:'display:flex; flex-wrap:wrap; gap:.35rem;'});
    const relatedInput = h('input',{type:'text', placeholder:(LABELS.related_section||'Related entries'), style:'width:100%; padding:.5rem; border:1px solid #e5e7eb; border-radius:8px;'});
    const relSet = new Set((data?.related_slugs||[]));
    function renderTokens(){
      relatedTokens.innerHTML='';
      for (const s of relSet){
        const chip = h('span',{class:'gl-chip'},[document.createTextNode(s)]);
        const x = h('button',{type:'button', class:'ppx-btn ppx-btn--sm', style:'margin-left:.25rem;'},[document.createTextNode('x')]);
        x.addEventListener('click', ()=>{ relSet.delete(s); renderTokens(); });
        const wrap = h('span'); wrap.appendChild(chip); wrap.appendChild(x); relatedTokens.appendChild(wrap);
      }
    }
    renderTokens();
    async function searchRelated(q){
      if (!q || q.length < 2) return [];
      try{
        const url = `/admin/api/glossary/list?q=${encodeURIComponent(q)}`;
        const r = await fetch(url, { credentials: 'same-origin' });
        if (!r.ok) return [];
        const data = await r.json().catch(()=>null);
        if (!data || !Array.isArray(data.items)) return [];
        return data.items;
      }catch(e){ return []; }
    }
    const dropdown = h('div',{style:'position:relative;'});
    // Suggestion popup is portaled to <body> to avoid clipping by parents
    const sugg = h('div',{style:'position:fixed; z-index:99999; background:#fff; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,.08); max-height:220px; overflow-y:auto; display:none;'});
    document.body.appendChild(sugg);

    function positionSugg(){
      if (sugg.style.display === 'none') return;
      const rect = relatedInput.getBoundingClientRect();
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom);
      const spaceAbove = Math.max(0, rect.top);
      const needUp = spaceBelow < 180 && spaceAbove > spaceBelow; // prefer drop-up when space below is tight
      const left = rect.left;      // fixed coords are viewport-based
      const width = rect.width;
      let top;
      if (needUp){
        top = rect.top - 4;        // place above input
        sugg.style.transform = `translateY(-100%)`;
      } else {
        top = rect.bottom + 4;     // place below input
        sugg.style.transform = `translateY(0)`;
      }
      sugg.style.left = `${left}px`;
      sugg.style.top = `${top}px`;
      sugg.style.width = `${width}px`;
    }

    function hideSugg(){ sugg.style.display='none'; }

    relatedInput.addEventListener('focus', positionSugg);
    window.addEventListener('resize', positionSugg);
    window.addEventListener('scroll', positionSugg, true);
    document.addEventListener('click', (e)=>{
      if (e.target !== relatedInput && !sugg.contains(e.target)) hideSugg();
    });

    relatedInput.addEventListener('input', async ()=>{
      const q = relatedInput.value.trim();
      const items = await searchRelated(q);
      if (!items.length){ hideSugg(); sugg.innerHTML=''; return; }
      sugg.innerHTML = items.slice(0,8).map(it=>`<div data-slug="${it.slug}" style="padding:.35rem .5rem; cursor:pointer;">${it.word} <small style="opacity:.6">(${it.slug})</small></div>`).join('');
      sugg.style.display='block';
      positionSugg();
      sugg.querySelectorAll('[data-slug]').forEach(el=>{
        el.addEventListener('click', ()=>{ relSet.add(el.getAttribute('data-slug')); renderTokens(); relatedInput.value=''; hideSugg(); });
      });
    });
    dropdown.appendChild(relatedInput);
    relatedWrap.appendChild(relatedTokens); relatedWrap.appendChild(dropdown);

    const exWrap = h('div',{style:'display:flex; flex-direction:column; gap:.35rem;'});
    (data?.examples||[]).forEach(e=> exWrap.appendChild(exampleRow(e)));
    const addEx = h('button',{type:'button', class:'ppx-btn', style:'margin-top:.35rem;'}, [document.createTextNode('Agregar ejemplo')]);
    addEx.addEventListener('click', ()=> exWrap.appendChild(exampleRow({})));

    const delSense = h('button',{type:'button', class:'ppx-btn', style:'margin-top:.5rem; background:#fee2e2;'}, [document.createTextNode('Eliminar sentido')]);
    delSense.addEventListener('click', ()=> card.remove());

    const lab = (txt, node)=> { const L=h('label'); L.appendChild(h('div',{html:txt})); L.appendChild(node); return L; };

    // Section: POS/Tags
    const secTags = h('details',{open:true, class:'ppx-card', style:'padding:.75rem; margin-top:.5rem;'});
    secTags.appendChild(h('summary',{html: LABELS.tags_section || 'Part of Speech and Tags', style:'cursor:pointer; font-weight:600;'}));
    const tagsBody = h('div',{style:'display:flex; flex-direction:column; gap:.5rem; margin-top:.5rem;'});
    tagsBody.appendChild(lab(LABELS.pos || 'Part of Speech', pos));
    tagsBody.appendChild(variantsWrap);
    tagsBody.appendChild(lab(LABELS.register || 'Register', reg));
    tagsBody.appendChild(lab(LABELS.frequency || 'Frequency', freq));
    tagsBody.appendChild(lab(LABELS.status || 'Status', status));
    tagsBody.appendChild(lab(LABELS.sensitivity || 'Sensitivity', sens));
    const rowChips = h('div',{style:'display:flex; gap:.75rem; align-items:flex-start; flex-wrap:wrap;'});
    rowChips.appendChild(lab(LABELS.domains || 'Domains', dom));
    rowChips.appendChild(lab(LABELS.tone || 'Tone', tone));
    tagsBody.appendChild(rowChips);
    secTags.appendChild(tagsBody);

    // Section: Definitions (EN first, then ES)
    const secDefs = h('details',{open:true, class:'ppx-card', style:'padding:.75rem; margin-top:.5rem;'});
    secDefs.appendChild(h('summary',{html: LABELS.defs_section || 'Definitions', style:'cursor:pointer; font-weight:600;'}));
    const defsBody = h('div',{style:'display:flex; flex-direction:column; gap:.5rem; margin-top:.5rem;'});
    defsBody.appendChild(lab(LABELS.def_en || 'Definition (EN)', defen));
    defsBody.appendChild(lab(LABELS.def_es || 'Definition (ES)', defes));
    defsBody.appendChild(lab(LABELS.eq_en || 'American English equivalents (comma-separated)', eqen));
    secDefs.appendChild(defsBody);

    // Section: Related entries
    const secRel = h('details',{open:false, class:'ppx-card', style:'padding:.75rem; margin-top:.5rem;'});
    secRel.appendChild(h('summary',{html: LABELS.related_section || 'Related entries', style:'cursor:pointer; font-weight:600;'}));
    const relBody = h('div',{style:'display:flex; flex-direction:column; gap:.5rem; margin-top:.5rem;'});
    relBody.appendChild(relatedWrap);
    secRel.appendChild(relBody);

    // Section: Examples
    const secEx = h('details',{open:false, class:'ppx-card', style:'padding:.75rem; margin-top:.5rem;'});
    secEx.appendChild(h('summary',{html: LABELS.examples_section || 'Examples', style:'cursor:pointer; font-weight:600;'}));
    const exBody = h('div',{style:'display:flex; flex-direction:column; gap:.5rem; margin-top:.5rem;'});
    exBody.appendChild(exWrap); exBody.appendChild(addEx);
    secEx.appendChild(exBody);

    // Section: Alternate forms and spellings
    const secAlt = h('details',{open:false, class:'ppx-card', style:'padding:.75rem; margin-top:.5rem;'});
    secAlt.appendChild(h('summary',{html: LABELS.alt_section || 'Formas y variantes', style:'cursor:pointer; font-weight:600;'}));
    const altBody = h('div',{style:'display:flex; flex-direction:column; gap:.5rem; margin-top:.5rem;'});
    const altWrap = h('div',{style:'display:flex; flex-direction:column; gap:.35rem;'});
    (data?.alt_forms||[]).forEach(af=> altWrap.appendChild(altFormRow(af)));
    const addAlt = h('button',{type:'button', class:'ppx-btn', style:'margin-top:.35rem;'}, [document.createTextNode(LABELS.alt_add || 'Agregar forma')]);
    addAlt.addEventListener('click', ()=> altWrap.appendChild(altFormRow({})));
    altBody.appendChild(altWrap); altBody.appendChild(addAlt);
    secAlt.appendChild(altBody);

    card.appendChild(secTags);
    card.appendChild(secDefs);
    card.appendChild(secRel);
    card.appendChild(secAlt);
    card.appendChild(secEx);
    card.appendChild(delSense);

    card._get = ()=> {
      const selectedPos = selectedPosToken(pos) || 'sustantivo_masculino_y_femenino';
      const fallback = (selectedPos === 'verbo') ? 'verbo_transitivo' : selectedPos;
      const canonical = normalizeToCanonical(fallback) || normalizeToCanonical(canonToken(fallback)) || 'sustantivo_masculino_y_femenino';
      const normalizedPosToken = canonical; 
      return {
        id: data?.id || '',
        countries: Array.isArray(data?.countries)? data.countries : [],
          pos: normalizedPosToken,
        register: reg.value || null,
        freq: freq.value || null,
        domain: dom._get(),
        tone: tone._get(),
        status: status._get(),
        sensitivity: sens._get(),
        definition_es: defes._get(),
        definition_en: defen._get(),
        equivalents_en: (eqen.value||'').split(',').map(s=>s.trim()).filter(Boolean),
        related_slugs: Array.from(relSet),
        variants: {
          masc_sg: vInputs.masc_sg.value.trim() || null,
          masc_pl: vInputs.masc_pl.value.trim() || null,
          fem_sg: vInputs.fem_sg.value.trim() || null,
          fem_pl: vInputs.fem_pl.value.trim() || null,
          augmentative: vInputs.augmentative.value.trim() || null,
          diminutive: vInputs.diminutive.value.trim() || null,
        },
        alt_forms: Array.from(altWrap.children).map(r=> r._get ? r._get() : null).filter(Boolean),
        examples: Array.from(exWrap.children).map(r=> r._get ? r._get() : null).filter(Boolean)
      };
    };
    return card;
  }

  function render(prefill){
    elSenses.innerHTML = '';
    (prefill && prefill.length? prefill : [{}]).forEach((s,i)=> elSenses.appendChild(senseCard(s, i+1)));
  }

  btnAdd.addEventListener('click', ()=> elSenses.appendChild(senseCard({}, elSenses.children.length + 1)));

  let _ppxSubmitting = false;
  form.addEventListener('submit', async (e)=>{
    // Prevent double-submits when we re-trigger after uploads
    if (_ppxSubmitting) return;
    if (!(await checkEntryDuplicate(true))){
      e.preventDefault();
      if (wordInput) wordInput.focus({ preventScroll: true });
      return;
    }

    let didUpload = false;

    // Auto-upload entry audio if a file is selected
    if (EDIT_SLUG) {
      const entryFile = document.getElementById('entry_audio_file');
      const entryHidden = document.getElementById('entry_audio');
      if (entryFile && entryFile.files && entryFile.files[0]) {
        e.preventDefault();
        didUpload = true;
        try{
          const fd = new FormData();
          fd.append('file', entryFile.files[0]);
          fd.append('kind','entry');
          const res = await fetch(`/admin/glossary/${encodeURIComponent(EDIT_SLUG)}/upload-audio`, { method:'POST', body: fd, credentials:'same-origin' });
          let data = {};
          try { data = await res.json(); } catch(_) {}
          if (!res.ok || !data.ok){
            const msg = (data && (data.error || data.detail)) || `HTTP ${res.status}`;
            alert('Entry upload failed: ' + msg);
            return; // abort submit entirely
          }
          if (entryHidden) entryHidden.value = data.url || data.path || '';
        }catch(err){ alert('Entry upload error'); return; }
      }
    }

    // If there are example audio files selected, upload them first to get URLs
    if (EDIT_SLUG) {
      const files = Array.from(form.querySelectorAll('.ppx-ex-audio-file'));
      let exIndex = 1;
      for (const f of files) {
        const input = f;
        if (input.files && input.files[0]) {
          e.preventDefault();
          didUpload = true;
          const fd = new FormData();
          fd.append('file', input.files[0]);
          fd.append('kind','example');
          fd.append('index', String(exIndex));
          try{
            const res = await fetch(`/admin/glossary/${encodeURIComponent(EDIT_SLUG)}/upload-audio`, { method:'POST', body: fd, credentials:'same-origin' });
            let data = {};
            try { data = await res.json(); } catch(_) {}
            if (!res.ok || !data.ok){
              const msg = (data && (data.error || data.detail)) || `HTTP ${res.status}`;
              alert('Example upload failed: ' + msg);
              return; // abort submit
            }
            const holder = input.parentElement && input.parentElement.querySelector('.ppx-ex-audio-path') || input.closest('.ppx-card').querySelector('.ppx-ex-audio-path');
            if (holder){ holder.value = data.url || data.path || ''; const info = holder.nextElementSibling; if (info && info.tagName==='DIV') { info.innerHTML = `Current: <code>${holder.value}</code>`; } }
            exIndex += 1;
          }catch(err){ alert('Upload error'); return; }
        }
      }
    }

    // Serialize form JSON fields
    const senses = Array.from(elSenses.children).map(c=> c._get && c._get()).filter(Boolean);
    hid.value = JSON.stringify(senses);
    if (hidAlt) hidAlt.value = JSON.stringify(AltSpellings.get());

    // If we did any uploads (prevented default), trigger a programmatic submit now
    if (didUpload) {
      _ppxSubmitting = true;
      // Use setTimeout to allow the browser to update hidden fields before submit
      setTimeout(()=> form.submit(), 0);
    }
  });

  render(window.PPX_GLOSSARY_PREFILL || []);
  // Initialize entry-level alt spellings from prefill
  if (window.PPX_ENTRY_PREFILL) {
    AltSpellings.init(window.PPX_ENTRY_PREFILL.alt_spellings || []);
  } else {
    AltSpellings.init([]);
  }
  scheduleDuplicateCheck();

  // -----------------------------
  // JSON editor (modal)
  // -----------------------------
  function collectEntry(){
    const word = (form.querySelector('input[name="word"]')?.value || '').trim();
    const senses = Array.from(elSenses.children).map(c=> c._get && c._get()).filter(Boolean);
    return {
      word: word || '',
      slug: '',
      audio: null,
      alt_spellings: (typeof AltSpellings !== 'undefined' ? AltSpellings.get() : []),
      senses: senses.length? senses : [skeletonSense()] 
    };
  }
  function skeletonSense(){
    return {
      id: 's1',
      countries: [],
      pos: 'sustantivo_masculino_y_femenino',
      register: null,
      freq: null,
      domain: [],
      tone: [],
      status: [],
      sensitivity: [],
      variants: {
        masc_sg: null,
        masc_pl: null,
        fem_sg: null,
        fem_pl: null,
        augmentative: null,
        diminutive: null
      },
      definition_es: '',
      definition_en: '',
      equivalents_en: [],
      related_slugs: [],
      alt_forms: [
        { form: '', type: 'diminutivo', regions: [], note_es: '', note_en: '', audio: null, related_slug: '' }
      ],
      examples: [
        { es: '', en: '', audio: null, source: {
            type:'',
            // movie
            title:'', year:'',
            // series
            season:'', episode:'',
            // song
            artist:'', song_title:'',
            // social
            platform:'', post_url:'', username:'', profile_url:'',
            // book
            author:'', book_title:'',
            // other
            label:''
        } }
      ]
    };
  }
  function applyEntryJson(obj){
    if (!obj) return;
    if (obj && typeof obj.word === 'string'){
      const w = form.querySelector('input[name="word"]'); if (w) w.value = obj.word;
    }
    if (obj && Array.isArray(obj.senses)){
      render(obj.senses);
    }
    if (obj && Array.isArray(obj.alt_spellings) && typeof AltSpellings !== 'undefined'){
      AltSpellings.set(obj.alt_spellings);
    }
  }

function openJsonEditor(){
    const entry = collectEntry();
    const fallback = function(){
      const pretty = JSON.stringify(entry, null, 2);
      const html = `
        <div style="max-width:min(92vw,1000px);">
          <div style="display:flex; align-items:center; gap:.5rem; margin-bottom:.5rem;">
            <img src="/static/assets/icons/json.svg" alt="{}" style="width:18px; height:18px;"/>
            <strong>JSON</strong>
          </div>
          <p style="margin:.25rem 0 .5rem; opacity:.8;">Edita o pega el objeto de entrada. Usa placeholders donde haga falta.</p>
          <textarea id="ppx-json-editor" style="width:100%; min-height:420px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; border:1px solid #e5e7eb; border-radius:8px; padding:.75rem;">${pretty}</textarea>
          <div style="display:flex; gap:.5rem; justify-content:flex-end; margin-top:.5rem;">
            <button type="button" class="ppx-btn" id="ppx-json-cancel">Cancelar</button>
            <button type="button" class="ppx-btn ppx-btn--primary" id="ppx-json-apply">Aplicar</button>
          </div>
        </div>`;
      if (window.PPXModal){
        PPXModal.open({ title: 'JSON', body: html, showLevel: false });
        document.getElementById('ppx-json-cancel').addEventListener('click', ()=> PPXModal.close());
        document.getElementById('ppx-json-apply').addEventListener('click', ()=>{
          const val = document.getElementById('ppx-json-editor').value;
          try{
            const obj = JSON.parse(val);
            applyEntryJson(obj);
            PPXModal.close();
          }catch(e){ alert('JSON inválido'); }
        });
      } else {
        const w = window.open('', '_blank'); w.document.write(`<pre>${pretty.replace(/[&<>]/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[s]))}</pre>`); w.document.close();
      }
    };

    if (window.PPXJsonEditor && typeof window.PPXJsonEditor.open === 'function'){
      window.PPXJsonEditor.open({
        exerciseType: 'glossary',
        slug: entry.slug || '',
        title: entry.word || entry.slug || 'Glossary entry',
        level: '',
        initialData: entry,
        validate: () => [],
        apply: applyEntryJson
      });
      return;
    }

    fallback();
  }
  if (btnJson){ btnJson.addEventListener('click', openJsonEditor); }
})();
