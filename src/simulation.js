/* src/simulation.js · IGNIS-0G Production-Grade Hands-Free Autopilot Demo (26s Pacing) */

import { sfx } from './audio.js';
import { S } from './physics.js';

/* ---------- SVG Retro Pixel Cursor ---------- */
const CURSOR_SVG = `
<svg width="28" height="34" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0V26L7 19H12L17 31L22 29L17 17H24L0 0Z" fill="#16161A" stroke="#16161A" stroke-width="2" stroke-linejoin="miter"/>
  <path d="M2 3V22.5L7.5 17H12.5L17.5 28.5L20 27.5L15.2 15.5H21.5L2 3Z" fill="#D93829"/>
  <path d="M3 4V19L6 16H9L3 4Z" fill="#F4EFE6" opacity="0.85"/>
  <circle cx="3" cy="3" r="1.5" fill="#7CE9FF"/>
</svg>
`;

/* ---------- Autopilot Controller State ---------- */
let isRunning = false;
let isPaused = false;
let isAborted = false;
let skipCurrentAct = false;
let currentAct = 1;
let activeTimers = [];
let initialSnapshot = null;

// DOM References
let cursorEl = null;
let hudEl = null;
let explainerEl = null;
let finaleEl = null;
let highlightedEl = null;

/* ---------- Timing & Control Utilities ---------- */

function registerTimer(id) {
  activeTimers.push(id);
  return id;
}

function clearAllTimers() {
  activeTimers.forEach(id => {
    clearTimeout(id);
    clearInterval(id);
  });
  activeTimers = [];
}

function wait(ms) {
  return new Promise((resolve, reject) => {
    if (isAborted) return reject('ABORTED');
    if (skipCurrentAct) return resolve();

    const start = performance.now();
    let remaining = ms;

    const check = () => {
      if (isAborted) return reject('ABORTED');
      if (skipCurrentAct) return resolve();

      if (isPaused) {
        const timerId = setTimeout(check, 80);
        registerTimer(timerId);
        return;
      }

      const elapsed = performance.now() - start;
      if (elapsed >= remaining) {
        resolve();
      } else {
        const timerId = setTimeout(check, Math.min(30, remaining - elapsed));
        registerTimer(timerId);
      }
    };

    const timerId = setTimeout(check, Math.min(30, remaining));
    registerTimer(timerId);
  });
}

function getElementCenter(el, offset = { x: 0.5, y: 0.5 }) {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width * offset.x,
    y: r.top + r.height * offset.y
  };
}

/* ---------- Virtual Cursor & Animations ---------- */

function ensureCursor() {
  if (!cursorEl) {
    cursorEl = document.createElement('div');
    cursorEl.id = 'sim-cursor';
    cursorEl.innerHTML = CURSOR_SVG;
    document.body.appendChild(cursorEl);
    // Initial offscreen position
    cursorEl.style.transform = `translate3d(${window.innerWidth * 0.5}px, ${window.innerHeight * 0.6}px, 0)`;
  }
  return cursorEl;
}

function removeCursor() {
  if (cursorEl) {
    cursorEl.remove();
    cursorEl = null;
  }
}

