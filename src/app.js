/* src/app.js · IGNIS-0G Core Application Entrypoint */

import { au, tone, noise, sfx } from './audio.js';
import {
  clamp,
  S,
  GL,
  FLOWS,
  DFL,
  DATA,
  M,
  MAT,
  PSI_DB,
  PSI_URL,
  initPhysicsData,
  q,
  bo,
  by,
  loi,
  eff,
  pO2,
  bends,
  burns,
  sp,
  effOf,
  spOf,
  loiV1,
  spV1,
  rankPSI
} from './physics.js';

const $ = s => document.querySelector(s);
const R = Math.random;

/* ---------- flame drawing (shared) ---------- */
function tear(x, cx, b, w, h, sw) {
  x.beginPath();
  x.moveTo(cx - w / 2, b);
  x.bezierCurveTo(cx - w / 2, b - h * 0.35, cx - w * 0.16 + sw * 0.5, b - h * 0.72, cx + sw, b - h);
  x.bezierCurveTo(cx + w * 0.16 + sw * 0.5, b - h * 0.72, cx + w / 2, b - h * 0.35, cx + w / 2, b);
  x.quadraticCurveTo(cx, b + w * 0.28, cx - w / 2, b);
  x.closePath();
}

function flame(x, cx, cy, s, g, I, t) {
  const k = Math.sqrt(g);
  x.save();
  x.globalCompositeOperation = 'lighter';
  const rb = s * 0.62, a = I * (1 - 0.85 * k);
  if (a > 0.01) {
    const r = x.createRadialGradient(cx, cy - rb * 0.2, 0, cx, cy - rb * 0.2, rb * 1.7);
    r.addColorStop(0, `rgba(150,200,255,${a})`);
    r.addColorStop(0.45, `rgba(70,130,255,${a * 0.7})`);
    r.addColorStop(1, 'rgba(40,80,255,0)');
    x.fillStyle = r;
    x.beginPath();
    x.arc(cx, cy - rb * 0.2, rb * 1.7, 0, 7);
    x.fill();
  }
  if (k > 0.02) {
    const h = s * (1.3 + 0.95 * k) * (1 + 0.07 * Math.sin(t * 19)),
      w = s * 0.8,
      sw = Math.sin(t * 7) * s * 0.1 * k;
    [[1, 0.34, '255,70,20'], [0.75, 0.55, '255,150,30'], [0.45, 0.85, '255,230,140']].forEach(([f, al, c]) => {
      const gr = x.createLinearGradient(0, cy, 0, cy - h * f);
      gr.addColorStop(0, `rgba(${c},${al * I * k})`);
      gr.addColorStop(1, `rgba(${c},0)`);
      x.fillStyle = gr;
      tear(x, cx, cy, w * f, h * f, sw * f);
      x.fill();
    });
  }
  x.restore();
}

function grid(x, W, H, a) {
  x.strokeStyle = `rgba(41,168,224,${a ? a * 2.4 : 0.14})`;
  x.lineWidth = 2;
  for (let i = 0; i < W; i += 24) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, H);
    x.stroke();
  }
  for (let j = 0; j < H; j += 24) {
    x.beginPath();
    x.moveTo(0, j);
    x.lineTo(W, j);
    x.stroke();
  }
}

const vis = el => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
};

