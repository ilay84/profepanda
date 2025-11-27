/* static/js/ppx-modal.js */
(function () {
  const W = window;
  const D = document;

  const SEL = {
    modal: '.ppx-modal',
    overlay: '.ppx-modal__overlay',
    head: '.ppx-modal__head',
    title: '.ppx-modal__title',
    meta: '.ppx-modal__meta',
    progressBar: '.ppx-modal__progressBar > i',
    body: '.ppx-modal__body',
    foot: '.ppx-modal__foot',
    actions: '.ppx-modal__actions',
    closeBtn: '.ppx-modal__close',
    lightbox: '.ppx-lightbox',
    lightboxWrap: '.ppx-lightbox__imgWrap',
    lightboxClose: '.ppx-lightbox__close'
  };

  let state = {
    mounted: false,
    open: false,
    lastActive: null,
    opts: {}
  };

  function el(tag, attrs = {}, children = []) {
    const n = D.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else n.setAttribute(k, v);
    }
    for (const c of ([]).concat(children)) {
      if (c == null) continue;
      n.appendChild(typeof c === 'string' ? D.createTextNode(c) : c);
    }
    return n;
  }

  function qs(root, sel) { return (root || D).querySelector(sel); }
  function qsa(root, sel) { return Array.from((root || D).querySelectorAll(sel)); }

  function dispatch(name, detail) {
    W.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function ensureDOM() {
    if (state.mounted) return;

    // Panelized modal: transparent fullscreen container + centered white panel
    const panel = el('div', { class: 'ppx-modal__panel' }, [
      el('header', { class: 'ppx-modal__head' }, [
        el('h2', { class: 'ppx-modal__title', id: 'ppx-modal-title', text: '' }),
        el('div', { class: 'ppx-modal__meta', 'aria-live': 'polite' }),
        el('div', { class: 'ppx-modal__progress' }, [
          el('div', { class: 'ppx-modal__progressBar', 'aria-hidden': 'true' }, [
            el('i')
          ])
        ])
      ]),
      el('section', { class: 'ppx-modal__body', tabindex: '-1' }),
      el('footer', { class: 'ppx-modal__foot' }, [
        el('div', { class: 'ppx-modal__actions ppx-modal__actions--left' }),
        el('div', { class: 'ppx-modal__actions ppx-modal__actions--right' })
      ])
    ]);

    const modal = el('div', {
      class: 'ppx-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'ppx-modal-title'
    }, [ panel ]);

    const overlay = el('div', { class: 'ppx-modal__overlay', 'aria-hidden': 'true' });

    const lightbox = el('div', { class: 'ppx-lightbox', 'aria-hidden': 'true' }, [
      el('button', { class: 'ppx-btn ppx-lightbox__close', 'aria-label': 'Close' }, [ '✕' ]),
      el('div', { class: 'ppx-lightbox__imgWrap' })
    ]);

    D.body.appendChild(modal);
    D.body.appendChild(overlay);
    D.body.appendChild(lightbox);

    // Keep shell visuals driven by CSS, not forced to transparent
    const headEl = panel.querySelector('.ppx-modal__head');
    const footEl = panel.querySelector('.ppx-modal__foot');
    modal.style.outline = '0';

    // Close lightbox on background click (ignore clicks on the image wrapper)
    lightbox.addEventListener('click', (e) => {
      const wrap = qs(D, SEL.lightboxWrap);
      if (!wrap.contains(e.target)) closeLightbox();
    });

    // Click outside panel to close (respect strict dismiss)
    modal.addEventListener('click', (e) => {
      const pnl = qs(D, '.ppx-modal__panel');
      if (pnl && !pnl.contains(e.target)) {
        if (!(state.opts && state.opts.dismiss === 'strict')) API.close();
      }
    });

    // Prevent background scroll while lightbox is open
    lightbox.addEventListener('wheel', (e) => { e.preventDefault(); }, { passive: false });

    // Close on overlay click (respect strict dismiss)
    overlay.addEventListener('click', () => {
      if (!(state.opts && state.opts.dismiss === 'strict')) API.close();
    });

    // Close on Esc (modal and lightbox) — respect strict dismiss for modal
    D.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (qs(D, SEL.lightbox).classList.contains('is-open')) {
          closeLightbox();
          e.stopPropagation();
          return;
        }
        if (state.open) {
          if (!(state.opts && state.opts.dismiss === 'strict')) API.close();
        }
      }
    });

    // Focus trap
    D.addEventListener('keydown', trapTab);

    // Lightbox close button
    qs(D, SEL.lightboxClose).addEventListener('click', closeLightbox);
    // Modal close button (optional — only if present)
    const headerClose = qs(D, SEL.closeBtn);
    if (headerClose) headerClose.addEventListener('click', () => API.close());

    state.mounted = true;
  }

  function trapTab(e) {
    if (!state.open || e.key !== 'Tab') return;
    const modal = qs(D, SEL.modal);
    if (!modal) return;

    const focusables = qsa(modal, [
      'a[href]',
      'area[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'iframe',
      'audio[controls]',
      'video[controls]',
      '[contenteditable]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',')).filter(n => n.offsetParent !== null);

    if (!focusables.length) {
      e.preventDefault();
      qs(D, SEL.body).focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = D.activeElement;

    if (e.shiftKey) {
      if (active === first || !modal.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !modal.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function freezeBackground(on) {
    const htmlEl = D.documentElement;
    if (on) {
      D.body.style.overflow = 'hidden';
      htmlEl.style.overflow = 'hidden';
    } else {
      D.body.style.overflow = '';
      htmlEl.style.overflow = '';
    }
  }

  function setTitle(title) {
    const t = title || '';
    const nativeTitle = qs(D, SEL.title);
    if (nativeTitle) nativeTitle.textContent = t;
    const exTitle = qs(D, '.ppx-ex__title');
    if (exTitle) exTitle.textContent = t;
  }

  function setMeta(text) {
    let metaEl = qs(D, SEL.meta);
    if (!metaEl) {
      const head = qs(D, SEL.head);
      if (head) {
        // Create meta area if it was cleared during refactor
        metaEl = el('div', { class: 'ppx-modal__meta', 'aria-live': 'polite' });
        const prog = qs(head, '.ppx-modal__progress');
        if (prog) head.insertBefore(metaEl, prog); else head.appendChild(metaEl);
      }
    }
    if (metaEl) metaEl.textContent = text || '';
  }

  function setProgress(percent) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0));
    const bar = qs(D, SEL.progressBar);
    if (bar) bar.style.width = p + '%';
  }

  function clearActions() {
    const left = qs(D, '.ppx-modal__actions--left');
    const right = qs(D, '.ppx-modal__actions--right');
    left.innerHTML = '';
    right.innerHTML = '';
  }

  function makeBtn(spec) {
    if (!spec) return null;
    const { label, title, onClick, variant = 'ghost', disabled = false, id } = spec;
    const btn = el('button', {
      class: `ppx-btn ppx-btn--${variant}`,
      type: 'button',
      id: id || ''
    }, [ label || '' ]);
    if (title) btn.title = title;
    if (disabled) btn.disabled = true;
    if (typeof onClick === 'function') btn.addEventListener('click', onClick);
    return btn;
  }

  function setActions(actions = {}) {
    clearActions();
    const left = qs(D, '.ppx-modal__actions--left');
    const right = qs(D, '.ppx-modal__actions--right');

    // Hide footer navigation by default. If footerNav is not explicitly true,
    // null out the standard nav specs so they won't render.
    if (!(state.opts && state.opts.footerNav === true)) {
      actions = Object.assign({}, actions, {
        prev: null,
        retry: null,
        check: null,
        next: null
      });
    }

    // Common layout: left = Prev • Retry ; right = Check • Next
    const prevBtn = makeBtn(actions.prev);
    const retryBtn = makeBtn(actions.retry);
    const checkBtn = makeBtn(actions.check);
    const nextBtn = makeBtn(actions.next);

    if (prevBtn) left.appendChild(prevBtn);
    if (retryBtn) left.appendChild(retryBtn);
    if (checkBtn) right.appendChild(checkBtn);
    if (nextBtn) right.appendChild(nextBtn);

    // Optional extras (e.g., SFX toggle)
    if (actions.extraLeft) left.appendChild(actions.extraLeft);
    if (actions.extraRight) right.appendChild(actions.extraRight);
  }

  function setBody(content) {
    const head = qs(D, SEL.head);
    const body = qs(D, SEL.body);
    const foot = qs(D, SEL.foot);
    if (!body) return;

    // Normalize provided content into a Node
    let contentNode = null;
    if (typeof content === 'string') {
      const tmp = D.createElement('div');
      tmp.innerHTML = content;
      contentNode = tmp;
    } else if (content instanceof Node) {
      contentNode = content;
    } else {
      contentNode = D.createElement('div');
    }

    // Read options from PPXModal.open()
    const headerTitle = state.opts?.headerTitle || '';
    const typeLabel   = state.opts?.typeLabel   || '';
    const levelText   = state.opts?.level       || '';
    const levelLabel  = state.opts?.levelLabel  || 'Nivel:';
    const logoPath    = state.opts?.logoPath    || '/static/assets/logo/header_logo.png';

    // Build header row inside the modal head
    if (head) {
      head.innerHTML = '';
      const topRow = el('div', { class: 'ppx-ex__row ppx-ex__row--top' }, [
        el('div', { class: 'ppx-ex__titleWrap' }, [
          el('h3', { class: 'ppx-ex__title', id: 'ppx-modal-title', text: headerTitle })
        ]),
        el('div', { class: 'ppx-ex__right', style: 'display:inline-flex;align-items:center;gap:10px;' }, [
          typeLabel ? el('span', { class: 'ppx-pill ppx-pill--type', text: typeLabel }) : null,
          (state.opts && state.opts.instructionsHTML) ? el('button', {
            class: 'ppx-ex__iconBtn ppx-ex__info',
            type: 'button',
            'aria-label': (state.opts && state.opts.instructionsTitle) ? state.opts.instructionsTitle : 'Instrucciones',
            title: (state.opts && state.opts.instructionsTitle) ? state.opts.instructionsTitle : 'Instrucciones'
          }, [
            el('img', { src: '/static/assets/icons/info.svg', alt: '', width: '18', height: '18' })
          ]) : null,
          // Fullscreen toggle button
          el('button', {
            class: 'ppx-ex__iconBtn ppx-ex__fullscreen',
            type: 'button',
            'aria-label': 'Pantalla completa',
            title: 'Pantalla completa'
          }, [
            el('img', { src: '/static/assets/icons/fullscreen.svg', alt: '', width: '18', height: '18' })
          ]),
          el('button', {
            class: 'ppx-ex__iconBtn ppx-ex__close',
            type: 'button',
            'aria-label': 'Cerrar',
            title: 'Cerrar'
          }, [
            el('img', { src: '/static/assets/icons/close.svg', alt: '', width: '18', height: '18' })
          ])
        ])
      ]);
      head.appendChild(topRow);
      // Bind info button to show inline popup
      const infoBtn = qs(head, '.ppx-ex__info');
      if (infoBtn && state.opts && state.opts.instructionsHTML) {
        infoBtn.addEventListener('click', () => {
          const panel = qs(D, '.ppx-modal__panel');
          if (!panel) return;
          // Create overlay
          const overlay = el('div', { class: 'ppx-info-pop' });
          overlay.setAttribute('role','dialog');
          overlay.setAttribute('aria-modal','true');
          overlay.style.position = 'absolute';
          overlay.style.inset = '0';
          overlay.style.background = 'rgba(2,6,23,.35)';
          overlay.style.display = 'grid';
          overlay.style.placeItems = 'center';
          overlay.style.zIndex = '5';
          const card = el('div', { class: 'ppx-card' });
          card.style.maxWidth = '720px';
          card.style.width = 'min(92vw, 720px)';
          card.style.margin = '0 auto';
          card.style.padding = '16px 18px';
          const h = el('h3', { class: 'ppx-h2', text: (state.opts && state.opts.instructionsTitle) ? state.opts.instructionsTitle : 'Instrucciones' });
          h.style.marginTop = '4px';
          const body = el('div', { html: state.opts.instructionsHTML });
          body.style.maxHeight = '60vh';
          body.style.overflow = 'auto';
          const actions = el('div', { class: 'ppx-row' });
          actions.style.justifyContent = 'center';
          actions.style.marginTop = '12px';
          const close = el('button', { class: 'ppx-btn ppx-btn--primary', type: 'button', text: ((state.opts && state.opts.instructionsCloseLabel) ? state.opts.instructionsCloseLabel : 'Cerrar') });
          const restore = () => { try { overlay.remove(); infoBtn.focus({ preventScroll: true }); } catch(_){} };
          close.addEventListener('click', restore);
          actions.appendChild(close);
          card.appendChild(h); card.appendChild(body); card.appendChild(actions);
          // Clicks inside the card should not close the overlay/modal
          card.addEventListener('click', (e) => { e.stopPropagation(); });
          overlay.addEventListener('click', (e) => { if (e.target === overlay) restore(); });
          // Trap focus within popup; Esc to close
          const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); restore(); }
            if (e.key === 'Tab') { e.preventDefault(); try { close.focus(); } catch(_){} }
          };
          overlay.addEventListener('keydown', onKey);
          overlay.appendChild(card);
          panel.appendChild(overlay);
          // Focus close for accessibility
          try { close.focus(); } catch(_){}
        });
      }
      // Meta area (instructions) restored
      const meta = el('div', { class: 'ppx-modal__meta', 'aria-live': 'polite' });
      head.appendChild(meta);
      // Recreate progress area to keep API compatibility
      const progress = el('div', { class: 'ppx-modal__progress' }, [
        el('div', { class: 'ppx-modal__progressBar', 'aria-hidden': 'true' }, [ el('i') ])
      ]);
      head.appendChild(progress);
      const exClose = qs(head, '.ppx-ex__close');
      if (exClose) exClose.addEventListener('click', () => API.close());
      const fsBtn = qs(head, '.ppx-ex__fullscreen');
      if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);
    }

    // Insert content into the body (scrollable area)
    const contentSlot = el('div', { class: 'ppx-ex__content' }, []);
    contentSlot.appendChild(contentNode);

    // Replace modal body with new content slot
    body.innerHTML = '';
    body.appendChild(contentSlot);

    bindLightboxImages(contentSlot);
    body.setAttribute('tabindex', body.getAttribute('tabindex') || '-1');
    body.scrollTop = 0;

    // Build footer bottom row (optional level + actions + brand). Actions live INSIDE this row
    if (foot) {
      foot.innerHTML = '';
      const showLevel = !(state.opts && state.opts.showLevel === false);
      const bottomRow = el('div', { class: 'ppx-ex__row ppx-ex__row--bottom', style: 'display:flex;align-items:center;justify-content:space-between;gap:10px;' }, [
        el('div', { class: 'ppx-ex__left', style: 'display:flex;align-items:center;gap:10px;' }, [
          showLevel ? el('div', { class: 'ppx-ex__level' }, [
            el('span', { class: 'ppx-ex__levelLabel', text: levelLabel + ' ' }),
            levelText ? el('span', { class: 'ppx-pill ppx-pill--level', text: levelText }) : null
          ]) : null,
          el('div', { class: 'ppx-modal__actions ppx-modal__actions--left' })
        ]),
        el('div', { class: 'ppx-ex__right', style: 'display:flex;align-items:center;gap:10px;' }, [
          el('div', { class: 'ppx-modal__actions ppx-modal__actions--right' }),
          el('div', { class: 'ppx-ex__brand' }, [
            el('img', { class: 'ppx-ex__logo', src: logoPath, alt: 'ProfePanda' })
          ])
        ])
      ]);
      foot.appendChild(bottomRow);
    }
  }

  function toggleFullscreen() {
    const modal = qs(D, SEL.modal);
    if (!modal) return;
    const isFs = modal.classList.toggle('ppx-modal--fullscreen');
    // Swap icon and label
    const btn = qs(D, '.ppx-ex__fullscreen');
    if (btn) {
      const img = btn.querySelector('img');
      if (img) img.src = isFs ? '/static/assets/icons/x_fullscreen.svg' : '/static/assets/icons/fullscreen.svg';
      btn.setAttribute('aria-label', isFs ? 'Salir de pantalla completa' : 'Pantalla completa');
      btn.title = isFs ? 'Salir de pantalla completa' : 'Pantalla completa';
    }
  }

  function bindLightboxImages(scope) {
    qsa(scope, '[data-ppx-lightbox="true"] img, .ppx-imgbox[data-ppx-lightbox="true"] img').forEach(img => {
      const host = img.closest('.ppx-imgbox') || img;
      host.style.cursor = 'zoom-in';
      host.addEventListener('click', () => openLightbox(img));
      host.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(img);
        }
      });
      host.setAttribute('tabindex', '0');
      host.setAttribute('role', 'button');
      host.setAttribute('aria-label', 'Open image');
    });
  }

  function openLightbox(img) {
    const lb = qs(D, SEL.lightbox);
    const wrap = qs(D, SEL.lightboxWrap);
    wrap.innerHTML = '';
    const clone = el('img', { src: img.currentSrc || img.src, alt: img.alt || '' });
    wrap.appendChild(clone);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    const lb = qs(D, SEL.lightbox);
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
  }

  function open(opts = {}) {
    ensureDOM();

    state.opts = opts;
    state.lastActive = D.activeElement;

    setTitle(opts.title || '');
    setMeta(opts.meta || '');
    setProgress(opts.progress ?? 0);
    setBody(opts.body || '');
    setActions(opts.actions || {});

    const modal = qs(D, SEL.modal);
    const overlay = qs(D, SEL.overlay);

    modal.classList.add('is-open');
    overlay.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    freezeBackground(true);
    state.open = true;

    // Move focus to first focusable or body
    const first = qsa(modal, 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')[0];
    (first || qs(D, SEL.body)).focus({ preventScroll: true });

    dispatch('ppx:modal:open', { options: opts });

    // Open in fullscreen by default (users can toggle smaller)
    try {
      const prefer = (typeof opts.fullscreenDefault === 'boolean') ? opts.fullscreenDefault : true;
      const modalEl = qs(D, SEL.modal);
      if (prefer && modalEl && !modalEl.classList.contains('ppx-modal--fullscreen')) {
        // Use the same path as the header button so icon/labels stay in sync
        toggleFullscreen();
      }
    } catch(_){}
  }

  function close() {
    if (!state.mounted) return;

    // Allow content to veto close (synchronous boolean or Promise<boolean>)
    try {
      const guard = state.opts && state.opts.onBeforeClose;
      if (typeof guard === 'function') {
        const res = guard();
        if (res && typeof res.then === 'function') {
          res.then((ok) => { if (ok === false) return; doClose(); });
          return; // async path will handle actual close
        }
        if (res === false) return; // veto
      }
    } catch(_) { /* ignore guard errors and proceed to close */ }

    doClose();

    function doClose(){
      const modal = qs(D, SEL.modal);
      const overlay = qs(D, SEL.overlay);

      modal.classList.remove('is-open');
      overlay.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');

      closeLightbox();
      freezeBackground(false);
      state.open = false;

      // Restore focus
      if (state.lastActive && typeof state.lastActive.focus === 'function') {
        state.lastActive.focus({ preventScroll: true });
      }

      dispatch('ppx:modal:close', {});
    }
  }

  function mount() {
    ensureDOM();
    return API;
  }

  const API = {
    mount,
    open,
    close,
    setTitle,
    setMeta,
    setBody,
    setActions,
    setProgress
  };

  // Expose globally once
  if (!W.PPXModal) {
    W.PPXModal = API;
  }

  // Auto-mount on DOM ready, non-blocking
  if (D.readyState === 'loading') {
    D.addEventListener('DOMContentLoaded', () => mount());
  } else {
    mount();
  }
})();
