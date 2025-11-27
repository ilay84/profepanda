/* static/js/admin_builder_tf.js */
(function () {
  const D = document;

  function ready(fn){ if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(() => {
    const form = D.getElementById('ppx-tf-form');
    if (!form) return;

    const itemsWrap = D.getElementById('ppx-items');
    const tpl = D.getElementById('ppx-item-template');

    const btnAdd = D.getElementById('ppx-add-item');
    const btnSave = D.getElementById('ppx-save-draft');
    const btnPreview = D.getElementById('ppx-preview');
    const btnExport = D.getElementById('ppx-export-json');
    const btnPublish = D.getElementById('ppx-publish');
    const selStatus = D.getElementById('ex-status');

    // Create a bottom bar and (safely) move the existing "Agregar ítem" button into it
    const addBar = D.createElement('div');
    addBar.style.display = 'flex';
    addBar.style.justifyContent = 'flex-end';
    addBar.style.marginTop = '8px';
    if (btnAdd) addBar.appendChild(btnAdd);
    itemsWrap.appendChild(addBar);

    const inputSlug = D.getElementById('ex-slug');
    const inputTitleEs = D.getElementById('ex-title-es');
    const inputTitleEn = D.getElementById('ex-title-en');
    const taInstEs = D.getElementById('ex-inst-es');
    const taInstEn = D.getElementById('ex-inst-en');
    const selLevel = D.getElementById('ex-level');
    const inputTx = D.querySelector('.ppx-taxonomy input[type=hidden]');

    const appLang = (window.PPX_I18N && window.PPX_I18N.currentLang) || (D.documentElement.getAttribute('lang') || 'es');
    const t = (es, en) => (appLang.startsWith('en') ? (en ?? es) : (es ?? en));

    // Prefill slug from URL for edit routes
    (function prefillSlugFromURL(){
      if (inputSlug && !inputSlug.value) {
        const m = location.pathname.match(/\/admin\/exercises\/tf\/([^\/]+)\/edit/);
        if (m && m[1]) inputSlug.value = decodeURIComponent(m[1]);
      }
    })();

    // ─────────────────────────────────────────────────────────────
    // Lightbox (for image/audio/video preview)
    // ─────────────────────────────────────────────────────────────
    function openLightbox(child) {
      const ov = D.createElement('div');
      ov.style.position = 'fixed';
      ov.style.inset = '0';
      ov.style.background = 'rgba(0,0,0,.65)';
      ov.style.zIndex = '2000';
      ov.style.display = 'flex';
      ov.style.alignItems = 'center';
      ov.style.justifyContent = 'center';

      const close = () => ov.remove();
      ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
      D.addEventListener('keydown', function esc(e){ if (e.key === 'Escape'){ close(); D.removeEventListener('keydown', esc); } });

      const box = D.createElement('div');
      box.style.maxWidth = '90vw';
      box.style.maxHeight = '85vh';
      box.style.background = '#fff';
      box.style.borderRadius = '12px';
      box.style.boxShadow = '0 10px 30px rgba(0,0,0,.35)';
      box.style.overflow = 'hidden';
      box.appendChild(child);

      const x = D.createElement('button');
      x.textContent = '✕';
      x.setAttribute('aria-label', 'Close');
      x.style.position = 'fixed';
      x.style.top = '16px';
      x.style.right = '16px';
      x.style.background = '#fff';
      x.style.border = '1px solid #e5e7eb';
      x.style.borderRadius = '999px';
      x.style.padding = '.35rem .5rem';
      x.style.cursor = 'pointer';
      x.addEventListener('click', close);

      ov.appendChild(box);
      ov.appendChild(x);
      D.body.appendChild(ov);
    }

    // ─────────────────────────────────────────────────────────────
    // Markdown mini-toolbar (Bold / Italic) for inputs & textareas
    // ─────────────────────────────────────────────────────────────
    function wrapSelection(el, before, after) {
      el.focus();
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const val = el.value ?? '';
      const selected = val.slice(start, end);
      let rep, newStart, newEnd;

      if (start !== end) {
        rep = before + selected + after;
        newStart = start + before.length;
        newEnd = newStart + selected.length;
      } else {
        // No selection: insert markers and place caret between
        rep = before + after;
        newStart = start + before.length;
        newEnd = newStart;
      }

      el.value = val.slice(0, start) + rep + val.slice(end);
      // restore caret
      try {
        el.setSelectionRange(newStart, newEnd);
      } catch(_) {}
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function makeMkBtn(label, title, onClick) {
      const b = D.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.style.padding = '2px 8px';
      b.style.border = '1px solid var(--ppx-color-line,#e5e7eb)';
      b.style.borderRadius = '8px';
      b.style.background = '#fff';
      b.style.cursor = 'pointer';
      b.style.fontWeight = '600';
      b.addEventListener('click', onClick);
      return b;
    }

    function attachMkToolbar(el) {
      if (!el) return;
      // Avoid duplicates
      if (el.previousElementSibling && el.previousElementSibling.dataset && el.previousElementSibling.dataset.mkbar === '1') {
        return;
      }

      const bar = D.createElement('div');
      bar.dataset.mkbar = '1';
      bar.style.display = 'inline-flex';
      bar.style.gap = '6px';
      bar.style.margin = '0 0 6px 0';
      bar.style.alignItems = 'center';

      const bBold = makeMkBtn('B', t('Negrita', 'Bold'), () => wrapSelection(el, '**', '**'));
      bBold.style.fontWeight = '800';

      const bItalic = makeMkBtn('I', t('Cursiva', 'Italic'), () => wrapSelection(el, '*', '*'));
      bItalic.style.fontStyle = 'italic';

      bar.appendChild(bBold);
      bar.appendChild(bItalic);

      // Insert just before the field element inside its .ppx-field container
      const field = el.closest('.ppx-field') || el.parentElement;
      if (field) field.insertBefore(bar, el);
      else el.parentElement && el.parentElement.insertBefore(bar, el);
    }

    function attachMkToolbarTopLevel() {
      // titles & tags excluded per requirement
      attachMkToolbar(taInstEs);
      attachMkToolbar(taInstEn);
    }

    // ─────────────────────────────────────────────────────────────
    // Item CRUD + Media section
    // ─────────────────────────────────────────────────────────────
    function newItemNode() {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node._media = []; // [{id, kind, src, thumb, alt_es, alt_en, transcript_es, transcript_en}]
      // overflow/width guard
      node.style.maxWidth = '100%';
      node.style.boxSizing = 'border-box';
      node.style.overflow = 'hidden';
      wireItemNode(node);
      return node;
    }

    function makeId(prefix='m') {
      return `${prefix}_${Math.random().toString(36).slice(2,8)}_${Date.now().toString(36)}`;
    }

    function addChevronToItem(node) {
      // No-op: rely on CSS ::before to render chevrons for <details><summary>.
    }

    // Remove any legacy media UI living outside our new accordion
    function removeLegacyMedia(node) {
      const accordion = node.querySelector('.ppx-media-acc');

      // 1) Hide any <details> blocks that look like the old media section
      const legacyDetails = Array.from(node.querySelectorAll('details'))
        .filter(d => !accordion || !accordion.contains(d))
        .filter(d => {
          const sumTxt = (d.querySelector('summary')?.textContent || '').trim().toLowerCase();
          // Match EN/ES headings commonly used before
          return /upload\s*media|media|multimedia|imagen|audio|video/.test(sumTxt);
        });
      legacyDetails.forEach(d => {
        d.style.display = 'none';
        d.setAttribute('data-legacy-media-hidden', '1');
      });

      // 2) Hide any stray file inputs / media grids / headings nearby
      const candidates = Array.from(
        node.querySelectorAll('input[type="file"], .ppx-media, .ppx-media-grid, [data-media], .ppx-media-field, .ppx-media-section, .media-section, label, h3, h4, .ppx-row, .ppx-field')
      ).filter(el => !accordion || !accordion.contains(el));

      candidates.forEach(el => {
        const text = (el.textContent || '').trim().toLowerCase();
        const isHeadingish = /upload\s*media|media|multimedia|imagen|audio|video/.test(text);
        const isControlish = el.matches('input[type="file"], .ppx-media, .ppx-media-grid, [data-media], .ppx-media-field, .ppx-media-section, .media-section');
        // Also catch containers that hold an "Add" button next to a hidden file input
        const looksLikeAddPicker =
          (el.querySelector && el.querySelector('input[type="file"]')) &&
          /add|agregar/i.test(text);

        if (isHeadingish || isControlish || looksLikeAddPicker) {
          const container = el.closest('details, .ppx-field, .ppx-row, section, .ppx-col, div');
          if (container && !container.classList.contains('ppx-media-acc') && !container.matches('details.ppx-card')) {
            container.style.display = 'none';
            container.setAttribute('data-legacy-media-hidden', '1');
          }
        }
      });
    }

    function addMediaSection(node) {
      const hostCol = node.querySelector('.ppx-col') || node;

      const acc = D.createElement('details');
      acc.className = 'ppx-media-acc';
      acc.open = false;
      acc.style.width = '100%';
      acc.style.maxWidth = '100%';
      acc.style.boxSizing = 'border-box';
      acc.style.margin = '8px 0';
      acc.style.border = '1px solid var(--ppx-color-line,#e5e7eb)';
      acc.style.borderRadius = '12px';
      acc.style.background = '#fff';
      acc.style.overflow = 'hidden';

      const sum = D.createElement('summary');
      sum.style.listStyle = 'none';
      sum.style.cursor = 'pointer';
      sum.style.padding = '.6rem .8rem';
      sum.style.paddingLeft = '2rem'; // balanced spacing for chevron + title
      sum.style.display = 'flex';
      sum.style.alignItems = 'center';
      sum.style.gap = '.5rem';
      sum.style.userSelect = 'none';
      sum.style.fontWeight = '600';

      const title = D.createElement('span');
      title.textContent = t('Cargar multimedia', 'Upload media');

      sum.appendChild(title);

      const body = D.createElement('div');
      body.style.padding = '.75rem .8rem .9rem';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.gap = '.6rem';
      body.style.maxWidth = '100%';
      body.style.boxSizing = 'border-box';

      // Row 2: Add (file upload) — image / audio / video
      const rowAdd = D.createElement('div');
      rowAdd.style.display = 'flex';
      rowAdd.style.gap = '.5rem';
      const btnAddMedia = D.createElement('button');
      btnAddMedia.type = 'button';
      btnAddMedia.className = 'ppx-btn';
      btnAddMedia.textContent = t('Agregar', 'Add');
      const picker = D.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*,audio/*,video/*';
      picker.multiple = true;
      picker.style.display = 'none';
      rowAdd.appendChild(btnAddMedia);
      rowAdd.appendChild(picker);
      btnAddMedia.addEventListener('click', () => picker.click());

      // Row 3: media list (vertical)
      const list = D.createElement('div');
      list.style.display = 'flex';
      list.style.flexDirection = 'column';
      list.style.gap = '.5rem';

      function makeMediaRow(m) {
        const row = D.createElement('div');
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '.4rem';
        row.style.border = '1px solid var(--ppx-color-line,#e5e7eb)';
        row.style.borderRadius = '10px';
        row.style.padding = '.6rem';
        row.style.background = '#f8fafc';

        const preview = D.createElement('div');
        preview.style.display = 'flex';
        preview.style.alignItems = 'center';
        preview.style.gap = '.5rem';

        // Helper: detect common video providers and build embed URL
        function getVideoEmbed(u) {
          try {
            const url = new URL(u);
            const host = url.hostname.toLowerCase();
            // YouTube variants
            if (host.includes('youtube.com')) {
              const id = url.searchParams.get('v') || (url.pathname.split('/').includes('embed') ? url.pathname.split('/').pop() : '');
              if (id) return { provider: 'youtube', embed: `https://www.youtube.com/embed/${id}` };
            }
            if (host === 'youtu.be') {
              const id = url.pathname.replace(/^\/+/, '');
              if (id) return { provider: 'youtube', embed: `https://www.youtube.com/embed/${id}` };
            }
            // Vimeo
            if (host.includes('vimeo.com')) {
              const id = (url.pathname.replace(/^\/+/, '').split('/')[0] || '').trim();
              if (/^\d+$/.test(id)) return { provider: 'vimeo', embed: `https://player.vimeo.com/video/${id}` };
            }
          } catch (_) {}
          return null;
        }

        if (m.kind === 'image') {
          const img = D.createElement('img');
          img.src = m.thumb || m.src;
          img.alt = '';
          img.style.height = '120px';
          img.style.width = 'auto';
          img.style.maxWidth = '100%';
          img.style.objectFit = 'contain';
          img.style.cursor = 'zoom-in';
          img.addEventListener('click', () => {
            const full = D.createElement('img');
            full.src = m.src;
            full.style.maxWidth = '90vw';
            full.style.maxHeight = '85vh';
            openLightbox(full);
          });
          preview.appendChild(img);
        } else if (m.kind === 'audio') {
          const audio = D.createElement('audio');
          audio.src = m.src;
          audio.controls = true;
          audio.style.width = '100%';
          preview.appendChild(audio);
        } else {
          // VIDEO: try provider embed first; else direct <video>. Always allow "open large"
          const embed = getVideoEmbed(m.src);
          if (embed) {
            const btn = D.createElement('button');
            btn.type = 'button';
            btn.className = 'ppx-btn';
            btn.textContent = t('Abrir video', 'Open video');
            btn.addEventListener('click', () => {
              const iframe = D.createElement('iframe');
              iframe.src = embed.embed;
              iframe.width = '960';
              iframe.height = '540';
              iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
              iframe.allowFullscreen = true;
              iframe.style.border = '0';
              iframe.style.maxWidth = '90vw';
              iframe.style.maxHeight = '85vh';
              openLightbox(iframe);
            });
            const note = D.createElement('div');
            note.textContent = embed.provider === 'youtube' ? 'YouTube' : 'Vimeo';
            note.style.fontSize = '.9rem';
            note.style.color = '#64748b';
            preview.appendChild(btn);
            preview.appendChild(note);
          } else {
            const video = D.createElement('video');
            video.src = m.src;
            video.controls = true;
            video.style.width = '100%';
            video.style.maxHeight = '240px';
            video.style.cursor = 'zoom-in';
            video.addEventListener('click', () => {
              const big = D.createElement('video');
              big.src = m.src;
              big.controls = true;
              big.autoplay = true;
              big.style.maxWidth = '90vw';
              big.style.maxHeight = '85vh';
              openLightbox(big);
            });
            // If the URL isn't a direct file, show a gentle hint
            video.addEventListener('error', () => {
              const warn = D.createElement('div');
              warn.textContent = t(
                'Este enlace no parece ser un archivo de video directo (.mp4/.webm). Probá usar la URL directa o un enlace de YouTube/Vimeo.',
                'This link does not look like a direct video file (.mp4/.webm). Try a direct file URL or a YouTube/Vimeo link.'
              );
              warn.style.fontSize = '.9rem';
              warn.style.color = '#b45309';
              warn.style.background = '#fff7ed';
              warn.style.border = '1px solid #fed7aa';
              warn.style.padding = '.4rem .5rem';
              warn.style.borderRadius = '6px';
              preview.appendChild(warn);
            }, { once: true });
            preview.appendChild(video);
          }
        }

        const altWrap = D.createElement('div');
        altWrap.style.display = 'grid';
        altWrap.style.gridTemplateColumns = '1fr';
        altWrap.style.gap = '.4rem';

        const altES = D.createElement('input');
        altES.className = 'ppx-input';
        altES.placeholder = t('Texto alternativo (ES)', 'Alt text (ES)');
        altES.value = m.alt_es || '';
        altES.addEventListener('input', () => { m.alt_es = altES.value.trim(); });

        const altEN = D.createElement('input');
        altEN.className = 'ppx-input';
        altEN.placeholder = t('Alt text (EN)', 'Alt text (EN)');
        altEN.value = m.alt_en || '';
        altEN.addEventListener('input', () => { m.alt_en = altEN.value.trim(); });

        const actions = D.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '.4rem';
        actions.style.marginTop = '.2rem';

        const btnReplace = D.createElement('button');
        btnReplace.type = 'button';
        btnReplace.className = 'ppx-btn ppx-btn--subtle';
        btnReplace.textContent = t('Reemplazar', 'Replace');
        btnReplace.addEventListener('click', () => {
          const fp = D.createElement('input');
          fp.type = 'file';
          fp.accept = (m.kind === 'image') ? 'image/*' : (m.kind === 'audio' ? 'audio/*' : 'video/*');
          fp.onchange = async () => {
            const f = fp.files && fp.files[0];
            if (!f) return;
            const slug = (inputSlug && inputSlug.value || '').trim().toLowerCase();
            if (!slug) { alert(t('Primero completá el slug.', 'Please fill in the slug first.')); return; }
            try {
              const fd = new FormData();
              fd.append('file', f);
              const url = `/admin/api/exercises/tf/${encodeURIComponent(slug)}/upload?kind=${encodeURIComponent(m.kind)}`;
              const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
              let errMsg = '';
              if (!res.ok) {
                try { const jErr = await res.json(); errMsg = (jErr && (jErr.error || jErr.message)) || `HTTP ${res.status}`; }
                catch(_) { const txt = await res.text().catch(()=> ''); errMsg = txt || `HTTP ${res.status}`; }
                throw new Error(errMsg);
              }
              const j = await res.json().catch(() => null);
              if (!j || !j.ok || !j.data || !j.data.url) throw new Error((j && (j.error || j.message)) || 'Upload failed');
              const publicURL = j.data.url;
              m.src = publicURL;
              if (m.kind === 'image') m.thumb = publicURL;
              renderList();
            } catch (err) {
              console.error(err);
              alert((err && err.message) ? err.message : t('No se pudo subir el archivo.', 'Failed to upload file.'));
            }
          };
          fp.click();
        });

        const btnRemove = D.createElement('button');
        btnRemove.type = 'button';
        btnRemove.className = 'ppx-btn ppx-btn--subtle';
        btnRemove.textContent = t('Quitar', 'Remove');
        btnRemove.addEventListener('click', () => {
          node._media = node._media.filter(x => x.id !== m.id);
          renderList();
        });

        actions.appendChild(btnReplace);
        actions.appendChild(btnRemove);

        row.appendChild(preview);
        row.appendChild(altWrap);
        altWrap.appendChild(altES);
        altWrap.appendChild(altEN);
        row.appendChild(actions);
        return row;
      }

      function renderList() {
        list.innerHTML = '';
        node._media.forEach(m => list.appendChild(makeMediaRow(m)));
      }

      // File picker handler (image/audio/video)
      picker.addEventListener('change', async () => {
        const files = Array.from(picker.files || []);
        if (!files.length) return;
        const slug = (inputSlug && inputSlug.value || '').trim().toLowerCase();
        if (!slug) { alert(t('Primero completá el slug.', 'Please fill in the slug first.')); picker.value=''; return; }

        for (const file of files) {
          const type = (file.type || '').toLowerCase();
          const kind = type.startsWith('video') ? 'video' : (type.startsWith('audio') ? 'audio' : 'image');
          const id = makeId(kind === 'image' ? 'img' : (kind === 'audio' ? 'aud' : 'vid'));
          try {
            const fd = new FormData();
            fd.append('file', file);
            const url = `/admin/api/exercises/tf/${encodeURIComponent(slug)}/upload?kind=${encodeURIComponent(kind)}`;
            const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
            let errMsg = '';
            if (!res.ok) {
              try { const jErr = await res.json(); errMsg = (jErr && (jErr.error || jErr.message)) || `HTTP ${res.status}`; }
              catch(_) { const txt = await res.text().catch(()=> ''); errMsg = txt || `HTTP ${res.status}`; }
              throw new Error(errMsg);
            }
            const j = await res.json().catch(() => null);
            if (!j || !j.ok || !j.data || !j.data.url) throw new Error((j && (j.error || j.message)) || 'Upload failed');
            node._media.push({
              id, kind,
              src: j.data.url,
              thumb: (kind === 'image') ? j.data.url : undefined,
              alt_es: '', alt_en: '',
              transcript_es: '', transcript_en: ''
            });
          } catch (err) {
            console.error(err);
            alert((err && err.message) ? err.message : t('No se pudo subir el archivo.', 'Failed to upload file.'));
          }
        }
        renderList();
        picker.value = '';
      });

      // Row 4: heading URL
      const rowURLHead = D.createElement('div');
      rowURLHead.style.fontWeight = '600';
      rowURLHead.textContent = 'URL';

      // Row 5: dropdown (image/audio/video)
      const rowKind = D.createElement('div');
      const selKind = D.createElement('select');
      selKind.className = 'ppx-input';
      ['image','audio','video'].forEach(k => {
        const opt = D.createElement('option');
        opt.value = k;
        opt.textContent = k;
        selKind.appendChild(opt);
      });
      rowKind.appendChild(selKind);

      // Row 7: URL field (paste to add)
      const rowURL = D.createElement('div');
      const inURL = D.createElement('input');
      inURL.className = 'ppx-input';
      inURL.placeholder = t('Pegá la URL del medio', 'Paste media URL');
      rowURL.appendChild(inURL);

      function tryAddURL() {
        const url = (inURL.value || '').trim();
        if (!url) return;
        const kind = selKind.value || 'image';
        const id = makeId(kind === 'image' ? 'img' : (kind === 'audio' ? 'aud' : 'vid'));
        node._media.push({
          id, kind, src: url, thumb: (kind === 'image') ? url : undefined,
          alt_es: '', alt_en: '', transcript_es: '', transcript_en: ''
        });
        renderList();
        inURL.value = '';
      }
      inURL.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); tryAddURL(); } });
      inURL.addEventListener('blur', tryAddURL);

      // Assemble rows
      const bodyFrag = D.createDocumentFragment();
      bodyFrag.appendChild(rowAdd);
      bodyFrag.appendChild(list);
      bodyFrag.appendChild(rowURLHead);
      bodyFrag.appendChild(rowKind);
      bodyFrag.appendChild(rowURL);
      body.appendChild(bodyFrag);

      acc.appendChild(sum);
      acc.appendChild(body);

      node._renderMediaList = renderList;
      node._renderMediaGrid = renderList;

      hostCol.insertBefore(acc, hostCol.firstChild);
    }

    // ─────────────────────────────────────────────────────────────
    // Simple Markdown toolbar (Bold / Italic)
    // ─────────────────────────────────────────────────────────────
    function applyMarkdownFormatting(el, type) {
      if (!el || !el.isContentEditable) return;
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;
      const selectedText = range.toString();
      if (!selectedText) return;
      const mdWrap = type === 'bold' ? '**' : '_';
      const newText = mdWrap + selectedText + mdWrap;
      range.deleteContents();
      range.insertNode(document.createTextNode(newText));
    }

    D.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.ppx-richbar [data-cmd]');
      if (!btn) return;
      ev.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      const area = btn.closest('.ppx-richwrap')?.querySelector('.ppx-richarea');
      if (area) applyMarkdownFormatting(area, cmd);
    });

    function wireItemNode(node) {
      const btnUp = node.querySelector('[data-move-up]');
      const btnDown = node.querySelector('[data-move-down]');
      const btnDup = node.querySelector('[data-duplicate]');
      const btnDel = node.querySelector('[data-delete]');
      const titleEl = node.querySelector('.ppx-item-title');

      removeLegacyMedia(node);
      addMediaSection(node);

      function updateTitle() {
        const es = node.querySelector('[data-field="statement_es"]').value.trim();
        const en = node.querySelector('[data-field="statement_en"]').value.trim();
        titleEl.textContent = es || en || t('Nuevo ítem', 'New item');
      }
      node.addEventListener('input', (e) => {
        const tf = e.target.closest('[data-field]');
        if (tf) updateTitle();
      });

      btnUp && btnUp.addEventListener('click', () => {
        const prev = node.previousElementSibling;
        if (prev) itemsWrap.insertBefore(node, prev);
        renumber();
      });
      btnDown && btnDown.addEventListener('click', () => {
        const next = node.nextElementSibling;
        if (next) itemsWrap.insertBefore(next, node);
        renumber();
      });
      btnDup && btnDup.addEventListener('click', () => {
        const clone = node.cloneNode(true);
        clone._media = (node._media || []).map(m => ({...m}));
        wireItemNode(clone);
        if (typeof clone._renderMediaList === 'function') clone._renderMediaList();
        else if (typeof clone._renderMediaGrid === 'function') clone._renderMediaGrid();
        itemsWrap.insertBefore(clone, node.nextElementSibling);
        renumber();
      });
      btnDel && btnDel.addEventListener('click', () => {
        node.remove();
        renumber();
      });
    }

    function renumber() {
      let i = 1;
      itemsWrap.querySelectorAll('details.ppx-card').forEach((n) => {
        const handle = n.querySelector('[data-item-handle]');
        if (handle) handle.textContent = `#${i}`;
        i += 1;
      });
    }

    // Initialize with one item if empty
    if (!itemsWrap.querySelector('details.ppx-card')) {
      itemsWrap.insertBefore(newItemNode(), addBar);
      renumber();
    }

    btnAdd && btnAdd.addEventListener('click', () => {
      itemsWrap.insertBefore(newItemNode(), addBar);
      renumber();
    });

    // ─────────────────────────────────────────────────────────────
    // JSON assembly & validation
    // ─────────────────────────────────────────────────────────────
    function parseTags(str) {
      return (str || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    function collectItems() {
      const out = [];
      let order = 1;
      itemsWrap.querySelectorAll('details.ppx-card').forEach((n) => {
        const item = {
          id: `t${order}`,
          order,
          statement_es: (n.querySelector('[data-field="statement_es"]')?.innerText || '').trim(),
          statement_en: (n.querySelector('[data-field="statement_en"]')?.innerText || '').trim(),
          answer: n.querySelector('[data-field="answer"]').value.trim(), // "true" | "false"
          hint_es: (n.querySelector('[data-field="hint_es"]')?.innerText || '').trim(),
          hint_en: (n.querySelector('[data-field="hint_en"]')?.innerText || '').trim(),
          feedback_correct_es: (n.querySelector('[data-field="feedback_correct_es"]')?.innerText || '').trim(),
          feedback_correct_en: (n.querySelector('[data-field="feedback_correct_en"]')?.innerText || '').trim(),
          feedback_incorrect_es: (n.querySelector('[data-field="feedback_incorrect_es"]')?.innerText || '').trim(),
          feedback_incorrect_en: (n.querySelector('[data-field="feedback_incorrect_en"]')?.innerText || '').trim(),
          media: Array.isArray(n._media) ? n._media.map(m => ({
            id: m.id,
            kind: (m.kind === 'audio' || m.kind === 'video') ? m.kind : 'image',
            src: m.src,
            thumb: m.thumb,
            alt_es: m.alt_es || '',
            alt_en: m.alt_en || '',
            transcript_es: m.transcript_es || '',
            transcript_en: m.transcript_en || ''
          })) : []
        };
        out.push(item);
        order += 1;
      });
      return out;
    }

    function assembleJSON(defaultStatus = 'draft') {
      const titleSource = (inputTitleEs.value || inputTitleEn.value || '').trim();
      const autoSlug = titleSource
        ? titleSource
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-{2,}/g, '-')
            .replace(/^-+|-+$/g, '')
        : '';

      const slugFromURL = (() => {
        const m = location.pathname.match(/\/admin\/exercises\/tf\/([^\/]+)\/edit/);
        return m && m[1] ? decodeURIComponent(m[1]).toLowerCase() : '';
      })();

      const slug = ((inputSlug.value || '').trim().toLowerCase()) || autoSlug || slugFromURL;
      if (!inputSlug.value && slug) inputSlug.value = slug;

      // Read taxonomy paths from hidden input (JSON array)
      const txPaths = (() => {
        try {
          const v = (inputTx && inputTx.value) ? String(inputTx.value).trim() : '';
          const arr = v ? JSON.parse(v) : [];
          return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
        } catch (_) { return []; }
      })();

      const chosenStatus = selStatus ? (String(selStatus.value || defaultStatus).toLowerCase()) : defaultStatus;
      const payload = {
        id: slug ? `tf/${slug}` : '',
        type: 'tf',
        slug: slug,
        version: 1,
        title_es: inputTitleEs.value.trim(),
        title_en: inputTitleEn.value.trim(),
        instructions_es: taInstEs.value.trim() || t('Elegí Verdadero o Falso.', 'Choose True or False.'),
        instructions_en: taInstEn.value.trim() || 'Choose True or False.',
        level: selLevel.value || 'A2',
        taxonomy_paths: txPaths,
        // legacy field retained but unused by UI
        tags: [],
        status: ['draft','published','archived'].includes(chosenStatus) ? chosenStatus : defaultStatus,
        created_by: 'admin',
        created_at: new Date().toISOString(),
        items: collectItems()
      };
      return payload;
    }

    /* legacy validate removed
    function validatePayload(p) {
      const errors = [];
      if (!p.slug || p.slug === 'untitled') errors.push(t('Falta el slug.', 'Slug is required.'));
      if (!p.title_es && !p.title_en) errors.push(t('Falta el título.', 'Title is required.'));\n      if (!(p.instructions_es || p.instructions_en)) errors.push(t('Faltan instrucciones ES/EN.', 'Instructions ES/EN required.'));
      if (!Array.isArray(p.items) || p.items.length === 0) errors.push(t('Agregá al menos un ítem.', 'Add at least one item.'));
      p.items.forEach((it, i) => {
        if (!it.statement_es && !it.statement_en) errors.push(t(`Ítem #${i+1}: falta el enunciado.`, `Item #${i+1}: statement required.`));
        if (!['true', 'false'].includes(String(it.answer))) errors.push(t(`Ítem #${i+1}: respuesta debe ser Verdadero/Falso.`, `Item #${i+1}: answer must be True/False.`));
      });
      return errors;
    }

    end legacy block */

    // Fixed validatePayload (no stray tokens)
    function validatePayload(p) {
      const errors = [];
      if (!p.slug || p.slug === 'untitled') errors.push(t('Falta el slug.', 'Slug is required.'));
      if (!p.title_es && !p.title_en) errors.push(t('Falta el titulo.', 'Title is required.'));
      if (!(p.instructions_es || p.instructions_en)) errors.push(t('Faltan instrucciones ES/EN.', 'Instructions ES/EN required.'));
      if (!Array.isArray(p.items) || p.items.length === 0) errors.push(t('Agrega al menos un item.', 'Add at least one item.'));
      p.items.forEach((it, i) => {
        if (!it.statement_es && !it.statement_en) errors.push(t(`Item #${i+1}: falta el enunciado.`, `Item #${i+1}: statement required.`));
        if (!['true', 'false'].includes(String(it.answer))) errors.push(t(`Item #${i+1}: respuesta debe ser Verdadero/Falso.`, `Item #${i+1}: answer must be True/False.`));
      });
      return errors;
    }

    function toast(msg) {
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.position = 'fixed';
      el.style.bottom = '12px';
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      el.style.background = '#0f172a';
      el.style.color = '#fff';
      el.style.padding = '8px 12px';
      el.style.borderRadius = '10px';
      el.style.zIndex = '2000';
      el.style.boxShadow = '0 6px 18px rgba(0,0,0,.25)';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1400);
    }

    // Save (honors selected status)
    btnSave && btnSave.addEventListener('click', async () => {
      const payload = assembleJSON(selStatus ? (selStatus.value || 'draft') : 'draft');
      const errs = validatePayload(payload);
      if (errs.length) { alert(errs.join('\n')); return; }

      const mode = (form.getAttribute('data-builder-mode') || '').toLowerCase();
      const isEdit = mode === 'edit' && payload.slug;

      const url = isEdit
        ? `/admin/api/exercises/${encodeURIComponent('tf')}/${encodeURIComponent(payload.slug)}`
        : `/admin/api/exercises`;

      const method = isEdit ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const j = await res.json();
        const saved = j.data || {};
        toast(t(`Guardado (v${saved.version || '?'})`, `Saved (v${saved.version || '?'})`));
        if (btnPublish) btnPublish.disabled = false;
      } catch (e) {
        console.error(e);
        alert(t('Error al guardar el borrador.', 'Failed to save draft.'));
      }
    });

    // Export JSON
    btnExport && btnExport.addEventListener('click', () => {
      const payload = assembleJSON('draft');
      const errs = validatePayload(payload);
      if (errs.length) { alert(errs.join('\n')); return; }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${payload.slug || 'exercise'}.tf.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    // Preview
    btnPreview && btnPreview.addEventListener('click', () => {
      const payload = assembleJSON('draft');
      const errs = validatePayload(payload);
      if (errs.length) { alert(errs.join('\n')); return; }

      const url = `/admin/api/exercises/tf/${encodeURIComponent(payload.slug)}`;
      const originalFetch = window.fetch;
      let armed = true;

      window.fetch = async function (input, init) {
        try {
          const reqUrl = (typeof input === 'string') ? input : input.url;
          const wantsSpecificVersion = reqUrl && reqUrl.startsWith(url);
          if (armed && wantsSpecificVersion) {
            return new Response(JSON.stringify(payload), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return originalFetch.apply(this, arguments);
        } catch (e) {
          return originalFetch.apply(this, arguments);
        }
      };

      const onClose = () => {
        armed = false;
        window.fetch = originalFetch;
        window.removeEventListener('ppx:modal:close', onClose);
      };
      window.addEventListener('ppx:modal:close', onClose);

      try {
        window.PPX.openExercise({
          type: 'tf',
          slug: payload.slug,
          lang: appLang,
          context: { source: 'admin-preview' }
        });
      } catch (e) {
        onClose();
        console.error(e);
        alert(t('No se pudo abrir la vista previa.', 'Failed to open preview.'));
      }
    });

    // Publish (optional backend)
    if (btnPublish) {
      btnPublish.addEventListener('click', async () => {
        const payload = assembleJSON('draft');
        if (selStatus) selStatus.value = 'published';
        const errs = validatePayload(payload);
        if (errs.length) { alert(errs.join('\n')); return; }

        try {
          const res1 = await fetch('/admin/api/exercises', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(payload)
          });
          if (!res1.ok) {
            const j = await res1.json().catch(() => ({}));
            throw new Error(j.error || `HTTP ${res1.status}`);
          }
          const pubURL = `/admin/api/exercises/tf/${encodeURIComponent(payload.slug)}/publish`;
          const res2 = await fetch(pubURL, { method: 'POST', credentials: 'same-origin' });
          if (!res2.ok) {
            const j = await res2.json().catch(() => ({}));
            throw new Error(j.error || `HTTP ${res2.status}`);
          }
          const j2 = await res2.json();
          const saved = j2.data || {};
          toast(t(`Publicado (v${saved.version || '?'})`, `Published (v${saved.version || '?'})`));
        } catch (e) {
          console.error(e);
          alert(t('No se pudo publicar el ejercicio.', 'Failed to publish exercise.'));
        }
      });
    }

    // Autosave
    let dirty = false;
    form.addEventListener('input', () => { dirty = true; });
    setInterval(() => {
      if (!dirty) return;
      try {
        const payload = assembleJSON('draft');
        const errs = validatePayload(payload);
        if (!errs.length && payload.slug) {
          const key = `ppx:ex:tf:${payload.slug}`;
          localStorage.setItem(key, JSON.stringify(payload));
          dirty = false;
        }
      } catch (_) {}
    }, 10000);

    // Prefill for EDIT mode
    const BUILDER = window.PPX_BUILDER || {};
    // 1) Server-embedded prefill (if provided)
    if (window.__TF_PREFILL && typeof window.__TF_PREFILL === 'object') {
      try {
        applyJsonToBuilder(window.__TF_PREFILL, { silent: true });
        if (selStatus) selStatus.value = (window.__TF_PREFILL.status || 'draft');
      } catch (e) { console.error(e); }
    }
    // 2) Route-driven prefill
    if (BUILDER.mode === 'edit' && BUILDER.slug) {
      prefillFromSlug(BUILDER.slug);
    } else {
      // 3) Fallback: infer slug from URL pattern /admin/exercises/tf/:slug/edit
      try {
        const m = location.pathname.match(/\/admin\/exercises\/tf\/([^\/]+)\/edit/i);
        if (m && m[1]) prefillFromSlug(decodeURIComponent(m[1]));
      } catch(_) { /* ignore */ }
    }

    async function prefillFromSlug(slug) {
      try {
        const res = await fetch(`/admin/api/exercises/tf/${encodeURIComponent(slug)}`, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const data = raw && raw.data ? raw.data : raw;

        applyJsonToBuilder(data, { silent: true });
        if (selStatus) selStatus.value = (data.status || 'draft');
        dirty = false;
        toast(t('Ejercicio cargado para edición.', 'Exercise loaded for edit.'));
      } catch (err) {
        console.error(err);
        alert(t('No se pudo cargar el ejercicio para editar.', 'Failed to load exercise for edit.'));
      }
    }

    // ─────────────────────────────────────────────────────────────
    // JSON Editor (modal) — Build/Edit via JSON
    // ─────────────────────────────────────────────────────────────
    let lastGoodJson = null;

    function createJsonEditButton() {
      // If a button exists in template, wire it; otherwise create one next to Export
      let btn = D.getElementById('ppx-edit-json');
      if (!btn) {
        btn = D.createElement('button');
        btn.type = 'button';
        btn.id = 'ppx-edit-json';
        btn.className = 'ppx-btn';
        btn.title = t('Editar JSON', 'Edit JSON');
        btn.setAttribute('aria-label', t('Editar JSON', 'Edit JSON'));
        btn.style.display = 'inline-flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '6px';
        btn.style.padding = '6px 10px';
        btn.style.borderRadius = '10px';

        const icon = D.createElement('img');
        icon.src = '/static/assets/icons/json.svg';
        icon.alt = '';
        icon.width = 18;
        icon.height = 18;

        const label = D.createElement('span');
        label.textContent = 'JSON';

        btn.appendChild(icon);
        btn.appendChild(label);

        if (btnExport && btnExport.parentNode) {
          btnExport.parentNode.insertBefore(btn, btnExport.nextSibling);
        } else if (form) {
          form.appendChild(btn);
        }
      }
      btn.addEventListener('click', () => {
        // Prefer shared PPX JSON editor when available; otherwise fallback to legacy modal
        if (!window.PPXJsonEditor || typeof window.PPXJsonEditor.open !== 'function') {
          try { openJsonEditor(); } catch(e){ console.error(e); }
          return;
        }
        const payload = assembleJSON('draft');
        try {
          window.PPXJsonEditor.open({
            exerciseType: 'tf',
            slug: payload.slug || '',
            title: payload.title_es || payload.title_en || payload.slug || '',
            level: payload.level || (selLevel ? selLevel.value : ''),
            initialData: payload,
            validate: (obj) => validatePayload(obj),
            apply: (obj) => {
              // Basic structure checks
              if (obj.type && obj.type !== 'tf') {
                alert(t('Este editor es para ejercicios de tipo True/False (tf).', 'This editor is for True/False (tf) exercises.'));
                return;
              }
              if (!Array.isArray(obj.items) || obj.items.length === 0) {
                const ok = window.confirm(t(
                  'No se detectan ítems en el JSON. ¿Aplicar de todos modos y limpiar la lista?',
                  'No items found in JSON. Apply anyway and clear the list?'
                ));
                if (!ok) return;
              }
              // Confirm replacing current builder if already has items
              const hasItems = !!itemsWrap.querySelector('details.ppx-card');
              if (hasItems) {
                const ok = window.confirm(t(
                  'Esto reemplazará el contenido actual del constructor. ¿Continuar?',
                  'This will replace the current builder content. Continue?'
                ));
                if (!ok) return;
              }
              applyJsonToBuilder(obj, { silent: false });
            }
          });
        } catch (e) {
          console.error(e);
          alert(t('No se pudo abrir el editor JSON.', 'Failed to open JSON editor.'));
        }
      });
    }

    function openJsonEditor() {
      const payload = assembleJSON('draft');
      lastGoodJson = JSON.stringify(payload, null, 2);

      const ov = D.createElement('div');
      ov.style.position = 'fixed';
      ov.style.inset = '0';
      ov.style.background = 'rgba(0,0,0,.55)';
      ov.style.zIndex = '2500';
      ov.style.display = 'flex';
      ov.style.alignItems = 'center';
      ov.style.justifyContent = 'center';

      const modal = D.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'ppx-json-title');
      modal.style.width = 'min(960px, 86vw)';
      modal.style.boxSizing = 'border-box';
      modal.style.maxWidth = '100%';
      modal.style.maxHeight = '90vh';
      modal.style.display = 'flex';
      modal.style.flexDirection = 'column';
      modal.style.background = '#fff';
      modal.style.borderRadius = '14px';
      modal.style.boxShadow = '0 14px 40px rgba(0,0,0,.35)';
      modal.style.overflow = 'hidden';

      const header = D.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.padding = '.75rem 1rem';
      header.style.borderBottom = '1px solid #e5e7eb';

      const h = D.createElement('h3');
      h.id = 'ppx-json-title';
      h.textContent = t('Editar como JSON', 'Edit as JSON');
      h.style.margin = '0';
      h.style.fontSize = '1rem';

      const closeX = D.createElement('button');
      closeX.type = 'button';
      closeX.textContent = '✕';
      closeX.setAttribute('aria-label', t('Cerrar', 'Close'));
      closeX.className = 'ppx-btn ppx-btn--ghost';
      closeX.style.borderRadius = '999px';
      closeX.style.padding = '.25rem .5rem';

      header.appendChild(h);
      header.appendChild(closeX);

      const body = D.createElement('div');
      body.style.padding = '.75rem 1rem';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.gap = '.5rem';
      body.style.minHeight = '300px';

      const textarea = D.createElement('textarea');
      textarea.value = lastGoodJson;
      textarea.style.width = '100%';
      textarea.style.height = '46vh';
      textarea.style.boxSizing = 'border-box';  // prevent overflow so the scrollbar stays fully visible
      textarea.style.resize = 'vertical';
      textarea.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
      textarea.style.fontSize = '13px';
      textarea.style.lineHeight = '1.45';
      textarea.style.padding = '.75rem';
      textarea.style.border = '1px solid #e5e7eb';
      textarea.style.borderRadius = '8px';

      const status = D.createElement('div');
      status.setAttribute('aria-live', 'polite');
      status.style.fontSize = '.9rem';
      status.style.color = '#6b7280';

      const footer = D.createElement('div');
      footer.style.display = 'flex';
      footer.style.alignItems = 'center';
      footer.style.justifyContent = 'space-between';
      footer.style.gap = '.5rem';
      footer.style.padding = '.75rem 1rem';
      footer.style.borderTop = '1px solid #e5e7eb';
      footer.style.background = '#f8fafc';

      const left = D.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '.5rem';

      const btnValidate = D.createElement('button');
      btnValidate.type = 'button';
      btnValidate.className = 'ppx-btn ppx-btn--subtle';
      btnValidate.textContent = t('Validar', 'Validate');

      const btnApply = D.createElement('button');
      btnApply.type = 'button';
      btnApply.className = 'ppx-btn';
      btnApply.textContent = t('Aplicar', 'Apply');

      const btnCancel = D.createElement('button');
      btnCancel.type = 'button';
      btnCancel.className = 'ppx-btn ppx-btn--ghost';
      btnCancel.textContent = t('Cancelar', 'Cancel');

      left.appendChild(btnValidate);

      const right = D.createElement('div');
      right.style.display = 'flex';
      right.style.gap = '.5rem';
      right.appendChild(btnCancel);
      right.appendChild(btnApply);

      footer.appendChild(left);
      footer.appendChild(right);

      body.appendChild(textarea);
      body.appendChild(status);

      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);

      ov.appendChild(modal);
      D.body.appendChild(ov);

      function close() { ov.remove(); }

      closeX.addEventListener('click', close);
      btnCancel.addEventListener('click', close);
      ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
      D.addEventListener('keydown', function esc(e){ if (e.key === 'Escape'){ close(); D.removeEventListener('keydown', esc); } });

      function computeSyntaxErrorPosition(err) {
        try {
          const msg = String(err && err.message || '');
          // Chrome-style: "at position 123" — Firefox: "line 12 column 5"
          const m1 = msg.match(/position\s+(\d+)/i);
          if (m1) {
            const pos = parseInt(m1[1], 10);
            const src = textarea.value;
            let line = 1, col = 1;
            for (let i = 0; i < pos && i < src.length; i++) {
              if (src[i] === '\n') { line++; col = 1; } else { col++; }
            }
            return { line, col };
          }
          const m2 = msg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
          if (m2) return { line: parseInt(m2[1],10), col: parseInt(m2[2],10) };
        } catch(_) {}
        return null;
      }

      function validateNow() {
        try {
          const obj = JSON.parse(textarea.value);
          status.style.color = '#15803d';
          status.textContent = t('JSON válido.', 'Valid JSON.');
          btnApply.disabled = false;
          return obj;
        } catch (err) {
          const pos = computeSyntaxErrorPosition(err);
          status.style.color = '#b91c1c';
          status.textContent = pos
            ? t(`Error de sintaxis (línea ${pos.line}, col ${pos.col}).`, `Syntax error (line ${pos.line}, col ${pos.col}).`)
            : t('Error de sintaxis.', 'Syntax error.');
          btnApply.disabled = true;
          return null;
        }
      }

      // Initial validate
      validateNow();

      btnValidate.addEventListener('click', validateNow);
      textarea.addEventListener('input', () => {
        // live validation but non-intrusive
        validateNow();
      });

      btnApply.addEventListener('click', () => {
        const obj = validateNow();
        if (!obj) return;

        // Basic structure checks
        if (obj.type && obj.type !== 'tf') {
          alert(t('Este editor es para ejercicios de tipo True/False (tf).', 'This editor is for True/False (tf) exercises.'));
          return;
        }
        if (!Array.isArray(obj.items) || obj.items.length === 0) {
          const ok = window.confirm(t(
            'No se detectan ítems en el JSON. ¿Aplicar de todos modos y limpiar la lista?',
            'No items found in JSON. Apply anyway and clear the list?'
          ));
          if (!ok) return;
        }

        // Confirm overwrite
        const hasExistingItems = !!itemsWrap.querySelector('details.ppx-card');
        if (hasExistingItems) {
          const ok = window.confirm(t(
            'Esto reemplazará el contenido actual del constructor. ¿Continuar?',
            'This will replace the current builder content. Continue?'
          ));
          if (!ok) return;
        }

        try {
          applyJsonToBuilder(obj, { silent: false });
          lastGoodJson = JSON.stringify(obj, null, 2);
          toast(t('JSON aplicado.', 'JSON applied.'));
          close();
        } catch (err) {
          console.error(err);
          alert(t('No se pudo aplicar el JSON.', 'Failed to apply JSON.'));
        }
      });
    }

    function applyJsonToBuilder(data, { silent = false } = {}) {
      // Fill top-level fields
      inputSlug.value = (data.slug || '').toLowerCase();
      inputTitleEs.value = data.title_es || '';
      inputTitleEn.value = data.title_en || '';
      taInstEs.value = data.instructions_es || (data.instructions && (data.instructions.es || '')) || '';
      taInstEn.value = data.instructions_en || (data.instructions && (data.instructions.en || '')) || '';
      selLevel.value = data.level || 'A2';
      try {
        const tx = Array.isArray(data.taxonomy_paths) ? data.taxonomy_paths : [];
        if (inputTx) {
          inputTx.value = JSON.stringify(tx);
          // Notify taxonomy picker to update selection and chips
          inputTx.dispatchEvent(new CustomEvent('ppx:taxonomy:set', { bubbles: true, detail: { paths: tx } }));
        }
      } catch (_) { /* no-op */ }

      // Clear current items
      Array.from(itemsWrap.querySelectorAll('details.ppx-card')).forEach(n => n.remove());

      const items = Array.isArray(data.items) ? data.items.slice().sort((a,b)=>(a.order||0)-(b.order||0)) : [];
      if (!items.length) {
        itemsWrap.insertBefore(newItemNode(), addBar);
        renumber();
      } else {
        items.forEach((it) => {
          const node = newItemNode();

          const es = node.querySelector('[data-field="statement_es"]');
          const en = node.querySelector('[data-field="statement_en"]');
          const ans = node.querySelector('[data-field="answer"]');
          const hES = node.querySelector('[data-field="hint_es"]');
          const hEN = node.querySelector('[data-field="hint_en"]');
          const fCES = node.querySelector('[data-field="feedback_correct_es"]');
          const fCEN = node.querySelector('[data-field="feedback_correct_en"]');
          const fIES = node.querySelector('[data-field="feedback_incorrect_es"]');
          const fIEN = node.querySelector('[data-field="feedback_incorrect_en"]');

          if (es) es.innerText = it.statement_es || '';
          if (en) en.innerText = it.statement_en || '';
          if (ans) ans.value = (String(it.answer || 'true').toLowerCase() === 'false') ? 'false' : 'true';
          if (hES) hES.innerText = it.hint_es || '';
          if (hEN) hEN.innerText = it.hint_en || '';
          if (fCES) fCES.innerText = it.feedback_correct_es || '';
          if (fCEN) fCEN.innerText = it.feedback_correct_en || '';
          if (fIES) fIES.innerText = it.feedback_incorrect_es || '';
          if (fIEN) fIEN.innerText = it.feedback_incorrect_en || '';

          // Normalize media
          node._media = Array.isArray(it.media)
            ? it.media
                .filter(m => m && (m.src || m.thumb))
                .map(m => ({
                  id: m.id || makeId(
                    m.kind === 'audio' ? 'aud' : (m.kind === 'video' ? 'vid' : 'img')
                  ),
                  kind: (m.kind === 'audio') ? 'audio' : (m.kind === 'video' ? 'video' : 'image'),
                  src: m.src || m.thumb || '',
                  thumb: m.thumb || m.src || '',
                  alt_es: m.alt_es || '',
                  alt_en: m.alt_en || '',
                  transcript_es: m.transcript_es || '',
                  transcript_en: m.transcript_en || ''
                }))
            : [];

          if (typeof node._renderMediaList === 'function') node._renderMediaList();
          else if (typeof node._renderMediaGrid === 'function') node._renderMediaGrid();

          itemsWrap.insertBefore(node, addBar);
        });
        renumber();
      }

      if (!silent) {
        dirty = false;
      }
    }

    // Inject the JSON edit button
    createJsonEditButton();

  });
})();
// caretToggleAdded: keep caret right (closed) vs down (open)
(function(){
  try {
    const wrap = document.getElementById('ppx-items');
    if (!wrap) return;
    const update = () => {
      wrap.querySelectorAll('details.ppx-card').forEach(det => {
        const caret = det.querySelector('[data-caret]');
        if (caret) caret.src = det.open ? '/static/assets/icons/chevron_down.svg' : '/static/assets/icons/chevron_collapsed.svg';
      });
    };
    wrap.addEventListener('toggle', (e) => { const det = e.target; if (det && det.matches && det.matches('details.ppx-card')) { const caret = det.querySelector('[data-caret]'); if (caret) caret.src = det.open ? '/static/assets/icons/chevron_down.svg' : '/static/assets/icons/chevron_collapsed.svg'; } }, true);
    update();
  } catch(_){}
})();


