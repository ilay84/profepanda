// static/js/public_acc.js
(function () {
  // Skip most admin pages, but allow admin article preview to render accordions
  try {
    var p = (location && location.pathname) ? location.pathname : '';
    var isAdmin = /^\/admin(\/|$)/.test(p);
    var isAdminPreview = /^\/admin\/articles\/[^\/]+\/preview$/.test(p);
    if (isAdmin && !isAdminPreview) { return; }
  } catch (_) {}

  // Public list/opt-out guards: never convert headings on index/list pages
  try {
    if (document.querySelector('.ppx-articles-list') || document.querySelector('[data-acc="off"]')) {
      return;
    }
  } catch (_) {}

  function toArr(nl){ return Array.prototype.slice.call(nl || []); }
  function isEl(n){ return n && n.nodeType === 1; }
  function isHeading(el){ return isEl(el) && /^(H1|H2|H3|H4|H5|H6)$/.test(el.tagName); }

  var REDUCED = false;
  try {
    REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {}

  var DBG = { booted:false, wrapped:0, converted:0, existingAccordions:0, headingCandidates:0 };

  function info(){ try { console.info.apply(console, arguments); } catch(_){} }
  function warn(){ try { console.warn.apply(console, arguments); } catch(_){} }
  info('[public_acc] script loaded');

  // Animate height (we set height inline; CSS uses max-height:none)
  (function injectStyle(){
    var css = document.createElement('style');
    css.textContent =
      '.ppx-accordion > details.ppx-acc-item > .ppx-acc-body{' +
        'max-height:none!important;height:0;overflow:hidden;' +
        'transition:height var(--ppx-transition-slow, .4s ease),padding-top .2s ease,padding-bottom .2s ease;' +
      '}'+
      '.ppx-accordion > details.ppx-acc-item[open] > .ppx-acc-body{}';
    document.head.appendChild(css);
  })();

  // ─────────────────────────────────────────────────────────────
  // Build normalized <details> accordion from a title + content nodes
  // ─────────────────────────────────────────────────────────────
  function buildDetailsAccordion(titleText, contentNodes){
    var details = document.createElement('details');
    details.className = 'ppx-acc-item';

    var summary = document.createElement('summary');
    summary.className = 'ppx-acc-summary';
    var strong = document.createElement('strong');
    strong.textContent = (titleText || 'Sección').trim() || 'Sección';
    summary.appendChild(strong);

    var body = document.createElement('div');
    body.className = 'ppx-acc-body';

    toArr(contentNodes).forEach(function(n){ body.appendChild(n); });

    details.appendChild(summary);
    details.appendChild(body);
    return details;
  }

  // ─────────────────────────────────────────────────────────────
  // Convert legacy editor blocks:
  // <div class="ppx-acc">
  //   <input.ppx-acc-toggle ... checked?>
  //   <label.ppx-acc-head>Title</label>
  //   <div.ppx-acc-body>...content...</div>
  // </div>
  //  →  <div class="ppx-accordion"><details class="ppx-acc-item" [open]>...</details></div>
  // ─────────────────────────────────────────────────────────────
  function convertLegacyBlock(wrap){
    var toggle = wrap.querySelector('.ppx-acc-toggle');
    var head   = wrap.querySelector('.ppx-acc-head');
    var body   = wrap.querySelector('.ppx-acc-body');
    if (!head || !body) return false;

    var title = (head.textContent || '').trim() || 'Sección';
    // Take body children as content nodes
    var contentNodes = toArr(body.childNodes);

    // Clean wrapper and rebuild as normalized accordion
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    wrap.classList.remove('ppx-acc');
    wrap.classList.add('ppx-accordion');

    var details = buildDetailsAccordion(title, contentNodes);
    if (toggle && toggle.checked) details.setAttribute('open','');

    wrap.appendChild(details);
    initItem(details);

    DBG.converted++;
    info('[public_acc] converted legacy .ppx-acc → <details>:', title.slice(0,60));
    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // Wrap a heading section h3/h4 into accordion (for pure HTML pages)
  // ─────────────────────────────────────────────────────────────
  function wrapFromHeading(h) {
    if (!isEl(h)) return;
    if (h.closest('details.ppx-acc-item, .ppx-accordion')) return;
    if (h.closest('.ppx-example')) return; // do not wrap headings that are part of example blocks
    if (h.closest('.ppx-modal')) return; // never transform modal chrome/content (glossary/dictionary modal)

    var parent = h.parentNode; if (!parent) return;
    // Create an in-DOM anchor before moving the heading so we can insert reliably later
    var anchor = document.createComment('ppx-acc-anchor');
    parent.insertBefore(anchor, h);

    // Collect siblings until next heading/accordion
    var tmpWrap = document.createElement('div');
    tmpWrap.appendChild(h); // move title in temp to preserve order

    var stop = function (el) {
      if (!isEl(el)) return false;
      if (isHeading(el)) return true;
      if (el.matches && el.matches('.ppx-accordion, details.ppx-acc-item')) return true;
      return false;
    };
    var cur = h.nextSibling;
    while (cur) {
      var next = cur.nextSibling;
      if (isEl(cur) && stop(cur)) break;
      tmpWrap.appendChild(cur);
      cur = next;
    }

    // Build final wrapper
    var outer = document.createElement('div');
    outer.className = 'ppx-accordion';
    var titleText = (h.textContent || 'Sección').trim() || 'Sección';

    // Move content except heading itself into details body
    var contentNodes = toArr(tmpWrap.childNodes).filter(function(n){ return n !== h; });
    var details = buildDetailsAccordion(titleText, contentNodes);

    // Insert wrapper at the original heading position (anchor), then remove anchor
    parent.replaceChild(outer, anchor);
    outer.appendChild(details);
    tmpWrap.remove();

    initItem(details);
    DBG.wrapped++;
    info('[public_acc] wrapped heading section:', titleText.slice(0,60));
  }

  // ─────────────────────────────────────────────────────────────
  // Animated height wiring
  // ─────────────────────────────────────────────────────────────
  function initItem(details){
    if (!isEl(details)) return;
    var body = details.querySelector('.ppx-acc-body');
    if (!body) return;

    if (details.hasAttribute('open')) {
      body.style.height = 'auto';
      body.style.paddingTop = getCSSVar('--ppx-space-4', '1rem');
      body.style.paddingBottom = getCSSVar('--ppx-space-5', '1.25rem');
    } else {
      body.style.height = '0px';
      body.style.paddingTop = '0px';
      body.style.paddingBottom = '0px';
    }

    if (details.__ppxBound) return;
    details.__ppxBound = true;

    details.addEventListener('toggle', function () {
      if (!isEl(body)) return;
      if (REDUCED) {
        if (details.open) {
          body.style.height = 'auto';
          body.style.paddingTop = getCSSVar('--ppx-space-4', '1rem');
          body.style.paddingBottom = getCSSVar('--ppx-space-5', '1.25rem');
        } else {
          body.style.height = '0px';
          body.style.paddingTop = '0px';
          body.style.paddingBottom = '0px';
        }
        return;
      }
      if (details.open) expand(details, body);
      else collapse(details, body);
    });
  }

  function getCSSVar(name, fallback){
    var cs = getComputedStyle(document.documentElement);
    var v = cs.getPropertyValue(name).trim();
    return v || fallback || '0px';
  }

  function expand(details, body){
    body.style.transition = 'none';
    if (body.style.height === 'auto') {
      body.style.height = body.scrollHeight + 'px';
    }
    requestAnimationFrame(function(){
      var target = body.scrollHeight;
      body.style.transition = '';
      body.style.height = target + 'px';
      body.style.paddingTop = getCSSVar('--ppx-space-4', '1rem');
      body.style.paddingBottom = getCSSVar('--ppx-space-5', '1.25rem');
      var onEnd = function(e){
        if (e && e.target !== body) return;
        body.style.height = 'auto';
        body.removeEventListener('transitionend', onEnd);
      };
      body.addEventListener('transitionend', onEnd);
    });
  }

  function collapse(details, body){
    body.style.transition = 'none';
    var start = body.style.height === 'auto' ? body.scrollHeight : parseFloat(body.style.height || body.scrollHeight);
    body.style.height = start + 'px';
    body.style.paddingTop = getCSSVar('--ppx-space-4', '1rem');
    body.style.paddingBottom = getCSSVar('--ppx-space-5', '1.25rem');
    requestAnimationFrame(function(){
      body.style.transition = '';
      body.style.height = '0px';
      body.style.paddingTop = '0px';
      body.style.paddingBottom = '0px';
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Transform root: convert legacy blocks, then wrap headings
  // ─────────────────────────────────────────────────────────────
  function transform(root) {
    if (!root) return;

    // Convert editor-produced .ppx-acc blocks → normalized details
    toArr(root.querySelectorAll('.ppx-acc')).forEach(function (w) {
      // Skip if already normalized
      if (w.querySelector('details.ppx-acc-item')) return;
      convertLegacyBlock(w);
    });

    var existing = root.querySelectorAll('.ppx-accordion > details.ppx-acc-item').length;
    var candidates = root.querySelectorAll('h3, h4').length;
    DBG.existingAccordions += existing;
    DBG.headingCandidates += candidates;

    // Ensure behavior on already-normalized blocks
    toArr(root.querySelectorAll('.ppx-accordion > details.ppx-acc-item')).forEach(initItem);

    // Only wrap plain H3/H4 headings into accordions when explicitly opted in.
    // Default behavior: DO NOT wrap headings automatically; use the accordion tool.
    try {
      var allowHeadings = !!(document.querySelector('[data-acc="from-headings"]'));
      if (allowHeadings) {
        toArr(root.querySelectorAll('h3, h4')).forEach(wrapFromHeading);
      }
    } catch(_){}
  }

    // Public-side Example Block audio: play/pause buttons using data-url
  function bindExampleAudio() {
    document.addEventListener('click', function (e) {
      var btn = e.target && (e.target.closest ? e.target.closest('.ppx-ex-audio') : null);
      if (!btn) return;
      var url = btn.getAttribute('data-url') || '';
      if (!url) return; // nothing saved yet
      e.preventDefault();

      // cache player on the button
      var player = btn._ppxPlayer;
      if (!player) {
        player = new Audio(url);
        player.preload = 'none';
        // Respect any chosen speed; default to 1.0x
        try { player.playbackRate = btn._ppxRate ? parseFloat(btn._ppxRate) : 1; } catch(_){}
        btn._ppxPlayer = player;
      }

      // Ensure we have the new asset-based icon inside the button
      var ensureImg = btn.querySelector('img.ppx-ex-icon');
      if (!ensureImg) {
        btn.innerHTML = '<img class="ppx-ex-icon" src="/static/assets/icons/play_audio.svg" alt="" width="28" height="28">';
      }

      if (player.paused) {
        player.play().catch(function(){});
        var img1 = btn.querySelector('img.ppx-ex-icon');
        if (img1) img1.src = '/static/assets/icons/pause.svg';
        btn.classList.add('is-playing');
        player.onended = function(){ btn.classList.remove('is-playing'); var img2 = btn.querySelector('img.ppx-ex-icon'); if (img2) img2.src = '/static/assets/icons/play_audio.svg'; };
      } else {
        player.pause();
        var img3 = btn.querySelector('img.ppx-ex-icon');
        if (img3) img3.src = '/static/assets/icons/play_audio.svg';
        btn.classList.remove('is-playing');
      }
    }, false);
  }

  // Inject compact playback-speed controls under example audio buttons
  function installExampleSpeedControls(root){
    try {
      var scope = root && root.querySelectorAll ? root : document;
      var buttons = scope.querySelectorAll ? scope.querySelectorAll('.ppx-ex-audio') : [];
      Array.prototype.forEach.call(buttons, function(btn){
        if (btn._ppxSpeedInstalled) return;

        var container = document.createElement('div');
        container.className = 'ppx-ex-speed';

        var range = document.createElement('input');
        range.type = 'range';
        range.className = 'ppx-ex-speed-range';
        range.min = '0.5';
        range.max = '1.0';
        range.step = '0.1';
        range.value = (btn._ppxRate ? String(btn._ppxRate) : '1');
        range.setAttribute('aria-label', 'Playback speed');

        var legend = document.createElement('div');
        legend.className = 'ppx-ex-speed-legend';
        try {
          var _lang = (document.documentElement && document.documentElement.lang || '').toLowerCase();
          var _label = _lang.indexOf('es') === 0 ? 'velocidad' : 'speed';
          legend.textContent = _label;
        } catch(_) { legend.textContent = 'speed'; }

        container.appendChild(range);
        container.appendChild(legend);

        try { btn.insertAdjacentElement('afterend', container); }
        catch(_) { (btn.parentNode||document.body).insertBefore(container, btn.nextSibling); }

        range.addEventListener('input', function(){
          var v = parseFloat(range.value || '1') || 1;
          btn._ppxRate = v;
          var p = btn._ppxPlayer;
          if (p) { try { p.playbackRate = v; } catch(_){} }
        });

        btn._ppxSpeedInstalled = true;
      });
    } catch(_){}
  }

  // Ensure the play icon is present on load for all example audio buttons
  function ensureExampleAudioIcons(root){
    try {
      var scope = root && root.querySelectorAll ? root : document;
      var buttons = scope.querySelectorAll ? scope.querySelectorAll('.ppx-ex-audio') : [];
      Array.prototype.forEach.call(buttons, function(btn){
        var img = btn.querySelector('img.ppx-ex-icon');
        var txt = (btn.textContent || '').trim();
        if (!img || txt === '...' || txt === '…') {
          btn.innerHTML = '<img class="ppx-ex-icon" src="/static/assets/icons/play_audio.svg" alt="" width="28" height="28">';
        }
      });
    } catch(_){}
  }

  function boot() {
    DBG.booted = true;
    info('[public_acc] boot()');
    transform(document.body || document);

    // Public-only sanitation: strip any editor-only artifacts and lock content
    try {
      // 1) Remove contenteditable from public examples
      var edits = document.querySelectorAll('.ppx-example [contenteditable]');
      edits.forEach(function (n) { n.removeAttribute('contenteditable'); });

      // 2) Remove editor block toolbars that leaked into saved HTML
      var tools = document.querySelectorAll('.ppx-block-tools');
      tools.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });

      // 3) Drop editor-only flags if present
      var flags = document.querySelectorAll('[data-acc], [data-ex]');
      flags.forEach(function (n) { n.removeAttribute('data-acc'); n.removeAttribute('data-ex'); });

      // 4) Nuke any legacy toggles that might have slipped through
      var toggles = document.querySelectorAll('.ppx-acc-toggle');
      toggles.forEach(function (n) { n.remove(); });
    } catch (_) {}

    // Ensure example audio buttons work on public
    bindExampleAudio();
    // Add speed sliders below audio buttons
    installExampleSpeedControls(document);
    // Make sure play icon shows before first click
    ensureExampleAudioIcons(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Late DOM injections
  try {
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        toArr(m.addedNodes).forEach(function (n) {
          if (!isEl(n)) return;
          if (n.matches && (n.matches('.ppx-acc, .ppx-accordion, details.ppx-acc-item'))) {
            transform(n.parentNode || document);
            installExampleSpeedControls(n.parentNode || document);
            ensureExampleAudioIcons(n.parentNode || document);
          } else if (n.querySelectorAll) {
            var hits = n.querySelectorAll('.ppx-acc, .ppx-accordion, details.ppx-acc-item, .ppx-ex-audio');
            if (hits && hits.length) {
              transform(n);
              installExampleSpeedControls(n);
              ensureExampleAudioIcons(n);
            }
          }
        });
      });
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}

  // Manual debug hook
  window.__PPX_ACC_DEBUG = function(){
    var h3 = document.querySelectorAll('h3').length;
    var h4 = document.querySelectorAll('h4').length;
    var legacy = document.querySelectorAll('.ppx-acc').length;
    var accs = document.querySelectorAll('.ppx-accordion > details.ppx-acc-item').length;
    info('[public_acc][debug] booted:', DBG.booted, 'legacy .ppx-acc:', legacy, 'h3:', h3, 'h4:', h4, 'accordions:', accs, 'wrapped(h3/4):', DBG.wrapped, 'converted(legacy):', DBG.converted);
    if (!legacy && !h3 && !h4) {
      warn('[public_acc][debug] No .ppx-acc nor H3/H4 found. Is your content inside an iframe or shadow root?');
    }
  };
})();
