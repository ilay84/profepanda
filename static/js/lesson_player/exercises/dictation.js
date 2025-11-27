import { resolveMedia } from '../media.js';
import { playSfx } from '../sfx.js';

const PUNCT_RE = /[\.,;:!\?¿¡"“”'’()\[\]{}\-—–‒·•…]/g;

function normalizeSpaces(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function withoutPunctLower(s) {
  return normalizeSpaces((s || '').toLowerCase().replace(PUNCT_RE, ''));
}

function punctuationDiff(expected, actual) {
  // Very lightweight diff: list unique punctuation marks that differ
  const exp = (expected || '').match(PUNCT_RE) || [];
  const act = (actual || '').match(PUNCT_RE) || [];
  const expSet = new Set(exp);
  const actSet = new Set(act);
  const missing = [...expSet].filter(ch => !actSet.has(ch));
  const extra = [...actSet].filter(ch => !expSet.has(ch));
  return { missing, extra };
}

export function renderDictation(shell, slide) {
  const wrap = document.createElement('div');
  wrap.className = 'lp-dictation';

  const audioHtml = slide.audio
    ? `<figure class="lp-audio"><audio controls src="${resolveMedia(slide.audio)}"></audio></figure>`
    : '';

  wrap.innerHTML = `
    ${audioHtml}
    <label class="lp-dict-label">Escribe lo que escuchas:</label>
    <textarea class="lp-dict-input" rows="3" placeholder="..."></textarea>
    <div class="lp-feedback" hidden role="status" aria-live="polite"></div>
    <aside class="lp-punct-tips" hidden></aside>
  `;

  // small helper to grade
  wrap.__grade = function() {
    const target = String(slide.answer || '');
    const val = wrap.querySelector('.lp-dict-input').value || '';
    // Accent-sensitive: do NOT strip diacritics. Case-insensitive.
    const ok = withoutPunctLower(val) === withoutPunctLower(target);
    const tipsBox = wrap.querySelector('.lp-punct-tips');
    const fb = wrap.querySelector('.lp-feedback');
    fb.hidden = false;
    fb.textContent = ok ? '¡Correcto!' : 'Hay diferencias. Revisa los acentos y el texto.';

    const { missing, extra } = punctuationDiff(target, val);
    if (missing.length || extra.length) {
      tipsBox.hidden = false;
      tipsBox.innerHTML = `
        <div><strong>Consejos de puntuación:</strong></div>
        ${missing.length ? `<div>Falta: ${missing.map(escapeHtml).join(' ')}</div>` : ''}
        ${extra.length ? `<div>Extra: ${extra.map(escapeHtml).join(' ')}</div>` : ''}
      `;
    } else {
      tipsBox.hidden = true;
      tipsBox.innerHTML = '';
    }

    try { playSfx(ok ? 'correct' : 'incorrect'); } catch {}
    return ok;
  };

  // Mark dirty on user input so exit can confirm
  const ta = wrap.querySelector('.lp-dict-input');
  ta.addEventListener('input', () => {
    try { (shell.__lp_state.state || {}).dirty = true; } catch {}
  });

  return wrap;
}

function escapeHtml(s = '') {
  return s.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
