// Custom audio player with compact play button, waveform progress, and icon-based speed control
const SPEEDS = [0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00, 1.10, 1.20, 1.30, 1.40, 1.50];
const SPEED_ICONS = {
  '0.30': 'speed-.30x.svg',
  '0.40': 'speed-.40x.svg',
  '0.50': 'speed-.50x.svg',
  '0.60': 'speed-.60x.svg',
  '0.70': 'speed-.70x.svg',
  '0.80': 'speed-.80x.svg',
  '0.90': 'speed-.90x.svg',
  '1.00': 'speed-1x.svg',
  '1.10': 'speed-1.1x.svg',
  '1.20': 'speed-1.2x.svg',
  '1.30': 'speed-1.3x.svg',
  '1.40': 'speed-1.4x.svg',
  '1.50': 'speed-1.5x.svg'
};
const ICON_BASE = '/static/assets/lesson-icons/';
const ICON_VER = 'v2'; // cache-bust speed icon set
const SPEED_MIN = SPEEDS[0];
const SPEED_MAX = SPEEDS[SPEEDS.length - 1];

function clampSpeed(v) {
  return SPEEDS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a, SPEEDS[0]);
}

function speedLabel(v) {
  const rounded = clampSpeed(v);
  return `${rounded.toFixed(2).replace(/\.00$/, '').replace(/0$/, '')}x`;
}

function speedIcon(v) {
  const key = clampSpeed(v).toFixed(2);
  const file = SPEED_ICONS[key] || SPEED_ICONS['1.00'];
  return `${ICON_BASE}${file}?${ICON_VER}`;
}

function formatTime(sec) {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function mountAudioPlayers(root) {
  const figures = root.querySelectorAll('figure.lp-audio');
  figures.forEach(fig => {
    if (fig.__lp_bound) return; // idempotent
    const audio = fig.querySelector('[data-lp-audio]');
    const playBtn = fig.querySelector('[data-lp-audio-play]');
    const icon = fig.querySelector('[data-lp-audio-icon]');
    const progress = fig.querySelector('[data-lp-audio-progress]');
    const timeEl = fig.querySelector('[data-lp-audio-time]');
    const speedTrigger = fig.querySelector('[data-lp-speed-trigger]');
    const speedDrawer = fig.querySelector('.lp-speed__drawer');
    const speedRange = fig.querySelector('[data-lp-speed-range]');
    const speedLabelEl = fig.querySelector('[data-lp-speed-label]');
    const speedIconEl = fig.querySelector('[data-lp-speed-icon]');
    const speedClose = fig.querySelector('[data-lp-speed-close]');
    const markHost = fig.querySelector('[data-lp-speed-marks]');
    const marks = fig.querySelectorAll('[data-lp-speed-mark]');

    if (!audio || !playBtn || !progress || !speedTrigger || !speedDrawer || !speedRange || !speedLabelEl || !speedIconEl) return;

    function setPitchPreservation() {
      if ('preservesPitch' in audio) audio.preservesPitch = true;
      if ('mozPreservesPitch' in audio) audio.mozPreservesPitch = true;
      if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = true;
    }

    function applySpeed(v) {
      const rate = clampSpeed(parseFloat(v) || 1);
      try { audio.playbackRate = rate; } catch (_) {}
      setPitchPreservation();
      const label = speedLabel(rate);
      speedRange.value = rate.toFixed(2);
      speedLabelEl.textContent = label;
      speedTrigger.setAttribute('aria-label', `Velocidad ${label}`);
      speedIconEl.setAttribute('alt', `Velocidad ${label}`);
      speedIconEl.src = speedIcon(rate);
    }

    function updateProgress() {
      const pct = audio.duration ? Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100)) : 0;
      progress.style.setProperty('--lp-progress', `${pct}%`);
      progress.style.width = `${pct}%`;
      if (timeEl) timeEl.textContent = formatTime(audio.currentTime || 0);
    }

    function setPlaying(isPlaying) {
      fig.classList.toggle('is-playing', !!isPlaying);
      if (icon) {
        icon.src = isPlaying ? `${ICON_BASE}pause.svg` : `${ICON_BASE}audio.svg`;
      }
      playBtn.setAttribute('aria-label', isPlaying ? 'Pausar audio' : 'Reproducir audio');
    }

    function togglePlay() {
      try {
        if (audio.paused) {
          audio.play();
        } else {
          audio.pause();
        }
      } catch (_) {}
    }

    function openSpeed() {
      speedDrawer.hidden = false;
      speedTrigger.setAttribute('aria-expanded', 'true');
      speedRange.focus();
    }

    function closeSpeed() {
      speedDrawer.hidden = true;
      speedTrigger.setAttribute('aria-expanded', 'false');
      speedTrigger.focus();
    }

    function placeMarks() {
      if (!markHost || !marks.length) return;
      marks.forEach(mark => {
        const v = parseFloat(mark.dataset.speed);
        if (!Number.isFinite(v)) return;
        const pct = ((v - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100;
        mark.style.left = `${pct}%`;
      });
    }

    playBtn.addEventListener('click', togglePlay);
    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('ended', () => {
      setPlaying(false);
      audio.currentTime = 0;
      updateProgress();
    });
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);

    speedTrigger.addEventListener('click', () => {
      if (speedDrawer.hidden) openSpeed(); else closeSpeed();
    });
    if (speedClose) speedClose.addEventListener('click', closeSpeed);
    speedRange.addEventListener('input', (e) => applySpeed(e.target.value));
    speedRange.addEventListener('change', (e) => applySpeed(e.target.value));
    document.addEventListener('click', (e) => {
      if (!fig.contains(e.target) && !speedDrawer.hidden) closeSpeed();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !speedDrawer.hidden) {
        closeSpeed();
      }
    });

    // Initialize defaults
    placeMarks();
    applySpeed(audio.playbackRate || 1.0);
    updateProgress();
    fig.__lp_bound = true;
  });
}
