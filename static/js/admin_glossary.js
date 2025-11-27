(function(){
  const $list = document.getElementById('rg-country-list');
  const $title = document.getElementById('rg-country-title');
  const $entries = document.getElementById('rg-entries');
  const $add = document.getElementById('rg-add');
  const $search = document.getElementById('rg-search');
  const $searchClear = document.getElementById('rg-search-clear');
  const $count = document.getElementById('rg-entry-count');
  let active = null;
  let countries = [];
  let allEntries = [];


  async function loadConfig(){
    try{
      const r = await fetch('/admin/api/glossary/config', {credentials:'same-origin', headers:{'Accept':'application/json'}});
      if (!r.ok){ throw new Error('HTTP '+r.status); }
      const ct = r.headers.get('content-type') || '';
      let data = {};
      if (ct.includes('application/json')){
        data = await r.json();
      } else {
        const txt = await r.text();
        throw new Error('Unexpected response (not JSON). Snippet: '+ txt.slice(0,120));
      }
      countries = data.countries || [];
      renderCountries(countries);
      if (!active && countries.length){ selectCountry(countries[0].code); }
    }catch(err){
      console.error('config load failed', err);
      $list.innerHTML = '<div style="opacity:.7; color:#b91c1c; font-weight:600;">Error cargando países. Refresca sesión.</div>';
    }
  }

  function renderCountries(rows){
    $list.innerHTML = rows.map(row => {
      const flag = row.flag_url ? `/static/${row.flag_url}` : '';
      const checked = row.enabled ? 'checked' : '';
      return `
        <div data-code="${row.code}" class="rg-row" style="display:flex; align-items:center; justify-content:space-between; gap:.5rem; padding:.35rem .5rem; border-radius:8px; cursor:pointer;">
          <div style="display:flex; align-items:center; gap:.5rem;">
            <img src="${flag}" alt="${row.code}" style="width:20px; height:14px; object-fit:cover; border:1px solid #e5e7eb;"/>
            <span>${row.name_es} <small style="opacity:.6">(${row.code})</small></span>
          </div>
          <label style="display:inline-flex; align-items:center; gap:.35rem; cursor:pointer;">
            <input type="checkbox" data-toggle="${row.code}" ${checked} />
          </label>
        </div>`;
    }).join('');
    // Click to select country
    $list.querySelectorAll('.rg-row').forEach(el => {
      el.addEventListener('click', (ev) => {
        if (ev.target && ev.target.matches('input[type=checkbox]')) return;
        selectCountry(el.getAttribute('data-code'));
      });
    });
    // Toggle
    $list.querySelectorAll('input[type=checkbox][data-toggle]').forEach(inp => {
      inp.addEventListener('change', () => saveToggle(inp.getAttribute('data-toggle'), inp.checked));
    });
  }

  async function saveToggle(code, on){
    try{
      const enabled = countries.filter(c => (c.code===code?on:c.enabled)).map(c => c.code);
      const r = await fetch('/admin/api/glossary/config', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify({enabled_countries: enabled})});
      const data = await r.json();
      if (!data.ok) throw new Error('save failed');
      countries = countries.map(c => c.code===code ? {...c, enabled:on} : c);
    }catch(e){
      alert('Failed to save');
    }
  }

  async function selectCountry(code){
    active = code;
    const row = (countries||[]).find(c => c.code===code);
    $title.textContent = row ? `${row.name_es} (${row.code})` : code;
    $add.href = `/admin/glossary/new?country=${encodeURIComponent(code)}`;
    await loadEntries(code);
  }

  async function loadEntries(code){
    $entries.innerHTML = '<div style="opacity:.7;">Cargando.</div>';
    try{
      const r = await fetch(`/admin/api/glossary/list?country=${encodeURIComponent(code)}`, {credentials:'same-origin'});
      if (!r.ok){ throw new Error('HTTP '+r.status); }
      const ct = r.headers.get('content-type') || '';
      let data = {};
      if (ct.includes('application/json')){
        data = await r.json();
      } else {
        const txt = await r.text();
        throw new Error('Unexpected response (not JSON). Snippet: '+ txt.slice(0,120));
      }
      allEntries = data.items||[];
      renderEntries();
    }catch(err){
      console.error('list load failed', err);
      $entries.innerHTML = '<div style="opacity:.7; color:#b91c1c; font-weight:600;">Error cargando entradas. Refresca sesión.</div>';
    }
  }

  function renderEntries(){
    const q = ($search?.value || '').trim().toLowerCase();
    const filtered = allEntries.filter(it => {
      if (!q) return true;
      return (it.word || '').toLowerCase().includes(q) || (it.slug || '').toLowerCase().includes(q);
    });
    if ($count) $count.textContent = filtered.length ? `${filtered.length} items` : '';
      if (!filtered.length){
        $entries.innerHTML = '<div style="opacity:.7;">No hay entradas aún</div>';
        return;
      }
      $entries.innerHTML = '<ul style="padding:0; margin:0;"></ul>';
      const ul = $entries.querySelector('ul');
      for (const it of filtered){
        const snippets = ((it.definition_es || it.definition_en) || '').replace(/\s+/g,' ').trim();
        const preview = snippets.length > 120 ? snippets.slice(0,120).trim() + '…' : snippets;
        const badges = [];
        if (it.examples_count){
          badges.push(`<span class="rg-entry-badge">${it.examples_count} ej.</span>`);
        }
        if (it.has_audio){
          badges.push(`<span class="rg-entry-badge rg-entry-badge--audio">Audio</span>`);
        }
        const countriesLabel = (it.countries || []).join(', ');
        const li = document.createElement('li');
        li.className = 'rg-entry-card';
        li.innerHTML = `
          <div class="rg-entry-row">
            <div class="rg-entry-word">${it.word}</div>
            <div class="rg-entry-badges">${badges.join('')}</div>
          </div>
          ${preview ? `<p class="rg-entry-card__preview">${preview}</p>` : ''}
          <div class="rg-entry-meta">
            <span class="rg-entry-card__slug">${it.slug}</span>
            ${countriesLabel ? `<span>${countriesLabel}</span>` : ''}
          </div>`;
        const actions = document.createElement('div');
        actions.className = 'rg-entry-actions';
        const editUrl = `/admin/glossary/edit/${encodeURIComponent(it.slug)}`;
        actions.innerHTML = `
          <a href="${editUrl}" title="Editar">
            <img src="/static/assets/icons/edit.svg" alt="Edit">
          </a>
          <button type="button" data-slug="${it.slug}" title="Eliminar">
            <img src="/static/assets/icons/delete.svg" alt="Delete">
          </button>`;
        li.appendChild(actions);
        const del = actions.querySelector('button[data-slug]');
        if (del){
          del.addEventListener('click', async ()=>{
            const ok = confirm('¿Eliminar esta entrada? This cannot be undone.');
            if (!ok) return;
            try{
              const r = await fetch(`/admin/glossary/delete/${encodeURIComponent(it.slug)}`, {method:'POST', credentials:'same-origin'});
              let data = {};
              try { data = await r.json(); } catch(_) {}
              if (!r.ok || !data.ok){ alert('Delete failed'); return; }
              await loadEntries(active);
            }catch(e){ alert('Delete error'); }
          });
        }
        ul.appendChild(li);
      }
    }

  if ($search){
    $search.addEventListener('input', ()=> renderEntries());
  }
  if ($searchClear){
    $searchClear.addEventListener('click', ()=>{
      if ($search){ $search.value=''; renderEntries(); $search.focus(); }
    });
  }

  loadConfig();

})();
