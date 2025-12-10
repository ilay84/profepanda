import { resolveMedia } from './media.js';
import { mountAudioPlayers } from './audio_player.js';
import { renderDictation } from './exercises/dictation.js';
import { renderTf } from './exercises/tf.js';
import { renderTapWord } from './exercises/tapword.js';
import { renderDragBlank } from './exercises/dragblank.js';
import { renderFlashcard } from './exercises/flashcard.js';
import { renderConjugationDrag } from './exercises/conjugation_drag.js';

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
      card.innerHTML = slide.elements.map((el, i) => renderElement(el, i)).join('');
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
  } else if (slide.type === 'exercise' && slide.mode === 'conjugation_drag') {
    card.appendChild(renderConjugationDrag(shell, slide));
  } else {
      card.textContent = 'Tipo de diapositiva no implementado aún.';
    }
    vp.innerHTML = '';
    vp.appendChild(card);
    // Enhance any audio players with custom speed control
    try { mountAudioPlayers(card); } catch (e) { console.warn('audio mount failed', e); }
    try { bindAudioExamples(card); } catch (e) { console.warn('audio example bind failed', e); }
    try { bindContentInlineEditors(shell, card); } catch (e) { console.warn('inline edit bind failed', e); }
    try { bindDialogAudio(card); } catch (e) { console.warn('dialog audio bind failed', e); }
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

