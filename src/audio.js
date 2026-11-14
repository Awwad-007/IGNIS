/* src/audio.js · IGNIS-0G Web Audio Synthesizer */

let AC = null;
let muted = false;

export const au = () => {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
};

export function tone(f, d, ty, v, f2) {
  if (muted) return;
  const a = au();
  if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = ty || 'sine';
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v || 0.15, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g);
  g.connect(a.destination);
  o.start(t);
  o.stop(t + d);
}

export function noise(d, v, fc) {
  if (muted) return;
  const a = au();
  if (!a) return;
  const n = Math.floor(a.sampleRate * d),
    b = a.createBuffer(1, n, a.sampleRate),
    c = b.getChannelData(0);
  for (let i = 0; i < n; i++) c[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const so = a.createBufferSource(),
    f = a.createBiquadFilter(),
    g = a.createGain();
  so.buffer = b;
  f.type = 'lowpass';
  f.frequency.value = fc || 900;
  g.gain.value = v || 0.2;
  so.connect(f);
  f.connect(g);
  g.connect(a.destination);
  so.start();
}

export const sfx = {
  stamp() {
    tone(120, 0.18, 'sine', 0.35, 40);
    noise(0.1, 0.22, 700);
  },
  whoosh() {
    noise(0.5, 0.16, 1400);
  },
  alarm() {
    tone(880, 0.15, 'square', 0.07);
    setTimeout(() => tone(880, 0.15, 'square', 0.07), 220);
  },
  ok() {
    tone(660, 0.12, 'sine', 0.12);
    setTimeout(() => tone(990, 0.25, 'sine', 0.12), 110);
  },
  bad() {
    tone(220, 0.4, 'sawtooth', 0.09, 110);
  },
  tick() {
    tone(1500, 0.02, 'square', 0.03);
  }
};

// Initialize #mute button listener
if (typeof document !== 'undefined') {
  const muteBtn = document.querySelector('#mute');
  if (muteBtn) {
    muteBtn.onclick = e => {
      muted = !muted;
      e.target.textContent = muted ? 'Sound off' : 'Sound on';
      if (!muted) {
        au();
        sfx.tick();
      }
    };
  }
}
