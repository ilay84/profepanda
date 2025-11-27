import { resolveMedia } from './media.js';
import { mountAudioPlayers } from './audio_player.js';
import { renderDictation } from './exercises/dictation.js';
import { renderTf } from './exercises/tf.js';
import { renderTapWord } from './exercises/tapword.js';
import { renderDragBlank } from './exercises/dragblank.js';
import { renderFlashcard } from './exercises/flashcard.js';

export function renderLesson(shell, lesson) {
  const vp = shell.querySelector('.lp-viewport');
  const progressBar = shell.querySelector('.lp-progress__bar');
  const state = { index: 0, answered: false };
  shell.__lp_state = { state, lesson };

  function updateProgress() {
    const total = Math.max(lesson.slides.length || 1, 1);
    const cur = Math.min(state.index + 1, total);
    const pct = Math.round((cur / total) * 100);
    progressBar.style.width = `${pct}%`;
    const titleEl = shell.querySelector('[data-lp-title]');
    const countEl = shell.querySelector('[data-lp-count]');
    const labelEl = shell.querySelector('[data-lp-progress-label]');
    if (titleEl && lesson.title) titleEl.textContent = lesson.title;
    if (countEl) countEl.textContent = `${cur} de ${total}`; // keep for context row
    if (labelEl) labelEl.textContent = `${cur}/${total}`;    // label above progress bar
  }

  function renderSlide() {
    const slide = lesson.slides[state.index];
    const card = document.createElement('div');
    card.className = 'lp-card';
    card.setAttribute('data-slide-id', slide.id);
    if (slide.type === 'content') {
      card.innerHTML = slide.elements.map(renderElement).join('');
    } else if (slide.type === 'exercise' && slide.mode === 'mcq') {
      const mkLetter = (i) => String.fromCharCode('A'.charCodeAt(0) + i);
      const promptText = slide.prompt || slide.prompt_text || '';
      const stemRaw = slide.stem_html || slide.question_stem || slide.stem || '';
      const promptHtml = promptText ? `<div class="lp-prompt">${escapeHtml(promptText)}</div>` : '';
      const stemHtml = stemRaw ? `<div class="lp-stem">${stemRaw}</div>` : '';
      const choices = Array.isArray(slide.choices) ? slide.choices : [];
      const choicesHtml = choices.map((c, i) => `
        <button class="lp-choice" data-id="${c.id}" aria-pressed="false">
          <span class="lp-choice__label">${mkLetter(i)}</span>
          <span class="lp-choice__text">${escapeHtml(c.text)}</span>
        </button>
      `).join('');
      card.innerHTML = `
        <div class="lp-mcq">
          ${promptHtml}
          ${stemHtml}
          <div class="lp-choices">${choicesHtml || '<div class="lp-muted">(sin opciones)</div>'}</div>
          <div class="lp-feedback" hidden role="status" aria-live="polite"></div>
        </div>`;
      card.querySelectorAll('.lp-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          card.querySelectorAll('.lp-choice').forEach(b => { b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-selected'); });
          btn.setAttribute('aria-pressed', 'true');
          btn.classList.add('is-selected');
          shell.__lp_state.state.answered = true;
          shell.__lp_state.state.dirty = true;
          shell.dispatchEvent(new CustomEvent('lp:answered'));
        });
      });
    } else if (slide.type === 'exercise' && slide.mode === 'dictation') {
      const block = renderDictation(shell, slide);
      card.appendChild(block);
    } else if (slide.type === 'exercise' && slide.mode === 'tf') {
      card.appendChild(renderTf(shell, slide));
    } else if (slide.type === 'exercise' && slide.mode === 'tapword') {
      card.appendChild(renderTapWord(shell, slide));
    } else if (slide.type === 'exercise' && slide.mode === 'dragblank') {
      card.appendChild(renderDragBlank(shell, slide));
    } else if (slide.type === 'exercise' && slide.mode === 'flashcard') {
      card.appendChild(renderFlashcard(shell, slide));
    } else {
      card.textContent = 'Tipo de diapositiva no implementado aún.';
    }
    vp.innerHTML = '';
    vp.appendChild(card);
    // Enhance any audio players with custom speed control
    try { mountAudioPlayers(card); } catch (e) { console.warn('audio mount failed', e); }
    updateProgress();
    updateNav(shell);
  }

  shell.addEventListener('lp:render', renderSlide);
  shell.dispatchEvent(new Event('lp:render'));
}

export function updateNav(shell) {
  const { state, lesson } = shell.__lp_state;
  const prev = shell.querySelector('.lp-prev');
  const next = shell.querySelector('.lp-next');
  const check = shell.querySelector('.lp-check');
  const slide = lesson.slides[state.index];
  prev.disabled = state.index === 0;
  if (slide.type === 'exercise') {
    next.disabled = true; // gated until checked
    check.disabled = !state.answered;
  } else {
    check.disabled = true;
    next.disabled = state.index >= lesson.slides.length - 1;
  }
}

function renderElement(el) {
  if (el.type === 'text') return `<div class="lp-text">${el.html}</div>`;
  if (el.type === 'audio') {
    const src = resolveMedia(el.src);
    return `<figure class="lp-audio"><audio controls src="${src}"></audio>${el.caption ? `<figcaption>${escapeHtml(el.caption)}</figcaption>` : ''}</figure>`;
  }
  return `<div>Elemento no implementado.</div>`;
}

function escapeHtml(s = '') {
  return s.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
