export function renderTapWord(shell, slide){
  const wrap = document.createElement('div');
  wrap.className = 'lp-tapword';
  const prompt = slide.prompt || 'Toca las palabras correctas';
  const words = (slide.words || '').split(/\s+/).filter(Boolean);
  const targets = new Set(String(slide.targets||'').split(',').map(s=>s.trim()).filter(Boolean));
  const sel = new Set();
  wrap.innerHTML = `
    <div class="lp-prompt">${escapeHtml(prompt)}</div>
    <div class="lp-tapword__list"></div>
    <div class="lp-feedback" hidden role="status" aria-live="polite"></div>
  `;
  const list = wrap.querySelector('.lp-tapword__list');
  words.forEach(w=>{
    const b = document.createElement('button');
    b.className = 'lp-token'; b.textContent = w;
    b.addEventListener('click', ()=>{
      if (sel.has(w)) { sel.delete(w); b.classList.remove('is-selected'); }
      else { sel.add(w); b.classList.add('is-selected'); }
      try { shell.__lp_state.state.answered = sel.size>0; shell.dispatchEvent(new Event('lp:answered')); } catch{}
    });
    list.appendChild(b);
  });
  wrap.__grade = function(){
    const fb = wrap.querySelector('.lp-feedback');
    let ok = sel.size === targets.size; if (ok){ for(const t of targets){ if (!sel.has(t)) { ok=false; break; } } }
    fb.hidden = false;
    fb.textContent = ok ? '¡Correcto!' : 'Revisa tus selecciones';
    return ok;
  };
  return wrap;
}

function escapeHtml(s=''){return s.replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

