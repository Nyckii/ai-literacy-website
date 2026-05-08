// AlgorithmBias.tsx — "Fair or Fast?" (13-phase redesign)
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import mapImg from './assets/AlgorithmBiasImg/city-delivery-map.png';

// ─── Types ────────────────────────────────────────────────────────────────────

type GamePhase =
  | 'explore' | 'goalSetup' | 'assign' | 'runDispatch' | 'quickResult'
  | 'strategyToAlgo' | 'surgeSurprise' | 'aiDispatch' | 'reveal'
  | 'explainBias' | 'fixGoal' | 'fairerRound' | 'finalReflect';

type ActionSetter = (label: string, enabled: boolean, fn?: () => void) => void;

interface Hood {
  id: string; name: string; emoji: string;
  color: string; bgColor: string; textColor: string;
  pos: { x: number; y: number };
  radius: number;
  baseOrders: number; baseTime: number; minTime: number;
  tagline: string; exploreInfo: string; difficulty: string;
}

interface NResult {
  id: string; drivers: number; orders: number;
  time: number; sat: number; delivered: number;
}

// ─── Map Constants ────────────────────────────────────────────────────────────

const DEPOT = { x: 50, y: 28 };

const ROAD_PATHS: Record<string, [number, number][]> = {
  downtown:    [[50, 28], [44, 38], [35, 50], [25, 65]],
  midtown:     [[50, 28], [38, 28], [25, 33]],
  northsuburb: [[50, 28], [47, 20], [42, 17]],
  easthills:   [[50, 28], [57, 33], [65, 38], [73, 47]],
};

const HOODS: Hood[] = [
  {
    id: 'downtown', name: 'Downtown', emoji: '🏙️',
    color: '#4f46e5', bgColor: 'rgba(79,70,229,0.14)', textColor: '#4f46e5',
    pos: { x: 25, y: 65 }, radius: 9,
    baseOrders: 6, baseTime: 8, minTime: 4,
    tagline: 'Dense, fast, busy',
    difficulty: 'Easy — short trips',
    exploreInfo: 'Packed skyscrapers and restaurants. Orders come in fast and the tight city grid means drivers can complete deliveries quickly.',
  },
  {
    id: 'midtown', name: 'Midtown', emoji: '🏢',
    color: '#0891b2', bgColor: 'rgba(8,145,178,0.14)', textColor: '#0e7490',
    pos: { x: 25, y: 33 }, radius: 8,
    baseOrders: 4, baseTime: 13, minTime: 6,
    tagline: 'Mixed offices & apartments',
    difficulty: 'Medium — moderate trips',
    exploreInfo: 'A blend of office towers and apartment blocks. Steady orders through the day and manageable driving distances from HQ.',
  },
  {
    id: 'northsuburb', name: 'North Suburb', emoji: '🏘️',
    color: '#d97706', bgColor: 'rgba(217,119,6,0.14)', textColor: '#b45309',
    pos: { x: 42, y: 17 }, radius: 7,
    baseOrders: 3, baseTime: 17, minTime: 8,
    tagline: 'Quiet residential streets',
    difficulty: 'Harder — homes spread out',
    exploreInfo: 'Peaceful residential streets where homes are spread far apart. Fewer orders per shift, but each delivery covers a lot of ground.',
  },
  {
    id: 'easthills', name: 'East Hills', emoji: '🏜️',
    color: '#dc2626', bgColor: 'rgba(220,38,38,0.14)', textColor: '#b91c1c',
    pos: { x: 73, y: 47 }, radius: 9,
    baseOrders: 3, baseTime: 23, minTime: 10,
    tagline: 'Remote, winding roads',
    difficulty: 'Hardest — longest trips',
    exploreInfo: 'The most remote neighborhood. Long, winding roads mean every delivery is a journey — but the people living here need service just as much as anyone else.',
  },
];

// Biased algorithm: proportional to historical orders (Downtown=6, Midtown=4, NS=3, EH=2 = 15 total)
// 8 riders → Downtown gets 3, Midtown 2, NorthSub 2, EastHills 1
const ALGO_SEQUENCE = ['downtown', 'midtown', 'northsuburb', 'downtown', 'easthills', 'midtown', 'northsuburb', 'downtown'];

// Fairer algorithm: guaranteed minimum coverage for all neighborhoods
const FAIRER_SEQUENCE = ['downtown', 'easthills', 'midtown', 'northsuburb', 'downtown', 'easthills', 'midtown', 'northsuburb'];

// East Hills demand surge orders
const ALGO_ORDERS_SURGE: Record<string, number> = { downtown: 6, midtown: 4, northsuburb: 3, easthills: 8 };

const TOTAL_RIDERS = 8;
const GOALS = { avgTime: 20, delivered: 13 };

// ─── Simulation ───────────────────────────────────────────────────────────────

function calcTime(base: number, min: number, n: number) {
  return n === 0 ? 99 : Math.max(min, Math.round(base / Math.sqrt(n) * 10) / 10);
}
function calcSat(t: number) {
  return t >= 99 ? 0 : Math.max(0, Math.min(100, Math.round(100 - Math.max(0, t - 5) * 4)));
}
function simulate(asgn: Record<string, number>, orders?: Record<string, number>): NResult[] {
  return HOODS.map(h => {
    const ord = orders ? (orders[h.id] ?? h.baseOrders) : h.baseOrders;
    const n = asgn[h.id] ?? 0;
    const t = calcTime(h.baseTime, h.minTime, n);
    const s = calcSat(t);
    return { id: h.id, drivers: n, orders: ord, time: t, sat: s, delivered: n === 0 ? 0 : Math.min(ord, n * 2) };
  });
}
function summarize(rs: NResult[]) {
  const served = rs.filter(r => r.drivers > 0);
  const avgTime = served.length
    ? Math.round(served.reduce((a, r) => a + r.time, 0) / served.length * 10) / 10
    : 0;
  const avgSat = Math.round(rs.reduce((a, r) => a + r.sat, 0) / rs.length);
  const delivered = rs.reduce((a, r) => a + r.delivered, 0);
  return { avgTime, avgSat, delivered, earnings: delivered * 10 };
}
function hoodById(id: string) { return HOODS.find(h => h.id === id)!; }
function computeSeqAssignments(seq: string[], n: number): Record<string, number> {
  const a: Record<string, number> = { downtown: 0, midtown: 0, northsuburb: 0, easthills: 0 };
  seq.slice(0, n).forEach(id => { a[id] = (a[id] ?? 0) + 1; });
  return a;
}

// ─── Rider Animation ──────────────────────────────────────────────────────────

function progressToT(p: number): number {
  const p2 = p % 2;
  if (p2 <= 1) return p2;
  if (p2 <= 1.25) return 1;
  return 1 - (p2 - 1.25) / 0.75;
}
function riderIsDelivering(p: number) { const p2 = p % 2; return p2 > 1 && p2 <= 1.25; }
function pathPosition(hoodId: string, t: number): [number, number] {
  const wps = ROAD_PATHS[hoodId];
  if (!wps || t <= 0) return [DEPOT.x, DEPOT.y];
  if (t >= 1) { const l = wps[wps.length - 1]; return [l[0], l[1]]; }
  let total = 0;
  const lens: number[] = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const d = Math.sqrt((wps[i+1][0]-wps[i][0])**2 + (wps[i+1][1]-wps[i][1])**2);
    lens.push(d); total += d;
  }
  const target = t * total; let cum = 0;
  for (let i = 0; i < lens.length; i++) {
    if (cum + lens[i] >= target) {
      const s = (target - cum) / lens[i];
      return [wps[i][0] + s*(wps[i+1][0]-wps[i][0]), wps[i][1] + s*(wps[i+1][1]-wps[i][1])];
    }
    cum += lens[i];
  }
  const l = wps[wps.length - 1]; return [l[0], l[1]];
}
function riderSpeed(h: Hood) { return 2.0 / (Math.max(2.5, h.baseTime * 0.22) * 2.2 * 30); }

// ─── CSS ──────────────────────────────────────────────────────────────────────