function animateCursor(x, y, duration = 350) {
  if (isAborted) return Promise.reject('ABORTED');
  ensureCursor();
  cursorEl.style.transition = `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  return wait(duration);
}

function createRipple(x, y) {
  const ripple = document.createElement('div');
  ripple.className = 'sim-ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 550);
}

function highlightElement(el) {
  clearHighlight();
  if (el) {
    highlightedEl = el;
    el.classList.add('sim-highlight');
  }
}

function clearHighlight() {
  if (highlightedEl) {
    highlightedEl.classList.remove('sim-highlight');
    highlightedEl = null;
  }
  document.querySelectorAll('.sim-highlight').forEach(e => e.classList.remove('sim-highlight'));
}

async function moveCursorTo(selector, offset = { x: 0.5, y: 0.5 }, duration = 350) {
  if (isAborted || skipCurrentAct) return;
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(250);
  if (isAborted || skipCurrentAct) return;

  const { x, y } = getElementCenter(el, offset);
  await animateCursor(x, y, duration);
}

async function simulateClick(selector, offset = { x: 0.5, y: 0.5 }, sound = 'tick') {
  if (isAborted || skipCurrentAct) return;
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return;

  await moveCursorTo(el, offset, 350);
  if (isAborted || skipCurrentAct) return;

  highlightElement(el);

  if (cursorEl) cursorEl.classList.add('sim-cursor-click');
  const { x, y } = getElementCenter(el, offset);
  createRipple(x, y);

  if (sound === 'ok') sfx.ok();
  else if (sound === 'whoosh') sfx.whoosh();
  else if (sound === 'alarm') sfx.alarm();
  else if (sound === 'stamp') sfx.stamp();
  else sfx.tick();

  el.click();

  await wait(100);
  if (cursorEl) cursorEl.classList.remove('sim-cursor-click');
  await wait(120);
}

async function animateSlider(sliderSelector, targetValue, durationMs = 500) {
  if (isAborted || skipCurrentAct) return;
  const slider = typeof sliderSelector === 'string' ? document.querySelector(sliderSelector) : sliderSelector;
  if (!slider) return;

  highlightElement(slider);
  const startVal = parseFloat(slider.value) || 0;
  const steps = 16;
  const stepDuration = durationMs / steps;

  for (let i = 1; i <= steps; i++) {
    if (isAborted || skipCurrentAct) break;
    const current = startVal + (targetValue - startVal) * (i / steps);
    slider.value = Math.round(current * 10) / 10;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    if (i % 4 === 0) sfx.tick();
    await wait(stepDuration);
  }

  slider.value = targetValue;
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(120);
}

async function simulateTyping(inputSelector, text, speedMs = 25) {
  if (isAborted || skipCurrentAct) return;
  const input = typeof inputSelector === 'string' ? document.querySelector(inputSelector) : inputSelector;
  if (!input) return;

  await moveCursorTo(input, { x: 0.15, y: 0.5 }, 350);
  if (isAborted || skipCurrentAct) return;

  highlightElement(input);
  input.focus();
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));

  for (let i = 0; i < text.length; i++) {
    if (isAborted || skipCurrentAct) break;
    input.value += text[i];
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (i % 5 === 0) sfx.tick();
    await wait(speedMs);
  }
  await wait(120);
}

/* ---------- HUD & Explainer Overlays ---------- */

function createHUD() {
  if (hudEl) return hudEl;
  hudEl = document.createElement('div');
  hudEl.id = 'sim-hud';
  hudEl.innerHTML = `
    <span id="sim-act-badge"><i class="sim-dot"></i> 🎬 AUTOPILOT: ACT ${currentAct} / 6</span>
    <button class="sim-hud-btn" id="sim-btn-pause" type="button">⏸ PAUSE</button>
    <button class="sim-hud-btn" id="sim-btn-skip" type="button">⏭ SKIP</button>
    <button class="sim-hud-btn exit" id="sim-btn-exit" type="button">✕ EXIT</button>
  `;
  document.body.appendChild(hudEl);

  hudEl.querySelector('#sim-btn-pause').onclick = togglePause;
  hudEl.querySelector('#sim-btn-skip').onclick = skipAct;
  hudEl.querySelector('#sim-btn-exit').onclick = () => stopSimulation(true);

  return hudEl;
}

function updateHUD(act) {
  currentAct = act;
  if (!hudEl) createHUD();
  const badge = hudEl.querySelector('#sim-act-badge');
  if (badge) {
    badge.innerHTML = `<i class="sim-dot"></i> 🎬 AUTOPILOT: ACT ${act} / 6`;
  }
}

function removeHUD() {
  if (hudEl) {
    hudEl.remove();
    hudEl = null;
  }
}

function createExplainer() {
  if (explainerEl) return explainerEl;
  explainerEl = document.createElement('div');
  explainerEl.id = 'sim-explainer';
  explainerEl.innerHTML = `
    <div id="sim-explainer-title">⚡ ACT 1</div>
    <div id="sim-explainer-body">...</div>
    <div id="sim-explainer-badge">TELEMETRY</div>
  `;
  document.body.appendChild(explainerEl);
  return explainerEl;
}

function updateExplainer(title, narrative, badge, targetSelector) {
  createExplainer();
  const tEl = explainerEl.querySelector('#sim-explainer-title');
  const bEl = explainerEl.querySelector('#sim-explainer-body');
  const gEl = explainerEl.querySelector('#sim-explainer-badge');

  if (tEl) tEl.innerHTML = title;
  if (bEl) bEl.textContent = narrative;
  if (gEl) gEl.textContent = badge;

  explainerEl.style.display = 'block';
  explainerEl.style.opacity = '1';

  // Dynamic viewport clamping
  const targetEl = typeof targetSelector === 'string' ? document.querySelector(targetSelector) : targetSelector;
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const cardW = Math.min(380, window.innerWidth - 32);
    const cardH = 175;

    let left = rect.right + 20;
    let top = rect.top;

    if (left + cardW > window.innerWidth - 18) {
      left = rect.left - cardW - 20;
    }
    if (left < 18) {
      left = Math.max(18, (window.innerWidth - cardW) / 2);
      top = rect.bottom + 18;
    }
    if (top + cardH > window.innerHeight - 20) {
      top = Math.max(70, window.innerHeight - cardH - 20);
    }
    if (top < 70) top = 70;

    explainerEl.style.left = `${left}px`;
    explainerEl.style.top = `${top}px`;
  }
}

function removeExplainer() {
  if (explainerEl) {
    explainerEl.remove();
    explainerEl = null;
  }
}

function showFinale() {
  if (finaleEl) finaleEl.remove();
  finaleEl = document.createElement('div');
  finaleEl.id = 'sim-finale';
  finaleEl.innerHTML = `
    <h2>🎉 AUTOPILOT DEMO COMPLETE!</h2>
    <p>You've seen the 6-inch blind spot, Artemis cabin flammability, and NASA PSI flight validation in action.<br><br>Now it's your turn to test custom materials and calibrate the flame!</p>
    <div class="sim-finale-actions">
      <button id="sim-finale-close" type="button">TAKE THE CONTROLS ❯</button>
    </div>
  `;
  document.body.appendChild(finaleEl);
  sfx.ok();

  finaleEl.querySelector('#sim-finale-close').onclick = () => {
    if (finaleEl) finaleEl.remove();
    finaleEl = null;
  };

  // Auto close after 5 seconds
  setTimeout(() => {
    if (finaleEl) {
      finaleEl.style.transition = 'opacity 0.4s ease';
      finaleEl.style.opacity = '0';
      setTimeout(() => {
        if (finaleEl) {
          finaleEl.remove();
          finaleEl = null;
        }
      }, 400);
    }
  }, 5000);
}

/* ---------- Autopilot Control Actions ---------- */

function togglePause() {
  isPaused = !isPaused;
  if (hudEl) {
    const pauseBtn = hudEl.querySelector('#sim-btn-pause');
    if (pauseBtn) {
      pauseBtn.textContent = isPaused ? '▶ RESUME' : '⏸ PAUSE';
      pauseBtn.style.background = isPaused ? 'var(--sim-phos)' : '';
    }
  }
  sfx.tick();
}

function skipAct() {
  skipCurrentAct = true;
  sfx.tick();
}

/* ---------- 6-Act Mission Choreography (Tuned for ~26s Total) ---------- */

async function runAct1() {
  updateHUD(1);
  skipCurrentAct = false;
  updateExplainer(
    '⚡ ACT 1: THE GRAVITY BLIND SPOT',
    'On Earth, buoyant convection sweeps fresh oxygen upward into the flame base, stretching it into a tall teardrop. In lunar gravity (0.16g), buoyant lift plummets—the flame contracts into an oxygen-starved spherical envelope.',
    'NASA-STD-6001B • 0.16g Lunar vs 1.00g Earth',
    '#hero'
  );

  const heroSec = document.querySelector('.hero');
  if (heroSec) heroSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(250);

  // Glide to gravity slider and adjust from Earth (100) to Moon (32)
  await moveCursorTo('#gs', { x: 0.85, y: 0.5 }, 350);
  await animateSlider('#gs', 32, 500); // 32 corresponds to ~0.16g Moon
  await wait(2200);
}

async function runAct2() {
  updateHUD(2);
  skipCurrentAct = false;
  updateExplainer(
    '⚡ ACT 2: ARTEMIS CABIN & U-CURVE ENVELOPE',
    'Artemis crews breathe thin 34% O2 at 56.5 kPa to avert the bends during lunar EVAs. But 8 cm/s cabin ventilation lands right at the flammability U-curve minimum, creating a severe microgravity fire hazard.',
    'ARTEMIS CABIN • 34% O2 · 56.5 kPa · 8.0 cm/s',
    '#s1'
  );

  const s1 = document.querySelector('#s1');
  if (s1) s1.scrollIntoView({ behavior: 'smooth', block: 'start' });
  await wait(250);

  // Click Artemis preset button
  const artemisBtn = document.querySelector('button[data-p="34,56.5,8"]');
  if (artemisBtn) {
    await simulateClick(artemisBtn, { x: 0.5, y: 0.5 }, 'ok');
  }

  await wait(250);

  // Move to U-Curve Oscilloscope
  const ucCanvas = document.querySelector('#uCurve');
  if (ucCanvas) {
    await moveCursorTo(ucCanvas, { x: 0.5, y: 0.5 }, 350);
    highlightElement(ucCanvas);
    await wait(900);
  }

  // Move to 4-Zone Habitat Bulkhead Telemetry
  const habCanvas = document.querySelector('#habMap');
  if (habCanvas) {
    await simulateClick(habCanvas, { x: 0.72, y: 0.65 }, 'tick');
    await wait(300);
  }
}

async function runAct3() {
  updateHUD(3);
  skipCurrentAct = false;
  updateExplainer(
    '⚡ ACT 3: THE SIX-INCH FLAME QUALIFICATION',
    'NASA-STD-6001B Test 1 certifies spacecraft materials by burning a 6-inch vertical strip under standard Earth air. In enriched cabin oxygen, materials certified as self-extinguishing on Earth sustain aggressive combustion in freefall.',
    'NASA TEST 1 • 6-INCH QUALIFICATION FAILURE',
    '#s2'
  );

  const s2 = document.querySelector('#s2');
  if (s2) s2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  await wait(250);

  // Click "Burn all five" button
  const runAllBtn = document.querySelector('#runAll');
  if (runAllBtn) {
    await simulateClick(runAllBtn, { x: 0.5, y: 0.5 }, 'whoosh');
  }

  // Watch burns complete on CRT cards
  await wait(1800);

  // Approve first passed material if available
  const approveBtn = document.querySelector('#cards .card button.a:not(:disabled)');
  if (approveBtn) {
    await simulateClick(approveBtn, { x: 0.5, y: 0.5 }, 'tick');
  }
  await wait(200);
}

async function runAct4() {
  updateHUD(4);
  skipCurrentAct = false;
  updateExplainer(
    '⚡ ACT 4: LUNAR CERTIFICATION AUDIT',
    'Submitting the approved materials manifest triggers the automated lunar flight certification audit. Materials that passed Earth\'s 6-inch test are cross-checked against empirical microgravity extinction boundaries.',
    'FLIGHT AUDIT • LUNAR CERTIFICATION LEDGER',
    '#s3'
  );

  const s3 = document.querySelector('#s3');
  if (s3) s3.scrollIntoView({ behavior: 'smooth', block: 'start' });
  await wait(250);

  // Click "Send approved materials"
  const sendBtn = document.querySelector('#send');
  if (sendBtn) {
    await simulateClick(sendBtn, { x: 0.5, y: 0.5 }, 'alarm');
  }

  await wait(600);

  // Highlight ledger audit findings
  const ledger = document.querySelector('#ledger');
  if (ledger) {
    await moveCursorTo(ledger, { x: 0.5, y: 0.3 }, 350);
    highlightElement(ledger);
    await wait(1500);
  }
}

async function runAct5() {
  updateHUD(5);
  skipCurrentAct = false;
  updateExplainer(
    '⚡ ACT 5: INVISIBLE COOL FLAMES & 0G SMOKE',
    'ISS FLEX experiments revealed fuels can sustain invisible 400°C "cool flames" undetectable to visible cameras after apparent extinction. Simultaneously, smoke particles agglomerate in 0g, requiring tuned multi-wavelength sensors.',
    'FLEX & SAME • THERMAL IR & SMOKE AGGLOMERATION',
    '#s4'
  );

  const s4 = document.querySelector('#s4');
  if (s4) s4.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(250);

  // Spray partial suppressant
  const sprayBtn = document.querySelector('#cSpray');
  if (sprayBtn) {
    await simulateClick(sprayBtn, { x: 0.5, y: 0.5 }, 'whoosh');
  }
  await wait(250);

  // Toggle Thermal IR View
  const thermBtn = document.querySelector('#cTherm');
  if (thermBtn) {
    await simulateClick(thermBtn, { x: 0.5, y: 0.5 }, 'ok');
  }
  await wait(900);

  // Scroll to Step 5 (Smoke Detector)
  const s5 = document.querySelector('#s5');
  if (s5) {
    s5.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(200);
    const orbitBtn = document.querySelector('button.sg[data-sg="0"]');
    if (orbitBtn) {
      await simulateClick(orbitBtn, { x: 0.5, y: 0.5 }, 'tick');
    }
    await wait(500);
  }
}

async function runAct6() {
  updateHUD(6);
  skipCurrentAct = false;
  updateExplainer(
    '⚡ ACT 6: NASA PSI RESEARCH COPILOT',
    'The IGNIS-0G research copilot queries 24 empirical NASA spaceflight investigations (BASS, BASS-II, SoFIE, FLEX, SAME). Citations and quantitative extinction limits are synthesized directly from peer-reviewed flight data.',
    'NASA PSI COPILOT • 24 FLIGHT INVESTIGATIONS',
    '#s6'
  );

  const s6 = document.querySelector('#s6');
  if (s6) s6.scrollIntoView({ behavior: 'smooth', block: 'start' });
  await wait(250);

  // Type research prompt into SI Query
  const promptText = 'Why does low airflow increase fire risk in lunar cabins?';
  await simulateTyping('#siQuery', promptText, 25);

  // Click SYNTHESIZE button
  const synthBtn = document.querySelector('#siSynth');
  if (synthBtn) {
    await simulateClick(synthBtn, { x: 0.5, y: 0.5 }, 'ok');
  }

  await wait(300);

  // Move to synthesized answer and inspect citations
  const siAnswer = document.querySelector('#siAnswer');
  if (siAnswer) {
    await moveCursorTo(siAnswer, { x: 0.5, y: 0.4 }, 350);
    highlightElement(siAnswer);
    await wait(1100);
  }
}

/* ---------- Main Autopilot Start & Stop ---------- */

export async function startSimulation() {
  if (isRunning) return;
  isRunning = true;
  isPaused = false;
  isAborted = false;
  skipCurrentAct = false;
  currentAct = 1;

  // Snapshot initial state
  initialSnapshot = {
    o2: S.o2,
    p: S.p,
    v: S.v,
    g: S.g
  };

  createHUD();
  createExplainer();
  ensureCursor();

  try {
    await runAct1();
    if (!isAborted) await runAct2();
    if (!isAborted) await runAct3();
    if (!isAborted) await runAct4();
    if (!isAborted) await runAct5();
    if (!isAborted) await runAct6();

    if (!isAborted) {
      showFinale();
    }
  } catch (err) {
    if (err !== 'ABORTED') {
      console.warn('Simulation interrupted:', err);
    }
  } finally {
    stopSimulation(false);
  }
}

export function stopSimulation(immediateAbort = false) {
  isAborted = true;
  isRunning = false;
  isPaused = false;
  skipCurrentAct = false;

  clearAllTimers();
  clearHighlight();
  removeCursor();
  removeHUD();
  removeExplainer();

  // If user explicitly aborted via Exit or Escape, remove finale immediately
  if (immediateAbort && finaleEl) {
    finaleEl.remove();
    finaleEl = null;
  }
}

/* ---------- Event Listeners & Global Initialization ---------- */

export function initSimulation() {
  // Bind Header Trigger Button
  const headerBtn = document.querySelector('#btn-run-simulation');
  if (headerBtn) {
    headerBtn.onclick = () => {
      sfx.ok();
      startSimulation();
    };
  }

  // Bind Hero Trigger Button
  const heroBtn = document.querySelector('#btn-hero-simulation');
  if (heroBtn) {
    heroBtn.onclick = () => {
      sfx.ok();
      startSimulation();
    };
  }

  // Bind Escape Key for Instant Abort
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isRunning) {
      sfx.bad();
      stopSimulation(true);
    }
  });
}
