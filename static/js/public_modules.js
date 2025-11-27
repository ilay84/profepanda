/* public_modules.js
   Enhancements for moduled article pages: numbering UX, scroll-sync, keyboard nav,
   quick search, mobile drawer, prefetch, and last-read persistence.
*/
(function(){
  function ready(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);} else { fn(); } }

  ready(function(){
    var list = document.getElementById('ppx-mod-list');
    if (!list) return;

    var links = Array.prototype.slice.call(list.querySelectorAll('a.ppx-mod-link'));
    var active = list.querySelector('a[aria-current="page"]');
    if (active && active.scrollIntoView) {
      try { active.scrollIntoView({block:'nearest'}); } catch(_) {}
    }

    // Persist last-read module per article
    try {
      var slug = (location.pathname.split('/')[2] || '').trim();
      var mod = (location.pathname.split('/')[3] || '').trim();
      if (slug && mod) localStorage.setItem('ppx:last_module:'+slug, mod);
    } catch(_){}

    // Keyboard: Left/Right navigate modules, Up/Down move focus within list, Enter open
    document.addEventListener('keydown', function(ev){
      var key = ev.key;
      var curIdx = links.findIndex(function(a){ return a === document.activeElement || a.getAttribute('aria-current')==='page'; });
      var goto = function(a){ if(a){ a.focus(); } };
      if (key === 'ArrowUp') { ev.preventDefault(); goto(links[Math.max(0, curIdx-1)] || links[0]); }
      if (key === 'ArrowDown') { ev.preventDefault(); goto(links[Math.min(links.length-1, curIdx+1)] || links[links.length-1]); }
      if ((key === 'Enter' || key === ' ') && document.activeElement && document.activeElement.classList.contains('ppx-mod-link')) {
        ev.preventDefault(); location.href = document.activeElement.getAttribute('href');
      }
      // Left/Right: fall back to footer prev/next if present
      var prev = document.querySelector('.ppx-article-footer-inner .ppx-nav-btn.prev[href]');
      var next = document.querySelector('.ppx-article-footer-inner .ppx-nav-btn.next[href]');
      if (key === 'ArrowLeft' && prev) { ev.preventDefault(); location.href = prev.getAttribute('href'); }
      if (key === 'ArrowRight' && next) { ev.preventDefault(); location.href = next.getAttribute('href'); }
    });

    // Prefetch next module on idle
    try {
      var nextFooter = document.querySelector('.ppx-article-footer-inner .ppx-nav-btn.next[href]');
      if (nextFooter && 'requestIdleCallback' in window) {
        requestIdleCallback(function(){ fetch(nextFooter.getAttribute('href'), { credentials:'same-origin' }).catch(function(){}); });
      }
    } catch(_){}

    // Quick search (only if input exists)
    var q = document.getElementById('ppx-mod-q');
    if (q) {
      q.addEventListener('input', function(){
        var v = (q.value||'').toLowerCase();
        links.forEach(function(a){
          var title = (a.querySelector('.ppx-mod-title') || a).textContent.toLowerCase();
          a.parentElement.style.display = v && title.indexOf(v) === -1 ? 'none' : '';
        });
      });
    }

    // Mobile drawer toggle
    var toggle = document.querySelector('.ppx-mod-drawer-toggle');
    if (toggle) {
      toggle.addEventListener('click', function(){
        document.body.classList.toggle('ppx-mod-drawer-open');
      });
      // Close drawer when clicking backdrop
      document.addEventListener('click', function(e){
        if (!document.body.classList.contains('ppx-mod-drawer-open')) return;
        var nav = document.querySelector('.ppx-article-nav');
        if (nav && e.target === nav) document.body.classList.remove('ppx-mod-drawer-open');
      });
    }
  });
})();

