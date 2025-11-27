/* static/js/admin_taxonomy_picker.js */
(function () {
  const D = document;

  function ready(fn){ if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }

  // Tiny fetch helper with JSON guard
  async function getJSON(url) {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
    return r.json();
  }

  // Render a single tree row with lazy expand
  function renderNodeRow(node, lang, state, onToggle) {
    const row = D.createElement('div');
    row.className = 'ppx-tx-row';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.padding = '4px 0';

    const expandBtn = D.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'ppx-tx-expand';
    expandBtn.textContent = node.has_children ? (state.expanded.has(node.path) ? '▾' : '▸') : '·';
    expandBtn.style.minWidth = '20px';
    expandBtn.style.cursor = node.has_children ? 'pointer' : 'default';
    expandBtn.disabled = !node.has_children;

    const cb = D.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'ppx-tx-cb';
    cb.checked = state.selected.has(node.path);
    cb.addEventListener('change', () => {
      if (cb.checked) state.selected.add(node.path);
      else state.selected.delete(node.path);
      state.commit();
    });

    const label = D.createElement('span');
    label.textContent = (node.display_title) ||
      (node.title?.[lang] || node.title?.es || node.path);
    label.style.flex = '1';

    const childrenWrap = D.createElement('div');
    childrenWrap.className = 'ppx-tx-children';
    childrenWrap.style.marginLeft = '24px';
    childrenWrap.style.display = state.expanded.has(node.path) ? 'block' : 'none';

    expandBtn.addEventListener('click', async () => {
      if (!node.has_children) return;
      const isOpen = state.expanded.has(node.path);
      if (isOpen) {
        state.expanded.delete(node.path);
        childrenWrap.style.display = 'none';
        expandBtn.textContent = '▸';
        return;
      }
      // expand
      state.expanded.add(node.path);
      expandBtn.textContent = '▾';
      childrenWrap.style.display = 'block';
      // lazy load only once
      if (!state.loaded.has(node.path)) {
        try {
          const data = await getJSON(`/taxonomy/grammar/${encodeURIComponent(node.path)}?lang=${lang}`);
          const frag = D.createDocumentFragment();
          (data.children || []).forEach(child => {
            frag.appendChild(renderNodeRow(child, lang, state, onToggle));
          });
          childrenWrap.appendChild(frag);
          state.loaded.add(node.path);
        } catch (e) {
          console.error('[taxonomy] load children failed', e);
          childrenWrap.appendChild(D.createTextNode('Error loading children.'));
        }
      }
    });

    const rowWrap = D.createElement('div');
    rowWrap.appendChild(row);
    rowWrap.appendChild(childrenWrap);

    row.appendChild(expandBtn);
    row.appendChild(cb);
    row.appendChild(label);

    // Cache human title for chips
    if (node.path) {
      const t = (node.display_title) || (node.title?.[lang] || node.title?.es || node.path);
      if (state && state.titles && !state.titles.has(node.path)) {
        state.titles.set(node.path, String(t));
      }
    }

    return rowWrap;
  }

  function renderChips(state, lang) {
    const chips = D.createElement('div');
    chips.className = 'ppx-tx-chips';
    chips.style.display = 'flex';
    chips.style.flexWrap = 'wrap';
    chips.style.gap = '6px';
    chips.style.marginTop = '8px';

    // Show selected paths as lightweight chips
    let paths = Array.from(state.selected);
    // Remove ancestors when a deeper child is selected (keeps most specific)
    if (paths.length > 1) {
      paths = paths.filter(p => !paths.some(other => other !== p && p.startsWith(other + '/')));
    }
    if (paths.length === 0) {
      const hint = D.createElement('div');
      hint.style.color = '#64748b';
      hint.style.fontSize = '.9rem';
      hint.textContent = lang === 'en' ? 'No topics selected.' : 'Sin temas seleccionados.';
      chips.appendChild(hint);
      return chips;
    }

    paths.sort().forEach(p => {
      const chip = D.createElement('span');
      chip.className = 'ppx-chip';
      chip.style.display = 'inline-flex';
      chip.style.alignItems = 'center';
      chip.style.gap = '6px';
      chip.style.padding = '2px 8px';
      chip.style.borderRadius = '999px';
      chip.style.background = '#eef2ff';
      chip.style.fontSize = '.9rem';
      // initial plain text so it always shows
      const initial = prettyLabel(state, p) || String(p || '');
      chip.appendChild(D.createTextNode(initial));

      const x = D.createElement('button');
      x.type = 'button';
      x.textContent = '×';
      x.style.border = 'none';
      x.style.background = 'transparent';
      x.style.cursor = 'pointer';
      x.style.fontSize = '1rem';
      x.addEventListener('click', () => {
        state.selected.delete(p);
        state.commit();
      });

      chip.appendChild(x);
      chips.appendChild(chip);

      // Hydrate breadcrumb label from server (cached)
      ensureBreadcrumb(state, p, lang).then(lbl => {
        if (!lbl) return;
        // Replace the first text node (label) if present
        if (chip.firstChild && chip.firstChild.nodeType === 3) {
          chip.firstChild.nodeValue = lbl;
        }
      }).catch(() => {});
    });

    return chips;
  }

  function initPicker(rootEl) {
    const lang = (rootEl.getAttribute('data-lang') || 'es').toLowerCase();
    const inputSel = rootEl.getAttribute('data-input') || 'input[type=hidden]';
    const titleText = rootEl.getAttribute('data-title') || (lang === 'en' ? 'Grammar topics' : 'Temas gramaticales');

    // Hidden input (stores JSON array of paths)
    const hiddenInput = rootEl.querySelector(inputSel);
    if (!hiddenInput) {
      console.warn('[taxonomy] hidden input not found for', rootEl);
    }

    // Internal state
    const state = {
      selected: new Set(),
      expanded: new Set(),
      loaded: new Set(),
      titles: new Map(),
      crumbCache: new Map(),
      commit() {
        // write JSON array into hidden input
        if (hiddenInput) {
          hiddenInput.value = JSON.stringify(Array.from(state.selected).sort());
          hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
          hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // re-render chips
        chipsWrap.innerHTML = '';
        chipsWrap.appendChild(renderChips(state, lang));
      }
    };

    // Try to hydrate selected from existing value
    try {
      const existing = hiddenInput?.value ? JSON.parse(hiddenInput.value) : [];
      if (Array.isArray(existing)) existing.forEach(p => state.selected.add(String(p)));
    } catch (e) {
      console.warn('[taxonomy] invalid initial JSON in hidden input');
    }

    // Allow external code to set selection programmatically after init
    rootEl.addEventListener('ppx:taxonomy:set', (ev) => {
      try {
        const paths = (ev && ev.detail && Array.isArray(ev.detail.paths)) ? ev.detail.paths : [];
        state.selected.clear();
        paths.forEach(p => state.selected.add(String(p)));
        state.commit();
      } catch (_) { /* ignore */ }
    });

    // Basic layout
    rootEl.innerHTML = '';
    const head = D.createElement('div');
    head.style.display = 'flex';
    head.style.justifyContent = 'space-between';
    head.style.alignItems = 'center';
    head.style.marginBottom = '6px';

    const h = D.createElement('div');
    h.textContent = titleText;
    h.style.fontWeight = '600';

    const actions = D.createElement('div');
    const clearBtn = D.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = lang === 'en' ? 'Clear' : 'Limpiar';
    clearBtn.className = 'ppx-btn ppx-focusable';
    clearBtn.style.fontSize = '.85rem';
    clearBtn.addEventListener('click', () => { state.selected.clear(); state.commit(); });

    actions.appendChild(clearBtn);
    head.appendChild(h);
    head.appendChild(actions);

    const tree = D.createElement('div');
    tree.className = 'ppx-tx-tree';
    tree.style.border = '1px solid #e2e8f0';
    tree.style.borderRadius = '8px';
    tree.style.padding = '8px 10px';
    tree.style.maxHeight = '280px';
    tree.style.overflow = 'auto';
    tree.setAttribute('role', 'tree');

    const chipsWrap = D.createElement('div');

    rootEl.appendChild(hiddenInput || D.createElement('div')); // preserve existing input position
    rootEl.appendChild(head);
    rootEl.appendChild(tree);
    rootEl.appendChild(chipsWrap);

    // load roots
    (async () => {
      try {
        const data = await getJSON(`/taxonomy/grammar?lang=${lang}`);
        const frag = D.createDocumentFragment();
        (data.roots || []).forEach(n => {
          frag.appendChild(renderNodeRow(n, lang, state));
        });
        tree.appendChild(frag);
      } catch (e) {
        console.error('[taxonomy] failed to load roots', e);
        tree.appendChild(D.createTextNode(lang === 'en' ? 'Error loading taxonomy.' : 'Error al cargar la taxonomía.'));
      } finally {
        state.commit();
      }
    })();
  }

  // Build a quick pretty label using known titles; fallback to slugs
  function prettyLabel(state, path) {
    try {
      const cleaned = String(path || '').replace(/^\/+|\/+$/g, '');
      if (!cleaned) return '';
      const parts = cleaned.split('/').filter(Boolean);
      const titles = [];
      let acc = '';
      for (let i = 0; i < parts.length; i++) {
        acc = i === 0 ? parts[i] : acc + '/' + parts[i];
        const t = state.titles.get(acc) || slugToTitle(parts[i]);
        if (t) titles.push(t);
      }
      const out = titles.join(' > ');
      return out || cleaned;
    } catch (_) {
      return String(path);
    }
  }

  function slugToTitle(slug) {
    return String(slug || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\w|\s\w/g, function(m){ return m.toUpperCase(); });
  }

  // Fetch and cache the real breadcrumb label
  async function ensureBreadcrumb(state, path, lang) {
    if (state.crumbCache.has(path)) return state.crumbCache.get(path);
    try {
      const data = await getJSON(`/taxonomy/grammar/${encodeURIComponent(path)}?lang=${lang}`);
      const bc = Array.isArray(data && data.breadcrumb) ? data.breadcrumb : [];
      const label = bc.map(function(b){ return (b && (b.title || b.path)) || ''; }).join(' / ');
      state.crumbCache.set(path, label);
      // prime titles for ancestors
      (bc || []).forEach(function(b){ if (b && b.path) state.titles.set(b.path, b.title || b.path); });
      return label;
    } catch (e) {
      return null;
    }
  }

  ready(() => {
    D.querySelectorAll('.ppx-taxonomy').forEach(initPicker);
  });
})();
