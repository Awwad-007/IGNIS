/* src/physics.js · IGNIS-0G Calibrated Reduced-Order Microgravity Combustion Engine */

export const clamp = (a, b, c) => Math.min(c, Math.max(b, a));

export const S = {
  o2: 34,
  p: 56.5,
  v: 8,
  g: 0.16,
  tested: [],
  appr: [],
  score: 0
};

export const GL = { 1: 'Earth', 0.38: 'Mars', 0.16: 'Moon', 0: 'Orbit' };
export const FLOWS = [0, 2, 5, 8, 12, 16, 20, 30, 40];
export const DFL = [0, 2, 5, 8, 12, 16, 20, 30, 40];

export let DATA = null;
export let M = null;
export let MAT = [];
export let PSI_DB = [];
export let PSI_URL = 'https://www.nasa.gov/physical-sciences-informatics-psi/psi-investigations-by-research-area/';

export function initPhysicsData(empData, psiData) {
  DATA = empData;
  M = empData.model;
  MAT = empData.materials;
  if (psiData) {
    PSI_DB = psiData.investigations || [];
    if (psiData.psiUrl) PSI_URL = psiData.psiUrl;
  }
  return { DATA, M, MAT, PSI_DB, PSI_URL };
}

/* Calibrated combustion & limit equations */
export const q = (u, m) => ((m && m.qa) || M.quenchAmp) * Math.exp(-u / M.quenchDecay);
export const bo = u => M.blowAmp * Math.pow(u / M.blowRef, M.blowExp);
export const by = g => M.buoyCoef * Math.sqrt(g);

export const loi = (m, g, u) => {
  const e = Math.hypot(u, by(g)),
    r = bo(by(1)) + q(by(1), m);
  return m.l0 + q(e, m) + bo(e) + Math.max(0, m.l1 - m.l0 - r) * Math.sqrt(g);
};

export const eff = () => S.o2 * Math.pow(S.p / M.refKpa, M.presExp);
export const pO2 = () => S.o2 / 100 * S.p;
export const bends = () => 100 * clamp(1 - ((1 - S.o2 / 100) * S.p / M.suitKpa - 1) / M.bendsSpan, 0, 1);
export const burns = (m, g, u) => eff() >= loi(m, g, u);

export function sp(m, g, u) {
  const mg = eff() - loi(m, g, u);
  if (mg < 0) return 0;
  const ue = Math.hypot(u, by(g));
  return m.v * Math.pow(clamp(mg / 6, 0, 3), 0.7) *
    (0.4 + 0.6 * Math.min(1, Math.pow(ue / 10, 0.6))) *
    Math.max(0.05, 1 - Math.pow(ue / 55, 4)) *
    Math.pow(S.p / M.refKpa, M.spreadPresExp);
}

export const effOf = (o2, p) => o2 * Math.pow(p / M.refKpa, M.presExp);

export function spOf(m, g, o2, p, u) {
  const mg = effOf(o2, p) - loi(m, g, u);
  if (mg < 0) return 0;
  const ue = Math.hypot(u, by(g));
  return m.v * Math.pow(clamp(mg / 6, 0, 3), 0.7) *
    (0.4 + 0.6 * Math.min(1, Math.pow(ue / 10, 0.6))) *
    Math.max(0.05, 1 - Math.pow(ue / 55, 4)) *
    Math.pow(p / M.refKpa, M.spreadPresExp);
}

/* Baseline v1 functions (for Reality Check model comparisons) */
export function loiV1(k, g, u) {
  const B0 = DATA.baseline,
    qf = x => B0.quenchAmp * Math.exp(-x / B0.quenchDecay),
    bf = x => B0.blowAmp * Math.pow(x / B0.blowRef, B0.blowExp),
    p = B0.m[k],
    e = Math.hypot(u, M.buoyCoef * Math.sqrt(g)),
    b1 = M.buoyCoef;
  return p.l0 + qf(e) + bf(e) + Math.max(0, p.l1 - p.l0 - bf(b1) - qf(b1)) * Math.sqrt(g);
}

export function spV1(k, o2, u) {
  const B0 = DATA.baseline,
    mg = o2 - loiV1(k, 0, u);
  if (mg <= 0) return 0;
  return B0.m[k].v * Math.pow(clamp(mg / 6, 0, 3), 0.7) *
    (0.4 + 0.6 * Math.min(1, Math.pow(u / 10, 0.6))) *
    Math.max(0.05, 1 - Math.pow(u / 55, 4));
}

/* 24-Investigation PSI ranker */
export function rankPSI() {
  const al = MAT.some(m => eff() >= loi(m, S.g, S.v) && eff() < loi(m, 1, 0)),
    d = (x, a) => x < a[0] ? a[0] - x : x > a[1] ? x - a[1] : 0;
  return PSI_DB.map(r => {
    const g = r.gRange,
      gs = (S.g === g[0] || S.g === g[1]) ? 1 : (S.g > g[0] && S.g < g[1] ? 0.7 : (g[0] === 0 && S.g > 0 && S.g < 1 ? 0.55 : 0.2));
    let m = 100 * (0.25 * gs + 0.35 * Math.exp(-d(S.o2, r.o2Range) / 6) + 0.25 * Math.exp(-d(S.v, r.flowRange) / 12) + 0.15 * Math.exp(-Math.abs(S.p - r.p) / 35));
    if (al && r.anom) m += 6;
    return { r, m: Math.round(clamp(m, 0, 100)) };
  }).sort((a, b) => b.m - a.m);
}
