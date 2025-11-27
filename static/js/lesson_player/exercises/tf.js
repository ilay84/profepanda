export function renderTf(shell, slide){
  const wrap = document.createElement('div');
  wrap.className = 'lp-tf';
  const prompt = slide.prompt || 'Verdadero o falso:';
  const stmt = slide.statement || '';
  wrap.innerHTML = `
    <div class="lp-prompt">${escapeHtml(prompt)}</div>
    <div class="lp-stem">${escapeHtml(stmt)}</div>
    <div class="lp-tf__actions">
      <button class="lp-choice" data-val="true">Verdadero</button>
      <button class="lp-choice" data-val="false">Falso</button>
    </div>
    <div class="lp-feedback" hidden role="status" aria-live="polite"></div>
  `;
  let picked = null;
  wrap.querySelectorAll('.lp-choice').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      wrap.querySelectorAll('.lp-choice').forEach(b=>b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      picked = btn.dataset.val === 'true';
      try { shell.__lp_state.state.answered = true; shell.dispatchEvent(new Event('lp:answered')); } catch{}
    });
  });
  wrap.__grade = function(){
    const fb = wrap.querySelector('.lp-feedback');
    const ok = String(picked) === String(!!slide.answer);
    fb.hidden = false;
    fb.textContent = ok ? '¡Correcto!' : 'Incorrecto';
    return ok;
  };
  return wrap;
}

function escapeHtml(s=''){return s.replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

