/* static/js/admin_builder_base.js */
(function(){
  const B = {};

  B.initStatusControl = function(doc, selectId){
    try {
      const sel = doc.getElementById(selectId || 'ex-status');
      if (!sel) return null;
      const allowed = ['draft','published','archived'];
      if (!allowed.includes(sel.value)) sel.value = 'draft';
      return sel;
    } catch(_) { return null; }
  };

  B.assembleBase = function(doc){
    const get = (id) => (doc.getElementById(id) || { value: '' }).value.trim();
    const title_es = get('ex-title-es');
    const title_en = get('ex-title-en');
    const instructions_es = get('ex-inst-es');
    const instructions_en = get('ex-inst-en');
    const level = (doc.getElementById('ex-level') || { value: 'A2' }).value || 'A2';
    let taxonomy_paths = [];
    try { const hidden = doc.querySelector('.ppx-taxonomy input[type=hidden]'); taxonomy_paths = hidden && hidden.value ? JSON.parse(hidden.value) : []; } catch(_){}
    const statusSel = doc.getElementById('ex-status');
    const status = statusSel ? (statusSel.value || 'draft') : 'draft';
    return { title_es, title_en, instructions_es, instructions_en, level, taxonomy_paths, status };
  };

  window.PPXBuilderBase = B;
})();

