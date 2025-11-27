/* static/js/public_ex_card_enhance.js
   Normalizes legacy .ppx-exref cards into the new non-overlapping grid layout
   and injects the panda exercise icon. Safe to run on public pages.
*/
(function(){
  function ready(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);} else { fn(); } }
  function L(es, en){ try { var cur=(window.PPX_I18N&&PPX_I18N.currentLang)||document.documentElement.getAttribute('lang')||'es'; return String(cur).toLowerCase().startsWith('en')?(en||es):(es||en); } catch(_){ return es; } }
  function typeLabel(t, lang){ var en={tf:'True/False',mcq:'Multiple Choice',dictation:'Dictation',fitb:'Fill in the blanks',dnd:'Drag-and-drop'}[t]||t.toUpperCase(); var es={tf:'¿Verdadero o falso?',mcq:'Respuesta Múltiple',dictation:'Dictado',fitb:'Llenar los huecos',dnd:'Arrastrar y soltar'}[t]||t.toUpperCase(); return (lang||'es').startsWith('en')?en:es; }

  function upgrade(card){
    if (!card || card.querySelector('.ppx-exref-grid')) return; // already new
    var lang = (function(){ try { var cur=(window.PPX_I18N&&PPX_I18N.currentLang)||document.documentElement.getAttribute('lang')||'es'; return cur.toLowerCase().startsWith('en')?'en':'es'; } catch(_){ return 'es'; } })();
    var btn = card; // button
    var container = btn.closest('.ppx-exref');
    var type = btn.getAttribute('data-ppx-type') || (container && container.getAttribute('data-ppx-type')) || 'tf';
    var slug = btn.getAttribute('data-ppx-slug') || (container && container.getAttribute('data-ppx-slug')) || '';
    var level = (container && container.getAttribute('data-level')) || '';

    // Try to grab an existing title in legacy markup
    var existingTitle = '';
    var tEl = btn.querySelector('.ppx-exref-title');
    if (tEl && tEl.textContent.trim()) existingTitle = tEl.textContent.trim();
    if (!existingTitle) existingTitle = (btn.textContent || '').trim();

    var label = L('Un poco de práctica', 'A little practice');
    var html = ''+
      '<div class="ppx-exref-grid">'+
        '<div class="ppx-exref-ico" aria-hidden="true"><img src="/static/assets/icons/pp_exercise.svg" alt="" width="72" height="72" loading="lazy" decoding="async" fetchpriority="low"></div>'+
        '<div class="ppx-exref-main">'+
          '<div class="ppx-exref-label">'+label+'</div>'+
          '<div class="ppx-exref-title"></div>'+
          '<div class="ppx-exref-meta">'+
            '<div class="ppx-exref-meta-row"><span class="ppx-exref-meta-k">'+L('Tipo:','Type:')+'</span> <span class="ppx-pill ppx-pill--type">'+typeLabel(type, lang)+'</span></div>'+
            (level ? '<div class="ppx-exref-meta-row"><span class="ppx-exref-meta-k">'+L('Nivel:','Level:')+'</span> <span class="ppx-pill ppx-pill--level">'+level+'</span></div>' : '')+
          '</div>'+
        '</div>'+
        '<div class="ppx-exref-right">'+
          '<span class="ppx-status-text">'+L('Sin intentos','Not attempted')+'</span>'+
          '<img class="ppx-exref-check" src="/static/assets/icons/check.svg" alt="" style="display:none;width:18px;height:18px;">'+
          ' <span class="ppx-score" aria-hidden="true" style="display:none"></span>'+
          ' <span class="ppx-cta-mini" aria-hidden="true">'+L('Empezar','Start')+'</span>'+
          ' <button type="button" class="ppx-cta-retry" style="display:none">'+L('Intentar de nuevo','Try again')+'</button>'+
        '</div>'+
      '</div>';

    btn.innerHTML = html;
    btn.classList.add('has-ico');
    var titleNode = btn.querySelector('.ppx-exref-title');
    if (titleNode) titleNode.textContent = existingTitle || slug || '';
    // ARIA label
    btn.setAttribute('aria-label', (L('Abrir ejercicio: ','Open exercise: ')+(existingTitle||slug)) + ' · ' + L('Tipo: ','Type: ') + typeLabel(type, lang) + (level ? (' · ' + L('Nivel: ','Level: ') + level) : ''));
  }

  ready(function(){
    document.querySelectorAll('.ppx-exref-card').forEach(upgrade);
  });
})();
