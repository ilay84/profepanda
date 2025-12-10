/* static/js/admin_builder_ctc.js */

(function(){

  const D = document;

  function ready(fn){ if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }

  const t = (es, en) => { const lang=(window.PPX_I18N && PPX_I18N.currentLang)||D.documentElement.getAttribute('lang')||'es'; return lang.toLowerCase().startsWith('en')?(en??es):(es??en); };



  ready(() => {

    const form = D.getElementById('ppx-ctc-form');

    if (!form) return;



    const itemsWrap = D.getElementById('ppx-items');

    const itemTpl = D.getElementById('ppx-item-template');

    const btnAddItem = D.getElementById('ppx-add-item');

    const btnSave = D.getElementById('ppx-save-draft');

    const btnPreview = D.getElementById('ppx-preview');

    const btnExport = D.getElementById('ppx-export-json');

    const btnPublish = D.getElementById('ppx-publish');

    let btnJson = D.getElementById('ppx-edit-json');



    const inputSlug = D.getElementById('ex-slug');

    const inputTitleEs = D.getElementById('ex-title-es');

    const inputTitleEn = D.getElementById('ex-title-en');

    const taInstEs = D.getElementById('ex-inst-es');

    const taInstEn = D.getElementById('ex-inst-en');

    const selLevel = D.getElementById('ex-level');

    const selStatus = (window.PPXBuilderBase && PPXBuilderBase.initStatusControl(D,'ex-status')) || D.getElementById('ex-status');

    const inputTx = D.querySelector('.ppx-taxonomy input[type=hidden]');

    const builderMode = (form.getAttribute('data-builder-mode') || '').toLowerCase();



    const slugify = (s) => {

      try { return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-{2,}/g,'-').slice(0,80); }

      catch(_){ return String(s||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]+/g,'').slice(0,80); }

    };

    let slugManuallyEdited = false;

    if (inputSlug) {

      inputSlug.addEventListener('input', () => { slugManuallyEdited = true; });

      if (builderMode === 'edit' && inputSlug.value) slugManuallyEdited = true;

    }

    function autoSlugFromTitle(){

      if (slugManuallyEdited) return;

      const src = (inputTitleEs.value || inputTitleEn.value || '').trim();

      if (!src) return;

      const next = slugify(src);

      if (!next) return;

      inputSlug.value = next;

    }

    ['input','blur'].forEach(evt => {

      inputTitleEs?.addEventListener(evt, autoSlugFromTitle);

      inputTitleEn?.addEventListener(evt, autoSlugFromTitle);

    });

    // Prefill slug from URL in edit mode

    if (inputSlug && !inputSlug.value) {

      const m = location.pathname.match(/\/admin\/exercises\/ctc\/([^\/]+)\/edit/);

      if (m && m[1]) inputSlug.value = decodeURIComponent(m[1]);

    }

    if (inputSlug && inputSlug.value) slugManuallyEdited = true;



    function makeId(pfx){ return `${pfx}_${Math.random().toString(36).slice(2,8)}`; }



    function createContinuationRow(cont){

      const row = D.createElement('div');

      row.className = 'ppx-card';

      row.style.padding = '12px';

      row.style.display = 'flex';

      row.style.flexDirection = 'column';

      row.style.gap = '10px';

      row.dataset.contId = cont.id;

      row.setAttribute('data-cont-id', cont.id);



      const wrapText = D.createElement('div'); wrapText.className='ppx-col'; wrapText.style.gap='4px';

      const lblText = D.createElement('label'); lblText.className='ppx-label'; lblText.textContent = t('Texto de la continuaciÃ³n','Continuation text');

      const fEs = D.createElement('input'); fEs.className='ppx-input'; fEs.placeholder=t('Texto (ES o EN)','Text (ES or EN)'); fEs.value = cont.text_es || cont.text_en || '';

      // Hidden holder to preserve any existing EN text if present

      wrapText.appendChild(lblText); wrapText.appendChild(fEs);



      const wrapFbOk = D.createElement('div'); wrapFbOk.className='ppx-col'; wrapFbOk.style.gap='6px';

      const fbOkLbl = D.createElement('div'); fbOkLbl.className='ppx-label'; fbOkLbl.textContent = t('Feedback correcto','Correct feedback');

      const fbOkEsWrap = D.createElement('div'); fbOkEsWrap.className='ppx-row'; fbOkEsWrap.style.gap='6px'; fbOkEsWrap.style.alignItems='center';

      const fbOkEsTag = D.createElement('span'); fbOkEsTag.className='ppx-chip'; fbOkEsTag.textContent = 'ES';

      const fbOkEs = D.createElement('input'); fbOkEs.className='ppx-input'; fbOkEs.placeholder=t('Correcto, buena elecciÃ³n','Correct, good choice'); fbOkEs.value = cont.feedback_correct_es || '';

      fbOkEsWrap.appendChild(fbOkEsTag); fbOkEsWrap.appendChild(fbOkEs);

      const fbOkEnWrap = D.createElement('div'); fbOkEnWrap.className='ppx-row'; fbOkEnWrap.style.gap='6px'; fbOkEnWrap.style.alignItems='center';

      const fbOkEnTag = D.createElement('span'); fbOkEnTag.className='ppx-chip'; fbOkEnTag.textContent = 'EN';

      const fbOkEn = D.createElement('input'); fbOkEn.className='ppx-input'; fbOkEn.placeholder=t('Correct, good choice','Correct, good choice'); fbOkEn.value = cont.feedback_correct_en || '';

      fbOkEnWrap.appendChild(fbOkEnTag); fbOkEnWrap.appendChild(fbOkEn);

      wrapFbOk.appendChild(fbOkLbl); wrapFbOk.appendChild(fbOkEsWrap); wrapFbOk.appendChild(fbOkEnWrap);



      const wrapFbBad = D.createElement('div'); wrapFbBad.className='ppx-col'; wrapFbBad.style.gap='6px';

      const fbBadLbl = D.createElement('div'); fbBadLbl.className='ppx-label'; fbBadLbl.textContent = t('Feedback incorrecto','Incorrect feedback');

      const fbBadEsWrap = D.createElement('div'); fbBadEsWrap.className='ppx-row'; fbBadEsWrap.style.gap='6px'; fbBadEsWrap.style.alignItems='center';

      const fbBadEsTag = D.createElement('span'); fbBadEsTag.className='ppx-chip'; fbBadEsTag.textContent = 'ES';

      const fbBadEs = D.createElement('input'); fbBadEs.className='ppx-input'; fbBadEs.placeholder=t('No encaja con el enunciado','Does not fit the prompt'); fbBadEs.value = cont.feedback_incorrect_es || '';

      fbBadEsWrap.appendChild(fbBadEsTag); fbBadEsWrap.appendChild(fbBadEs);

      const fbBadEnWrap = D.createElement('div'); fbBadEnWrap.className='ppx-row'; fbBadEnWrap.style.gap='6px'; fbBadEnWrap.style.alignItems='center';

      const fbBadEnTag = D.createElement('span'); fbBadEnTag.className='ppx-chip'; fbBadEnTag.textContent = 'EN';

      const fbBadEn = D.createElement('input'); fbBadEn.className='ppx-input'; fbBadEn.placeholder=t('Does not fit the prompt','Does not fit the prompt'); fbBadEn.value = cont.feedback_incorrect_en || '';

      fbBadEnWrap.appendChild(fbBadEnTag); fbBadEnWrap.appendChild(fbBadEn);

      wrapFbBad.appendChild(fbBadLbl); wrapFbBad.appendChild(fbBadEsWrap); wrapFbBad.appendChild(fbBadEnWrap);



      const chkDecoy = D.createElement('label'); chkDecoy.className='ppx-chip';

      const decoyInput = D.createElement('input'); decoyInput.type='checkbox'; decoyInput.checked=!!cont.is_decoy;

      chkDecoy.appendChild(decoyInput); chkDecoy.appendChild(D.createTextNode(' '+t('Distractor','Decoy')));

      const btnDel = D.createElement('button'); btnDel.type='button'; btnDel.className='ppx-btn ppx-btn--ghost'; btnDel.textContent=t('Eliminar','Delete');



      row.appendChild(wrapText);

      row.appendChild(wrapFbOk);

      row.appendChild(wrapFbBad);

      row.appendChild(chkDecoy);

      row.appendChild(btnDel);



      btnDel.addEventListener('click', () => { row.remove(); refreshPromptSelects(row.closest('[data-item-card]')); });



      row._getData = () => ({

        id: row.dataset.contId || makeId('c'),

        text_es: fEs.value.trim(),

        feedback_correct_es: fbOkEs.value.trim(),

        feedback_correct_en: fbOkEn.value.trim(),

        feedback_incorrect_es: fbBadEs.value.trim(),

        feedback_incorrect_en: fbBadEn.value.trim(),

        is_decoy: !!decoyInput.checked

      });

      return row;

    }



    function createPromptRow(prompt, itemNode){

      const row = D.createElement('div');

      row.className = 'ppx-card';

      row.style.padding = '12px';

      row.style.display = 'flex';

      row.style.flexDirection = 'column';

      row.style.gap = '10px';

      row.dataset.promptId = prompt.id;

      row.setAttribute('data-prompt-id', prompt.id);



      function sanitizeHtml(html){

        const safe = String(html||'')

          .replace(/<(?!\/?(b|strong|i|em)\b)[^>]*>/gi, '') // allow only bold/italic tags

          .replace(/<div>/gi, '<br>')

          .replace(/<\/div>/gi, '');

        return safe;

      }



      const wrapPrompt = D.createElement('div'); wrapPrompt.className='ppx-col'; wrapPrompt.style.gap='6px';

      const lblPrompt = D.createElement('label'); lblPrompt.className='ppx-label'; lblPrompt.textContent = t('Enunciado (ES o EN)','Prompt (ES or EN)');

      const toolbar = D.createElement('div'); toolbar.className='ppx-row'; toolbar.style.gap='6px'; toolbar.style.alignItems='center';

      const btnBold = D.createElement('button'); btnBold.type='button'; btnBold.className='ppx-btn ppx-btn--ghost'; btnBold.textContent='B'; btnBold.style.fontWeight='700';

      const btnItalic = D.createElement('button'); btnItalic.type='button'; btnItalic.className='ppx-btn ppx-btn--ghost'; btnItalic.textContent='I'; btnItalic.style.fontStyle='italic';

      toolbar.appendChild(btnBold); toolbar.appendChild(btnItalic);

      const pEs = D.createElement('div'); pEs.className='ppx-textarea'; pEs.contentEditable='true'; pEs.style.minHeight='60px'; pEs.innerHTML = sanitizeHtml(prompt.prompt_es || prompt.prompt_en || '');

      pEs.dataset.rte = '1';

      const placeholder = t('Escribí el enunciado','Type the prompt');

      pEs.setAttribute('data-placeholder', placeholder);

      wrapPrompt.appendChild(lblPrompt);

      wrapPrompt.appendChild(toolbar);

      wrapPrompt.appendChild(pEs);

      function applyCmd(cmd){

        pEs.focus();

        try { document.execCommand(cmd, false, null); } catch(_){ }

        refreshActive();

      }

      function refreshActive(){

        try {

          btnBold.classList.toggle('is-active', document.queryCommandState('bold'));

          btnItalic.classList.toggle('is-active', document.queryCommandState('italic'));

        } catch(_){ }

      }

      btnBold.addEventListener('mousedown', e => { e.preventDefault(); applyCmd('bold'); });

      btnItalic.addEventListener('mousedown', e => { e.preventDefault(); applyCmd('italic'); });

      pEs.addEventListener('keyup', refreshActive);

      pEs.addEventListener('mouseup', refreshActive);

      pEs.addEventListener('blur', refreshActive);

      const wrapHint = D.createElement('div'); wrapHint.className='ppx-col'; wrapHint.style.gap='6px';

      const lblHint = D.createElement('label'); lblHint.className='ppx-label'; lblHint.textContent = t('Pista (opcional)','Hint (optional)');

      const hintEsWrap = D.createElement('div'); hintEsWrap.className='ppx-row'; hintEsWrap.style.gap='6px'; hintEsWrap.style.alignItems='center';

      const hintEsTag = D.createElement('span'); hintEsTag.className='ppx-chip'; hintEsTag.textContent = 'ES';

      const hintEs = D.createElement('input'); hintEs.className='ppx-input'; hintEs.placeholder=t('Pista','Hint'); hintEs.value = prompt.hint_es || '';

      hintEsWrap.appendChild(hintEsTag); hintEsWrap.appendChild(hintEs);

      const hintEnWrap = D.createElement('div'); hintEnWrap.className='ppx-row'; hintEnWrap.style.gap='6px'; hintEnWrap.style.alignItems='center';

      const hintEnTag = D.createElement('span'); hintEnTag.className='ppx-chip'; hintEnTag.textContent = 'EN';

      const hintEn = D.createElement('input'); hintEn.className='ppx-input'; hintEn.placeholder=t('Hint','Hint'); hintEn.value = prompt.hint_en || '';

      hintEnWrap.appendChild(hintEnTag); hintEnWrap.appendChild(hintEn);

      wrapHint.appendChild(lblHint); wrapHint.appendChild(hintEsWrap); wrapHint.appendChild(hintEnWrap);



      const wrapSelect = D.createElement('div'); wrapSelect.className='ppx-col'; wrapSelect.style.gap='4px';

      const lblSelect = D.createElement('label'); lblSelect.className='ppx-label'; lblSelect.textContent = t('ContinuaciÃ³n correcta','Correct continuation');

      const select = D.createElement('select'); select.className='ppx-select'; select.dataset.expectSel = '1';

      wrapSelect.appendChild(lblSelect); wrapSelect.appendChild(select);



      const wrapFbOk = D.createElement('div'); wrapFbOk.className='ppx-col'; wrapFbOk.style.gap='6px';

      const lblFbOk = D.createElement('label'); lblFbOk.className='ppx-label'; lblFbOk.textContent = t('Feedback correcto','Correct feedback');

      const fbOkEsWrap = D.createElement('div'); fbOkEsWrap.className='ppx-row'; fbOkEsWrap.style.gap='6px'; fbOkEsWrap.style.alignItems='center';

      const fbOkEsTag = D.createElement('span'); fbOkEsTag.className='ppx-chip'; fbOkEsTag.textContent = 'ES';

      const fbOkEs = D.createElement('input'); fbOkEs.className='ppx-input'; fbOkEs.placeholder=t('Â¡Bien!','Nice!'); fbOkEs.value = prompt.feedback_correct_es || '';

      fbOkEsWrap.appendChild(fbOkEsTag); fbOkEsWrap.appendChild(fbOkEs);

      const fbOkEnWrap = D.createElement('div'); fbOkEnWrap.className='ppx-row'; fbOkEnWrap.style.gap='6px'; fbOkEnWrap.style.alignItems='center';

      const fbOkEnTag = D.createElement('span'); fbOkEnTag.className='ppx-chip'; fbOkEnTag.textContent = 'EN';

      const fbOkEn = D.createElement('input'); fbOkEn.className='ppx-input'; fbOkEn.placeholder=t('Nice!','Nice!'); fbOkEn.value = prompt.feedback_correct_en || '';

      fbOkEnWrap.appendChild(fbOkEnTag); fbOkEnWrap.appendChild(fbOkEn);

      wrapFbOk.appendChild(lblFbOk); wrapFbOk.appendChild(fbOkEsWrap); wrapFbOk.appendChild(fbOkEnWrap);



      const wrapFbBad = D.createElement('div'); wrapFbBad.className='ppx-col'; wrapFbBad.style.gap='6px';

      const lblFbBad = D.createElement('label'); lblFbBad.className='ppx-label'; lblFbBad.textContent = t('Feedback incorrecto','Incorrect feedback');

      const fbBadEsWrap = D.createElement('div'); fbBadEsWrap.className='ppx-row'; fbBadEsWrap.style.gap='6px'; fbBadEsWrap.style.alignItems='center';

      const fbBadEsTag = D.createElement('span'); fbBadEsTag.className='ppx-chip'; fbBadEsTag.textContent = 'ES';

      const fbBadEs = D.createElement('input'); fbBadEs.className='ppx-input'; fbBadEs.placeholder=t('RevisÃ¡ el contexto','Check the context'); fbBadEs.value = prompt.feedback_incorrect_es || '';

      fbBadEsWrap.appendChild(fbBadEsTag); fbBadEsWrap.appendChild(fbBadEs);

      const fbBadEnWrap = D.createElement('div'); fbBadEnWrap.className='ppx-row'; fbBadEnWrap.style.gap='6px'; fbBadEnWrap.style.alignItems='center';

      const fbBadEnTag = D.createElement('span'); fbBadEnTag.className='ppx-chip'; fbBadEnTag.textContent = 'EN';

      const fbBadEn = D.createElement('input'); fbBadEn.className='ppx-input'; fbBadEn.placeholder=t('Check the context','Check the context'); fbBadEn.value = prompt.feedback_incorrect_en || '';

      fbBadEnWrap.appendChild(fbBadEnTag); fbBadEnWrap.appendChild(fbBadEn);

      wrapFbBad.appendChild(lblFbBad); wrapFbBad.appendChild(fbBadEsWrap); wrapFbBad.appendChild(fbBadEnWrap);



      const btnDel = D.createElement('button'); btnDel.type='button'; btnDel.className='ppx-btn ppx-btn--ghost'; btnDel.textContent=t('Eliminar','Delete');



      row.appendChild(wrapPrompt);

      row.appendChild(wrapHint);

      row.appendChild(wrapSelect);

      row.appendChild(wrapFbOk);

      row.appendChild(wrapFbBad);

      row.appendChild(btnDel);



      btnDel.addEventListener('click', () => {

        row.remove();

        refreshPromptSelects(itemNode);

        updateItemTitle(itemNode);

      });

      pEs.addEventListener('input', () => updateItemTitle(itemNode));


      row._getData = () => ({
        id: row.dataset.promptId || makeId('p'),
        prompt_es: sanitizeHtml(pEs.innerHTML || '').trim(),
        prompt_en: '',
        hint_es: hintEs.value.trim(),
        hint_en: hintEn.value.trim(),

        feedback_correct_es: fbOkEs.value.trim(),

        feedback_correct_en: fbOkEn.value.trim(),

        feedback_incorrect_es: fbBadEs.value.trim(),

        feedback_incorrect_en: fbBadEn.value.trim(),

        expects: select.value || ''

      });

      row._select = select;

      return row;

    }



    function refreshPromptSelects(itemNode){

      if (!itemNode) return;

      const conts = Array.from(itemNode.querySelectorAll('[data-cont-id]')).map(n => {

        const data = n._getData ? n._getData() : { id: n.dataset.contId, text_es: '' };

        return data;

      });

      const opts = conts.map(c => ({ id: c.id || '', label: c.text_es || c.id || '' })).filter(o => o.id);

      itemNode.querySelectorAll('select[data-expect-sel]').forEach(sel => {

        const current = sel.value;

        sel.innerHTML = '';

        opts.forEach(o => {

          const opt = D.createElement('option');

          opt.value = o.id; opt.textContent = o.label || o.id;

          sel.appendChild(opt);

        });

        if (current && opts.some(o=>o.id===current)) sel.value = current;

        else if (!sel.value && opts[0]) sel.value = opts[0].id;

      });

    }



    function updateItemTitle(itemNode){
      try {
        const title = itemNode.querySelector('.ppx-item-title');
        if (!title) return;
        const firstPrompt = itemNode.querySelector('[data-prompts] [data-rte]');
        const txt = (firstPrompt && firstPrompt.textContent || '').trim();
        title.textContent = txt || t('Nuevo item','New item');
      } catch(_){}
    }


    function addContinuation(itemNode, pref={}){

      const contsWrap = itemNode.querySelector('[data-conts]');

      const row = createContinuationRow({

        id: pref.id || makeId('c'),

        text_es: pref.text_es || pref.text_en || '',

        is_decoy: !!pref.is_decoy

      });

      contsWrap.appendChild(row);

      refreshPromptSelects(itemNode);

      return row;

    }



    function addPrompt(itemNode, pref={}){

      const promptsWrap = itemNode.querySelector('[data-prompts]');

      const row = createPromptRow({

        id: pref.id || makeId('p'),

        prompt_es: pref.prompt_es || '',

        prompt_en: pref.prompt_en || '',

        hint_es: pref.hint_es || '',

        hint_en: pref.hint_en || '',

        feedback_correct_es: pref.feedback_correct_es || '',

        feedback_correct_en: pref.feedback_correct_en || '',

        feedback_incorrect_es: pref.feedback_incorrect_es || '',

        feedback_incorrect_en: pref.feedback_incorrect_en || '',

        expects: pref.expects || ''

      }, itemNode);

      promptsWrap.appendChild(row);

      row._pendingExpect = pref.expects || '';

      refreshPromptSelects(itemNode);

      if (row._pendingExpect) {

        const sel = row._select;

        if (sel && Array.from(sel.options).some(o => o.value === row._pendingExpect)) sel.value = row._pendingExpect;

      }

      updateItemTitle(itemNode);

      return row;

    }



    function addItem(pref={}){

      if (!itemTpl || !itemsWrap) return null;

      const frag = itemTpl.content.cloneNode(true);

      const node = frag.querySelector('[data-item-card]');

      node.dataset.id = pref.id || makeId('item');
      node.open = false;

      const btnAddPrompt = node.querySelector('[data-add-prompt]');

      const btnAddCont = node.querySelector('[data-add-cont]');

      btnAddPrompt?.addEventListener('click', ()=> addPrompt(node, {}));

      btnAddCont?.addEventListener('click', ()=> addContinuation(node, {}));

      itemsWrap.appendChild(frag);

      // Seed defaults

      const conts = Array.isArray(pref.continuations) && pref.continuations.length ? pref.continuations : [

        { id: makeId('c'), text_es: t('ContinuaciÃ³n 1','Continuation 1') },

        { id: makeId('c'), text_es: t('ContinuaciÃ³n 2','Continuation 2') }

      ];

      conts.forEach(c => addContinuation(node, c));

      const prompts = Array.isArray(pref.prompts) && pref.prompts.length ? pref.prompts : [

        { id: makeId('p'), prompt_es: t('Primer enunciado','First prompt'), expects: conts[0].id },

        { id: makeId('p'), prompt_es: t('Segundo enunciado','Second prompt'), expects: conts[1].id }

      ];

      prompts.forEach(p => addPrompt(node, p));

      renumber();

      return node;

    }



    function renumber(){

      itemsWrap.querySelectorAll(':scope > details[data-item-card]').forEach((det, idx) => {

        const h = det.querySelector('[data-item-handle]');

        if (h) h.textContent = `#${idx+1}`;

      });

    }



    function collect(){

      autoSlugFromTitle();

      const slug = slugify((inputSlug.value || '').trim() || (inputTitleEs.value || inputTitleEn.value || '').trim());

      if (!inputSlug.value && slug) inputSlug.value = slug;

      const items = [];

      let order = 1;

      itemsWrap.querySelectorAll(':scope > details[data-item-card]').forEach(det => {

        const conts = Array.from(det.querySelectorAll('[data-cont-id]')).map(n => n._getData ? n._getData() : null).filter(Boolean);

        const prompts = Array.from(det.querySelectorAll('[data-prompts] > .ppx-card')).map(n => n._getData ? n._getData() : null).filter(Boolean);

        prompts.forEach((p, i) => p.order = i+1);

        items.push({

          id: det.dataset.id || makeId('item'),

          order: order++,

          prompts,

          continuations: conts

        });

      });

      let taxonomy_paths = [];

      try { taxonomy_paths = inputTx && inputTx.value ? JSON.parse(inputTx.value) : []; } catch(_){}

      return {

        id: slug ? `ctc/${slug}` : '',

        type: 'ctc',

        slug,

        version: 1,

        title_es: (inputTitleEs.value||'').trim(),

        title_en: (inputTitleEn.value||'').trim(),

        instructions_es: (taInstEs.value||'').trim() || 'ArrastrÃ¡ la continuaciÃ³n mÃ¡s lÃ³gica debajo de cada oraciÃ³n.',

        instructions_en: (taInstEn.value||'').trim() || 'Drag the most logical continuation under each sentence.',

        level: selLevel.value || 'A2',

        taxonomy_paths,

        status: selStatus ? (selStatus.value || 'draft') : 'draft',

        items,

        created_by: 'admin',

        created_at: new Date().toISOString()

      };

    }



    function validatePayload(p){

      const errs = [];

      if (!p.slug) errs.push(t('Falta el slug.','Slug is required.'));

      if (!p.title_es && !p.title_en) errs.push(t('Falta el tÃ­tulo.','Title is required.'));

      if (!(p.instructions_es || p.instructions_en)) errs.push(t('Faltan instrucciones.','Instructions required.'));

      if (!Array.isArray(p.items) || !p.items.length) errs.push(t('AgregÃ¡ al menos un item.','Add at least one item.'));

      (p.items||[]).forEach((it, idx) => {

        if (!Array.isArray(it.prompts) || it.prompts.length < 2) errs.push(t(`Item ${idx+1}: mÃ­nimo 2 enunciados.`,`Item ${idx+1}: at least 2 prompts.`));

        if (!Array.isArray(it.continuations) || it.continuations.length < 2) errs.push(t(`Item ${idx+1}: mÃ­nimo 2 continuaciones.`,`Item ${idx+1}: at least 2 continuations.`));

        const contIds = new Set((it.continuations||[]).map(c => c.id).filter(Boolean));

        if (Array.isArray(it.prompts)) {

          it.prompts.forEach((pr, pi) => {

            if (!(pr.prompt_es || pr.prompt_en)) errs.push(t(`Item ${idx+1}, enunciado ${pi+1}: falta texto.`,`Item ${idx+1}, prompt ${pi+1}: text required.`));

            if (!pr.expects) errs.push(t(`Item ${idx+1}, enunciado ${pi+1}: elegÃ­ una continuaciÃ³n.`,`Item ${idx+1}, prompt ${pi+1}: choose a continuation.`));

            else if (contIds.size && !contIds.has(pr.expects)) errs.push(t(`Item ${idx+1}, enunciado ${pi+1}: continuaciÃ³n invÃ¡lida.`,`Item ${idx+1}, prompt ${pi+1}: invalid continuation.`));

          });

        }

        if (Array.isArray(it.continuations) && Array.isArray(it.prompts) && it.continuations.length < it.prompts.length) {

          errs.push(t(`Item ${idx+1}: sumÃ¡ mÃ¡s continuaciones (hay mÃ¡s enunciados que pÃ­ldoras).`,`Item ${idx+1}: need at least as many continuations as prompts.`));

        }

      });

      return errs;

    }



    async function savePayload(statusOverride){

      const payload = collect();

      if (statusOverride) payload.status = statusOverride;

      const errs = validatePayload(payload);

      if (errs.length){ alert(errs.join('\n')); return; }

      const isEdit = (form.getAttribute('data-builder-mode')||'').toLowerCase() === 'edit' && payload.slug;

      const url = isEdit ? `/admin/api/exercises/${encodeURIComponent('ctc')}/${encodeURIComponent(payload.slug)}` : '/admin/api/exercises';

      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(payload) });

      if (!res.ok){ const j = await res.json().catch(()=>({})); alert(j.error || `HTTP ${res.status}`); return; }

      const j = await res.json().catch(()=>({}));

      alert(t('Guardado.','Saved.'));

      return j.data || payload;

    }



    function preview(){

      const payload = collect();

      const errs = validatePayload(payload);

      if (errs.length){ alert(errs.join('\n')); return; }

      const url = `/admin/api/exercises/ctc/${encodeURIComponent(payload.slug)}`;

      const origFetch = window.fetch;

      let armed = true;

      window.fetch = async function(input, init){

        try {

          const req = (typeof input === 'string') ? input : input.url;

          if (armed && req && req.startsWith(url)) {

            return new Response(JSON.stringify(payload), { status:200, headers:{'Content-Type':'application/json'} });

          }

        } catch(_){}

        return origFetch.apply(this, arguments);

      };

      const onClose = ()=>{ armed=false; window.fetch=origFetch; window.removeEventListener('ppx:modal:close', onClose); };

      window.addEventListener('ppx:modal:close', onClose);

      try { window.PPX.openExercise({ type:'ctc', slug: payload.slug, lang: (window.PPX_I18N && PPX_I18N.currentLang)||'es', context:{ source:'admin-preview' } }); }

      catch(e){ console.error(e); onClose(); alert(t('No se pudo abrir la vista previa.','Could not open preview.')); }

    }



    function exportJson(){

      const payload = collect();

      const errs = validatePayload(payload);

      if (errs.length){ alert(errs.join('\n')); return; }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });

      const a = D.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${payload.slug || 'ctc'}.json`; a.click(); URL.revokeObjectURL(a.href);

    }



    // JSON button with icon

    (function ensureJsonBtn(){

      try {

        if (!btnJson) {

          btnJson = D.createElement('button');

          btnJson.type = 'button';

          btnJson.id = 'ppx-edit-json';

          btnJson.className = 'ppx-btn';

          if (btnExport && btnExport.parentNode) btnExport.parentNode.insertBefore(btnJson, btnExport.nextSibling);

          else form.appendChild(btnJson);

        }

        const icon = btnJson.querySelector('img[src*="json.svg"]') || (() => {

          const i = D.createElement('img'); i.src='/static/assets/icons/json.svg'; i.alt=''; i.width=18; i.height=18; return i;

        })();

        const label = btnJson.querySelector('span') || (() => { const l = D.createElement('span'); return l; })();

        label.textContent = 'JSON';

        btnJson.textContent = '';

        btnJson.appendChild(icon); btnJson.appendChild(label);

        btnJson.style.display='inline-flex';

        btnJson.style.alignItems='center';

        btnJson.style.gap='6px';

        btnJson.style.padding='6px 10px';

        btnJson.style.borderRadius='10px';

      } catch(_){}

    })();



    btnJson?.addEventListener('click', () => {

      const payload = collect();

      const errs = validatePayload(payload);

      if (errs.length){ alert(errs.join('\n')); return; }

      if (window.PPXJsonEditor && typeof window.PPXJsonEditor.open === 'function') {

        window.PPXJsonEditor.open({

          exerciseType: 'ctc',

          slug: payload.slug,

          title: payload.title_es || payload.title_en || payload.slug,

          level: payload.level,

          initialData: payload,

          validate: (obj) => validatePayload(obj),

          apply: (obj) => applyJsonToBuilder(obj)

        });

        return;

      }

      // Fallback simple textarea modal

      const ta = D.createElement('textarea'); ta.className='ppx-textarea'; ta.style.width='100%'; ta.style.minHeight='60vh'; ta.value = JSON.stringify(payload, null, 2);

      const card = D.createElement('div'); card.className='ppx-card'; card.style.padding='12px'; card.appendChild(ta);

      const row = D.createElement('div'); row.className='ppx-row'; row.style.gap='8px'; row.style.justifyContent='flex-end';

      const btnCancel = D.createElement('button'); btnCancel.className='ppx-btn ppx-btn--ghost'; btnCancel.textContent=t('Cancelar','Cancel');

      const btnApply = D.createElement('button'); btnApply.className='ppx-btn ppx-btn--primary'; btnApply.textContent=t('Aplicar','Apply');

      row.appendChild(btnCancel); row.appendChild(btnApply); card.appendChild(row);

      const modal = D.createElement('div'); modal.className='ppx-modal'; modal.style.position='fixed'; modal.style.inset='0'; modal.style.background='rgba(0,0,0,.45)'; modal.style.zIndex='2500'; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center'; modal.appendChild(card);

      D.body.appendChild(modal);

      btnCancel.addEventListener('click', ()=> modal.remove());

      btnApply.addEventListener('click', () => {

        try {

          const obj = JSON.parse(ta.value);

          const errs2 = validatePayload(obj);

          if (errs2.length) { alert(errs2.join('\\n')); return; }

          applyJsonToBuilder(obj);

          modal.remove();

        } catch(e){ alert(t('JSON invÃ¡lido','Invalid JSON')); }

      });

    });



    btnSave?.addEventListener('click', () => savePayload(selStatus ? selStatus.value : 'draft'));

    btnPublish?.addEventListener('click', async () => {

      const saved = await savePayload('published');

      if (saved && selStatus) selStatus.value = 'published';

    });

    btnAddItem?.addEventListener('click', () => {

      const node = addItem({});

      if (node) {

        node.open = true;

        try { node.scrollIntoView({ behavior:'smooth', block:'start' }); } catch(_){}

      }

    });

    btnPreview?.addEventListener('click', preview);

    btnExport?.addEventListener('click', exportJson);



    function applyJsonToBuilder(data){

      try {

        inputSlug.value = data.slug || '';

        inputTitleEs.value = data.title_es || '';

        inputTitleEn.value = data.title_en || '';

        taInstEs.value = data.instructions_es || '';

        taInstEn.value = data.instructions_en || '';

        selLevel.value = data.level || 'A2';

        if (selStatus) selStatus.value = data.status || 'draft';

        if (inputTx) {

          inputTx.value = JSON.stringify(data.taxonomy_paths || []);

          inputTx.dispatchEvent(new CustomEvent('ppx:taxonomy:set', { bubbles:true, detail:{ paths: data.taxonomy_paths || [] } }));

        }

        itemsWrap.innerHTML = '';
        // Collapse all item accordions by default on load
        itemsWrap.querySelectorAll('details').forEach(d => d.open = false);

        const items = Array.isArray(data.items) ? data.items.slice().sort((a,b)=> (a.order||0)-(b.order||0)) : [];

        if (!items.length) { addItem({}); renumber(); itemsWrap.querySelectorAll('details').forEach(d => d.open=false); return; }

        items.forEach(it => {

          const node = addItem({

            id: it.id,

            prompts: Array.isArray(it.prompts) ? it.prompts : [],

            continuations: Array.isArray(it.continuations) ? it.continuations : []

          });

          if (node) {
            node.open = false;

            updateItemTitle(node);

          }

        });

        renumber();

      } catch(e){ console.error(e); }

    }



    // Prefill if provided

    if (window.__CTC_PREFILL) {

      applyJsonToBuilder(window.__CTC_PREFILL);

    } else {

      addItem({});

      renumber();

    }

  });

})();
