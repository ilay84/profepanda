/* static/js/admin_quill.js
   Admin WYSIWYG for <textarea id="html"> with a compact toolbar and an "Acc" button
   that inserts an editable, Quill-safe accordion:
   .ppx-acc > .ppx-acc-head + .ppx-acc-body   (editor: both are contenteditable)

   Adds: Example Block insertion with audio upload/playback.
   - Toolbar button "Example"
   - Block HTML is safe inside accordions and fully editable:
     .ppx-example > .ppx-ex (grid)
       - .ppx-ex-audio (button, click to upload or play/pause)
       - .ppx-ex-lines
           .ppx-ex-sentence (bold, editable)
           .ppx-ex-translation (italic, editable)

   Notes:
   - We default to a robust contentEditable editor because Quill strips <input>/<label>.
   - On save, we remove editor-only bits and contenteditable attrs.
*/
(function () {
  function ready(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);} else {fn();} }
  function uid(){ return 'acc_' + Math.random().toString(36).slice(2,9); }
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function group(html){ return '<span class=\"ppx-toolbar-group\">' + html + '</span>'; }

  // Icons for example audio button (admin + public use the same assets)
  var ICON_PLAY = '/static/assets/icons/play.svg';
  var ICON_PAUSE = '/static/assets/icons/pause.svg';

  // Brand + common palette (first are brand colors)
  var BRAND_COLORS = ['#80ac5f','#475dd7','#8f8ec5','#c46374','#6c606c','#bebed6'];
  var COMMON_COLORS = ['#000000','#222222','#444444','#666666','#888888','#aaaaaa','#cccccc','#ffffff','#d32f2f','#f57c00','#fbc02d','#388e3c','#1976d2','#7b1fa2'];

  // Inline SVG helpers
  function svgAlign(type){
    if (type==='left') return '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="2" y="4" width="10" height="1.6" rx=".8"></rect><rect x="2" y="8" width="12" height="1.6" rx=".8"></rect><rect x="2" y="12" width="8" height="1.6" rx=".8"></rect></svg>';
    if (type==='center') return '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="3" y="4" width="12" height="1.6" rx=".8"></rect><rect x="2" y="8" width="14" height="1.6" rx=".8"></rect><rect x="4" y="12" width="10" height="1.6" rx=".8"></rect></svg>';
    if (type==='right') return '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="6" y="4" width="10" height="1.6" rx=".8"></rect><rect x="4" y="8" width="12" height="1.6" rx=".8"></rect><rect x="8" y="12" width="8" height="1.6" rx=".8"></rect></svg>';
    return '';
  }
  function svgBullets(){
    return '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="4.5" r="1.3"></circle><circle cx="9" cy="9" r="1.3"></circle><circle cx="9" cy="13.5" r="1.3"></circle></svg>';
  }
  function svgNumbers(){
    return '' +
      '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">' +
        '<text x="8.5" y="5.5" font-size="6" text-anchor="middle" font-family="Montserrat, Arial" font-weight="700">1</text>' +
        '<text x="8.5" y="10" font-size="6" text-anchor="middle" font-family="Montserrat, Arial" font-weight="700">2</text>' +
        '<text x="8.5" y="14.5" font-size="6" text-anchor="middle" font-family="Montserrat, Arial" font-weight="700">3</text>' +
      '</svg>';
  }
  function svgChevronDown(){
    return '<svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7l5 6 5-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function svgPlay(){
    return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
  }
  function svgPause(){
    return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/></svg>';
  }

  // Bilingual helper and type label helper
  function L(es, en){
    try {
      var cur = (window.PPX_I18N && window.PPX_I18N.currentLang) || document.documentElement.getAttribute('lang') || 'es';
      return String(cur).toLowerCase().startsWith('en') ? (en || es) : (es || en);
    } catch(_){ return es; }
  }
  function typeLabel(t){
    var en = { tf: 'True/False', mcq: 'Multiple Choice', dictation: 'Dictation', fitb: 'Fill in the blanks', dnd: 'Drag-and-drop' }[t] || t.toUpperCase();
    var es = { tf: '¿Verdadero o falso?', mcq: 'Respuesta Múltiple', dictation: 'Dictado', fitb: 'Llenar los huecos', dnd: 'Arrastrar y soltar' }[t] || t.toUpperCase();
    return L(es, en);
  }

  function buildColorPicker(kindLabel, kindClass) {
    var id = 'ppx-color-' + kindClass + '-' + uid();
    var initFore = BRAND_COLORS[1] || '#475dd7';
    var initBack = BRAND_COLORS[0] || '#80ac5f';
    var icon = kindClass === 'ppx-fore'
      ? '<span class="ppx-icon-fore" style="color:'+initFore+'">A</span>'
      : '<span class="ppx-icon-back" style="background:'+initBack+'"></span>';
    var btn = '<button class="ppx-btn-mini ppx-color-btn '+kindClass+'" type="button" aria-expanded="false" aria-controls="'+id+'" title="'+kindLabel+'">'+icon+'<span class="ppx-color-label">'+kindLabel+'</span></button>';
    var chips = BRAND_COLORS.concat(COMMON_COLORS).map(function (hex) {
      return '<button class="ppx-chip" type="button" data-hex="'+hex+'" title="'+hex+'" style="background:'+hex+'"></button>';
    }).join('');
    var pop = '' +
      '<div class="ppx-color-pop" id="'+id+'" role="dialog" aria-hidden="true">' +
        '<div class="ppx-chip-row">'+chips+'</div>' +
        '<div class="ppx-hex-row">' +
          '<label class="ppx-mini-label" for="'+id+'-hex">#</label>' +
          '<input id="'+id+'-hex" class="ppx-hex" inputmode="text" pattern="^#?[0-9a-fA-F]{6}$" placeholder="#RRGGBB" />' +
          '<button class="ppx-apply-hex" type="button">OK</button>' +
        '</div>' +
        '<div class="ppx-chip-row">' +
          '<button class="ppx-chip" type="button" data-action="clear" title="Clear">✕</button>' +
        '</div>' +
      '</div>';
    return '<span class="ppx-color-wrap" data-kind="'+kindClass+'">'+ btn + pop +'</span>';
  }

  function buildToolbar() {
    var bar = document.createElement('div');
    bar.id = 'ppx-admin-toolbar';
    bar.style.display = 'flex';
    bar.style.flexWrap = 'wrap';
    bar.style.alignItems = 'flex-start';
    bar.style.gap = '.5rem';
    bar.style.border = '1px solid #e5e7eb';
    bar.style.borderRadius = '10px';
    bar.style.padding = '.5rem';
    bar.style.marginBottom = '.5rem';
    /* Sticky header under admin bar */
    bar.style.position = 'sticky';
    bar.style.top = '0px'; // will be updated dynamically
    bar.style.zIndex = '100';
    bar.style.background = '#fff';
    bar.style.width = '100%';
    bar.innerHTML = [
      // Headings (custom dropdown with styled preview)
      group([
        '<span class="ppx-head-wrap">',
          '<button type="button" class="ppx-btn-mini ppx-head-dd" aria-haspopup="listbox" aria-expanded="false" title="Heading (Ctrl+2 / Ctrl+3)"><span class="ppx-head-label">Paragraph</span> ▼</button>',
          '<div class="ppx-head-pop" role="listbox" aria-hidden="true">',
            '<button class="ppx-head-opt" role="option" data-level="P"><span class="ppx-head-swatch p">Paragraph</span><span class="ppx-head-kbd">Ctrl+0</span></button>',
            '<button class="ppx-head-opt" role="option" data-level="H2"><span class="ppx-head-swatch h2">Heading 2</span><span class="ppx-head-kbd">Ctrl+2</span></button>',
            '<button class="ppx-head-opt" role="option" data-level="H3"><span class="ppx-head-swatch h3">Heading 3</span><span class="ppx-head-kbd">Ctrl+3</span></button>',
          '</div>',
        '</span>'
      ].join('')),

      // Inline styles
      group([
        '<button type="button" class="ppx-btn-mini ppx-bold" title="Bold (Ctrl+B)"><b>B</b></button>',
        '<button type="button" class="ppx-btn-mini ppx-italic" title="Italic (Ctrl+I)"><i>I</i></button>',
        '<button type="button" class="ppx-btn-mini ppx-underline" title="Underline (Ctrl+U)"><u>U</u></button>',
        '<button type="button" class="ppx-btn-mini ppx-strike" title="Strike"><s>S</s></button>'
      ].join('')),

      // Colors (palette + hex) with visual cues
      group([
        buildColorPicker('Text','ppx-fore'),
        buildColorPicker('Bg','ppx-back')
      ].join('')),

      // Alignment (line icons)
      group([
        '<button type="button" class="ppx-btn-mini ppx-left" title="Align left">'+svgAlign('left')+'</button>',
        '<button type="button" class="ppx-btn-mini ppx-center" title="Align center">'+svgAlign('center')+'</button>',
        '<button type="button" class="ppx-btn-mini ppx-right" title="Align right">'+svgAlign('right')+'</button>'
      ].join('')),

      // Lists (vertical icons)
      group([
        '<button type="button" class="ppx-btn-mini ppx-ul" title="Bulleted list">'+svgBullets()+'</button>',
        '<button type="button" class="ppx-btn-mini ppx-ol" title="Numbered list">'+svgNumbers()+'</button>'
      ].join('')),

      // Links, quote & embed (replaces code)
      group([
        '<button type="button" class="ppx-btn-mini ppx-link" title=\"Insert link (Ctrl+K)\">🔗</button>',
        '<button type="button" class="ppx-btn-mini ppx-unlink" title="Remove link">❌🔗</button>',
        '<button type="button" class="ppx-btn-mini ppx-quote" title="Blockquote">❝ ❞</button>',
        '<button type="button" class="ppx-btn-mini ppx-embed" title="Insert embed (YouTube/Canva/H5P)">Embed</button>'
      ].join('')),

      // Clean / undo / redo
      group([
        '<button type="button" class="ppx-btn-mini ppx-clean" title="Remove formatting">⌫Fmt</button>',
        '<button type="button" class="ppx-btn-mini ppx-undo" title="Undo">↶</button>',
        '<button type="button" class="ppx-btn-mini ppx-redo" title="Redo">↷</button>'
      ].join('')),

      // Insert Example block
      group([
        '<button class="ppx-btn ppx-btn--sm ppx-insert-example" type="button" title="Insert example block">Example</button>'
      ].join('')),

      // Insert accordion (with chevron)
      group([
        '<button class="ppx-btn ppx-btn--sm ppx-insert-acc" type="button" title="Insert accordion">Acc '+svgChevronDown()+'</button>'
      ].join('')),

      // Insert exercise reference (picker)
      group([
        '<button class="ppx-btn ppx-btn--sm ppx-insert-exref" type="button" title="'+L('+ ejercicio','+ exercise')+'">'+L('+ ejercicio','+ exercise')+'</button>'
      ].join(''))
    ].join('');

    // Swap placeholder glyph with SVG chevron in Heading button
    try {
      var _hb = bar.querySelector('.ppx-head-dd');
      if (_hb) _hb.innerHTML = '<span class="ppx-head-label">Paragraph</span> ' + svgChevronDown();
    } catch(_){ }

    // micro styles
    var css = document.createElement('style');
    css.textContent =
      '.ppx-toolbar-group{display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .35rem;border:1px dashed #e5e7eb;border-radius:8px;background:#fff}' +
      '#ppx-admin-toolbar{align-items:flex-start}' +
      '.ppx-toolbar-group{flex:0 0 auto}' +
      '.ppx-btn-mini{font:600 12px/1 Montserrat,system-ui;min-width:2rem;display:inline-flex;align-items:center;justify-content:center;gap:.35rem;padding:.3rem .5rem;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer}' +
      '.ppx-btn-mini svg, .ppx-btn-mini rect, .ppx-btn-mini circle, .ppx-btn-mini text { fill: currentColor }' +
      '.ppx-btn-mini:hover{background:#f8fafc}' +
      '.ppx-btn-mini.is-active{background:#eef2ff;border-color:#c7d2fe;box-shadow:inset 0 0 0 2px rgba(99,102,241,.15)}' +
      /* Heading dropdown styles */
      '.ppx-head-wrap{position:relative;display:inline-flex}' +
      '.ppx-head-dd{min-width:120px;justify-content:space-between}' +
      '.ppx-head-pop{position:absolute;top:calc(100% + 4px);left:0;min-width:220px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.08);padding:.25rem;display:none;z-index:60}' +
      '.ppx-head-pop[aria-hidden="false"]{display:block}' +
      '.ppx-head-opt{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:.45rem .6rem;border-radius:8px;border:0;background:#fff;cursor:pointer;text-align:left}' +
      '.ppx-head-opt:hover{background:#f8fafc}' +
      '.ppx-head-swatch.p{font:500 13px/1.4 Montserrat,system-ui;color:#0f172a}' +
      '.ppx-head-swatch.h2{font:700 18px/1.3 Montserrat,system-ui;color:#0f172a}' +
      '.ppx-head-swatch.h3{font:700 16px/1.3 Montserrat,system-ui;color:#0f172a}' +
      '.ppx-head-kbd{font:600 11px/1 Montserrat,system-ui;opacity:.65}' +
      '.ppx-mini-label{font:600 12px/1 Montserrat,system-ui;display:inline-flex;align-items:center;gap:.25rem}' +
      '.ppx-color-wrap{position:relative;display:inline-flex;align-items:center}' +
      '.ppx-color-btn{gap:.4rem}' +
      '.ppx-color-label{font:600 11px/1 Montserrat,system-ui}' +
      '.ppx-icon-fore{display:inline-block;font-weight:700;font-size:14px;line-height:1}' +
      '.ppx-icon-back{display:inline-block;width:14px;height:14px;border-radius:4px;border:1px solid #e5e7eb}' +
      '.ppx-color-pop{position:absolute;top:110%;left:0;z-index:50;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.08);padding:.5rem;min-width:220px;display:none}' +
      '.ppx-color-pop[aria-hidden="false"]{display:block}' +
      '.ppx-chip-row{display:grid;grid-template-columns:repeat(14,14px);gap:6px;margin:.25rem 0 .5rem}' +
      '.ppx-chip{width:14px;height:14px;border-radius:4px;border:1px solid #e5e7eb;cursor:pointer}' +
      '.ppx-hex-row{display:flex;align-items:center;gap:.35rem}' +
      '.ppx-hex{width:110px;padding:.25rem .4rem;border:1px solid #e5e7eb;border-radius:8px;font:500 12px/1 Montserrat,system-ui}' +
      '.ppx-apply-hex{font:600 12px/1 Montserrat,system-ui;padding:.3rem .6rem;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer}' +
      /* selected block outline (accordion/example) */
      '.ppx-selected-block{outline:2px solid #c7d2fe;outline-offset:2px;border-radius:10px}';
    document.head.appendChild(css);

    // Anchor toolbar sticky under admin header
    (function stickyUnderAdminHeader(){
      function findHeader(){
        var sels = [
          '#ppx-admin-bar','.ppx-admin-bar','#admin-bar',
          'header.ppx-admin','header[role="banner"]',
          'nav[role="navigation"][aria-label="Admin"]'
        ];
        for (var i = 0; i < sels.length; i++) {
          var el = document.querySelector(sels[i]);
          if (el) return el;
        }
        return null;
      }
      var header = findHeader();
      bar.style.position = 'sticky';
      bar.style.top = '0px';
      bar.style.left = '';
      bar.style.right = '';
      bar.style.width = '100%';
      bar.style.background = '#fff';
      var hz = (function(){
        if (!header) return 1;
        var z = parseInt(getComputedStyle(header).zIndex, 10);
        return (isNaN(z) ? 1 : Math.max(1, z - 1));
      })();
      bar.style.zIndex = String(hz);
      bar.style.maxWidth = '100%';
      bar.style.boxSizing = 'border-box';
      function adminOffset(){
        if (!header) return 0;
        var h = header.offsetHeight || 0;
        return Math.max(0, Math.round(h));
      }
      function apply(){
        var off = adminOffset();
        bar.style.top = off + 'px';
        document.documentElement.style.setProperty('--ppx-admin-offset', off + 'px');
      }
      if (header && 'ResizeObserver' in window) { new ResizeObserver(apply).observe(header); }
      window.addEventListener('resize', apply);
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(apply).catch(function(){}); }
      window.addEventListener('load', function(){ setTimeout(apply, 0); });
      apply();
    })();
    return bar;
  }

  // NEW: Editor-only accordion HTML (no checkbox/label; editable head/body)
  function accordionHTML(defaultTitle, openNow) {
    return '' +
      '<div class="ppx-acc" data-acc="editor">' +
        '<div class="ppx-block-tools">' +
          '<button type="button" class="ppx-block-del" title="Eliminar">✕</button>' +
          '<button type="button" class="ppx-block-after" title="Agregar línea debajo">↩︎</button>' +
        '</div>' +
        '<div class="ppx-acc-head"><button type="button" class="ppx-acc-toggle" contenteditable="false" aria-expanded="true" title="Mostrar/Ocultar"></button><div class="ppx-acc-head-text" contenteditable="true"><strong>' + (defaultTitle || 'Sección') + '</strong></div>' +
        '<div class="ppx-acc-body" contenteditable="true"><p>Escribí acá…</p></div>' +
      '</div><p><br></p>';
  }

  function exampleHTML(){
    return '' +
      '<div class="ppx-example" data-ex="example">' +
        '<div class="ppx-block-tools">' +
          '<button type="button" class="ppx-block-del" title="Eliminar">✕</button>' +
          '<button type="button" class="ppx-block-after" title="Agregar línea debajo">↩︎</button>' +
        '</div>' +
        '<div class="ppx-ex">' +
          '<button type="button" class="ppx-ex-audio" title="Cargar o reproducir audio" contenteditable="false" data-url="">'+
            '<img class="ppx-ex-icon" src="'+ICON_PLAY+'" alt="" width="18" height="18">'+
          '</button>' +
          '<div class="ppx-ex-lines">' +
            '<div class="ppx-ex-sentence" contenteditable="true"><b>Escribí tu ejemplo acá…</b></div>' +
            '<div class="ppx-ex-translation" contenteditable="true"><i>Write the translation here…</i></div>' +
          '</div>' +
        '</div>' +
      '</div><p><br></p>';
  }

  // Editor-only exercise reference HTML
  function exrefHTML(item){
    var t = (item && item.type) || 'tf';
    var slug = (item && item.slug) || '';
    var title = (function(){
      if (!item) return slug || '';
      var es = item.title_es || '';
      var en = item.title_en || '';
      return L(es, en) || slug || '';
    })();
    var level = (item && item.level) || '';
    var label = L('Un poco de práctica', 'A little practice');
    return '' +
      '<div class="ppx-exref" data-exref="editor" data-ppx-type="'+t+'" data-ppx-slug="'+slug+'"'+(level?(' data-level="'+level+'"'):'')+'>'+
        '<div class="ppx-block-tools">'+
          '<button type="button" class="ppx-block-del" title="Eliminar">✕</button>'+
          '<button type="button" class="ppx-block-after" title="Agregar línea debajo">↩︎</button>'+
        '</div>'+
        '<button type="button" class="ppx-exref-card has-ico" contenteditable="false" data-ppx-exercise data-ppx-type="'+t+'" data-ppx-slug="'+slug+'" aria-label="'+(L('Abrir ejercicio: ','Open exercise: ')+title+' · '+L('Tipo: ','Type: ')+typeLabel(t)+(level?(' · '+L('Nivel: ','Level: ')+level):''))+'">'+
          '<div class="ppx-exref-grid">'+
            '<div class="ppx-exref-ico" aria-hidden="true"><img src="/static/assets/icons/pp_exercise.svg" alt="" width="72" height="72" loading="lazy" decoding="async" fetchpriority="low"></div>'+
            '<div class="ppx-exref-main">'+
              '<div class="ppx-exref-label">'+label+'</div>'+
              '<div class="ppx-exref-title">'+title+'</div>'+
              '<div class="ppx-exref-meta">'+
                '<div class="ppx-exref-meta-row"><span class="ppx-exref-meta-k">'+L('Tipo:','Type:')+'</span> <span class="ppx-pill ppx-pill--type">'+typeLabel(t)+'</span></div>'+
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
          '</div>'+
        '</button>'+
      '</div><p><br></p>';
  }

  function placeCaretEnd(node){
    try{
      var range = document.createRange();
      range.selectNodeContents(node);
      range.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }catch(_){}
  }

  // Selection preservation for color popovers
  var _lastRange = null;
  function saveSelection(){
    var sel = window.getSelection();
    if (sel && sel.rangeCount) _lastRange = sel.getRangeAt(0);
  }
  function restoreSelection(){
    if (_lastRange) {
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(_lastRange);
    }
  }

  // Basic embed sanitizer/normalizer
  function normalizeEmbed(input){
    if (!input) return null;
    var str = String(input).trim();

    if (/<iframe/i.test(str)) {
      var tmp = document.createElement('div');
      tmp.innerHTML = str;
      var ifr = tmp.querySelector('iframe');
      if (!ifr) return null;
      var src = ifr.getAttribute('src') || '';
      if (!src) return null;
      var clean = document.createElement('iframe');
      clean.src = src;
      clean.width = '100%';
      clean.height = ifr.getAttribute('height') || '420';
      clean.loading = 'lazy';
      clean.referrerPolicy = 'no-referrer-when-downgrade';
      clean.setAttribute('allowfullscreen', '');
      clean.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-presentation');
      return clean.outerHTML;
    }

    try {
      var u = new URL(str);
      var host = u.hostname.replace(/^www\./,'').toLowerCase();
      var src = null;

      if (host === 'youtube.com' || host === 'youtu.be') {
        var vid = null;
        if (host === 'youtu.be') vid = u.pathname.slice(1);
        else if (u.pathname === '/watch') vid = u.searchParams.get('v');
        else if (u.pathname.startsWith('/shorts/')) vid = u.pathname.split('/')[2];
        if (vid) src = 'https://www.youtube.com/embed/' + vid;
      }

      if (!src && (host.endsWith('canva.com') || host.endsWith('h5p.com') || host.endsWith('h5p.org'))) {
        src = str;
      }

      if (!src && u.protocol === 'https:') {
        src = str;
      }

      if (src) {
        return '<iframe src="'+src+'" width="100%" height="420" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"></iframe>';
      }
    } catch (_){}

    return null;
  }

  // Minimal picker modal for selecting a published exercise
  function openExercisePicker(onPick){
    try {
      var root = document.createElement('div');
      // Two-column layout: left = taxonomy filters, right = search + results
      root.style.display = 'grid';
      root.style.gridTemplateColumns = 'minmax(220px, 280px) 1fr';
      root.style.gap = '16px';

      // Left filters panel
      var left = document.createElement('aside');
      left.style.border = '1px solid #e5e7eb';
      left.style.borderRadius = '10px';
      left.style.padding = '.5rem .5rem';
      left.style.overflow = 'auto';
      left.style.maxHeight = '72vh';
      var leftTitle = document.createElement('div');
      leftTitle.style.font = '700 12px/1 Montserrat,system-ui';
      leftTitle.style.margin = '.25rem .25rem .5rem';
      leftTitle.textContent = L('Filtrar por tema','Filter by topic');
      left.appendChild(leftTitle);
      var txWrap = document.createElement('div');
      txWrap.setAttribute('role','tree');
      txWrap.style.display='block';
      txWrap.style.padding='.25rem';
      left.appendChild(txWrap);

      // Right panel
      var right = document.createElement('section');
      right.style.display = 'flex';
      right.style.flexDirection = 'column';
      right.style.gap = '10px';

      var row = document.createElement('div');
      row.className = 'ppx-row';
      row.style.gap = '.5rem';

      var input = document.createElement('input');
      input.type = 'search';
      input.placeholder = L('Buscar ejercicios publicados…','Search published exercises…');
      input.className = 'ppx-input';
      input.style.minWidth = '280px';
      row.appendChild(input);

      var typeSel = document.createElement('select');
      typeSel.className = 'ppx-input';
      typeSel.innerHTML = '<option value="">'+L('Todos los tipos','All types')+'</option>'+
        '<option value="tf">TF</option>'+
        '<option value="mcq">MCQ</option>'+
        '<option value="fitb">FITB</option>'+
        '<option value="dnd">DND</option>'+
        '<option value="dictation">'+L('Dictado','Dictation')+'</option>';
      row.appendChild(typeSel);

      var list = document.createElement('div');
      list.style.maxHeight = '72vh';
      list.style.overflow = 'auto';
      list.style.border = '1px solid #e5e7eb';
      list.style.borderRadius = '10px';
      list.style.padding = '.5rem';
      list.setAttribute('role','list');

      right.appendChild(row);
      right.appendChild(list);

      root.appendChild(left);
      root.appendChild(right);

      if (window.PPXModal && typeof PPXModal.open === 'function') {
        PPXModal.open({
          title: L('Insertar ejercicio','Insert exercise'),
          body: root,
          showLevel: false,
          actions: {
            close: { label: L('Cerrar','Close'), variant: 'primary', onClick: function(){ PPXModal.close(); } }
          }
        });
        // Default to fullscreen like glossary entries
        setTimeout(function(){ var m = document.querySelector('.ppx-modal'); if (m) m.classList.add('ppx-modal--fullscreen'); }, 0);
      }

      fetch('/admin/api/exercises?status=published&_='+Date.now(), { cache: 'no-store', credentials: 'same-origin' })
      .then(function(r){ return r.json(); }).then(function(json){
        var idx = json && json.data ? json.data : {};
        var items = Object.keys(idx).map(function(key){
          var it = idx[key] || {}; var parts = key.split('/');
          return {
            key: key,
            type: String(it.type||parts[0]||'').trim(),
            slug: String(parts[1]||'').trim(),
            title_es: it.title_es || '',
            title_en: it.title_en || '',
            level: it.level || '',
            taxonomy_paths: Array.isArray(it.taxonomy_paths) ? it.taxonomy_paths.slice() : []
          };
        });
        // Load taxonomy roots and one level of children
        var lang = (function(){ try { var cur = (window.PPX_I18N && window.PPX_I18N.currentLang) || document.documentElement.getAttribute('lang') || 'es'; return String(cur).toLowerCase().startsWith('en') ? 'en' : 'es'; } catch(_){ return 'es'; } })();
        var selected = new Set();
        fetch('/taxonomy/grammar?lang='+encodeURIComponent(lang)).then(function(r){ return r.json(); }).then(function(rootJson){
          var roots = (rootJson && rootJson.roots) || [];
          return Promise.all(roots.map(function(r){ return fetch('/taxonomy/grammar/'+encodeURIComponent(r.path)+'?lang='+encodeURIComponent(lang)).then(function(x){ return x.json(); }); })).then(function(childrenLists){
            // Build a flat checklist: roots and their immediate children
            roots.forEach(function(r, i){
              var lbl = r.display_title || (r.title && r.title[lang]) || r.path;
              var row = document.createElement('label');
              row.style.display='flex'; row.style.alignItems='center'; row.style.gap='.4rem'; row.style.padding='.25rem .35rem';
              var cb = document.createElement('input'); cb.type='checkbox'; cb.value=r.path;
              var sp = document.createElement('span'); sp.textContent = lbl;
              row.appendChild(cb); row.appendChild(sp); txWrap.appendChild(row);
              cb.addEventListener('change', function(){ if (cb.checked) selected.add(r.path); else selected.delete(r.path); render(); });
              var kids = (childrenLists[i] && childrenLists[i].children) || [];
              kids.forEach(function(c){
                var lbl2 = c.display_title || (c.title && c.title[lang]) || c.path;
                var row2 = document.createElement('label');
                row2.style.display='flex'; row2.style.alignItems='center'; row2.style.gap='.4rem'; row2.style.padding='.25rem .35rem'; row2.style.marginLeft='12px';
                var cb2 = document.createElement('input'); cb2.type='checkbox'; cb2.value=c.path;
                var sp2 = document.createElement('span'); sp2.textContent = lbl2;
                row2.appendChild(cb2); row2.appendChild(sp2); txWrap.appendChild(row2);
                cb2.addEventListener('change', function(){ if (cb2.checked) selected.add(c.path); else selected.delete(c.path); render(); });
              });
            });
          });
        }).catch(function(_){});

        function matchTaxonomy(it){
          if (!selected.size) return true;
          var paths = it.taxonomy_paths || [];
          if (!paths.length) return false;
          var ok = false;
          selected.forEach(function(sel){
            for (var i=0;i<paths.length;i++){
              var p = String(paths[i]||'');
              if (p === sel || p.indexOf(sel + '/') === 0) { ok = true; break; }
            }
          });
          return ok;
        }

        function render(){
          var q = (input.value||'').toLowerCase();
          var ty = (typeSel.value||'').toLowerCase();
          list.innerHTML = '';
          items.filter(function(it){
            if (ty && it.type !== ty) return false;
            if (!matchTaxonomy(it)) return false;
            if (!q) return true;
            return (it.key.toLowerCase().includes(q) || (it.title_es||'').toLowerCase().includes(q) || (it.title_en||'').toLowerCase().includes(q));
          }).forEach(function(it){
            var row = document.createElement('div');
            row.style.display = 'grid';
            row.style.gridTemplateColumns = '1fr auto';
            row.style.alignItems = 'center';
            row.style.gap = '.5rem';
            row.style.padding = '.5rem .6rem';
            row.style.borderBottom = '1px solid #f1f5f9';

            var left = document.createElement('div');
            var title = L(it.title_es||it.slug, it.title_en||it.slug);
            left.innerHTML = '<div style="font-weight:600">'+title+'</div>'+
              '<div class="ppx-muted" style="font-size:12px">'+ typeLabel(it.type) + (it.level ? ' · '+it.level : '') + '</div>';
            var btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'ppx-btn ppx-btn--sm';
            btn.textContent = L('Insertar','Insert');
            btn.addEventListener('click', function(){
              try { if (typeof onPick === 'function') onPick(it); } finally { if (window.PPXModal) PPXModal.close(); }
            });
            row.appendChild(left); row.appendChild(btn);
            list.appendChild(row);
          });
        }

        input.addEventListener('input', render);
        typeSel.addEventListener('change', render);
        render();
      }).catch(function(err){
        list.innerHTML = '<div class="ppx-state--bad">'+L('No se pudo cargar la lista.','Could not load list.')+'</div>';
        console.error(err);
      });
    } catch (e) {
      alert(L('No se pudo abrir el selector.','Could not open picker.'));
      console.error(e);
    }
  }

  // Helpers for upload/playback
  function getSlugFromPath(){
    var m = location.pathname.match(/\/admin\/articles\/([^/]+)\/edit/i);
    return m ? decodeURIComponent(m[1]) : '';
  }
  function uploadAudioForArticle(slug, file, basename){
    var fd = new FormData();
    fd.append('file', file);
    if (basename) fd.append('basename', basename);
    return fetch('/admin/articles/' + encodeURIComponent(slug) + '/upload-audio', {
      method: 'POST',
      body: fd,
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).then(function(res){ return res.json().then(function(j){ return {status: res.status, json: j}; }); });
  }

  // ---------------- contentEditable editor ----------------
  function initFallback(textarea) {
    var wrapper = document.createElement('div');
    wrapper.className = 'ppx-editor-wrap';
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = 'none';
    wrapper.style.margin = '0';
    wrapper.style.boxSizing = 'border-box';
    var toolbar = buildToolbar();
    var editor = document.createElement('div');
    editor.className = 'ppx-fallback-editor';
    editor.contentEditable = 'true';
    editor.style.border = '1px solid #e5e7eb';
    editor.style.borderRadius = '10px';
    editor.style.minHeight = '560px';
    editor.style.width = '100%';
    editor.style.resize = 'vertical';
    editor.style.overflow = 'auto';
    editor.style.background = '#fff';
    editor.style.padding = '.75rem';

    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(editor);

    editor.innerHTML = textarea.value || '<p><br></p>';
    textarea.style.display = 'none';
    // Outline (H2/H3) — build and update on demand
    (function initOutline(){
      function slugify(txt){ try { return String(txt||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''); } catch(_) { return 'sec-'+uid(); } }
      function ensureId(h){ if (!h.id) { h.id = slugify(h.textContent||'') || ('sec-'+uid()); } return h.id; }
      function build(){
        var panel = document.getElementById('ppx-outline'); if (!panel) return;
        var hs = editor.querySelectorAll('h2, h3');
        var html = ['<div class="ppx-muted" style="font-weight:600;margin:.25rem .25rem .5rem;">Outline</div>'];
        hs.forEach(function(h){ var id=ensureId(h); var lvl=h.tagName==='H3'?3:2; html.push('<div style="padding:.15rem .35rem;margin:.1rem 0;">'+ (lvl===3?'&nbsp;&nbsp;':'') +'<a href="#'+id+'" data-goto="'+id+'" style="text-decoration:none;color:#111827;">'+ (h.textContent||'') +'</a></div>'); });
        panel.innerHTML = html.join('');
      }
      var tgl = document.getElementById('ppx-outline-toggle');
      if (tgl) tgl.addEventListener('click', function(){ var p=document.getElementById('ppx-outline'); if (!p) return; build(); p.style.display = (p.style.display==='none'||!p.style.display)?'block':'none'; });
      editor.addEventListener('input', function(){ var p=document.getElementById('ppx-outline'); if (p && p.style.display!=='none') build(); });
      document.addEventListener('click', function(e){ var a=e.target && e.target.closest && e.target.closest('#ppx-outline a[data-goto]'); if (!a) return; e.preventDefault(); var id=a.getAttribute('data-goto');
        try { var el=id && editor.querySelector('#'+CSS.escape(id)); if (el) { el.scrollIntoView({behavior:'smooth',block:'center'}); el.focus && el.focus(); } } catch(_){}
      });
    })();

    // Keyboard shortcut: Cmd/Ctrl+S submits the form; add formatting shortcuts
    (function addSaveShortcut(){
      var form = textarea.closest('form');
      if (!form) return;
      wrapper.addEventListener('keydown', function(e){
        // Save
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); form.requestSubmit(); return; }
        // Headings: map H1 to H2; allow H2/H3
        if ((e.ctrlKey || e.metaKey) && (e.key === '1' || e.key === '2' || e.key === '3')) {
          e.preventDefault();
          var level = (e.key === '3') ? 'H3' : 'H2';
          try { document.execCommand('formatBlock', false, level); } catch(_){}
          return;
        }
        // Link (Ctrl/Cmd+K)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
          e.preventDefault();
          try {
            var url = prompt('Link URL');
            if (url) document.execCommand('createLink', false, url);
          } catch(_){}
          return;
        }
        // Soft line break (Shift+Enter)
        if (e.shiftKey && e.key === 'Enter') {
          e.preventDefault();
          try { document.execCommand('insertLineBreak'); } catch(_){}
          return;
        }
      }, true);
    })();

    // Dirty guard: prompt on unload if there are unsaved changes
    (function dirtyGuard(){
      var form = textarea.closest('form');
      if (!form) return;
      var DIRTY = false;
      function mark(){ DIRTY = true; }
      editor.addEventListener('input', mark);
      form.querySelectorAll('input,textarea,select').forEach(function(n){ n.addEventListener('input', mark); });
      window.addEventListener('beforeunload', function(e){ if (DIRTY) { e.preventDefault(); e.returnValue=''; }});
      form.addEventListener('submit', function(){ DIRTY = false; });
    })();

    // ─────────────────────────────────────────────────────────
    // Minimal block tools (hover) + editor accordion styles
    // ─────────────────────────────────────────────────────────
    (function attachBlockToolsCSS(){
      var css = document.createElement('style');
      css.textContent =
      '.ppx-example,.ppx-acc,.ppx-exref{position:relative;width:100%;text-align:left !important;margin-left:0;margin-right:0}' +
        '.ppx-editor-wrap{width:100% !important;max-width:none !important;margin:0 !important}' +
        /* force left alignment + horizontal text flow inside editor accordions */
        '.ppx-acc, .ppx-acc *{ text-align:left !important; writing-mode: horizontal-tb !important; direction:ltr !important }' +
        /* ensure inner parts also render left-aligned to match public */
        '.ppx-acc-head,.ppx-acc-body,.ppx-ex{ text-align:left !important }' +
        '.ppx-acc-head-text{min-width:0; display:block; white-space:normal; overflow-wrap:anywhere; word-break:normal}' +
        '.ppx-acc-head-text strong, .ppx-acc-head-text em{ display:inline; white-space:normal }' +
        /* mirror public grid for example blocks so editor matches published view */
        '.ppx-example .ppx-ex{display:grid;grid-template-columns:44px 1fr;grid-auto-rows:auto;column-gap:12px;align-items:start;justify-items:start;justify-content:start;width:100%;min-width:0;margin:0;padding:0;max-width:none;box-sizing:border-box}' +
        '.ppx-example .ppx-ex-audio{grid-column:1;grid-row:1 / span 2;justify-self:start;align-self:center}' +
        '.ppx-example .ppx-ex-lines{grid-column:2;grid-row:1 / span 2;display:flex;flex-direction:column;gap:.25rem;align-items:flex-start;text-align:left;min-width:0;justify-self:start}' +
        '.ppx-block-tools{position:absolute;top:6px;right:6px;display:flex;gap:6px;opacity:0;transition:opacity .2s ease;z-index:10}' +
      '.ppx-example:hover .ppx-block-tools,.ppx-acc:hover .ppx-block-tools,.ppx-exref:hover .ppx-block-tools{opacity:1}' +
        '.ppx-block-tools button{font:700 11px/1 Montserrat,system-ui;padding:.25rem .4rem;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer}' +
        '.ppx-block-tools button:hover{background:#f8fafc}' +
        '.ppx-btn-mini.is-active{box-shadow:inset 0 0 0 2px #e5e7eb;background:#f8fafc}' +
        '.ppx-acc{border:1px solid var(--ppx-color-line,#e5e7eb);border-radius:12px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.04);margin:1rem 0;overflow:hidden}' +
        '.ppx-acc-head{display:grid;width:100%;box-sizing:border-box;grid-template-columns:22px minmax(0,1fr);align-items:center;gap:.75rem;padding:1rem 1.25rem;color:var(--ppx-color-text,#0f172a);user-select:contain;cursor:text;list-style:none;background:#fff}' +
        '.ppx-acc-head:focus{outline:none}' +
        /* In editor, we show a real toggle button; hide the decorative pseudo */
        '.ppx-acc-head::before{display:none}' +
        '.ppx-acc-toggle{grid-column:1;justify-self:center;align-self:center;width:18px;height:18px;border:0;background:currentColor;color:var(--ppx-brand-5,#6c606c);cursor:pointer;padding:0;opacity:.95;-webkit-mask:url("data:image/svg+xml,%3Csvg viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M5 7l5 6 5-6\' fill=\'none\' stroke=\'%23000\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M5 7l5 6 5-6\' fill=\'none\' stroke=\'%23000\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E") center/contain no-repeat}' +
        '.ppx-acc-head-text{min-width:0;grid-column:2;display:block;white-space:normal;overflow-wrap:anywhere;word-break:break-word}' +
        '.ppx-acc-head strong{font-weight:600}' +
        '.ppx-acc-body{border-top:1px solid var(--ppx-color-line,#e5e7eb);padding:0 1.25rem 1.25rem 1.25rem;background:#fff}' +
        '.ppx-acc[data-collapsed="true"] .ppx-acc-body{display:none}' +
        '.ppx-acc-body > *:first-child{margin-top:1rem}' +
      '.ppx-acc-body > *:last-child{margin-bottom:0}' +
      /* exref card (editor visuals) */
      '.ppx-exref{border:1px solid var(--ppx-color-line,#e5e7eb);border-radius:12px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.04);margin:1rem 0;overflow:hidden}' +
      '.ppx-exref-card{display:flex;align-items:center;justify-content:space-between;gap:.75rem;width:100%;padding:1rem 1.25rem;border:0;background:#fff;text-align:left;cursor:default}' +
      '.ppx-exref-left{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;min-width:0}' +
      '.ppx-exref-label{font:700 12px/1 Montserrat,system-ui;color:#475dd7}' +
      '.ppx-exref-title{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:48ch}' +
      '.ppx-exref-right{display:inline-flex;align-items:center;gap:.35rem}' +
      '.ppx-exref .ppx-pill{font:700 11px/1 Montserrat,system-ui;padding:.15rem .45rem;border-radius:999px;background:#eef2ff;color:#3730a3}' +
      '';
    document.head.appendChild(css);
    })();

    function addBlockTools(el){
      if (!el || el.querySelector('.ppx-block-tools')) return;
      var tools = document.createElement('div');
      tools.className = 'ppx-block-tools';
      tools.innerHTML =
        '<button type="button" class="ppx-block-del" title="Eliminar">✕</button>' +
        '<button type="button" class="ppx-block-after" title="Agregar línea debajo">↩︎</button>';
      el.insertBefore(tools, el.firstChild);
    }

    // Add tools to any pre-existing blocks in editor
    $all('.ppx-acc, .ppx-example, .ppx-exref', editor).forEach(addBlockTools);
    $all('.ppx-acc .ppx-acc, .ppx-acc .ppx-example, .ppx-acc .ppx-exref', editor).forEach(addBlockTools);

    // Legacy migration: convert checkbox/label accordions to editable head/body
    (function migrateLegacyAccordions(){
      $all('.ppx-acc', editor).forEach(function(acc){
        var hasInput = acc.querySelector('input.ppx-acc-toggle');
        var label = acc.querySelector('label.ppx-acc-head');
        var headDiv = acc.querySelector('div.ppx-acc-head');
        var body = acc.querySelector('.ppx-acc-body');
        if (!body) return;

        // If already modern: ensure contenteditable attributes exist and inject toggle/button structure
        if (!hasInput && headDiv) {
          if (!headDiv.querySelector('.ppx-acc-toggle')) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ppx-acc-toggle';
            btn.setAttribute('contenteditable','false');
            btn.setAttribute('aria-expanded','true');
            btn.title = 'Mostrar/Ocultar';
            headDiv.insertBefore(btn, headDiv.firstChild);
            var wrap = document.createElement('div');
            wrap.className = 'ppx-acc-head-text';
            wrap.setAttribute('contenteditable','true');
            while (btn.nextSibling) { wrap.appendChild(btn.nextSibling); }
            headDiv.appendChild(wrap);
          }
          if (!body.hasAttribute('contenteditable')) body.setAttribute('contenteditable','true');
          // Fix: ensure body is a sibling of head (not nested inside)
          if (body.parentNode === headDiv) {
            var accRoot = headDiv.parentNode;
            if (accRoot) {
              if (headDiv.nextSibling) accRoot.insertBefore(body, headDiv.nextSibling);
              else accRoot.appendChild(body);
            }
          }
          // Enforce inline layout for safety
          try {
            headDiv.style.display = 'grid';
            headDiv.style.gridTemplateColumns = '22px 1fr';
            headDiv.style.alignItems = 'center';
            headDiv.style.gap = '.75rem';
            headDiv.style.textAlign = 'left';
            headDiv.style.width = '100%';
            headDiv.style.boxSizing = 'border-box';
            var ht2 = headDiv.querySelector('.ppx-acc-head-text');
            if (ht2) {
              ht2.style.display = 'block';
              ht2.style.minWidth = '0';
              ht2.style.whiteSpace = 'normal';
              ht2.style.overflowWrap = 'anywhere';
              ht2.style.wordBreak = 'normal';
            }
          } catch(_){}
          return;
        }

        // Legacy -> Modern
        var titleHTML = label ? label.innerHTML : '<strong>Sección</strong>';
        if (label) label.remove();
        if (hasInput) hasInput.remove();

        var newHead = document.createElement('div');
        newHead.className = 'ppx-acc-head';
        newHead.innerHTML = '<button type="button" class="ppx-acc-toggle" contenteditable="false" aria-expanded="true" title="Mostrar/Ocultar"></button>' +
                             '<div class="ppx-acc-head-text" contenteditable="true">' + (titleHTML || '<strong>Sección</strong>') + '</div>';

        if (!body.hasAttribute('contenteditable')) body.setAttribute('contenteditable','true');
        // Enforce inline layout for safety
        try {
          newHead.style.display = 'grid';
          newHead.style.gridTemplateColumns = '22px 1fr';
          newHead.style.alignItems = 'center';
          newHead.style.gap = '.75rem';
          newHead.style.textAlign = 'left';
          newHead.style.width = '100%';
          newHead.style.boxSizing = 'border-box';
          var ht3 = newHead.querySelector('.ppx-acc-head-text');
          if (ht3) {
            ht3.style.display = 'block';
            ht3.style.minWidth = '0';
            ht3.style.whiteSpace = 'normal';
            ht3.style.overflowWrap = 'anywhere';
            ht3.style.wordBreak = 'normal';
          }
        } catch(_){}

        // Insert head before body
        var tools = acc.querySelector('.ppx-block-tools');
        if (tools) acc.insertBefore(newHead, tools.nextSibling);
        else acc.insertBefore(newHead, acc.firstChild);
      });
    })();

    // Handle tools clicks (delete / line-below)
    editor.addEventListener('click', function(e){
      var tog = e.target.closest && e.target.closest('.ppx-acc-toggle');
      if (tog) {
        var acc = tog.closest('.ppx-acc');
        if (acc) {
          var isColl = acc.getAttribute('data-collapsed') === 'true';
          acc.setAttribute('data-collapsed', isColl ? 'false' : 'true');
          tog.setAttribute('aria-expanded', isColl ? 'true' : 'false');
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      var del = e.target.closest && e.target.closest('.ppx-block-del');
      var aft = e.target.closest && e.target.closest('.ppx-block-after');
      if (!del && !aft) return;

      e.preventDefault();
      e.stopPropagation();

      var block = e.target.closest && e.target.closest('.ppx-acc, .ppx-example, .ppx-exref');
      if (!block) return;

      if (del) {
        var next = block.nextSibling;
        block.remove();
        var target = null;
        if (next && next.nodeType === 1) target = next;
        if (!target){
          target = document.createElement('p'); target.innerHTML = '<br>';
          if (editor.lastChild) editor.appendChild(target); else editor.appendChild(target);
        }
        placeCaretEnd(target);
        return;
      }

      if (aft) {
        var p = document.createElement('p'); p.innerHTML = '<br>';
        if (block.parentNode) block.parentNode.insertBefore(p, block.nextSibling);
        else editor.appendChild(p);
        placeCaretEnd(p);
        return;
      }
    });

    // Active state for inline formatting buttons
    function refreshInlineStates(){
      [['.ppx-bold','bold'],['.ppx-italic','italic'],['.ppx-underline','underline'],['.ppx-strike','strikeThrough']]
      .forEach(function(pair){
        var btn = toolbar.querySelector(pair[0]);
        if (!btn) return;
        var on = false; try { on = document.queryCommandState(pair[1]); } catch(_){}
        btn.classList.toggle('is-active', !!on);
      });
    }
    editor.addEventListener('keyup', refreshInlineStates);
    editor.addEventListener('mouseup', refreshInlineStates);
    editor.addEventListener('input', refreshInlineStates);

    // Block selection styles
    var _ppxSelCSS = document.createElement('style');
    _ppxSelCSS.textContent =
      '.ppx-selected-block{outline:2px solid #475dd7;outline-offset:2px;border-radius:10px}'+
      '.ppx-btn-mini.is-active{box-shadow:inset 0 0 0 2px #e5e7eb;background:#f8fafc}';
    document.head.appendChild(_ppxSelCSS);

    function selectBlock(block){
      if (!block) return;
      clearBlockSelection();
      block.classList.add('ppx-selected-block');
      editor.focus();
    }
    function clearBlockSelection(){
      var cur = editor.querySelector('.ppx-selected-block');
      if (cur) cur.classList.remove('ppx-selected-block');
    }

    // Click selection behavior
    editor.addEventListener('click', function (e) {
      // Prevent public runtime from opening inside editor when clicking exref
      if (e.target.closest && e.target.closest('.ppx-exref-card')) { e.preventDefault(); e.stopPropagation(); }
      var block = e.target.closest && (e.target.closest('.ppx-acc') || e.target.closest('.ppx-example') || e.target.closest('.ppx-exref'));
      if (block) {
        var inEditable = e.target.closest('.ppx-acc-head, .ppx-acc-body, .ppx-ex-lines');
        if (inEditable) { clearBlockSelection(); }
        else { selectBlock(block); }
      } else {
        clearBlockSelection();
      }
    });

    // Helper: find editable root inside current block (head/body or ex-lines)
    function editableRootFromNode(n){
      if (!n || !n.closest) return null;
      return n.closest('.ppx-acc-head, .ppx-acc-body, .ppx-ex-lines');
    }

    // Helpers: caret at start/end of a container
    function caretAtStart(range, container){
      try {
        var r = range.cloneRange();
        r.selectNodeContents(container);
        r.collapse(true);
        return range.compareBoundaryPoints(Range.START_TO_START, r) === 0;
      } catch(_){ return false; }
    }
    function caretAtEnd(range, container){
      try {
        var r = range.cloneRange();
        r.selectNodeContents(container);
        r.collapse(false);
        return range.compareBoundaryPoints(Range.END_TO_END, r) === 0;
      } catch(_){ return false; }
    }

    // Insert paragraph inside a container (used for body)
    function insertParaInside(container, atStart){
      var p = document.createElement('p'); p.innerHTML = '<br>';
      if (atStart) container.insertBefore(p, container.firstChild);
      else container.appendChild(p);
      placeCaretEnd(p);
      clearBlockSelection();
    }

    // Keyboard rules for blocks (robust)
    editor.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { clearBlockSelection(); return; }

      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      var range = sel.getRangeAt(0);
      var anchorEl = (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentNode);

      // If a whole block is selected, disallow Backspace/Delete (use ✕)
      if ((e.key === 'Backspace' || e.key === 'Delete') && editor.querySelector('.ppx-selected-block')) {
        e.preventDefault();
        return;
      }

      var block = anchorEl && anchorEl.closest && anchorEl.closest('.ppx-acc, .ppx-example, .ppx-exref');
      if (!block) return; // Normal editing outside blocks

      var editable = editableRootFromNode(anchorEl) || block;

      // Guard rails: don't merge out of block
      if (e.key === 'Backspace' && caretAtStart(range, editable)) {
        e.preventDefault();
        return;
      }
      if (e.key === 'Delete' && caretAtEnd(range, editable)) {
        e.preventDefault();
        return;
      }

      // Title-specific Enter behavior: Enter in .ppx-acc-head → create first paragraph in body
      if (e.key === 'Enter' && editable.classList.contains('ppx-acc-head')) {
        e.preventDefault();
        var body = block.querySelector('.ppx-acc-body');
        if (body) insertParaInside(body, true);
        return;
      }

      // Body end Enter → stay inside (append new paragraph)
      if (e.key === 'Enter' && editable.classList.contains('ppx-acc-body') && caretAtEnd(range, editable)) {
        e.preventDefault();
        insertParaInside(editable, false);
        return;
      }

      // Keyboard navigation: allow moving outside blocks like public
      function moveCaretAfterBlock(b){
        var next = b.nextSibling;
        if (next && next.nodeType === 1) { placeCaretEnd(next); return; }
        var p = document.createElement('p'); p.innerHTML = '<br>';
        if (b.parentNode) b.parentNode.insertBefore(p, b.nextSibling);
        placeCaretEnd(p);
      }
      function moveCaretBeforeBlock(b){
        var prev = b.previousSibling;
        if (prev && prev.nodeType === 1) { placeCaretEnd(prev); return; }
        var p = document.createElement('p'); p.innerHTML = '<br>';
        if (b.parentNode) b.parentNode.insertBefore(p, b);
        placeCaretEnd(p);
      }
      if (e.key === 'Tab' && caretAtEnd(range, editable)) { e.preventDefault(); return; }
      if (e.key === 'ArrowDown' && caretAtEnd(range, editable)) {
        e.preventDefault();
        moveCaretAfterBlock(block);
        return;
      }
      if (e.key === 'ArrowUp' && caretAtStart(range, editable)) {
        e.preventDefault();
        moveCaretBeforeBlock(block);
        return;
      }
    });

    // Paste sanitization: in title, keep inline only
    editor.addEventListener('paste', function(e){
      var target = e.target.closest && e.target.closest('.ppx-acc-head');
      if (!target) return;

      e.preventDefault();
      var text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
      if (typeof document.execCommand === 'function') {
        document.execCommand('insertText', false, text.replace(/\r?\n+/g, ' '));
      } else {
        // Fallback: insert a text node
        var t = document.createTextNode(text.replace(/\r?\n+/g, ' '));
        var sel = window.getSelection(); if (!sel || !sel.rangeCount) return;
        var r = sel.getRangeAt(0);
        r.deleteContents();
        r.insertNode(t);
        r.setStartAfter(t);
        r.setEndAfter(t);
        sel.removeAllRanges(); sel.addRange(r);
      }
    });

  function cmd(name, value){
    document.execCommand(name, false, value || null);
    editor.focus();
  }

  // --- Heading helpers ---
  function normalizeHeadingLevel(level) {
    // Accept 'P', 'H1', 'H2', 'H3', normalize H1->H2 and H4+ -> H3
    if (!level) return 'P';
    var L = String(level).toUpperCase();
    if (L === 'H1') return 'H2';
    if (L === 'H4' || L === 'H5' || L === 'H6') return 'H3';
    if (L === 'H2' || L === 'H3' || L === 'P') return L;
    return 'P';
  }

  function isBlock(el) {
    return el && el.nodeType === 1 && /^(P|H1|H2|H3|H4|H5|H6|DIV|BLOCKQUOTE)$/i.test(el.tagName);
  }

  function topEditableAncestor(node) {
    var n = node;
    if (!n) return null;
    if (n.nodeType === 3) n = n.parentNode;
    while (n && n !== editor && !isBlock(n)) n = n.parentNode;
    return n && n !== editor ? n : null;
  }

  function blocksInRange(range) {
    var root = range.commonAncestorContainer;
    while (root && root.nodeType !== 1) root = root.parentNode;
    var list = [];
    var walker = document.createTreeWalker(root || editor, NodeFilter.SHOW_ELEMENT, null);
    while (walker.nextNode()) {
      var el = walker.currentNode;
      if (!isBlock(el)) continue;
      try { if (range.intersectsNode(el) && editor.contains(el)) list.push(el); } catch(_) {}
    }
    if (!list.length) {
      var a = topEditableAncestor(range.startContainer); if (a) list.push(a);
    }
    // Only top-most blocks within editor
    return list.filter(function(el){ return el.parentNode === editor || el.closest('.ppx-acc-body, .ppx-acc, .ppx-example, .ppx-exref') || true; });
  }

  function replaceTag(el, newTag) {
    var tag = newTag.toUpperCase();
    if (el.tagName === tag) return el;
    // Treat DIV as P when converting to paragraphs
    if (tag === 'P' && (el.tagName === 'DIV' || el.tagName === 'BLOCKQUOTE')) {
      // Create P and move children
      var p = document.createElement('p');
      while (el.firstChild) p.appendChild(el.firstChild);
      el.parentNode.replaceChild(p, el);
      return p;
    }
    var repl = document.createElement(tag);
    // preserve inline styles minimally
    if (el.getAttribute('style')) repl.setAttribute('style', el.getAttribute('style'));
    while (el.firstChild) repl.appendChild(el.firstChild);
    el.parentNode.replaceChild(repl, el);
    return repl;
  }

  function applyHeadingToSelection(targetLevel) {
    var desired = normalizeHeadingLevel(targetLevel);
    var sel = window.getSelection(); if (!sel || !sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    var blocks = blocksInRange(range);
    if (!blocks.length) return;

    // Determine toggle behavior: if all blocks already same as desired, toggle to P
    var allSame = blocks.every(function(b){
      var t = b.tagName;
      t = (t === 'DIV' || t === 'BLOCKQUOTE') ? 'P' : t;
      if (t === 'H1') t = 'H2';
      if (t === 'H4' || t === 'H5' || t === 'H6') t = 'H3';
      return t === desired;
    });
    var toTag = allSame ? 'P' : desired;

    // Apply to each block
    var newFocus = null;
    blocks.forEach(function(b){
      var t = (b.tagName === 'DIV' || b.tagName === 'BLOCKQUOTE') ? 'P' : b.tagName;
      if (t === 'H1') t = 'H2';
      if (t === 'H4' || t === 'H5' || t === 'H6') t = 'H3';
      if (t !== toTag) {
        var repl = replaceTag(b, toTag);
        if (!newFocus) newFocus = repl;
      }
    });

    if (newFocus) {
      try {
        var r = document.createRange();
        r.selectNodeContents(newFocus);
        r.collapse(true);
        sel.removeAllRanges(); sel.addRange(r);
      } catch(_){}
    }
  }

    // Inline states
    function updateActiveStates(){
      var map = [
        ['bold', '.ppx-bold'],
        ['italic', '.ppx-italic'],
        ['underline', '.ppx-underline'],
        ['strikeThrough', '.ppx-strike']
      ];
      map.forEach(function(pair){
              // Reflect current block in heading label
      try {
        var sel = window.getSelection();
        var label = toolbar.querySelector('.ppx-head-label');
        if (sel && sel.rangeCount && label) {
          var n = sel.getRangeAt(0).startContainer; while (n && n.nodeType !== 1) n = n.parentNode;
          var tag = (n && n.closest && n.closest('H2, H3')) ? n.closest('H2, H3').tagName : 'P';
          label.textContent = (tag === 'H2') ? 'Heading 2' : (tag === 'H3' ? 'Heading 3' : 'Paragraph');
        }
      } catch(_){}
        var state = false;
        try { state = document.queryCommandState(pair[0]); } catch(_){ state = false; }
        var btn = toolbar.querySelector(pair[1]);
        if (btn) btn.classList.toggle('is-active', !!state);
      });
    }

    // Toggle/close color popovers
    function closeAllPops(except){
      $all('.ppx-color-pop', toolbar).forEach(function (p) {
        if (p !== except) p.setAttribute('aria-hidden','true');
      });
      $all('.ppx-color-btn', toolbar).forEach(function (b) {
        if (!except || b.getAttribute('aria-controls') !== except.id) b.setAttribute('aria-expanded','false');
      });
    }

    toolbar.addEventListener('click', function (e) {
      var t = e.target;

      // Color swatch click
      if (t.classList.contains('ppx-chip')) {
        var hex = (t.getAttribute('data-hex') || '').trim();
        var wrap = t.closest('.ppx-color-wrap');
        // Clear action (remove color/highlight)
        if (!hex && wrap && t.getAttribute('data-action') === 'clear') {
          restoreSelection();
          try {
            var kind = wrap.getAttribute('data-kind') || '';
            var sel = window.getSelection(); if (!sel || !sel.rangeCount) return;
            var range = sel.getRangeAt(0);
            function clearStyleInRange(range, styleProp){
              var root = range.commonAncestorContainer;
              while (root && root.nodeType !== 1) root = root.parentNode;
              var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_ELEMENT, null);
              var nodes = [];
              while (walker.nextNode()) {
                var el = walker.currentNode;
                try { if (range.intersectsNode(el)) nodes.push(el); } catch(_){}
              }
              nodes.forEach(function(el){ if (el && el.style && el.style[styleProp] !== undefined) { el.style[styleProp] = ''; if (!el.getAttribute('style')) el.removeAttribute('style'); } });
            }
            if (kind === 'ppx-back') {
              // Try native first
              if (document.queryCommandSupported && document.queryCommandSupported('hiliteColor')) { try { document.execCommand('hiliteColor', false, 'transparent'); } catch(_){} }
              clearStyleInRange(range, 'backgroundColor');
            } else {
              if (document.queryCommandSupported && document.queryCommandSupported('foreColor')) { try { document.execCommand('foreColor', false, '#0f172a'); } catch(_){} }
              clearStyleInRange(range, 'color');
            }
          } catch(_){}
          closeAllPops();
          e.preventDefault();
          return;
        }
        if (hex && wrap) {
          restoreSelection();
          if (wrap.getAttribute('data-kind') === 'ppx-fore') {
            cmd('foreColor', hex);
            var iconF = wrap.querySelector('.ppx-icon-fore'); if (iconF) iconF.style.color = hex;
          } else {
            if (document.queryCommandSupported('hiliteColor')) cmd('hiliteColor', hex);
            else cmd('backColor', hex);
            var iconB = wrap.querySelector('.ppx-icon-back'); if (iconB) iconB.style.background = hex;
          }
          closeAllPops();
        }
        e.preventDefault();
        return;
      }

            // Heading dropdown open/close
      if (t.classList.contains('ppx-head-dd')) {
        var pop = toolbar.querySelector('.ppx-head-pop');
        if (pop) {
          var open = pop.getAttribute('aria-hidden') === 'false';
          pop.setAttribute('aria-hidden', open ? 'true' : 'false');
          t.setAttribute('aria-expanded', open ? 'false' : 'true');
        }
        e.preventDefault();
        return;
      }
      if (t.classList.contains('ppx-head-opt') || (t.closest && t.closest('.ppx-head-opt'))) {
        var opt = t.classList.contains('ppx-head-opt') ? t : t.closest('.ppx-head-opt');
        var level = (opt && opt.getAttribute('data-level')) || 'P';
        restoreSelection();
        try { applyHeadingToSelection(level); } catch(_){}
        var pop2 = toolbar.querySelector('.ppx-head-pop'); var btn2 = toolbar.querySelector('.ppx-head-dd');
        if (pop2) pop2.setAttribute('aria-hidden','true'); if (btn2) btn2.setAttribute('aria-expanded','false');
        e.preventDefault();
        updateActiveStates();
        return;
      }
      // Open/close color popover
      if (t.classList.contains('ppx-color-btn') || t.closest('.ppx-color-btn')) {
        var btn = t.classList.contains('ppx-color-btn') ? t : t.closest('.ppx-color-btn');
        var popId = btn.getAttribute('aria-controls');
        var pop = document.getElementById(popId);
        if (!pop) return;
        var isOpen = pop.getAttribute('aria-hidden') === 'false';
        saveSelection();
        closeAllPops();
        if (!isOpen) {
          pop.setAttribute('aria-hidden','false');
          btn.setAttribute('aria-expanded','true');
        }
        e.preventDefault();
        return;
      }

      // Accordion insert
      if (t.classList.contains('ppx-insert-acc')) {
        var tmp = document.createElement('div');
        tmp.innerHTML = accordionHTML('Sección', true);
        var frag = document.createDocumentFragment();
        while (tmp.firstChild) frag.appendChild(tmp.firstChild);
        var sel = window.getSelection();
        if (sel && sel.rangeCount) {
          var r = sel.getRangeAt(0);
          r.deleteContents();
          r.insertNode(frag);
        } else {
          editor.appendChild(frag);
        }
        // Normalize the just-inserted accordion structure (ensure body is sibling)
        var accEl = editor.querySelector('.ppx-acc:last-of-type');
        if (accEl) {
          var headEl = accEl.querySelector('.ppx-acc-head');
          var bodyEl = accEl.querySelector('.ppx-acc-body');
          if (headEl && bodyEl && bodyEl.parentNode === headEl) {
            if (headEl.nextSibling) accEl.insertBefore(bodyEl, headEl.nextSibling);
            else accEl.appendChild(bodyEl);
          }
          // Enforce sane inline layout to avoid 1-char-per-line or centering
          if (headEl) {
            try {
              headEl.style.display = 'grid';
              headEl.style.gridTemplateColumns = '22px 1fr';
              headEl.style.alignItems = 'center';
              headEl.style.gap = '.75rem';
              headEl.style.textAlign = 'left';
              headEl.style.width = '100%';
              headEl.style.boxSizing = 'border-box';
              var ht = headEl.querySelector('.ppx-acc-head-text');
              if (ht) {
                ht.style.display = 'block';
                ht.style.minWidth = '0';
                ht.style.whiteSpace = 'normal';
                ht.style.overflowWrap = 'anywhere';
                ht.style.wordBreak = 'normal';
              }
            } catch (_) {}
          }
          // focus the title so renaming works immediately
          if (headEl) placeCaretEnd(headEl);
        }
        e.preventDefault();
        return;
      }

      // Example insert
      if (t.classList.contains('ppx-insert-example')) {
        var tmpE = document.createElement('div');
        tmpE.innerHTML = exampleHTML();
        var fragE = document.createDocumentFragment();
        while (tmpE.firstChild) fragE.appendChild(tmpE.firstChild);
        var selE = window.getSelection();
        if (selE && selE.rangeCount) {
          var rE = selE.getRangeAt(0);
          rE.deleteContents();
          rE.insertNode(fragE);
        } else {
          editor.appendChild(fragE);
        }
        var firstLine = editor.querySelector('.ppx-example:last-of-type .ppx-ex-sentence');
        if (firstLine) placeCaretEnd(firstLine);
        e.preventDefault();
        return;
      }

      
      // Exercise reference insert (opens picker)
      if (t.classList.contains('ppx-insert-exref') || (t.closest && t.closest('.ppx-insert-exref'))) {
        openExercisePicker(function (item) {
          try {
            var html = exrefHTML(item);
            var tmpX = document.createElement('div'); tmpX.innerHTML = html;
            var fragX = document.createDocumentFragment();
            while (tmpX.firstChild) fragX.appendChild(tmpX.firstChild);
            var selX = window.getSelection();
            if (selX && selX.rangeCount) {
              var rX = selX.getRangeAt(0);
              rX.deleteContents();
              rX.insertNode(fragX);
            } else {
              editor.appendChild(fragX);
            }
            var ex = editor.querySelector('.ppx-exref:last-of-type');
            if (ex) addBlockTools(ex);
          } catch (e) { console.error(e); }
        });
        e.preventDefault();
        return;
      }if (t.classList.contains('ppx-bold'))   { cmd('bold'); updateActiveStates(); e.preventDefault(); return; }
      if (t.classList.contains('ppx-italic')) { cmd('italic'); updateActiveStates(); e.preventDefault(); return; }
      if (t.classList.contains('ppx-underline')) { cmd('underline'); updateActiveStates(); e.preventDefault(); return; }
      if (t.classList.contains('ppx-strike')) { cmd('strikeThrough'); updateActiveStates(); e.preventDefault(); return; }

      if (t.classList.contains('ppx-left'))   { cmd('justifyLeft'); e.preventDefault(); return; }
      if (t.classList.contains('ppx-center')) { cmd('justifyCenter'); e.preventDefault(); return; }
      if (t.classList.contains('ppx-right'))  { cmd('justifyRight'); e.preventDefault(); return; }

      if (t.classList.contains('ppx-ul'))     { cmd('insertUnorderedList'); e.preventDefault(); return; }
      if (t.classList.contains('ppx-ol'))     { cmd('insertOrderedList'); e.preventDefault(); return; }

      if (t.classList.contains('ppx-link')) {
        var url = prompt('URL:');
        if (url) cmd('createLink', url);
        e.preventDefault(); return;
      }
      if (t.classList.contains('ppx-unlink')) { cmd('unlink'); e.preventDefault(); return; }

      if (t.classList.contains('ppx-quote')) { cmd('formatBlock', '<BLOCKQUOTE>'); e.preventDefault(); return; }

      // EMBED
      if (t.classList.contains('ppx-embed')) {
        var input = prompt('Pegá un URL o código <iframe> (YouTube / Canva / H5P):');
        if (input) {
          var html = normalizeEmbed(input);
          if (html) {
            restoreSelection();
            var tmp2 = document.createElement('div');
            tmp2.innerHTML = html + '<p><br></p>';
            var frag2 = document.createDocumentFragment();
            while (tmp2.firstChild) frag2.appendChild(tmp2.firstChild);
            var sel2 = window.getSelection();
            if (sel2 && sel2.rangeCount) {
              var r2 = sel2.getRangeAt(0);
              r2.deleteContents();
              r2.insertNode(frag2);
            } else {
              editor.appendChild(frag2);
            }
          } else {
            alert('No se reconoció el embed. Pegá un URL válido o un <iframe>.');
          }
        }
        e.preventDefault(); return;
      }

      if (t.classList.contains('ppx-clean')) { cmd('removeFormat'); updateActiveStates(); e.preventDefault(); return; }
      if (t.classList.contains('ppx-undo'))  { document.execCommand('undo'); updateActiveStates(); e.preventDefault(); return; }
      if (t.classList.contains('ppx-redo'))  { document.execCommand('redo'); updateActiveStates(); e.preventDefault(); return; }
    });

    // Keyboard navigation for Heading dropdown
    (function wireHeadDropdownKeys(){
      function getOpts(){ return $all('.ppx-head-pop .ppx-head-opt', toolbar); }
      function getOpenPop(){ return toolbar.querySelector('.ppx-head-pop[aria-hidden="false"]'); }
      function clearFocus(){ getOpts().forEach(function(o){ o.classList.remove('is-focus'); o.removeAttribute('aria-selected'); }); }
      function focusIndex(i){
        var opts = getOpts();
        if (!opts.length) return;
        var idx = (i < 0) ? 0 : (i >= opts.length ? opts.length - 1 : i);
        clearFocus();
        var el = opts[idx];
        el.classList.add('is-focus');
        el.setAttribute('aria-selected','true');
        // ensure visible
        try { el.scrollIntoView({block:'nearest'}); } catch(_){ }
        toolbar._ppxHeadFocus = idx;
      }
      toolbar.addEventListener('keydown', function(e){
        var open = getOpenPop();
        if (!open) return;
        var opts = getOpts(); if (!opts.length) return;
        var idx = (typeof toolbar._ppxHeadFocus === 'number') ? toolbar._ppxHeadFocus : -1;
        if (e.key === 'ArrowDown') { e.preventDefault(); focusIndex(idx + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); focusIndex(idx - 1); }
        else if (e.key === 'Home') { e.preventDefault(); focusIndex(0); }
        else if (e.key === 'End') { e.preventDefault(); focusIndex(opts.length - 1); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          if (idx < 0) idx = 0; if (idx >= opts.length) idx = opts.length - 1;
          opts[idx].click();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          var btn = toolbar.querySelector('.ppx-head-dd');
          if (btn) btn.click();
        }
      });
      // Initialize focus when opening
      toolbar.addEventListener('click', function(e){
        var t = e.target;
        if (t.classList.contains('ppx-head-dd')) {
          setTimeout(function(){
            if (getOpenPop()) {
              // Focus current tag option if possible
              var label = toolbar.querySelector('.ppx-head-label');
              var want = 'P';
              if (label) {
                var txt = label.textContent || '';
                if (/Heading 2/i.test(txt)) want = 'H2';
                else if (/Heading 3/i.test(txt)) want = 'H3';
              }
              var opts = getOpts();
              var i = Math.max(0, opts.findIndex(function(o){ return (o.getAttribute('data-level')||'') === want; }));
              focusIndex(i);
            }
          }, 0);
        }
      });
    })();

    // HEX apply
    toolbar.addEventListener('click', function (e) {
      if (e.target.classList.contains('ppx-apply-hex')) {
        var wrap = e.target.closest('.ppx-color-wrap');
        var pop = e.target.closest('.ppx-color-pop');
        var input = pop && pop.querySelector('.ppx-hex');
        if (!wrap || !input) return;
        var val = (input.value || '').trim();
        if (!val) return;
        if (!/^#?[0-9a-fA-F]{6}$/.test(val)) return;
        var hex = val[0] === '#' ? val : ('#' + val);
        restoreSelection();
        if (wrap.getAttribute('data-kind') === 'ppx-fore') {
          document.execCommand('foreColor', false, hex);
          var iconF = wrap.querySelector('.ppx-icon-fore'); if (iconF) iconF.style.color = hex;
        } else {
          if (document.queryCommandSupported('hiliteColor')) document.execCommand('hiliteColor', false, hex);
          else document.execCommand('backColor', false, hex);
          var iconB = wrap.querySelector('.ppx-icon-back'); if (iconB) iconB.style.background = hex;
        }
        input.value = '';
        pop.setAttribute('aria-hidden','true');
        var btn = wrap.querySelector('.ppx-color-btn');
        if (btn) btn.setAttribute('aria-expanded','false');
        e.preventDefault();
      }
    });

    // Apply HEX on Enter
    toolbar.addEventListener('keydown', function (e) {
      if (e.target.classList.contains('ppx-hex') && e.key === 'Enter') {
        var btn = e.target.closest('.ppx-color-wrap')?.querySelector('.ppx-apply-hex');
        if (btn) btn.click();
        e.preventDefault();
      }
    });

    // Close popovers on outside click
    document.addEventListener('click', function (e) {
      if (!toolbar.contains(e.target)) {
        closeAllPops();
      }
    });

    // Dropdown changes (block formats)
    toolbar.addEventListener('change', function (e) {
      if (e.target.classList.contains('ppx-block')) {
        // restore selection before applying heading so caret doesn't jump
        try { restoreSelection(); } catch(_) {}
        if (editor && editor.focus) editor.focus();
        var tag = e.target.value || 'P';
        if (tag === 'P') document.execCommand('formatBlock', false, '<P>');
        else document.execCommand('formatBlock', false, '<' + tag + '>');
        updateActiveStates();
        try { syncBlockDropdown(); } catch(_) {}
        e.preventDefault();
      }
    });

    // General paste sanitization in editor body/content
    editor.addEventListener('paste', function(e){
      try {
        var inHead = e.target.closest && e.target.closest('.ppx-acc-head');
        if (inHead) return; // handled above
        var dt = e.clipboardData || window.clipboardData; if (!dt) return;
        var html = dt.getData('text/html');
        if (!html) return; // allow plain text paste
        e.preventDefault();
        // Minimal sanitizer: drop style attributes and normalize <b>/<i>
        var tmp = document.createElement('div'); tmp.innerHTML = html;
        tmp.querySelectorAll('[style]').forEach(function(n){ n.removeAttribute('style'); });
        tmp.querySelectorAll('b').forEach(function(n){ var s=document.createElement('strong'); s.innerHTML=n.innerHTML; n.parentNode.replaceChild(s,n); });
        tmp.querySelectorAll('i').forEach(function(n){ var em=document.createElement('em'); em.innerHTML=n.innerHTML; n.parentNode.replaceChild(em,n); });
        var clean = tmp.innerHTML;
        if (document.queryCommandSupported && document.queryCommandSupported('insertHTML')) {
          document.execCommand('insertHTML', false, clean);
        } else {
          editor.insertAdjacentHTML('beforeend', clean);
        }
      } catch(_){}
    });

    // Keep the "Heading" dropdown in sync
    var blockSelect = toolbar.querySelector('select.ppx-block');
    if (blockSelect) {
      // preserve selection when opening the dropdown so format applies to intended range
      blockSelect.addEventListener('mousedown', function(){ try { saveSelection(); } catch(_) {} });
    }
    function currentBlockTag() {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return 'P';
      var node = sel.getRangeAt(0).startContainer;
      if (node && node.nodeType === 3) node = node.parentNode;
      while (node && node !== editor) {
        if (node.nodeType === 1) {
          var tag = node.tagName;
          if (tag === 'H1' || tag === 'H2' || tag === 'H3') return tag;
          if (tag === 'P' || tag === 'DIV' || tag === 'BLOCKQUOTE') return (tag === 'DIV' ? 'P' : (tag === 'BLOCKQUOTE' ? 'P' : tag));
        }
        node = node.parentNode;
      }
      return 'P';
    }
    function syncBlockDropdown() {
      if (!blockSelect) return;
      var tag = currentBlockTag();
      if (blockSelect.value !== tag) blockSelect.value = tag;
    }
    document.addEventListener('selectionchange', syncBlockDropdown);
    editor.addEventListener('keyup', syncBlockDropdown);
    editor.addEventListener('mouseup', syncBlockDropdown);
    editor.addEventListener('input', syncBlockDropdown);

    // Audio button behavior (upload or play/pause)
    editor.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.ppx-ex-audio');
      if (!btn) return;
      e.preventDefault();

      var url = btn.getAttribute('data-url') || '';
      var player = btn._ppxPlayer;
      if (url && player) {
        if (player.paused) {
          player.play().catch(function(){});
          var _i1 = btn.querySelector('img.ppx-ex-icon'); if (_i1) _i1.src = ICON_PAUSE; btn.classList.add('is-playing'); player.onended = function(){ btn.classList.remove('is-playing'); var _i2 = btn.querySelector('img.ppx-ex-icon'); if (_i2) _i2.src = ICON_PLAY; };
        } else {
          player.pause();
          var _i3 = btn.querySelector('img.ppx-ex-icon'); if (_i3) _i3.src = ICON_PLAY; btn.classList.remove('is-playing');
        }
        return;
      }

      var slug = getSlugFromPath();
      if (!slug) {
        alert('No se pudo determinar el artículo para subir audio.');
        return;
      }
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        document.body.removeChild(input);
        if (!f) return;

        btn.disabled = true;
        var originalHTML = btn.innerHTML;
        btn.innerHTML = '…';

        uploadAudioForArticle(slug, f, 'ejemplo').then(function(res){
          var ok = (res.status >= 200 && res.status < 300) && res.json && res.json.ok;
          if (!ok) {
            alert('Error subiendo audio: ' + (res.json && res.json.error));
            if (iconEl) { iconEl.src = originalSrc; iconEl.style.opacity = ''; }
            btn.disabled = false;
            return;
          }
          var audioURL = res.json.url;
          btn.setAttribute('data-url', audioURL);

          var a = new Audio(audioURL);
          a.preload = 'none';
          btn._ppxPlayer = a;

          a.play().then(function(){
            if (iconEl) { iconEl.src = ICON_PAUSE; iconEl.style.opacity = ''; }
            btn.classList.add('is-playing');
            a.onended = function(){ btn.classList.remove('is-playing'); if (iconEl) iconEl.src = ICON_PLAY; };
          }).catch(function(){
            if (iconEl) { iconEl.src = ICON_PLAY; iconEl.style.opacity = ''; }
          }).finally(function(){
            btn.disabled = false;
          });
        }).catch(function(){
          alert('No se pudo subir el audio.');
          if (iconEl) { iconEl.src = originalSrc; iconEl.style.opacity = ''; }
          btn.disabled = false;
        });
      });
      input.click();
    });

    // Keep button highlights in sync with caret moves/typing
    document.addEventListener('selectionchange', updateActiveStates);
    editor.addEventListener('keyup', updateActiveStates);
    editor.addEventListener('mouseup', updateActiveStates);

    // On form submit, dump sanitized HTML back into textarea
    var form = textarea.closest('form');
    if (form) {
      form.addEventListener('submit', function () {
        var clone = document.createElement('div');
        clone.innerHTML = editor.innerHTML;

        // Legacy: remove checked on any old toggles (if present)
        $all('.ppx-acc-toggle', clone).forEach(function (inp){ inp.removeAttribute('checked'); });

        // Strip editor-only controls
        $all('.ppx-block-tools', clone).forEach(function (n){ n.parentNode && n.parentNode.removeChild(n); });

        // Remove contenteditable from public-facing bits
        $all('[contenteditable]', clone).forEach(function (n){ n.removeAttribute('contenteditable'); });

        // Remove editor-only flags
        $all('[data-acc="editor"], [data-ex="example"], [data-exref="editor"]', clone).forEach(function (n){ n.removeAttribute('data-acc'); n.removeAttribute('data-ex'); n.removeAttribute('data-exref'); });

        textarea.value = clone.innerHTML;
      });
    }
  }

  // Optional Quill path (off by default)
  function initWithQuill(textarea) {
    var wrapper = document.createElement('div');
    wrapper.className = 'ppx-editor-wrap';
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = 'none';
    wrapper.style.margin = '0';
    wrapper.style.boxSizing = 'border-box';
    var toolbar = buildToolbar();
    var editor = document.createElement('div');
    editor.id = 'ppx-quill-editor';
    editor.style.border = '1px solid #e5e7eb';
    editor.style.borderRadius = '10px';
    editor.style.minHeight = '560px';
    editor.style.width = '100%';
    editor.style.resize = 'vertical';
    editor.style.overflow = 'auto';
    editor.style.background = '#fff';

    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(editor);
    textarea.style.display = 'none';
    // Outline (H2/H3) — build and update on demand
    (function initOutline(){
      function slugify(txt){ try { return String(txt||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''); } catch(_) { return 'sec-'+uid(); } }
      function ensureId(h){ if (!h.id) { h.id = slugify(h.textContent||'') || ('sec-'+uid()); } return h.id; }
      function build(){
        var panel = document.getElementById('ppx-outline'); if (!panel) return;
        var hs = editor.querySelectorAll('h2, h3');
        var html = ['<div class="ppx-muted" style="font-weight:600;margin:.25rem .25rem .5rem;">Outline</div>'];
        hs.forEach(function(h){ var id=ensureId(h); var lvl=h.tagName==='H3'?3:2; html.push('<div style="padding:.15rem .35rem;margin:.1rem 0;">'+ (lvl===3?'&nbsp;&nbsp;':'') +'<a href="#'+id+'" data-goto="'+id+'" style="text-decoration:none;color:#111827;">'+ (h.textContent||'') +'</a></div>'); });
        panel.innerHTML = html.join('');
      }
      var tgl = document.getElementById('ppx-outline-toggle');
      if (tgl) tgl.addEventListener('click', function(){ var p=document.getElementById('ppx-outline'); if (!p) return; build(); p.style.display = (p.style.display==='none'||!p.style.display)?'block':'none'; });
      editor.addEventListener('input', function(){ var p=document.getElementById('ppx-outline'); if (p && p.style.display!=='none') build(); });
      document.addEventListener('click', function(e){ var a=e.target && e.target.closest && e.target.closest('#ppx-outline a[data-goto]'); if (!a) return; e.preventDefault(); var id=a.getAttribute('data-goto');
        try { var el=id && editor.querySelector('#'+CSS.escape(id)); if (el) { el.scrollIntoView({behavior:'smooth',block:'center'}); el.focus && el.focus(); } } catch(_){}
      });
    })();

    // Keyboard shortcut: Cmd/Ctrl+S submits the form
    (function addSaveShortcut(){
      var form = textarea.closest('form');
      if (!form) return;
      wrapper.addEventListener('keydown', function(e){
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); form.requestSubmit(); }
      });
    })();

    // Dirty guard: prompt on unload if there are unsaved changes
    (function dirtyGuard(){
      var form = textarea.closest('form');
      if (!form) return;
      var DIRTY = false;
      function mark(){ DIRTY = true; }
      editor.addEventListener('input', mark);
      form.querySelectorAll('input,textarea,select').forEach(function(n){ n.addEventListener('input', mark); });
      window.addEventListener('beforeunload', function(e){ if (DIRTY) { e.preventDefault(); e.returnValue=''; }});
      form.addEventListener('submit', function(){ DIRTY = false; });
    })();

    var quill = new Quill(editor, { theme: 'snow', modules: { toolbar: { container: toolbar } } });
    if (textarea.value && textarea.value.trim()) {
      quill.clipboard.dangerouslyPasteHTML(0, textarea.value);
    }
    toolbar.querySelector('.ppx-insert-acc').addEventListener('click', function () {
      var sel = quill.getSelection(true);
      var html = accordionHTML('Sección', true);
      quill.clipboard.dangerouslyPasteHTML(sel ? sel.index : quill.getLength(), html);
    });
    toolbar.querySelector('.ppx-insert-example').addEventListener('click', function () {
      var sel = quill.getSelection(true);
      var html = exampleHTML();
      quill.clipboard.dangerouslyPasteHTML(sel ? sel.index : quill.getLength(), html);
    });

    var form = textarea.closest('form');
    if (form) {
      form.addEventListener('submit', function () {
        var html = editor.querySelector('.ql-editor').innerHTML;
        var tmp = document.createElement('div'); tmp.innerHTML = html;
        $all('.ppx-acc-toggle', tmp).forEach(function (inp){ inp.removeAttribute('checked'); });
        $all('[contenteditable]', tmp).forEach(function (n){ n.removeAttribute('contenteditable'); });
        $all('.ppx-block-tools', tmp).forEach(function (n){ n.parentNode && n.parentNode.removeChild(n); });
        $all('[data-acc="editor"], [data-ex="example"], [data-exref="editor"]', tmp).forEach(function (n){ n.removeAttribute('data-acc'); n.removeAttribute('data-ex'); n.removeAttribute('data-exref'); });
        textarea.value = tmp.innerHTML;
      });
    }
  }

  // Public hooks for dynamic forms (e.g., module editors)
  window.PPX_INIT_EDITOR = function(ta){
    try {
      if (!ta || ta.__ppxEditorReady) return;
      ta.__ppxEditorReady = true;
      if (window.Quill && window.__PPX_ALLOW_QUILL === true) {
        initWithQuill(ta);
      } else {
        initFallback(ta);
      }
    } catch (e) {
      console.error('[admin_quill] PPX_INIT_EDITOR failed:', e);
    }
  };
  window.PPX_INIT_EDITORS = function(root){
    var nodes = Array.prototype.slice.call((root||document).querySelectorAll('textarea.ppx-rich'));
    nodes.forEach(function(n){ window.PPX_INIT_EDITOR(n); });
  };

  ready(function () {
    try {
      var targets = Array.prototype.slice.call(document.querySelectorAll('textarea.ppx-rich'));
      if (!targets.length) {
        // Back-compat: fall back to legacy single-target detection
        var ta =
          document.getElementById('html') ||
          document.querySelector('textarea[name="html"]') ||
          document.querySelector('textarea[data-editor="html"]') ||
          document.querySelector('textarea#body_html') ||
          document.querySelector('form textarea');
        if (ta) targets = [ta];
      }

      if (!targets.length) {
        console.error('[admin_quill] No editable <textarea> found (looked for .ppx-rich or legacy selectors).');
        return;
      }

      

      targets.forEach(function(ta){ window.PPX_INIT_EDITOR(ta); });
    } catch (err) {
      console.error('[admin_quill] Initialization failed:', err);
    }
  });
})();









