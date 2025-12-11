// static/js/ppx-canva.js
(function(){
  const Q = (sel, ctx=document)=> Array.from((ctx||document).querySelectorAll(sel));
  const CANVA_MATCH = /canva\.com\/design\/[^\s"']+\/view\?embed/i;

  function parseAspect(node){
    const attr = (node.getAttribute('data-aspect') || node.getAttribute('aspect') || '').trim();
    if (attr && /^(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)$/.test(attr)){
      const m = attr.match(/^(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)$/);
      const w = parseFloat(m[1]);
      const h = parseFloat(m[2]);
      if (w > 0 && h > 0) return h / w;
    }
    const wAttr = parseFloat(node.getAttribute('width'));
    const hAttr = parseFloat(node.getAttribute('height'));
    if (wAttr > 0 && hAttr > 0) return hAttr / wAttr;
    return 9/16; // default widescreen
  }

  function normalizeSrc(src){
    if (!src) return '';
    try{
      const url = new URL(src, window.location.origin);
      if (!url.searchParams.has('embed')) url.searchParams.set('embed','1');
      return url.toString();
    }catch(_){ return src; }
  }

  function buildEmbed({src, aspect}){
    const wrap = document.createElement('div');
    wrap.className = 'pp-canva-wrap';
    const pct = Math.max(10, Math.min(300, aspect * 100));
    wrap.style.paddingTop = pct + '%';
    const iframe = document.createElement('iframe');
    iframe.className = 'pp-canva-frame';
    iframe.src = normalizeSrc(src);
    iframe.loading = 'lazy';
    iframe.setAttribute('referrerpolicy','no-referrer-when-downgrade');
    iframe.setAttribute('allowfullscreen','true');
    iframe.setAttribute('scrolling','no');
    // Sandbox can block Canva rendering; intentionally omitted
    wrap.appendChild(iframe);
    return wrap;
  }

  function upgradeIframe(node){
    if (!(node && node.parentNode)) return;
    const src = node.getAttribute('src') || '';
    if (!CANVA_MATCH.test(src)) return;
    const aspect = parseAspect(node);
    const wrap = buildEmbed({ src, aspect });
    node.replaceWith(wrap);
  }

  function upgradeCustom(el){
    if (!(el && el.parentNode)) return;
    const src = el.getAttribute('data-src') || el.getAttribute('src') || '';
    if (!src) return;
    const aspect = parseAspect(el);
    const wrap = buildEmbed({ src, aspect });
    el.replaceWith(wrap);
  }

  function init(){
    Q('iframe[src*="canva.com/design/"]').forEach(upgradeIframe);
    Q('pp-canva-embed').forEach(upgradeCustom);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
