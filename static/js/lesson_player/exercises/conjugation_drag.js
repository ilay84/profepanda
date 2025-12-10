export function renderConjugationDrag(shell, slide) {
  const wrap = document.createElement('div');
  wrap.className = 'lp-conj-drag';
  const prompt = slide.prompt || 'Arrastr� la conjugaci�n correcta a cada persona.';
  const rows = Array.isArray(slide.rows) ? slide.rows.map(r => ({ ...r })) : [];
  const bank = Array.isArray(slide.bank) ? shuffle(slide.bank.map(b => ({ ...b }))) : [];
  const placements = {};
  let selected = null;

  wrap.innerHTML = `
    <div class="lp-prompt">${escapeHtml(prompt)}</div>
    <div class="lp-conj-drag__rows"></div>
    <div class="lp-conj-drag__bank" aria-label="Opciones de conjugaci�n"></div>
    <div class="lp-feedback" hidden role="status" aria-live="polite"></div>
  `;

  const rowsHost = wrap.querySelector('.lp-conj-drag__rows');
  const bankHost = wrap.querySelector('.lp-conj-drag__bank');

  rows.forEach((row, i) => {
    const person = row.person || '';
    const ans = row.answer || '';
    const rowEl = document.createElement('div');
    rowEl.className = 'lp-conj-row';
    rowEl.dataset.index = String(i);
    rowEl.innerHTML = `
      <div class="lp-conj-row__person">${escapeHtml(person)}</div>
      <button class="lp-conj-row__slot" type="button" data-slot aria-label="Soltar conjugaci�n para ${escapeHtml(person)}">____</button>
    `;
    const slot = rowEl.querySelector('[data-slot]');

    function assign(id) {
      if (!id) return;
      placements[i] = id;
      refreshUsage();
      slot.innerHTML = renderHtmlLabel(findLabel(id));
      slot.classList.add('is-filled');
      updateAnswered();
    }

    slot.addEventListener('click', () => {
      if (selected) {
        assign(selected);
        selected = null;
        clearBankSelection();
      }
    });
    slot.addEventListener('dragover', (e) => { e.preventDefault(); });
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      const id = e.dataTransfer?.getData('text/plain');
      assign(id);
    });

    rowsHost.appendChild(rowEl);
  });

  bank.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'lp-token lp-conj-token';
    btn.setAttribute('data-id', item.id || '');
    btn.innerHTML = renderHtmlLabel(item.label_html || item.label || item.id || '');
    btn.draggable = true;
    btn.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', item.id || '');
    });
    btn.addEventListener('click', () => {
      selected = item.id || '';
      clearBankSelection();
      btn.classList.add('is-selected');
    });
    bankHost.appendChild(btn);
  });

  function clearBankSelection() {
    bankHost.querySelectorAll('.lp-conj-token').forEach(b => b.classList.remove('is-selected'));
  }

  function refreshUsage() {
    bankHost.querySelectorAll('.lp-conj-token').forEach(btn => btn.classList.remove('is-used'));
    const usedIds = new Set(Object.values(placements));
    usedIds.forEach(id => {
      const el = bankHost.querySelector(`[data-id="${cssEscape(id)}"]`);
      if (el) el.classList.add('is-used');
    });
  }

  function findLabel(id) {
    const found = bank.find(b => b.id === id);
    return found ? (found.label_html || found.label || found.id || '') : id || '';
  }

  function updateAnswered() {
    try {
      const any = Object.keys(placements).length > 0;
      shell.__lp_state.state.answered = any;
      shell.dispatchEvent(new Event('lp:answered'));
    } catch (_) {}
  }

  wrap.__grade = function() {
    const fb = wrap.querySelector('.lp-feedback');
    let ok = true;
    rows.forEach((row, i) => {
      const expected = (row.answer || '').trim();
      const given = (placements[i] || '').trim();
      if (!expected || expected !== given) ok = false;
    });
    fb.hidden = false;
    fb.textContent = ok ? '�Correcto!' : 'Revisa las conjugaciones';
    return ok;
  };

  return wrap;
}

function escapeHtml(s = '') {
  return s.replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function renderHtmlLabel(html = '') {
  return html || '';
}

function cssEscape(s = '') {
  return s.replace(/["\\]/g, '\\$&');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