function renderElement(el, idx) {
  if (el.type === 'text') return `<div class="lp-text" data-lp-el-idx="${idx}" data-lp-el-field="html">${el.html || ''}</div>`;
  if (el.type === 'explainer') {
    const title = `<div class="lp-explainer__title" data-lp-el-idx="${idx}" data-lp-el-field="title">${escapeHtml(el.title || '')}</div>`;
    const body = `<div class="lp-explainer__body" data-lp-el-idx="${idx}" data-lp-el-field="html">${el.html || ''}</div>`;
    return `<section class="lp-explainer">${title}${body}</section>`;
  }
  if (el.type === 'audio') {
    const src = resolveMedia(el.src);
    const caption = el.caption ? `<figcaption>${escapeHtml(el.caption)}</figcaption>` : '';
    return `
      <figure class="lp-audio" data-lp-audio-shell>
        <button class="lp-audio__play" type="button" data-lp-audio-play aria-label="Reproducir audio">
          <img data-lp-audio-icon src="/static/assets/lesson-icons/audio.svg" alt="" width="24" height="24">
        </button>
        <div class="lp-audio__track" data-lp-audio-track>
          <div class="lp-audio__wave"></div>
          <div class="lp-audio__wave is-progress" data-lp-audio-progress style="--lp-progress:0%"></div>
        </div>
        <div class="lp-audio__meta">
          <span class="lp-audio__time" data-lp-audio-time>0:00</span>
          <div class="lp-speed">
            <button type="button" class="lp-speed__trigger" data-lp-speed-trigger aria-haspopup="dialog" aria-expanded="false" aria-label="Velocidad 1x">
              <img data-lp-speed-icon src="/static/assets/lesson-icons/speed-1x.svg" alt="Velocidad 1x" width="36" height="36">
            </button>
            <div class="lp-speed__drawer" role="dialog" aria-label="Control de velocidad" hidden>
              <div class="lp-speed__row">
                <span class="lp-speed__value" data-lp-speed-label>1x</span>
                <button class="lp-speed__close" type="button" data-lp-speed-close aria-label="Cerrar">×</button>
              </div>
              <input class="lp-speed__range" data-lp-speed-range type="range" min="0.3" max="1.5" step="0.01" value="1.0">
              <div class="lp-speed__marks" data-lp-speed-marks>
                <span data-lp-speed-mark data-speed="0.3">0.3x</span>
                <span data-lp-speed-mark data-speed="0.8">0.8x</span>
                <span data-lp-speed-mark data-speed="1.0">1x</span>
                <span data-lp-speed-mark data-speed="1.5">1.5x</span>
              </div>
            </div>
          </div>
        </div>
        <audio preload="none" src="${src}" data-lp-audio></audio>
        ${caption}
      </figure>`;
  }
  if (el.type === 'audio_example') {
    const src = resolveMedia(el.src);
    const label = el.html || el.caption || 'Ejemplo con audio';
    const hint = el.hint_html || '';
    const hintId = `hint-${Math.random().toString(36).slice(2,8)}`;
    return `
      <section class="lp-audio-example">
        <div class="lp-audio-example__media">
          <button class="lp-audio-example__icon" type="button" data-lp-audio-play aria-label="Reproducir audio">
            <img src="/static/assets/lesson-icons/audio.svg" alt="" aria-hidden="true" width="26" height="26">
          </button>
          <audio preload="none" src="${src}" data-lp-audio></audio>
        </div>
        <div class="lp-audio-example__text">${label}</div>
        ${hint ? `
        <button class="lp-audio-example__icon lp-audio-example__hint" type="button" aria-expanded="false" aria-controls="${hintId}" data-lp-hint-btn aria-label="Mostrar pista">
          <img src="/static/assets/lesson-icons/lightbulb.svg" alt="" aria-hidden="true" width="22" height="22">
        </button>
        <div id="${hintId}" class="lp-audio-example__hint-body" data-lp-hint-body hidden>${hint}</div>
        ` : ''}
      </section>`;
  }
  if (el.type === 'dialog') {
    const turns = Array.isArray(el.turns) ? el.turns : [];
    const rows = turns.map(t => {
      const idx = turns.indexOf(t);
      const alignClass = idx % 2 === 1 ? 'is-right' : 'is-left';
      const speaker = t.speaker ? `<div class="lp-dialog__speaker">${escapeHtml(t.speaker)}</div>` : '';
      const text = t.html ? t.html : escapeHtml(t.text || '');
      const audio = t.audio ? `<button class="lp-dialog__play" type="button" data-lp-dialog-play data-src="${resolveMedia(t.audio)}"><img src="/static/assets/lesson-icons/audio.svg" alt="" width="20" height="20"></button>` : '';
      return `<div class="lp-dialog__turn ${alignClass}">${speaker}<div class="lp-dialog__bubble">${audio}<div class="lp-dialog__text">${text}</div></div></div>`;
    }).join('');
    return `<section class="lp-dialog">${rows || '<div class="lp-muted">Sin turnos</div>'}</section>`;
  }
  if (el.type === 'image') {
    const src = resolveMedia(el.src);
    const alt = escapeHtml(el.alt || '');
    return `<figure class="lp-image"><img src="${src}" alt="${alt}">${el.caption ? `<figcaption>${escapeHtml(el.caption)}</figcaption>` : ''}</figure>`;
  }
  if (el.type === 'video') {
    const src = resolveMedia(el.src);
    return `<figure class="lp-video"><video controls src="${src}"></video>${el.caption ? `<figcaption>${escapeHtml(el.caption)}</figcaption>` : ''}</figure>`;
  }
  if (el.type === 'conjugation_table') {
    const title = el.title ? `<div class="lp-conj__title">${escapeHtml(el.title)}</div>` : '';
    const rows = Array.isArray(el.rows) ? el.rows : [];
    const body = rows.map(r => `
      <div class="lp-conj__row">
        <div class="lp-conj__person">${escapeHtml(r.person || '')}</div>
        <div class="lp-conj__value" data-lp-el-idx="${idx}" data-lp-el-field="rows" data-lp-conj-row="${rows.indexOf(r)}">${r.value_html || ''}</div>
      </div>
    `).join('');
    return `<section class="lp-conj">${title}${body}</section>`;
  }
  return `<div>Elemento no implementado.</div>`;
}

