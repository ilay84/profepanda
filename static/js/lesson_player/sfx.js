let audioCtx;

function beep(freq = 880, ms = 110) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.value = 0.05;
    o.connect(g).connect(audioCtx.destination);
    o.start();
    setTimeout(() => { o.stop(); }, ms);
  } catch {}
}

export function playSfx(kind) {
  // If you later add mp3s under /static/media/sfx, prefer those.
  // For now use a tiny WebAudio beep.
  if (kind === 'correct') return beep(880, 120);
  if (kind === 'incorrect') return beep(220, 200);
  if (kind === 'complete') return beep(1320, 180);
}

