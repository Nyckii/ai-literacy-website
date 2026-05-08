// AlgorithmBias.tsx — "Fair or Fast?" Delivery Bias Game
// Flow: Explore → Goal → Your Turn → Automate → Bias → Reflect
// Fix It stage (fixIt / fairerRound / finalReflect) is preserved in code but hidden from UI.
// Your Turn uses click-on-map dispatch: click a neighborhood to send one available rider there.

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import mapImg from './assets/AlgorithmBiasImg/city-delivery-map.png';

// ─── Types ────────────────────────────────────────────────────────────────────

type GamePhase =
  | 'explore'
  | 'goal'
  | 'yourTurn'
  | 'automate'
  | 'bias'
  | 'reflect'
  // ── HIDDEN (code preserved, not reachable from normal flow) ──
  | 'fixIt'
  | 'fairerRound'
  | 'finalReflect';

interface Hood {
  id: string; name: string; emoji: string;
  color: string; bgColor: string; textColor: string;
  pos: { x: number; y: number };
  radius: number;
  baseOrders: number; baseTime: number; minTime: number;
  tagline: string; exploreInfo: string; difficulty: string;
  earnings: number;
}

interface NResult {
  id: string; drivers: number; orders: number;
  time: number; sat: number; delivered: number;
}

// Individual live rider — used during "Your Turn" for real-time dispatch
interface LiveRider {
  id: number;
  hoodId: string;
  progress: number; // 0→1 outbound, 1→1.3 delivering, 1.3→2.3 returning
  served: boolean;  // true once delivery was counted
}

interface RiderMapPos {
  x: number; y: number; delivering: boolean;
}

// Explore demo state
interface ExploreDemo {
  hoodId: string;
  progress: number;
  phase: 'outbound' | 'arrived' | 'returning' | 'done';
}

// ─── Map Constants ────────────────────────────────────────────────────────────

// HQ = the large central warehouse building (~43% left, ~47% top in the image)
const HQ = { x: 43, y: 47 };

// Road waypoints follow visible roads in the PNG (x/y in 0–100 range)
const ROAD_PATHS: Record<string, [number, number][]> = {
  downtown:    [[43, 47], [36, 52], [29, 58], [25, 65]],
  midtown:     [[43, 47], [35, 43], [28, 38], [25, 33]],
  northsuburb: [[43, 47], [43, 36], [43, 26], [42, 17]],
  easthills:   [[43, 47], [53, 47], [63, 47], [73, 47]],
};

const HOODS: Hood[] = [
  {
    id: 'downtown', name: 'Downtown', emoji: '🏙️',
    color: '#4f46e5', bgColor: 'rgba(79,70,229,0.15)', textColor: '#4338ca',
    pos: { x: 25, y: 65 }, radius: 9,
    baseOrders: 6, baseTime: 8, minTime: 4, earnings: 10,
    tagline: 'Dense · Fast · Profitable',
    difficulty: 'Easy — short trips',
    exploreInfo: 'Packed skyscrapers, busy restaurants, tight grid roads. Riders can zip in and out — very short trips, high order volume.',
  },
  {
    id: 'midtown', name: 'Midtown', emoji: '🏢',
    color: '#0891b2', bgColor: 'rgba(8,145,178,0.15)', textColor: '#0e7490',
    pos: { x: 25, y: 33 }, radius: 8,
    baseOrders: 4, baseTime: 13, minTime: 6, earnings: 11,
    tagline: 'Mixed · Steady · Moderate',
    difficulty: 'Medium — moderate trips',
    exploreInfo: 'Office towers and apartment blocks mixed together. Steady orders through the day, manageable distances from HQ.',
  },
  {
    id: 'northsuburb', name: 'North Suburb', emoji: '🏘️',
    color: '#d97706', bgColor: 'rgba(217,119,6,0.15)', textColor: '#b45309',
    pos: { x: 42, y: 17 }, radius: 7,
    baseOrders: 3, baseTime: 17, minTime: 8, earnings: 13,
    tagline: 'Quiet · Spread out · Longer rides',
    difficulty: 'Harder — homes spread out',
    exploreInfo: 'Peaceful residential streets where houses are far apart. Fewer orders per shift, but each delivery covers more ground.',
  },
  {
    id: 'easthills', name: 'East Hills', emoji: '🏜️',
    color: '#dc2626', bgColor: 'rgba(220,38,38,0.15)', textColor: '#b91c1c',
    pos: { x: 73, y: 47 }, radius: 9,
    baseOrders: 3, baseTime: 23, minTime: 10, earnings: 16,
    tagline: 'Remote · Winding roads · Hardest',
    difficulty: 'Hardest — longest trips',
    exploreInfo: 'The most remote neighborhood. Long winding roads mean every delivery is a journey — but residents here need service just as much as anyone.',
  },
];

// Biased algorithm (proportional to historical order volume)
const ALGO_SEQUENCE = ['downtown', 'midtown', 'northsuburb', 'downtown', 'easthills', 'midtown', 'northsuburb', 'downtown'];
// Fairer algorithm (guaranteed min coverage)
const FAIRER_SEQUENCE = ['downtown', 'easthills', 'midtown', 'northsuburb', 'downtown', 'easthills', 'midtown', 'northsuburb'];
// East Hills demand surge
const ALGO_ORDERS_SURGE: Record<string, number> = { downtown: 6, midtown: 4, northsuburb: 3, easthills: 8 };

const TOTAL_RIDERS = 8;
const YOUR_TURN_DURATION = 90;
const LIVE_GOALS = {
  avgTrip: 15,
  delivered: 13,
  earnings: 130,
};

const LIVE_TRIP_SECONDS: Record<string, number> = {
  downtown: 9,
  midtown: 14,
  northsuburb: 23,
  easthills: 36,
};

const DEMAND_CAPS: Record<string, number> = {
  downtown: 12,
  midtown: 10,
  northsuburb: 8,
  easthills: 8,
};

const DEMAND_WEIGHTS = [
  { id: 'downtown', weight: 0.44 },
  { id: 'midtown', weight: 0.29 },
  { id: 'northsuburb', weight: 0.14 },
  { id: 'easthills', weight: 0.13 },
];

// Initial demand at game start
const INITIAL_DEMAND: Record<string, number> = { downtown: 7, midtown: 5, northsuburb: 3, easthills: 4 };

// ─── Simulation Helpers ───────────────────────────────────────────────────────

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
    ? Math.round(served.reduce((a, r) => a + r.time, 0) / served.length * 10) / 10 : 0;
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
function liveTripSeconds(hoodId: string) {
  return LIVE_TRIP_SECONDS[hoodId] ?? 18;
}
function totalDemand(demand: Record<string, number>) {
  return Object.values(demand).reduce((a, v) => a + v, 0);
}
function weightedDemandHood() {
  const roll = Math.random();
  let cursor = 0;
  for (const item of DEMAND_WEIGHTS) {
    cursor += item.weight;
    if (roll <= cursor) return item.id;
  }
  return 'downtown';
}

// ─── Path / Animation Helpers ─────────────────────────────────────────────────