function escapeHtml(s = '') {
  return s.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function bindAudioExamples(root) {
  const rows = root.querySelectorAll('.lp-audio-example');
  rows.forEach(row => {
    const playBtn = row.querySelector('[data-lp-audio-play]');
    const audio = row.querySelector('[data-lp-audio]');
    if (playBtn && audio) {
      playBtn.addEventListener('click', () => {
        try { audio.currentTime = 0; audio.play(); } catch (_) {}
      });
    }
    const hintBtn = row.querySelector('[data-lp-hint-btn]');
    const hintBody = row.querySelector('[data-lp-hint-body]');
    if (hintBtn && hintBody) {
      hintBtn.addEventListener('click', () => {
        const isHidden = hintBody.hasAttribute('hidden');
        if (isHidden) {
          hintBody.removeAttribute('hidden');
          hintBtn.setAttribute('aria-expanded', 'true');
        } else {
          hintBody.setAttribute('hidden', '');
          hintBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }
  });
}

function bindDialogAudio(root) {
  const buttons = root.querySelectorAll('[data-lp-dialog-play]');
  buttons.forEach(btn => {
    const src = btn.getAttribute('data-src');
    if (!src) return;
    let audio;
    btn.addEventListener('click', () => {
      try {
        if (!audio) {
          audio = new Audio(src);
        } else {
          audio.currentTime = 0;
        }
        audio.play();
      } catch (_) {}
    });
  });
}

function bindContentInlineEditors(shell, card) {
  const slideIndex = shell.__lp_state?.state?.index ?? 0;
  const editable = card.querySelectorAll('[data-lp-el-idx]');
  editable.forEach(el => {
    el.contentEditable = 'true';
    el.setAttribute('data-ppx-edit', '1');
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
    });
    el.addEventListener('blur', () => {
      const idx = Number(el.getAttribute('data-lp-el-idx'));
      const field = el.getAttribute('data-lp-el-field') || 'html';
      if (field === 'rows') {
        const rowIndex = Number(el.getAttribute('data-lp-conj-row'));
        const value = el.innerHTML || '';
        window.parent?.postMessage({ type: 'lp.updateConjugationRow', index: slideIndex, elIndex: idx, rowIndex, value }, '*');
      } else {
        const value = field === 'title' ? (el.textContent || '') : (el.innerHTML || '');
        window.parent?.postMessage({ type: 'lp.updateElement', index: slideIndex, elIndex: idx, field, value }, '*');
      }
    });
  });
  enableStyleToolbar(card);
}

// Floating style toolbar for inline edits (bold / italic / underline / brand color / clear)
function enableStyleToolbar(card) {
  const doc = card?.ownerDocument;
  if (!doc || doc.__lp_style_toolbar) return;
  doc.__lp_style_toolbar = true;
  const bar = doc.createElement('div');
  bar.className = 'lp-stylebar';
  bar.innerHTML = `
    <button type="button" data-cmd="bold"><b>B</b></button>
    <button type="button" data-cmd="italic"><i>I</i></button>
    <button type="button" data-cmd="underline"><u>U</u></button>
    <button type="button" data-cmd="color" data-color="#475dd7" style="color:#475dd7;">●</button>
    <button type="button" data-cmd="clear">Clear</button>
  `;
  bar.style.display = 'none';
  doc.body.appendChild(bar);

  const hide = () => { bar.style.display = 'none'; };
  const applyCmd = (cmd, color) => {
    try {
      if (cmd === 'color') {
        doc.execCommand('foreColor', false, color || '#475dd7');
      } else if (cmd === 'clear') {
        doc.execCommand('removeFormat', false, null);
      } else {
        doc.execCommand(cmd, false, null);
      }
    } catch (_) {}
    hide();
  };

  bar.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => applyCmd(btn.dataset.cmd, btn.dataset.color));
  });

  function selectionInEditable(sel) {
    const node = sel.anchorNode;
    let el = node instanceof Element ? node : node?.parentElement;
    while (el) {
      if (el.hasAttribute && el.hasAttribute('data-ppx-edit')) return true;
      el = el.parentElement;
    }
    return false;
  }

  function showIfNeeded() {
    const sel = doc.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { hide(); return; }
    if (!selectionInEditable(sel)) { hide(); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    bar.style.display = 'flex';
    const top = rect.top + doc.defaultView.scrollY - bar.offsetHeight - 8;
    const left = rect.left + doc.defaultView.scrollX;
    bar.style.top = `${Math.max(8, top)}px`;
    bar.style.left = `${Math.max(8, left)}px`;
  }

  doc.addEventListener('mouseup', () => setTimeout(showIfNeeded, 0));
  doc.addEventListener('keyup', showIfNeeded);
  doc.addEventListener('scroll', hide, true);
  doc.addEventListener('click', (e) => {
    if (!bar.contains(e.target)) {
      // allow selection clicks to process; toolbar hiding handled on mouseup
    }
  });
}
