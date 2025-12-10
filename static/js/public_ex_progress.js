/* static/js/public_ex_progress.js
   Hydrates exercise cards with progress and wires CTA behaviors (resume/review/retry) + scroll restore.
*/
(function(){
  function ready(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);} else { fn(); } }
  function clamp(n,a,b){ n=Number(n)||0; return Math.max(a, Math.min(b, n)); }
  function scoreClass(pct){ pct=Number(pct)||0; if(pct>=90) return 'ppx-score--green'; if(pct>=80) return 'ppx-score--blue'; if(pct>=70) return 'ppx-score--orange'; return 'ppx-score--red'; }
  function langIsEn(){ try{ var cur=(window.PPX_I18N&&PPX_I18N.currentLang)||document.documentElement.getAttribute('lang')||'es'; return String(cur).toLowerCase().startsWith('en'); }catch(_){ return false; } }

  function deriveFromLegacy(type, slug){
    try {
      for (var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i) || '';
        if (k.indexOf('ppx:'+type+':'+slug+':') !== 0) continue;
        var obj = JSON.parse(localStorage.getItem(k) || 'null');
        if (!obj || typeof obj !== 'object') continue;
        var score=null, completed=false;
        if (Array.isArray(obj.results)){
          var tot=obj.results.length, ok=0; obj.results.forEach(function(p){ var v=Array.isArray(p)?p[1]:null; if (v && v.correct) ok++; });
          if (tot>0) score=Math.round((ok/tot)*100);
          completed = !!obj.summaryShown || (typeof obj.idx==='number' && tot>0 && obj.idx>=tot);
        } else if (Array.isArray(obj.answers)){
          var totA=obj.answers.length, okA=0; obj.answers.forEach(function(p){ var v=Array.isArray(p)?p[1]:null; if (v && v.correct) okA++; });
          if (totA>0) score=Math.round((okA/totA)*100);
          completed = (typeof obj.idx==='number' && totA>0 && obj.idx>=totA);
        }
        if (score != null) return { score: score, completed: !!completed };
      }
    } catch(_){}
    return null;
  }

  function isCompleted(type, slug){
    try {
      var raw = localStorage.getItem('ppx:progress:' + type + '/' + slug);
      if (!raw) return false;
      var data = JSON.parse(raw);
      return !!(data && (data.completed === true || (Number(data.score)||0) >= 100));
    } catch(_){ return false; }
  }

  function hydrateCard(card){
    try {
      var type = card.getAttribute('data-ppx-type') || card.dataset.ppxType;
      var slug = card.getAttribute('data-ppx-slug') || card.dataset.ppxSlug;
      if (!type || !slug) return;
      var right = card.querySelector('.ppx-exref-right'); if (!right) return;
      var statusText = right.querySelector('.ppx-status-text');
      var chk = right.querySelector('.ppx-exref-check');
      var pill = right.querySelector('.ppx-score');
      var cta = right.querySelector('.ppx-cta-mini');
      var retry = right.querySelector('.ppx-cta-retry');

      function showDefault(){
        if (statusText){ statusText.textContent = (langIsEn()? 'Not attempted':'Sin intentos'); statusText.style.display='inline'; }
        if (chk) chk.style.display='none';
        if (pill){ pill.style.display='none'; pill.textContent=''; pill.className='ppx-score'; pill.removeAttribute('title'); }
        if (cta) cta.textContent = (langIsEn()? 'Start':'Empezar');
        if (retry) retry.style.display='none';
      }

      var raw = null; try { raw = localStorage.getItem('ppx:progress:' + type + '/' + slug); } catch(_){}
      if (!raw){
        var legacy = deriveFromLegacy(type, slug);
        if (!legacy){ showDefault(); return; }
        try { localStorage.setItem('ppx:progress:' + type + '/' + slug, JSON.stringify({ score: legacy.score, completed: !!legacy.completed })); } catch(_){}
        if (statusText) statusText.style.display='none';
        if (!pill){ pill=document.createElement('span'); pill.className='ppx-score'; right.appendChild(pill); }
        pill.style.display='inline-flex'; pill.textContent=String(Math.round(legacy.score))+'%';
        pill.classList.remove('ppx-score--green','ppx-score--blue','ppx-score--orange','ppx-score--red'); pill.classList.add(scoreClass(legacy.score));
        if (chk) chk.style.display = legacy.completed ? 'inline-block' : 'none';
        if (cta) cta.textContent = legacy.completed ? (langIsEn()? 'Review':'Revisar') : (langIsEn()? 'Resume':'Continuar');
        if (retry) retry.style.display = (legacy.score>0 ? '' : 'none');
        return;
      }

      var data = null; try { data = JSON.parse(raw); } catch(_){ showDefault(); return; }
      var pct = clamp(data && data.score, 0, 100);
      if (statusText) statusText.style.display='none';
      if (!pill){ pill=document.createElement('span'); pill.className='ppx-score'; right.appendChild(pill); }
      pill.style.display='inline-flex'; pill.textContent=String(Math.round(pct))+'%';
      pill.classList.remove('ppx-score--green','ppx-score--blue','ppx-score--orange','ppx-score--red'); pill.classList.add(scoreClass(pct));
      if (data && data.completed_at){ try{ var d=new Date(data.completed_at); pill.title = (langIsEn()? 'Last attempt: ' : 'Ultimo intento: ') + d.toLocaleString(); } catch(_){ } }
      if (chk) chk.style.display = (data && data.completed === true) ? 'inline-block' : (pct >= 100 ? 'inline-block' : 'none');
      if (cta) cta.textContent = ((pct >= 100) || (data && data.completed === true)) ? (langIsEn()? 'Review':'Revisar') : (langIsEn()? 'Resume':'Continuar');
      if (retry) retry.style.display='';
    } catch(_){}
  }

  ready(function(){
    var lastScroll = (function(){
      try {
        var v = sessionStorage.getItem('ppx:last-scroll');
        if (v !== null) return Number(v) || window.scrollY || 0;
      } catch(_){}
      return window.scrollY || 0;
    })();
    function rememberScroll(){
      try { lastScroll = window.scrollY; sessionStorage.setItem('ppx:last-scroll', String(lastScroll)); }
      catch(_){ lastScroll = window.scrollY; }
    }
    try {
      window.addEventListener('ppx:modal:open', function(){ rememberScroll(); });
      window.addEventListener('ppx:modal:close', function(){
        try {
          var v = sessionStorage.getItem('ppx:last-scroll');
          if (v !== null) lastScroll = Number(v) || lastScroll;
        } catch(_){}
        if (typeof lastScroll === 'number'){
          setTimeout(function(){
            try { window.scrollTo({ top: lastScroll, behavior: 'auto' }); }
            catch(_){ window.scrollTo(0, lastScroll||0); }
          }, 30);
        }
      });
    } catch(_){}

    document.querySelectorAll('.ppx-exref-card').forEach(hydrateCard);
    try {
      window.addEventListener('ppx:exercise:complete', function(ev){
        var t = ev && ev.detail; if (!t) return;
        var key = 'ppx:progress:' + t.type + '/' + t.slug;
        var score = clamp(t.score, 0, 100);
        try { localStorage.setItem(key, JSON.stringify({ score: score, completed_at: t.completed_at, completed: true })); } catch(_){}
        document.querySelectorAll('.ppx-exref-card[data-ppx-type="'+t.type+'"][data-ppx-slug="'+t.slug+'"]').forEach(hydrateCard);
      });
    } catch(_){}

    document.addEventListener('click', function(e){
      var lang = (function(){ try { var cur=(window.PPX_I18N&&PPX_I18N.currentLang)||document.documentElement.getAttribute('lang')||'es'; return cur.toLowerCase().startsWith('en')?'en':'es'; } catch(_){ return 'es'; } })();
      var retryBtn = e.target && e.target.closest && e.target.closest('.ppx-cta-retry');
      if (retryBtn){
        var card = retryBtn.closest('.ppx-exref-card'); if (!card) return;
        var type = card.getAttribute('data-ppx-type') || card.dataset.ppxType;
        var slug = card.getAttribute('data-ppx-slug') || card.dataset.ppxSlug;
        var msg = (lang==='en') ? 'Restart attempt? Your previous result will be cleared.' : '¿Reiniciar intento? Tu resultado anterior se borrará.';
        function proceed(){ try { localStorage.removeItem('ppx:progress:' + type + '/' + slug); } catch(_){ hydrateCard(card); } hydrateCard(card); try { if (window.PPX && typeof PPX.openExercise==='function') { rememberScroll(); PPX.openExercise({ type:type, slug:slug, lang:lang }); } } catch(_){ } }
        if (window.PPXModal && typeof PPXModal.open==='function'){
          var body = document.createElement('div'); body.textContent = msg;
          PPXModal.open({ title: (lang==='en' ? 'Try again' : 'Intentar de nuevo'), body: body, actions: {
            prev: { label: (lang==='en' ? 'Cancel' : 'Cancelar'), variant: 'ghost', onClick: function(){ PPXModal.close(); } },
            next: { label: (lang==='en' ? 'Continue' : 'Continuar'), variant: 'primary', onClick: function(){ PPXModal.close(); proceed(); } }
          }});
        } else {
          if (confirm(msg)) proceed();
        }
        return;
      }

      var reviewBtn = e.target && e.target.closest && e.target.closest('.ppx-cta-mini');
      var card = (reviewBtn && reviewBtn.closest('.ppx-exref-card')) || (e.target && e.target.closest && e.target.closest('.ppx-exref-card'));
      if (!card) return;
      var type = card.getAttribute('data-ppx-type') || card.dataset.ppxType;
      var slug = card.getAttribute('data-ppx-slug') || card.dataset.ppxSlug;
      if (!type || !slug || !window.PPX || typeof PPX.openExercise !== 'function') return;
      var wantsSummary = false;
      if (reviewBtn){
        var txt = (reviewBtn.textContent||'').trim().toLowerCase();
        wantsSummary = txt.startsWith('revis') || txt.startsWith('review') || isCompleted(type, slug);
        e.preventDefault();
      } else {
        wantsSummary = isCompleted(type, slug);
      }
      rememberScroll();
      try { PPX.openExercise({ type:type, slug:slug, lang:lang, context: wantsSummary ? { startAt:'summary' } : null }); } catch(_){}
    });
  });
})();
