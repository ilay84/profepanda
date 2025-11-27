// static/js/i18n_inline.js
(function () {
  function ready(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);} else {fn();} }

  function cfg() {
    var c = (window.PPX_I18N || {});
    return {
      canEdit: !!c.canEdit,
      getURL: c.getURL || '/admin/i18n/key',           // supports /key/<k> or ?key=<k>
      updateURL: c.updateURL || '/admin/i18n/update',
      csrfToken: c.csrfToken || '',
      currentLang: c.currentLang || 'es'
    };
  }

  function injectCSS(){
    if (document.getElementById('ppx-i18n-inline-css')) return;
    var css = document.createElement('style');
    css.id = 'ppx-i18n-inline-css';
    css.textContent =
      '.ppx-i18n-target{position:relative;outline:0}' +
      '.ppx-i18n-imgwrap{display:inline-block;position:relative}' +  // wrapper host for <img>
      '.ppx-i18n-btn{position:absolute;top:-8px;right:-8px;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:1px solid #e5e7eb;border-radius:999px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);cursor:pointer;opacity:0;transition:opacity .15s ease;z-index:20}' +
      '.ppx-i18n-target:hover .ppx-i18n-btn{opacity:1}' +
      '.ppx-i18n-btn svg{width:14px;height:14px;pointer-events:none}' +
      '.ppx-i18n-imgbtn{position:absolute;top:-8px;left:-8px;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:1px solid #e5e7eb;border-radius:999px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);cursor:pointer;opacity:0;transition:opacity .15s ease;z-index:20}' +
      '.ppx-i18n-target:hover .ppx-i18n-imgbtn{opacity:1}' +
      '.ppx-i18n-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.35);display:none;z-index:1000}' +
      '.ppx-i18n-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:1001}' +
      '.ppx-i18n-card{width:min(640px,94vw);background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 12px 36px rgba(0,0,0,.18);padding:16px}' +
      '.ppx-i18n-row{display:flex;gap:12px;margin-top:8px}' +
      '.ppx-i18n-col{flex:1;display:flex;flex-direction:column;gap:8px}' +
      '.ppx-i18n-col label{font:600 12px/1.2 Montserrat,system-ui}' +
      '.ppx-i18n-input{font:500 14px/1.35 Montserrat,system-ui;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px}' +
      '.ppx-i18n-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}' +
      '.ppx-i18n-btn2{font:600 13px/1 Montserrat,system-ui;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer}' +
      '.ppx-i18n-btn2--primary{background:#111827;color:#fff;border-color:#111827}' +
      '.ppx-i18n-key{font:600 11px/1.2 Montserrat,system-ui;color:#64748b;word-break:break-all}';
    document.head.appendChild(css);
  }

  function ensureModal(){
    var backdrop = document.getElementById('ppx-i18n-modal-backdrop');
    var shell = document.getElementById('ppx-i18n-modal');

    // If already present, make sure buttons are bound (idempotent) and return.
    if (backdrop && shell) {
      var saveBtn0 = document.getElementById('ppx-i18n-save');
      if (saveBtn0 && !saveBtn0.__ppxBound) {
        saveBtn0.addEventListener('click', savePair);
        saveBtn0.__ppxBound = true;
      }
      var cancelBtn0 = document.getElementById('ppx-i18n-cancel');
      if (cancelBtn0 && !cancelBtn0.__ppxBound) {
        cancelBtn0.addEventListener('click', closeModal);
        cancelBtn0.__ppxBound = true;
      }
      return {backdrop:backdrop, shell:shell};
    }

    backdrop = document.createElement('div');
    backdrop.id = 'ppx-i18n-modal-backdrop';
    backdrop.className = 'ppx-i18n-modal-backdrop';

    shell = document.createElement('div');
    shell.id = 'ppx-i18n-modal';
    shell.className = 'ppx-i18n-modal';
    shell.innerHTML =
      '<div class="ppx-i18n-card" role="dialog" aria-modal="true" aria-labelledby="ppx-i18n-title">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;">' +
          '<div id="ppx-i18n-title" style="font:700 16px/1.2 Montserrat,system-ui">Editar texto</div>' +
          '<div class="ppx-i18n-key" id="ppx-i18n-key"></div>' +
        '</div>' +
        '<div class="ppx-i18n-row">' +
          '<div class="ppx-i18n-col">' +
            '<label for="ppx-i18n-es">Español (es)</label>' +
            '<textarea id="ppx-i18n-es" class="ppx-i18n-input" rows="4"></textarea>' +
          '</div>' +
          '<div class="ppx-i18n-col">' +
            '<label for="ppx-i18n-en">English (en)</label>' +
            '<textarea id="ppx-i18n-en" class="ppx-i18n-input" rows="4"></textarea>' +
          '</div>' +
        '</div>' +
        '<div class="ppx-i18n-actions">' +
          '<button type="button" class="ppx-i18n-btn2" id="ppx-i18n-cancel">Cancel</button>' +
          '<button type="button" class="ppx-i18n-btn2 ppx-i18n-btn2--primary" id="ppx-i18n-save">Save</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(shell);

    // Bind once
    backdrop.addEventListener('click', closeModal);
    var cancelBtn = document.getElementById('ppx-i18n-cancel');
    var saveBtn = document.getElementById('ppx-i18n-save');
    if (cancelBtn && !cancelBtn.__ppxBound) { cancelBtn.addEventListener('click', closeModal); cancelBtn.__ppxBound = true; }
    if (saveBtn && !saveBtn.__ppxBound) { saveBtn.addEventListener('click', savePair); saveBtn.__ppxBound = true; }

    return {backdrop:backdrop, shell:shell};
  }

  var _state = { currentKey:null, targets:[], seed:{es:'',en:''}, pageLang: (window.PPX_I18N && window.PPX_I18N.currentLang) ? String(window.PPX_I18N.currentLang).toLowerCase() : 'es' };

  function openModal(key){
    var m = ensureModal();
    document.getElementById('ppx-i18n-key').textContent = key;
    _state.currentKey = key;
    fetchPair(key).then(function(pair){
      var hasES = pair && typeof pair.es === 'string' && pair.es.length;
      var hasEN = pair && typeof pair.en === 'string' && pair.en.length;
      var es = hasES ? pair.es : (_state.seed.es || '');
      var en = hasEN ? pair.en : (_state.seed.en || '');
      document.getElementById('ppx-i18n-es').value = es;
      document.getElementById('ppx-i18n-en').value = en;
      m.backdrop.style.display = 'block';
      m.shell.style.display = 'flex';
      document.getElementById('ppx-i18n-es').focus();
    }).catch(function(){
      document.getElementById('ppx-i18n-es').value = _state.seed.es || '';
      document.getElementById('ppx-i18n-en').value = _state.seed.en || '';
      m.backdrop.style.display = 'block';
      m.shell.style.display = 'flex';
    });
  }

  function closeModal(){
    var b = document.getElementById('ppx-i18n-modal-backdrop');
    var m = document.getElementById('ppx-i18n-modal');
    if (b) b.style.display = 'none';
    if (m) m.style.display = 'none';
    _state.currentKey = null;
  }

  function fetchPair(key){
    var c = cfg();
    var url = c.getURL;
    if (url.includes('<key>')) {
      url = url.replace('<key>', encodeURIComponent(key));
    } else if (url.endsWith('/key')) {
      url = url + '/' + encodeURIComponent(key);
    } else {
      var sep = url.includes('?') ? '&' : '?';
      url = url + sep + 'key=' + encodeURIComponent(key);
    }
    return fetch(url, {credentials:'same-origin'}).then(function(r){
      return r.text().then(function(t){
        try { return JSON.parse(t || '{}'); } catch(e){ return {}; }
      });
    });
  }

  function savePair(){
    var c = cfg();
    var key = _state.currentKey;
    if (!key) return;
    var es = document.getElementById('ppx-i18n-es').value || '';
    var en = document.getElementById('ppx-i18n-en').value || '';
    fetch(c.updateURL, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ key: key, es: es, en: en, csrf_token: c.csrfToken })
    })
    .then(function(r){
      return r.text().then(function(t){
        var json = {};
        try { json = JSON.parse(t || '{}'); } catch(e) { json = {}; }
        return { httpOk: r.ok, json: json };
      });
    })
    .then(function(res){
      var j = res.json || {};
      var logicalOk = (j.ok === true) || (j.status === 'ok') || (j.saved === true);
      if (res.httpOk && (Object.keys(j).length === 0 || logicalOk)) {
        applyToDOM(key, {es:es, en:en}, c.currentLang);
        closeModal();
      } else {
        var msg = (j && (j.error || j.message)) ? String(j.error || j.message) : ('HTTP ' + (res.httpOk === false ? 'error' : 'unknown failure'));
        alert('Save failed: ' + msg);
      }
    })
    .catch(function(err){ alert('Save failed: ' + (err && err.message ? err.message : 'network error')); });
  }

  function saveImage(key, file){
    var c = cfg();
    if (!file || !key) return Promise.reject(new Error('No file or key'));
    if (file.size > 8 * 1024 * 1024) { // 8MB soft limit
      alert('Image too large (max 8MB).'); return Promise.reject(new Error('too large'));
    }
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(ev){
        var dataUrl = ev.target && ev.target.result ? String(ev.target.result) : '';
        fetch(c.updateURL, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            key: key,
            type: 'image',
            filename: file.name || 'upload',
            image_data_url: dataUrl,
            csrf_token: c.csrfToken
          })
        })
        .then(function(r){
          return r.text().then(function(t){
            var json = {};
            try { json = JSON.parse(t || '{}'); } catch(e) { json = {}; }
            return { httpOk: r.ok, json: json };
          });
        })
        .then(function(res){
          var j = res.json || {};
          var logicalOk = (j.ok === true) || (j.status === 'ok') || (j.saved === true);
          // Prefer server-returned URL, otherwise keep the dataUrl as a preview
          var newURL = (j.image_url || j.url || j.value || j.es || j.en || dataUrl);
          if (res.httpOk && (Object.keys(j).length === 0 || logicalOk)) {
            applyImageToDOM(key, newURL);
            resolve(newURL);
          } else {
            var msg = (j && (j.error || j.message)) ? String(j.error || j.message) : ('HTTP ' + (res.httpOk === false ? 'error' : 'unknown failure'));
            alert('Save failed: ' + msg);
            reject(new Error(msg));
          }
        })
        .catch(function(err){ alert('Save failed: ' + (err && err.message ? err.message : 'network error')); reject(err); });
      };
      reader.onerror = function(){ reject(new Error('read error')); };
      reader.readAsDataURL(file);
    });
  }

  function applyToDOM(key, pair, currentLang){
    var nodes = document.querySelectorAll('[data-i18n-key="'+CSS.escape(key)+'"]');
    nodes.forEach(function(n){
      // Image nodes are handled by applyImageToDOM
      if (n.classList && n.classList.contains('ppx-i18n-img')) return;
      var lang = (n.getAttribute('data-i18n-lang') || currentLang || 'es').toLowerCase();
      var val = (lang === 'en') ? pair.en : pair.es;
      if (!val) val = (lang === 'en') ? pair.es : pair.en; // light fallback for live patch only
      if ('value' in n) n.value = val; else n.textContent = val;
    });
  }

  function applyImageToDOM(key, url){
    var nodes = document.querySelectorAll('.ppx-i18n-img[data-i18n-key="'+CSS.escape(key)+'"]');
    nodes.forEach(function(n){
      if (n.tagName === 'IMG') {
        n.setAttribute('src', url);
      } else {
        // fallback DIV thumb
        n.style.backgroundImage = 'url("'+url.replace(/"/g,'\\"')+'")';
        n.style.backgroundSize = 'cover';
        n.style.backgroundPosition = 'center';
        n.textContent = '';
      }
    });
  }

  function addPencil(target){
    if (target.classList.contains('ppx-i18n-target')) return;
    target.classList.add('ppx-i18n-target');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ppx-i18n-btn';
    btn.title = 'Editar texto';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    btn.addEventListener('click', function(e){
      e.stopPropagation(); e.preventDefault();
      var k = target.getAttribute('data-i18n-key');
      if (!k) return;
      var cur = (target.textContent || '').trim();
      if (_state.pageLang === 'en') {
        _state.seed = { es: '', en: cur };
      } else {
        _state.seed = { es: cur, en: '' };
      }
      openModal(k);
    });
    // ensure target is positioned
    var oldPos = getComputedStyle(target).position;
    if (!oldPos || oldPos === 'static') target.style.position = 'relative';
    target.appendChild(btn);
  }

  function addImagePencil(target) {
    // Host element that will hold the controls
    var host = target;
    var imgEl = null;

    // If target is an <img>, wrap it so we can attach buttons (img can't have children)
    if (target.tagName === 'IMG') {
      imgEl = target;
      var parent = imgEl.parentElement;
      if (!parent || !parent.classList.contains('ppx-i18n-imgwrap')) {
        var wrap = document.createElement('span');
        wrap.className = 'ppx-i18n-imgwrap ppx-i18n-target';
        // carry data attributes to wrapper so our key lookup keeps working
        if (imgEl.hasAttribute('data-i18n-key')) wrap.setAttribute('data-i18n-key', imgEl.getAttribute('data-i18n-key'));
        if (imgEl.hasAttribute('data-i18n-lang')) wrap.setAttribute('data-i18n-lang', imgEl.getAttribute('data-i18n-lang'));
        // insert wrapper and move image inside
        imgEl.parentNode.insertBefore(wrap, imgEl);
        wrap.appendChild(imgEl);
        host = wrap;
      } else {
        host = parent;
        host.classList.add('ppx-i18n-target');
      }
    } else {
      // Non-img targets (e.g., fallback DIV thumb) can host children directly
      if (!target.classList.contains('ppx-i18n-target')) target.classList.add('ppx-i18n-target');
      // ensure positioned
      var oldPos = getComputedStyle(target).position;
      if (!oldPos || oldPos === 'static') target.style.position = 'relative';
    }

    // Avoid duplicate buttons
    if (host.querySelector('.ppx-i18n-imgbtn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ppx-i18n-imgbtn';
    btn.title = 'Cambiar imagen';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.5"/><path d="M21 15l-5-5-4 4-2-2-4 4"/></svg>';

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      var f = (fileInput.files && fileInput.files[0]) ? fileInput.files[0] : null;
      var key = (host.getAttribute('data-i18n-key') || (imgEl && imgEl.getAttribute('data-i18n-key')) || '').trim();
      if (!f || !key) return;

      // instant local preview
      if (imgEl) {
        var url = URL.createObjectURL(f);
        imgEl.src = url;
      } else {
        var url2 = URL.createObjectURL(f);
        host.style.backgroundImage = 'url("' + url2.replace(/"/g, '\\"') + '")';
        host.style.backgroundSize = 'cover';
        host.style.backgroundPosition = 'center';
        host.textContent = '';
      }

      // persist to server
      saveImage(key, f).catch(function () {
        /* preview remains; user can retry */
      });

      // reset input so selecting same file again re-triggers change
      fileInput.value = '';
    });

    host.appendChild(btn);
    host.appendChild(fileInput);
  }

  function scan(){
    // Text edit targets (any element with data-i18n-key but not explicitly image)
    document.querySelectorAll('[data-i18n-key]').forEach(function(node){
      if (!(node instanceof Element)) return;
      if (node.classList && node.classList.contains('ppx-i18n-img')) {
        addImagePencil(node);
      } else {
        addPencil(node);
      }
    });
  }

  ready(function(){
    var c = cfg();
    if (!c.canEdit) return;
    injectCSS();
    scan();
    // Observe mutations for dynamically added content
    var mo = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        var m = muts[i];
        if (m.type === 'childList') {
          m.addedNodes && m.addedNodes.forEach(function(n){
            if (!(n instanceof Element)) return;
            if (n.hasAttribute && n.hasAttribute('data-i18n-key')) {
              if (n.classList && n.classList.contains('ppx-i18n-img')) addImagePencil(n);
              else addPencil(n);
            }
            n.querySelectorAll && n.querySelectorAll('[data-i18n-key]').forEach(function(x){
              if (x.classList && x.classList.contains('ppx-i18n-img')) addImagePencil(x);
              else addPencil(x);
            });
          });
        }
      }
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
    // Escape to close modal
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') closeModal();
    });
  });
})();
