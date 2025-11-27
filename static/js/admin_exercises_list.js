/* static/js/admin_exercises_list.js */
(function () {
  const D = document;

  function ready(fn){ if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }

  function t(es, en){
    const lang = (window.PPX_I18N && window.PPX_I18N.currentLang) || D.documentElement.getAttribute('lang') || 'es';
    return lang.startsWith('en') ? (en ?? es) : (es ?? en);
  }

  function toast(msg){
    const el = D.createElement('div');
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
    D.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  function $(sel){ return D.querySelector(sel); }

  ready(() => {
    const tbody = $('#ppx-ex-table-body');
    const emptyState = $('#ppx-ex-empty');

    const fltType = $('#flt-type');
    const fltStatus = $('#flt-status');
    const fltLevel = $('#flt-level');
    const fltQ = $('#flt-q');
    const btnApply = $('#flt-apply');
    const btnClear = $('#flt-clear');

    // Adjust UI labels from Tags -> Topics and search placeholder
    try {
      const lang = (window.PPX_I18N && window.PPX_I18N.currentLang) || document.documentElement.getAttribute('lang') || 'es';
      const isEN = lang.startsWith('en');
      const qInput = $('#flt-q');
      if (qInput) qInput.setAttribute('placeholder', isEN ? 'Title, slug or topic.' : 'Ttulo, slug o tema.');
      const thTopics = document.querySelector('table thead tr th:nth-child(4)');
      if (thTopics) thTopics.textContent = isEN ? 'Topics' : 'Temas';
    } catch (_) { /* ignore */ }

    let indexData = {};  // key -> meta
    let filteredKeys = []; // current keys

    async function loadIndex(){
      try {
        tbody.innerHTML = `<tr><td colspan="7" style="padding:14px; color:#6b7280;">${t('Cargando…', 'Loading…')}</td></tr>`;
        emptyState.style.display = 'none';

        const url = new URL(location.origin + '/admin/api/exercises');
        // Let server pre-filter if dropdowns are set (optional)
        if (fltType.value) url.searchParams.set('type', fltType.value);
        if (fltStatus.value) url.searchParams.set('status', fltStatus.value);
        if (fltLevel.value) url.searchParams.set('level', fltLevel.value);

        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const raw = (json && (json.data ?? json)) || {};
        indexData = Array.isArray(raw)
          ? Object.fromEntries(raw.map(r => [ (r.id || `${r.type}/${r.slug}`), r ]))
          : raw;
        applyFilters(); // client-side search on top
      } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="7" style="padding:14px; color:#b91c1c;">${t('Error al cargar la lista.', 'Failed to load list.')}</td></tr>`;
      }
    }

    function applyFilters(){
      const q = (fltQ.value || '').trim().toLowerCase();

      const keys = Object.keys(indexData);
      filteredKeys = keys.filter(k => {
        const meta = indexData[k] || {};
        // Dropdowns already hinted server, but keep client-side check robust:
        if (fltType.value && meta.type !== fltType.value) return false;
        if (fltStatus.value && meta.status !== fltStatus.value) return false;
        if (fltLevel.value && meta.level !== fltLevel.value) return false;

        if (!q) return true;
        const hay = [
          k, // e.g., "tf/ser-estar-essence"
          meta.title_es || '',
          meta.title_en || '',
          (meta.taxonomy_paths || []).join(' ')
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });

      renderTable();
    }

    function renderTable(){
      if (!filteredKeys.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding:14px; color:#6b7280;">${t('No hay resultados.', 'No results.')}</td></tr>`;
        emptyState.style.display = Object.keys(indexData).length ? 'none' : '';
        return;
      }
      emptyState.style.display = 'none';

      const lang = (window.PPX_I18N && window.PPX_I18N.currentLang) || D.documentElement.getAttribute('lang') || 'es';
      const isEN = lang.startsWith('en');

      const rows = filteredKeys.map(key => {
        const meta = indexData[key] || {};
        const title = (isEN ? (meta.title_en || meta.title_es) : (meta.title_es || meta.title_en)) || key;
        const [type, slug] = key.split('/');
        const tags = (meta.taxonomy_paths || [])
          .slice(0, 4)
          .map(p => {
            try { const last = String(p).split('/').filter(Boolean).pop() || String(p); return `<span class="ppx-chip" style="margin-right:4px;">${last}</span>`; }
            catch (_) { return `<span class=\"ppx-chip\" style=\"margin-right:4px;\">-</span>`; }
          })
          .join(' ');

        const typeLabel = ({
          tf: 'True/False',
          mcq: 'MCQ',
          fitb: 'Fill-in',
          dnd: 'Drag & Drop',
          dictation: 'Dictation'
        }[type]) || type;

        const statusChipClass = meta.status === 'published' ? 'ppx-chip--ok'
                               : meta.status === 'archived' ? 'ppx-chip--bad'
                               : '';

        return `
          <tr>
            <td style="padding:10px; border-bottom:1px solid var(--ppx-line);">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <strong>${title}</strong>
              </div>
            </td>
            <td style="padding:10px; border-bottom:1px solid var(--ppx-line);">${typeLabel}</td>
            <td style="padding:10px; border-bottom:1px solid var(--ppx-line);">${meta.level || '-'}</td>
            <td style="padding:10px; border-bottom:1px solid var(--ppx-line);">${tags || '—'}</td>
            <td style="padding:10px; border-bottom:1px solid var(--ppx-line);">${meta.version || '-'}</td>
            <td style="padding:10px; border-bottom:1px solid var(--ppx-line);">
              <select class="ppx-select" data-action="status" data-type="${type}" data-slug="${slug}" style="min-width:140px;"><option value="draft" ${meta.status==='draft'?'selected':''}>${t('Borrador','Draft')}</option><option value="published" ${meta.status==='published'?'selected':''}>${t('Publicado','Published')}</option><option value="archived" ${meta.status==='archived'?'selected':''}>${t('Archivado','Archived')}</option></select>
            </td>
            <td style="padding:10px; border-bottom:1px solid var(--ppx-line); text-align:right;">
              <div class="ppx-row" style="gap:6px; justify-content:flex-end; flex-wrap:wrap;">
                <a class="ppx-btn" href="/admin/exercises/${encodeURIComponent(type)}/${encodeURIComponent(slug)}/edit" title="${t('Editar', 'Edit')}" aria-label="${t('Editar', 'Edit')}" style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:10px;">
                  <img src="/static/assets/icons/edit.svg" alt="" width="20" height="20">
                </a>
                <button class="ppx-btn" data-action="preview" data-type="${type}" data-slug="${slug}" title="${t('Vista previa', 'Preview')}" aria-label="${t('Vista previa', 'Preview')}" style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:10px;">
                  <img src="/static/assets/icons/preview.svg" alt="" width="20" height="20">
                </button>
                <button class="ppx-btn ppx-btn--ghost" data-action="delete" data-type="${type}" data-slug="${slug}" title="${t('Eliminar ejercicio', 'Delete exercise')}" aria-label="${t('Eliminar', 'Delete')}" style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:10px;">
                  <img src="/static/assets/icons/delete.svg" alt="" width="20" height="20">
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      tbody.innerHTML = rows;
    }

    // Actions (preview / download)
    D.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const exType = btn.getAttribute('data-type');
      const slug = btn.getAttribute('data-slug');
      if (!exType || !slug) return;

      if (action === 'preview') {
        try {
          const lang = (window.PPX_I18N && window.PPX_I18N.currentLang) || D.documentElement.getAttribute('lang') || 'es';
          // Ask for the latest saved content (draft/current) so preview matches builder
          window.PPX.openExercise({ type: exType, slug, version: 'current', lang, context: { source: 'admin-list' } });
        } catch (err) {
          console.error(err);
          toast(t('No se pudo abrir la vista previa.', 'Failed to open preview.'));
        }
      }

      if (action === 'download') {
        try {
          const res = await fetch(`/admin/api/exercises/${encodeURIComponent(exType)}/${encodeURIComponent(slug)}`, { credentials: 'same-origin' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
          const a = D.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${exType}-${slug}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
        } catch (err) {
          console.error(err);
          toast(t('No se pudo descargar el JSON.', 'Could not download JSON.'));
        }
      }

      if (action === 'delete') {
        const confirmMsg = t(
          '¿Seguro que querés eliminar este ejercicio? Esto lo archivará (podés restaurarlo más tarde).',
          'Are you sure you want to delete this exercise? This will archive it (you can restore it later).'
        );
        if (!window.confirm(confirmMsg)) return;

        try {
          const res = await fetch(`/admin/api/exercises/${encodeURIComponent(exType)}/${encodeURIComponent(slug)}`, {
            method: 'DELETE',
            credentials: 'same-origin'
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          toast(t('Ejercicio eliminado.', 'Exercise deleted.'));
          await loadIndex();
        } catch (err) {
          console.error(err);
          toast(t('No se pudo eliminar el ejercicio.', 'Failed to delete exercise.'));
        }
      }
    });

    // Status change (quick update)
    D.addEventListener('change', async (e) => {
      const sel = e.target.closest('select[data-action="status"]');
      if (!sel) return;
      const exType = sel.getAttribute('data-type');
      const slug = sel.getAttribute('data-slug');
      const status = sel.value;
      const key = `${exType}/${slug}`;
      const prev = (indexData[key] && indexData[key].status) || 'draft';
      try {
        const res = await fetch(`/admin/api/exercises/${encodeURIComponent(exType)}/${encodeURIComponent(slug)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json().catch(()=>({}));
        if (!indexData[key]) indexData[key] = {};
        indexData[key].status = (j && j.data && j.data.status) || status;
        if (j && j.data && j.data.version) indexData[key].version = j.data.version;
        toast(t('Estado actualizado.','Status updated.'));
      } catch (err) {
        console.error(err);
        sel.value = prev;
        toast(t('No se pudo actualizar el estado.','Failed to update status.'));
      }
    });

    // Filter events
    btnApply.addEventListener('click', () => applyFilters());
    btnClear.addEventListener('click', () => {
      fltType.value = '';
      fltStatus.value = '';
      fltLevel.value = '';
      fltQ.value = '';
      loadIndex();
    });

    // Initial load
    loadIndex();
  });
})();