/* ---------- Application Initializer (runs once datasets load) ---------- */
function initApp() {
  /* ---------- ticker + ruler ---------- */
  const TK = DATA.ticker.map(t => `<span><em>●</em>${t}</span>`).join('');
  $('#tk').innerHTML = TK + TK;
  addEventListener('scroll', () => {
    $('#rf').style.height = (100 * scrollY / Math.max(1, document.body.scrollHeight - innerHeight)) + '%';
  }, { passive: true });

  /* ---------- hero candle ---------- */
  const hc = $('#hero'), hx = hc.getContext('2d');
  let hg = 1;
  const hb = [];
  const GT = g => g > 0.8
    ? 'On Earth, hot gas rises and drags fresh air in behind it. That draft makes the teardrop.'
    : g > 0.28
    ? 'Weaker lift, shorter flame. Gravity still tugs the hot gas upward, just gently.'
    : g > 0.05
    ? 'Lunar gravity: only a faint updraft. Flames get rounder and slower, and a small vent can change everything.'
    : 'No lift at all. A pale blue ball that feeds on whatever drifts in. Airflow from fans becomes the wind.';

  $('#gs').oninput = e => {
    hg = (e.target.value / 100) ** 1.6;
    const l = hg > 0.97 ? 'Earth' : (hg > 0.35 && hg < 0.42 ? 'Mars' : (hg > 0.13 && hg < 0.2 ? 'Moon' : (hg < 0.02 ? 'Orbit' : '')));
    $('#gval').textContent = hg.toFixed(2) + ' g' + (l ? ' · ' + l : '');
    $('#gtxt').textContent = GT(hg);
  };
  $('#gtxt').textContent = GT(1);

  function heroDraw(t, dt) {
    hx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    hx.fillStyle = '#071324';
    hx.fillRect(0, 0, 460, 330);
    grid(hx, 460, 330);
    hx.fillStyle = '#e9e4d6';
    hx.fillRect(205, 215, 50, 115);
    hx.fillStyle = '#cfc8b4';
    hx.fillRect(205, 215, 50, 6);
    hx.fillStyle = '#222';
    hx.fillRect(228, 198, 4, 18);
    const k = Math.sqrt(hg);
    if (hb.length < 90 && R() < dt * 30) {
      hb.push({
        x: 230 + (R() - 0.5) * 8,
        y: 190 - 40 * k,
        vx: (R() - 0.5) * (8 + 30 * (1 - k)),
        vy: -(6 + 90 * k) * (0.6 + R() * 0.6),
        l: 2.6,
        s: 1.2 + R() * 1.6 + (1 - k) * 2
      });
    }
    for (let i = hb.length - 1; i >= 0; i--) {
      const p = hb[i];
      p.l -= dt;
      if (p.l <= 0) {
        hb.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      hx.fillStyle = `rgba(170,185,205,${Math.min(1, p.l) * 0.3})`;
      hx.beginPath();
      hx.arc(p.x, p.y, p.s * (1 + (2.6 - p.l) * 0.5), 0, 7);
      hx.fill();
    }
    flame(hx, 230, 200, 52, hg, 1, t);
  }

  /* ---------- cabin controls ---------- */
  function setG(g, fromStep3) {
    S.g = g;
    document.querySelectorAll('.gb').forEach(b => b.classList.toggle('on', +b.dataset.g === g));
    if (fromStep3 && S.appr.some(Boolean)) send();
    renderPSI();
    updSpin();
    renderLive();
  }
  document.querySelectorAll('.gb').forEach(b => {
    b.onclick = () => {
      sfx.tick();
      setG(+b.dataset.g, !!b.closest('#s3'));
    };
  });

  const stale = () => {
    S.tested = [];
    S.appr = [];
    S.score = 0;
    cells.forEach(c => reset(c));
    $('#ledger').className = 'ledger';
    $('#cert').style.display = 'none';
  };

  function sync() {
    $('#o2').value = S.o2;
    $('#pr').value = S.p;
    $('#vt').value = S.v;
    $('#o2v').textContent = S.o2.toFixed(1) + ' %';
    $('#prv').textContent = S.p.toFixed(1) + ' kPa';
    $('#vtv').textContent = S.v.toFixed(1) + ' cm/s';
    const ok = pO2() >= M.hypoxiaKpa,
      c = $('#chO');
    c.textContent = 'Crew oxygen pressure ' + pO2().toFixed(1) + ' kPa · ' + (ok ? 'breathable' : 'HYPOXIC (needs ' + M.hypoxiaKpa + ')');
    c.className = 'chip ' + (ok ? 'ok' : 'bad');
    $('#chB').textContent = 'Bends protection ' + bends().toFixed(0) + '%';
    $('#barB').style.width = bends() + '%';
    $('#chE').textContent = 'Fire-effective O2 ' + eff().toFixed(1) + '%';
    const mb = $('#mitigate');
    if (mb) {
      const bad = MAT.some(m => eff() >= loi(m, S.g, S.v) && eff() < loi(m, 1, 0)) || !ok;
      mb.classList.toggle('go', bad);
    }
    renderPSI();
    updSpin();
    renderLive();
  }

  [['o2', 'o2'], ['pr', 'p'], ['vt', 'v']].forEach(([id, k]) => {
    $('#' + id).oninput = e => {
      S[k] = +e.target.value;
      sync();
      stale();
      sfx.tick();
    };
  });

  document.querySelectorAll('[data-p]').forEach(b => {
    b.onclick = () => {
      [S.o2, S.p, S.v] = b.dataset.p.split(',').map(Number);
      sync();
      stale();
      sfx.tick();
    };
  });

  const mitBtn = $('#mitigate');
  if (mitBtn) {
    mitBtn.onclick = () => {
      S.v = 0;
      S.o2 = 21.0;
      S.p = 101.3;
      sync();
      stale();
      renderPSI();
      updSpin();
      renderLive();
      flashX('MITIGATED: VENT 0 CM/S · 21% O2 · SAFE');
      sfx.ok();
    };
  }

  /* ---------- lab: live dual chamber ---------- */
  const lc = $('#lab'), lx = lc.getContext('2d');
  let LM = 3;
  const LB = [[], []];

  MAT.forEach((m, i) => {
    const b = document.createElement('button');
    b.textContent = m.n;
    b.className = i === LM ? 'on' : '';
    b.onclick = () => {
      LM = i;
      [...$('#mtabs').children].forEach((x, j) => x.classList.toggle('on', j === i));
      sfx.tick();
    };
    $('#mtabs').appendChild(b);
  });

  function labPanel(i, x0, g, t, dt) {
    const x = lx,
      m = MAT[LM],
      u = S.v,
      Lm = loi(m, g, u),
      mg = eff() - Lm,
      b = mg >= 0,
      I = b ? clamp(0.35 + 0.65 * clamp(mg / 9, 0, 1), 0.3, 1) : 0,
      bits = LB[i],
      cx = 240,
      cy = 210,
      kb = Math.sqrt(g);
    x.save();
    x.translate(x0, 0);
    x.beginPath();
    x.rect(0, 0, 480, 300);
    x.clip();
    x.fillStyle = '#071324';
    x.fillRect(0, 0, 480, 300);
    grid(x, 480, 300);
    if (u > 0.2) {
      x.strokeStyle = 'rgba(120,180,255,.22)';
      x.setLineDash([10, 14]);
      x.lineDashOffset = -t * (14 + u * 4.5);
      for (let k = 0; k < 7; k++) {
        x.beginPath();
        x.moveTo(0, 40 + k * 38);
        x.lineTo(480, 40 + k * 38);
        x.stroke();
      }
      x.setLineDash([]);
    }
    if (kb > 0.05) {
      x.strokeStyle = `rgba(120,180,255,${0.06 + 0.2 * kb * (I + 0.2)})`;
      for (let k = 0; k < 9; k++) {
        x.beginPath();
        for (let y = cy; y > 10; y -= 8) {
          const xx = cx + (k - 4) * 46 * (1 - (cy - y) / 400) + Math.sin((cy - y) * 0.05 - t * (1 + 4 * kb) + k) * (3 + 10 * kb);
          y === cy ? x.moveTo(xx, y) : x.lineTo(xx, y);
        }
        x.stroke();
      }
    }
    x.fillStyle = m.c;
    x.fillRect(cx - 50, cy + 4, 100, 10);
    x.fillStyle = '#2a211c';
    x.fillRect(cx - 50, cy + 14, 100, 3);
    if (I > 0.1 && bits.length < (i ? 70 : 150) && R() < dt * (i ? 9 : 34) * I) {
      bits.push(i ? {
        x: cx + 20 + R() * 10,
        y: cy - 20,
        vx: 3 + u * 1.6,
        vy: -(by(g) * 0.7 + 1),
        l: 11,
        s: 2.5 + R() * 2,
        n: 4 + (R() * 4 | 0),
        o: Array.from({ length: 7 }, () => [R() * 2 - 1, R() * 2 - 1])
      } : {
        x: cx + (R() - 0.5) * 10,
        y: cy - 70 * (0.6 + 0.4 * I),
        vx: u * 0.8,
        vy: -(70 + R() * 50),
        l: 3,
        s: 1.5 + R() * 1.5,
        n: 1,
        o: [[0, 0]]
      });
    }
    for (let k = bits.length - 1; k >= 0; k--) {
      const p = bits[k];
      p.l -= dt;
      if (p.l <= 0) {
        bits.splice(k, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (i) p.s += dt * 0.5;
      x.fillStyle = `rgba(160,182,205,${Math.min(1, p.l / 2) * (i ? 0.55 : 0.3)})`;
      for (let n = 0; n < p.n; n++) {
        x.beginPath();
        x.arc(p.x + p.o[n][0] * p.s * 1.2, p.y + p.o[n][1] * p.s * 1.2, p.s * (n ? 0.6 : 0.9), 0, 7);
        x.fill();
      }
    }
    x.save();
    x.translate(cx, cy);
    x.scale(1 + (g < 1 ? clamp(u * 0.05, 0, 1.1) : 0), 1);
    flame(x, 0, 0, 46, g, I, t);
    x.restore();
    x.font = "16px 'Press Start 2P',monospace";
    x.fillStyle = '#fff';
    x.textAlign = 'left';
    x.fillText(i ? (GL[g] || '').toUpperCase() + ' ' + g + 'G' : 'EARTH 1G', 30, 28);
    x.textAlign = 'right';
    x.fillStyle = b ? '#ffb199' : '#9aa4b2';
    x.fillText(b ? 'BURN ' + sp(m, g, u).toFixed(2) + 'MM/S' : 'NO FLAME', 450, 28);
    x.textAlign = 'left';
    x.font = "16px 'Press Start 2P',monospace";
    x.fillStyle = '#8fb6c8';
    x.fillText('LIMIT ' + Lm.toFixed(1) + '% AIR ' + eff().toFixed(1) + '%' + (i && g < 1 && u > 1 && b ? ' WAKE' : ''), 30, 272);
    x.restore();
  }

  function labDraw(t, dt) {
    lx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    labPanel(0, 0, 1, t, dt);
    labPanel(1, 480, S.g, t, dt);
    lx.fillStyle = '#fff';
    lx.fillRect(479, 0, 2, 300);
  }

  /* ---------- step 1 add-ons: live u-curve + 4-zone habitat bulkhead ---------- */
  const uc = $('#uCurve'), ux = uc ? uc.getContext('2d') : null;
  const hm = $('#habMap'), hx2 = hm ? hm.getContext('2d') : null;

  function uCurveDraw(t, dt) {
    if (!ux) return;
    const W = 480, H = 230, L = 46, Rm = 16, T = 26, B = 30, pw = W - L - Rm, ph = H - T - B;
    const m = MAT[LM] || MAT[0], uMin = 0, uMax = 40, oMin = 12, oMax = 36;
    const mapX = u => L + (u - uMin) / (uMax - uMin) * pw,
      mapY = o => H - B - (o - oMin) / (oMax - oMin) * ph;
    ux.fillStyle = '#071324';
    ux.fillRect(0, 0, W, H);
    grid(ux, W, H, 0.05);
    ux.font = "12px 'VT323',monospace";
    ux.lineWidth = 1;
    for (let o = 12; o <= 36; o += 4) {
      const y = mapY(o);
      ux.strokeStyle = 'rgba(41,168,224,.18)';
      ux.beginPath();
      ux.moveTo(L, y);
      ux.lineTo(W - Rm, y);
      ux.stroke();
      ux.fillStyle = '#8fb6c8';
      ux.textAlign = 'right';
      ux.fillText(o + '%', L - 5, y + 4);
    }
    for (let u = 0; u <= 40; u += 10) {
      const x = mapX(u);
      ux.strokeStyle = 'rgba(41,168,224,.18)';
      ux.beginPath();
      ux.moveTo(x, T);
      ux.lineTo(x, H - B);
      ux.stroke();
      ux.fillStyle = '#8fb6c8';
      ux.textAlign = 'center';
      ux.fillText(u, x, H - B + 16);
    }
    ux.fillStyle = '#9cc3d6';
    ux.textAlign = 'center';
    ux.fillText('VENTILATION AIRFLOW (CM/S)', (L + W - Rm) / 2, H - 4);
    ux.textAlign = 'left';
    ux.fillText('O2 (%)', 6, T - 10);
    const l1 = loi(m, 1, 0), yEarth = mapY(l1), pts = [];
    for (let k = 0; k <= 80; k++) {
      const u = uMin + (uMax - uMin) * (k / 80),
        loiVal = loi(m, S.g, u);
      pts.push({ u, loiVal, x: mapX(u), y: mapY(clamp(loiVal, oMin, oMax)) });
    }
    const dangerPts = pts.filter(p => p.loiVal < l1);
    if (dangerPts.length > 1) {
      ux.save();
      ux.beginPath();
      ux.moveTo(dangerPts[0].x, yEarth);
      dangerPts.forEach(p => ux.lineTo(p.x, p.y));
      ux.lineTo(dangerPts[dangerPts.length - 1].x, yEarth);
      ux.closePath();
      ux.fillStyle = 'rgba(238,59,36,0.22)';
      ux.fill();
      const midD = dangerPts[dangerPts.length >> 1];
      ux.font = "11px 'VT323',monospace";
      ux.fillStyle = 'rgba(255,160,150,0.85)';
      ux.textAlign = 'center';
      const textY = (yEarth + midD.y) / 2;
      if (Math.abs(yEarth - midD.y) > 14) ux.fillText('NEGATIVE MARGIN DANGER POCKET', midD.x, textY + 3);
      ux.restore();
    }
    ux.save();
    ux.strokeStyle = '#FFC145';
    ux.lineWidth = 1.8;
    ux.setLineDash([6, 4]);
    ux.beginPath();
    ux.moveTo(L, yEarth);
    ux.lineTo(W - Rm, yEarth);
    ux.stroke();
    ux.setLineDash([]);
    ux.font = "11px 'VT323',monospace";
    ux.fillStyle = '#FFC145';
    ux.textAlign = 'right';
    ux.fillText('EARTH 1G LIMIT: ' + l1.toFixed(1) + '%', W - Rm - 4, yEarth - 5);
    ux.restore();
    ux.save();
    ux.strokeStyle = '#7CE9FF';
    ux.lineWidth = 2.4;
    ux.beginPath();
    pts.forEach((p, i) => { i === 0 ? ux.moveTo(p.x, p.y) : ux.lineTo(p.x, p.y); });
    ux.stroke();
    ux.restore();
    const curX = mapX(clamp(S.v, uMin, uMax)),
      curEff = eff(),
      curY = mapY(clamp(curEff, oMin, oMax));
    const L_curr = loi(m, S.g, S.v),
      isBurn = curEff >= L_curr,
      isNegMargin = isBurn && curEff < l1,
      pulse = Math.sin(t * 6);
    const retColor = isNegMargin ? '#ff3b24' : (isBurn ? '#ff8552' : '#46e68a');
    ux.save();
    ux.strokeStyle = retColor;
    ux.lineWidth = 1.5;
    ux.setLineDash([3, 3]);
    ux.beginPath();
    ux.moveTo(curX, T);
    ux.lineTo(curX, H - B);
    ux.moveTo(L, curY);
    ux.lineTo(W - Rm, curY);
    ux.stroke();
    ux.setLineDash([]);
    ux.fillStyle = retColor;
    ux.beginPath();
    ux.arc(curX, curY, 4 + pulse * 1.5, 0, 7);
    ux.fill();
    ux.strokeStyle = '#fff';
    ux.lineWidth = 1;
    ux.beginPath();
    ux.arc(curX, curY, 7 + pulse * 1.5, 0, 7);
    ux.stroke();
    ux.font = "9px 'Press Start 2P',monospace";
    ux.fillStyle = retColor;
    const placeRight = curX < W - 150;
    ux.textAlign = placeRight ? 'left' : 'right';
    ux.fillText(isNegMargin ? '0G DANGER!' : (isBurn ? 'BURNS' : 'HOLDS'), placeRight ? curX + 10 : curX - 10, curY - 5);
    ux.restore();
    ux.font = "9px 'Press Start 2P',monospace";
    ux.textAlign = 'left';
    ux.fillStyle = '#fff';
    ux.fillText((m.n).toUpperCase() + ' · ' + (GL[S.g] || 'SPACE').toUpperCase() + ' ' + S.g + 'G', L, T - 10);
    ux.textAlign = 'right';
    ux.fillStyle = '#7CE9FF';
    ux.fillText('U-MIN ' + m.l0.toFixed(1) + '%', W - Rm, T - 10);
  }

  const HAB_BAYS = [
    { id: '01', name: 'AVIONICS', sub: 'ETFE wire harness', rx: /etfe/i, x: 10, y: 24, w: 226, h: 96, defIdx: 4 },
    { id: '02', name: 'CREW QUARTERS', sub: 'Nomex fire barrier', rx: /nomex/i, x: 244, y: 24, w: 226, h: 96, defIdx: 3 },
    { id: '03', name: 'GALLEY / AIRLOCK', sub: 'Cotton-glass fabric', rx: /cotton/i, x: 10, y: 124, w: 226, h: 96, defIdx: 1 },
    { id: '04', name: 'CUPOLA VIEWPORT', sub: 'PMMA acrylic window', rx: /acrylic/i, x: 244, y: 124, w: 226, h: 96, defIdx: 0 }
  ];

  function habMapDraw(t, dt) {
    if (!hx2) return;
    const W = 480, H = 230;
    hx2.fillStyle = '#071324';
    hx2.fillRect(0, 0, W, H);
    grid(hx2, W, H, 0.05);
    hx2.font = "9px 'Press Start 2P',monospace";
    hx2.textAlign = 'left';
    hx2.fillStyle = '#fff';
    hx2.fillText('HABITAT BULKHEAD TELEMETRY', 10, 16);
    hx2.textAlign = 'right';
    hx2.fillStyle = '#8fb6c8';
    hx2.fillText('CLICK BAY TO SELECT', 470, 16);
    const curEff = eff(), pulse = Math.sin(t * 8);
    HAB_BAYS.forEach(bay => {
      let mIdx = MAT.findIndex(m => bay.rx.test(m.n));
      if (mIdx < 0) mIdx = bay.defIdx;
      const m = MAT[mIdx] || MAT[0],
        L_space = loi(m, S.g, S.v),
        L_1g = loi(m, 1, 0);
      const ignites = curEff >= L_space,
        negMargin = !ignites && (L_space < L_1g),
        isSelected = LM === mIdx;
      let status = 'NOMINAL', col = '#46e68a', bg = 'rgba(70,230,138,0.08)', border = '#204030';
      if (ignites) {
        status = 'IGNITES';
        col = '#ff3b24';
        bg = `rgba(238,59,36,${0.18 + 0.12 * pulse})`;
        border = '#ff3b24';
      } else if (negMargin) {
        status = '0G MARGIN LOSS';
        col = '#FFC145';
        bg = 'rgba(255,193,69,0.12)';
        border = '#FFC145';
      }
      hx2.fillStyle = bg;
      hx2.fillRect(bay.x, bay.y, bay.w, bay.h);
      hx2.strokeStyle = isSelected ? '#7CE9FF' : border;
      hx2.lineWidth = isSelected ? 2.5 : 1.2;
      hx2.strokeRect(bay.x, bay.y, bay.w, bay.h);
      hx2.strokeStyle = isSelected ? '#fff' : col;
      hx2.lineWidth = 1.5;
      const bx = bay.x, by2 = bay.y, bw = bay.w, bh = bay.h;
      hx2.beginPath();
      hx2.moveTo(bx, by2 + 8); hx2.lineTo(bx, by2); hx2.lineTo(bx + 8, by2);
      hx2.moveTo(bx + bw - 8, by2); hx2.lineTo(bx + bw, by2); hx2.lineTo(bx + bw, by2 + 8);
      hx2.moveTo(bx, by2 + bh - 8); hx2.lineTo(bx, by2 + bh); hx2.lineTo(bx + 8, by2 + bh);
      hx2.moveTo(bx + bw - 8, by2 + bh); hx2.lineTo(bx + bw, by2 + bh); hx2.lineTo(bx + bw, by2 + bh - 8);
      hx2.stroke();
      hx2.font = "9px 'Press Start 2P',monospace";
      hx2.fillStyle = isSelected ? '#fff' : '#cfe8ff';
      hx2.textAlign = 'left';
      hx2.fillText(`[${bay.id}] ${bay.name}`, bx + 8, by2 + 16);
      hx2.font = "14px 'VT323',monospace";
      hx2.fillStyle = '#9cc3d6';
      hx2.fillText(`${bay.sub} (${m.n})`, bx + 8, by2 + 34);
      hx2.fillText(`0G LIM: ${L_space.toFixed(1)}% | 1G: ${L_1g.toFixed(1)}%`, bx + 8, by2 + 54);
      hx2.fillText(`FIRE-EFF O2: ${curEff.toFixed(1)}% (${(curEff - L_space).toFixed(1)}% margin)`, bx + 8, by2 + 72);
      hx2.save();
      hx2.fillStyle = col;
      hx2.font = "8px 'Press Start 2P',monospace";
      hx2.textAlign = 'right';
      hx2.fillText(status, bx + bw - 8, by2 + 16);
      if (isSelected) {
        hx2.fillStyle = '#7CE9FF';
        hx2.fillText('◄ ACTIVE', bx + bw - 8, by2 + 86);
      }
      hx2.restore();
    });
  }

  if (hm) {
    hm.onclick = ev => {
      const r = hm.getBoundingClientRect(),
        sx = hm.width / r.width,
        sy = hm.height / r.height;
      const mx = (ev.clientX - r.left) * sx,
        my = (ev.clientY - r.top) * sy;
      HAB_BAYS.forEach(bay => {
        if (mx >= bay.x && mx <= bay.x + bay.w && my >= bay.y && my <= bay.y + bay.h) {
          let mIdx = MAT.findIndex(m => bay.rx.test(m.n));
          if (mIdx < 0) mIdx = bay.defIdx;
          LM = mIdx;
          const tabs = $('#mtabs');
          if (tabs) [...tabs.children].forEach((x, j) => x.classList.toggle('on', j === LM));
          sfx.tick();
        }
      });
    };
  }

  /* ---------- step 2: cards ---------- */
  const cells = [];
  MAT.forEach((m, i) => {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = `<div class="cv"><canvas width="120" height="150"></canvas></div><div class="meta"><h3>${m.n}</h3><small>${m.u} · Earth limit ${m.l1}% O2 · ${m.tag}</small><div class="row"><button class="t">Burn 6 in</button><button class="a" disabled>Approve</button></div></div>`;
    $('#cards').appendChild(d);
    const c = { m, i, d, cv: d.querySelector('canvas'), x: d.querySelector('canvas').getContext('2d'), mode: 'idle', g: 1, b: false, pr: 0, t: 0, I: 0, sp: 0.2, stamp: null };
    const ab = d.querySelector('.a');
    d.querySelector('.t').onclick = () => test(c);
    ab.onclick = () => {
      if (S.tested[i] !== 'PASS') return;
      S.appr[i] = !S.appr[i];
      sfx.tick();
      ab.textContent = S.appr[i] ? 'Approved ✓' : 'Approve';
      ab.style.background = S.appr[i] ? 'var(--blue)' : '';
      ab.style.color = S.appr[i] ? '#fff' : '';
    };
    cells.push(c);
  });

  function setStamp(c, txt, cls) {
    if (c.stamp) c.stamp.remove();
    if (!txt) {
      c.stamp = null;
      return;
    }
    const s = document.createElement('div');
    s.className = 'stamp ' + cls;
    s.textContent = txt;
    c.d.querySelector('.cv').appendChild(s);
    c.stamp = s;
    sfx.stamp();
  }

  function reset(c) {
    c.mode = 'idle';
    c.pr = 0;
    c.I = 0;
    if (c.stamp) {
      c.stamp.remove();
      c.stamp = null;
    }
    const a = c.d.querySelector('.a');
    a.disabled = true;
    a.textContent = 'Approve';
    a.style.background = '';
    a.style.color = '';
  }

  function ignite(c, g, u) {
    c.mode = 'run';
    c.g = g;
    c.t = 0;
    c.pr = 0;
    c.I = 0.8;
    c.b = burns(c.m, g, u);
    const v = c.m.v * Math.pow(clamp((eff() - loi(c.m, g, u)) / 6, 0, 3), 0.7);
    c.sp = 0.1 + 0.26 * clamp(v / 3, 0, 1);
    sfx.whoosh();
  }

  function test(c) {
    ignite(c, 1, 0);
    const fail = c.b;
    S.tested[c.i] = fail ? 'FAIL' : 'PASS';
    S.appr[c.i] = !fail;
    setTimeout(() => {
      if (S.tested[c.i] === undefined) return;
      setStamp(c, fail ? 'FAIL' : 'PASS', fail ? 'fail' : 'pass');
      const a = c.d.querySelector('.a');
      a.disabled = fail;
      if (!fail) {
        a.textContent = 'Approved ✓';
        a.style.background = 'var(--blue)';
        a.style.color = '#fff';
      }
    }, fail ? 3000 : 1800);
  }

  $('#runAll').onclick = () => cells.forEach((c, i) => setTimeout(() => test(c), i * 250));

  /* ---------- custom spacecraft material test bench ---------- */
  const cmBtn = $('#cmAdd');
  if (cmBtn) {
    cmBtn.onclick = () => {
      const nIn = $('#cmName'), l1In = $('#cmL1'), l0In = $('#cmL0'), vIn = $('#cmV');
      const name = ((nIn && nIn.value) || 'Custom material').trim();
      const l1 = parseFloat(l1In ? l1In.value : 24) || 24,
        l0 = parseFloat(l0In ? l0In.value : 18.2) || 18.2,
        v = parseFloat(vIn ? vIn.value : 0.4) || 0.4;
      const cMat = { n: name, u: 'Custom test coupon', tag: 'custom user input', l1, l0, v, c: '#b388ff', b1: 'user', b0: 'user', bv: 'user', bq: 'borrowed' };
      MAT.push(cMat);
      const newIdx = MAT.length - 1;
      const tabs = $('#mtabs');
      if (tabs) {
        const tb = document.createElement('button');
        tb.textContent = cMat.n;
        tb.onclick = () => {
          LM = newIdx;
          [...tabs.children].forEach((x, j) => x.classList.toggle('on', j === newIdx));
          sfx.tick();
        };
        tabs.appendChild(tb);
      }
      const cards = $('#cards');
      if (cards) {
        const d = document.createElement('div');
        d.className = 'card';
        d.innerHTML = `<div class="cv"><canvas width="120" height="150"></canvas></div><div class="meta"><h3>${cMat.n}</h3><small>${cMat.u} · Earth limit ${cMat.l1}% O2 · ${cMat.tag}</small><div class="row"><button class="t">Burn 6 in</button><button class="a" disabled>Approve</button></div></div>`;
        cards.appendChild(d);
        const rawCanvas = d.querySelector('canvas');
        const w = document.createElement('div');
        w.className = 'crt';
        rawCanvas.parentNode.insertBefore(w, rawCanvas);
        w.appendChild(rawCanvas);
        ['tl', 'tr', 'bl', 'bb'].forEach(k => {
          const i = document.createElement('i');
          i.className = 'br ' + k;
          w.appendChild(i);
        });
        const c = { m: cMat, i: newIdx, d, cv: rawCanvas, x: rawCanvas.getContext('2d'), mode: 'idle', g: 1, b: false, pr: 0, t: 0, I: 0, sp: 0.2, stamp: null };
        const ab = d.querySelector('.a');
        d.querySelector('.t').onclick = () => test(c);
        ab.onclick = () => {
          if (S.tested[newIdx] !== 'PASS') return;
          S.appr[newIdx] = !S.appr[newIdx];
          sfx.tick();
          ab.textContent = S.appr[newIdx] ? 'Approved ✓' : 'Approve';
          ab.style.background = S.appr[newIdx] ? 'var(--blue)' : '';
          ab.style.color = S.appr[newIdx] ? '#fff' : '';
        };
        cells.push(c);
        test(c);
      }
      renderData();
      sync();
      renderPSI();
      sfx.ok();
      flashX('STRIP ADDED: ' + cMat.n.toUpperCase());
    };
  }

  /* ---------- step 3: send to the Moon + scoring ---------- */
  function best() {
    let b = 0;
    for (let o = 14; o <= 36; o += 0.5) {
      for (let p = 55; p <= 101.3; p += 1) {
        for (const v of [0, 4, 8]) {
          const e = o * Math.pow(p / M.refKpa, M.presExp);
          let n = 0, h = 0;
          MAT.forEach(m => {
            if (e < loi(m, 1, 0)) {
              n++;
              if (e >= loi(m, 0.16, v)) h++;
            }
          });
          const bd = 100 * clamp(1 - ((1 - o / 100) * p / M.suitKpa - 1) / M.bendsSpan, 0, 1);
          if (o / 100 * p >= M.hypoxiaKpa && !h && n) b = Math.max(b, Math.round(bd + M.perMaterial * n));
        }
      }
    }
    return b;
  }
  const PAR = best();
  let BEST = 0, TARGET = 0;
  try {
    BEST = +localStorage.getItem('sit-best') || 0;
  } catch (e) {}

  function send() {
    const g = S.g;
    if (!S.tested.some(Boolean)) {
      cells.forEach(c => {
        const f = burns(c.m, 1, 0);
        S.tested[c.i] = f ? 'FAIL' : 'PASS';
        S.appr[c.i] = !f;
      });
    }
    let hidden = [], held = [], n = 0;
    cells.forEach((c, i) => {
      if (S.appr[i]) {
        n++;
        ignite(c, g, S.v);
        const h = c.b;
        (h ? hidden : held).push(c);
        setTimeout(() => setStamp(c, h ? 'HIDDEN FIRE' : 'HOLDS', h ? 'hidden' : 'holds'), 2400);
      } else {
        reset(c);
        setStamp(c, S.tested[i] === 'FAIL' ? 'REJECTED' : 'NOT USED', 'idle');
      }
    });
    setTimeout(() => {
      const hy = pO2() < M.hypoxiaKpa;
      let t, body, cls = 'badc';
      S.score = 0;
      $('#cert').style.display = 'none';
      if (hy) {
        t = 'Crew down';
        body = `Oxygen pressure is ${pO2().toFixed(1)} kPa, under the ${M.hypoxiaKpa} kPa floor. Your materials are fine, but nobody is awake to enjoy them. Raise pressure instead of oxygen.`;
        sfx.bad();
      } else if (n === 0) {
        t = 'Empty cabin';
        body = 'Nothing is in the cabin kit: every strip failed, or none was approved. Lower the fire-effective oxygen or approve what passed, then try again.';
        sfx.bad();
      } else if (hidden.length) {
        t = hidden.length + ' hidden fire' + (hidden.length > 1 ? 's' : '') + ' · score 0';
        body = `${hidden.map(c => c.m.n).join(', ')} passed the Earth test, then burned at ${g} g. Earth limit ${hidden[0].m.l1}% versus ${loi(hidden[0].m, g, S.v).toFixed(1)}% here, with ${eff().toFixed(1)}% in your air. That is the margin the six-inch test cannot see. Try lowering oxygen and raising pressure, or parking the vent.`;
        sfx.bad();
      } else {
        cls = 'good';
        S.score = Math.round(bends() + M.perMaterial * n);
        if (S.score > BEST) {
          BEST = S.score;
          try {
            localStorage.setItem('sit-best', BEST);
          } catch (e) {}
        }
        t = (g === 1 ? 'Holds on Earth' : 'Certified for ' + GL[g]) + ' · score ' + S.score;
        body = `${n} materials held at ${g} g with ${S.v.toFixed(1)} cm/s of ventilation. Crew oxygen pressure ${pO2().toFixed(1)} kPa. Score = ${bends().toFixed(0)} bends protection + ${n} × ${M.perMaterial}. Your best: ${BEST}. Best cabin this model allows: about ${PAR}.` +
          (TARGET ? ` <b>${S.score > TARGET ? 'You beat the ' + TARGET + ' challenge.' : (S.score === TARGET ? 'You tied the ' + TARGET + ' challenge.' : 'You are ' + (TARGET - S.score) + ' short of the ' + TARGET + ' challenge.')}</b>` : '');
        S.cert = { g, o2: S.o2, p: S.p, v: S.v, po: pO2(), bd: bends(), n, names: held.map(c => c.m.n), score: S.score };
        $('#cert').style.display = 'inline-block';
        sfx.ok();
      }
      msg(t, cls, body);
    }, 2900);
  }

  function msg(t, cls, body) {
    const l = $('#ledger');
    l.className = 'ledger show ' + cls;
    l.innerHTML = `<h3>${t}</h3>${body ? `<p>${body}</p>` : ''}`;
  }

  $('#send').onclick = send;
  $('#share').onclick = () => {
    if (!S.score) {
      $('#copied').textContent = 'Certify a cabin first, then challenge someone.';
      return;
    }
    const u = location.href.split('#')[0] + '#beat=' + S.score,
      t = `I certified a lunar cabin on The Six-Inch Test and scored ${S.score}. Beat me: ${u}`;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(
      () => { $('#copied').textContent = 'Challenge copied. Paste it anywhere.'; },
      () => { prompt('Copy this challenge:', t); }
    );
  };

  $('#cert').onclick = () => {
    const C = S.cert;
    if (!C) return;
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 800;
    const x = c.getContext('2d');
    x.fillStyle = '#F4F2EC';
    x.fillRect(0, 0, 1200, 800);
    x.strokeStyle = '#101214';
    x.lineWidth = 14;
    x.strokeRect(30, 30, 1140, 740);
    x.fillStyle = '#FC3D21';
    x.fillRect(30, 30, 1140, 64);
    x.fillStyle = '#fff';
    x.font = 'bold 24px Helvetica,Arial';
    x.textAlign = 'left';
    x.fillText('NASA INTERNATIONAL SPACE APPS 2026  ·  FLAME IN FREEFALL', 64, 72);
    x.fillStyle = '#101214';
    x.font = '900 66px Helvetica,Arial';
    x.fillText('Certificate of Lunar', 64, 200);
    x.fillText('Cabin Certification', 64, 270);
    x.font = '26px Helvetica,Arial';
    x.fillText(`${C.n} materials passed the six-inch test and held at ${C.g} g.`, 64, 330);
    x.fillStyle = '#FC3D21';
    x.font = '900 210px Helvetica,Arial';
    x.textAlign = 'right';
    x.fillText(String(C.score), 1130, 330);
    x.font = 'bold 22px Helvetica,Arial';
    x.fillText('CABIN SCORE', 1130, 372);
    x.textAlign = 'left';
    x.fillStyle = '#101214';
    x.font = 'bold 26px Helvetica,Arial';
    x.fillText(`Oxygen ${C.o2.toFixed(1)}%  ·  Pressure ${C.p.toFixed(1)} kPa  ·  Ventilation ${C.v.toFixed(1)} cm/s`, 64, 470);
    x.fillText(`Crew oxygen pressure ${C.po.toFixed(1)} kPa  ·  Bends protection ${C.bd.toFixed(0)}%`, 64, 520);
    x.font = '24px Helvetica,Arial';
    x.fillText('Materials held: ' + C.names.join(', '), 64, 580);
    x.fillStyle = '#0B3D91';
    x.fillRect(64, 640, 300, 6);
    x.fillStyle = '#6d727b';
    x.font = '18px Helvetica,Arial';
    x.fillText('Reduced-order educational model. Not a NASA-STD-6001 qualification.', 64, 690);
    x.fillText(new Date().toDateString(), 64, 722);
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'six-inch-test-certificate.png';
    a.click();
  };

  /* ---------- cell animation ---------- */
  function drawCell(c, dt, time) {
    const x = c.x, W = 240, H = 300, top = 44, bot = 268, sx = 120;
    x.setTransform(0.5, 0, 0, 0.5, 0, 0);
    x.fillStyle = '#071324';
    x.fillRect(0, 0, W, H);
    grid(x, W, H, 0.05);
    if (c.mode === 'run') {
      c.t += dt;
      if (c.b) {
        c.pr = Math.min(1, c.pr + dt * c.sp);
        c.I += ((c.pr >= 1 ? 0 : 1) - c.I) * Math.min(1, dt * (c.pr >= 1 ? 2.5 : 4));
      } else {
        c.I *= Math.exp(-dt * 2.2);
        c.pr = Math.min(0.06, c.pr + dt * 0.03);
      }
    }
    const f = bot - (bot - top) * c.pr;
    x.fillStyle = c.m.c;
    x.fillRect(sx - 7, top, 14, f - top);
    x.fillStyle = '#2a211c';
    x.fillRect(sx - 7, f, 14, bot - f);
    x.fillStyle = 'rgba(124,233,255,.85)';
    x.font = "16px 'Press Start 2P',monospace";
    x.textAlign = 'left';
    x.fillText('6IN', sx + 22, top + 6);
    x.fillRect(sx - 16, top, 10, 1);
    x.fillRect(sx - 12, bot + 4, 24, 3);
    if (c.I > 0.01) flame(x, sx, f, 40, c.g, c.I, time);
    x.fillStyle = 'rgba(255,255,255,.75)';
    x.fillText(c.mode === 'idle' ? 'READY' : (c.g === 1 ? '1G TEST' : c.g.toFixed(2) + 'G'), 28, 28);
  }

  /* ---------- round 4: cool flame ---------- */
  const cc = $('#cool'), cx2 = cc.getContext('2d');
  const CF = { st: 'burn', I: 1, cool: false, hold: 0, holding: false, th: false, mist: [], flare: 0 };
  const cmsg = t => $('#cmsg').textContent = t;

  function cfReset() {
    Object.assign(CF, { st: 'burn', I: 1, cool: false, hold: 0, holding: false, mist: [], flare: 0 });
    cmsg('A droplet is burning in microgravity. Spray a partial dose of suppressant.');
  }

  $('#cSpray').onclick = () => {
    if (CF.st !== 'burn') return;
    CF.st = 'out';
    CF.cool = true;
    for (let i = 0; i < 110; i++) CF.mist.push({ x: 40 + R() * 400, y: -10 - R() * 80, vy: 60 + R() * 90, l: 2.2 });
    sfx.whoosh();
    cmsg('Optical camera: FLAME OUT. Safe to declare it out?');
  };

  $('#cTherm').onclick = () => {
    CF.th = !CF.th;
    $('#cTherm').classList.toggle('on', CF.th);
    sfx.tick();
    if (CF.th && CF.st === 'out') {
      cmsg(CF.cool ? 'Thermal view shows a low-temperature ring. The fuel is still reacting.' : 'Thermal view is clear.');
    }
  };

  $('#cHold').onclick = () => {
    if (CF.st === 'out' && CF.cool) {
      CF.holding = true;
      sfx.whoosh();
      cmsg('Holding agent flow. Watch the thermal channel.');
    }
  };

  $('#cClear').onclick = () => {
    if (CF.st === 'burn') return cmsg('Spray first. The flame is still burning.');
    if (CF.st === 'flare') return;
    if (CF.cool) {
      CF.st = 'flare';
      CF.flare = 2.2;
      CF.mist = [];
      sfx.bad();
      cmsg('You declared it out while a cool flame was still burning. It re-ignited. The camera never saw it coming.');
    } else {
      sfx.ok();
      cmsg('Verified clear by thermal channel, then declared out. That is the protocol the cool-flame discovery argues for.');
    }
  };

  $('#cReset').onclick = () => {
    cfReset();
    sfx.tick();
  };

  function coolDraw(t, dt) {
    const x = cx2;
    x.setTransform(0.5, 0, 0, 0.5, 0, 0);
    x.fillStyle = CF.th ? '#1b0d26' : '#071324';
    x.fillRect(0, 0, 480, 260);
    grid(x, 480, 260, CF.th ? 0.08 : 0.05);
    if (CF.st === 'flare') {
      CF.flare -= dt;
      CF.I += (1 - CF.I) * Math.min(1, dt * 5);
      if (CF.flare <= 0) {
        CF.st = 'burn';
        CF.cool = false;
        cmsg('Reset to a burning droplet. Try again: spray, then check thermal before you declare it out.');
      }
    } else if (CF.st === 'out') {
      CF.I *= Math.exp(-dt * 5);
    }
    if (CF.holding) {
      CF.hold += dt / 3;
      if (CF.hold >= 1) {
        CF.hold = 1;
        CF.holding = false;
        CF.cool = false;
        sfx.ok();
        cmsg('Thermal channel clear. Now it is safe to declare it out.');
      }
    }
    x.strokeStyle = '#c9c2b0';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(60, 150);
    x.lineTo(420, 150);
    x.stroke();
    x.fillStyle = '#d8c8a0';
    x.beginPath();
    x.arc(240, 150, 12, 0, 7);
    x.fill();
    if (CF.I > 0.02) flame(x, 240, 148, 58, 0, CF.I, t);
    if (CF.cool) {
      const a = CF.th ? 0.85 : 0.07,
        r = 62 + 6 * Math.sin(t * 6.28);
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = CF.th ? `rgba(255,120,210,${a})` : `rgba(140,150,255,${a})`;
      x.lineWidth = CF.th ? 4 : 2;
      x.beginPath();
      x.arc(240, 150, r, 0, 7);
      x.stroke();
      if (CF.th) {
        const g = x.createRadialGradient(240, 150, r * 0.5, 240, 150, r * 1.5);
        g.addColorStop(0, 'rgba(255,90,180,.0)');
        g.addColorStop(0.7, 'rgba(255,90,180,.22)');
        g.addColorStop(1, 'rgba(255,90,180,0)');
        x.fillStyle = g;
        x.fillRect(80, 0, 320, 260);
      }
      x.restore();
    }
    for (let i = CF.mist.length - 1; i >= 0; i--) {
      const m = CF.mist[i];
      m.l -= dt;
      if (m.l <= 0) {
        CF.mist.splice(i, 1);
        continue;
      }
      m.y += m.vy * dt;
      x.fillStyle = `rgba(190,235,255,${Math.min(1, m.l) * 0.5})`;
      x.beginPath();
      x.arc(m.x, m.y, 1.6, 0, 7);
      x.fill();
    }
    x.font = "16px 'Press Start 2P',monospace";
    x.textAlign = 'left';
    x.fillStyle = '#fff';
    x.fillText(CF.th ? 'THERMAL VIEW' : 'OPTICAL CAM', 30, 28);
    x.textAlign = 'right';
    x.fillStyle = CF.th ? (CF.cool ? '#ff9bd6' : '#9fe0b0') : (CF.I > 0.3 ? '#ffb199' : '#9fe0b0');
    x.fillText(CF.th ? (CF.cool ? 'LOW-TEMP RING' : 'CLEAR') : (CF.I > 0.3 ? 'FLAME' : 'NO FLAME'), 450, 28);
    if ((CF.hold > 0 && CF.hold < 1) || CF.holding) {
      x.fillStyle = '#333';
      x.fillRect(12, 238, 456, 8);
      x.fillStyle = '#46b0ff';
      x.fillRect(12, 238, 456 * CF.hold, 8);
    }
  }

  /* ---------- round 5: smoke ---------- */
  const sc = $('#smk'), sx2 = sc.getContext('2d');
  const SM = { g: 1, c: 1, mw: false, bits: [], hist: [], alarm: false };
  const swin = () => {
    const k = SM.mw ? 2.6 : 1.6;
    return [SM.c / k, SM.c * k];
  };

  document.querySelectorAll('.sg').forEach(b => {
    b.onclick = () => {
      SM.g = +b.dataset.sg;
      SM.hist = [];
      SM.bits = [];
      for (let i = 0; i < 30; i++) {
        SM.bits.push({
          x: R() * 320,
          y: 30 + R() * 180,
          s: (SM.g ? 1 : 2.6) + (R() + R() - 1) * (SM.g ? 0.35 : 0.8),
          vx: SM.g ? 120 : 80,
          vy: SM.g ? -18 : 0,
          seen: false
        });
      }
      document.querySelectorAll('.sg').forEach(x => x.classList.toggle('on', x === b));
      sfx.tick();
    };
  });

  $('#sc').oninput = e => {
    SM.c = e.target.value / 10;
    SM.hist = [];
    $('#scv').textContent = SM.c.toFixed(1);
  };
  $('#scv').textContent = '1.0';

  $('#smw').onchange = e => {
    SM.mw = e.target.checked;
    SM.hist = [];
    sfx.tick();
  };

  function smokeDraw(t, dt) {
    const x = sx2;
    x.setTransform(0.5, 0, 0, 0.5, 0, 0);
    x.fillStyle = '#071324';
    x.fillRect(0, 0, 480, 240);
    grid(x, 480, 240);
    if (R() < dt * 22) {
      SM.bits.push({
        x: -10,
        y: 30 + R() * 180,
        s: (SM.g ? 1 : 2.6) + (R() + R() - 1) * (SM.g ? 0.35 : 0.8),
        vx: SM.g ? 120 : 80,
        vy: SM.g ? -18 : 0,
        seen: false
      });
    }
    const [lo, hi] = swin();
    for (let i = SM.bits.length - 1; i >= 0; i--) {
      const p = SM.bits[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x > 500 || p.y < -20) {
        SM.bits.splice(i, 1);
        continue;
      }
      if (!p.seen && p.x > 330) {
        p.seen = true;
        p.hit = p.s >= lo && p.s <= hi;
        SM.hist.push(p.hit);
        if (SM.hist.length > 30) SM.hist.shift();
      }
      x.fillStyle = p.seen && p.hit ? 'rgba(255,90,60,.8)' : 'rgba(170,190,210,.6)';
      const r = 2 + p.s * 2.6;
      x.beginPath();
      x.arc(p.x, p.y, r, 0, 7);
      x.fill();
      if (p.s > 1.8) {
        for (let k = 0; k < 4; k++) {
          x.beginPath();
          x.arc(p.x + Math.cos(k * 1.6 + p.y) * r * 0.9, p.y + Math.sin(k * 1.9 + p.x * 0.1) * r * 0.9, r * 0.55, 0, 7);
          x.fill();
        }
      }
    }
    x.fillStyle = '#1c2430';
    x.fillRect(350, 0, 130, 240);
    x.strokeStyle = '#8fa3bd';
    x.lineWidth = 2;
    x.strokeRect(350, 0, 130, 240);
    const rate = SM.hist.length ? SM.hist.filter(Boolean).length / SM.hist.length : 0,
      al = SM.hist.length >= 10 && rate >= 0.5;
    if (al && !SM.alarm) sfx.alarm();
    SM.alarm = al;
    x.fillStyle = al ? '#FC3D21' : '#3b4656';
    x.beginPath();
    x.arc(415, 40, 14, 0, 7);
    x.fill();
    x.fillStyle = '#fff';
    x.font = "16px 'Press Start 2P',monospace";
    x.textAlign = 'center';
    x.fillText('SENSOR', 415, 86);
    x.fillText(Math.round(rate * 100) + '%', 415, 112);
    x.fillStyle = 'rgba(120,200,255,.35)';
    const sy = d => 210 - d * 45;
    x.fillRect(356, sy(Math.min(hi, 4.4)), 118, Math.max(2, sy(lo) - sy(Math.min(hi, 4.4))));
    x.fillStyle = '#bfe3ff';
    x.font = "16px 'Press Start 2P',monospace";
    x.fillText('WINDOW', 415, 226);
    x.textAlign = 'left';
    x.fillStyle = '#fff';
    x.font = "16px 'Press Start 2P',monospace";
    x.fillText(SM.g ? 'EARTH: SMALL SMOKE' : 'ORBIT: BIG CLUMPS', 30, 28);
    $('#smsg').textContent = SM.hist.length < 10
      ? 'Reading the smoke…'
      : (al ? 'ALARM SOUNDS. The detector sees the smoke.' : 'SILENT. The cabin is filling with smoke and nothing is ringing.');
    $('#smsg').style.color = al ? '#7CE9FF' : '#FFC145';
  }

  /* ---------- step 6: PSI knowledge base, ranker, briefing ---------- */
  let FIL = '';
  const rl = r => r.doi ? ['DOI', 'https://doi.org/' + r.doi] : (r.ntrs ? ['NTRS', 'https://ntrs.nasa.gov/citations/' + r.ntrs] : ['PSI LIST', PSI_URL]);
  const chip = r => {
    const [l, u] = rl(r);
    return `<a class="pchip${r.doi ? '' : ' p'}" href="${u}" target="_blank" rel="noopener">[PSI | ${l}]</a>`;
  };

  function renderPSI() {
    const rk = rankPSI(),
      top = rk.slice(0, 3),
      nm = MAT.filter(m => eff() >= loi(m, S.g, S.v) && eff() < loi(m, 1, 0)),
      pl = $('#plist');
    if (!pl) return;
    const sc = pl.scrollTop;
    let v;
    if (nm.length) {
      const m = nm[0];
      v = `<b class="nm">NEGATIVE MARGIN OF SAFETY.</b> ${nm.map(x => x.n).join(', ')} would pass the Earth six-inch test (${m.n}: limit ${loi(m, 1, 0).toFixed(1)}%) yet sustain a flame here (space limit ${loi(m, S.g, S.v).toFixed(1)}%, your fire-effective O2 ${eff().toFixed(1)}%).`;
    } else {
      v = `<b class="ok">NO NEGATIVE MARGIN.</b> Every material that passes the Earth test also holds at ${S.g} g and ${S.v.toFixed(1)} cm/s.`;
    }
    $('#briefTxt').innerHTML = `<h3>SI MISSION BRIEFING</h3><p>Cabin: <b style="font:inherit;color:var(--amb)">${S.o2.toFixed(1)}% O2</b> at ${S.p.toFixed(1)} kPa, ${S.v.toFixed(1)} cm/s airflow, ${S.g} g. Fire-effective O2 ${eff().toFixed(1)}%, crew pO2 ${pO2().toFixed(1)} kPa${pO2() < M.hypoxiaKpa ? ' (<b style="font:inherit;color:#ff9a8a">below the ' + M.hypoxiaKpa + ' kPa floor</b>)' : ''}.</p><p>${v}</p><p>Closest PSI evidence: ${top.map(x => `<b style="font:inherit;color:#fff">${x.r.acronym}</b> ${x.m}% ${chip(x.r)}`).join(' &nbsp; ')}</p>${S.g > 0 && S.g < 1 ? '<p style="font-size:15px!important;color:#9cc3d6!important">No PSI flight data exists at ' + S.g + ' g. These matches extrapolate from 0 g records.</p>' : ''}`;
    pl.innerHTML = '';
    rk.filter(x => !FIL || x.r.pillar === FIL).forEach((x, i) => {
      const r = x.r,
        [l, u] = rl(r),
        f = a => a[0] === a[1] ? a[0] : a[0] + '–' + a[1],
        d = document.createElement('div');
      d.className = 'rcard';
      d.innerHTML = `<div class="rh"><b>${i + 1}. ${r.acronym}</b><span class="mt" style="--m:${x.m}">MATCH ${x.m}%</span></div><div class="rt">${r.title}</div><div><span class="tag">${r.pillar.toUpperCase()}</span><span class="tag">O2 ${f(r.o2Range)}%</span><span class="tag">${r.flowRange[0] === 0 && r.flowRange[1] === 0 ? 'QUIESCENT' : f(r.flowRange) + ' CM/S'}</span><span class="tag">${f(r.gRange)} G</span><span class="tag">${r.p} KPA</span></div>${r.note ? `<div class="nt">CATALOGUE NOTE: ${r.note}</div>` : ''}<p><b>KEY FINDING</b>${r.finding}</p><p><b>NEXT-GEN HARDWARE RULE</b>${r.hardwareRule}</p><div>${chip(r)}<a class="pchip${r.doi ? '' : ' p'}" href="${u}" target="_blank" rel="noopener">[${l} ↗]</a></div>`;
      pl.appendChild(d);
    });
    pl.scrollTop = sc;
  }

  document.querySelectorAll('#pfil button').forEach(b => {
    b.onclick = () => {
      FIL = b.dataset.f;
      document.querySelectorAll('#pfil button').forEach(x => x.classList.toggle('on', x === b));
      sfx.tick();
      renderPSI();
    };
  });

  /* ===== step 6: Ask the SI Archive (offline deterministic + optional live LLM) ===== */
  const kBtn = $('#siKeyBtn'), kRow = $('#siKeyRow'), kIn = $('#siKey');
  if (kIn) {
    try {
      kIn.value = localStorage.getItem('ignis-si-key') || '';
    } catch (e) {}
    if (kIn.value && kBtn) kBtn.style.color = 'var(--amb)';
    kIn.oninput = () => {
      try {
        localStorage.setItem('ignis-si-key', kIn.value.trim());
      } catch (e) {}
      if (kBtn) kBtn.style.color = kIn.value.trim() ? 'var(--amb)' : 'var(--phos)';
    };
  }
  if (kBtn && kRow) {
    kBtn.onclick = () => {
      const s = kRow.style.display === 'none' || !kRow.style.display;
      kRow.style.display = s ? 'flex' : 'none';
      sfx.tick();
      if (s && kIn) kIn.focus();
    };
  }

  function askSIOffline(query) {
    const q = (query || '').trim();
    if (!q) return;
    const qi = $('#siQuery');
    if (qi) qi.value = q;
    const ql = q.toLowerCase();
    let verdict = '', rule = '', srcs = [], topRec = null;
    const isO2 = /34|o2|oxygen|earth|rule|fail|margin|limit|flammab|normox/.test(ql);
    const isVent = /vent|feed|cm\/s|flow|quench|blow|fan|draft|speed|hvac|stair/.test(ql);
    const isFlex = /flex|cool|camera|miss|droplet|vapor|suppress|thermal|invis|dark/.test(ql);
    const isSmoke = /smoke|alarm|tune|same|particle|detect|aerosol|daft|clump/.test(ql);

    if (isO2 && !isFlex && !isSmoke && !isVent) {
      topRec = PSI_DB.find(r => r.id === 'bass-ii') || PSI_DB[1];
      verdict = `At your cabin's ${S.o2.toFixed(1)}% O2 (${S.p.toFixed(1)} kPa, fire-effective ${eff().toFixed(1)}% O2), materials certified safe under Earth's 21% O2 rules readily ignite. In BASS-II flight testing, acrylic rods (tests O4 and O12) sustained combustion down to 13.6% O2, while SoFIE-GEL Case 3 burned at 13.54% O2—a 2.4-point negative margin of safety below Earth's 16.0% limit. SIBAL fabric ignited and spread in GMT178-T11 (17.1% O2) despite failing to ignite below 16.8% (GMT175-T9).`;
      rule = topRec.hardwareRule;
      srcs = [topRec, PSI_DB.find(r => r.id === 'sofie-gel'), PSI_DB.find(r => r.id === 'acme-bre-2')].filter(Boolean);
    } else if (isVent && !isFlex && !isSmoke) {
      topRec = PSI_DB.find(r => r.id === 'bass') || PSI_DB[0];
      const inBand = S.v >= M.dangerLo && S.v <= M.dangerHi;
      verdict = `Your cabin airflow of ${S.v.toFixed(1)} cm/s ${inBand ? 'falls directly into the critical 2–15 cm/s forced-convection danger zone where microgravity flames thrive' : (S.v < M.dangerLo ? 'is parked below the 2 cm/s danger floor, promoting radiative extinction' : 'exceeds the 15 cm/s danger band, driving flames toward convective blow-off')}. Without buoyancy, quiescent air (<2 cm/s) forces radiative extinction, as verified when SIBAL fabric quenched at 2.2 cm/s in GMT45-T4 and GMT100-T13. However, gentle airflow replenishes oxidizer without reaching aerodynamic blow-off (seen in SoFIE-GEL Case 2 at 34.28 cm/s and BASS-II rod O7 at fan 97), sustaining combustion where Earth flames self-extinguish.`;
      rule = topRec.hardwareRule;
      srcs = [topRec, PSI_DB.find(r => r.id === 'bass-ii'), PSI_DB.find(r => r.id === 'slice')].filter(Boolean);
    } else if (isFlex || /suppress|extinguish/.test(ql)) {
      topRec = PSI_DB.find(r => r.id === 'flex') || PSI_DB[17];
      verdict = `Visible flame extinction does not indicate that combustion has ceased in microgravity. In FLEX and FLEX-2 ISS droplet experiments, heptane fuel droplets continued steady vaporization under 600–800 K second-stage cool flame chemistry that emits zero visible soot radiation. Standard optical spacecraft cameras registered a dark chamber, allowing undetected low-temperature reactions to persist until suppressant hold-times cleared or catastrophic re-ignition occurred.`;
      rule = topRec.hardwareRule;
      srcs = [topRec, PSI_DB.find(r => r.id === 'flex-2'), PSI_DB.find(r => r.id === 'cfi')].filter(Boolean);
    } else if (isSmoke) {
      topRec = PSI_DB.find(r => r.id === 'same') || PSI_DB[15];
      verdict = `Under ${S.g} g with negligible buoyant clearing, smoke particulates experience prolonged residence times, coagulating into aggregates 2–3× larger than Earth soot as proven by NASA's SAME (SAE 2009-01-2468) and DAFT flight telemetry. Traditional Earth ionization and single-band optical detectors calibrated to sub-micron particles remain blind to these large clusters until obscuration is critical. Safe spacecraft detection requires dual-wavelength optical scattering combined with particle-size discriminator windows.`;
      rule = topRec.hardwareRule;
      srcs = [topRec, PSI_DB.find(r => r.id === 'same-r'), PSI_DB.find(r => r.id === 'daft-2')].filter(Boolean);
    } else {
      const stopWords = new Set(['what', 'when', 'where', 'which', 'who', 'whom', 'this', 'that', 'with', 'from', 'have', 'been', 'were', 'does', 'will', 'would', 'could', 'should', 'test', 'tests', 'about', 'tell']);
      const words = ql.split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
      let bestScore = -1, bestR = PSI_DB[0];
      PSI_DB.forEach(r => {
        let sc = 0;
        const ac = r.acronym.toLowerCase();
        const ti = r.title.toLowerCase();
        const blob = (r.finding + ' ' + r.hardwareRule + ' ' + r.earthSpinoff + ' ' + r.basis + ' ' + r.pillar).toLowerCase();
        words.forEach(w => {
          if (ac.includes(w)) sc += 25;
          else if (ti.includes(w)) sc += 15;
          else if (blob.includes(w)) sc += 3;
        });
        if (ac === ql || ti === ql) sc += 50;
        if (sc > bestScore) {
          bestScore = sc;
          bestR = r;
        }
      });
      topRec = bestR;
      verdict = `Correlating ${topRec.acronym} (${topRec.title}) against active cabin telemetry (${S.o2.toFixed(1)}% O2, ${S.p.toFixed(1)} kPa, ${S.v.toFixed(1)} cm/s flow at ${S.g} g, fire-effective ${eff().toFixed(1)}% O2): ${topRec.finding} Ground-calibrated testing cannot reproduce these zero-g convective boundary conditions.`;
      rule = topRec.hardwareRule;
      srcs = [topRec, PSI_DB.find(r => r.pillar === topRec.pillar && r.id !== topRec.id)].filter(Boolean);
    }

    const ans = $('#siAnswer');
    if (!ans) return;
    ans.style.display = 'block';
    ans.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h3 style="margin:0">SI ARCHIVE SYNTHESIS · <span style="color:var(--amb)">${topRec.acronym}</span></h3><span class="tag" style="margin:0">${topRec.pillar.toUpperCase()}</span></div><p><b>VERDICT</b>${verdict}</p><p><b>HARDWARE RULE</b>${rule}</p><div><b style="font:8px var(--px);color:var(--amb);display:block;margin:6px 0 4px">VERIFIED SOURCES</b>${srcs.map(r => `${chip(r)} <a class="pchip" href="${rl(r)[1]}" target="_blank" rel="noopener">[${r.acronym} · ${rl(r)[0]} ↗]</a>`).join(' ')}</div>`;
    sfx.ok();
  }

  async function askSI(query) {
    const q = (query || '').trim();
    if (!q) return;
    const qi = $('#siQuery');
    if (qi) qi.value = q;
    const kIn = $('#siKey');
    let apiKey = (kIn ? kIn.value.trim() : '') || (function () {
      try {
        return localStorage.getItem('ignis-si-key') || '';
      } catch (e) {
        return '';
      }
    })();
    const ans = $('#siAnswer');

    if (apiKey && ans) {
      ans.style.display = 'block';
      ans.innerHTML = `<div style="padding:16px;text-align:center;font:13px 'Press Start 2P',monospace;color:var(--phos)"><span class="blink">●</span> QUERYING LIVE SI MODEL...</div>`;
      try {
        const topPSI = rankPSI().slice(0, 5).map(x => `${x.r.acronym}: ${x.r.finding} Hardware Rule: ${x.r.hardwareRule}`).join('\n');
        const sysPrompt = `You are IGNIS-0G, a NASA Physical Sciences Informatics (PSI) microgravity combustion expert.
Current cabin telemetry:
- O2: ${S.o2.toFixed(1)}% | Pressure: ${S.p.toFixed(1)} kPa | Vent airflow: ${S.v.toFixed(1)} cm/s | Gravity: ${S.g} g
- Fire-effective O2: ${eff().toFixed(1)}% | Crew pO2: ${pO2().toFixed(1)} kPa | Bends protection: ${bends().toFixed(0)}%

Top matched NASA PSI Investigations:
${topPSI}

Analyze the user question and return a valid JSON object ONLY with the following exact keys:
"verdict": 2-3 precise sentences tying live cabin telemetry to empirical test numbers (e.g. BASS-II O4, SoFIE-GEL Case 3, GMT175-T9).
"hardwareRule": actionable spacecraft engineering design rule.
"acronym": top relevant PSI acronym (e.g. BASS-II, FLEX, SAME, SoFIE-GEL).
Do not wrap in markdown or backticks. Return pure JSON.`;

        let raw = '';
        if (apiKey.startsWith('AIza')) {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: sysPrompt + '\n\nUser Question: ' + q }] }], generationConfig: { temperature: 0.2 } })
          });
          if (!res.ok) throw new Error('Gemini API ' + res.status);
          const d = await res.json();
          raw = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: q }], temperature: 0.2 })
          });
          if (!res.ok) throw new Error('API ' + res.status);
          const d = await res.json();
          raw = d.choices?.[0]?.message?.content || '';
        }

        const clean = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        const p = JSON.parse(clean);
        if (p && p.verdict && p.hardwareRule) {
          const matchedRec = PSI_DB.find(r => r.acronym.toLowerCase() === (p.acronym || '').toLowerCase()) || rankPSI()[0].r;
          const srcs = [matchedRec, PSI_DB.find(r => r.pillar === matchedRec.pillar && r.id !== matchedRec.id)].filter(Boolean);
          ans.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h3 style="margin:0">SI LIVE SYNTHESIS · <span style="color:var(--amb)">${matchedRec.acronym}</span> <span style="font:9px var(--px);color:#46e68a">[LIVE LLM]</span></h3><span class="tag" style="margin:0">${matchedRec.pillar.toUpperCase()}</span></div><p><b>VERDICT</b>${p.verdict}</p><p><b>HARDWARE RULE</b>${p.hardwareRule}</p><div><b style="font:8px var(--px);color:var(--amb);display:block;margin:6px 0 4px">VERIFIED SOURCES</b>${srcs.map(r => `${chip(r)} <a class="pchip" href="${rl(r)[1]}" target="_blank" rel="noopener">[${r.acronym} · ${rl(r)[0]} ↗]</a>`).join(' ')}</div>`;
          sfx.ok();
          return;
        }
      } catch (err) {
        console.warn('Live SI query failed, falling back to deterministic offline model:', err);
      }
    }
    askSIOffline(q);
  }

  const sBtn = $('#siSynth');
  if (sBtn) sBtn.onclick = () => askSI($('#siQuery').value);
  const sIn = $('#siQuery');
  if (sIn) sIn.onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      askSI(e.target.value);
    }
  };
  document.querySelectorAll('.pchip[data-q]').forEach(b => {
    b.onclick = () => {
      sfx.tick();
      askSI(b.dataset.q);
    };
  });

  /* ===== modeling data extractor (CSV + JSON) ===== */
  function modelRows() {
    return MAT.flatMap(m => FLOWS.map(f => {
      const lt = loi(m, S.g, f),
        l1 = loi(m, 1, 0);
      return {
        material: m.n,
        oxygen_pct: +S.o2.toFixed(2),
        pressure_kpa: +S.p.toFixed(2),
        cabin_airflow_cms: +S.v.toFixed(2),
        gravity_g: S.g,
        fire_effective_o2_pct: +eff().toFixed(2),
        crew_po2_kpa: +pO2().toFixed(2),
        bends_protection_pct: +bends().toFixed(1),
        airflow_cms: f,
        limiting_o2_index_target_g: +lt.toFixed(3),
        limiting_o2_index_1g: +l1.toFixed(3),
        negative_margin_delta: +(l1 - lt).toFixed(3),
        spread_rate_target_g_mms: +sp(m, S.g, f).toFixed(4),
        spread_rate_1g_mms: +sp(m, 1, f).toFixed(4),
        floor_basis: m.b0,
        earth_limit_basis: m.b1,
        spread_basis: m.bv
      };
    }));
  }

  function dlFile(n, mime, t) {
    const b = new Blob([t], { type: mime + ';charset=utf-8' }),
      u = URL.createObjectURL(b),
      a = document.createElement('a');
    a.href = u;
    a.download = n;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 1500);
  }

  function flashX(t) {
    ['#xmsg', '#xmsg2'].forEach(i => {
      const e = $(i);
      if (!e) return;
      e.textContent = t;
      clearTimeout(e._h);
      e._h = setTimeout(() => e.textContent = '', 3000);
    });
  }

  function exCSV() {
    const r = modelRows(),
      k = Object.keys(r[0]);
    dlFile('ignis-0g-modeling-data.csv', 'text/csv', k.join(',') + '\n' + r.map(o => k.map(c => o[c]).join(',')).join('\n') + '\n');
    sfx.ok();
    flashX('CSV: ' + r.length + ' ROWS');
  }

  function exJSON() {
    const r = modelRows();
    dlFile('ignis-0g-modeling-data.json', 'application/json', JSON.stringify({
      tool: 'IGNIS-0G',
      generated_utc: new Date().toISOString(),
      disclaimer: 'Reduced-order model calibrated to measured ISS data where available (fabric, acrylic, Nomex; see the basis columns). Silicone and ETFE are estimates, and everything at lunar gravity is an extrapolation. Not CFD and not NASA-STD-6001 qualification.',
      definitions: {
        limiting_o2_index_target_g: 'effective O2 % needed to sustain a flame at gravity_g and airflow_cms',
        limiting_o2_index_1g: 'Earth six-inch-test reference limit (1 g, still air)',
        negative_margin_delta: 'limiting_o2_index_1g minus limiting_o2_index_target_g; positive means space sustains flame below the Earth limit',
        spread_rate_1g_mms: '1 g spread rate at the same airflow_cms'
      },
      cabin: {
        oxygen_pct: S.o2,
        pressure_kpa: S.p,
        airflow_cms: S.v,
        gravity_g: S.g,
        fire_effective_o2_pct: +eff().toFixed(2),
        crew_po2_kpa: +pO2().toFixed(2),
        bends_protection_pct: +bends().toFixed(1)
      },
      sweep: r,
      top_psi_matches: rankPSI().slice(0, 5).map(x => ({
        acronym: x.r.acronym,
        match_pct: x.m,
        doi: x.r.doi,
        ntrs_id: x.r.ntrs,
        psi_url: PSI_URL
      }))
    }, null, 2) + '\n');
    sfx.ok();
    flashX('JSON READY');
  }

  ['xcsv', 'xcsv2'].forEach(i => {
    const btn = $('#' + i);
    if (btn) btn.onclick = exCSV;
  });
  ['xjson', 'xjson2'].forEach(i => {
    const btn = $('#' + i);
    if (btn) btn.onclick = exJSON;
  });

  /* ===== step 7: earth spin-off translator ===== */
  const SPIN = [
    {
      t: 'FLEX → DATA ROOMS',
      tag: 'FINE MIST, NO FLOOD',
      on: false,
      sel: 0,
      disc: 'After the visible flame went out, heptane droplets kept vaporizing in an invisible cool flame, and inert diluents set the oxygen limit for burning droplets.',
      earth: 'Concept: in data centers and clean rooms, hold fine water-mist or inert-gas release past visible knock-down and confirm extinguishment with a thermal channel, using far less water than flooding the room.',
      cav: 'Mist and gas dosing needs fire-protection engineering and standard testing. This is a translation concept, not a NASA result.',
      refs: [['PSI | DOI', 'https://doi.org/10.1007/s12217-014-9372-2'], ['FLEX-2 DOI', 'https://doi.org/10.1007/s12217-024-10115-x']],
      rd: () => SPIN[0].on ? 'EARTH: HOLD MIST UNTIL THE THERMAL VIEW CLEARS. NO FLOODING.' : 'SPACE: THE CAMERA SAYS OUT, BUT THE THERMAL VIEW SEES A RING.'
    },
    {
      t: 'SAME → HOME ALARMS',
      tag: 'NO FALSE ALARMS',
      on: false,
      disc: 'SAME gave the first real-time smoke-aerosol data in orbit, and low gravity lets smoke particles linger and clump into larger aggregates than detectors were designed around.',
      earth: 'Concept: smoke alarms in homes and high-rises that combine two wavelengths and particle-size cues to separate steam and dust from smoldering aerosol, cutting nuisance alarms without slowing real ones.',
      cav: 'Earth smoke differs from orbital smoke. The size cues must be re-measured in ground tests. Translation concept, not a NASA claim.',
      refs: [['PSI | DOI', 'https://doi.org/10.4271/2009-01-2468'], ['NTRS 20040053578', 'https://ntrs.nasa.gov/citations/20040053578']],
      rd: () => SPIN[1].on ? 'EARTH: STEAM IS IGNORED, SMOKE SOUNDS THE ALARM.' : 'SPACE: SMOKE CLUMPS BIGGER, SO STOCK DETECTORS CAN MISS IT.'
    },
    {
      t: 'BASS-II → HVAC + PPE',
      tag: 'AIRFLOW CAN FEED A FIRE',
      on: false,
      disc: 'In BASS-II, materials burned at lower oxygen than on Earth, and gentle airflow both sustained flames and, at the extremes, put them out. Saffire repeated this at spacecraft scale.',
      earth: 'Concept: high-rise stairwell and duct smoke-control logic that avoids air speeds which sustain a small fire, and fabric tests for firefighter thermal barriers at low-flow conditions.',
      cav: 'On Earth, buoyancy dominates building fires, which microgravity data cannot show. Use it to guide tests, not replace them. Translation concept.',
      refs: [['BASS-II NTRS', 'https://ntrs.nasa.gov/citations/20160000593'], ['Saffire VI NTRS', 'https://ntrs.nasa.gov/citations/20240002981']],
      rd: () => {
        const b = S.v >= M.dangerLo && S.v <= M.dangerHi;
        return SPIN[2].on
          ? `EARTH: A FAN AT ${S.v.toFixed(1)} CM/S ${b ? 'CAN FEED' : 'IS OUTSIDE THE BAND OF'} A SMALL FLAME.`
          : `SPACE: YOUR VENT AT ${S.v.toFixed(1)} CM/S IS ${b ? 'INSIDE' : 'OUTSIDE'} THE 2–15 CM/S BAND.`;
      }
    }
  ];

  let SEL7 = 0;
  SPIN.forEach((o, i) => {
    const d = document.createElement('div');
    d.className = 'card' + (i ? '' : ' sel');
    d.innerHTML = `<div class="cv"><canvas width="240" height="130"></canvas></div><div class="meta"><h3>${o.t}</h3><small class="rd"></small><div class="row"><button class="a">▶ SIMULATE EARTH VS SPACE</button></div></div>`;
    $('#spinCards').appendChild(d);
    o.d = d;
    o.cv = d.querySelector('canvas');
    o.x = o.cv.getContext('2d');
    o.rdE = d.querySelector('.rd');
    d.onclick = e => {
      if (e.target.closest('button')) return;
      sel7(i);
    };
    d.querySelector('.a').onclick = () => {
      o.on = !o.on;
      sfx.tick();
      sel7(i);
    };
  });

  function sel7(i) {
    SEL7 = i;
    SPIN.forEach((o, j) => o.d.classList.toggle('sel', j === i));
    updSpin();
  }

  function updSpin() {
    SPIN.forEach(o => {
      if (o.rdE) o.rdE.textContent = o.rd();
      const b = o.d ? o.d.querySelector('.a') : null;
      if (b) {
        b.textContent = o.on ? '◀ SHOW SPACE FINDING' : '▶ SHOW EARTH DEPLOYMENT';
        b.classList.toggle('on', o.on);
      }
    });
    const o = SPIN[SEL7];
    const sd = $('#spinDetail');
    if (sd && o) {
      sd.innerHTML = `<h3>SPACE DISCOVERY → EARTH DEPLOYMENT · ${o.t}</h3><p><b>SPACE DISCOVERY</b>${o.disc}</p><p><b>EARTH CONCEPT</b>${o.earth}</p><p><b>CAVEAT</b>${o.cav}</p><div>${o.refs.map(r => `<a class="pchip" href="${r[1]}" target="_blank" rel="noopener">[${r[0]} ↗]</a>`).join('')}</div>`;
    }
  }

  const SPD = [
    (x, on, t) => {
      const c = t % 7;
      if (!on) {
        const I = c < 2.2 ? 1 : (c < 2.9 ? 1 - (c - 2.2) / 0.7 : 0);
        x.strokeStyle = '#c9c2b0';
        x.lineWidth = 3;
        x.beginPath();
        x.moveTo(90, 150);
        x.lineTo(390, 150);
        x.stroke();
        x.fillStyle = '#d8c8a0';
        x.beginPath();
        x.arc(240, 150, 16, 0, 7);
        x.fill();
        if (I > 0.01) flame(x, 240, 148, 64, 0, I, t);
        if (c > 2.2) {
          x.save();
          x.globalCompositeOperation = 'lighter';
          x.strokeStyle = `rgba(255,120,210,${0.5 + 0.3 * Math.sin(t * 6.28)})`;
          x.lineWidth = 5;
          x.beginPath();
          x.arc(240, 150, 78 + 8 * Math.sin(t * 6.28), 0, 7);
          x.stroke();
          x.restore();
        }
        x.fillStyle = '#fff';
        x.textAlign = 'left';
        x.fillText('SPACE: DROPLET', 30, 36);
        x.textAlign = 'right';
        x.fillStyle = c > 2.2 ? '#ff9bd6' : '#ffb199';
        x.fillText(c > 2.2 ? 'IR: RING' : 'CAM: FLAME', 450, 36);
      } else {
        for (let k = 0; k < 3; k++) {
          const x0 = 80 + k * 120;
          x.fillStyle = '#10253a';
          x.fillRect(x0, 70, 90, 160);
          x.strokeStyle = '#5aa9c8';
          x.lineWidth = 2;
          x.strokeRect(x0, 70, 90, 160);
          for (let j = 0; j < 6; j++) {
            x.fillStyle = Math.sin(t * 3 + j + k * 2) > 0 ? '#46e68a' : '#1b4a35';
            x.fillRect(x0 + 10, 82 + j * 24, 10, 6);
          }
        }
        const I = c < 2.6 ? 1 : (c < 4 ? 1 - (c - 2.6) / 1.4 : 0);
        if (I > 0.01) flame(x, 245, 228, 46, 1, I, t);
        if (c > 2.6) {
          x.fillStyle = 'rgba(210,245,255,.7)';
          for (let n = 0; n < 70; n++) x.fillRect(150 + ((n * 37) % 190), 40 + ((t * 70 + n * 13) % 190), 4, 4);
        }
        x.fillStyle = '#fff';
        x.textAlign = 'left';
        x.fillText('EARTH: DATA ROOM', 30, 36);
        x.textAlign = 'right';
        x.fillStyle = c < 2.6 ? '#ffb199' : (c < 5.5 ? '#7CE9FF' : '#9fe0b0');
        x.fillText(c < 2.6 ? 'FIRE' : (c < 5.5 ? 'MIST ON' : 'IR: CLEAR'), 450, 36);
      }
    },
    (x, on, t) => {
      x.textAlign = 'left';
      const cl = (px, py, r, col) => {
        x.fillStyle = col;
        for (let k = 0; k < 5; k++) {
          x.beginPath();
          x.arc(px + Math.cos(k * 1.7 + py) * r * 0.8, py + Math.sin(k * 2.1 + px * 0.1) * r * 0.8, r * 0.6, 0, 7);
          x.fill();
        }
      };
      if (!on) {
        for (let n = 0; n < 12; n++) cl(((t * 16 + n * 71) % 540) - 30, 40 + ((n * 47) % 200), 16 + (n % 3) * 5, 'rgba(170,190,210,.65)');
        x.fillStyle = '#fff';
        x.fillText('SPACE: BIG CLUMPS', 30, 36);
      } else {
        x.fillStyle = '#2c3a4d';
        x.fillRect(190, 50, 100, 22);
        x.fillStyle = (t % 3.5) > 2 ? '#ee3b24' : '#4a1c18';
        x.fillRect(232, 56, 16, 10);
        for (let n = 0; n < 16; n++) {
          x.fillStyle = 'rgba(205,232,255,.7)';
          x.beginPath();
          x.arc(120 + Math.sin(n * 2 + t) * 16, 250 - ((t * 50 + n * 18) % 190), 5, 0, 7);
          x.fill();
        }
        for (let n = 0; n < 7; n++) cl(360 + Math.sin(n + t) * 12, 250 - ((t * 40 + n * 30) % 190), 9, 'rgba(120,130,145,.8)');
        x.fillStyle = '#fff';
        x.fillText('EARTH: ALARM', 30, 36);
        x.textAlign = 'right';
        x.fillStyle = '#7CE9FF';
        x.fillText('STEAM IGNORED', 450, 36);
      }
    },
    (x, on, t) => {
      const v = S.v,
        b = v >= M.dangerLo && v <= M.dangerHi;
      x.textAlign = 'left';
      if (!on) {
        x.strokeStyle = 'rgba(99,200,242,.5)';
        x.lineWidth = 2;
        x.setLineDash([14, 16]);
        x.lineDashOffset = -t * (10 + v * 5);
        [70, 110, 210].forEach(y => {
          x.beginPath();
          x.moveTo(0, y);
          x.lineTo(480, y);
          x.stroke();
        });
        x.setLineDash([]);
        x.fillStyle = '#d4a95f';
        x.fillRect(130, 172, 240, 10);
        x.save();
        x.translate(200, 170);
        x.scale(1 + clamp(v * 0.05, 0, 1.1), 1);
        flame(x, 0, 0, 60, 0, 1, t);
        x.restore();
        x.fillStyle = '#fff';
        x.fillText('SPACE: VENT ' + v.toFixed(1), 30, 36);
        x.textAlign = 'right';
        x.fillStyle = b ? '#ffb199' : '#9fe0b0';
        x.fillText(b ? 'IN BAND' : 'OUT BAND', 450, 36);
      } else {
        x.strokeStyle = '#5aa9c8';
        x.lineWidth = 3;
        x.strokeRect(170, 60, 140, 190);
        for (let k = 1; k < 4; k++) {
          x.beginPath();
          x.moveTo(170, 60 + k * 47);
          x.lineTo(310, 60 + k * 47);
          x.stroke();
        }
        x.strokeStyle = 'rgba(99,200,242,.6)';
        x.setLineDash([12, 14]);
        x.lineDashOffset = t * (14 + v * 4);
        x.beginPath();
        x.moveTo(240, 250);
        x.lineTo(240, 60);
        x.stroke();
        x.setLineDash([]);
        x.save();
        x.translate(240, 246);
        x.rotate(Math.sin(t * 3) * 0.05);
        flame(x, 0, 0, 38, 1, b ? 1 : 0.5, t);
        x.restore();
        x.fillStyle = '#fff';
        x.fillText('EARTH: STAIRWELL', 30, 36);
        x.textAlign = 'right';
        x.fillStyle = b ? '#ffb199' : '#9fe0b0';
        x.fillText(b ? 'FAN FEEDS' : 'FAN OK', 450, 36);
      }
    }
  ];

  function spinDraw(t, dt) {
    SPIN.forEach((o, i) => {
      if (!vis(o.cv)) return;
      const x = o.x;
      x.setTransform(0.5, 0, 0, 0.5, 0, 0);
      x.fillStyle = '#071324';
      x.fillRect(0, 0, 480, 260);
      grid(x, 480, 260);
      x.font = "16px 'Press Start 2P',monospace";
      SPD[i](x, o.on, t, dt);
    });
  }

  /* ===== render static content from DATA ===== */
  $('#histGrid').innerHTML = DATA.timeline.map(e => `<div${e.fut ? ' class="fut"' : ''}><b>${e.y}</b>${e.t}<a href="${e.url}" target="_blank" rel="noopener">[${e.src} ↗]</a></div>`).join('');
  $('#factsBody').innerHTML = DATA.facts.map(f => `<p><b>${f.h}</b> ${f.t}${f.link ? ` <a href="${f.link[1]}" target="_blank" rel="noopener">${f.link[0]}</a>` : ''}</p>`).join('');

  /* ===== step 8: reality checks, measured vs model ===== */
  const IDX = {
    PMMA: 0,
    SIBAL: MAT.findIndex(m => /cotton/i.test(m.n)),
    NOMEX: MAT.findIndex(m => /nomex/i.test(m.n))
  };

  const med = a => {
    const b = [...a].sort((x, y) => x - y), n = b.length;
    return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : NaN;
  };
  const rmsf = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);

  function measPts() {
    const P = [];
    DATA.measured.rows.forEach(r => {
      if (r.reused || r.o2_flag) return;
      const c = r.comment, add = (u, b) => P.push({ id: r.test, o2: r.o2_pct, u, burn: b });
      if (c === 'No ignition') {
        add(r.flow_start, false);
        return;
      }
      add(r.flow_start, true);
      if (r.flow_end !== r.flow_start) add(r.flow_end, !(c === 'Quenched' || c === 'Blow-off'));
    });
    return P;
  }

  function chart(id, o) {
    const c = $('#' + id);
    if (!c) return;
    const x = c.getContext('2d'), W = 720, H = 440, L = 62, Rr = 16, T = 34, B = 48,
      f = o.xlog ? Math.log10 : (v => v);
    const X = u => L + (f(u) - f(o.x0)) / (f(o.x1) - f(o.x0)) * (W - L - Rr),
      Y = v => H - B - (v - o.y0) / (o.y1 - o.y0) * (H - T - B);
    x.clearRect(0, 0, W, H);
    x.fillStyle = '#071324';
    x.fillRect(0, 0, W, H);
    x.font = "19px 'VT323',monospace";
    x.lineWidth = 1;
    o.yt.forEach(v => {
      x.strokeStyle = 'rgba(41,168,224,.22)';
      x.beginPath();
      x.moveTo(L, Y(v));
      x.lineTo(W - Rr, Y(v));
      x.stroke();
      x.fillStyle = '#9cc3d6';
      x.textAlign = 'right';
      x.fillText(o.yf ? o.yf(v) : v, L - 8, Y(v) + 5);
    });
    o.xt.forEach(v => {
      x.strokeStyle = 'rgba(41,168,224,.16)';
      x.beginPath();
      x.moveTo(X(v), T);
      x.lineTo(X(v), H - B);
      x.stroke();
      x.fillStyle = '#9cc3d6';
      x.textAlign = 'center';
      x.fillText(v, X(v), H - B + 20);
    });
    x.fillStyle = '#cfe8ff';
    x.textAlign = 'center';
    x.fillText(o.xl, (L + W - Rr) / 2, H - 8);
    x.textAlign = 'left';
    x.fillText(o.yl, L, T - 14);
    (o.h || []).forEach(([v, col, t, dy]) => {
      x.strokeStyle = col;
      x.lineWidth = 2;
      x.setLineDash([10, 7]);
      x.beginPath();
      x.moveTo(L, Y(v));
      x.lineTo(W - Rr, Y(v));
      x.stroke();
      x.setLineDash([]);
      x.fillStyle = col;
      x.textAlign = 'right';
      x.fillText(t, W - Rr - 6, Y(v) + dy);
    });
    (o.c || []).forEach(cv => {
      x.strokeStyle = cv.color;
      x.lineWidth = cv.w || 3;
      x.setLineDash(cv.dash || []);
      x.beginPath();
      let first = 1;
      for (let k = 0; k <= 160; k++) {
        const u = o.xlog ? o.x0 * Math.pow(o.x1 / o.x0, k / 160) : o.x0 + (o.x1 - o.x0) * k / 160,
          yv = cv.fn(u);
        if (!isFinite(yv)) continue;
        const yy = Y(clamp(yv, o.y0, o.y1));
        first ? x.moveTo(X(u), yy) : x.lineTo(X(u), yy);
        first = 0;
      }
      x.stroke();
      x.setLineDash([]);
    });
    (o.p || []).forEach(p => {
      const px = X(p.x), py = Y(p.y);
      if (py < T - 6 || py > H - B + 6) return;
      x.lineWidth = 2;
      x.strokeStyle = '#0B0E14';
      x.fillStyle = p.c;
      if (p.s === 'x') {
        x.strokeStyle = p.c;
        x.lineWidth = 4;
        x.beginPath();
        x.moveTo(px - 7, py - 7);
        x.lineTo(px + 7, py + 7);
        x.moveTo(px + 7, py - 7);
        x.lineTo(px - 7, py + 7);
        x.stroke();
      } else if (p.s === 'd') {
        x.beginPath();
        x.moveTo(px, py - 9);
        x.lineTo(px + 9, py);
        x.lineTo(px, py + 9);
        x.lineTo(px - 9, py);
        x.closePath();
        x.fill();
        x.stroke();
      } else if (p.s === 's') {
        x.fillRect(px - 7, py - 7, 14, 14);
        x.strokeRect(px - 7, py - 7, 14, 14);
      } else {
        x.beginPath();
        x.arc(px, py, 7, 0, 7);
        x.fill();
        x.stroke();
      }
    });
    x.font = "18px 'VT323',monospace";
    x.textAlign = 'left';
    (o.lg || []).forEach((l, i) => {
      const cx = L + 14 + (i % 2) * 270, cy = T + 8 + Math.floor(i / 2) * 22;
      x.fillStyle = l[0];
      x.fillRect(cx, cy, 12, 12);
      x.fillStyle = '#dff6ff';
      x.fillText(l[1], cx + 20, cy + 11);
    });
  }

  const LEG = [['#FFC145', 'first model (dashed)'], ['#7CE9FF', 'calibrated model (game)']];

  function rcA() {
    const m = MAT[IDX.SIBAL],
      P = measPts(),
      n = P.length,
      a0 = P.filter(p => (p.o2 >= loiV1('SIBAL', 0, p.u)) === p.burn).length,
      a1 = P.filter(p => (p.o2 >= loi(m, 0, p.u)) === p.burn).length;
    const S_vals = DATA.sibalspread.map(([w, o, u, v]) => ({ v, m1: spOf(m, 0, o, 101.3, u) / v, m0: spV1('SIBAL', o, u) / v }));
    chart('rcA', {
      x0: 0, x1: 60, y0: 15, y1: 24, xt: [0, 10, 20, 30, 40, 50, 60], yt: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24], xl: 'AIRFLOW (CM/S)', yl: 'O2 (%)',
      c: [{ fn: u => loiV1('SIBAL', 0, u), color: '#FFC145', dash: [8, 6] }, { fn: u => loi(m, 0, u), color: '#7CE9FF' }],
      p: P.map(p => ({ x: p.u, y: p.o2, s: p.burn ? 'o' : 'x', c: p.burn ? '#46e68a' : '#ff5a47' })),
      lg: [['#46e68a', 'flame sustained (measured)'], ['#ff5a47', 'no flame (measured)'], ...LEG]
    });
    $('#rcA2').innerHTML = `<h3>MODEL VS MEASURED · FABRIC</h3><div class="kv"><div><div class="big">${a0}/${n}</div><div class="lab">FIRST MODEL AGREES</div></div><div><div class="big">${a1}/${n}</div><div class="lab">CALIBRATED MODEL</div></div></div>
<p><b class="k">FLAME LIMITS</b>The real fabric did not ignite at 16.4% and 16.8% oxygen, and quenched when airflow was turned down to roughly 2 to 5 cm/s at oxygen up to 18.7%. The first model predicted flames at those conditions. The calibrated floor is ${m.l0}%.</p>
<p><b class="k">SPREAD RATE</b>Measured steady spread was about 0.8 to 2.8 mm/s (read from NASA's Figure 7.4, ±0.1). Model versus measured, median ratio: ${med(S_vals.map(q => q.m0)).toFixed(1)}× before, ${med(S_vals.map(q => q.m1)).toFixed(1)}× after; within a factor of 2 for ${S_vals.filter(q => q.m1 >= 0.5 && q.m1 <= 2).length} of ${S_vals.length} points. The model is weakest right at the limit.</p>
<p class="sm">${n} outcomes from ${new Set(P.map(p => p.id)).size} tests; 10 more tests are excluded (reused samples, or an O2 reading the authors flag as inaccurate). A blank comment is read as a sustained flame. Source: Table 7.1, checked against the report.</p>`;
  }

  function rcB() {
    const m = MAT[IDX.PMMA],
      G = DATA.gel.rows.map(r => ({ u: r.flow, o: r.o2 * Math.pow(r.p_atm, M.presExp), mode: r.mode })),
      R_pts = [...G, { u: 1, o: 21, mode: 'rad' }, { u: 3, o: 16, mode: 'rad' }];
    const e0 = R_pts.map(r => loiV1('PMMA', 0, r.u) - r.o),
      e1 = R_pts.map(r => loi(m, 0, r.u) - r.o);
    chart('rcB', {
      xlog: 1, x0: 0.3, x1: 100, y0: 12, y1: 24, xt: [0.5, 1, 2, 5, 10, 20, 50, 100], yt: [12, 14, 16, 18, 20, 22, 24], xl: 'AIRFLOW (CM/S, LOG SCALE)', yl: 'O2 (%)',
      h: [[16, '#FFC145', 'NASA: 1 g blowoff, 1/4 in rod 16%', -8], [13.6, '#7CE9FF', 'NASA: steady spread in BASS-II 13.6%', 20]],
      c: [{ fn: u => loiV1('PMMA', 0, u), color: '#FFC145', dash: [8, 6] }, { fn: u => loi(m, 0, u), color: '#7CE9FF' }],
      p: R_pts.map(r => ({ x: r.u, y: r.o, s: r.mode === 'quenching' ? 'x' : (r.mode === 'blowoff' ? 'd' : (r.mode === 'rad' ? 's' : 'o')), c: r.mode === 'quenching' ? '#ff5a47' : (r.mode === 'blowoff' ? '#FFC145' : (r.mode === 'rad' ? '#ff9bd6' : '#46e68a')) })),
      lg: [['#ff5a47', 'sphere quenching'], ['#FFC145', 'sphere blowoff'], ['#46e68a', 'sphere intermediate'], ['#ff9bd6', 'thin sheet extinction'], ...LEG.map(l => [l[0], l[1]])]
    });
    const gap = m.l1 - m.l0;
    $('#rcB2').innerHTML = `<h3>MODEL VS MEASURED · ACRYLIC LIMITS</h3><div class="kv"><div><div class="big">${rmsf(e0).toFixed(1)}</div><div class="lab">FIRST MODEL ERROR (O2 PTS)</div></div><div><div class="big">${rmsf(e1).toFixed(1)}</div><div class="lab">CALIBRATED ERROR</div></div></div>
<p><b class="k">WHAT WAS MEASURED</b>Five extinction tests of a 4 cm acrylic sphere (SoFIE-GEL, Table 1) and the radiative extinction velocity of thin acrylic: 1 cm/s at 21% O2 and 3 cm/s at 16% (Table 2.1, experiment). Pressure-corrected oxygen is plotted.</p>
<p><b class="k">WHAT CHANGED</b>The first model could not quench at 21% and its blow-off rose far too steeply (22% at 50 cm/s versus about 15% measured). The fit uses the measured floor (13.6%) and 1 g blowoff (16%) as fixed anchors.</p>
<p><b class="k">NASA'S MARGIN</b>The model's Earth-versus-space gap for acrylic is now ${gap.toFixed(1)} points (16.0 vs 13.6), NASA's stated negative margin of at least 2.4. The GEL authors note limits also depend on sample size, which the model ignores.</p>
<p class="sm">${R_pts.length} measured limit points: 5 sphere (GEL Table 1) and 2 thin-sheet values. Error is the root-mean-square difference in oxygen percentage points.</p>`;
  }

  function rcC() {
    const m = MAT[IDX.PMMA], pts = [];
    DATA.nca.forEach(r => {
      if (!r[5]) return;
      const o = (r[7] + r[8]) / 2;
      r[4].forEach((u, i) => pts.push({ u, v: r[5][i], o }));
    });
    const band = o => o < 19 ? '#7CE9FF' : (o < 21 ? '#46e68a' : '#FFC145'),
      r1 = pts.map(p => spOf(m, 0, p.o, 101.3, p.u) / p.v),
      r0 = pts.map(p => spV1('PMMA', p.o, p.u) / p.v),
      in2 = a => a.filter(v => v >= 0.5 && v <= 2).length;
    chart('rcC', {
      x0: 0, x1: 25, y0: 0, y1: 0.2, xt: [0, 5, 10, 15, 20, 25], yt: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2], yf: v => v.toFixed(2), xl: 'OPPOSED AIRFLOW (CM/S)', yl: 'SPREAD RATE (MM/S)',
      c: [[18, '#7CE9FF'], [20, '#46e68a'], [22, '#FFC145']].map(([o, col]) => ({ fn: u => u < 0.5 ? NaN : spOf(m, 0, o, 101.3, u), color: col, w: 2 })),
      p: pts.map(p => ({ x: p.u, y: p.v, s: 'o', c: band(p.o) })),
      lg: [['#7CE9FF', 'O2 under 19%'], ['#46e68a', 'O2 19 to 21%'], ['#FFC145', 'O2 over 21%'], ['#ff5a47', 'first model: ~1.7, off chart']]
    });
    const v10 = spV1('PMMA', 20, 10);
    $('#rcC2').innerHTML = `<h3>MODEL VS MEASURED · SPREAD RATE</h3><div class="kv"><div><div class="big">${med(r0).toFixed(0)}×</div><div class="lab">FIRST MODEL, MEDIAN TOO FAST</div></div><div><div class="big">${med(r1).toFixed(1)}×</div><div class="lab">CALIBRATED MEDIAN</div></div></div>
<p><b class="k">WHAT WAS MEASURED</b>${pts.length} spread rates from 18 tests of flat acrylic (1 to 5 mm thick, one or two sides burning). Measured rates are only 0.01 to 0.14 mm/s. The first model said about ${v10.toFixed(1)} mm/s at 20% O2 and 10 cm/s, far above the largest measured rate (${Math.max(...pts.map(p => p.v))} mm/s).</p>
<p><b class="k">AFTER CALIBRATION</b>${in2(r1)} of ${pts.length} points are within a factor of 2 (${in2(r0)} before). The three curves are the model at 18, 20 and 22% O2. Thickness and one- versus two-sided burning are not modeled, which explains much of the remaining scatter.</p>
<p class="sm">Oxygen per point is the mean of the test's start and end readings, because oxygen fell during each test. Source: Table 5.1, NASA/TM-20210011385.</p>`;
  }

  function rcD() {
    const m = MAT[IDX.NOMEX],
      N = DATA.nomex.filter(r => r[2].startsWith('Nomex')),
      w0 = N.filter(r => r[5] >= loiV1('NOMEX', 0, r[4])).length,
      w1 = N.filter(r => r[5] >= loi(m, 0, r[4])).length;
    chart('rcD', {
      x0: 0, x1: 40, y0: 16, y1: 34, xt: [0, 10, 20, 30, 40], yt: [16, 18, 20, 22, 24, 26, 28, 30, 32, 34], xl: 'AIRFLOW (CM/S)', yl: 'O2 (%)',
      c: [{ fn: u => loiV1('NOMEX', 0, u), color: '#FFC145', dash: [8, 6] }, { fn: u => loi(m, 0, u), color: '#7CE9FF' }],
      p: N.map(r => ({ x: r[4], y: r[5], s: 'x', c: '#ff5a47' })),
      lg: [['#ff5a47', 'no sustained flame (measured)'], ...LEG]
    });
    $('#rcD2').innerHTML = `<h3>MODEL VS MEASURED · NOMEX</h3><div class="kv"><div><div class="big">${w0}/${N.length}</div><div class="lab">FIRST MODEL WRONGLY BURNS</div></div><div><div class="big">${w1}/${N.length}</div><div class="lab">CALIBRATED</div></div></div>
<p><b class="k">WHAT WAS MEASURED</b>Three Nomex III samples in BASS-II at 21.0 to 22.2% oxygen and 8 to 15 cm/s concurrent flow. None ignited to a sustained flame: one flashed briefly and went out with the igniter on, one would not sustain, one flashed once. NASA calls this an excellent fire-safety result for a material used as an ISS fire barrier.</p>
<p><b class="k">LIMIT OF THIS CHECK</b>The floor (${m.l0}%) is set just above the highest oxygen tested, so it is only a lower bound. Nomex may need much more oxygen. The 28% Earth limit is an estimate, not a measurement.</p>
<p class="sm">Source: Table A.2 and section 3.1, NASA/TM-20210011385. The wax candle test in the same table is not Nomex and is not plotted.</p>`;
  }

  function rcAll() {
    rcA();
    rcB();
    rcC();
    rcD();
  }

  /* ===== data room: one registry drives tables, CSV/JSON, package and print ===== */
  const esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const csvCell = v => {
    v = String(v == null ? '' : v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };

  const MODEL_DOC = [
    ['quenchAmp', 'Radiative-quench penalty amplitude (default)', 'O2 pts', 'Raises the flame limit at near-zero airflow. Fitted to measured acrylic limits; used by materials without their own fit'],
    ['quenchDecay', 'Quench decay speed', 'cm/s', 'How fast the quench penalty fades with airflow'],
    ['blowAmp', 'Blow-off penalty amplitude', 'O2 pts', 'Raises the flame limit at high airflow'],
    ['blowRef', 'Blow-off reference speed', 'cm/s', 'Blow-off scale'],
    ['blowExp', 'Blow-off exponent', '–', 'Blow-off penalty = amplitude × (speed / reference)^exponent. Fitted to measured blowoff limits'],
    ['buoyCoef', 'Buoyant flow coefficient', 'cm/s per √g', 'Effective buoyant airflow = coefficient × √g'],
    ['presExp', 'Pressure exponent, fire-effective O2', '–', 'Fire-effective O2 = O2% × (P / reference P)^exponent'],
    ['refKpa', 'Reference pressure', 'kPa', 'Sea-level cabin pressure'],
    ['spreadPresExp', 'Pressure exponent, spread rate', '–', 'Lower pressure slows flame spread'],
    ['hypoxiaKpa', 'Crew hypoxia floor', 'kPa pO2', 'Minimum breathable oxygen partial pressure'],
    ['suitKpa', 'EVA suit pressure', 'kPa', 'Reference for the bends tissue ratio'],
    ['bendsSpan', 'Bends tissue-ratio span', '–', 'Bends protection falls linearly over this span'],
    ['dangerLo', 'Danger band, lower airflow', 'cm/s', 'Low airflow that can sustain wake acceleration'],
    ['dangerHi', 'Danger band, upper airflow', 'cm/s', 'Upper edge of the danger band'],
    ['perMaterial', 'Score per certified material', 'points', 'Cabin score = bends protection + this × materials held']
  ];

  const rng = a => a[0] === a[1] ? a[0] : a[0] + '–' + a[1];

  function srcRows() {
    const m = new Map(),
      add = (url, label, use) => {
        if (!m.has(url)) m.set(url, { label, url, use: [] });
        const e = m.get(url);
        if (!e.use.includes(use)) e.use.push(use);
      };
    DATA.facts.forEach(f => f.link && add(f.link[1], f.link[0], 'Facts: ' + f.h.replace(/\.$/, '')));
    DATA.timeline.forEach(e => add(e.url, e.src, 'Timeline ' + e.y));
    SPIN.forEach(o => o.refs.forEach(r => add(r[1], r[0], 'Spin-off: ' + o.t)));
    PSI_DB.forEach(r => {
      if (r.doi) add('https://doi.org/' + r.doi, 'DOI ' + r.doi, 'PSI: ' + r.acronym);
      if (r.ntrs) add('https://ntrs.nasa.gov/citations/' + r.ntrs, 'NTRS ' + r.ntrs, 'PSI: ' + r.acronym);
    });
    add(PSI_URL, 'NASA PSI investigations catalogue', 'PSI records (all)');
    add(DATA.measured.url, DATA.measured.label, 'Table: measured ISS flame tests; step 8');
    add(DATA.gel.url, DATA.gel.label, 'Table: SoFIE-GEL tests; step 8');
    add(DATA.tm.url, DATA.tm.label, 'Tables: flame spread, acrylic rods, Nomex, extinction velocity, fabric spread; materials; step 8');
    DATA.published.rows.forEach(r => add(r.url, r.src, 'Table: published measurements'));
    const ty = u => u.includes('doi.org') ? 'DOI' : (u.includes('ntrs.nasa.gov') ? 'NTRS' : 'Web');
    return [...m.values()].map(e => ({ type: ty(e.url), label: e.label, used_in: e.use.join('; '), url: e.url })).sort((a, b) => a.type.localeCompare(b.type) || a.label.localeCompare(b.label)).map((r, i) => ({ n: i + 1, ...r }));
  }

  const DS = [
    {
      k: 'cabin', t: 'Live cabin snapshot', live: 1, note: 'Updates as you move the dials in step 1. Source: simulation state.', cols: [['parameter', 'Parameter'], ['value', 'Value'], ['unit', 'Unit']],
      rows: () => {
        const nm = MAT.filter(m => eff() >= loi(m, S.g, S.v) && eff() < loi(m, 1, 0)).map(m => m.n),
          t = rankPSI()[0];
        return [
          ['Oxygen', S.o2.toFixed(1), '%'],
          ['Cabin pressure', S.p.toFixed(1), 'kPa'],
          ['Airflow', S.v.toFixed(1), 'cm/s'],
          ['Gravity', S.g, 'g'],
          ['Fire-effective O2', eff().toFixed(1), '%'],
          ['Crew oxygen pressure', pO2().toFixed(1) + (pO2() < M.hypoxiaKpa ? ' (hypoxic)' : ''), 'kPa'],
          ['Bends protection', bends().toFixed(0), '%'],
          ['Negative margin', nm.length ? nm.join(', ') : 'none', 'materials'],
          ['Best PSI match', t.r.acronym + ' (' + t.m + '%)', 'record']
        ].map(([parameter, value, unit]) => ({ parameter, value, unit }));
      }
    },
    {
      k: 'materials', t: 'Cabin materials and their data basis', note: 'The five materials the simulation uses. Basis: measured = copied from a NASA report; fitted = tuned to measured data; derived = computed from measured numbers; estimate = my assumption (no data in the sources); borrowed = copied from acrylic as a placeholder; bound = a limit set by measured tests.',
      cols: [['material', 'Material'], ['use', 'Typical use'], ['earth_limit', 'Earth limit (O2 %)'], ['floor', 'Microgravity floor (O2 %)'], ['spread_scale', 'Spread scale (mm/s)'], ['quench', 'Quench amplitude'], ['tag', 'Data status']],
      exp: ['material', 'use', 'earth_limit_o2_pct', 'earth_limit_basis', 'microgravity_floor_o2_pct', 'floor_basis', 'spread_scale_mms', 'spread_basis', 'quench_amplitude', 'quench_basis', 'data_status', 'source_note'],
      rows: () => MAT.map(m => ({
        material: m.n,
        use: m.u,
        earth_limit: m.l1 + ' (' + m.b1 + ')',
        floor: m.l0 + ' (' + m.b0 + ')',
        spread_scale: m.v + ' (' + m.bv + ')',
        quench: (m.qa || M.quenchAmp) + ' (' + m.bq + ')',
        tag: m.tag,
        earth_limit_o2_pct: m.l1,
        earth_limit_basis: m.b1,
        microgravity_floor_o2_pct: m.l0,
        floor_basis: m.b0,
        spread_scale_mms: m.v,
        spread_basis: m.bv,
        quench_amplitude: m.qa || M.quenchAmp,
        quench_basis: m.bq,
        data_status: m.tag,
        source_note: m.src
      }))
    },
    {
      k: 'model', t: 'Model constants', note: 'The constants the simulation, scoring and exports all read. Changing one here changes the game.', cols: [['parameter', 'Parameter'], ['value', 'Value'], ['unit', 'Unit'], ['role', 'Role']], exp: ['parameter', 'key', 'value', 'unit', 'role'],
      rows: () => MODEL_DOC.map(([key, parameter, unit, role]) => ({ parameter, key, value: M[key], unit, role }))
    },
    {
      k: 'sweep', t: 'Predicted flame spread, current cabin', live: 1, note: 'Spread rate (mm/s) at your gravity, oxygen and pressure, by airflow (cm/s). A dot means no flame. Red cells burn here although the Earth six-inch test would pass them.',
      cols: [['material', 'Material'], ...DFL.map(f => ['spread_at_' + f + '_cms_mms', f + ' cm/s'])],
      rows: () => MAT.map(m => {
        const o = { material: m.n };
        DFL.forEach(f => o['spread_at_' + f + '_cms_mms'] = +sp(m, S.g, f).toFixed(3));
        return o;
      }),
      cls: (r, k) => {
        if (k === 'material') return '';
        const f = +k.split('_')[2],
          m = MAT.find(x => x.n === r.material),
          v = r[k];
        return v === 0 ? 'z' : (eff() < loi(m, 1, 0) ? 'nm' : '');
      },
      fmt: (v, k) => k === 'material' ? v : (v === 0 ? '·' : v)
    },
    {
      k: 'psi', t: 'NASA PSI combustion investigations', note: '24 records. Identifiers appear only where verified; blank means not verified in this build. Test envelopes marked approximate in the export. Four requested names that matched no NASA record are replaced by confirmed ones (see catalogue_note in the export).',
      cols: [['acronym', 'Acronym'], ['pillar', 'Pillar'], ['gravity_g', 'Gravity (g)'], ['o2_pct', 'O2 (%)'], ['flow_cms', 'Flow (cm/s)'], ['pressure_kpa', 'kPa'], ['doi', 'DOI'], ['ntrs_id', 'NTRS']],
      exp: ['acronym', 'title', 'pillar', 'gravity_g', 'o2_pct', 'flow_cms', 'pressure_kpa', 'doi', 'ntrs_id', 'catalogue_status', 'key_finding', 'hardware_rule', 'earth_spinoff', 'catalogue_note', 'envelope_basis'],
      link: { doi: v => 'https://doi.org/' + v, ntrs_id: v => 'https://ntrs.nasa.gov/citations/' + v },
      rows: () => PSI_DB.map(r => ({
        acronym: r.acronym,
        title: r.title,
        pillar: r.pillar,
        gravity_g: rng(r.gRange),
        o2_pct: rng(r.o2Range),
        flow_cms: r.flowRange[1] === 0 ? 'quiescent' : rng(r.flowRange),
        pressure_kpa: r.p,
        doi: r.doi || '',
        ntrs_id: r.ntrs || '',
        catalogue_status: r.note ? 'substitute for a requested name' : 'listed',
        key_finding: r.finding,
        hardware_rule: r.hardwareRule,
        earth_spinoff: r.earthSpinoff,
        catalogue_note: r.note,
        envelope_basis: r.basis
      }))
    },
    {
      k: 'measured', t: 'Measured ISS flame tests (BASS and BASS-II, SIBAL fabric)', note: 'Real test log copied from the appendix of the NASA-team paper (NTRS 20150008962). Flow is shown as start→end when it was changed during the test. Reused samples and two tests flagged by the authors for a possibly inaccurate O2 reading are excluded from the model comparison in step 8.',
      cols: [['test', 'Test'], ['group', 'Set'], ['width_cm', 'Width (cm)'], ['flow', 'Flow (cm/s)'], ['o2_pct', 'O2 (%)'], ['reported_outcome', 'Reported outcome'], ['used_in_comparison', 'In step 8']],
      exp: ['test', 'group', 'width_cm', 'flow_start_cms', 'flow_end_cms', 'o2_pct', 'reported_outcome', 'used_in_comparison', 'reason_excluded'],
      rows: () => DATA.measured.rows.map(r => ({
        test: r.test,
        group: r.group,
        width_cm: r.width_cm,
        flow: r.flow_start === r.flow_end ? r.flow_start : r.flow_start + '→' + r.flow_end,
        flow_start_cms: r.flow_start,
        flow_end_cms: r.flow_end,
        o2_pct: r.o2_pct,
        reported_outcome: r.comment || '(not stated)',
        used_in_comparison: (r.reused || r.o2_flag) ? 'no' : 'yes',
        reason_excluded: r.reused ? 'reused sample' : (r.o2_flag ? 'authors flag O2 reading as possibly inaccurate' : '')
      }))
    },
    {
      k: 'nca', t: 'Measured flame spread over flat acrylic (BASS-II 20 tests)', note: 'Table 5.1 of NASA/TM-20210011385: opposed-flow spread rate versus airflow for 1 to 5 mm acrylic slabs. Flows and rates are listed in the order they were run. Oxygen fell during each test. Two tests have no tracked rate.',
      cols: [['test', 'Test'], ['thickness_mm', 'Thick (mm)'], ['width_cm', 'Width (cm)'], ['sides', 'Sides'], ['flow', 'Flow (cm/s)'], ['rate', 'Spread (mm/s)'], ['o2_initial_pct', 'O2 start (%)'], ['o2_final_pct', 'O2 end (%)'], ['burn_min', 'Burn (min)']],
      rows: () => DATA.nca.map(r => ({
        test: r[0],
        thickness_mm: r[1],
        width_cm: r[2],
        sides: r[3],
        flow: r[4].join(', '),
        rate: r[5] ? r[5].join(', ') : 'not tracked',
        o2_initial_pct: r[7],
        o2_final_pct: r[8],
        burn_min: r[6]
      }))
    },
    {
      k: 'rods', t: 'Measured acrylic rod tests (BASS-II Olson 24 tests)', note: 'Test matrix Table A.5 of NASA/TM-20210011385. Oxygen values are the calibrated start and end readings. The outcome class summarizes the observation column. Flow settings are recorded as dial positions in the source, so they are not tabulated.',
      cols: [['test', 'Test'], ['rod_mm', 'Rod (mm)'], ['rod_colour', 'Colour'], ['geometry', 'Flow geometry'], ['o2_initial_pct', 'O2 start (%)'], ['o2_final_pct', 'O2 end (%)'], ['outcome', 'Outcome'], ['observation', 'Observation']],
      rows: () => DATA.rods.map(r => ({
        test: r[0],
        rod_mm: r[1],
        rod_colour: r[2],
        geometry: r[3],
        o2_initial_pct: r[4],
        o2_final_pct: r[5],
        outcome: r[6],
        observation: r[7]
      }))
    },
    {
      k: 'nomex', t: 'Measured Nomex ignition tests (BASS-II)', note: 'Table A.2 of NASA/TM-20210011385. Flow is the air-velocity display reading. The wax candle test is included for completeness and is not Nomex.',
      cols: [['test', 'Test'], ['date', 'Date'], ['sample', 'Sample'], ['direction', 'Flow'], ['flow_cms', 'Flow (cm/s)'], ['o2_pct', 'O2 (%)'], ['observation', 'Observation']],
      rows: () => DATA.nomex.map(r => ({
        test: r[0],
        date: r[1],
        sample: r[2],
        direction: r[3],
        flow_cms: r[4],
        o2_pct: r[5],
        observation: r[6]
      }))
    },
    {
      k: 'radext', t: 'Radiative extinction velocity of thin acrylic', note: 'Table 2.1 of NASA/TM-20210011385: the flow below which steady spread cannot be sustained, for thin acrylic at 1 atm.',
      cols: [['o2_pct', 'O2 (%)'], ['experiment_mms', 'Experiment (mm/s)'], ['computation_mms', 'Computation (mm/s)'], ['theory_mms', 'Theory (mm/s)']],
      rows: () => DATA.radext.map(r => ({
        o2_pct: r[0],
        experiment_mms: r[1],
        computation_mms: r[2],
        theory_mms: r[3]
      }))
    },
    {
      k: 'sibalspread', t: 'Fabric steady spread rates (read from Figure 7.4)', note: 'Values read by eye from the plot in Figure 7.4 of NASA/TM-20210011385, so about ±0.1 mm/s and ±0.3 cm/s. They are not a table in the source.',
      cols: [['width_cm', 'Width (cm)'], ['o2_pct', 'O2 (%)'], ['flow_cms', 'Flow (cm/s)'], ['spread_mms', 'Spread (mm/s)']],
      rows: () => DATA.sibalspread.map(r => ({
        width_cm: r[0],
        o2_pct: r[1],
        flow_cms: r[2],
        spread_mms: r[3]
      }))
    },
    {
      k: 'gel', t: 'Measured SoFIE-GEL extinction tests (PMMA sphere)', note: 'Five real extinction cases copied from Table 1 of the GEL paper. Oxygen is the level at which the flame finally went out while airflow was held constant. Strain rate = 3U/R of the 4 cm sphere (R = 2 cm).',
      cols: [['case', 'Case'], ['mode', 'Extinction mode'], ['location', 'Sample location'], ['flow_cms', 'Flow (cm/s)'], ['reynolds', 'Reynolds no.'], ['strain_rate_s1', 'Strain rate (1/s)'], ['o2_pct', 'O2 at extinction (%)'], ['pressure_atm', 'p (atm)'], ['conductive_heat_loss_wcm2', 'Heat loss (W/cm²)']],
      rows: () => DATA.gel.rows.map(r => ({
        case: r.case,
        sample: r.sample,
        mode: r.mode,
        location: r.location,
        flow_cms: r.flow,
        reynolds: r.reynolds,
        strain_rate_s1: r.strain,
        o2_pct: r.o2,
        pressure_atm: r.p_atm,
        conductive_heat_loss_wcm2: r.loss == null ? 'not recorded' : r.loss
      })),
      exp: ['case', 'sample', 'mode', 'location', 'flow_cms', 'reynolds', 'strain_rate_s1', 'o2_pct', 'pressure_atm', 'conductive_heat_loss_wcm2']
    },
    {
      k: 'published', t: 'Published BASS-II and GEL measurements', note: 'Individual numbers stated in the text of three NASA papers and a poster. These are quoted values, not raw data, so each row names its source.',
      cols: [['quantity', 'Quantity'], ['value', 'Value'], ['unit', 'Unit'], ['context', 'Context'], ['source', 'Source']],
      exp: ['quantity', 'value', 'unit', 'context', 'source', 'url'],
      link: { source: null },
      rows: () => DATA.published.rows.map(r => ({
        quantity: r.q,
        value: r.v,
        unit: r.u,
        context: r.ctx,
        source: r.src,
        url: r.url
      }))
    },
    {
      k: 'timeline', t: 'Fire in space timeline', note: 'Events shown in the history section, each with its source.',
      cols: [['year', 'Year'], ['event', 'Event'], ['source', 'Source'], ['url', 'Link']],
      link: { url: v => v },
      rows: () => DATA.timeline.map(e => ({
        year: e.y,
        event: e.t,
        source: e.src,
        url: e.url
      }))
    },
    {
      k: 'translations', t: 'Earth spin-off concepts', note: 'Translation concepts drawn from the findings. They are not NASA claims.',
      cols: [['concept', 'Concept'], ['space_discovery', 'Space discovery'], ['earth_concept', 'Earth concept'], ['caveat', 'Caveat']],
      exp: ['concept', 'space_discovery', 'earth_concept', 'caveat', 'references'],
      rows: () => SPIN.map(o => ({
        concept: o.t,
        space_discovery: o.disc,
        earth_concept: o.earth,
        caveat: o.cav,
        references: o.refs.map(r => r[0] + ' ' + r[1]).join(' | ')
      }))
    },
    {
      k: 'sources', t: 'Source register', note: 'Every external link used on this page, merged by address and traced back to where it is used.',
      cols: [['n', '#'], ['type', 'Type'], ['label', 'Source'], ['used_in', 'Used in'], ['url', 'Link']],
      link: { url: v => v },
      rows: srcRows
    }
  ];

  const dsKeys = d => d.exp || d.cols.map(c => c[0]);

  function dsHTML(d) {
    const n = DS.indexOf(d) + 1, rows = d.rows();
    return `<div class="ds" id="ds-${d.k}"><h3 class="dt"><span>TABLE ${n}</span>${d.t}${d.live ? '<i class="lv">UPDATES WITH DIALS</i>' : ''}</h3><p class="dn">${d.note}</p><div class="tw"><table><thead><tr>${d.cols.map(c => `<th>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${d.cols.map(c => {
      let v = r[c[0]];
      const l = d.link && d.link[c[0]];
      const cl = d.cls ? d.cls(r, c[0]) : '';
      v = d.fmt ? d.fmt(v, c[0]) : v;
      return `<td${cl ? ` class="${cl}"` : ''}>${v === '' || v == null ? '–' : (l ? `<a href="${l(v)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(v))}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div><div class="dd"><button data-act="csv" data-k="${d.k}">CSV</button><button data-act="json" data-k="${d.k}">JSON</button><span>${rows.length} rows</span></div></div>`;
  }

  function renderDS(k) {
    const d = DS.find(x => x.k === k), el = document.getElementById('ds-' + k);
    if (el) el.outerHTML = dsHTML(d);
  }

  function renderData() {
    $('#dsheet').innerHTML = `<div class="dh"><b>IGNIS-0G · DATA APPENDIX · v${DATA.meta.version}</b><span>Generated ${new Date().toDateString()}</span></div>` + DS.map(dsHTML).join('');
    $('#dtoc').innerHTML = DS.map((d, i) => `<a class="pchip" href="#ds-${d.k}">T${i + 1} ${d.t.split(',')[0]}</a>`).join('');
  }

  const dsCSV = d => {
    const k = dsKeys(d);
    return k.join(',') + '\n' + d.rows().map(r => k.map(c => csvCell(r[c])).join(',')).join('\n') + '\n';
  };

  const dmsg = t => {
    const e = $('#dmsg');
    if (!e) return;
    e.textContent = t;
    clearTimeout(e._h);
    e._h = setTimeout(() => e.textContent = '', 3000);
  };

  $('#dsheet').onclick = e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const d = DS.find(x => x.k === b.dataset.k), k = dsKeys(d);
    sfx.tick();
    if (b.dataset.act === 'csv') dlFile('ignis-0g-' + d.k + '.csv', 'text/csv', dsCSV(d));
    else dlFile('ignis-0g-' + d.k + '.json', 'application/json', JSON.stringify({ title: d.t, note: d.note, columns: k, rows: d.rows().map(r => Object.fromEntries(k.map(c => [c, r[c]]))) }, null, 2) + '\n');
    dmsg(d.t.toUpperCase() + ' DOWNLOADED');
  };

  $('#dpkg').onclick = () => {
    dlFile('ignis-0g-data-package.json', 'application/json', JSON.stringify({
      meta: { ...DATA.meta, generated_utc: new Date().toISOString() },
      model: M,
      datasets: Object.fromEntries(DS.map(d => [d.k, { title: d.t, note: d.note, columns: dsKeys(d), rows: d.rows().map(r => Object.fromEntries(dsKeys(d).map(c => [c, r[c]]))) }]))
    }, null, 2) + '\n');
    sfx.ok();
    dmsg('PACKAGE: ' + DS.length + ' TABLES');
  };

  $('#dlong').onclick = exCSV;
  $('#dprint').onclick = () => {
    sfx.tick();
    document.body.classList.add('pd');
    renderData();
    setTimeout(() => window.print(), 60);
  };
  window.addEventListener('afterprint', () => document.body.classList.remove('pd'));

  function renderLive() {
    renderDS('cabin');
    renderDS('sweep');
  }

  /* ---------- wrap CRT frames with corner brackets ---------- */
  document.querySelectorAll('.win>canvas,.card .cv>canvas').forEach(c => {
    const w = document.createElement('div');
    w.className = 'crt';
    c.parentNode.insertBefore(w, c);
    w.appendChild(c);
    ['tl', 'tr', 'bl', 'bb'].forEach(k => {
      const i = document.createElement('i');
      i.className = 'br ' + k;
      w.appendChild(i);
    });
  });

  /* ---------- main render loop ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000;
    last = now;
    if (vis(hc)) heroDraw(t, dt);
    if (vis(lc)) labDraw(t, dt);
    if (uc && vis(uc)) uCurveDraw(t, dt);
    if (hm && vis(hm)) habMapDraw(t, dt);
    cells.forEach(c => {
      if (vis(c.cv)) drawCell(c, dt, t);
    });
    if (vis(cc)) coolDraw(t, dt);
    if (vis(sc)) smokeDraw(t, dt);
    spinDraw(t, dt);
    requestAnimationFrame(loop);
  }

  const h = new URLSearchParams(location.hash.slice(1));
  if (h.has('beat')) {
    TARGET = clamp(+h.get('beat') || 0, 0, 200);
    if (TARGET) {
      const b = $('#beat');
      b.style.display = 'inline-block';
      b.className = 'chip ok';
      b.textContent = 'Challenge: a friend certified a cabin that scored ' + TARGET + '. Can you beat it?';
    }
  }

  /* ---------- start app ---------- */
  renderData();
  rcAll();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(rcAll);
  }
  sync();
  cfReset();
  requestAnimationFrame(loop);
}

/* ---------- Bootloader with CORS / file protocol fallback ---------- */
function showBootError(err) {
  const s1 = $('#s1');
  if (s1) {
    const banner = document.createElement('div');
    banner.className = 'chip bad';
    banner.style.cssText = 'display:block;margin:16px 0;padding:14px 18px;font-size:14px;border:3px solid var(--ink);box-shadow:var(--hard);line-height:1.45;';
    banner.innerHTML = `<b>DATA LOADING BLOCKED (CORS / FILE PROTOCOL):</b> Browser prevented direct async loading of <code>./data/*.json</code> via file://.<br>To run with live NASA datasets and simulation features, start a local HTTP server: <code>python -m http.server 8000</code> and visit <code>http://localhost:8000/index.html</code>.<br><span style="font-size:11px;opacity:0.85">Details: ${err && err.message ? err.message : String(err)}</span>`;
    s1.prepend(banner);
  }
}

async function boot() {
  try {
    const [empData, psiData] = await Promise.all([
      fetch('./data/nasa_empirical_data.json').then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' loading nasa_empirical_data.json');
        return r.json();
      }),
      fetch('./data/psi_investigations.json').then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' loading psi_investigations.json');
        return r.json();
      })
    ]);
    initPhysicsData(empData, psiData);
    initApp();
  } catch (err) {
    console.error('Failed to load IGNIS-0G datasets:', err);
    showBootError(err);
  }
}

boot();
