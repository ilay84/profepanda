/* static/js/admin_rte.js
   Lightweight rich-text helper for admin instruction fields.
   Features: bold, italic, bullet list. Syncs back to the original <textarea>.
*/
(function(){
  const D = document;
  function ready(fn){ if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }

  function createBtn(label, cmd, title){
    const b = D.createElement('button');
    b.type = 'button';
    b.className = 'ppx-btn ppx-btn--ghost';
    b.style.padding = '4px 8px';
    b.style.minWidth = '32px';
    b.style.borderRadius = '8px';
    b.textContent = label;
    if (title) b.title = title;
    b.dataset.cmd = cmd;
    return b;
  }

  function setActive(btn, active){
    btn.classList.toggle('is-active', !!active);
    btn.style.background = active ? '#e8ecff' : '';
    btn.style.borderColor = active ? '#475dd7' : '';
    btn.style.color = active ? '#1f2a63' : '';
  }

  function initRTE(textarea){
    if (!textarea || textarea.dataset.rteInit === '1') return;
    textarea.dataset.rteInit = '1';
    textarea.style.display = 'none';

    const wrap = D.createElement('div');
    wrap.className = 'ppx-card';
    wrap.style.padding = '8px';
    wrap.style.border = '1px solid var(--ppx-line, #e5e7eb)';
    wrap.style.borderRadius = '10px';
    wrap.style.background = '#fff';
    wrap.style.marginBottom = '6px';

    const toolbar = D.createElement('div');
    toolbar.style.display = 'inline-flex';
    toolbar.style.gap = '6px';
    toolbar.style.flexWrap = 'wrap';
    toolbar.style.marginBottom = '6px';

    const ed = D.createElement('div');
    ed.className = 'ppx-rte__editor';
    ed.contentEditable = 'true';
    ed.style.minHeight = '80px';
    ed.style.border = '1px solid var(--ppx-line, #e5e7eb)';
    ed.style.borderRadius = '8px';
    ed.style.padding = '8px';
    ed.style.outline = 'none';
    ed.style.fontFamily = 'inherit';
    ed.style.whiteSpace = 'pre-wrap';

    // Seed content from textarea (supports existing HTML)
    ed.innerHTML = textarea.value || '';

    const btnBold = createBtn('B', 'bold', 'Bold');
    btnBold.style.fontWeight = '700';
    const btnItalic = createBtn('I', 'italic', 'Italic');
    btnItalic.style.fontStyle = 'italic';
    const btnList = createBtn('•', 'insertUnorderedList', 'Bulleted list');

    [btnBold, btnItalic, btnList].forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        ed.focus();
        try { document.execCommand(btn.dataset.cmd, false, null); } catch(_) {}
        setTimeout(()=>updateToolbar(), 0);
      });
      toolbar.appendChild(btn);
    });

    function syncBack(){
      textarea.value = ed.innerHTML.trim();
      // fire input so any listeners pick up change
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function syncFromTextarea(){
      ed.innerHTML = textarea.value || '';
      updateToolbar();
    }

    function updateToolbar(){
      try {
        setActive(btnBold, document.queryCommandState('bold'));
        setActive(btnItalic, document.queryCommandState('italic'));
        setActive(btnList, document.queryCommandState('insertUnorderedList'));
      } catch(_){}
    }

    ed.addEventListener('input', () => { syncBack(); updateToolbar(); });
    ed.addEventListener('keyup', updateToolbar);
    ed.addEventListener('mouseup', updateToolbar);
    document.addEventListener('selectionchange', () => {
      if (D.activeElement === ed || ed.contains(D.activeElement)) updateToolbar();
    });

    // Allow external refresh when value is set programmatically
    textarea.addEventListener('ppx:rte:refresh', syncFromTextarea);

    wrap.appendChild(toolbar);
    wrap.appendChild(ed);
    textarea.parentNode.insertBefore(wrap, textarea);
    // Keep hidden textarea in DOM for form submissions and existing JS reads
  }

  ready(() => {
    let nodes = Array.from(D.querySelectorAll('textarea[data-rte="instructions"]'));
    // Also target common instruction fields even if data-rte not set
    nodes = nodes.concat(Array.from(D.querySelectorAll('textarea[id^="ex-inst"], textarea[name*="instructions_"]')).filter(n => !n.dataset.rteInit));
    nodes.forEach(initRTE);
  });
})();
