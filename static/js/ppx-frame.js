/* static/js/ppx-frame.js */
(function () {
  const W = window;
  const D = document;

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

  function getLang() {
    const guess = (W.PPX_I18N && W.PPX_I18N.currentLang) || 'es';
    return guess.toLowerCase().startsWith('en') ? 'en' : 'es';
  }

  function createFrame(opts = {}) {
    const lang = (opts.lang || getLang());
    const labelLevel = lang === 'en' ? 'Level:' : 'Nivel:';
    const logoPath = opts.logoPath || '/static/assets/logo/header_logo.png';
    const typeText = opts.typeLabel || '';     // e.g., "¿Verdadero o falso?"
    const titleText = opts.title || '';

    // Root scaffold
    const root = el('div', { class: 'ppx-ex' });

    // Top row
    const topRow = el('div', { class: 'ppx-ex__row ppx-ex__row--top' }, [
      el('div', { class: 'ppx-ex__titleWrap' }, [
        el('h3', { class: 'ppx-ex__title', text: titleText })
      ]),
      el('span', { class: 'ppx-pill ppx-pill--type', text: typeText })
    ]);

    // Content slot
    const content = el('div', { class: 'ppx-ex__content' });

    // Bottom row
    const bottomRow = el('div', { class: 'ppx-ex__row ppx-ex__row--bottom' }, [
      el('div', { class: 'ppx-ex__level' }, [
        el('span', { class: 'ppx-ex__levelLabel', text: labelLevel + ' ' }),
        el('span', { class: 'ppx-pill ppx-pill--level', text: opts.level || '' })
      ]),
      el('div', { class: 'ppx-ex__brand' }, [
        el('img', { class: 'ppx-ex__logo', src: logoPath, alt: 'ProfePanda' })
      ])
    ]);

    root.appendChild(topRow);
    root.appendChild(content);
    root.appendChild(bottomRow);

    // Width sync: measure the exercise “track” (card/slide) and set CSS var --ppx-ex-track
    // You can pass a selector or a Node. We’ll watch resize and keep it in sync.
    const targetRef = opts.trackTarget || '.ppx-tf__card, .ppx-slide, .ppx-track, .ppx-card';
    let trackEl = null;

    function resolveTarget() {
      if (typeof targetRef === 'string') {
        trackEl = D.querySelector(targetRef);
      } else if (targetRef instanceof Element) {
        trackEl = targetRef;
      } else {
        trackEl = null;
      }
    }

    function applyWidth() {
      if (!root) return;
      const w = trackEl ? Math.round(trackEl.getBoundingClientRect().width) : 700;
      root.style.setProperty('--ppx-ex-track', w + 'px');
    }

    // Initial resolve + measure (after next tick so plugins can render first)
    queueMicrotask(() => {
      resolveTarget();
      applyWidth();
    });

    // Resize observer for live sync
    let ro = null;
    if (W.ResizeObserver) {
      ro = new ResizeObserver(() => applyWidth());
      // Observe both the track element and the root (fallback)
      queueMicrotask(() => {
        resolveTarget();
        if (trackEl) ro.observe(trackEl);
        ro.observe(root);
      });
    } else {
      // Fallback: window resize
      W.addEventListener('resize', applyWidth);
    }

    // API to let plugin update text/labels at runtime
    function setTitle(text) {
      const h = root.querySelector('.ppx-ex__title');
      if (h) h.textContent = text || '';
    }
    function setTypeLabel(text) {
      const p = root.querySelector('.ppx-pill--type');
      if (p) p.textContent = text || '';
    }
    function setLevel(text) {
      const p = root.querySelector('.ppx-pill--level');
      if (p) p.textContent = text || '';
    }
    function setLogo(src) {
      const img = root.querySelector('.ppx-ex__logo');
      if (img && src) img.src = src;
    }

    function cleanup() {
      try { ro && ro.disconnect(); } catch (e) {}
      W.removeEventListener('resize', applyWidth);
    }

    return {
      root,
      slots: { content },
      setTitle,
      setTypeLabel,
      setLevel,
      setLogo,
      updateTrack: () => { resolveTarget(); applyWidth(); },
      cleanup
    };
  }

  // Expose once
  if (!W.PPXFrame) W.PPXFrame = { create: createFrame };
})();
