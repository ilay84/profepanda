/* static/js/public_ex_progress.js
   Hydrates inline exercise cards with prior results (score + check + CTA)
*/
(function(){
  function ready(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);} else { fn(); } }
  function clamp(n, a, b){ n=Number(n)||0; return Math.max(a, Math.min(b, n)); }
  function scoreClass(pct){ pct = Number(pct)||0; if (pct>=90) return 'ppx-score--green'; if (pct>=80) return 'ppx-score--blue'; if (pct>=70) return 'ppx-score--orange'; return 'ppx-score--red'; }
  function langIsEn(){ try { var cur=(window.PPX_I18N&&PPX_I18N.currentLang)||document.documentElement.getAttribute('lang')||'es'; return String(cur).toLowerCase().startsWith('en'); } catch(_) { return false; } }

  function deriveFromLegacy(type, slug){
    try {
      for (var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i) || '';
        if (k.indexOf('ppx:'+type+':'+slug+':') !== 0) continue;
        var obj = JSON.parse(localStorage.getItem(k) || 'null');
        if (!obj || typeof obj !== 'object') continue;
        var score = null, completed = false;
        if (Array.isArray(obj.results)) {
          var tot=obj.results.length, ok=0; obj.results.forEach(function(p){ var v=Array.isArray(p)?p[1]:null; if (v && v.correct) ok++; });
          if (tot>0) score=Math.round((ok/tot)*100);
          completed = !!obj.summaryShown || (typeof obj.idx==='number' && tot>0 && obj.idx>=tot);
        } else if (Array.isArray(obj.answers)) {
          var totA=obj.answers.length, okA=0; obj.answers.forEach(function(p){ var v=Array.isArray(p)?p[1]:null; if (v && v.correct) okA++; });
          if (totA>0) score=Math.round((okA/totA)*100);
          completed = (typeof obj.idx==='number' && totA>0 && obj.idx>=totA);
        }
        if (score != null) return { score: score, completed: !!completed };
      }
    } catch(_){}
    return null;
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

      function showDefault(){ if (statusText){ statusText.textContent = (langIsEn()? 'Not attempted' : 'Sin intentos'); statusText.style.display='inline'; } if (chk) chk.style.display='none'; if (pill){ pill.style.display='none'; pill.textContent=''; pill.className='ppx-score'; pill.removeAttribute('title'); } if (cta) cta.textContent=(langIsEn()? 'Start':'Empezar'); if (retry) retry.style.display='none'; }

      var raw = null; try { raw = localStorage.getItem('ppx:progress:' + type + '/' + slug); } catch(_){}
      if (!raw) { var legacy = deriveFromLegacy(type, slug); if (!legacy) { showDefault(); return; } try { localStorage.setItem('ppx:progress:' + type + '/' + slug, JSON.stringify({ score: legacy.score, completed: !!legacy.completed })); } catch(_){}
        if (statusText) statusText.style.display='none';
        if (!pill){ pill=document.createElement('span'); pill.className='ppx-score'; right.appendChild(pill); }
        pill.style.display='inline-flex'; pill.textContent=String(Math.round(legacy.score))+'%';
        pill.classList.remove('ppx-score--green','ppx-score--blue','ppx-score--orange','ppx-score--red'); pill.classList.add(scoreClass(legacy.score));
        if (chk) chk.style.display = legacy.completed ? 'inline-block' : 'none';
        if (cta) cta.textContent = legacy.completed ? (langIsEn()? 'Review':'Revisar') : (langIsEn()? 'Resume':'Continuar');
        if (retry) retry.style.display = (legacy.score>0 ? '' : 'none');
        return;
      }

      var data = null; try { data = JSON.parse(raw); } catch(_) { showDefault(); return; }
      var pct = clamp(data && data.score, 0, 100);
      if (statusText) statusText.style.display='none';
      if (!pill){ pill=document.createElement('span'); pill.className='ppx-score'; right.appendChild(pill); }
      pill.style.display='inline-flex'; pill.textContent=String(Math.round(pct))+'%';
      pill.classList.remove('ppx-score--green','ppx-score--blue','ppx-score--orange','ppx-score--red'); pill.classList.add(scoreClass(pct));
      if (data && data.completed_at){ try{ var d=new Date(data.completed_at); pill.title = (langIsEn()? 'Last attempt: ' : 'Último intento: ') + d.toLocaleString(); } catch(_){} }
      if (chk) chk.style.display = (data && data.completed === true) ? 'inline-block' : (pct >= 100 ? 'inline-block' : 'none');
      if (cta) cta.textContent = ((pct >= 100) || (data && data.completed === true)) ? (langIsEn()? 'Review':'Revisar') : (langIsEn()? 'Resume':'Continuar');
      if (retry) retry.style.display='';
    } catch(_){}
  }

  ready(function(){
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
      var btn = e.target && e.target.closest && e.target.closest('.ppx-cta-retry');
      if (!btn) return;
      var card = btn.closest('.ppx-exref-card'); if (!card) return;
      var type = card.getAttribute('data-ppx-type') || card.dataset.ppxType;
      var slug = card.getAttribute('data-ppx-slug') || card.dataset.ppxSlug;
      var lang = (function(){ try { var cur=(window.PPX_I18N&&PPX_I18N.currentLang)||document.documentElement.getAttribute('lang')||'es'; return cur.toLowerCase().startsWith('en')?'en':'es'; } catch(_){ return 'es'; } })();
      var msg = (lang==='en') ? 'Restart attempt? Your previous result will be cleared.' : '¿Reiniciar intento? Tu resultado anterior se borrará.';
      function proceed(){ try { localStorage.removeItem('ppx:progress:' + type + '/' + slug); } catch(_){} hydrateCard(card); try { if (window.PPX && typeof PPX.openExercise==='function') PPX.openExercise({ type:type, slug:slug, lang:lang }); } catch(_){} }
      if (window.PPXModal && typeof PPXModal.open==='function'){
        var body = document.createElement('div'); body.textContent = msg;
        PPXModal.open({ title: (lang==='en' ? 'Try again' : 'Intentar de nuevo'), body: body, actions: {
          prev: { label: (lang==='en' ? 'Cancel' : 'Cancelar'), variant: 'ghost', onClick: function(){ PPXModal.close(); } },
          next: { label: (lang==='en' ? 'Continue' : 'Continuar'), variant: 'primary', onClick: function(){ PPXModal.close(); proceed(); } }
        }});
      } else {
        if (confirm(msg)) proceed();
      }
    });
  });
})();