const STYLES = `
.ab-page {
  min-height: 100vh; background: #ede9e3;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 16px 100px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2d2419;
}
/* ── Stepper ── */
.ab-stepper { display: flex; align-items: flex-start; gap: 0; padding: 18px 0 10px; width: 100%; max-width: 840px; }
.ab-step { display: flex; flex-direction: column; align-items: center; flex: 1; user-select: none; }
.ab-step-dot { width: 10px; height: 10px; border-radius: 50%; background: #d5cec6; border: 2px solid #c4bcb3; transition: all 0.25s; }
.ab-step.done .ab-step-dot { background: #16a34a; border-color: #15803d; cursor: pointer; }
.ab-step.active .ab-step-dot { background: #4f46e5; border-color: #4338ca; box-shadow: 0 0 0 4px rgba(79,70,229,0.18); width: 12px; height: 12px; }
.ab-step-label { font-size: 10px; color: #a8998c; margin-top: 5px; text-align: center; white-space: nowrap; }
.ab-step.active .ab-step-label { color: #4f46e5; font-weight: 700; }
.ab-step.done .ab-step-label { color: #7a6e64; }
.ab-step-line { flex: 1; height: 2px; background: #ddd5ca; margin-top: 4px; }
.ab-step-line.done { background: rgba(22,163,74,0.4); }
/* ── Live bar ── */
.ab-live-bar { display: flex; gap: 8px; width: 100%; max-width: 840px; margin-top: 8px; flex-wrap: wrap; }
.ab-live-tile { flex: 1; min-width: 110px; background: #fff; border: 1px solid #e2d9ce; border-radius: 12px; padding: 8px 12px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.ab-live-val { font-size: 19px; font-weight: 700; color: #2d2419; font-variant-numeric: tabular-nums; line-height: 1; margin-bottom: 2px; }
.ab-live-val.ok { color: #16a34a; } .ab-live-val.warn { color: #d97706; } .ab-live-val.bad { color: #dc2626; }
.ab-live-label { font-size: 10px; color: #a8998c; text-transform: uppercase; letter-spacing: 0.07em; }
.ab-live-goal { font-size: 10px; color: #c4bcb3; margin-top: 1px; }
/* ── Map ── */
.ab-map-wrap { position: relative; width: 100%; max-width: 840px; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06); margin-top: 10px; }
.ab-map-img { width: 100%; display: block; pointer-events: none; user-select: none; }
.ab-map-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.ab-rider { position: absolute; width: 28px; height: 28px; border-radius: 50%; background: #c25e1a; border: 2.5px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.25); transform: translate(-50%,-50%); transition: left 0.04s linear, top 0.04s linear; z-index: 20; pointer-events: none; }
.ab-rider.delivering { animation: ab-deliver 0.6s ease-in-out infinite alternate; }
.ab-demand-badge { position: absolute; transform: translate(-50%,-100%); background: #fff; border: 2px solid #c25e1a; border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 700; color: #a34a10; box-shadow: 0 2px 10px rgba(0,0,0,0.12); white-space: nowrap; pointer-events: none; animation: ab-bob 2s ease-in-out infinite; z-index: 15; }
.ab-demand-badge.surge { border-color: #dc2626; color: #dc2626; animation: ab-surge-arrive 0.5s ease both, ab-urgency 1s ease-in-out 0.5s infinite; }
.ab-hotspot { position: absolute; transform: translate(-50%,-50%); border: none; cursor: pointer; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: clamp(14px,2vw,22px); transition: transform 0.2s; z-index: 25; }
.ab-hotspot:hover { transform: translate(-50%,-50%) scale(1.15); }
/* ── Explore panel ── */
.ab-explore-panel { width: 100%; max-width: 840px; margin-top: 10px; background: #fff; border: 1px solid #e2d9ce; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.ab-explore-tabs { display: flex; border-bottom: 1px solid #e2d9ce; }
.ab-explore-tab { flex: 1; padding: 10px 6px; border: none; background: none; cursor: pointer; font-size: 12px; font-weight: 600; color: #a8998c; transition: all 0.18s; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.ab-explore-tab:hover { color: #2d2419; }
.ab-explore-tab.active { color: #4f46e5; background: #f5f4ff; border-bottom: 2.5px solid #4f46e5; margin-bottom: -1px; }
.ab-explore-tab.visited { color: #16a34a; }
.ab-explore-content { padding: 16px 20px; }
.ab-explore-empty { color: #b0a499; font-size: 14px; padding: 16px 20px; text-align: center; }
/* ── Assign tiles ── */
.ab-assign-grid { display: flex; gap: 10px; width: 100%; max-width: 840px; margin-top: 10px; flex-wrap: wrap; }
.ab-assign-tile { flex: 1; min-width: 150px; background: #fff; border: 2px solid #e2d9ce; border-radius: 18px; padding: 14px 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); transition: border-color 0.2s, box-shadow 0.2s; }
.ab-assign-emoji { font-size: 24px; }
.ab-assign-name { font-size: 13px; font-weight: 700; text-align: center; }
.ab-assign-counter { display: flex; align-items: center; gap: 14px; }
.ab-ctr-btn { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #e2d9ce; background: #fff; color: #4f46e5; font-size: 22px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; box-shadow: 0 1px 4px rgba(0,0,0,0.08); padding: 0; line-height: 1; }
.ab-ctr-btn:hover:not(:disabled) { background: #eef2ff; border-color: #4f46e5; transform: scale(1.08); }
.ab-ctr-btn:disabled { opacity: 0.25; cursor: not-allowed; }
.ab-ctr-val { font-size: 30px; font-weight: 800; min-width: 36px; text-align: center; font-variant-numeric: tabular-nums; color: #2d2419; }
.ab-assign-info { font-size: 11px; color: #a8998c; text-align: center; line-height: 1.4; }
.ab-rider-pool { font-size: 13px; font-weight: 600; color: #7a6e64; text-align: center; width: 100%; max-width: 840px; margin-top: 8px; }
/* ── Card ── */
.ab-card { background: #fff; border: 1px solid #e2d9ce; border-radius: 18px; padding: 22px 26px; width: 100%; max-width: 840px; margin-top: 10px; box-shadow: 0 1px 6px rgba(0,0,0,0.07); animation: ab-fadein 0.35s ease both; }
.ab-card-title { font-size: 21px; font-weight: 800; color: #2d2419; margin: 0 0 5px; letter-spacing: -0.02em; }
.ab-card-sub { font-size: 14px; color: #8a7a6d; margin: 0 0 16px; line-height: 1.55; }
/* ── Callout ── */
.ab-callout { padding: 12px 16px; border-radius: 12px; font-size: 13px; line-height: 1.6; }
.ab-callout.indigo { background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; }
.ab-callout.amber  { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.ab-callout.red    { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.ab-callout.green  { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
/* ── Result table ── */
.ab-rtable { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
.ab-rtable th { text-align: left; color: #a8998c; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 10px; border-bottom: 1px solid #e8e0d5; }
.ab-rtable td { padding: 9px 10px; border-bottom: 1px solid #f0ebe4; }
.ab-rtable tr:last-child td { border-bottom: none; }
.ab-row-ok td { background: rgba(22,163,74,0.04); }
.ab-row-warn td { background: rgba(217,119,6,0.05); }
.ab-row-bad td { background: rgba(220,38,38,0.06); }
.ab-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.ab-badge-ok   { background: rgba(22,163,74,0.12); color: #16a34a; }
.ab-badge-warn { background: rgba(217,119,6,0.12); color: #d97706; }
.ab-badge-bad  { background: rgba(220,38,38,0.12); color: #dc2626; }
.ab-badge-zero { background: rgba(220,38,38,0.18); color: #b91c1c; border: 1px solid rgba(220,38,38,0.25); }
/* ── Algo tiles ── */
.ab-algo-tiles { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.ab-algo-tile { flex: 1; min-width: 130px; background: #f8f5f1; border: 2px solid #e2d9ce; border-radius: 14px; padding: 12px; text-align: center; transition: all 0.3s; }
.ab-algo-count { font-size: 32px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
.ab-algo-label { font-size: 11px; color: #a8998c; margin-top: 2px; }
/* ── News banner ── */
.ab-news-banner { background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; border-radius: 14px; padding: 16px 20px; margin-bottom: 16px; animation: ab-fadein 0.4s ease both; }
.ab-news-tag { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.75; margin-bottom: 4px; }
.ab-news-text { font-size: 20px; font-weight: 800; line-height: 1.3; }
/* ── Strategy box ── */
.ab-strategy-box { background: #eef2ff; border: 2px solid #c7d2fe; border-radius: 14px; padding: 16px 18px; margin-bottom: 14px; }
.ab-strategy-rule { background: #fff; border: 1.5px dashed #c7d2fe; border-radius: 10px; padding: 12px 16px; font-size: 14px; color: #3730a3; font-weight: 600; font-style: italic; margin-top: 10px; line-height: 1.5; }
/* ── Surge question ── */
.ab-surge-btns { display: flex; gap: 12px; margin-top: 16px; }
.ab-surge-btn { flex: 1; padding: 14px; border: 2px solid #e2d9ce; border-radius: 14px; background: #fff; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s; color: #2d2419; }
.ab-surge-btn:hover { border-color: #4f46e5; background: #eef2ff; }
.ab-surge-btn.chosen { border-color: #4f46e5; background: #eef2ff; color: #4f46e5; }
/* ── Goal choice cards ── */
.ab-choice-cards { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.ab-choice-card { background: #f8f5f1; border: 2px solid #e2d9ce; border-radius: 14px; padding: 14px 18px; cursor: pointer; transition: all 0.2s; display: flex; gap: 14px; align-items: flex-start; }
.ab-choice-card:hover:not(.chosen) { border-color: #4f46e5; background: #f5f4ff; }
.ab-choice-card.chosen-wrong { border-color: #dc2626; background: #fef2f2; cursor: default; }
.ab-choice-card.chosen-right { border-color: #16a34a; background: #f0fdf4; cursor: default; }
.ab-choice-letter { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; background: #e8e0d5; color: #6b5f55; }
.ab-choice-card.chosen-right .ab-choice-letter { background: #16a34a; color: #fff; }
.ab-choice-card.chosen-wrong .ab-choice-letter { background: #dc2626; color: #fff; }
.ab-choice-title { font-size: 14px; font-weight: 700; color: #2d2419; margin-bottom: 2px; }
.ab-choice-desc { font-size: 12px; color: #8a7a6d; line-height: 1.5; }
.ab-choice-feedback { font-size: 12px; margin-top: 6px; font-weight: 600; padding: 4px 8px; border-radius: 6px; }
.ab-choice-feedback.wrong { color: #991b1b; background: rgba(220,38,38,0.1); }
.ab-choice-feedback.right { color: #166534; background: rgba(22,163,74,0.1); }
/* ── Reflect grid ── */
.ab-reflect-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.ab-reflect-tile { flex: 1; min-width: 190px; background: #f8f5f1; border: 1px solid #e8e0d5; border-radius: 16px; padding: 16px; }
.ab-reflect-icon { font-size: 26px; margin-bottom: 8px; }
.ab-reflect-title { font-size: 14px; font-weight: 700; color: #2d2419; margin-bottom: 5px; }
.ab-reflect-desc { font-size: 13px; color: #7a6e64; line-height: 1.55; }
/* ── Compare table ── */
.ab-compare-wrap { overflow: hidden; border-radius: 14px; border: 1px solid #e2d9ce; margin-top: 12px; }
.ab-compare-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ab-compare-table th { padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; }
.ab-compare-table th.label-col { text-align: left; background: #f8f5f1; color: #8a7a6d; }
.ab-compare-table th.bad-col  { background: #fef2f2; color: #dc2626; text-align: center; }
.ab-compare-table th.good-col { background: #f0fdf4; color: #16a34a; text-align: center; }
.ab-compare-table td { padding: 9px 14px; border-top: 1px solid #f0ebe4; }
.ab-compare-table td.label-col { background: #fafaf8; color: #6b5f55; font-weight: 600; }
.ab-compare-table td.bad-col  { background: #fef9f9; text-align: center; font-weight: 700; color: #dc2626; }
.ab-compare-table td.good-col { background: #f6fff8; text-align: center; font-weight: 700; color: #16a34a; }
/* ── Spinner ── */
.ab-spinner { width: 18px; height: 18px; border: 2.5px solid #e2d9ce; border-top-color: #4f46e5; border-radius: 50%; animation: ab-spin 0.8s linear infinite; flex-shrink: 0; }
/* ── Action bar ── */
.ab-action-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 14px 24px; background: rgba(237,233,227,0.96); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-top: 1px solid #e2d9ce; display: flex; justify-content: center; align-items: center; z-index: 400; box-shadow: 0 -4px 20px rgba(0,0,0,0.06); }
.ab-btn { min-width: 260px; padding: 13px 36px; border: none; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.18s; background: #4f46e5; color: #fff; box-shadow: 0 4px 16px rgba(79,70,229,0.3); }
.ab-btn:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(79,70,229,0.38); }
.ab-btn:disabled { background: #d5cec6; color: #a8998c; cursor: not-allowed; box-shadow: none; }
/* ── Animations ── */
@keyframes ab-fadein { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes ab-spin { to { transform:rotate(360deg); } }
@keyframes ab-pulse-ring { 0%{opacity:0.7;transform:translate(-50%,-50%) scale(1);} 100%{opacity:0;transform:translate(-50%,-50%) scale(2.6);} }
@keyframes ab-bob { 0%,100%{transform:translate(-50%,-100%) translateY(0);} 50%{transform:translate(-50%,-100%) translateY(-4px);} }
@keyframes ab-urgency { 0%,100%{transform:translate(-50%,-100%) scale(1);} 50%{transform:translate(-50%,-100%) scale(1.08);} }
@keyframes ab-deliver { from{transform:translate(-50%,-50%) scale(1);} to{transform:translate(-50%,-50%) scale(1.25);} }
@keyframes ab-surge-arrive { 0%{opacity:0;transform:translate(-50%,-120%) scale(0.5);} 60%{transform:translate(-50%,-110%) scale(1.1);} 100%{opacity:1;transform:translate(-50%,-100%) scale(1);} }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeLabel(t: number) { return t >= 99 ? 'No service' : `${Math.round(t)} min`; }
function hudColor(val: number, goal: number, lower = false) {
  const ok = lower ? val <= goal : val >= goal;
  if (ok) return 'ok';
  return lower ? (val <= goal * 1.4 ? 'warn' : 'bad') : (val >= goal * 0.8 ? 'warn' : 'bad');
}
function satBadge(s: number) {
  if (s === 0) return 'ab-badge ab-badge-zero';
  if (s >= 70) return 'ab-badge ab-badge-ok';
  if (s >= 40) return 'ab-badge ab-badge-warn';
  return 'ab-badge ab-badge-bad';
}
function rowCls(s: number) { return s >= 70 ? 'ab-row-ok' : s >= 40 ? 'ab-row-warn' : 'ab-row-bad'; }
function describeAssignment(asgn: Record<string, number>): string {
  const sorted = [...HOODS].sort((a, b) => (asgn[b.id] ?? 0) - (asgn[a.id] ?? 0));
  const top = sorted[0]; const bot = sorted[sorted.length - 1];
  const topN = asgn[top.id] ?? 0; const botN = asgn[bot.id] ?? 0;
  if (topN === botN) return 'You spread riders evenly across all neighborhoods.';
  const botPart = botN === 0 ? `gave none to ${bot.name}` : `only ${botN} to ${bot.name}`;
  return `You gave ${topN} riders to ${top.name} and ${botPart}.`;
}

// Step indicator config
const STEP_LABELS = ['Explore', 'Goal', 'Dispatch', 'Automate', 'Bias', 'Fix It', 'Reflect'];
const PHASE_TO_STEP: Record<GamePhase, number> = {
  explore: 0, goalSetup: 1,
  assign: 2, runDispatch: 2, quickResult: 2,
  strategyToAlgo: 3, surgeSurprise: 3, aiDispatch: 3,
  reveal: 4, explainBias: 4,
  fixGoal: 5, fairerRound: 5,
  finalReflect: 6,
};
const STEP_FIRST: GamePhase[] = ['explore', 'goalSetup', 'assign', 'strategyToAlgo', 'reveal', 'fixGoal', 'finalReflect'];
const PHASE_ORDER: GamePhase[] = [
  'explore', 'goalSetup', 'assign', 'runDispatch', 'quickResult',
  'strategyToAlgo', 'surgeSurprise', 'aiDispatch', 'reveal',
  'explainBias', 'fixGoal', 'fairerRound', 'finalReflect',
];

// ─── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({ phase, onBack }: { phase: GamePhase; onBack: (p: GamePhase) => void }) {
  const cur = PHASE_TO_STEP[phase];
  return (
    <div className="ab-stepper">
      {STEP_LABELS.map((lbl, i) => (
        <React.Fragment key={i}>
          <div
            className={`ab-step ${i < cur ? 'done' : ''} ${i === cur ? 'active' : ''}`}
            onClick={() => { if (i < cur) onBack(STEP_FIRST[i]); }}
            style={{ cursor: i < cur ? 'pointer' : 'default' }}
          >
            <div className="ab-step-dot" />
            <div className="ab-step-label">{lbl}</div>
          </div>
          {i < STEP_LABELS.length - 1 && <div className={`ab-step-line ${i < cur ? 'done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function BottomAction({ label, enabled, onClick }: { label: string; enabled: boolean; onClick: () => void }) {
  return (
    <div className="ab-action-bar">
      <button className="ab-btn" disabled={!enabled || !label} onClick={onClick}>{label || '…'}</button>
    </div>
  );
}

