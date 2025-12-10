/* static/js/admin_builder_matching.js */
(function(){
  const D = document;
  const t = (es, en) => {
    const lang = (window.PPX_I18N && PPX_I18N.currentLang) || D.documentElement.getAttribute('lang') || 'es';
    return lang.toLowerCase().startsWith('en') ? (en ?? es) : (es ?? en);
  };

  function ready(fn){ if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(() => {
    const form = D.getElementById('ppx-matching-form');
    if (!form) return;

    const inputSlug = D.getElementById('ex-slug');
    const inputTitleEs = D.getElementById('ex-title-es');
    const inputTitleEn = D.getElementById('ex-title-en');
    const taInstEs = D.getElementById('ex-inst-es');
    const taInstEn = D.getElementById('ex-inst-en');
    const selLevel = D.getElementById('ex-level');
    const selStatus = D.getElementById('ex-status');
    const txInput = D.querySelector('.ppx-taxonomy input[type=hidden]');
    const btnAdd = D.getElementById('matching-add');
    const btnSave = D.getElementById('matching-save');
    const btnPublish = D.getElementById('matching-publish');
    const btnPreview = D.getElementById('matching-preview');
    const btnExport = D.getElementById('matching-export');
    const btnJson = D.getElementById('ppx-edit-json');
    const itemsWrap = D.getElementById('matching-items');

    const builderMode = (form.getAttribute('data-builder-mode') || '').toLowerCase();
    let slugManuallyEdited = false;

    function slugify(s){
      try { return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-{2,}/g,'-').slice(0,80); }
      catch(_){ return String(s||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]+/g,'').slice(0,80); }
    }

    if (inputSlug) {
      inputSlug.addEventListener('input', () => { slugManuallyEdited = true; });
      if (builderMode === 'edit' && inputSlug.value) slugManuallyEdited = true;
    }
    function autoSlugFromTitle(){
      if (slugManuallyEdited) return;
      const src = (inputTitleEs?.value || inputTitleEn?.value || '').trim();
      if (!src) return;
      const next = slugify(src);
      if (next) inputSlug.value = next;
    }
    ['input','blur'].forEach(evt => {
      inputTitleEs?.addEventListener(evt, autoSlugFromTitle);
      inputTitleEn?.addEventListener(evt, autoSlugFromTitle);
    });

    function makeId(){ return 'pair_' + Math.random().toString(36).slice(2,8); }

    function createRow(data){
      const row = D.createElement('div');
      row.className = 'ppx-card';
      row.style.padding = '12px';
      row.style.display = 'flex';
      row.style.flexDirection = 'column';
      row.style.gap = '10px';
      row.dataset.itemRow = '1';
      row.dataset.itemId = data?.id || makeId();

      const top = D.createElement('div');
      top.className = 'ppx-row';
      top.style.gap = '10px';
      top.style.flexWrap = 'wrap';
      const orderField = D.createElement('div');
      orderField.className = 'ppx-field';
      orderField.style.minWidth = '120px';
      orderField.innerHTML = `<label>${t('Orden','Order')}</label><input type="number" min="1" class="ppx-input matching-order" value="${Number(data?.order ?? (itemsWrap.children.length+1))}">`;
      const actions = D.createElement('div');
      actions.className = 'ppx-row';
      actions.style.gap = '8px';
      actions.style.alignItems = 'flex-end';
      const btnRemove = D.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'ppx-btn ppx-btn--ghost';
      btnRemove.textContent = t('Eliminar','Remove');
      btnRemove.addEventListener('click', ()=> row.remove());
      actions.appendChild(btnRemove);
      top.appendChild(orderField);
      top.appendChild(actions);

      const pairRow = D.createElement('div');
      pairRow.className = 'ppx-row';
      pairRow.style.gap = '10px';
      pairRow.style.flexWrap = 'wrap';
      pairRow.innerHTML = `
        <div class="ppx-field" style="flex:1; min-width:240px;">
          <label>${t('Izquierda','Left')}</label>
          <input type="text" class="ppx-input matching-left" value="${data?.left || ''}" placeholder="${t('Texto columna izquierda','Left column text')}">
        </div>
        <div class="ppx-field" style="flex:1; min-width:240px;">
          <label>${t('Derecha','Right')}</label>
          <input type="text" class="ppx-input matching-right" value="${data?.right || ''}" placeholder="${t('Texto columna derecha','Right column text')}">
        </div>
      `;

      const adv = D.createElement('details');
      adv.className = 'ppx-col';
      adv.style.gap = '8px';
      const summary = D.createElement('summary');
      summary.textContent = t('Pistas y retroalimentación (opcional)','Hints and feedback (optional)');
      adv.appendChild(summary);
      const fields = [
        { cls:'matching-hint-es', label:t('Pista (ES)','Hint (ES)'), val:data?.hint_es||'' },
        { cls:'matching-hint-en', label:t('Pista (EN)','Hint (EN)'), val:data?.hint_en||'' },
        { cls:'matching-fc-es', label:t('Feedback correcto (ES)','Correct feedback (ES)'), val:data?.feedback_correct_es||'' },
        { cls:'matching-fc-en', label:t('Feedback correcto (EN)','Correct feedback (EN)'), val:data?.feedback_correct_en||'' },
      ];
      fields.forEach(f=>{
        const wrap = D.createElement('div');
        wrap.className='ppx-field';
        wrap.innerHTML = `<label>${f.label}</label><input type="text" class="ppx-input ${f.cls}" value="${f.val||''}">`;
        adv.appendChild(wrap);
      });

      row.appendChild(top);
      row.appendChild(pairRow);
      row.appendChild(adv);
      return row;
    }

    function collectItems(){
      const rows = Array.from(itemsWrap.querySelectorAll('[data-item-row]'));
      const list = [];
      rows.forEach((row, idx) => {
        const order = Number(row.querySelector('.matching-order')?.value || (idx+1));
        const left = (row.querySelector('.matching-left')?.value || '').trim();
        const right = (row.querySelector('.matching-right')?.value || '').trim();
        const item = {
          id: row.dataset.itemId || makeId(),
          order: order,
          left,
          right
        };
        const hint_es = row.querySelector('.matching-hint-es')?.value.trim();
        const hint_en = row.querySelector('.matching-hint-en')?.value.trim();
        const fc_es = row.querySelector('.matching-fc-es')?.value.trim();
        const fc_en = row.querySelector('.matching-fc-en')?.value.trim();
        if (hint_es) item.hint_es = hint_es;
        if (hint_en) item.hint_en = hint_en;
        if (fc_es) item.feedback_correct_es = fc_es;
        if (fc_en) item.feedback_correct_en = fc_en;
        list.push(item);
      });
      return list.sort((a,b)=> (a.order||0)-(b.order||0));
    }

    function parseTaxonomy(){
      try { return JSON.parse(txInput?.value || '[]'); } catch(_){ return []; }
    }

    function serializePayload(){
      const slug = (inputSlug?.value || '').trim().toLowerCase();
      const items = collectItems();
      return {
        type: 'matching',
        slug,
        title_es: (inputTitleEs?.value || '').trim(),
        title_en: (inputTitleEn?.value || '').trim(),
        instructions_es: (taInstEs?.value || '').trim(),
        instructions_en: (taInstEn?.value || '').trim(),
        level: selLevel?.value || '',
        taxonomy_paths: parseTaxonomy(),
        status: selStatus?.value || 'draft',
        media: (window.PPX_PREFILL && Array.isArray(window.PPX_PREFILL.media)) ? window.PPX_PREFILL.media : [],
        items
      };
    }

    function showToast(msg){ try { window.PPXToast && PPXToast.info(msg); } catch(_){ alert(msg); } }

    async function savePayload(opts={}){
      const payload = serializePayload();
      if (!payload.slug){
        alert(t('Completa el slug.','Fill in the slug.'));
        return null;
      }
      if (!payload.items || !payload.items.length){
        alert(t('Agrega al menos un par.','Add at least one pair.'));
        return null;
      }
      const isEdit = (window.PPX_BUILDER && window.PPX_BUILDER.mode === 'edit') || builderMode === 'edit';
      const url = isEdit ? `/admin/api/exercises/matching/${encodeURIComponent(payload.slug)}` : '/admin/api/exercises';
      const method = isEdit ? 'PUT' : 'POST';
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || data.ok === false){
          const err = (data && (data.error || data.errors)) || res.statusText;
          throw new Error(err);
        }
        if (window.PPX_BUILDER){ window.PPX_BUILDER.mode = 'edit'; window.PPX_BUILDER.slug = payload.slug; }
        showToast(t('Guardado.','Saved.'));
        return data.data || payload;
      } catch(err){
        console.error(err);
        alert(t('No se pudo guardar: ','Save failed: ')+ String(err && err.message || err));
        return null;
      }
    }

    async function publish(){
      const saved = await savePayload();
      if (!saved) return;
      try {
        const url = `/admin/api/exercises/matching/${encodeURIComponent(saved.slug)}/publish`;
        const res = await fetch(url, { method:'POST', credentials:'same-origin' });
        const data = await res.json();
        if (!res.ok || data.ok === false){
          throw new Error((data && data.error) || res.statusText);
        }
        selStatus.value = 'published';
        showToast(t('Publicado.','Published.'));
      } catch(err){
        console.error(err);
        alert(t('No se pudo publicar: ','Publish failed: ')+ String(err && err.message || err));
      }
    }

    async function preview(){
      const saved = await savePayload();
      if (!saved) return;
      try {
        const lang = (window.PPX_I18N && PPX_I18N.currentLang) || 'es';
        window.PPX && window.PPX.openExercise({ type:'matching', slug: saved.slug, lang, context:{ source:'admin-preview' } });
      } catch(err){
        console.error(err);
      }
    }

    function exportJson(){
      const payload = serializePayload();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
      const a = D.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${payload.slug || 'matching'}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    // Prefill if provided
    (function prefill(){
      const pre = (window.PPX_PREFILL && typeof window.PPX_PREFILL === 'object') ? window.PPX_PREFILL : null;
      if (!pre) return;
      try { if (inputSlug && pre.slug) { inputSlug.value = pre.slug; slugManuallyEdited = true; } } catch(_){}
      try { if (inputTitleEs) inputTitleEs.value = pre.title_es || ''; } catch(_){}
      try { if (inputTitleEn) inputTitleEn.value = pre.title_en || ''; } catch(_){}
      try { if (taInstEs) taInstEs.value = pre.instructions_es || ''; } catch(_){}
      try { if (taInstEn) taInstEn.value = pre.instructions_en || ''; } catch(_){}
      try { if (selLevel && pre.level) selLevel.value = pre.level; } catch(_){}
      try { if (selStatus && pre.status) selStatus.value = pre.status; } catch(_){}
      try { if (txInput && pre.taxonomy_paths) txInput.value = JSON.stringify(pre.taxonomy_paths); } catch(_){}
      if (Array.isArray(pre.items)){
        pre.items.sort((a,b)=> (a.order||0)-(b.order||0)).forEach(it => itemsWrap.appendChild(createRow(it)));
      }
    })();

    // Seed default rows if empty
    if (!itemsWrap.children.length){
      itemsWrap.appendChild(createRow({ order:1 }));
      itemsWrap.appendChild(createRow({ order:2 }));
    }

    btnAdd?.addEventListener('click', ()=> itemsWrap.appendChild(createRow({})));
    btnSave?.addEventListener('click', ()=> savePayload());
    btnPublish?.addEventListener('click', publish);
    btnPreview?.addEventListener('click', preview);
    btnExport?.addEventListener('click', exportJson);
    if (btnJson) {
      btnJson.addEventListener('click', async () => {
        const slug = (inputSlug?.value || '').trim();
        if (!slug){
          alert(t('Completa el slug para editar JSON.','Fill in the slug before editing JSON.'));
          return;
        }
        let value = serializePayload();
        try {
          const res = await fetch(`/admin/api/exercises/matching/${encodeURIComponent(slug)}?version=current`, { credentials:'same-origin' });
          const data = await res.json();
          if (res.ok && data && data.data) value = data.data;
        } catch(_){}
        window.PPXJsonEditor && window.PPXJsonEditor.open({
          exerciseType: 'matching',
          slug,
          title: value.title_es || value.title_en || slug,
          level: value.level || (selLevel ? selLevel.value : ''),
          initialData: value,
          validate: (obj) => !!obj && typeof obj === 'object' && Array.isArray(obj.items),
          apply: (val) => {
            if (val && typeof val === 'object'){
              window.PPX_PREFILL = val;
              try { itemsWrap.innerHTML=''; (val.items||[]).forEach(it=> itemsWrap.appendChild(createRow(it))); } catch(_){}
              try { if (inputTitleEs && val.title_es!==undefined) inputTitleEs.value = val.title_es; } catch(_){}
              try { if (inputTitleEn && val.title_en!==undefined) inputTitleEn.value = val.title_en; } catch(_){}
              try { if (taInstEs && val.instructions_es!==undefined) taInstEs.value = val.instructions_es; } catch(_){}
              try { if (taInstEn && val.instructions_en!==undefined) taInstEn.value = val.instructions_en; } catch(_){}
              try { if (selLevel && val.level!==undefined) selLevel.value = val.level; } catch(_){}
              try { if (selStatus && val.status!==undefined) selStatus.value = val.status; } catch(_){}
              try { if (txInput && val.taxonomy_paths!==undefined) txInput.value = JSON.stringify(val.taxonomy_paths||[]); } catch(_){}
              slugManuallyEdited = true;
            }
          }
        });
      });
    }
  });
})();
