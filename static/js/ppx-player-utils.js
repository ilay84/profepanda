/* static/js/ppx-player-utils.js */
(function(){
  const U = {};

  U.hasRenderedMedia = function(container){
    try {
      if (!container) return false;
      return !!container.querySelector('.ppx-media-grid, .ppx-media-audio, .ppx-media-video, img, audio, video');
    } catch(_) { return false; }
  };

  U.updateMediaToggle = function(container, toggle, isSummary){
    try {
      const has = !isSummary && U.hasRenderedMedia(container);
      toggle.hidden = !has;
      toggle.style.display = toggle.hidden ? 'none' : '';
      if (!has) {
        try { container.hidden = true; } catch(_){}
      }
    } catch(_){}
  };

  U.makeCacheKey = function({ type, slug, version }){
    return `ppx:${type || 'x'}:${slug || 'unknown'}:${version || 'current'}`;
  };

  U.saveCache = function(key, obj){ try { localStorage.setItem(key, JSON.stringify(obj)); } catch(_){} };
  U.loadCache = function(key){ try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch(_) { return null; } };

  window.PPXPlayerUtils = U;
})();