function pathPosition(hoodId: string, t: number): [number, number] {
  const wps = ROAD_PATHS[hoodId];
  if (!wps) return [HQ.x, HQ.y];
  if (t <= 0) return [HQ.x, HQ.y];
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

// progress: 0→1 outbound, 1→1.3 delivering (at dest), 1.3→2.3 returning
function progressToXY(hoodId: string, progress: number): [number, number] {
  if (progress <= 1.0) return pathPosition(hoodId, progress);
  if (progress <= 1.3) return pathPosition(hoodId, 1.0);
  const returnT = 1.0 - (progress - 1.3); // 1.3→2.3 maps back to 1→0
  return pathPosition(hoodId, Math.max(0, returnT));
}

function riderIsDelivering(progress: number) { return progress > 1.0 && progress <= 1.3; }

// Round-trip speeds are intentionally uneven to create live dispatch pressure.
function riderSpeedForHood(h: Hood): number {
  const roundTripSecs = liveTripSeconds(h.id);
  return 2.3 / (roundTripSecs * 30); // progress units per frame at 30fps
}

// Speed for Explore demo (same function, distinct usage)
const demoRiderSpeed = riderSpeedForHood;

// ─── CSS ──────────────────────────────────────────────────────────────────────

const STYLES = `
.ab-page {
  min-height: 100vh;
  background: #ede9e3;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px 110px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #2d2419;
}

/* ── Stepper ── */
.ab-stepper { display:flex; align-items:flex-start; gap:0; padding:18px 0 10px; width:100%; max-width:860px; }
.ab-step { display:flex; flex-direction:column; align-items:center; flex:1; user-select:none; }
.ab-step-dot { width:10px; height:10px; border-radius:50%; background:#d5cec6; border:2px solid #c4bcb3; transition:all 0.25s; }
.ab-step.done .ab-step-dot { background:#16a34a; border-color:#15803d; cursor:pointer; }
.ab-step.active .ab-step-dot { background:#4f46e5; border-color:#4338ca; box-shadow:0 0 0 4px rgba(79,70,229,0.18); width:12px; height:12px; }
.ab-step-label { font-size:10px; color:#a8998c; margin-top:5px; text-align:center; white-space:nowrap; }
.ab-step.active .ab-step-label { color:#4f46e5; font-weight:700; }
.ab-step.done .ab-step-label { color:#7a6e64; }
.ab-step-line { flex:1; height:2px; background:#ddd5ca; margin-top:4px; }
.ab-step-line.done { background:rgba(22,163,74,0.4); }

/* ── Live HUD bar ── */
.ab-hud { display:flex; gap:8px; width:100%; max-width:860px; flex-wrap:wrap; }
.ab-goal-panel {
  flex:1 1 520px; background:#fff; border:2px solid #d8d0ff; border-radius:14px;
  padding:10px 14px; box-shadow:0 2px 10px rgba(79,70,229,0.08);
  display:flex; align-items:center; justify-content:space-between; gap:12px;
}
.ab-goal-panel.safe { border-color:#86efac; background:#f0fdf4; }
.ab-goal-panel.warn { border-color:#fbbf24; background:#fffbeb; }
.ab-goal-panel.bad { border-color:#fca5a5; background:#fef2f2; }
.ab-goal-main { min-width:0; }
.ab-goal-kicker { font-size:9px; color:#7a6e64; text-transform:uppercase; letter-spacing:0.08em; font-weight:800; margin-bottom:2px; }
.ab-goal-title { font-size:18px; color:#2d2419; font-weight:850; letter-spacing:-0.02em; }
.ab-goal-meta { font-size:12px; color:#6b5f55; margin-top:3px; font-weight:650; }
.ab-goal-avg { flex:0 0 auto; font-size:24px; font-weight:850; font-variant-numeric:tabular-nums; color:#4f46e5; text-align:right; }
.ab-goal-panel.safe .ab-goal-avg { color:#16a34a; }
.ab-goal-panel.warn .ab-goal-avg { color:#d97706; }
.ab-goal-panel.bad .ab-goal-avg { color:#dc2626; }
.ab-hud-secondary {
  flex:1 1 210px; background:#fff; border:1px solid #e2d9ce; border-radius:14px;
  padding:10px 14px; display:flex; align-items:center; justify-content:center;
  gap:14px; color:#6b5f55; font-size:12px; font-weight:750;
  box-shadow:0 1px 4px rgba(0,0,0,0.05);
}
.ab-hud-tile {
  flex:1; min-width:90px;
  background:#fff; border:1px solid #e2d9ce; border-radius:12px;
  padding:8px 10px; text-align:center;
  box-shadow:0 1px 4px rgba(0,0,0,0.06);
}
.ab-hud-val { font-size:18px; font-weight:700; color:#2d2419; font-variant-numeric:tabular-nums; line-height:1; margin-bottom:2px; }
.ab-hud-val.ok  { color:#16a34a; }
.ab-hud-val.warn { color:#d97706; }
.ab-hud-val.bad  { color:#dc2626; }
.ab-hud-label { font-size:9px; color:#a8998c; text-transform:uppercase; letter-spacing:0.07em; font-weight:600; }
.ab-timer-tile {
  flex:0 0 auto; min-width:88px;
  background:#fff8f0; border:1.5px solid #f4c07a; border-radius:12px;
  padding:8px 10px; text-align:center;
  box-shadow:0 1px 4px rgba(0,0,0,0.06);
}
.ab-timer-tile.urgent { background:#fef2f2; border-color:#fca5a5; }
.ab-timer-val { font-size:22px; font-weight:800; color:#c87722; font-variant-numeric:tabular-nums; line-height:1; }
.ab-timer-tile.urgent .ab-timer-val { color:#dc2626; }
.ab-timer-label { font-size:9px; color:#a8998c; text-transform:uppercase; letter-spacing:0.07em; font-weight:600; }

/* ── Map ── */
.ab-map-wrap {
  position:relative; width:100%; max-width:860px;
  border-radius:18px; overflow:hidden;
  box-shadow:0 2px 6px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06);
  margin-top:10px;
}
.ab-map-img { width:100%; display:block; pointer-events:none; user-select:none; }
.ab-map-svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }

/* ── Riders ── */
.ab-rider {
  position:absolute; width:30px; height:30px; border-radius:50%;
  background:#e05c20; border:2.5px solid #fff;
  display:flex; align-items:center; justify-content:center;
  font-size:14px; line-height:1;
  box-shadow:0 2px 8px rgba(0,0,0,0.28);
  transform:translate(-50%,-50%);
  z-index:20; pointer-events:none;
  transition:left 0.04s linear, top 0.04s linear;
}
.ab-rider.delivering { animation:ab-deliver 0.5s ease-in-out infinite alternate; background:#c03c06; }
.ab-rider-idle {
  position:absolute; width:22px; height:22px; border-radius:50%;
  background:#6b5f55; border:2px solid #fff;
  display:flex; align-items:center; justify-content:center;
  font-size:10px;
  box-shadow:0 1px 5px rgba(0,0,0,0.22);
  transform:translate(-50%,-50%);
  z-index:18; pointer-events:none; opacity:0.85;
}

/* ── Demand badge ── */
.ab-demand {
  position:absolute; transform:translate(-50%,-100%);
  background:#fff; border:2px solid #c25e1a; border-radius:10px;
  padding:4px 10px 5px;
  box-shadow:0 2px 10px rgba(0,0,0,0.14);
  white-space:nowrap; pointer-events:none;
  animation:ab-bob 2.2s ease-in-out infinite;
  z-index:15; text-align:center; min-width:54px;
}
.ab-demand-label { font-size:8px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:#a34a10; display:block; margin-bottom:1px; }
.ab-demand-count { font-size:13px; font-weight:700; color:#a34a10; display:block; }
.ab-demand.surge { border-color:#dc2626; animation:ab-surge-arrive 0.5s ease both, ab-urgency 1s ease-in-out 0.5s infinite; }
.ab-demand.surge .ab-demand-label { color:#dc2626; }
.ab-demand.surge .ab-demand-count  { color:#dc2626; }
.ab-demand.no-demand { opacity:0.35; }

/* ── HQ badge (shown during Your Turn) ── */
.ab-hq-badge {
  position:absolute; transform:translate(-50%,-100%);
  background:#4f46e5; color:#fff; border-radius:20px;
  padding:4px 11px 5px; font-size:12px; font-weight:700;
  box-shadow:0 2px 10px rgba(79,70,229,0.32);
  pointer-events:none; z-index:30; white-space:nowrap; text-align:center;
  animation:ab-fadein 0.3s ease both;
}
.ab-hq-badge.warn { background:#dc2626; }

/* ── Neighborhood hotspot (Explore + Your Turn dispatch) ── */
.ab-hotspot {
  position:absolute; transform:translate(-50%,-50%);
  border:none; cursor:pointer; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:clamp(14px,2vw,22px);
  transition:transform 0.18s, box-shadow 0.18s;
  z-index:25;
}
.ab-hotspot:hover { transform:translate(-50%,-50%) scale(1.18); }
.ab-hotspot.dispatch:hover { box-shadow:0 6px 22px rgba(0,0,0,0.22); }
.ab-hotspot.dispatch.has-demand:hover { transform:translate(-50%,-50%) scale(1.22); }
.ab-hotspot.dispatch.no-demand { opacity:0.45; cursor:default; }
.ab-hotspot.dispatch.no-demand:hover { transform:translate(-50%,-50%); box-shadow:none; }
.ab-hotspot.dispatch.no-riders { cursor:not-allowed; }

/* ── Feedback toast ── */
.ab-feedback-toast {
  position:absolute; left:50%; transform:translateX(-50%);
  bottom:8px;
  background:rgba(45,36,25,0.88); color:#fff;
  border-radius:22px; padding:7px 18px;
  font-size:12px; font-weight:600;
  box-shadow:0 4px 16px rgba(0,0,0,0.22);
  pointer-events:none; z-index:50; white-space:nowrap;
  animation:ab-toast-in 0.22s ease both;
}
@keyframes ab-toast-in { from{opacity:0;transform:translateX(-50%) translateY(8px);} to{opacity:1;transform:translateX(-50%) translateY(0);} }

/* ── Hood tooltip (on hover in dispatch mode) ── */
.ab-hood-hint {
  position:absolute; transform:translate(-50%, -100%);
  background:rgba(45,36,25,0.82); color:#fff;
  border-radius:10px; padding:5px 11px;
  font-size:11px; font-weight:600;
  box-shadow:0 2px 8px rgba(0,0,0,0.2);
  pointer-events:none; z-index:40; white-space:nowrap;
  display:none;
}
.ab-hotspot:hover ~ .ab-hood-hint { display:block; }

/* ── Demo rider (Explore single-rider animation) ── */
.ab-demo-rider {
  position:absolute; width:32px; height:32px; border-radius:50%;
  background:#4f46e5; border:3px solid #fff;
  display:flex; align-items:center; justify-content:center;
  font-size:15px;
  box-shadow:0 2px 10px rgba(79,70,229,0.42);
  transform:translate(-50%,-50%);
  z-index:30; pointer-events:none;
}

/* ── Cards ── */
.ab-card {
  background:#fff; border:1px solid #e2d9ce; border-radius:18px;
  padding:22px 26px; width:100%; max-width:860px; margin-top:10px;
  box-shadow:0 1px 6px rgba(0,0,0,0.07);
  animation:ab-fadein 0.35s ease both;
}
.ab-card-title { font-size:21px; font-weight:800; color:#2d2419; margin:0 0 5px; letter-spacing:-0.02em; }
.ab-card-sub   { font-size:14px; color:#8a7a6d; margin:0 0 16px; line-height:1.55; }
.ab-callout { padding:12px 16px; border-radius:12px; font-size:13px; line-height:1.6; }
.ab-callout.indigo { background:#eef2ff; border:1px solid #c7d2fe; color:#3730a3; }
.ab-callout.amber  { background:#fffbeb; border:1px solid #fde68a; color:#92400e; }
.ab-callout.red    { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
.ab-callout.green  { background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; }

/* ── Your Turn info panel ── */
.ab-yt-panel {
  width:100%; max-width:860px; margin-top:10px;
  background:#fff; border:1px solid #e2d9ce; border-radius:16px;
  padding:14px 20px;
  box-shadow:0 1px 6px rgba(0,0,0,0.07);
  display:flex; flex-direction:column; gap:10px;
}
.ab-yt-instruction {
  font-size:14px; font-weight:700; color:#2d2419; text-align:center;
}
.ab-yt-instruction span { color:#4f46e5; }
.ab-yt-feedback {
  font-size:13px; font-weight:600; color:#8a7a6d;
  background:#f8f5f1; border-radius:10px;
  padding:8px 14px; text-align:center;
  animation:ab-fadein 0.2s ease both;
  min-height:36px;
  display:flex; align-items:center; justify-content:center;
}
.ab-yt-feedback.warn { background:#fef2f2; color:#991b1b; }
.ab-yt-hood-stats {
  display:flex; gap:8px; flex-wrap:wrap;
}
.ab-yt-hood-chip {
  flex:1; min-width:120px;
  border-radius:10px; border:1.5px solid;
  padding:6px 10px;
  font-size:11px; font-weight:600;
  display:flex; flex-direction:column; gap:2px;
}

/* ── Result table ── */
.ab-rtable { width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; }
.ab-rtable th { text-align:left; color:#a8998c; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; padding:6px 10px; border-bottom:1px solid #e8e0d5; }
.ab-rtable td { padding:9px 10px; border-bottom:1px solid #f0ebe4; }
.ab-rtable tr:last-child td { border-bottom:none; }
.ab-row-ok td  { background:rgba(22,163,74,0.04); }
.ab-row-warn td { background:rgba(217,119,6,0.05); }
.ab-row-bad td { background:rgba(220,38,38,0.06); }
.ab-badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:12px; font-weight:700; }
.ab-badge-ok   { background:rgba(22,163,74,0.12); color:#16a34a; }
.ab-badge-warn { background:rgba(217,119,6,0.12); color:#d97706; }
.ab-badge-bad  { background:rgba(220,38,38,0.12); color:#dc2626; }
.ab-badge-zero { background:rgba(220,38,38,0.18); color:#b91c1c; border:1px solid rgba(220,38,38,0.25); }

/* ── Algo tiles ── */
.ab-algo-tiles { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
.ab-algo-tile { flex:1; min-width:120px; background:#f8f5f1; border:2px solid #e2d9ce; border-radius:14px; padding:12px; text-align:center; transition:all 0.3s; }
.ab-algo-count { font-size:30px; font-weight:800; font-variant-numeric:tabular-nums; line-height:1; }
.ab-algo-label { font-size:11px; color:#a8998c; margin-top:2px; }

/* ── Strategy box ── */
.ab-strategy-box { background:#eef2ff; border:2px solid #c7d2fe; border-radius:14px; padding:16px 18px; margin-bottom:14px; }
.ab-strategy-rule { background:#fff; border:1.5px dashed #c7d2fe; border-radius:10px; padding:12px 16px; font-size:14px; color:#3730a3; font-weight:600; font-style:italic; margin-top:10px; line-height:1.5; }

/* ── News banner ── */
.ab-news-banner { background:linear-gradient(135deg,#dc2626,#b91c1c); color:#fff; border-radius:14px; padding:16px 20px; margin-bottom:16px; animation:ab-fadein 0.4s ease both; }
.ab-news-tag  { font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; opacity:0.75; margin-bottom:4px; }
.ab-news-text { font-size:20px; font-weight:800; line-height:1.3; }

/* ── Compare table ── */
.ab-compare-wrap { overflow:hidden; border-radius:14px; border:1px solid #e2d9ce; margin-top:12px; }
.ab-compare-table { width:100%; border-collapse:collapse; font-size:13px; }
.ab-compare-table th { padding:10px 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; }
.ab-compare-table th.label-col { text-align:left; background:#f8f5f1; color:#8a7a6d; }
.ab-compare-table th.bad-col  { background:#fef2f2; color:#dc2626; text-align:center; }
.ab-compare-table th.good-col { background:#f0fdf4; color:#16a34a; text-align:center; }
.ab-compare-table td { padding:9px 14px; border-top:1px solid #f0ebe4; }
.ab-compare-table td.label-col { background:#fafaf8; color:#6b5f55; font-weight:600; }
.ab-compare-table td.bad-col  { background:#fef9f9; text-align:center; font-weight:700; color:#dc2626; }
.ab-compare-table td.good-col { background:#f6fff8; text-align:center; font-weight:700; color:#16a34a; }

/* ── Reflect tiles ── */
.ab-reflect-grid { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
.ab-reflect-tile { flex:1; min-width:180px; background:#f8f5f1; border:1px solid #e8e0d5; border-radius:16px; padding:16px; }
.ab-reflect-icon  { font-size:26px; margin-bottom:8px; }
.ab-reflect-title { font-size:14px; font-weight:700; color:#2d2419; margin-bottom:5px; }
.ab-reflect-desc  { font-size:13px; color:#7a6e64; line-height:1.55; }

/* ── Fix-It choice cards ── */
.ab-choice-cards { display:flex; flex-direction:column; gap:10px; margin-top:12px; }
.ab-choice-card { background:#f8f5f1; border:2px solid #e2d9ce; border-radius:14px; padding:14px 18px; cursor:pointer; transition:all 0.2s; display:flex; gap:14px; align-items:flex-start; }
.ab-choice-card:hover:not(.chosen) { border-color:#4f46e5; background:#f5f4ff; }
.ab-choice-card.chosen-wrong { border-color:#dc2626; background:#fef2f2; cursor:default; }
.ab-choice-card.chosen-right { border-color:#16a34a; background:#f0fdf4; cursor:default; }
.ab-choice-letter { width:32px; height:32px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; background:#e8e0d5; color:#6b5f55; }
.ab-choice-card.chosen-right .ab-choice-letter { background:#16a34a; color:#fff; }
.ab-choice-card.chosen-wrong .ab-choice-letter { background:#dc2626; color:#fff; }
.ab-choice-title { font-size:14px; font-weight:700; color:#2d2419; margin-bottom:2px; }
.ab-choice-desc  { font-size:12px; color:#8a7a6d; line-height:1.5; }
.ab-choice-feedback { font-size:12px; margin-top:6px; font-weight:600; padding:4px 8px; border-radius:6px; }
.ab-choice-feedback.wrong { color:#991b1b; background:rgba(220,38,38,0.1); }
.ab-choice-feedback.right { color:#166534; background:rgba(22,163,74,0.1); }

/* ── Explore panel ── */
.ab-explore-panel { width:100%; max-width:860px; margin-top:10px; background:#fff; border:1px solid #e2d9ce; border-radius:16px; overflow:hidden; box-shadow:0 1px 6px rgba(0,0,0,0.06); }
.ab-explore-tabs { display:flex; border-bottom:1px solid #e2d9ce; }
.ab-explore-tab { flex:1; padding:10px 6px; border:none; background:none; cursor:pointer; font-size:12px; font-weight:600; color:#a8998c; transition:all 0.18s; display:flex; flex-direction:column; align-items:center; gap:3px; }
.ab-explore-tab:hover { color:#2d2419; }
.ab-explore-tab.active  { color:#4f46e5; background:#f5f4ff; border-bottom:2.5px solid #4f46e5; margin-bottom:-1px; }
.ab-explore-tab.visited { color:#16a34a; }
.ab-explore-content { padding:16px 20px; }
.ab-explore-empty { color:#b0a499; font-size:14px; padding:20px; text-align:center; }
.ab-trip-result { margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; }
.ab-trip-stat { flex:1; min-width:100px; border-radius:12px; padding:10px 14px; text-align:center; animation:ab-fadein 0.3s ease both; }
.ab-trip-stat-val { font-size:22px; font-weight:800; line-height:1; margin-bottom:3px; }
.ab-trip-stat-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; opacity:0.7; }

/* ── Round complete banner ── */
.ab-round-done { width:100%; max-width:860px; margin-top:10px; background:#f0fdf4; border:2px solid #86efac; border-radius:16px; padding:16px 20px; text-align:center; animation:ab-fadein 0.4s ease both; }

/* ── Spinner ── */
.ab-spinner { width:18px; height:18px; border:2.5px solid #e2d9ce; border-top-color:#4f46e5; border-radius:50%; animation:ab-spin 0.8s linear infinite; flex-shrink:0; }

/* ── Action bar ── */
.ab-action-bar { position:fixed; bottom:0; left:0; right:0; padding:14px 24px; background:rgba(237,233,227,0.96); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-top:1px solid #e2d9ce; display:flex; justify-content:center; align-items:center; z-index:400; box-shadow:0 -4px 20px rgba(0,0,0,0.06); }
.ab-btn { min-width:260px; padding:13px 36px; border:none; border-radius:14px; font-size:15px; font-weight:700; cursor:pointer; transition:all 0.18s; background:#4f46e5; color:#fff; box-shadow:0 4px 16px rgba(79,70,229,0.3); }
.ab-btn:hover:not(:disabled) { background:#4338ca; transform:translateY(-1px); box-shadow:0 6px 24px rgba(79,70,229,0.38); }
.ab-btn:disabled { background:#d5cec6; color:#a8998c; cursor:not-allowed; box-shadow:none; }

/* ── Animations ── */
@keyframes ab-fadein  { from{opacity:0;transform:translateY(8px);}  to{opacity:1;transform:translateY(0);} }
@keyframes ab-spin    { to{transform:rotate(360deg);} }
@keyframes ab-pulse-ring { 0%{opacity:0.7;transform:translate(-50%,-50%) scale(1);} 100%{opacity:0;transform:translate(-50%,-50%) scale(2.6);} }
@keyframes ab-bob     { 0%,100%{transform:translate(-50%,-100%) translateY(0);} 50%{transform:translate(-50%,-100%) translateY(-5px);} }
@keyframes ab-urgency { 0%,100%{transform:translate(-50%,-100%) scale(1);} 50%{transform:translate(-50%,-100%) scale(1.07);} }
@keyframes ab-deliver { from{transform:translate(-50%,-50%) scale(1);} to{transform:translate(-50%,-50%) scale(1.28);} }
@keyframes ab-surge-arrive { 0%{opacity:0;transform:translate(-50%,-120%) scale(0.5);} 60%{transform:translate(-50%,-110%) scale(1.1);} 100%{opacity:1;transform:translate(-50%,-100%) scale(1);} }
@keyframes ab-hq-pulse { 0%,100%{opacity:0.22;} 50%{opacity:0.5;} }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeLabel(t: number) { return t >= 99 ? 'No service' : `${Math.round(t)} min`; }
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
  return `You gave ${topN} trips to ${top.name} and ${botPart}.`;
}

function hoodTripHint(h: Hood) {
  return `${h.name} — ${h.difficulty} · click to send 1 rider`;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const VISIBLE_STEP_LABELS = ['Explore', 'Goal', 'Your Turn', 'Automate', 'Bias', 'Reflect'];
const PHASE_TO_VSTEP: Record<GamePhase, number> = {
  explore: 0, goal: 1, yourTurn: 2, automate: 3, bias: 4, reflect: 5,
  fixIt: 5, fairerRound: 5, finalReflect: 5,
};
const VSTEP_FIRST_PHASE: GamePhase[] = ['explore', 'goal', 'yourTurn', 'automate', 'bias', 'reflect'];

function StepIndicator({ phase, onBack }: { phase: GamePhase; onBack: (p: GamePhase) => void }) {
  const cur = PHASE_TO_VSTEP[phase];
  return (
    <div className="ab-stepper">
      {VISIBLE_STEP_LABELS.map((lbl, i) => (
        <React.Fragment key={i}>
          <div
            className={`ab-step ${i < cur ? 'done' : ''} ${i === cur ? 'active' : ''}`}
            onClick={() => { if (i < cur) onBack(VSTEP_FIRST_PHASE[i]); }}
            style={{ cursor: i < cur ? 'pointer' : 'default' }}
          >
            <div className="ab-step-dot" />
            <div className="ab-step-label">{lbl}</div>
          </div>
          {i < VISIBLE_STEP_LABELS.length - 1 && (
            <div className={`ab-step-line ${i < cur ? 'done' : ''}`} />
          )}
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

// ─── MapBoard ─────────────────────────────────────────────────────────────────

interface MapBoardProps {
  phase: GamePhase;
  // Explore
  visitedSet: Set<string>;
  activeExploreTab: string | null;
  demoRiderXY: [number, number] | null;
  demoHoodId: string | null;
  // Hood interaction
  onHoodClick: (id: string) => void;
  // Your Turn specific
  isYourTurn: boolean;
  ytIdleRiders: number;
  ytDemand: Record<string, number>;
  ytRoundDone: boolean;
  ytFeedback: string | null;
  // Active riders (animating on map)
  activeRiderPositions: RiderMapPos[];
  // Idle riders at HQ
  idleRiderCount: number;
  // Demand (non-yourTurn phases)
  showDemand: boolean;
  surgeActive: boolean;
  staticDemand?: Record<string, number>;
  // Algo phases
  displayAssignments: Record<string, number>;
  highlightHoodId: string | null;
}

function MapBoard({
  phase, visitedSet, activeExploreTab, demoRiderXY, demoHoodId,
  onHoodClick,
  isYourTurn, ytIdleRiders, ytDemand, ytRoundDone, ytFeedback,
  activeRiderPositions, idleRiderCount,
  showDemand, surgeActive, staticDemand,
  displayAssignments, highlightHoodId,
}: MapBoardProps) {
  const AR = 1.8333;
  const isExplore = phase === 'explore';

  // Idle rider positions clustered around HQ
  const idlePositions = useMemo(() => {
    const positions: [number, number][] = [];
    for (let i = 0; i < idleRiderCount; i++) {
      const angle = (i / Math.max(1, idleRiderCount)) * Math.PI * 2;
      const r = idleRiderCount <= 1 ? 0 : 2.8;
      positions.push([HQ.x + r * Math.cos(angle), HQ.y + r * Math.sin(angle)]);
    }
    return positions;
  }, [idleRiderCount]);

  return (
    <div className="ab-map-wrap">
      <img src={mapImg} className="ab-map-img" alt="City delivery map" draggable={false} />

      {/* SVG overlay: zones, HQ marker, highlight rings */}
      <svg className="ab-map-svg" viewBox={`0 0 ${183.3} 100`} preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
        {/* Neighborhood zone fills */}
        {HOODS.map(h => {
          const assigned = displayAssignments[h.id] ?? 0;
          const isActiveTab = activeExploreTab === h.id;
          const isDemoTarget = demoHoodId === h.id;
          const demandHere = isYourTurn ? (ytDemand[h.id] ?? 0) : 1;
          const opacity = isExplore
            ? (isActiveTab || isDemoTarget ? 0.72 : visitedSet.has(h.id) ? 0.42 : 0.22)
            : isYourTurn
              ? (demandHere > 0 ? 0.55 : 0.2)
              : (assigned > 0 ? 0.6 : 0.24);
          return (
            <ellipse key={h.id}
              cx={h.pos.x * AR} cy={h.pos.y}
              rx={h.radius * AR} ry={h.radius}
              fill={h.bgColor} stroke={h.color}
              strokeWidth={isActiveTab || isDemoTarget || highlightHoodId === h.id ? 1.3 : 0.75}
              opacity={opacity}
            />
          );
        })}

        {/* Pulse rings on unvisited hoods in Explore */}
        {isExplore && HOODS.map((h, i) => !visitedSet.has(h.id) && (
          <ellipse key={`pulse-${h.id}`}
            cx={h.pos.x * AR} cy={h.pos.y}
            rx={h.radius * AR * 1.45} ry={h.radius * 1.45}
            fill="none" stroke={h.color} strokeWidth="0.8"
            style={{ animation: `ab-pulse-ring 2.4s ease-out ${i * 0.6}s infinite` }}
            opacity="0.45"
          />
        ))}

        {/* Highlight ring for algo assignment */}
        {highlightHoodId && (() => {
          const h = hoodById(highlightHoodId);
          return (
            <ellipse cx={h.pos.x * AR} cy={h.pos.y}
              rx={h.radius * AR * 1.65} ry={h.radius * 1.65}
              fill="none" stroke={h.color} strokeWidth="1.3"
              style={{ animation: 'ab-pulse-ring 0.65s ease-out forwards' }}
            />
          );
        })()}

        {/* HQ marker */}
        <g>
          <circle cx={HQ.x * AR} cy={HQ.y} r={4.8}
            fill="white" stroke="#4f46e5" strokeWidth="1.1" opacity="0.96" />
          <text x={HQ.x * AR} y={HQ.y + 0.6}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="3.4" fill="#4f46e5" fontWeight="bold">HQ</text>
          <circle cx={HQ.x * AR} cy={HQ.y} r={7.5}
            fill="none" stroke="#4f46e5" strokeWidth="0.7"
            style={{ animation: 'ab-hq-pulse 2.6s ease-in-out infinite' }}
          />
        </g>
      </svg>

      {/* HQ rider count badge (Your Turn only) */}
      {isYourTurn && (
        <div
          className={`ab-hq-badge ${ytIdleRiders === 0 ? 'warn' : ''}`}
          style={{ left: `${HQ.x}%`, top: `${HQ.y - 6}%` }}
        >
          🛵 {ytIdleRiders}/{TOTAL_RIDERS} ready
        </div>
      )}

      {/* Demand badges */}
      {(showDemand || isYourTurn) && HOODS.map(h => {
        if (isYourTurn) {
          const count = ytDemand[h.id] ?? 0;
          return (
            <div key={`dem-${h.id}`}
              className={`ab-demand ${count === 0 ? 'no-demand' : ''}`}
              style={{ left: `${h.pos.x}%`, top: `${h.pos.y - h.radius * 0.55}%` }}
            >
              <span className="ab-demand-label">DEMAND</span>
              <span className="ab-demand-count">📦 {count}</span>
            </div>
          );
        }
        const isSurging = surgeActive && h.id === 'easthills';
        const orderCount = staticDemand
          ? (staticDemand[h.id] ?? h.baseOrders)
          : (surgeActive ? ALGO_ORDERS_SURGE[h.id] : h.baseOrders);
        return (
          <div key={`dem-${h.id}`}
            className={`ab-demand ${isSurging ? 'surge' : ''}`}
            style={{ left: `${h.pos.x}%`, top: `${h.pos.y - h.radius * 0.55}%` }}
          >
            <span className="ab-demand-label">DEMAND</span>
            <span className="ab-demand-count">📦 {orderCount}</span>
          </div>
        );
      })}

      {/* Idle riders at HQ */}
      {idleRiderCount > 0 && ['yourTurn', 'automate', 'bias', 'fairerRound'].includes(phase) && (
        idlePositions.map(([ix, iy], i) => (
          <div key={`idle-${i}`} className="ab-rider-idle"
            style={{ left: `${ix}%`, top: `${iy}%` }}>🛵</div>
        ))
      )}

      {/* Active riders animating on roads */}
      {activeRiderPositions.map((pos, i) => (
        <div key={`rider-${i}`}
          className={`ab-rider ${pos.delivering ? 'delivering' : ''}`}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
          🛵
        </div>
      ))}

      {/* Explore demo rider */}
      {demoRiderXY && (
        <div className="ab-demo-rider"
          style={{ left: `${demoRiderXY[0]}%`, top: `${demoRiderXY[1]}%` }}>
          🛵
        </div>
      )}

      {/* Explore / Your Turn hotspot buttons */}
      {(isExplore || isYourTurn) && HOODS.map(h => {
        const demandHere = ytDemand[h.id] ?? 0;
        const hasDemand = !isYourTurn || demandHere > 0;
        const noRiders = isYourTurn && ytIdleRiders <= 0;
        const dispatchCls = isYourTurn
          ? `dispatch ${hasDemand ? 'has-demand' : 'no-demand'} ${noRiders ? 'no-riders' : ''}`
          : '';
        const title = isYourTurn
          ? hasDemand ? hoodTripHint(h) : `${h.name} — no demand right now`
          : h.name;
        return (
          <button key={`hs-${h.id}`}
            className={`ab-hotspot ${dispatchCls}`}
            title={title}
            style={{
              left: `${h.pos.x}%`, top: `${h.pos.y}%`,
              width: `${h.radius * 2.7}%`, aspectRatio: '1/1',
              background: (activeExploreTab === h.id || demoHoodId === h.id)
                ? h.bgColor
                : isYourTurn && hasDemand
                  ? `${h.bgColor}`
                  : 'rgba(255,255,255,0.18)',
              border: `2.5px solid ${h.color}`,
              boxShadow: `0 4px 16px rgba(0,0,0,0.13), 0 0 10px ${h.bgColor}`,
              opacity: demoHoodId && !isYourTurn && demoHoodId !== h.id ? 0.5 : 1,
            }}
            disabled={ytRoundDone}
            onClick={() => onHoodClick(h.id)}
          >
            {h.emoji}
          </button>
        );
      })}

      {/* Feedback toast on map */}
      {isYourTurn && ytFeedback && (
        <div className="ab-feedback-toast">{ytFeedback}</div>
      )}
    </div>
  );
}

// ─── ResultTable ──────────────────────────────────────────────────────────────

function ResultTable({ results, showOrders, minimal, hideSatisfaction }: {
  results: NResult[]; showOrders?: boolean; minimal?: boolean; hideSatisfaction?: boolean;
}) {
  return (
    <table className="ab-rtable">
      <thead>
        <tr>
          <th>Neighborhood</th><th>Riders</th>
          {showOrders && <th>Orders</th>}
          <th>Avg Wait</th>
          {!minimal && !hideSatisfaction && <th>Satisfaction</th>}
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
              {!minimal && !hideSatisfaction && <td><span className={satBadge(r.sat)}>{r.sat === 0 ? '0%' : `${r.sat}%`}</span></td>}
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

// ─── Stage 1: Explore ─────────────────────────────────────────────────────────

function PhaseExplore({
  onAct, visitedSet, setVisited, activeTab, setActiveTab, demoState, setDemoState,
}: {
  onAct: (l: string, e: boolean) => void;
  visitedSet: Set<string>;
  setVisited: React.Dispatch<React.SetStateAction<Set<string>>>;
  activeTab: string | null;
  setActiveTab: (id: string | null) => void;
  demoState: ExploreDemo | null;
  setDemoState: React.Dispatch<React.SetStateAction<ExploreDemo | null>>;
}) {
  const allDone = HOODS.every(h => visitedSet.has(h.id));
  const remaining = HOODS.length - visitedSet.size;

  useEffect(() => {
    onAct(
      allDone ? "Let's Start! →" : `Explore ${remaining} more area${remaining !== 1 ? 's' : ''}`,
      allDone
    );
  }, [allDone, remaining, onAct]);

  // RAF animation for demo rider
  useEffect(() => {
    if (!demoState || demoState.phase === 'done') return;
    const h = hoodById(demoState.hoodId);
    const speed = demoRiderSpeed(h);
    const raf = requestAnimationFrame(() => {
      setDemoState(prev => {
        if (!prev) return null;
        const next = prev.progress + speed;
        if (next >= 2.3) return { ...prev, progress: 2.3, phase: 'done' };
        if (next >= 1.3) return { ...prev, progress: next, phase: 'returning' };
        if (next >= 1.0) return { ...prev, progress: next, phase: 'arrived' };
        return { ...prev, progress: next, phase: 'outbound' };
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [demoState, setDemoState]);

  function handleTab(id: string) {
    setActiveTab(id);
    setVisited(p => new Set([...p, id]));
    setDemoState({ hoodId: id, progress: 0, phase: 'outbound' });
  }

  const activeHood = activeTab ? hoodById(activeTab) : null;
  const isDemoRunning = demoState && demoState.phase !== 'done' && demoState.hoodId === activeTab;
  const isDemoDone   = demoState?.phase === 'done' && demoState.hoodId === activeTab;

  return (
    <div className="ab-explore-panel">
      <div className="ab-explore-tabs">
        {HOODS.map(h => (
          <button key={h.id}
            className={`ab-explore-tab ${visitedSet.has(h.id) ? 'visited' : ''} ${activeTab === h.id ? 'active' : ''}`}
            onClick={() => handleTab(h.id)}
          >
            <span>{h.emoji}</span><span>{h.name}</span>
            {visitedSet.has(h.id) && <span style={{ fontSize: 9, color: '#16a34a' }}>✓</span>}
          </button>
        ))}
      </div>
      {activeHood ? (
        <div className="ab-explore-content" style={{ animation: 'ab-fadein 0.25s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 34 }}>{activeHood.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: activeHood.textColor, marginBottom: 2 }}>{activeHood.name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#a8998c', marginBottom: 8 }}>{activeHood.tagline}</div>
              <div style={{ fontSize: 13, color: '#6b5f55', lineHeight: 1.6, marginBottom: 10 }}>{activeHood.exploreInfo}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { icon: '⏱', txt: `~${liveTripSeconds(activeHood.id)} sec round trip` },
                  { icon: '📦', txt: `${activeHood.baseOrders} orders/shift` },
                  { icon: '💰', txt: `$${activeHood.earnings}/delivery` },
                  { icon: '🎯', txt: activeHood.difficulty },
                ].map(({ icon, txt }) => (
                  <div key={txt} style={{ background: activeHood.bgColor, borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: activeHood.textColor }}>
                    {icon} {txt}
                  </div>
                ))}
              </div>
              {isDemoRunning && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b5f55' }}>
                  <div className="ab-spinner" />
                  {demoState!.phase === 'outbound' && `Rider heading to ${activeHood.name}…`}
                  {demoState!.phase === 'arrived' && `📦 Delivering in ${activeHood.name}…`}
                  {demoState!.phase === 'returning' && 'Rider returning to HQ…'}
                </div>
              )}
              {isDemoDone && (
                <div className="ab-trip-result">
                  <div className="ab-trip-stat" style={{ background: activeHood.bgColor, border: `1.5px solid ${activeHood.color}40` }}>
                    <div className="ab-trip-stat-val" style={{ color: activeHood.textColor }}>{liveTripSeconds(activeHood.id)} sec</div>
                    <div className="ab-trip-stat-lbl" style={{ color: activeHood.textColor }}>Round trip</div>
                  </div>
                  <div className="ab-trip-stat" style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                    <div className="ab-trip-stat-val" style={{ color: '#16a34a' }}>${activeHood.earnings}</div>
                    <div className="ab-trip-stat-lbl" style={{ color: '#16a34a' }}>Per delivery</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="ab-explore-empty">
          {allDone ? '✅ All areas explored — press the button to continue!' : 'Click a neighborhood on the map, or a tab above, to explore it.'}
        </div>
      )}
    </div>
  );
}

// ─── Stage 2: Goal ────────────────────────────────────────────────────────────

function PhaseGoal({ onAct }: { onAct: (l: string, e: boolean) => void }) {
  useEffect(() => { onAct('Start Your Turn →', true); }, [onAct]);
  return (
    <div className="ab-card">
      <div className="ab-card-title">🎯 Company Goal: Fast Deliveries</div>
      <div className="ab-card-sub">SpeedEats has one clear objective for dispatch managers. Here's why it makes total sense.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { icon: '💰', head: 'More revenue', body: 'Faster trips = riders complete more orders per shift = higher earnings.' },
          { icon: '📦', head: 'More completed orders', body: 'Short rides return riders sooner, so more orders can be served during the shift.' },
          { icon: '⚡', head: 'Less idle time', body: 'Optimizing speed keeps riders moving — less wasted time between orders.' },
        ].map(({ icon, head, body }) => (
          <div key={head} style={{ background: '#f8f5f1', border: '1px solid #e8e0d5', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8998c', marginBottom: 4 }}>{head}</div>
            <div style={{ fontSize: 12, color: '#8a7a6d', lineHeight: 1.5 }}>{body}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#eef2ff', border: '2px solid #c7d2fe', borderRadius: 14, padding: '14px 18px', textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Goal This Shift</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#3730a3' }}>"Keep average trip time under {LIVE_GOALS.avgTrip}s"</div>
        <div style={{ fontSize: 12, color: '#4f46e5', marginTop: 6 }}>
          The company wants shorter average trips because faster rides usually mean more completed deliveries and more earnings.
        </div>
      </div>
      <div className="ab-callout amber">
        You have <strong>{TOTAL_RIDERS} riders</strong> and <strong>{YOUR_TURN_DURATION} seconds</strong>. <strong>Click any neighborhood with demand to dispatch one rider.</strong> Downtown is fast. East Hills ties a rider up much longer. Your choices will matter later.
      </div>
    </div>
  );
}

// ─── Stage 3: Your Turn panel ─────────────────────────────────────────────────
// The main interaction happens on the map (click neighborhoods).
// This panel shows current status and feedback.

function PhaseYourTurn({
  onAct, ytIdleRiders, ytDelivered, ytEarnings, ytAvgWait,
  ytFeedback, ytRoundDone, ytDemand, speedAlert,
}: {
  onAct: (l: string, e: boolean) => void;
  ytIdleRiders: number;
  ytDelivered: number;
  ytEarnings: number;
  ytAvgWait: number;
  ytFeedback: string | null;
  ytRoundDone: boolean;
  ytDemand: Record<string, number>;
  speedAlert: string | null;
}) {
  useEffect(() => {
    if (ytRoundDone) onAct('See What the Algorithm Learned →', true);
    else onAct('', false); // no button during active play
  }, [ytRoundDone, onAct]);

  const hasDemand = Object.values(ytDemand).some(v => v > 0);
  const allBusy = ytIdleRiders === 0;

  return (
    <div className="ab-yt-panel">
      {/* Instruction */}
      {!ytRoundDone && (
        <div className="ab-yt-instruction">
          {allBusy
            ? <><span style={{ color: '#dc2626' }}>All riders are on the road</span> — wait for one to return 🛵</>
            : !hasDemand
              ? <><span>No active demand right now</span> — more orders arriving soon 📦</>
              : <><span>Click a neighborhood</span> on the map to dispatch a rider 🛵</>}
        </div>
      )}

      {/* Feedback message */}
      {ytFeedback && (
        <div className={`ab-yt-feedback ${ytFeedback.includes('No riders') || ytFeedback.includes('No demand') ? 'warn' : ''}`}>
          {ytFeedback}
        </div>
      )}

      {!ytRoundDone && speedAlert && !ytFeedback && (
        <div className="ab-yt-feedback warn">
          {speedAlert}
        </div>
      )}

      {/* Per-hood live status */}
      {!ytRoundDone && (
        <div className="ab-yt-hood-stats">
          {HOODS.map(h => {
            const demand = ytDemand[h.id] ?? 0;
            return (
              <div key={h.id} className="ab-yt-hood-chip"
                style={{ borderColor: demand > 0 ? h.color + '80' : '#e2d9ce', background: demand > 0 ? h.bgColor : '#f8f5f1' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: h.textColor }}>{h.emoji} {h.name}</div>
                <div style={{ fontSize: 11, color: demand > 0 ? h.textColor : '#b0a499' }}>
                  {demand > 0 ? `📦 ${demand} waiting` : 'No demand'}
                </div>
                <div style={{ fontSize: 10, color: '#a8998c' }}>~{liveTripSeconds(h.id)} sec round trip · ${h.earnings}/delivery</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Round complete */}
      {ytRoundDone && (
        <div className="ab-round-done" style={{ margin: 0 }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>⏱ Round Complete!</div>
          <div style={{ fontSize: 14, color: '#166534' }}>
            You completed <strong>{ytDelivered} deliveries</strong> and earned <strong>${ytEarnings}</strong>.
            {ytAvgWait > 0 && <> Average trip time: <strong>{Math.round(ytAvgWait)} sec</strong>.</>}
          </div>
          {ytAvgWait > 0 && ytAvgWait <= LIVE_GOALS.avgTrip
            ? <div style={{ fontSize: 13, color: '#15803d', marginTop: 6 }}>Goal met. Your average ride time stayed below the target.</div>
            : <div style={{ fontSize: 13, color: '#991b1b', marginTop: 6 }}>Goal missed. Your average ride time stayed above the target. Long trips kept riders busy for too long.</div>}
          <div style={{ fontSize: 13, color: '#166534', marginTop: 6 }}>Service was not evenly distributed. Let's see what happens when this strategy becomes automatic.</div>
        </div>
      )}
    </div>
  );
}

// ─── Stage 4: Automate ────────────────────────────────────────────────────────

function PhaseAutomate({
  onAct, assignments, algoStep, algoAssignments,
}: {
  onAct: (l: string, e: boolean) => void;
  assignments: Record<string, number>;
  algoStep: number;
  algoAssignments: Record<string, number>;
}) {
  const complete = algoStep >= TOTAL_RIDERS;
  useEffect(() => {
    if (complete) onAct('Run the Algorithm →', true);
    else onAct(`Building algorithm… (${algoStep}/${TOTAL_RIDERS})`, false);
  }, [complete, algoStep, onAct]);

  return (
    <div className="ab-card">
      <div className="ab-card-title">🤖 {complete ? 'Algorithm Ready' : 'Building the Algorithm…'}</div>
      <div className="ab-card-sub">SpeedEats is automating dispatch around one objective: keep average trip time under {LIVE_GOALS.avgTrip}s.</div>
      {!complete ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8a7a6d', fontSize: 13, marginBottom: 14 }}>
          <div className="ab-spinner" /> Analyzing your dispatch patterns…
        </div>
      ) : (
        <div className="ab-strategy-box">
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5', marginBottom: 6 }}>Your Dispatch Pattern</div>
          <div style={{ fontSize: 14, color: '#3730a3' }}>{describeAssignment(assignments)}</div>
          <div style={{ fontSize: 12, color: '#6366f1', marginTop: 8 }}>You learned to favor shorter trips because that helped keep the average under {LIVE_GOALS.avgTrip}s. The system derived:</div>
          <div className="ab-strategy-rule">
            📋 Rule: Prioritize deliveries that keep average trip time under {LIVE_GOALS.avgTrip}s.<br />
            Shorter trips protect the average first.
          </div>
        </div>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8998c', margin: '8px 0' }}>
        Algorithm Assignment — 8 Riders
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
        <div className="ab-callout indigo" style={{ marginTop: 14 }}>
          Once you click <strong>"Run the Algorithm,"</strong> this rule runs every shift automatically — with no human review. The algorithm makes all dispatch decisions from now on.
        </div>
      )}
    </div>
  );
}

// ─── Stage 5: Bias ────────────────────────────────────────────────────────────

function PhaseBias({
  onAct, biasSubPhase, setBiasSubPhase, algoResults,
}: {
  onAct: (l: string, e: boolean) => void;
  biasSubPhase: 'event' | 'running' | 'results';
  setBiasSubPhase: (s: 'event' | 'running' | 'results') => void;
  algoResults: NResult[];
}) {
  const ehResult = algoResults.find(r => r.id === 'easthills');
  const dtResult = algoResults.find(r => r.id === 'downtown');

  useEffect(() => {
    if (biasSubPhase === 'event') {
      onAct('See the Algorithm Run →', true);
    } else if (biasSubPhase === 'running') {
      onAct('See the Results →', false);
      const t = setTimeout(() => setBiasSubPhase('results'), 2200);
      return () => clearTimeout(t);
    } else {
      onAct('What Does This Mean? →', true);
    }
  }, [biasSubPhase, onAct, setBiasSubPhase]);

  if (biasSubPhase === 'event') {
    return (
      <div className="ab-card">
        <div className="ab-news-banner">
          <div className="ab-news-tag">📡 Breaking — Today's Orders</div>
          <div className="ab-news-text">East Hills received 8 orders — nearly triple its usual 3.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#dc2626', marginBottom: 6 }}>East Hills — Today</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>8 orders</div>
            <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>vs. usual 3 orders/shift</div>
          </div>
          <div style={{ background: '#f8f5f1', border: '1px solid #e8e0d5', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8998c', marginBottom: 6 }}>Algorithm Status</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#2d2419', marginBottom: 4 }}>Already running</div>
            <div style={{ fontSize: 12, color: '#8a7a6d' }}>Fixed assignments based on last month's data</div>
          </div>
        </div>
        <div className="ab-callout amber">
          Goal: keep average trip time under {LIVE_GOALS.avgTrip}s. Will the algorithm protect that target when East Hills needs more help today?
        </div>
      </div>
    );
  }

  if (biasSubPhase === 'running') {
    return (
      <div className="ab-card">
        <div className="ab-card-title">🤖 Algorithm Running…</div>
        <div className="ab-card-sub">Assigning riders exactly as trained — prioritizing shorter trips to protect the {LIVE_GOALS.avgTrip}s average.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8a7a6d', fontSize: 13, marginBottom: 14 }}>
          <div className="ab-spinner" /> Processing today's demand…
        </div>
        <div className="ab-algo-tiles">
          {HOODS.map(h => {
            const count = computeSeqAssignments(ALGO_SEQUENCE, TOTAL_RIDERS)[h.id] ?? 0;
            const isSurge = h.id === 'easthills';
            return (
              <div key={h.id} className="ab-algo-tile"
                style={{ borderColor: isSurge ? '#dc2626' : (count > 0 ? h.color : '#e2d9ce'), outline: isSurge ? '2.5px dashed #dc2626' : undefined }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{h.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: isSurge ? '#dc2626' : h.textColor, marginBottom: 6 }}>{h.name}</div>
                <div className="ab-algo-count" style={{ color: isSurge ? '#dc2626' : h.color }}>{count}</div>
                <div className="ab-algo-label">riders assigned</div>
                {isSurge && <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 700, marginTop: 3 }}>⚠ 8 orders waiting</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="ab-card">
      <div className="ab-card-title">📊 What the Algorithm Did</div>
      <div className="ab-card-sub">The algorithm protected the {LIVE_GOALS.avgTrip}s trip-time goal. Here's what that meant for each neighborhood.</div>
      <ResultTable results={algoResults} showOrders hideSatisfaction />
      <div className="ab-callout red" style={{ marginTop: 14 }}>
        <strong>The numbers:</strong> {dtResult?.drivers} riders to Downtown (6 orders) vs. {ehResult?.drivers ?? 1} rider to East Hills (8 orders). Average looks okay — but 8 people in East Hills were left behind.
      </div>
      <div className="ab-reflect-grid" style={{ marginTop: 14 }}>
        {[
          { icon: '⏱', title: 'Goal Protected', desc: `The system kept chasing the ${LIVE_GOALS.avgTrip}s average, so short routes stayed attractive even during the demand spike.` },
          { icon: '🔄', title: 'Feedback Loop', desc: 'Fewer riders → longer waits → fewer future orders. The bias creates the data that justifies the bias.' },
          { icon: '📊', title: 'Hidden in Averages', desc: 'The average can look fine while one neighborhood waits. East Hills is invisible in the headline metric.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="ab-reflect-tile">
            <div className="ab-reflect-icon">{icon}</div>
            <div className="ab-reflect-title">{title}</div>
            <div className="ab-reflect-desc">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stage 6: Reflect ─────────────────────────────────────────────────────────

function PhaseReflect({
  onAct, assignments, algoResults,
}: {
  onAct: (l: string, e: boolean) => void;
  assignments: Record<string, number>;
  algoResults: NResult[];
}) {
  useEffect(() => { onAct('Finish →', true); }, [onAct]);
  const ehResult = algoResults.find(r => r.id === 'easthills');

  return (
    <div className="ab-card">
      <div className="ab-card-title">🎓 Why It Went Wrong</div>
      <div className="ab-card-sub">Same city. Same {TOTAL_RIDERS} riders. A perfectly reasonable goal — but a systematically unfair outcome.</div>
      <div style={{ background: '#f8f5f1', border: '1px solid #e8e0d5', borderRadius: 14, padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8998c', marginBottom: 8 }}>What You Did</div>
        <div style={{ fontSize: 14, color: '#2d2419' }}>{describeAssignment(assignments)}</div>
        <div style={{ fontSize: 12, color: '#8a7a6d', marginTop: 6, lineHeight: 1.5 }}>
          That made sense for the goal — shorter trips helped protect the {LIVE_GOALS.avgTrip}s average.
        </div>
      </div>
      <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 14, padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#dc2626', marginBottom: 8 }}>What the Algorithm Repeated</div>
        <div style={{ fontSize: 14, color: '#991b1b' }}>
          East Hills: {ehResult?.drivers ?? 1} rider for {ALGO_ORDERS_SURGE.easthills} orders · {ehResult ? timeLabel(ehResult.time) : '—'} wait
        </div>
        <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 6, lineHeight: 1.5 }}>
          The system protected the {LIVE_GOALS.avgTrip}s average, but East Hills residents waited longer and became frustrated. The company also left money on the table because unmet demand turned into lost orders.
        </div>
      </div>
      <div style={{ background: '#1e1b4b', borderRadius: 16, padding: '20px 22px', marginBottom: 14, color: '#fff' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a5b4fc', marginBottom: 8 }}>The Core Lesson</div>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5, marginBottom: 10 }}>
          "A neutral-looking goal can still create biased outcomes."
        </div>
        <div style={{ fontSize: 13, color: '#c7d2fe', lineHeight: 1.65 }}>
          "Keep average trip time under {LIVE_GOALS.avgTrip}s" sounds fair. But applied across neighborhoods with different distances and histories, it systematically advantages easy areas — and leaves the rest behind.
        </div>
      </div>
      <div className="ab-callout indigo">
        <strong>Real-world pattern:</strong> Ride-share pricing that avoids low-income areas. Loan algorithms that penalize certain zip codes. Healthcare AI trained mostly on wealthier patients. Algorithmic bias consistently hits communities with the least power to push back.
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        {[
          { icon: '🚗', txt: 'Ride-share pricing that avoids low-income areas' },
          { icon: '🏠', txt: 'Loan algorithms that penalize certain zip codes' },
          { icon: '🏥', txt: 'Healthcare AI trained on wealthier patient data' },
        ].map(({ icon, txt }) => (
          <div key={txt} style={{ flex: 1, minWidth: 155, background: '#f8f5f1', border: '1px solid #e8e0d5', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#6b5f55', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span><span>{txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HIDDEN STAGES (code preserved) ──────────────────────────────────────────

const FIX_CHOICES = [
  { id: 'A' as const, title: 'Keep the speed-only goal', desc: '"Minimize average delivery time" — same as before.', feedback: 'This is the same goal that caused the problem. Optimizing only for average speed still systematically deprioritizes remote neighborhoods.' },
  { id: 'B' as const, title: 'Switch to a volume goal', desc: '"Maximize total deliveries completed per shift."', feedback: 'Volume-only optimization still rewards easy, nearby neighborhoods. The algorithm would still neglect East Hills.' },
  { id: 'C' as const, title: 'Balance speed and guaranteed coverage', desc: '"Minimize average delivery time, while ensuring every neighborhood receives at least 2 riders."', feedback: '✓ By guaranteeing a minimum for every area, the algorithm cannot quietly deprioritize remote neighborhoods — even when they have lower historical demand.' },
];

function PhaseFixIt({ onAct, fixGoalChoice, setFixGoalChoice }: {
  onAct: (l: string, e: boolean) => void;
  fixGoalChoice: 'A' | 'B' | 'C' | null;
  setFixGoalChoice: (c: 'A' | 'B' | 'C') => void;
}) {
  useEffect(() => { onAct('Run the Fairer Algorithm →', fixGoalChoice === 'C'); }, [fixGoalChoice, onAct]);
  return (
    <div className="ab-card">
      <div className="ab-card-title">🛠️ Fix the Goal</div>
      <div className="ab-card-sub">The problem wasn't the algorithm's math — it was the goal it was given. Which objective would you choose?</div>
      <div className="ab-choice-cards">
        {FIX_CHOICES.map(choice => {
          const isChosen = fixGoalChoice === choice.id;
          const isCorrect = choice.id === 'C';
          const cls = isChosen ? (isCorrect ? 'chosen-right' : 'chosen-wrong') : (fixGoalChoice !== null ? 'dimmed' : '');
          return (
            <div key={choice.id} className={`ab-choice-card ${cls}`}
              onClick={() => { if (!fixGoalChoice) setFixGoalChoice(choice.id); }}
              style={{ opacity: fixGoalChoice && !isChosen ? 0.55 : 1 }}>
              <div className="ab-choice-letter">{choice.id}</div>
              <div style={{ flex: 1 }}>
                <div className="ab-choice-title">{choice.title}</div>
                <div className="ab-choice-desc">{choice.desc}</div>
                {isChosen && <div className={`ab-choice-feedback ${isCorrect ? 'right' : 'wrong'}`}>{choice.feedback}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhaseFairerRound({ onAct, fairerStep, fairerAssignments }: {
  onAct: (l: string, e: boolean) => void;
  fairerStep: number;
  fairerAssignments: Record<string, number>;
}) {
  const complete = fairerStep >= TOTAL_RIDERS;
  useEffect(() => {
    if (complete) onAct('See the Final Comparison →', true);
    else onAct(`Assigning rider ${fairerStep + 1} of ${TOTAL_RIDERS}…`, false);
  }, [complete, fairerStep, onAct]);
  return (
    <div className="ab-card">
      <div className="ab-card-title">✅ {complete ? 'Fairer Assignment Complete' : 'Running the Balanced Algorithm…'}</div>
      <div className="ab-card-sub">{complete ? 'Every neighborhood receives at least 2 riders — guaranteed.' : 'The new algorithm ensures a minimum of 2 riders per neighborhood before distributing by demand.'}</div>
      <div className="ab-algo-tiles">
        {HOODS.map(h => {
          const count = fairerAssignments[h.id] ?? 0;
          const isEH = h.id === 'easthills';
          return (
            <div key={h.id} className="ab-algo-tile"
              style={{ borderColor: count > 0 ? h.color : '#e2d9ce', outline: isEH && count >= 2 ? '2.5px solid #16a34a' : undefined }}>
              <div style={{ fontSize: 18 }}>{h.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: h.textColor }}>{h.name}</div>
              <div className="ab-algo-count" style={{ color: h.color }}>{count}</div>
              <div className="ab-algo-label">riders</div>
              {isEH && count >= 2 && <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700, marginTop: 3 }}>✓ Min coverage</div>}
            </div>
          );
        })}
      </div>
      {complete && <div className="ab-callout green" style={{ marginTop: 14 }}>East Hills now has <strong>2 riders for 8 orders</strong> — dramatically better than 1.</div>}
    </div>
  );
}

function PhaseFinalReflect({ onAct, algoResults, fairerResults }: {
  onAct: (l: string, e: boolean) => void;
  algoResults: NResult[];
  fairerResults: NResult[];
}) {
  useEffect(() => { onAct('Finish →', true); }, [onAct]);
  const ehB = algoResults.find(r => r.id === 'easthills');
  const ehF = fairerResults.find(r => r.id === 'easthills');
  const algSum = summarize(algoResults);
  const fairSum = summarize(fairerResults);
  return (
    <div className="ab-card">
      <div className="ab-card-title">🎓 What Changed — And Why It Matters</div>
      <div className="ab-card-sub">Same East Hills surge. Same {TOTAL_RIDERS} riders. Different goal. Very different outcomes.</div>
      <div className="ab-compare-wrap">
        <table className="ab-compare-table">
          <thead><tr><th className="label-col">Metric</th><th className="bad-col">Speed-Only</th><th className="good-col">Balanced</th></tr></thead>
          <tbody>
            {[
              ['🏜️ East Hills riders', `${ehB?.drivers ?? 1}`, `${ehF?.drivers ?? 2}`],
              ['🏜️ East Hills wait', ehB ? `${Math.round(ehB.time)} min` : '—', ehF ? `${Math.round(ehF.time)} min` : '—'],
              ['🏜️ East Hills satisfaction', `${ehB?.sat ?? 0}%`, `${ehF?.sat ?? 0}%`],
              ['📊 Overall avg wait', `${algSum.avgTime} min`, `${fairSum.avgTime} min`],
              ['📦 Total delivered', `${algSum.delivered}`, `${fairSum.delivered}`],
            ].map(([label, bad, good]) => (
              <tr key={label}><td className="label-col">{label}</td><td className="bad-col">{bad}</td><td className="good-col">{good}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ab-callout indigo" style={{ marginTop: 14 }}>
        <strong>What fairness requires:</strong> Explicitly designing for equity — not just efficiency. Ask "Who benefits from this goal, and who doesn't?" before the algorithm runs.
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AlgorithmBias() {
  const [phase, setPhase] = useState<GamePhase>('explore');

  // Button state
  const [btnLabel, setBtnLabel] = useState('');
  const [btnEnabled, setBtnEnabled] = useState(false);
  const actionFnRef = useRef<(() => void) | null>(null);

  // Stage 1: Explore
  const [visitedSet, setVisitedSet] = useState(new Set<string>());
  const [activeExploreTab, setActiveExploreTab] = useState<string | null>(null);
  const [demoState, setDemoState] = useState<ExploreDemo | null>(null);

  // ── Stage 3: Your Turn — individual click-to-dispatch mechanic ──
  const ytLiveRidersRef = useRef<LiveRider[]>([]);
  const [ytIdleRiders, setYtIdleRiders] = useState(TOTAL_RIDERS);
  const [ytRenderTick, setYtRenderTick] = useState(0); // drives map re-render
  const ytRiderIdRef = useRef(0);

  const [ytDemand, setYtDemand] = useState<Record<string, number>>({ ...INITIAL_DEMAND });
  const [ytWaveCount, setYtWaveCount] = useState(0);
  const [ytDelivered, setYtDelivered] = useState(0);
  const [ytEarnings, setYtEarnings] = useState(0);
  const [ytCompletedTimes, setYtCompletedTimes] = useState<number[]>([]); // actual baseTime of each delivery
  const [ytDispatchLog, setYtDispatchLog] = useState<string[]>([]);
  const [ytFeedback, setYtFeedback] = useState<string | null>(null);
  const ytFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ytTimer, setYtTimer] = useState(YOUR_TURN_DURATION);
  const [ytRunning, setYtRunning] = useState(false);
  const [ytRoundDone, setYtRoundDone] = useState(false);

  // Stage 4: Automate
  const [algoStep, setAlgoStep] = useState(0);
  const [algoHighlightId, setAlgoHighlightId] = useState<string | null>(null);
  // Rider animation for Automate/Bias/FairerRound phases
  const autoRidersRef = useRef<{ hoodId: string; progress: number }[]>([]);
  const [autoRiderPositions, setAutoRiderPositions] = useState<RiderMapPos[]>([]);

  // Stage 5: Bias
  const [biasSubPhase, setBiasSubPhase] = useState<'event' | 'running' | 'results'>('event');
  const [algoResults, setAlgoResults] = useState<NResult[]>([]);

  // Hidden stages
  const [fixGoalChoice, setFixGoalChoice] = useState<'A' | 'B' | 'C' | null>(null);
  const [fairerStep, setFairerStep] = useState(0);
  const [fairerNewId, setFairerNewId] = useState<string | null>(null);
  const [fairerResults, setFairerResults] = useState<NResult[]>([]);

  const algoAssignments = useMemo(() => computeSeqAssignments(ALGO_SEQUENCE, algoStep), [algoStep]);
  const fairerAssignments = useMemo(() => computeSeqAssignments(FAIRER_SEQUENCE, fairerStep), [fairerStep]);

  // Assignments derived from what the player dispatched (for Automate/Reflect)
  const finalAssignments = useMemo<Record<string, number>>(() => {
    const a: Record<string, number> = { downtown: 0, midtown: 0, northsuburb: 0, easthills: 0 };
    ytDispatchLog.forEach(id => { a[id] = (a[id] ?? 0) + 1; });
    return a;
  }, [ytDispatchLog]);

  // Average wait time from completed deliveries
  const ytAvgWait = useMemo(() => {
    if (ytCompletedTimes.length === 0) return 0;
    return Math.round(ytCompletedTimes.reduce((a, v) => a + v, 0) / ytCompletedTimes.length);
  }, [ytCompletedTimes]);

  // ── Start Your Turn ──
  useEffect(() => {
    if (phase !== 'yourTurn') return;
    ytLiveRidersRef.current = [];
    setYtIdleRiders(TOTAL_RIDERS);
    setYtRenderTick(0);
    ytRiderIdRef.current = 0;
    setYtDemand({ ...INITIAL_DEMAND });
    setYtWaveCount(0);
    setYtDelivered(0);
    setYtEarnings(0);
    setYtCompletedTimes([]);
    setYtDispatchLog([]);
    setYtFeedback(null);
    setYtTimer(YOUR_TURN_DURATION);
    setYtRoundDone(false);
    const t = setTimeout(() => setYtRunning(true), 400);
    return () => clearTimeout(t);
  }, [phase]);

  // ── Your Turn: timer ──
  useEffect(() => {
    if (!ytRunning || phase !== 'yourTurn') return;
    const interval = setInterval(() => {
      setYtTimer(prev => {
        if (prev <= 0) { setYtRunning(false); setYtRoundDone(true); return 0; }
        return prev - 1 / 30;
      });
    }, 33);
    return () => clearInterval(interval);
  }, [ytRunning, phase]);

  // ── Demand waves during Your Turn ──
  useEffect(() => {
    if (phase !== 'yourTurn' || !ytRunning || ytRoundDone) return;
    if (ytTimer <= 62 && ytWaveCount === 0) {
      setYtDemand(prev => ({
        ...prev,
        midtown: Math.min(7, (prev.midtown ?? 0) + 2),
        northsuburb: Math.min(6, (prev.northsuburb ?? 0) + 2),
      }));
      setYtWaveCount(1);
    }
    if (ytTimer <= 35 && ytWaveCount === 1) {
      setYtDemand(prev => ({
        ...prev,
        downtown: Math.min(8, (prev.downtown ?? 0) + 2),
        easthills: Math.min(7, (prev.easthills ?? 0) + 3),
      }));
      setYtWaveCount(2);
    }
  }, [ytTimer, ytRunning, ytRoundDone, ytWaveCount, phase]);

  // ── Continuous order pressure during Your Turn ──
  useEffect(() => {
    if (phase !== 'yourTurn' || !ytRunning || ytRoundDone) return;
    const interval = setInterval(() => {
      setYtDemand(prev => {
        const next = { ...prev };
        const ordersToAdd = totalDemand(prev) < TOTAL_RIDERS + 5 ? 2 : 1;
        for (let i = 0; i < ordersToAdd; i++) {
          const hoodId = weightedDemandHood();
          next[hoodId] = Math.min(DEMAND_CAPS[hoodId], (next[hoodId] ?? 0) + 1);
        }
        return next;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [ytRunning, ytRoundDone, phase]);

  // ── Your Turn: rider animation + delivery completion ──
  useEffect(() => {
    if (!ytRunning || phase !== 'yourTurn') return;
    const interval = setInterval(() => {
      const riders = ytLiveRidersRef.current;
      const returning: number[] = []; // rider ids completing their trip
      const delivered: { hoodId: string }[] = [];

      const updated: LiveRider[] = [];
      for (const rider of riders) {
        const h = hoodById(rider.hoodId);
        const speed = riderSpeedForHood(h);
        const newProgress = rider.progress + speed;

        // Delivery happens when crossing 1.0 (arrives at destination)
        let served = rider.served;
        if (!served && rider.progress < 1.0 && newProgress >= 1.0) {
          served = true;
          delivered.push({ hoodId: rider.hoodId });
        }

        if (newProgress >= 2.3) {
          returning.push(rider.id);
          continue; // rider removed from active list
        }
        updated.push({ ...rider, progress: newProgress, served });
      }

      ytLiveRidersRef.current = updated;

      if (returning.length > 0) {
        setYtIdleRiders(prev => prev + returning.length);
      }
      for (const { hoodId } of delivered) {
        const h = hoodById(hoodId);
        setYtDelivered(prev => prev + 1);
        setYtEarnings(prev => prev + h.earnings);
        setYtCompletedTimes(prev => [...prev, liveTripSeconds(hoodId)]);
      }

      setYtRenderTick(t => t + 1); // trigger re-render for animation
    }, 33);
    return () => clearInterval(interval);
  }, [ytRunning, phase]);

  // ── Dispatch function (called when player clicks a neighborhood) ──
  const showFeedback = useCallback((msg: string) => {
    setYtFeedback(msg);
    if (ytFeedbackTimerRef.current) clearTimeout(ytFeedbackTimerRef.current);
    ytFeedbackTimerRef.current = setTimeout(() => setYtFeedback(null), 2600);
  }, []);

  const handleDispatch = useCallback((hoodId: string) => {
    if (phase !== 'yourTurn' || ytRoundDone || !ytRunning) return;

    if (ytIdleRiders <= 0) {
      showFeedback('All riders are out — wait for one to return! 🛵');
      return;
    }
    if ((ytDemand[hoodId] ?? 0) <= 0) {
      showFeedback('No active demand here right now. Wait for orders.');
      return;
    }

    const newRider: LiveRider = {
      id: ytRiderIdRef.current++,
      hoodId,
      progress: 0,
      served: false,
    };
    ytLiveRidersRef.current = [...ytLiveRidersRef.current, newRider];
    setYtIdleRiders(prev => Math.max(0, prev - 1));
    setYtDemand(prev => ({ ...prev, [hoodId]: Math.max(0, (prev[hoodId] ?? 0) - 1) }));
    setYtDispatchLog(prev => [...prev, hoodId]);
    setYtFeedback(null);
    setYtRenderTick(t => t + 1);
  }, [phase, ytRoundDone, ytRunning, ytDemand, ytIdleRiders, showFeedback]);

  // ── Automate: step-by-step assignment animation ──
  useEffect(() => {
    if (phase !== 'automate' || algoStep >= TOTAL_RIDERS) return;
    const t = setTimeout(() => {
      const id = ALGO_SEQUENCE[algoStep];
      setAlgoHighlightId(id);
      setAlgoStep(s => s + 1);
      setTimeout(() => setAlgoHighlightId(null), 550);
    }, 600);
    return () => clearTimeout(t);
  }, [phase, algoStep]);

  // ── Fairer round step animation (hidden) ──
  useEffect(() => {
    if (phase !== 'fairerRound' || fairerStep >= TOTAL_RIDERS) return;
    const t = setTimeout(() => {
      const id = FAIRER_SEQUENCE[fairerStep];
      setFairerNewId(id);
      setFairerStep(s => s + 1);
      setTimeout(() => setFairerNewId(null), 550);
    }, 550);
    return () => clearTimeout(t);
  }, [phase, fairerStep]);

  // ── Auto-phase rider animation (Automate / Bias / FairerRound) ──
  useEffect(() => {
    const isActive = phase === 'automate' || phase === 'bias' || phase === 'fairerRound';
    if (!isActive) return;

    let targetAssignments: Record<string, number>;
    if (phase === 'automate') targetAssignments = computeSeqAssignments(ALGO_SEQUENCE, algoStep);
    else if (phase === 'bias') targetAssignments = computeSeqAssignments(ALGO_SEQUENCE, TOTAL_RIDERS);
    else targetAssignments = fairerAssignments;

    // Sync rider pool
    const ref = autoRidersRef.current;
    const newPool: { hoodId: string; progress: number }[] = [];
    for (const h of HOODS) {
      const needed = targetAssignments[h.id] ?? 0;
      const existing = ref.filter(r => r.hoodId === h.id);
      for (let i = 0; i < Math.min(needed, existing.length); i++) newPool.push(existing[i]);
      for (let i = existing.length; i < needed; i++) {
        newPool.push({ hoodId: h.id, progress: (i / Math.max(1, needed)) * 2.3 });
      }
    }
    autoRidersRef.current = newPool;
  }, [phase, algoStep, fairerAssignments]);

  // Auto-rider animation loop
  const autoAnimRunning =
    (phase === 'automate' && algoStep >= TOTAL_RIDERS) ||
    phase === 'bias' ||
    (phase === 'fairerRound' && fairerStep >= TOTAL_RIDERS);

  useEffect(() => {
    if (!autoAnimRunning) return;
    const interval = setInterval(() => {
      const ref = autoRidersRef.current;
      const positions: RiderMapPos[] = [];
      for (const rider of ref) {
        const h = hoodById(rider.hoodId);
        rider.progress = (rider.progress + riderSpeedForHood(h)) % 2.3;
        const [x, y] = progressToXY(rider.hoodId, rider.progress);
        positions.push({ x, y, delivering: riderIsDelivering(rider.progress) });
      }
      setAutoRiderPositions([...positions]);
    }, 33);
    return () => clearInterval(interval);
  }, [autoAnimRunning]);

  // ── Derive live rider positions for Your Turn (from ref, updated per tick) ──
  const ytRiderPositions: RiderMapPos[] = useMemo(() => {
    return ytLiveRidersRef.current.map(rider => {
      const [x, y] = progressToXY(rider.hoodId, rider.progress);
      return { x, y, delivering: riderIsDelivering(rider.progress) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytRenderTick]);

  // ── Demo rider XY for Explore ──
  const demoRiderXY = useMemo<[number, number] | null>(() => {
    if (!demoState || demoState.phase === 'done') return null;
    return progressToXY(demoState.hoodId, demoState.progress);
  }, [demoState]);

  // ── Map interaction handler ──
  const handleHoodClick = useCallback((hoodId: string) => {
    if (phase === 'explore') {
      setActiveExploreTab(prev => prev === hoodId ? null : hoodId);
      setVisitedSet(p => new Set([...p, hoodId]));
      setDemoState({ hoodId, progress: 0, phase: 'outbound' });
    } else if (phase === 'yourTurn') {
      handleDispatch(hoodId);
    }
  }, [phase, handleDispatch]);

  // ── setAction helper ──
  const setAction = useCallback((label: string, enabled: boolean, fn?: () => void) => {
    setBtnLabel(label);
    setBtnEnabled(enabled);
    actionFnRef.current = fn ?? null;
  }, []);

  // ── Phase transitions ──
  function advance(next: GamePhase) {
    setBtnLabel(''); setBtnEnabled(false); actionFnRef.current = null;
    if (next === 'automate') { setAlgoStep(0); setAlgoHighlightId(null); autoRidersRef.current = []; }
    if (next === 'bias') {
      setAlgoResults(simulate(computeSeqAssignments(ALGO_SEQUENCE, TOTAL_RIDERS), ALGO_ORDERS_SURGE));
      setBiasSubPhase('event');
      autoRidersRef.current = [];
    }
    if (next === 'fairerRound') { setFairerStep(0); setFairerNewId(null); autoRidersRef.current = []; }
    if (next === 'finalReflect') {
      setFairerResults(simulate(computeSeqAssignments(FAIRER_SEQUENCE, TOTAL_RIDERS), ALGO_ORDERS_SURGE));
    }
    setPhase(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const PHASE_SEQUENCE: GamePhase[] = [
    'explore', 'goal', 'yourTurn', 'automate', 'bias', 'reflect',
    'fixIt', 'fairerRound', 'finalReflect',
  ];

  function handleActionClick() {
    if (actionFnRef.current) { actionFnRef.current(); return; }
    if (phase === 'bias') {
      if (biasSubPhase === 'event') { setBiasSubPhase('running'); return; }
      if (biasSubPhase === 'results') { advance('reflect'); return; }
      return;
    }
    const idx = PHASE_SEQUENCE.indexOf(phase);
    if (idx < PHASE_SEQUENCE.length - 1) advance(PHASE_SEQUENCE[idx + 1]);
  }

  // ── Derived display values ──
  const isYourTurn = phase === 'yourTurn';
  const showMap = !['reflect', 'fixIt', 'finalReflect'].includes(phase);
  const showDemand = ['automate', 'bias', 'fairerRound'].includes(phase);
  const surgeActive = phase === 'bias';

  const activeRiderPositions: RiderMapPos[] = isYourTurn ? ytRiderPositions : autoRiderPositions;
  const idleRiderCount: number = isYourTurn
    ? ytIdleRiders
    : TOTAL_RIDERS - activeRiderPositions.length;

  const displayAssignments: Record<string, number> =
    phase === 'automate' ? algoAssignments :
    phase === 'bias' ? computeSeqAssignments(ALGO_SEQUENCE, TOTAL_RIDERS) :
    phase === 'fairerRound' ? fairerAssignments :
    finalAssignments;

  const highlightHoodId =
    phase === 'automate' ? algoHighlightId :
    phase === 'fairerRound' ? fairerNewId :
    null;

  const timerSecs = Math.ceil(ytTimer);
  const avgTripStatus = ytAvgWait === 0 || ytAvgWait < LIVE_GOALS.avgTrip - 2
    ? 'safe'
    : ytAvgWait <= LIVE_GOALS.avgTrip
      ? 'warn'
      : 'bad';
  const speedAlert = isYourTurn && !ytRoundDone && ytTimer <= 30 && ytAvgWait > 0
    ? ytAvgWait > LIVE_GOALS.avgTrip
      ? `Goal at risk — average trip is above ${LIVE_GOALS.avgTrip}s.`
      : avgTripStatus === 'warn'
        ? 'Speed target at risk — shorter rides return riders sooner.'
        : null
    : null;

  return (
    <div className="ab-page">
      <style>{STYLES}</style>
      <StepIndicator phase={phase} onBack={p => advance(p)} />

      {/* Live HUD — Your Turn only */}
      {isYourTurn && (
        <div className="ab-hud" style={{ marginTop: 8 }}>
          <div className={`ab-goal-panel ${avgTripStatus}`}>
            <div className="ab-goal-main">
              <div className="ab-goal-kicker">Goal</div>
              <div className="ab-goal-title">Keep avg trip under {LIVE_GOALS.avgTrip}s</div>
              <div className="ab-goal-meta">
                {ytRoundDone ? 'Round complete' : `${timerSecs}s left`} · {ytAvgWait > 0 ? `${ytAvgWait}s avg` : 'avg pending'} · {ytIdleRiders}/{TOTAL_RIDERS} riders ready
              </div>
            </div>
            <div className="ab-goal-avg">{ytAvgWait > 0 ? `${ytAvgWait}s` : '--'}</div>
          </div>
          <div className="ab-hud-secondary">
            <span>Delivered {ytDelivered}</span>
            <span>Earnings ${ytEarnings}</span>
          </div>
        </div>
      )}

      {/* City Map */}
      {showMap && (
        <MapBoard
          phase={phase}
          visitedSet={visitedSet}
          activeExploreTab={activeExploreTab}
          demoRiderXY={demoRiderXY}
          demoHoodId={demoState && demoState.phase !== 'done' ? demoState.hoodId : null}
          onHoodClick={handleHoodClick}
          isYourTurn={isYourTurn}
          ytIdleRiders={ytIdleRiders}
          ytDemand={ytDemand}
          ytRoundDone={ytRoundDone}
          ytFeedback={ytFeedback}
          activeRiderPositions={activeRiderPositions}
          idleRiderCount={idleRiderCount}
          showDemand={showDemand}
          surgeActive={surgeActive}
          displayAssignments={displayAssignments}
          highlightHoodId={highlightHoodId}
        />
      )}

      {/* Stage panels */}
      {phase === 'explore' && (
        <PhaseExplore
          onAct={setAction}
          visitedSet={visitedSet} setVisited={setVisitedSet}
          activeTab={activeExploreTab} setActiveTab={setActiveExploreTab}
          demoState={demoState} setDemoState={setDemoState}
        />
      )}
      {phase === 'goal' && <PhaseGoal onAct={setAction} />}
      {phase === 'yourTurn' && (
        <PhaseYourTurn
          onAct={setAction}
          ytIdleRiders={ytIdleRiders}
          ytDelivered={ytDelivered}
          ytEarnings={ytEarnings}
          ytAvgWait={ytAvgWait}
          ytFeedback={ytFeedback}
          ytRoundDone={ytRoundDone}
          ytDemand={ytDemand}
          speedAlert={speedAlert}
        />
      )}
      {phase === 'automate' && (
        <PhaseAutomate
          onAct={setAction}
          assignments={finalAssignments}
          algoStep={algoStep}
          algoAssignments={algoAssignments}
        />
      )}
      {phase === 'bias' && (
        <PhaseBias
          onAct={setAction}
          biasSubPhase={biasSubPhase}
          setBiasSubPhase={setBiasSubPhase}
          algoResults={algoResults}
        />
      )}
      {phase === 'reflect' && (
        <PhaseReflect
          onAct={setAction}
          assignments={finalAssignments}
          algoResults={algoResults.length > 0 ? algoResults : simulate(computeSeqAssignments(ALGO_SEQUENCE, TOTAL_RIDERS), ALGO_ORDERS_SURGE)}
        />
      )}

      {/* HIDDEN STAGES */}
      {phase === 'fixIt' && (
        <PhaseFixIt onAct={setAction} fixGoalChoice={fixGoalChoice} setFixGoalChoice={setFixGoalChoice} />
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
