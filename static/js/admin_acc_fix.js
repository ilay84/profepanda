/* admin_acc_fix.js
   Defensive normalizer for editor accordions to prevent vertical text and centering.
   Works regardless of how the HTML was inserted (string vs DOM, Quill vs fallback).
*/
(function(){
  function ready(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);} else {fn();} }

  function normalizeOne(acc){
    try {
      if (!acc || acc.__ppxNormalized) return;
      var head = acc.querySelector('div.ppx-acc-head');
      var body = acc.querySelector('div.ppx-acc-body');
      if (!head) {
        head = document.createElement('div');
        head.className = 'ppx-acc-head';
        acc.insertBefore(head, acc.firstChild);
      }
      var toggle = head.querySelector('.ppx-acc-toggle');
      if (!toggle) {
        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'ppx-acc-toggle';
        toggle.setAttribute('contenteditable','false');
        toggle.setAttribute('aria-expanded','true');
        toggle.title = 'Mostrar/Ocultar';
        head.insertBefore(toggle, head.firstChild);
      }
      var wrap = head.querySelector('.ppx-acc-head-text');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'ppx-acc-head-text';
        wrap.setAttribute('contenteditable','true');
        head.appendChild(wrap);
      }
      if (body && body.parentNode === head) {
        if (head.nextSibling) acc.insertBefore(body, head.nextSibling); else acc.appendChild(body);
      }
      // Force left-aligned, horizontal layout
      head.style.display = 'grid';
      head.style.gridTemplateColumns = '22px 1fr';
      head.style.alignItems = 'center';
      head.style.gap = '.75rem';
      head.style.textAlign = 'left';
      head.style.width = '100%';
      head.style.boxSizing = 'border-box';
      wrap.style.display = 'block';
      wrap.style.minWidth = '0';
      wrap.style.whiteSpace = 'normal';
      wrap.style.overflowWrap = 'anywhere';
      wrap.style.wordBreak = 'normal';
      acc.__ppxNormalized = true;
    } catch(_){}
  }

  function normalizeAll(root){
    (root.querySelectorAll ? root.querySelectorAll('.ppx-acc') : []).forEach(normalizeOne);
  }

  ready(function(){
    var root = document;
    normalizeAll(root);
    // Observe for new inserts
    var target = document.getElementById('ppx-article-form') || document.body;
    if (!('MutationObserver' in window) || !target) return;
    var obs = new MutationObserver(function(list){
      list.forEach(function(rec){
        rec.addedNodes && rec.addedNodes.forEach(function(n){
          if (n.nodeType !== 1) return;
          if (n.classList && n.classList.contains('ppx-acc')) { normalizeOne(n); }
          else normalizeAll(n);
        });
      });
    });
    obs.observe(target, { childList: true, subtree: true });
  });
})();

