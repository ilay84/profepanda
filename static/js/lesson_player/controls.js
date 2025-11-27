import { updateNav } from './renderer.js';

export function setupControls(shell, lesson) {
  const prev = shell.querySelector('.lp-prev');
  const next = shell.querySelector('.lp-next');
  const check = shell.querySelector('.lp-check');
  const exitBtn = shell.querySelector('.lp-exit');

  const { state } = shell.__lp_state;

  prev.addEventListener('click', () => {
    if (state.index > 0) {
      state.index -= 1; state.answered = false;
      state.dirty = false;
      shell.dispatchEvent(new Event('lp:render'));
    }
  });

  next.addEventListener('click', () => {
    if (state.index < lesson.slides.length - 1) {
      state.index += 1; state.answered = false;
      state.dirty = false;
      shell.dispatchEvent(new Event('lp:render'));
    }
  });

  check.addEventListener('click', () => {
    const slide = lesson.slides[state.index];
    if (slide.type === 'exercise' && slide.mode === 'mcq') {
      const card = shell.querySelector('.lp-card');
      const selected = card.querySelector('.lp-choice[aria-pressed="true"]');
      const fb = card.querySelector('.lp-feedback');
      if (!selected) return;
      const correct = selected.dataset.id === String(slide.answer);
      // Visual states
      card.querySelectorAll('.lp-choice').forEach(btn => btn.classList.remove('is-correct','is-wrong'));
      if (correct) {
        selected.classList.add('is-correct');
      } else {
        selected.classList.add('is-wrong');
        // highlight the correct choice
        const right = card.querySelector(`.lp-choice[data-id="${CSS.escape(String(slide.answer))}"]`);
        if (right) right.classList.add('is-correct');
      }
      fb.hidden = false;
      fb.textContent = correct ? '¡Correcto!' : 'Incorrecto, intenta de nuevo';
      fb.classList.remove('bad','ok');
      fb.classList.add(correct ? 'ok' : 'bad');
      // Allow advance only if answered (encourage retry to 100%)
      state.answered = true;
      next.disabled = false;
      updateNav(shell);
    }
    if (slide.type === 'exercise' && slide.mode === 'dictation') {
      const card = shell.querySelector('.lp-card');
      const block = card.querySelector('.lp-dictation') || card.firstElementChild;
      // Our dictation block defines __grade
      const graderHost = card.querySelector('.lp-dictation') || card;
      const ok = graderHost.__grade ? graderHost.__grade() : false;
      state.answered = true;
      next.disabled = false;
      updateNav(shell);
    }
    if (slide.type === 'exercise' && (slide.mode === 'tf' || slide.mode === 'tapword' || slide.mode === 'dragblank' || slide.mode === 'flashcard')) {
      const card = shell.querySelector('.lp-card');
      const host = card.firstElementChild;
      const ok = host && host.__grade ? host.__grade() : true;
      state.answered = true;
      next.disabled = false;
      updateNav(shell);
    }
  });

  exitBtn?.addEventListener('click', () => {
    // Confirm only if user has interacted and not finished the lesson
    const shouldConfirm = !!state.dirty && !state.completed;
    if (!shouldConfirm || confirm('¿Salir de la lección? Los cambios sin guardar podrían perderse.')) {
      history.back();
    }
  });

  shell.addEventListener('lp:answered', () => updateNav(shell));

  // Keyboard shortcuts (skip when typing in inputs/textareas)
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.isComposing;
    if (isTyping) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (!prev.disabled) prev.click();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (!next.disabled) next.click();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!check.disabled) check.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      exitBtn?.click();
    }
  });

  // Allow external hosts (e.g., admin builder) to drive navigation
  // Message shape: { type: 'lp.goto', index: <number> }
  window.addEventListener('message', (e) => {
    try {
      const msg = e?.data || {};
      if (msg && msg.type === 'lp.goto') {
        const idx = Number(msg.index);
        if (Number.isInteger(idx)) {
          const clamped = Math.max(0, Math.min(lesson.slides.length - 1, idx));
          state.index = clamped;
          state.answered = false;
          state.dirty = false;
          shell.dispatchEvent(new Event('lp:render'));
        }
      }
    } catch (_) { /* ignore */ }
  });
}
