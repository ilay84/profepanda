export function renderFlashcard(shell, slide){
  const wrap = document.createElement('div');
  wrap.className = 'lp-flashcard';
  const front = slide.front_html || 'Frente';
  const back = slide.back_html || 'Reverso';
  wrap.innerHTML = `
    <div class="lp-flip" tabindex="0">
      <div class="lp-flip__card">
        <div class="lp-flip__face lp-flip__front">${front}</div>
        <div class="lp-flip__face lp-flip__back">${back}</div>
      </div>
    </div>
    <div class="lp-feedback" hidden role="status" aria-live="polite"></div>
  `;
  let flipped = false;
  const flipper = wrap.querySelector('.lp-flip');
  flipper.addEventListener('click', ()=>{ flipped = !flipped; flipper.classList.toggle('is-flipped', flipped); try { shell.__lp_state.state.answered = true; shell.dispatchEvent(new Event('lp:answered')); } catch{} });
  flipper.addEventListener('keydown', (e)=>{ if (e.key==='Enter' || e.key===' '){ e.preventDefault(); flipper.click(); }});
  wrap.__grade = function(){ const fb = wrap.querySelector('.lp-feedback'); fb.hidden=false; fb.textContent='Tarjeta revisada'; return true; };
  return wrap;
}

