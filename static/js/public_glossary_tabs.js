// Public Glossary Tabs Workspace
// Allows opening multiple entries in a single PPXModal via tabs
(function(){
  const Cache = new Map();   // cache key => full entry JSON
  const Tabs = [];           // [{ slug, title }]
  let Active = null;         // active slug
  let mounted = false;
  const Player = { el: null };
  const APP_LANG = (document.documentElement.getAttribute('lang')||'es').slice(0,2);
  const L = (es,en)=> APP_LANG==='es'? es : en;
  const STORAGE_KEY = 'ppx_last_glossary_entry';
  const ENTRY_LANG_KEY = 'ppx_gl_entry_lang';
  let ActiveLang = (function(){
    try{
      const raw = window.localStorage && localStorage.getItem(ENTRY_LANG_KEY);
      if (raw) return raw;
    }catch(_){}
    return APP_LANG;
  })();
  function saveEntryLang(lang){
    try{ if (window.localStorage) localStorage.setItem(ENTRY_LANG_KEY, lang); }catch(_){}
  }
  const POS_CATALOG = (Array.isArray(window.PPX_POS_CATALOG) ? window.PPX_POS_CATALOG : []).map(entry => ({ ...entry, value: (entry.value || '').toString().toLowerCase() }));
  const POS_ALIAS = window.PPX_POS_ALIASES || {};
  const POS_MAP = new Map();
  POS_CATALOG.forEach(entry => { if (entry && entry.value) POS_MAP.set(entry.value, entry); });
  const CANON_POS_SET = new Set(POS_CATALOG.map(entry => entry.value).filter(Boolean));
  const CANON_POS_BY_BARE = new Map();
  CANON_POS_SET.forEach(token => {
    const bare = token.replace(/_/g, '');
    if (!CANON_POS_BY_BARE.has(bare)) CANON_POS_BY_BARE.set(bare, token);
  });
  const POS_ALIAS_MAP = new Map();
  Object.entries(POS_ALIAS || {}).forEach(([alias, canonical]) => {
    const key = normTok(alias);
    const value = normTok(canonical);
    if (key && value && CANON_POS_SET.has(value)) {
      POS_ALIAS_MAP.set(key, value);
    }
  });

  function clearCacheFor(slug){
    const safe = normalizeSlug(slug);
    if (!safe) return;
    try{
      Array.from(Cache.keys()).forEach(k=>{ if (k.startsWith(`${safe}|`)) Cache.delete(k); });
    }catch(_){}
  }
  function cacheKey(slug, lang){
    return `${slug}|${lang||''}`;
  }

  // Normalize and label POS tokens bilingual with parentheses for verb types
  function canonicalizePosToken(token){
    if (!token) return '';
    const cleaned = normTok(token);
    if (!cleaned) return '';
    if (CANON_POS_SET.has(cleaned)) return cleaned;
    if (POS_ALIAS_MAP.has(cleaned)) return POS_ALIAS_MAP.get(cleaned);
    const bare = cleaned.replace(/_/g, '');
    if (CANON_POS_BY_BARE.has(bare)) return CANON_POS_BY_BARE.get(bare);
    return cleaned;
  }
  function posLabel(tok, langOverride){
    const lang = (langOverride || APP_LANG);
    const canonical = canonicalizePosToken(tok);
    const entry = POS_MAP.get(canonical);
    if (entry){
      return lang === 'es' ? entry.es : entry.en;
    }
    return (tok||'').toString().replace(/_/g,' ');
  }

  const pillBase = 'display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:999px; border:1px solid #e2e8f0; font-size:12px; font-weight:600; line-height:1; background:#f8fafc; color:#0f172a;';
  function pill(txt, kind){
    let style = pillBase;
    if (kind==='accent') style = pillBase + ' border-color:#c7d2fe; background:#eef2ff; color:#312e81;';
    else if (kind==='alert') style = pillBase + ' border-color:#fecdd3; background:#fff1f2; color:#b91c1c;';
    else if (kind==='audio') style = pillBase + ' border-color:#bae6fd; background:#e0f2fe; color:#075985;';
    else if (kind==='muted') style = pillBase + ' border-color:#e2e8f0; background:#f8fafc; color:#475569; font-weight:500;';
    return `<span style="${style}">${txt}</span>`;
  }
  function normTok(v){
    return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_ ]/g,'_').replace(/\s+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');
  }
  function cap(s){
    const t = String(s || '').replace(/_/g,' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function normalizeSlug(slug){
    const raw = (slug || '').toString().trim().toLowerCase();
    if (!raw) return '';
    const stripped = raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return stripped.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g,'');
  }
  // Ensure accordion CSS once
  function ensureAccCss(){
    if (document.getElementById('ppx-acc-shared')) return;
    const st = document.createElement('style');
    st.id = 'ppx-acc-shared';
    st.textContent = `
      /* Reset any global accordion styling for our modal accordions */
      #glw-content details.ppx-acc summary {
        list-style: none;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        width: 100%;
        max-width: none !important;
        box-sizing: border-box;
        margin: 0 !important;
        padding: 0;
        background: transparent;
        border: 0;
        outline: none;
      }
      #glw-content details.ppx-acc summary::-webkit-details-marker { display: none !important; }
      #glw-content details.ppx-acc summary::marker { display: none !important; content: none !important; }
      /* kill any left chevron pseudo from global accordion.css */
      #glw-content details.ppx-acc summary::before { display: none !important; content: none !important; }
      #glw-content details.ppx-acc summary::after { display: none !important; content: none !important; }
      #glw-content details.ppx-acc summary .ppx-acc-ic {
        width: 16px;
        height: 16px;
        flex: 0 0 16px;
        margin-left: auto;
      }
      /* Normalize container so it fills the tab width and drops exercise UI shadows */
      #glw-content details.ppx-acc {
        outline: none;
        padding: 0;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 10px 28px rgba(15,23,42,.06);
        width: 100% !important;
        margin: .9rem 0 .45rem 0 !important;
      }
      #glw-content details.ppx-acc[open]{
        border-color: #e5e7eb;
        box-shadow: 0 12px 30px rgba(15,23,42,.08);
      }
      #glw-content details.ppx-acc > summary {
        padding: .7rem .95rem .55rem .95rem;
      }
      #glw-content details.ppx-acc > div {
        width: 100% !important;
        max-width: none !important;
      }
    `;
    document.head.appendChild(st);
  }
  ensureAccCss();
  // Persist per-entry UI state (open accordions, scroll)
  const STATE_KEY = 'ppx_glw_state';
  function loadStateMap(){
    try{
      const raw = window.localStorage && localStorage.getItem(STATE_KEY);
      return raw ? (JSON.parse(raw)||{}) : {};
    }catch(_){ return {}; }
  }
  function saveState(slug, patch){
    if (!slug) return;
    try{
      const all = loadStateMap();
      const cur = all[slug] || {};
      all[slug] = { ...cur, ...patch };
      localStorage.setItem(STATE_KEY, JSON.stringify(all));
    }catch(_){}
  }
  function loadState(slug){
    const all = loadStateMap();
    return all[slug] || {};
  }
  const TOKEN_LABELS = {
    register: {
      formal: { es:'formal', en:'formal' },
      neutral: { es:'neutral', en:'neutral' },
      informal: { es:'informal', en:'informal' },
      vulgar: { es:'vulgar', en:'vulgar' },
    },
    freq: {
      muy_comun: { es:'muy común', en:'very common' },
      comun: { es:'común', en:'common' },
      menos_comun: { es:'menos común', en:'less common' },
      raro: { es:'raro', en:'rare' },
    },
    status: {
      vigente: { es:'vigente', en:'current' },
      en_desuso: { es:'en desuso', en:'obsolete' },
      arcaico: { es:'arcaico', en:'archaic' },
      regionalismo_fuerte: { es:'regionalismo fuerte', en:'strong regionalism' },
    },
    sensitivity: {
      potencialmente_ofensivo: { es:'potencialmente ofensivo', en:'potentially offensive' },
      lenguaje_explicito: { es:'lenguaje explícito', en:'explicit language' },
      connotacion_sexual: { es:'connotación sexual', en:'sexual connotation' },
    },
    domain: {
      comida: { es:'comida', en:'food' },
      salud: { es:'salud', en:'health' },
      emociones: { es:'emociones', en:'emotions' },
      familia: { es:'familia', en:'family' },
      trabajo: { es:'trabajo', en:'work' },
      educacion: { es:'educación', en:'education' },
      tecnologia: { es:'tecnología', en:'technology' },
      politica: { es:'política', en:'politics' },
      economia: { es:'economía', en:'economy' },
      cultura_pop: { es:'cultura pop', en:'pop culture' },
      deporte: { es:'deporte', en:'sports' },
      naturaleza: { es:'naturaleza', en:'nature' },
      sociedad: { es:'sociedad', en:'society' },
      transporte: { es:'transporte', en:'transport' },
    },
    tone: {
      afectuoso: { es:'afectuoso', en:'affectionate' },
      despectivo: { es:'despectivo', en:'pejorative' },
      ironico: { es:'irónico', en:'ironic' },
      humoristico: { es:'humorístico', en:'humorous' },
      poetico: { es:'poético', en:'poetic' },
      agresivo: { es:'agresivo', en:'aggressive' },
    },
  };
  // Accept either Spanish or English tokens/labels and translate to the active language
  const TOKEN_LOOKUP = (function(){
    const out = {};
    Object.entries(TOKEN_LABELS).forEach(([group, entries])=>{
      out[group] = {};
      Object.entries(entries).forEach(([token, val])=>{
        const entry = { es: val.es, en: val.en };
        const keys = [token, val.es, val.en].map(normTok);
        keys.forEach(k=>{ if (k) out[group][k] = entry; });
      });
    });
    return out;
  })();
  function labelFor(key, tok, langOverride){
    const lang = langOverride || ActiveLang || APP_LANG;
    const n = normTok(tok);
    const map = TOKEN_LOOKUP[key] || {};
    const entry = map[n];
    if (entry && typeof entry === 'object'){
      return lang === 'es' ? entry.es : entry.en;
    }
    return cap(tok);
  }

  function sensitivityLabel(arr, lang){
    return (arr||[]).map(v=> labelFor('sensitivity', v, lang)).join(' / ');
  }
  function alertEmojis(meta){
    const regs = meta.register || [];
    const sens = meta.sensitivity || [];
    const parts = [];
    if (regs.find(r=> normTok(r)==='vulgar')) parts.push('🚫');
    if (sens.length) parts.push('⚠️');
    return parts.join('');
  }
  function metaBar(meta){
    const parts = [];
    if (meta.pos && meta.pos.length) parts.push(pill(posLabel(meta.pos[0], ActiveLang), 'accent'));
    if (meta.register && meta.register.length) parts.push(pill(meta.register.map(v=> labelFor('register', v, ActiveLang)).join(' / '), meta.register.some(r=> normTok(r)==='vulgar') ? 'alert' : 'muted'));
    if (meta.freq && meta.freq.length) parts.push(pill(labelFor('freq', meta.freq[0], ActiveLang), 'muted'));
    if (meta.status && meta.status.length) parts.push(pill(meta.status.map(v=> labelFor('status', v, ActiveLang)).join(' / '), 'muted'));
    if (meta.sensitivity && meta.sensitivity.length) parts.push(pill(sensitivityLabel(meta.sensitivity, ActiveLang), 'alert'));
    if (meta.domain && meta.domain.length) parts.push(pill(meta.domain.slice(0,2).map(v=> labelFor('domain', v, ActiveLang)).join(', '), 'muted'));
    if (meta.tone && meta.tone.length) parts.push(pill(meta.tone.slice(0,2).map(v=> labelFor('tone', v, ActiveLang)).join(', '), 'muted'));
    if (meta.countries && meta.countries.length) parts.push(pill(meta.countries.join(' / '), 'muted'));
    return parts.length ? `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:.4rem;">${parts.join('')}</div>` : '';
  }
  function senseMetaRow(s){
    const reg = s.register ? [s.register].flat().filter(Boolean) : [];
    const status = Array.isArray(s.status) ? s.status : (s.status ? [s.status] : []);
    const sens = Array.isArray(s.sensitivity) ? s.sensitivity : (s.sensitivity ? [s.sensitivity] : []);
    const domain = s.domain || [];
    const tone = s.tone || [];
    const freq = s.freq ? [s.freq] : [];
    const parts = [];
    if (s.pos) parts.push(pill(posLabel(s.pos, ActiveLang), 'accent'));
    if (reg.length) parts.push(pill(reg.map(v=> labelFor('register', v, ActiveLang)).join(' / '), reg.some(r=> normTok(r)==='vulgar') ? 'alert' : 'muted'));
    if (freq.length) parts.push(pill(labelFor('freq', freq[0], ActiveLang), 'muted'));
    if (status.length) parts.push(pill(status.map(v=> labelFor('status', v, ActiveLang)).join(' / '), 'muted'));
    if (sens.length) parts.push(pill(sensitivityLabel(sens, ActiveLang), 'alert'));
    if (domain.length) parts.push(pill(domain.slice(0,2).map(v=> labelFor('domain', v, ActiveLang)).join(', '), 'muted'));
    if (tone.length) parts.push(pill(tone.slice(0,2).map(v=> labelFor('tone', v, ActiveLang)).join(', '), 'muted'));
    return parts.length ? `<div style="display:flex; flex-wrap:wrap; gap:6px; margin:.35rem 0;">${parts.join('')}</div>` : '';
  }
  function warningForSense(s){
    const reg = s.register ? [s.register].flat().filter(Boolean) : [];
    const sens = Array.isArray(s.sensitivity) ? s.sensitivity : (s.sensitivity ? [s.sensitivity] : []);
    const bits = [];
    if (reg.find(r=> normTok(r)==='vulgar')) bits.push(L('vulgar','vulgar'));
    if (sens.length) bits.push(sensitivityLabel(sens));
    if (!bits.length) return '';
    return `⚠️ ${L('Aviso de contenido','Content advisory')}: ${bits.join(' / ')}`;
  }

  function variantsRow(variants, lang){
    const Lloc = (es,en)=> (lang==='es'? es : en);
    const v = variants || {};
    const entries = [
      ['masc_sg', Lloc('Masculino (singular)','Masculine (singular)')],
      ['masc_pl', Lloc('Masculino (plural)','Masculine (plural)')],
      ['fem_sg', Lloc('Femenino (singular)','Feminine (singular)')],
      ['fem_pl', Lloc('Femenino (plural)','Feminine (plural)')],
      ['augmentative', Lloc('Aumentativo','Augmentative')],
      ['diminutivo', Lloc('Diminutivo','Diminutive')],
    ];
    const pills = entries.map(([k,label])=>{
      const val = (v && v[k]) ? String(v[k]).trim() : '';
      return val ? pill(`${label}: <strong>${val}</strong>`, 'muted') : '';
    }).filter(Boolean);
    if (!pills.length) return '';
    return `<div style="margin-top:.35rem; display:flex; flex-wrap:wrap; gap:6px;">${pills.join('')}</div>`;
  }


  function openWorkspaceIfNeeded(){
    if (mounted) return;
    const body = [
      '<div id="glw" style="width:100%;">',
      '  <div id="glw-tabs" role="tablist" style="display:flex; gap:6px; border-bottom:1px solid #e5e7eb; padding:.4rem; flex-wrap:wrap;"></div>',
      '  <div id="glw-content" style="padding:0; max-height:none; overflow:visible;"></div>',
      '</div>'
    ].join('');
    if (window.PPXModal){
      PPXModal.open({ title: '', body, showLevel: false });
      // Default fullscreen
      setTimeout(()=>{ const m = document.querySelector('.ppx-modal'); if (m) m.classList.add('ppx-modal--fullscreen'); }, 0);
      mounted = true;
    }
  }

  async function fetchEntry(slug, langOverride){
    const safeSlug = normalizeSlug(slug);
    if (!safeSlug) throw new Error('not_found');
    const lang = langOverride || ActiveLang || APP_LANG;
    const key = cacheKey(safeSlug, lang);
    if (Cache.has(key)) return Cache.get(key);
    const url = new URL(`/glossary/api/entry/${encodeURIComponent(safeSlug)}`, window.location.origin);
    if (lang) url.searchParams.set('lang', lang);
    const r = await fetch(url.toString(), { headers:{ 'Accept':'application/json' }, credentials:'same-origin' });
    const data = await r.json();
    if (!r.ok || !data.ok) throw new Error('not_found');
    Cache.set(key, data.entry);
    return data.entry;
  }

  function ensureTab(slug, title){
    const safe = normalizeSlug(slug);
    if (!safe) return;
    if (!Tabs.find(t => t.slug === safe)) Tabs.push({ slug: safe, title: title || safe });
  }

  function activate(slug){ Active = normalizeSlug(slug); render(); }

  function close(slug){
    const idx = Tabs.findIndex(t => t.slug === slug);
    if (idx >= 0) Tabs.splice(idx, 1);
    if (Active === slug) Active = (Tabs[idx] || Tabs[idx-1] || {}).slug || null;
    if (!Tabs.length){
      try{
        const url = new URL(window.location.href);
        url.searchParams.delete('entry');
        window.history.replaceState({}, '', url.toString());
        if (window.localStorage) localStorage.removeItem(STORAGE_KEY);
      }catch(_){}
      if (window.PPXModal) PPXModal.close();
      mounted = false;
      return;
    }
    render();
  }

  // Ensure new clicks can reopen after user closes the modal via header X
  try {
    window.addEventListener('ppx:modal:close', function(){
      mounted = false; Active = null; Tabs.length = 0; try { Cache.clear(); } catch(_){}
    });
  } catch(_){}

  function render(){
    openWorkspaceIfNeeded();
    const bar = document.getElementById('glw-tabs');
    const pane = document.getElementById('glw-content');
    if (!bar || !pane) return;
    bar.innerHTML = Tabs.map(t => `
      <button type="button" role="tab" aria-selected="${t.slug===Active}" data-slug="${t.slug}" class="ppx-btn ppx-btn--subtle" style="display:flex;align-items:center;gap:6px;${t.slug===Active ? 'background:#eef2ff; border-color:#c7d2fe; color:#312e81;' : ''}">
        <span>${t.title}</span>
        <span data-close="${t.slug}" aria-label="Close" title="Close" style="opacity:.6;">x</span>
      </button>
    `).join('');
    bar.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); close(x.getAttribute('data-close')); }));
    bar.querySelectorAll('[data-slug]').forEach(b => b.addEventListener('click', (ev)=> {
      ev.preventDefault();
      ev.stopPropagation();
      activate(b.getAttribute('data-slug'));
    }));

    if (!Active){ pane.innerHTML = ''; return; }
    const entryKey = cacheKey(Active, ActiveLang);
    const entry = Cache.get(entryKey) || Cache.get(Active);
    if (entry){
      pane.innerHTML = renderEntry(entry);
    } else {
      pane.innerHTML = '<div class="ppx-muted">Loading…</div>';
      fetchEntry(Active, ActiveLang).then(ent => {
        Cache.set(cacheKey(Active, ActiveLang), ent);
        render();
      }).catch(()=>{ pane.innerHTML = '<div class="ppx-muted">Not found</div>'; });
      return;
    }
    // Wire language selector
    const langSel = pane.querySelector('#glw-lang');
    if (langSel){
      langSel.addEventListener('change', async ()=>{
        const lang = langSel.value || APP_LANG;
        ActiveLang = lang;
        saveEntryLang(lang);
        clearCacheFor(Active);
        const refreshed = await fetchEntry(Active, lang);
        Cache.set(cacheKey(Active, lang), refreshed);
        render();
      });
    }

    // Wire related links (including example chips) to open new tabs via the modal API
    pane.querySelectorAll('a[data-slug]').forEach(a=> a.addEventListener('click', (ev)=>{ 
      ev.preventDefault(); 
      ev.stopPropagation();
      const api = (window.Tabs && typeof window.Tabs.open === 'function') ? window.Tabs : null;
      if (api) api.open(a.getAttribute('data-slug')); 
    }));
    // Sync accordion chevrons for examples
    if (window.PPXAccordions && typeof PPXAccordions.sync === 'function'){
      PPXAccordions.sync(pane);
    } else {
      pane.querySelectorAll('details[data-acc="examples"]').forEach(det => {
        const ic = det.querySelector('summary img.ppx-acc-ic');
        const sync = ()=>{ if (ic) ic.src = det.open ? '/static/assets/icons/chevron_up.svg' : '/static/assets/icons/chevron_down.svg'; };
        det.addEventListener('toggle', sync);
        sync();
      });
    }
    // Wire entry audio play button (prefer a hidden in-DOM audio element for compatibility)
    const btn = pane.querySelector('[data-entry-audio]');
    if (btn){
      const entryEl = pane.querySelector('audio[data-entry-player]');
      const player = entryEl || (Player.el || (Player.el = new Audio()));
      if (!entryEl) { player.preload = 'none'; }
      const src = btn.getAttribute('data-entry-audio');
      const playIcon = btn.querySelector('img');
      function setPlaying(on){ btn.setAttribute('aria-pressed', on? 'true':'false'); if (playIcon) playIcon.style.opacity = on? '0.8':'1'; }
      btn.addEventListener('click', (e)=>{
        e.preventDefault();
        if (!src) return;
        if (player.src === location.origin + src || player.src === src){
          if (!player.paused){ player.pause(); setPlaying(false); }
          else { player.play().catch(()=>{}); setPlaying(true); }
        } else {
          try { player.pause(); } catch(_){ }
          player.src = src;
          try { player.currentTime = 0; } catch(_){ }
          player.play().then(()=> setPlaying(true)).catch(()=> setPlaying(false));
        }
      });
      player.addEventListener('ended', ()=> setPlaying(false));
      player.addEventListener('pause', ()=> setPlaying(false));
    }

    // Wire example speed sliders to their audio elements
    pane.querySelectorAll('input[data-rate-for]').forEach(r => {
      const id = r.getAttribute('data-rate-for');
      const aud = id && pane.querySelector(`audio[data-audio-id="${CSS.escape(id)}"]`);
      if (!aud) return;
      r.addEventListener('input', ()=>{
        const val = parseFloat(r.value)||1;
        try { aud.playbackRate = val; } catch(_){ /* ignore */ }
      });
    });
    // Restore open accordions and scroll position
    const st = loadState(Active);
    const dets = Array.from(pane.querySelectorAll('details'));
    if (st && Array.isArray(st.openIdx)){
      dets.forEach((d,i)=>{ d.open = st.openIdx.includes(i); });
    }
    const scrollTarget = document.scrollingElement || document.documentElement || document.body;
    if (st && typeof st.scroll === 'number'){
      try { scrollTarget.scrollTo({ top: st.scroll, behavior:'instant' }); } catch(_){ try { scrollTarget.scrollTop = st.scroll; }catch(_){ } }
    }
    function persistState(){
      const openIdx = dets.map((d,i)=> d.open ? i : null).filter(i=> i!==null);
      let scroll = 0;
      try { scroll = scrollTarget.scrollTop || 0; }catch(_){}
      saveState(Active, { openIdx, scroll });
    }
    dets.forEach((d)=> d.addEventListener('toggle', persistState));
    window.addEventListener('scroll', persistState, { passive:true });
  }

  function renderEntry(entry){
    const e = entry || {}; const slug = e.slug || '';
    const senses = Array.isArray(e.senses) ? e.senses : [];
    const LANG = ActiveLang || APP_LANG;
    const LLocal = (es,en)=> LANG==='es'? es : en;
    const L = LLocal;

    const metaSets = {
      pos: new Set(),
      register: new Set(),
      freq: new Set(),
      status: new Set(),
      sensitivity: new Set(),
      domain: new Set(),
      tone: new Set(),
      countries: new Set()
    };
    senses.forEach(s=>{
      const normalizedPos = canonicalizePosToken(s.pos);
      if (normalizedPos) metaSets.pos.add(normalizedPos);
      const reg = s.register ? [s.register].flat().filter(Boolean) : [];
      reg.forEach(r=> metaSets.register.add(r));
      if (s.freq) metaSets.freq.add(s.freq);
      const st = Array.isArray(s.status) ? s.status : (s.status ? [s.status] : []);
      st.forEach(v=> metaSets.status.add(v));
      const se = Array.isArray(s.sensitivity) ? s.sensitivity : (s.sensitivity ? [s.sensitivity] : []);
      se.forEach(v=> metaSets.sensitivity.add(v));
      (s.domain || []).forEach(v=> metaSets.domain.add(v));
      (s.tone || []).forEach(v=> metaSets.tone.add(v));
      (s.countries || []).forEach(c=> metaSets.countries.add(c));
    });
    const meta = Object.fromEntries(Object.entries(metaSets).map(([k,v])=> [k, Array.from(v)]));

    const label = (tok)=> (tok||'').replace(/_/g, ' ');
    const esc = (s)=> String(s||'').replace(/[&<>]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const highlightBackticks = (text)=> esc(text)
      .replace(/\\r?\\n/g, '<br>')
      .replace(/`([^`]+)`/g, '<span style=\"color: var(--ppx-color-primary); font-weight:600;\">$1</span>');
    const iconForSource = (type)=>{
      const map = { movie:'movie', series:'series', song:'song', social:'social_media', book:'book', other:'other' };
      const name = map[(type||'').toLowerCase()] || 'other';
      return `/static/assets/icons/${name}.svg`;
    };
    const formatSource = (src)=>{
      if (!src || !src.type) return '';
      const t = (src.type||'').toLowerCase();
      if (t==='movie') return src.title ? src.title + (src.year? ` (${src.year})`:'') : 'movie';
      if (t==='series'){
        const main = src.title || 'series';
        const se = (src.season? `S${src.season}`:'') + (src.episode? `E${src.episode}`:'');
        const yr = src.year? ` (${src.year})`:''; return `${main}${se? ' '+se:''}${yr}`.trim();
      }
      if (t==='song'){
        const a = src.artist ? src.artist + ' — ' : '';
        return a + (src.song_title || src.title || 'song');
      }
      if (t==='social'){
        const u = src.username? '@'+src.username : '';
        const p = src.platform? ` ${src.platform}`:'';
        return (u+p).trim() || 'social';
      }
      if (t==='book'){
        const a = src.author ? src.author + ': ' : '';
        return a + (src.book_title || src.title || 'book');
      }
      if (t==='other') return src.label || 'source';
      return t;
    };

    const _ea = (function(){
      const raw = String(e.audio||'').trim();
      if (!raw) return '';
      let u = raw;
      // Normalize centralized entry route to current slug (handles stale slugs)
      if (u.startsWith('/media/glossary-audio/entry/')){
        const fname = u.split('/').pop();
        return `/media/glossary-audio/entry/${encodeURIComponent(slug)}/${fname}`;
      }
      if (u.startsWith('http') || u.startsWith('/media/')) return u;
      // Legacy per-entry style => centralized route
      const m = u.match(/^media\/audio\/entry\/(.+)$/);
      if (m && m[1]) return `/media/glossary-audio/entry/${encodeURIComponent(slug)}/${m[1]}`;
      // Bare filename => centralized route
      if (!u.includes('/')) return `/media/glossary-audio/entry/${encodeURIComponent(slug)}/${u}`;
      // Fallback make absolute
      return '/' + u.replace(/^\/+/, '');
    })();
    const headerAudio = _ea ? `<button class=\"ppx-btn\" aria-label=\"Play entry audio\" data-entry-audio=\"${_ea}\" title=\"Play audio\" style=\"display:inline-flex; align-items:center; gap:.25rem; padding:.35rem .5rem;\">\n        <img src=\"/static/assets/icons/play_audio.svg\" alt=\"\" style=\"width:18px; height:18px;\">\n      </button><audio data-entry-player src=\"${_ea}\" preload=\"none\" style=\"display:none\"></audio>` : '';
    // Collect alternate spellings/forms to show as a compact "Also: ..." line
    const altSet = new Set();
    (e.alt_spellings||[]).forEach(s=> { const v=(s||'').trim(); if (v) altSet.add(v); });
    (senses||[]).forEach(s=> (s.alt_forms||[]).forEach(af=>{ const v=(af && af.form)||''; if ((v||'').trim()) altSet.add(v.trim()); }));
    const alsoLine = (altSet.size>0) ? `
      <div style="margin-top:.15rem;">
        <span style="color:#64748b;">${L('También:','Also:')}</span>
        <span style="color: var(--ppx-color-primary); font-weight:600;">
          ${Array.from(altSet).join(', ')}
        </span>
      </div>` : '';

    const headerAlerts = alertEmojis({ register: meta.register, sensitivity: meta.sensitivity });
    const langSel = `
      <label style="display:inline-flex; align-items:center; gap:6px; font-size:13px; color:#475569;">
        <span>${L('Idioma','Language')}</span>
        <select id="glw-lang" style="padding:4px 8px; border:1px solid #e2e8f0; border-radius:6px; background:#fff; font-size:13px;">
          <option value="es" ${LANG==='es'?'selected':''}>Español</option>
          <option value="en" ${LANG==='en'?'selected':''}>English</option>
        </select>
      </label>`;

    const header = `
      <div style="display:flex; align-items:center; gap:.5rem; justify-content:space-between; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:.5rem; flex-wrap:wrap;">
          ${headerAudio}
          <h2 style="margin:.25rem 0; display:flex; align-items:center; gap:.35rem; flex-wrap:wrap;">${e.word||slug}${headerAlerts? `<span aria-label="${L('Contenido sensible','Sensitive content')}" title="${L('Contenido sensible','Sensitive content')}" style="font-size:1.05rem;">${headerAlerts}</span>`:''}</h2>
        </div>
        ${langSel}
      </div>
      ${alsoLine}`;

    function renderExamplesForSense(examples, senseNumber){
      if (!examples || !examples.length) return '';
      let exIdx = 0;
      const list = examples.map((ex, exPos)=>{
        exIdx += 1; const aid = `exaud-${slug}-${senseNumber}-${exIdx}`;
        const _xu = (function(){
          const raw = String(ex.audio||'').trim();
          if (!raw) return '';
          let u = raw;
          // Normalize centralized examples route to current slug (handles stale slugs)
          if (u.startsWith('/media/glossary-audio/examples/')){
            const rest = u.replace('/media/glossary-audio/examples/','');
            const parts = rest.split('/');
            const remainder = parts.slice(1).join('/');
            if (remainder) return `/media/glossary-audio/examples/${encodeURIComponent(slug)}/${remainder}`;
            if (parts[0]) return `/media/glossary-audio/examples/${encodeURIComponent(slug)}/${parts[0]}`;
            return u;
          }
          if (u.startsWith('http') || u.startsWith('/media/')) return u;
          const m = u.match(/^media\/audio\/examples\/(.+)$/);
          if (m && m[1]) return `/media/glossary-audio/examples/${encodeURIComponent(slug)}/${m[1]}`;
          if (!u.includes('/')) return `/media/glossary-audio/examples/${encodeURIComponent(slug)}/${u}`;
          return '/' + u.replace(/^\/+/, '');
        })();
        const audio = _xu ? `<audio controls preload="metadata" data-audio-id="${aid}" src="${_xu}" style="height:28px; border-radius:8px; background:#fff;"></audio>` : '';
        const speedCtl = ex.audio ? `<div style="display:flex; align-items:center; gap:8px;">
              <span class="ppx-muted" style="font-size:12px;">${L('Velocidad','Speed')}</span>
              <input type="range" min="0.5" max="1.5" step="0.05" value="1.0" data-rate-for="${aid}">
            </div>` : '';
        const srcLabel = ex.source ? formatSource(ex.source) : '';
        const srcType = ex.source && ex.source.type ? String(ex.source.type||'').toLowerCase() : '';
        const linkedHtml = (Array.isArray(ex.linked_terms) && ex.linked_terms.length) ? (() => {
          const chips = ex.linked_terms.map(lt => {
            const slug = normalizeSlug(lt);
            const label = (lt || '').toString().replace(/-/g, ' ');
            if (!slug) return '';
            return `<a href="#" class="ppx-btn ppx-btn--subtle" data-slug="${slug}" style="padding:4px 10px; font-size:12px; border-radius:10px; text-decoration:none;">${label}</a>`;
          }).filter(Boolean).join(' ');
          return chips ? `<div style="margin-top:.35rem; display:flex; gap:.35rem; flex-wrap:wrap; align-items:center;">
            <span style="font-size:12px; color:#475569;">${L('Términos relacionados','Related entries')}</span>
            ${chips}
          </div>` : '';
        })() : '';
        const srcHtml = srcLabel ? `<div style="margin-top:.4rem;">
            <span style="display:inline-flex; align-items:center; gap:6px; padding:.25rem .6rem; border-radius:9999px; background:#e0f2fe; border:1px solid #bae6fd; font-size:12px;">
              <img src="${iconForSource(srcType)}" alt="" style="width:14px; height:14px;"> ${srcLabel}
            </span>
          </div>` : '';
        // Keep examples clean; rely on related chips to open linked entries
        const esLinked = highlightBackticks(ex.es||'');
        const enLinked = highlightBackticks(ex.en||'');
        return `<div style="padding:.65rem; margin:.45rem 0; background:#eff6ff; border:1px solid #dbeafe; border-radius:12px;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">${audio}${speedCtl}</div>
          <div style="margin-top:.5rem; line-height:1.45; white-space:pre-line;"><strong>${esLinked}</strong></div>
          <div style="opacity:.8; line-height:1.45; margin-top:.2rem; white-space:pre-line;"><em>${enLinked}</em></div>
          ${srcHtml}
          ${linkedHtml}
        </div>`;
      }).join('');
      return `
        <details class="ppx-acc" data-acc="examples" style="margin-top:.65rem; width:100%; box-sizing:border-box; padding:0; border:1px solid #e5e7eb; border-radius:12px; background:#fff; box-shadow:0 10px 28px rgba(15,23,42,.06);">
          <summary style="font-weight:600; padding:.85rem .95rem .65rem .95rem;">
            <span>${L('Ejemplos en contexto','Examples in Context')} — ${L('Sentido','Sense')} ${senseNumber}</span>
            <img class="ppx-acc-ic" src="/static/assets/icons/chevron_down.svg" alt="">
          </summary>
          <div style="padding:.35rem .95rem .7rem .95rem;">${list}</div>
        </details>`;
    }

    // Flat senses listing
    let sensesHtml = '';
    senses.forEach((s, idx)=>{
      const def = (LANG==='en' ? (s.definition_en||'') : (s.definition_es||''));
      const defs = def ? `<p style="margin:.25rem 0;">${LANG==='en' ? `<em>${def}</em>` : def}</p>` : '';
      const eqs = (s.equivalents_en||[]).map(x=>`<li><em>${x}</em></li>`).join('');
      const related = (s.related_slugs||[]).map(rs=>{
        const label = (rs||'').replace(/-/g,' ');
        return `<a href="#" class="rg-pill rg-pill--accent rg-related-pill" style="text-decoration:none;" data-slug="${rs}">${label}</a>`;
      }).join(' ');
      const senseMeta = senseMetaRow(s);
      const senseVariants = variantsRow(s.variants, LANG);

      // Per-sense alternate forms, if any
      const sAlt = (s.alt_forms||[]).map(af => (af && af.form ? String(af.form).trim() : '')).filter(Boolean);
      const sAlso = sAlt.length ? `
        <div style="margin-top:.15rem;"><span style="color:#64748b;">${L('También:','Also:')}</span>
          <span style="color: var(--ppx-color-primary); font-weight:600;">${sAlt.join(', ')}</span>
        </div>` : '';

      sensesHtml += `
        <div class="ppx-card" style="padding:.75rem; margin-top:.5rem;">
          <div style="margin-bottom:.25rem; display:flex; align-items:center; gap:.35rem;"><strong>${idx+1}.</strong> ${s.pos ? `<em>${posLabel(s.pos, LANG)}</em>` : ''}</div>
          ${senseMeta}
          ${senseVariants}
          <div>${defs}</div>
          ${sAlso}
          <div style="margin-top:.5rem;">
            <strong><span style="display:inline-flex; align-items:center; gap:.35rem;"><img src="/static/assets/flags/usa.svg" alt="US" style="width:18px; height:12px; object-fit:cover; border:1px solid #e5e7eb;"><span>${L('Equivalentes en ingles','American English Equivalents')}</span></span></strong>
            <ul style="margin:.25rem 0 0 1rem;">${eqs || '<li><em>-</em></li>'}</ul>
          </div>
          ${related? `<div style="margin-top:.5rem; display:flex; gap:.35rem; flex-wrap:wrap; align-items:center;"><strong>${L('Entradas relacionadas','Related entries')}:</strong> ${related}</div>`: ''}
          ${renderExamplesForSense(s.examples, idx+1)}
        </div>`;
    });

    return `<div style="padding:6px 4px;">${header}${sensesHtml || '<div class="ppx-muted">No senses</div>'}</div>`;
  }

  async function open(slug){
    const safeSlug = normalizeSlug(slug);
    if (!safeSlug) return;
    openWorkspaceIfNeeded();
    try{
      // Always refresh latest entry (avoid stale cache after admin edits)
      try{ Cache.delete(safeSlug); }catch(_){ }
      const entry = await fetchEntry(safeSlug, ActiveLang);
      ensureTab(safeSlug, entry.word || safeSlug);
      Active = safeSlug;
      try{ if (window.localStorage) localStorage.setItem(STORAGE_KEY, safeSlug); }catch(_){}
      render();
      // Wire language select
      const sel = document.getElementById('glw-lang');
      if (sel){
        sel.addEventListener('change', async ()=>{
          const lang = sel.value || APP_LANG;
          ActiveLang = lang;
          saveEntryLang(lang);
          try{ Cache.delete(safeSlug); }catch(_){}
          const refreshed = await fetchEntry(safeSlug, lang);
          Cache.set(safeSlug, refreshed);
          render();
        });
      }
    }catch(e){
      ensureTab(safeSlug, safeSlug);
      Active = safeSlug;
      render();
      const pane = document.getElementById('glw-content');
      if (pane) pane.innerHTML = '<div class="ppx-muted">Not found</div>';
    }
  }

  function resume(){
    let slug = null;
    try{
      const params = new URLSearchParams(window.location.search);
      slug = params.get('entry');
      if (!slug && window.localStorage){
        slug = localStorage.getItem(STORAGE_KEY);
      }
    }catch(_){}
    const safe = normalizeSlug(slug);
    if (safe) open(safe);
  }

  window.Tabs = { open, activate, close, resume };
})();