// ─── LiveBar ──────────────────────────────────────────────────────────────────

function LiveBar({ results }: { results: NResult[] }) {
  const { avgTime, delivered } = summarize(results);
  return (
    <div className="ab-live-bar">
      <div className="ab-live-tile">
        <div className={`ab-live-val ${avgTime > 0 ? hudColor(avgTime, GOALS.avgTime, true) : ''}`}>{avgTime > 0 ? `${avgTime}m` : '—'}</div>
        <div className="ab-live-label">Avg Wait</div>
        <div className="ab-live-goal">Goal: &lt;{GOALS.avgTime} min</div>
      </div>
      <div className="ab-live-tile">
        <div className={`ab-live-val ${hudColor(delivered, GOALS.delivered)}`}>{delivered}</div>
        <div className="ab-live-label">Delivered</div>
        <div className="ab-live-goal">Goal: {GOALS.delivered}+</div>
      </div>
      <div className="ab-live-tile">
        <div className="ab-live-val" style={{ color: '#16a34a' }}>${delivered * 10}</div>
        <div className="ab-live-label">Earnings</div>
        <div className="ab-live-goal">per shift</div>
      </div>
    </div>
  );
}

// ─── MapBoard ─────────────────────────────────────────────────────────────────

interface RiderPos { x: number; y: number; delivering: boolean; }

