// Discrete speeds that sound good across devices
const SPEEDS = [0.30, 0.50, 0.75, 1.00];

function formatRate(v) {
  const n = Math.round(v * 100) / 100;
  return (n === 1 ? '1' : n.toString()) + 'x';
}

function nearestSpeed(v) {
  return SPEEDS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a, SPEEDS[0]);
}

function buildSpeedUI() {
  const wrap = document.createElement('div');
  wrap.className = 'lp-speed';
  wrap.innerHTML = `
    <button type="button" class="lp-speed__trigger" aria-haspopup="dialog" aria-expanded="false">1x</button>
    <div class="lp-speed__popover" role="dialog" aria-label="Velocidad de reproducción" hidden>
      <label class="lp-speed__label" for="lp-speed-range">Velocidad: <span class="lp-speed__value" aria-live="polite">1x</span></label>
      <input id="lp-speed-range" class="lp-speed__range" type="range" min="0.3" max="1.0" step="0.01" list="lp-speed-ticks" value="1.0">
      <datalist id="lp-speed-ticks">
        <option value="0.30" label="0.3x"></option>
        <option value="0.50" label="0.5x"></option>
        <option value="0.75" label="0.75x"></option>
        <option value="1.00" label="1x"></option>
      </datalist>
      <button type="button" class="lp-speed__close">Cerrar</button>
    </div>`;
  return wrap;
}

function applyRate(audio, trigger, range, valueEl, v) {
  const rate = nearestSpeed(parseFloat(v));
  range.value = rate;
  const label = formatRate(rate);
  valueEl.textContent = label;
  trigger.textContent = label;
  try { audio.playbackRate = rate; } catch {}
  if ('preservesPitch' in audio) audio.preservesPitch = true;
  if ('mozPreservesPitch' in audio) audio.mozPreservesPitch = true;
  if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = true;
}

export function mountAudioPlayers(root) {
  const figures = root.querySelectorAll('figure.lp-audio');
  figures.forEach(fig => {
    if (fig.__lp_speed) return; // idempotent
    const audio = fig.querySelector('audio');
    if (!audio) return;
    const ui = buildSpeedUI();
    fig.appendChild(ui);
    const trigger = ui.querySelector('.lp-speed__trigger');
    const pop = ui.querySelector('.lp-speed__popover');
    const range = ui.querySelector('.lp-speed__range');
    const valueEl = ui.querySelector('.lp-speed__value');
    const closeBtn = ui.querySelector('.lp-speed__close');

    function open() {
      pop.hidden = false; trigger.setAttribute('aria-expanded', 'true'); range.focus();
    }
    function close() {
      pop.hidden = true; trigger.setAttribute('aria-expanded', 'false'); trigger.focus();
    }

    trigger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    // Close when clicking outside
    document.addEventListener('click', (e) => { if (!ui.contains(e.target)) { if (!pop.hidden) close(); } });

    range.addEventListener('input', (e) => applyRate(audio, trigger, range, valueEl, e.target.value));
    range.addEventListener('change', (e) => applyRate(audio, trigger, range, valueEl, e.target.value));

    // Initialize from audio default
    applyRate(audio, trigger, range, valueEl, audio.playbackRate || 1.0);
    fig.__lp_speed = true;
  });
}