function MapBoard({
  phase, displayAssignments, riderPositions, visitedSet, activeTab,
  onHotspotClick, highlightId, surgeActive,
}: {
  phase: GamePhase; displayAssignments: Record<string, number>;
  riderPositions: Record<string, RiderPos[]>;
  visitedSet: Set<string>; activeTab: string | null;
  onHotspotClick?: (id: string) => void;
  highlightId?: string | null;
  surgeActive?: boolean;
}) {
  const AR = 1.8333;
  const showHotspots = phase === 'explore';
  const showRiders = ['assign', 'runDispatch', 'quickResult', 'aiDispatch', 'fairerRound'].includes(phase);
  const showDemand = ['assign', 'runDispatch', 'quickResult', 'surgeSurprise', 'aiDispatch', 'reveal', 'fairerRound'].includes(phase);

  return (
    <div className="ab-map-wrap">
      <img src={mapImg} className="ab-map-img" alt="City delivery map" />

      <svg className="ab-map-svg" viewBox="0 0 183.3 100" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
        {HOODS.map(h => {
          const driverCount = displayAssignments[h.id] ?? 0;
          const isActive = activeTab === h.id;
          const isHighlight = highlightId === h.id;
          const opacity = phase === 'explore'
            ? (isActive ? 0.7 : visitedSet.has(h.id) ? 0.45 : 0.25)
            : driverCount > 0 ? 0.65 : 0.3;
          return (
            <ellipse key={h.id}
              cx={h.pos.x * AR} cy={h.pos.y}
              rx={h.radius * AR} ry={h.radius}
              fill={h.bgColor} stroke={h.color}
              strokeWidth={isActive || isHighlight ? 1.2 : 0.7}
              opacity={opacity}
            />
          );
        })}

        {/* HQ */}
        <g>
          <circle cx={DEPOT.x * AR} cy={DEPOT.y} r={3.2} fill="white" stroke="#4f46e5" strokeWidth="0.9" opacity="0.95" />
          <text x={DEPOT.x * AR} y={DEPOT.y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize="2.8" fill="#4f46e5" fontWeight="bold">HQ</text>
        </g>

        {/* Pulse rings for explore */}
        {showHotspots && HOODS.map((h, i) => !visitedSet.has(h.id) && (
          <ellipse key={`pulse-${h.id}`}
            cx={h.pos.x * AR} cy={h.pos.y}
            rx={h.radius * AR * 1.4} ry={h.radius * 1.4}
            fill="none" stroke={h.color} strokeWidth="0.8"
            style={{ animation: `ab-pulse-ring 2.2s ease-out ${i * 0.5}s infinite` }}
            opacity="0.5"
          />
        ))}

        {/* Highlight ring for algo assignment */}
        {highlightId && (() => {
          const h = hoodById(highlightId);
          return (
            <ellipse cx={h.pos.x * AR} cy={h.pos.y}
              rx={h.radius * AR * 1.6} ry={h.radius * 1.6}
              fill="none" stroke={h.color} strokeWidth="1.2"
              style={{ animation: 'ab-pulse-ring 0.7s ease-out forwards' }}
            />
          );
        })()}
      </svg>

      {/* Demand badges */}
      {showDemand && HOODS.map(h => {
        const isSurging = surgeActive && h.id === 'easthills';
        const orderCount = surgeActive ? ALGO_ORDERS_SURGE[h.id] : h.baseOrders;
        return (
          <div key={`dem-${h.id}`}
            className={`ab-demand-badge ${isSurging ? 'surge' : ''}`}
            style={{ left: `${h.pos.x}%`, top: `${h.pos.y - h.radius * 0.5}%` }}
          >
            📦 {orderCount}
          </div>
        );
      })}

      {/* Riders */}
      {showRiders && HOODS.map(h =>
        (riderPositions[h.id] ?? []).map((pos, i) => (
          <div key={`rider-${h.id}-${i}`}
            className={`ab-rider ${pos.delivering ? 'delivering' : ''}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            🛵
          </div>
        ))
      )}

      {/* Explore hotspots */}
      {showHotspots && HOODS.map(h => (
        <button key={`hs-${h.id}`}
          className={`ab-hotspot ${visitedSet.has(h.id) ? 'visited' : ''}`}
          style={{
            left: `${h.pos.x}%`, top: `${h.pos.y}%`,
            width: `${h.radius * 2.8}%`, aspectRatio: '1/1',
            background: activeTab === h.id ? h.bgColor : 'rgba(255,255,255,0.25)',
            border: `2.5px solid ${h.color}`,
            boxShadow: `0 4px 16px rgba(0,0,0,0.15), 0 0 12px ${h.bgColor}`,
          }}
          onClick={() => onHotspotClick?.(h.id)}
        >
          {h.emoji}
        </button>
      ))}
    </div>
  );
}

// ─── ResultTable ──────────────────────────────────────────────────────────────

function ResultTable({ results, showOrders, minimal }: { results: NResult[]; showOrders?: boolean; minimal?: boolean }) {
  return (
    <table className="ab-rtable">
      <thead>
        <tr>
          <th>Neighborhood</th>
          <th>Riders</th>
          {showOrders && <th>Orders</th>}
          <th>Avg Wait</th>
          {!minimal && <th>Satisfaction</th>}
          {!minimal && <th>Delivered</th>}
        </tr>
      </thead>
      <tbody>
        {results.map(r => {
          const h = hoodById(r.id);
          return (
            <tr key={r.id} className={rowCls(r.sat)}>
              <td><span style={{ color: h.color, fontWeight: 600 }}>{h.emoji} {h.name}</span></td>
              <td>{r.drivers === 0 ? <span className="ab-badge ab-badge-zero">0 ⚠</span> : r.drivers}</td>
              {showOrders && <td><strong>{r.orders}</strong></td>}
              <td style={{ fontWeight: r.drivers === 0 ? 600 : undefined, color: r.drivers === 0 ? '#dc2626' : undefined }}>
                {timeLabel(r.time)}
              </td>
              {!minimal && <td><span className={satBadge(r.sat)}>{r.sat === 0 ? '0%' : `${r.sat}%`}</span></td>}
              {!minimal && (
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.delivered}/{r.orders}
                  {r.delivered >= r.orders
                    ? <span style={{ color: '#16a34a', marginLeft: 4 }}>✓</span>
                    : <span style={{ color: '#dc2626', marginLeft: 4 }}>✗</span>}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Phase: Explore ───────────────────────────────────────────────────────────

function PhaseExplore({ onAct, visitedSet, activeTab, setActiveTab, setVisited }: {
  onAct: ActionSetter; visitedSet: Set<string>; activeTab: string | null;
  setActiveTab: (id: string | null) => void; setVisited: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const allDone = HOODS.every(h => visitedSet.has(h.id));
  const remaining = HOODS.length - visitedSet.size;
  useEffect(() => {
    onAct(allDone ? "Let's Start! →" : `Explore ${remaining} more neighborhood${remaining !== 1 ? 's' : ''}`, allDone);
  }, [allDone, remaining, onAct]);
  const activeHood = activeTab ? hoodById(activeTab) : null;
  return (
    <div className="ab-explore-panel">
      <div className="ab-explore-tabs">
        {HOODS.map(h => (
          <button key={h.id}
            className={`ab-explore-tab ${visitedSet.has(h.id) ? 'visited' : ''} ${activeTab === h.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(activeTab === h.id ? null : h.id);
              setVisited(p => new Set([...p, h.id]));
            }}
          >
            <span>{h.emoji}</span><span>{h.name}</span>
          </button>
        ))}
      </div>
      {activeHood ? (
        <div className="ab-explore-content" style={{ animation: 'ab-fadein 0.25s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 36 }}>{activeHood.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: activeHood.textColor, marginBottom: 2 }}>{activeHood.name}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#a8998c', marginBottom: 8 }}>{activeHood.tagline}</div>
              <div style={{ fontSize: 13, color: '#6b5f55', lineHeight: 1.6, marginBottom: 10 }}>{activeHood.exploreInfo}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { icon: '⏱', txt: `~${activeHood.baseTime} min avg trip` },
                  { icon: '📦', txt: `${activeHood.baseOrders} orders/shift` },
                  { icon: '🎯', txt: activeHood.difficulty },
                ].map(({ icon, txt }) => (
                  <div key={txt} style={{ background: activeHood.bgColor, borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 600, color: activeHood.textColor }}>
                    {icon} {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="ab-explore-empty">
          {allDone ? '✅ All neighborhoods explored — press the button to start!' : 'Tap a neighborhood above to learn about it.'}
        </div>
      )}
    </div>
  );
}

// ─── Phase: Goal Setup ────────────────────────────────────────────────────────

function PhaseGoalSetup({ onAct }: { onAct: ActionSetter }) {
  useEffect(() => { onAct('Start Dispatching →', true); }, [onAct]);
  return (
    <div className="ab-card">
      <div className="ab-card-title">🎯 Your Mission: Fast Deliveries</div>
      <div className="ab-card-sub">SpeedEats has one goal for its dispatch managers: minimize average delivery time. Here's why it makes sense.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { icon: '💰', head: 'More revenue', body: 'Faster deliveries = riders complete more orders per shift = higher earnings for everyone.' },
          { icon: '😊', head: 'Happier customers', body: 'Customers who wait less give better ratings and come back more often.' },
          { icon: '⚡', head: 'Less idle time', body: 'Optimizing for speed keeps riders moving and reduces wasted gaps between orders.' },
        ].map(({ icon, head, body }) => (
          <div key={head} style={{ background: '#f8f5f1', border: '1px solid #e8e0d5', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8998c', marginBottom: 4 }}>{head}</div>
            <div style={{ fontSize: 12, color: '#8a7a6d', lineHeight: 1.5 }}>{body}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#eef2ff', border: '2px solid #c7d2fe', borderRadius: 14, padding: '14px 18px', textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, marginBottom: 4 }}>YOUR GOAL THIS SHIFT</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#3730a3' }}>&ldquo;Minimize average delivery time&rdquo;</div>
        <div style={{ fontSize: 12, color: '#4f46e5', marginTop: 6 }}>Target: under {GOALS.avgTime} minutes average across all neighborhoods</div>
      </div>
      <div className="ab-callout amber">
        You have <strong>8 riders</strong> to assign across 4 neighborhoods. Use your judgment — assign as many or as few as you like to each area.
      </div>
    </div>
  );
}

// ─── Phase: Assign ────────────────────────────────────────────────────────────

function PhaseAssign({ onAct, assignments, setAssignments }: {
  onAct: ActionSetter; assignments: Record<string, number>;
  setAssignments: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}) {
  const used = Object.values(assignments).reduce((a, v) => a + v, 0);
  const rem = TOTAL_RIDERS - used;
  const allAssigned = rem === 0;
  useEffect(() => {
    onAct(allAssigned ? 'Dispatch Riders! →' : `Assign ${rem} more rider${rem !== 1 ? 's' : ''} to continue`, allAssigned);
  }, [allAssigned, rem, onAct]);

  function adjust(id: string, delta: number) {
    setAssignments(prev => {
      const cur = prev[id] ?? 0;
      if (cur + delta < 0 || (delta > 0 && rem <= 0)) return prev;
      return { ...prev, [id]: cur + delta };
    });
  }

  return (
    <>
      <div className="ab-assign-grid">
        {HOODS.map(h => {
          const count = assignments[h.id] ?? 0;
          const projTime = calcTime(h.baseTime, h.minTime, count);
          return (
            <div key={h.id} className="ab-assign-tile"
              style={{ borderColor: count > 0 ? h.color + '60' : undefined }}>
              <div className="ab-assign-emoji">{h.emoji}</div>
              <div className="ab-assign-name" style={{ color: h.textColor }}>{h.name}</div>
              <div className="ab-assign-counter">
                <button className="ab-ctr-btn" disabled={count === 0} onClick={() => adjust(h.id, -1)}>−</button>
                <span className="ab-ctr-val">{count}</span>
                <button className="ab-ctr-btn" disabled={rem === 0} onClick={() => adjust(h.id, 1)}>+</button>
              </div>
              <div className="ab-assign-info">
                {count === 0
                  ? <span style={{ color: '#dc2626' }}>No coverage</span>
                  : <><strong style={{ color: h.textColor }}>~{Math.round(projTime)} min</strong> projected wait</>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="ab-rider-pool" style={{ color: allAssigned ? '#16a34a' : '#7a6e64' }}>
        {allAssigned ? '✓ All 8 riders assigned — watch the live stats above!' : `🛵 ${rem} rider${rem !== 1 ? 's' : ''} still unassigned`}
      </div>
    </>
  );
}

// ─── Phase: Run Dispatch ──────────────────────────────────────────────────────

function PhaseRunDispatch({ onAct, runReady }: { onAct: ActionSetter; runReady: boolean }) {
  useEffect(() => {
    onAct('See How It Went →', runReady);
  }, [runReady, onAct]);
  return (
    <div className="ab-card">
      <div className="ab-card-title">🛵 Riders Out on the Road</div>
      <div className="ab-card-sub">Your team is making deliveries across the city. Watch them follow the roads toward each neighborhood.</div>
      {!runReady ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8a7a6d', fontSize: 13 }}>
          <div className="ab-spinner" /> Deliveries in progress…
        </div>
      ) : (
        <div className="ab-callout green">
          ✓ Shift complete! All riders have finished their routes.
        </div>
      )}
    </div>
  );
}

// ─── Phase: Quick Result ──────────────────────────────────────────────────────

function PhaseQuickResult({ onAct, results }: { onAct: ActionSetter; results: NResult[] }) {
  const { avgTime, delivered } = summarize(results);
  const speedOk = avgTime <= GOALS.avgTime;
  const delOk = delivered >= GOALS.delivered;
  useEffect(() => { onAct('Turn Your Strategy Into an Algorithm →', true); }, [onAct]);
  return (
    <div className="ab-card">
      <div className="ab-card-title">📊 Shift Results</div>
      <div className="ab-card-sub">Here's how your dispatch performed against the speed goal.</div>

      {/* Goal summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 130, background: speedOk ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${speedOk ? '#bbf7d0' : '#fecaca'}`, borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: speedOk ? '#16a34a' : '#dc2626', marginBottom: 6 }}>Avg Wait</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: speedOk ? '#16a34a' : '#dc2626' }}>{avgTime} min</div>
          <div style={{ fontSize: 12, color: '#8a7a6d', marginTop: 3 }}>{speedOk ? '✓ Goal met' : `Goal: <${GOALS.avgTime} min`}</div>
        </div>
        <div style={{ flex: 1, minWidth: 130, background: delOk ? '#f0fdf4' : '#fffbeb', border: `1.5px solid ${delOk ? '#bbf7d0' : '#fde68a'}`, borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: delOk ? '#16a34a' : '#d97706', marginBottom: 6 }}>Delivered</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: delOk ? '#16a34a' : '#d97706' }}>{delivered}</div>
          <div style={{ fontSize: 12, color: '#8a7a6d', marginTop: 3 }}>{delOk ? '✓ Goal met' : `Goal: ${GOALS.delivered}+`}</div>
        </div>
      </div>

      {/* Minimal per-neighborhood table */}
      <ResultTable results={results} minimal />

      {/* Light hint only */}
      <div className="ab-callout amber" style={{ marginTop: 14 }}>
        <em>Not every neighborhood received the same level of coverage.</em> Let's see what happens when this approach becomes automatic.
      </div>
    </div>
  );
}

// ─── Phase: Strategy → Algorithm ─────────────────────────────────────────────

function PhaseStrategyToAlgo({ onAct, assignments }: { onAct: ActionSetter; assignments: Record<string, number> }) {
  useEffect(() => { onAct('Build Algorithm →', true); }, [onAct]);
  const behaviorDesc = describeAssignment(assignments);
  return (
    <div className="ab-card">
      <div className="ab-card-title">🔧 Turn Your Strategy Into an Algorithm</div>
      <div className="ab-card-sub">SpeedEats wants to automate dispatch — no more manual decisions. The system will study your pattern and turn it into a rule.</div>

      <div className="ab-strategy-box">
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5', marginBottom: 6 }}>Your Dispatch Pattern</div>
        <div style={{ fontSize: 14, color: '#3730a3' }}>{behaviorDesc}</div>
        <div style={{ fontSize: 12, color: '#6366f1', marginTop: 8 }}>
          Combined with historical order data, the system derives:
        </div>
        <div className="ab-strategy-rule">
          📋 Rule: Assign riders in proportion to last month's order volume.<br />
          More past orders → more riders assigned today.
        </div>
      </div>

      {/* Visual: rider allocation preview */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8998c', marginBottom: 8 }}>Algorithm Preview — 8 Riders</div>
        <div className="ab-algo-tiles">
          {HOODS.map(h => {
            const algoCount = ALGO_SEQUENCE.filter(id => id === h.id).length;
            return (
              <div key={h.id} className="ab-algo-tile" style={{ borderColor: h.color + '50' }}>
                <div style={{ fontSize: 16 }}>{h.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: h.textColor, marginBottom: 4 }}>{h.name}</div>
                <div className="ab-algo-count" style={{ color: h.color }}>{algoCount}</div>
                <div className="ab-algo-label">riders</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ab-callout indigo">
        <strong>Once you click &ldquo;Build Algorithm,&rdquo;</strong> this rule runs automatically every shift — with no human review. The algorithm will make all dispatch decisions from now on.
      </div>
    </div>
  );
}

// ─── Phase: Surge Surprise ────────────────────────────────────────────────────

function PhaseSurgeSurprise({ onAct, surgeChoice, setSurgeChoice }: {
  onAct: ActionSetter; surgeChoice: 'yes' | 'no' | null;
  setSurgeChoice: (c: 'yes' | 'no') => void;
}) {
  useEffect(() => {
    onAct('See the Algorithm Run →', surgeChoice !== null);
  }, [surgeChoice, onAct]);
  return (
    <div className="ab-card">
      <div className="ab-news-banner">
        <div className="ab-news-tag">📡 Breaking — Today's Orders</div>
        <div className="ab-news-text">East Hills just received 8 orders — nearly triple its usual 3.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#dc2626', marginBottom: 6 }}>East Hills — Today</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>8 orders</div>
          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>vs. usual 3 orders/shift</div>
        </div>
        <div style={{ background: '#f8f5f1', border: '1px solid #e8e0d5', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8998c', marginBottom: 6 }}>Algorithm Status</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2d2419', marginBottom: 4 }}>Already running</div>
          <div style={{ fontSize: 12, color: '#8a7a6d' }}>Riders assigned based on last month's data</div>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: '#2d2419', marginBottom: 12, textAlign: 'center' }}>
        Will the algorithm adjust its assignment for East Hills?
      </div>
      <div className="ab-surge-btns">
        <button
          className={`ab-surge-btn ${surgeChoice === 'yes' ? 'chosen' : ''}`}
          onClick={() => setSurgeChoice('yes')}
        >
          👍 Yes, it will adapt
        </button>
        <button
          className={`ab-surge-btn ${surgeChoice === 'no' ? 'chosen' : ''}`}
          onClick={() => setSurgeChoice('no')}
        >
          👎 No, it stays frozen
        </button>
      </div>
      {surgeChoice && (
        <div className="ab-callout indigo" style={{ marginTop: 12, animation: 'ab-fadein 0.3s ease' }}>
          {surgeChoice === 'no'
            ? 'Good instinct. Let\'s see what actually happens when the algorithm runs today.'
            : 'Interesting! The algorithm was designed to minimize average time — let\'s see how it handles the surge.'}
        </div>
      )}
    </div>
  );
}

// ─── Phase: AI Dispatch ───────────────────────────────────────────────────────

function PhaseAiDispatch({ onAct, algoStep, algoAssignments }: {
  onAct: ActionSetter; algoStep: number; algoAssignments: Record<string, number>;
}) {
  const complete = algoStep >= TOTAL_RIDERS;
  useEffect(() => {
    if (complete) onAct('See the Results →', true);
    else onAct(`Assigning rider ${algoStep + 1} of ${TOTAL_RIDERS}…`, false);
  }, [complete, algoStep, onAct]);

  return (
    <div className="ab-card">
      <div className="ab-card-title">🤖 {complete ? 'Algorithm Assignment Complete' : 'Algorithm Running…'}</div>
      <div className="ab-card-sub">
        {complete
          ? 'The algorithm has assigned all 8 riders based on last month\'s order volume.'
          : 'Riders are being assigned proportionally to historical order data — the more orders in the past, the more riders today.'}
      </div>
      <div className="ab-algo-tiles">
        {HOODS.map(h => {
          const count = algoAssignments[h.id] ?? 0;
          return (
            <div key={h.id} className="ab-algo-tile"
              style={{ borderColor: count > 0 ? h.color : '#e2d9ce', boxShadow: count > 0 ? `0 2px 10px ${h.color}20` : 'none' }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{h.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: h.textColor, marginBottom: 6 }}>{h.name}</div>
              <div className="ab-algo-count" style={{ color: h.color }}>{count}</div>
              <div className="ab-algo-label">riders assigned</div>
            </div>
          );
        })}
      </div>
      {complete && (
        <div className="ab-callout red" style={{ marginTop: 14 }}>
          East Hills got <strong>1 rider</strong> — the same as before the surge. The algorithm optimized for average speed, not for today&apos;s demand reality. 8 customers are waiting with just 1 rider to serve them.
        </div>
      )}
    </div>
  );
}

// ─── Phase: Reveal ────────────────────────────────────────────────────────────

function PhaseReveal({ onAct, algoResults, manualResults }: {
  onAct: ActionSetter; algoResults: NResult[]; manualResults: NResult[];
}) {
  useEffect(() => { onAct('Why Did This Happen? →', true); }, [onAct]);
  const ehAlgo = algoResults.find(r => r.id === 'easthills');
  const ehManual = manualResults.find(r => r.id === 'easthills');
  const dtAlgo = algoResults.find(r => r.id === 'downtown');
  const algSummary = summarize(algoResults);
  const manSummary = summarize(manualResults);

  return (
    <div className="ab-card">
      <div className="ab-card-title">📊 The Algorithm&apos;s Results — During the Surge</div>
      <div className="ab-card-sub">The algorithm optimized for average delivery time. Here&apos;s what that actually meant for each neighborhood.</div>

      <ResultTable results={algoResults} showOrders />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, marginBottom: 14 }}>
        <div style={{ background: '#f8f5f1', border: '1px solid #e8e0d5', borderRadius: 14, padding: '13px 15px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8998c', marginBottom: 8 }}>Your Dispatch (normal)</div>
          <div style={{ fontSize: 13, color: '#6b5f55', lineHeight: 2 }}>
            Avg wait: <strong style={{ color: '#2d2419' }}>{manSummary.avgTime} min</strong><br />
            East Hills: <strong style={{ color: '#d97706' }}>{ehManual ? timeLabel(ehManual.time) : '—'}, {ehManual?.sat ?? 0}% sat</strong>
          </div>
        </div>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '13px 15px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#dc2626', marginBottom: 8 }}>Algorithm (during surge)</div>
          <div style={{ fontSize: 13, color: '#6b5f55', lineHeight: 2 }}>
            Avg wait: <strong style={{ color: '#2d2419' }}>{algSummary.avgTime} min</strong><br />
            East Hills: <strong style={{ color: '#dc2626' }}>{ehAlgo ? timeLabel(ehAlgo.time) : '—'}, {ehAlgo?.sat ?? 0}% sat ❌</strong>
          </div>
        </div>
      </div>

      <div className="ab-callout red">
        <strong>The numbers:</strong> Algorithm sent <strong>{dtAlgo?.drivers} riders to Downtown</strong> (6 orders) and <strong>{ehAlgo?.drivers ?? 0} rider to East Hills</strong> (8 orders). The overall average looks acceptable — but it hides a deeply unfair outcome for East Hills residents.
      </div>
    </div>
  );
}

// ─── Phase: Explain Bias ──────────────────────────────────────────────────────

function PhaseExplainBias({ onAct }: { onAct: ActionSetter }) {
  useEffect(() => { onAct('Can We Fix It? →', true); }, [onAct]);
  return (
    <div className="ab-card">
      <div className="ab-card-title">💡 What Is Algorithmic Bias?</div>
      <div className="ab-card-sub">The algorithm wasn&apos;t malicious. It did exactly what it was programmed to do. That&apos;s the problem.</div>
      <div className="ab-reflect-grid">
        <div className="ab-reflect-tile">
          <div className="ab-reflect-icon">📉</div>
          <div className="ab-reflect-title">Trained on the Past</div>
          <div className="ab-reflect-desc">The algorithm learned from history where East Hills always had fewer orders. It baked that pattern into its rules — and couldn&apos;t see when today&apos;s reality changed.</div>
        </div>
        <div className="ab-reflect-tile">
          <div className="ab-reflect-icon">🔄</div>
          <div className="ab-reflect-title">Feedback Loops</div>
          <div className="ab-reflect-desc">Fewer riders → worse service → frustrated customers → fewer orders placed. The bias creates the very data that &ldquo;proves&rdquo; East Hills deserves fewer riders. The problem compounds itself.</div>
        </div>
        <div className="ab-reflect-tile">
          <div className="ab-reflect-icon">📊</div>
          <div className="ab-reflect-title">Hidden in Averages</div>
          <div className="ab-reflect-desc">The overall average delivery time still looked fine. But averages hide who suffers. East Hills was left behind — completely invisible in the headline number.</div>
        </div>
        <div className="ab-reflect-tile">
          <div className="ab-reflect-icon">⚖️</div>
          <div className="ab-reflect-title">Narrow Goals = Unfair Outcomes</div>
          <div className="ab-reflect-desc">Optimizing for speed alone concentrated resources where returns were easiest — not where need was greatest. The goal was neutral-sounding. The outcome was not.</div>
        </div>
      </div>
      <div className="ab-callout indigo" style={{ marginTop: 14 }}>
        <strong>Real-world examples:</strong> Ride-share surge pricing that excludes low-income areas. Loan algorithms that penalize certain zip codes. Healthcare AI trained on wealthier patients. Algorithmic bias consistently hits communities with the least power to push back.
      </div>
    </div>
  );
}

// ─── Phase: Fix the Goal ──────────────────────────────────────────────────────

const FIX_CHOICES = [
  {
    id: 'A' as const,
    title: 'Keep the speed-only goal',
    desc: '"Minimize average delivery time" — the same objective as before.',
    feedback: 'This is the same goal that caused the problem. Optimizing only for average speed will still systematically deprioritize remote neighborhoods.',
  },
  {
    id: 'B' as const,
    title: 'Switch to a volume goal',
    desc: '"Maximize total deliveries completed per shift."',
    feedback: 'Volume-only optimization still rewards easy, nearby neighborhoods. The algorithm would still send more riders to Downtown and neglect East Hills.',
  },
  {
    id: 'C' as const,
    title: 'Balance speed and guaranteed coverage',
    desc: '"Minimize average delivery time, while ensuring every neighborhood receives at least 2 riders."',
    feedback: '✓ By guaranteeing a minimum for every area, the algorithm cannot quietly deprioritize remote neighborhoods — even when they have lower historical demand.',
  },
];

function PhaseFixGoal({ onAct, fixGoalChoice, setFixGoalChoice }: {
  onAct: ActionSetter; fixGoalChoice: 'A' | 'B' | 'C' | null;
  setFixGoalChoice: (c: 'A' | 'B' | 'C') => void;
}) {
  useEffect(() => {
    onAct('Run the Fairer Algorithm →', fixGoalChoice === 'C');
  }, [fixGoalChoice, onAct]);

  return (
    <div className="ab-card">
      <div className="ab-card-title">🛠️ Fix the Goal</div>
      <div className="ab-card-sub">The problem wasn&apos;t the algorithm&apos;s math — it was the goal it was given. Let&apos;s pick a better one. Which objective would you choose?</div>
      <div className="ab-choice-cards">
        {FIX_CHOICES.map(choice => {
          const isChosen = fixGoalChoice === choice.id;
          const isCorrect = choice.id === 'C';
          const cls = isChosen
            ? (isCorrect ? 'chosen-right' : 'chosen-wrong')
            : (fixGoalChoice !== null ? 'dimmed' : '');
          return (
            <div
              key={choice.id}
              className={`ab-choice-card ${cls}`}
              onClick={() => { if (!fixGoalChoice) setFixGoalChoice(choice.id); }}
              style={{ opacity: fixGoalChoice && !isChosen ? 0.55 : 1 }}
            >
              <div className="ab-choice-letter">{choice.id}</div>
              <div style={{ flex: 1 }}>
                <div className="ab-choice-title">{choice.title}</div>
                <div className="ab-choice-desc">{choice.desc}</div>
                {isChosen && (
                  <div className={`ab-choice-feedback ${isCorrect ? 'right' : 'wrong'}`}>
                    {choice.feedback}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {fixGoalChoice && fixGoalChoice !== 'C' && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#8a7a6d', textAlign: 'center' }}>
          The button stays disabled until you choose the option that solves the core problem.
        </div>
      )}
    </div>
  );
}

// ─── Phase: Fairer Round ──────────────────────────────────────────────────────

function PhaseFairerRound({ onAct, fairerStep, fairerAssignments }: {
  onAct: ActionSetter; fairerStep: number; fairerAssignments: Record<string, number>;
}) {
  const complete = fairerStep >= TOTAL_RIDERS;
  useEffect(() => {
    if (complete) onAct('See the Final Comparison →', true);
    else onAct(`Assigning rider ${fairerStep + 1} of ${TOTAL_RIDERS}…`, false);
  }, [complete, fairerStep, onAct]);

  return (
    <div className="ab-card">
      <div className="ab-card-title">✅ {complete ? 'Fairer Assignment Complete' : 'Running the Balanced Algorithm…'}</div>
      <div className="ab-card-sub">
        {complete
          ? 'Every neighborhood receives at least 2 riders — guaranteed. Let\'s see how that changes things for East Hills.'
          : 'The new algorithm ensures a minimum of 2 riders per neighborhood before distributing the rest by demand.'}
      </div>
      <div className="ab-algo-tiles">
        {HOODS.map(h => {
          const count = fairerAssignments[h.id] ?? 0;
          const isEH = h.id === 'easthills';
          return (
            <div key={h.id} className="ab-algo-tile"
              style={{
                borderColor: count > 0 ? h.color : '#e2d9ce',
                boxShadow: count > 0 ? `0 2px 10px ${h.color}20` : 'none',
                outline: isEH && count >= 2 ? '2.5px solid #16a34a' : undefined,
              }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{h.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: h.textColor, marginBottom: 6 }}>{h.name}</div>
              <div className="ab-algo-count" style={{ color: h.color }}>{count}</div>
              <div className="ab-algo-label">riders assigned</div>
              {isEH && count >= 2 && <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700, marginTop: 4 }}>✓ Min coverage met</div>}
            </div>
          );
        })}
      </div>
      {complete && (
        <div className="ab-callout green" style={{ marginTop: 14 }}>
          East Hills now has <strong>2 riders for 8 orders</strong> — still stretched, but dramatically better than 1. The algorithm treats East Hills as a real neighborhood, not an afterthought.
        </div>
      )}
    </div>
  );
}

// ─── Phase: Final Reflect ─────────────────────────────────────────────────────

function PhaseFinalReflect({ onAct, algoResults, fairerResults }: {
  onAct: ActionSetter; algoResults: NResult[]; fairerResults: NResult[];
}) {
  useEffect(() => { onAct('Finish →', true); }, [onAct]);
  const ehBiased = algoResults.find(r => r.id === 'easthills');
  const ehFairer = fairerResults.find(r => r.id === 'easthills');
  const algSum = summarize(algoResults);
  const fairSum = summarize(fairerResults);

  return (
    <div className="ab-card">
      <div className="ab-card-title">🎓 What Changed — And Why It Matters</div>
      <div className="ab-card-sub">Same East Hills surge. Same 8 riders. Different goal. Very different outcomes.</div>

      {/* Comparison table */}
      <div className="ab-compare-wrap">
        <table className="ab-compare-table">
          <thead>
            <tr>
              <th className="label-col">Metric</th>
              <th className="bad-col">Speed-Only Algorithm</th>
              <th className="good-col">Balanced Algorithm</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="label-col">🏜️ East Hills riders</td>
              <td className="bad-col">{ehBiased?.drivers ?? 1}</td>
              <td className="good-col">{ehFairer?.drivers ?? 2}</td>
            </tr>
            <tr>
              <td className="label-col">🏜️ East Hills wait</td>
              <td className="bad-col">{ehBiased ? `${Math.round(ehBiased.time)} min` : '—'}</td>
              <td className="good-col">{ehFairer ? `${Math.round(ehFairer.time)} min` : '—'}</td>
            </tr>
            <tr>
              <td className="label-col">🏜️ East Hills satisfaction</td>
              <td className="bad-col">{ehBiased?.sat ?? 0}%</td>
              <td className="good-col">{ehFairer?.sat ?? 0}%</td>
            </tr>
            <tr>
              <td className="label-col">📊 Overall avg wait</td>
              <td className="bad-col">{algSum.avgTime} min</td>
              <td className="good-col">{fairSum.avgTime} min</td>
            </tr>
            <tr>
              <td className="label-col">📦 Total delivered</td>
              <td className="bad-col">{algSum.delivered}</td>
              <td className="good-col">{fairSum.delivered}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Key lesson */}
      <div style={{ background: '#1e1b4b', borderRadius: 16, padding: '20px 22px', marginTop: 16, color: '#fff' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a5b4fc', marginBottom: 8 }}>The Core Lesson</div>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5, marginBottom: 10 }}>
          &ldquo;A neutral-looking goal can still create biased outcomes.&rdquo;
        </div>
        <div style={{ fontSize: 13, color: '#c7d2fe', lineHeight: 1.65 }}>
          &ldquo;Minimize average delivery time&rdquo; sounds perfectly fair. But when that average is calculated over neighborhoods with very different distances and historical order volumes, it systematically advantages the easy areas — and leaves the rest behind.
        </div>
      </div>

      <div className="ab-callout indigo" style={{ marginTop: 12 }}>
        <strong>What fairness actually requires:</strong> Explicitly designing for equity — not just efficiency. That means asking: &ldquo;Who benefits from this goal, and who doesn&apos;t?&rdquo; before the algorithm ever runs.
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        {[
          { icon: '🚗', txt: 'Ride-share surge pricing that excludes low-income areas' },
          { icon: '🏠', txt: 'Loan algorithms that penalize certain zip codes' },
          { icon: '🏥', txt: 'Healthcare AI trained mostly on wealthier patient populations' },
        ].map(({ icon, txt }) => (
          <div key={txt} style={{ flex: 1, minWidth: 160, background: '#f8f5f1', border: '1px solid #e8e0d5', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#6b5f55', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            <span>{txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AlgorithmBias() {
  const [phase, setPhase] = useState<GamePhase>('explore');
  const [btnLabel, setBtnLabel] = useState('');
  const [btnEnabled, setBtnEnabled] = useState(false);
  const actionFnRef = useRef<(() => void) | null>(null);

  // Explore
  const [visitedSet, setVisitedSet] = useState(new Set<string>());
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Manual dispatch
  const [assignments, setAssignments] = useState<Record<string, number>>({ downtown: 2, midtown: 2, northsuburb: 2, easthills: 2 });
  const [manualResults, setManualResults] = useState<NResult[]>([]);
  const [runDispatchReady, setRunDispatchReady] = useState(false);

  // Surge
  const [surgeChoice, setSurgeChoice] = useState<'yes' | 'no' | null>(null);

  // AI dispatch
  const [algoStep, setAlgoStep] = useState(0);
  const [algoNewId, setAlgoNewId] = useState<string | null>(null);
  const [algoResults, setAlgoResults] = useState<NResult[]>([]);

  // Fix goal
  const [fixGoalChoice, setFixGoalChoice] = useState<'A' | 'B' | 'C' | null>(null);

  // Fairer round
  const [fairerStep, setFairerStep] = useState(0);
  const [fairerNewId, setFairerNewId] = useState<string | null>(null);
  const [fairerResults, setFairerResults] = useState<NResult[]>([]);

  // Computed assignments
  const algoAssignments = useMemo(() => computeSeqAssignments(ALGO_SEQUENCE, algoStep), [algoStep]);
  const fairerAssignments = useMemo(() => computeSeqAssignments(FAIRER_SEQUENCE, fairerStep), [fairerStep]);

  // Rider animation
  const riderProgressRef = useRef<Record<string, number[]>>({});
  const [riderPositions, setRiderPositions] = useState<Record<string, RiderPos[]>>({});

  const animRunning =
    phase === 'assign' || phase === 'runDispatch' || phase === 'quickResult' ||
    (phase === 'aiDispatch' && algoStep >= TOTAL_RIDERS) ||
    (phase === 'fairerRound' && fairerStep >= TOTAL_RIDERS);

  const activeAnimAssignments: Record<string, number> =
    phase === 'aiDispatch' ? algoAssignments :
    phase === 'fairerRound' ? fairerAssignments :
    assignments;

  const displayAssignments: Record<string, number> =
    (phase === 'aiDispatch' || phase === 'reveal') ? computeSeqAssignments(ALGO_SEQUENCE, TOTAL_RIDERS) :
    phase === 'fairerRound' ? fairerAssignments :
    assignments;

  const surgeActive = ['surgeSurprise', 'aiDispatch', 'reveal', 'fairerRound'].includes(phase);
  const showMap = !['explainBias', 'fixGoal', 'finalReflect'].includes(phase);
  const showLiveBar = phase === 'assign';
  const liveResults = useMemo(() => simulate(assignments), [assignments]);

  // Auto-timer for runDispatch
  useEffect(() => {
    if (phase !== 'runDispatch') return;
    setRunDispatchReady(false);
    const t = setTimeout(() => setRunDispatchReady(true), 1800);
    return () => clearTimeout(t);
  }, [phase]);

  // AI dispatch step animation
  useEffect(() => {
    if (phase !== 'aiDispatch' || algoStep >= TOTAL_RIDERS) return;
    const t = setTimeout(() => {
      const id = ALGO_SEQUENCE[algoStep];
      setAlgoNewId(id);
      setAlgoStep(s => s + 1);
      setTimeout(() => setAlgoNewId(null), 600);
    }, 700);
    return () => clearTimeout(t);
  }, [phase, algoStep]);

  // Fairer round step animation
  useEffect(() => {
    if (phase !== 'fairerRound' || fairerStep >= TOTAL_RIDERS) return;
    const t = setTimeout(() => {
      const id = FAIRER_SEQUENCE[fairerStep];
      setFairerNewId(id);
      setFairerStep(s => s + 1);
      setTimeout(() => setFairerNewId(null), 600);
    }, 600);
    return () => clearTimeout(t);
  }, [phase, fairerStep]);

  // Sync rider counts
  useEffect(() => {
    const ref = riderProgressRef.current;
    for (const h of HOODS) {
      const count = activeAnimAssignments[h.id] ?? 0;
      const existing = ref[h.id] ?? [];
      if (existing.length === count) continue;
      if (existing.length < count) {
        ref[h.id] = [...existing, ...Array.from({ length: count - existing.length }, (_, i) =>
          ((existing.length + i) / Math.max(1, count)) * 2
        )];
      } else {
        ref[h.id] = existing.slice(0, count);
      }
    }
  }, [activeAnimAssignments, phase]);

  // Rider animation loop
  useEffect(() => {
    if (!animRunning) return;
    const interval = setInterval(() => {
      const ref = riderProgressRef.current;
      const next: Record<string, RiderPos[]> = {};
      for (const h of HOODS) {
        const progs = ref[h.id] ?? [];
        if (!progs.length) continue;
        ref[h.id] = progs.map(p => (p + riderSpeed(h)) % 2);
        next[h.id] = ref[h.id].map(p => {
          const t = progressToT(p);
          const [x, y] = pathPosition(h.id, t);
          return { x, y, delivering: riderIsDelivering(p) };
        });
      }
      setRiderPositions(next);
    }, 33);
    return () => clearInterval(interval);
  }, [animRunning]);

  const setAction = useCallback<ActionSetter>((label, enabled, fn?) => {
    setBtnLabel(label); setBtnEnabled(enabled); actionFnRef.current = fn ?? null;
  }, []);

  function advance(next: GamePhase) {
    setBtnLabel(''); setBtnEnabled(false); actionFnRef.current = null;
    if (next === 'runDispatch') setManualResults(simulate(assignments));
    if (next === 'aiDispatch') { setAlgoStep(0); setAlgoNewId(null); }
    if (next === 'reveal') setAlgoResults(simulate(computeSeqAssignments(ALGO_SEQUENCE, TOTAL_RIDERS), ALGO_ORDERS_SURGE));
    if (next === 'fairerRound') { setFairerStep(0); setFairerNewId(null); }
    if (next === 'finalReflect') setFairerResults(simulate(computeSeqAssignments(FAIRER_SEQUENCE, TOTAL_RIDERS), ALGO_ORDERS_SURGE));
    setPhase(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleActionClick() {
    if (actionFnRef.current) { actionFnRef.current(); return; }
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < PHASE_ORDER.length - 1) advance(PHASE_ORDER[idx + 1]);
  }

  const highlightId = phase === 'aiDispatch' ? algoNewId : phase === 'fairerRound' ? fairerNewId : null;

  return (
    <div className="ab-page">
      <style>{STYLES}</style>
      <StepIndicator phase={phase} onBack={p => advance(p)} />

      {showLiveBar && <LiveBar results={liveResults} />}

      {showMap && (
        <MapBoard
          phase={phase}
          displayAssignments={displayAssignments}
          riderPositions={riderPositions}
          visitedSet={visitedSet}
          activeTab={activeTab}
          onHotspotClick={id => { setActiveTab(prev => prev === id ? null : id); setVisitedSet(p => new Set([...p, id])); }}
          highlightId={highlightId}
          surgeActive={surgeActive}
        />
      )}

      {phase === 'explore' && (
        <PhaseExplore onAct={setAction} visitedSet={visitedSet} activeTab={activeTab} setActiveTab={setActiveTab} setVisited={setVisitedSet} />
      )}
      {phase === 'goalSetup' && <PhaseGoalSetup onAct={setAction} />}
      {phase === 'assign' && <PhaseAssign onAct={setAction} assignments={assignments} setAssignments={setAssignments} />}
      {phase === 'runDispatch' && <PhaseRunDispatch onAct={setAction} runReady={runDispatchReady} />}
      {phase === 'quickResult' && manualResults.length > 0 && <PhaseQuickResult onAct={setAction} results={manualResults} />}
      {phase === 'strategyToAlgo' && <PhaseStrategyToAlgo onAct={setAction} assignments={assignments} />}
      {phase === 'surgeSurprise' && (
        <PhaseSurgeSurprise onAct={setAction} surgeChoice={surgeChoice} setSurgeChoice={setSurgeChoice} />
      )}
      {phase === 'aiDispatch' && (
        <PhaseAiDispatch onAct={setAction} algoStep={algoStep} algoAssignments={algoAssignments} />
      )}
      {phase === 'reveal' && algoResults.length > 0 && manualResults.length > 0 && (
        <PhaseReveal onAct={setAction} algoResults={algoResults} manualResults={manualResults} />
      )}
      {phase === 'explainBias' && <PhaseExplainBias onAct={setAction} />}
      {phase === 'fixGoal' && (
        <PhaseFixGoal onAct={setAction} fixGoalChoice={fixGoalChoice} setFixGoalChoice={setFixGoalChoice} />
      )}
      {phase === 'fairerRound' && (
        <PhaseFairerRound onAct={setAction} fairerStep={fairerStep} fairerAssignments={fairerAssignments} />
      )}
      {phase === 'finalReflect' && fairerResults.length > 0 && algoResults.length > 0 && (
        <PhaseFinalReflect onAct={setAction} algoResults={algoResults} fairerResults={fairerResults} />
      )}

      <BottomAction label={btnLabel} enabled={btnEnabled} onClick={handleActionClick} />
    </div>
  );
}

export default AlgorithmBias;
