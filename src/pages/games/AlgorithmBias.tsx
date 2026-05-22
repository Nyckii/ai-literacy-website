// AlgorithmBias.tsx, "Fair or Fast?" Delivery Bias Game
// Flow: Explore → Goal → Your Turn → Automate → Bias → Reflect
// Fix It stage (fixIt / fairerRound / finalReflect) is preserved in code but hidden from UI.
// Your Turn uses click-on-map dispatch: click a neighborhood to send one available rider there.

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import mapImg from './assets/AlgorithmBiasImg/city-delivery-map.png';
import { markGameCompleted } from '../../lib/gameProgress';

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

// Individual live rider, used during "Your Turn" for real-time dispatch
interface LiveRider {
  id: number;
  hoodId: string;
  progress: number; // 0→1 outbound, 1→1.3 delivering, 1.3→2.3 returning
  served: boolean;  // true once delivery was counted
}

interface RiderMapPos {
  id: number; x: number; y: number; delivering: boolean;
}

// Explore demo state
interface ExploreDemo {
  hoodId: string;
  progress: number;
  phase: 'outbound' | 'arrived' | 'returning' | 'done';
}

// ─── Map Constants ────────────────────────────────────────────────────────────

// HQ = the large central warehouse building (~43% left, ~47% top in the image)
const HQ = { x: 53, y: 46 };

// Road waypoints follow visible roads in the PNG (x/y in 0–100 range)
const ROAD_PATHS: Record<string, [number, number][]> = {
  downtown:    [[53, 46], [50, 52], [46, 58], [42, 65]],
  midtown:     [[53, 46], [45, 41], [38, 36], [30, 31]],
  northsuburb: [[53, 46], [52, 36], [52, 27], [51, 19]],
  easthills:   [[53, 46], [61, 46], [69, 47], [76, 47]],
};

const HOODS: Hood[] = [
  {
    id: 'downtown', name: 'Downtown', emoji: '🏙️',
    color: '#4f46e5', bgColor: 'rgba(79,70,229,0.15)', textColor: '#4338ca',
    pos: { x: 42, y: 65 }, radius: 9,
    baseOrders: 6, baseTime: 8, minTime: 4, earnings: 10,
    tagline: 'Dense · Fast · Profitable',
    difficulty: 'Easy, short trips',
    exploreInfo: 'Packed skyscrapers, busy restaurants, tight grid roads. Riders can zip in and out, very short trips, high order volume.',
  },
  {
    id: 'midtown', name: 'Midtown', emoji: '🏢',
    color: '#0891b2', bgColor: 'rgba(8,145,178,0.15)', textColor: '#0e7490',
    pos: { x: 30, y: 31 }, radius: 8,
    baseOrders: 4, baseTime: 13, minTime: 6, earnings: 11,
    tagline: 'Mixed · Steady · Moderate',
    difficulty: 'Medium, moderate trips',
    exploreInfo: 'Office towers and apartment blocks mixed together. Steady orders through the day, manageable distances from HQ.',
  },
  {
    id: 'northsuburb', name: 'North Suburb', emoji: '🏘️',
    color: '#d97706', bgColor: 'rgba(217,119,6,0.15)', textColor: '#b45309',
    pos: { x: 51, y: 19 }, radius: 7,
    baseOrders: 3, baseTime: 17, minTime: 8, earnings: 13,
    tagline: 'Quiet · Spread out · Longer rides',
    difficulty: 'Harder, homes spread out',
    exploreInfo: 'Peaceful residential streets where houses are far apart. Fewer orders per shift, but each delivery covers more ground.',
  },
  {
    id: 'easthills', name: 'East Hills', emoji: '🏜️',
    color: '#dc2626', bgColor: 'rgba(220,38,38,0.15)', textColor: '#b91c1c',
    pos: { x: 76, y: 47 }, radius: 8,
    baseOrders: 3, baseTime: 23, minTime: 10, earnings: 16,
    tagline: 'Remote · Winding roads · Hardest',
    difficulty: 'Hardest, longest trips',
    exploreInfo: 'The most remote neighborhood. Long winding roads mean every delivery is a journey, but residents here need service just as much as anyone.',
  },
];

// Biased algorithm (proportional to historical order volume)
const ALGO_SEQUENCE = ['downtown', 'downtown', 'downtown', 'downtown', 'midtown', 'midtown', 'northsuburb', 'easthills'];
// Fairer algorithm (guaranteed min coverage)
const FAIRER_SEQUENCE = ['downtown', 'easthills', 'midtown', 'northsuburb', 'downtown', 'easthills', 'midtown', 'northsuburb'];
// East Hills demand surge
const ALGO_ORDERS_SURGE: Record<string, number> = { downtown: 6, midtown: 4, northsuburb: 3, easthills: 8 };

const TOTAL_RIDERS = 8;
const YOUR_TURN_DURATION = 45;
const AUTO_DISPATCH_FRAME_GAP = 12;
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
const EMPTY_HOOD_COUNTS: Record<string, number> = { downtown: 0, midtown: 0, northsuburb: 0, easthills: 0 };

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
function liveResultsFromRun(
  assigned: Record<string, number>,
  delivered: Record<string, number>,
  orders: Record<string, number>
): NResult[] {
  return HOODS.map(h => {
    const drivers = assigned[h.id] ?? 0;
    const done = delivered[h.id] ?? 0;
    const time = drivers === 0 ? 99 : liveTripSeconds(h.id);
    return {
      id: h.id,
      drivers,
      orders: orders[h.id] ?? h.baseOrders,
      time,
      sat: calcSat(time),
      delivered: done,
    };
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

function spreadRiderXY(id: number, x: number, y: number): [number, number] {
  const lane = (id % 5) - 2;
  const direction = Math.floor(id / 5) % 2 === 0 ? 1 : -1;
  return [x + lane * 0.42, y + lane * direction * 0.34];
}

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
.ab-news-banner { background:linear-gradient(135deg,#dc2626,#7f1d1d); color:#fff; border-radius:14px; padding:20px 24px; margin-bottom:16px; animation:ab-fadein 0.4s ease both; border:2px solid #fca5a5; box-shadow:0 4px 24px rgba(220,38,38,0.35); }
.ab-news-tag  { font-size:12px; font-weight:800; letter-spacing:0.15em; text-transform:uppercase; opacity:0.9; margin-bottom:6px; display:flex; align-items:center; gap:6px; }
.ab-news-text { font-size:22px; font-weight:900; line-height:1.3; }

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

/* ── Arcade design pass ── */
.ab-page {
  background:
    radial-gradient(rgba(11,23,51,0.05) 1.15px, transparent 1.25px) 0 0 / 18px 18px,
    var(--bg);
  color:var(--text);
  font-family:var(--sans);
}
.ab-stepper {
  max-width:980px;
  padding:20px 0 12px;
}
.ab-step-dot {
  background:var(--surface);
  border:2px solid var(--ink);
  box-shadow:2px 2px 0 var(--ink);
}
.ab-step.active .ab-step-dot {
  background:var(--accent);
  border-color:var(--ink);
  box-shadow:3px 3px 0 var(--ink);
}
.ab-step.done .ab-step-dot {
  background:var(--tile-mint);
  border-color:var(--ink);
}
.ab-step-label {
  color:color-mix(in srgb, var(--ink) 60%, transparent);
  font-weight:800;
  letter-spacing:0.04em;
  text-transform:uppercase;
}
.ab-step.active .ab-step-label,
.ab-step.done .ab-step-label {
  color:var(--ink);
}
.ab-step-line {
  background:color-mix(in srgb, var(--ink) 22%, transparent);
  height:3px;
}
.ab-step-line.done {
  background:var(--accent);
}
.ab-map-wrap {
  max-width:980px;
  border-radius:var(--radius-lg);
  border:2px solid var(--ink);
  box-shadow:8px 8px 0 var(--ink);
  background:var(--surface);
}
.ab-card,
.ab-yt-panel,
.ab-explore-panel,
.ab-round-done {
  max-width:980px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.64), rgba(255,255,255,0) 42%),
    var(--surface);
  border:2px solid var(--ink);
  border-radius:var(--radius-lg);
  box-shadow:6px 6px 0 var(--ink);
}
.ab-card-title {
  color:var(--ink);
  font-family:var(--display);
  font-size:1.24rem;
  letter-spacing:-0.02em;
}
.ab-card-sub {
  color:var(--text-muted);
}
.ab-hud {
  max-width:980px;
}
.ab-hud > div,
.ab-goal-panel,
.ab-hud-secondary,
.ab-hud-tile,
.ab-timer-tile,
.ab-trip-stat,
.ab-algo-tile,
.ab-reflect-tile,
.ab-choice-card,
.ab-strategy-box,
.ab-callout {
  border:2px solid var(--ink) !important;
  box-shadow:4px 4px 0 var(--ink);
  border-radius:var(--radius);
}
.ab-algo-tile,
.ab-reflect-tile,
.ab-choice-card,
.ab-yt-hood-chip {
  background:
    radial-gradient(rgba(11,23,51,0.06) 1px, transparent 1.1px) 0 0 / 13px 13px,
    var(--surface) !important;
}
.ab-algo-count,
.ab-trip-stat-val {
  color:var(--accent-strong);
}
.ab-demand,
.ab-hq-badge,
.ab-hotspot,
.ab-rider,
.ab-demo-rider {
  border:2px solid var(--ink) !important;
  box-shadow:3px 3px 0 var(--ink);
}
.ab-demand {
  background:var(--tile-yellow);
}
.ab-demand-label,
.ab-demand-count {
  color:var(--ink);
}
.ab-demand.surge {
  background:var(--accent);
  color:#fff;
}
.ab-demand.surge .ab-demand-label,
.ab-demand.surge .ab-demand-count {
  color:#fff;
}
.ab-rider {
  background:var(--tile-coral);
}
.ab-rider.delivering {
  background:var(--accent);
}
.ab-demo-rider,
.ab-hq-badge {
  background:var(--tile-lavender);
  color:var(--ink);
}
.ab-rtable {
  border-collapse:separate;
  border-spacing:0;
  overflow:hidden;
  border:2px solid var(--ink);
  border-radius:var(--radius);
}
.ab-rtable th {
  background:var(--ink);
  color:#fff;
  border-bottom:2px solid var(--ink);
}
.ab-rtable td {
  border-bottom:1px solid color-mix(in srgb, var(--ink) 16%, transparent);
}
.ab-rtable tr:last-child td {
  border-bottom:none;
}
.ab-badge {
  border:1.5px solid currentColor;
  border-radius:6px;
}
.ab-explore-tab {
  color:var(--text-muted);
}
.ab-explore-tab.active {
  color:var(--ink);
  background:var(--accent-soft);
  border-bottom:3px solid var(--accent);
}
.ab-explore-tab.visited {
  color:var(--accent-strong);
}
.ab-news-banner {
  border:2px solid var(--ink);
  box-shadow:6px 6px 0 var(--ink);
  background:
    radial-gradient(rgba(255,255,255,0.16) 1.3px, transparent 1.4px) 0 0 / 16px 16px,
    var(--accent);
}
.ab-spinner {
  border-color:color-mix(in srgb, var(--ink) 18%, transparent);
  border-top-color:var(--accent);
}
.ab-action-bar {
  background:rgba(250,250,250,0.9);
  border-top:2px solid var(--ink);
  box-shadow:0 -5px 0 rgba(11,23,51,0.08);
}
.ab-btn {
  background:var(--accent);
  color:#fff;
  border:2px solid var(--ink);
  border-radius:999px;
  box-shadow:5px 5px 0 var(--ink);
}
.ab-btn:hover:not(:disabled) {
  background:var(--accent-strong);
  transform:translate(-2px,-2px);
  box-shadow:8px 8px 0 var(--ink);
}
.ab-btn:active:not(:disabled) {
  transform:translate(2px,2px);
  box-shadow:2px 2px 0 var(--ink);
}
.ab-btn:disabled {
  background:color-mix(in srgb, var(--ink) 15%, var(--surface));
  color:color-mix(in srgb, var(--ink) 45%, transparent);
  border-color:color-mix(in srgb, var(--ink) 36%, transparent);
  box-shadow:none;
}

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


function hoodTripHint(h: Hood) {
  return `${h.name}, ${h.difficulty} · click to send 1 rider`;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const VISIBLE_STEP_LABELS = ['Explore', 'Goal', 'Simulation', 'Automate', 'Bias', 'Reflect'];
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
  // Demand (non-yourTurn phases)
  showDemand: boolean;
  surgeActive: boolean;
  staticDemand?: Record<string, number>;
  // Algo phases
  displayAssignments: Record<string, number>;
  highlightHoodId: string | null;
  buildingAlgo: boolean;
}

function MapBoard({
  phase, visitedSet, activeExploreTab, demoRiderXY, demoHoodId,
  onHoodClick,
  isYourTurn, ytIdleRiders, ytDemand, ytRoundDone, ytFeedback,
  activeRiderPositions,
  showDemand, surgeActive, staticDemand,
  displayAssignments, highlightHoodId, buildingAlgo,
}: MapBoardProps) {
  const AR = 1.8333;
  const isExplore = phase === 'explore';


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


        {/* HQ marker */}
        <g>
          <circle cx={HQ.x * AR} cy={HQ.y} r={3.2}
            fill="white" stroke="#ec4899" strokeWidth="1.0" opacity="0.96" />
          <text x={HQ.x * AR} y={HQ.y + 0.5}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="2.4" fill="#ec4899" fontWeight="bold">HQ</text>
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
            className={`ab-demand ${isSurging ? 'surge' : ''} ${orderCount === 0 ? 'no-demand' : ''}`}
            style={{ left: `${h.pos.x}%`, top: `${h.pos.y - h.radius * 0.55}%` }}
          >
            <span className="ab-demand-label">DEMAND</span>
            <span className="ab-demand-count">📦 {orderCount}</span>
          </div>
        );
      })}


      {/* Active riders animating on roads */}
      {activeRiderPositions.map((pos) => (
        <div key={`rider-${pos.id}`}
          className={`ab-rider ${pos.delivering ? 'delivering' : ''}`}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
          🛵
        </div>
      ))}

      {/* Explore demo rider */}
      {isExplore && demoRiderXY && (
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
          ? hasDemand ? hoodTripHint(h) : `${h.name}, no demand right now`
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

      {/* Building algorithm overlay */}
      {buildingAlgo && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(237,233,227,0.55)', backdropFilter: 'blur(2px)', zIndex: 50,
          pointerEvents: 'none',
        }}>
          <div style={{
            background: '#fff', border: '2px solid #c7d2fe', borderRadius: 16,
            padding: '18px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            boxShadow: '0 4px 24px rgba(79,70,229,0.15)',
          }}>
            <div className="ab-spinner" style={{ width: 28, height: 28, borderWidth: 3, borderTopColor: '#4f46e5' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#3730a3' }}>Building Algorithm…</div>
            <div style={{ fontSize: 12, color: '#6366f1' }}>Analysing your dispatch patterns</div>
          </div>
        </div>
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
              {isDemoRunning && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b5f55' }}>
                  <div className="ab-spinner" />
                  {demoState!.phase === 'outbound' && `Rider heading to ${activeHood.name}…`}
                  {demoState!.phase === 'arrived' && `📦 Delivering in ${activeHood.name}…`}
                  {demoState!.phase === 'returning' && 'Rider returning to HQ…'}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="ab-explore-empty">
          {allDone ? '✅ All areas explored, press the button to continue!' : 'Click a neighborhood on the map, or a tab above, to explore it.'}
        </div>
      )}
    </div>
  );
}

// ─── Stage 2: Goal ────────────────────────────────────────────────────────────

function PhaseGoal({ onAct }: { onAct: (l: string, e: boolean) => void }) {
  useEffect(() => { onAct('Start Simulation →', true); }, [onAct]);
  return (
    <div className="ab-card">
      <div style={{ background: '#eef2ff', border: '2px solid #c7d2fe', borderRadius: 14, padding: '14px 18px', textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Goal This Shift</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#3730a3' }}>"Keep average trip time under {LIVE_GOALS.avgTrip}s"</div>
        <div style={{ fontSize: 12, color: '#4f46e5', marginTop: 6 }}>
          The company wants shorter average trips because faster rides usually mean more completed deliveries and more earnings.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { icon: '💰', head: 'More revenue', body: 'Faster trips = riders complete more orders per shift = higher earnings.' },
          { icon: '📦', head: 'More completed orders', body: 'Short rides return riders sooner, so more orders can be served during the shift.' },
          { icon: '⚡', head: 'Less idle time', body: 'Optimizing speed keeps riders moving, less wasted time between orders.' },
        ].map(({ icon, head, body }) => (
          <div key={head} style={{ background: '#f8f5f1', border: '1px solid #e8e0d5', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8998c', marginBottom: 4 }}>{head}</div>
            <div style={{ fontSize: 12, color: '#8a7a6d', lineHeight: 1.5 }}>{body}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
          <div style={{ textAlign: 'center', background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 12, padding: '10px 18px' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#92400e' }}>{TOTAL_RIDERS}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Riders</div>
          </div>
          <div style={{ textAlign: 'center', background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 12, padding: '10px 18px' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#92400e' }}>{YOUR_TURN_DURATION}s</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Time Limit</div>
          </div>
          <div style={{ flex: 1, fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
            <strong>Click any neighborhood on the map to dispatch a rider.</strong> Downtown is fast. East Hills ties a rider up much longer. Your choices will matter later.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stage 3: Your Turn panel ─────────────────────────────────────────────────
// The main interaction happens on the map (click neighborhoods).
// This panel shows current status and feedback.

function PhaseYourTurn({
  onAct, onRetry, ytAvgWait,
  ytRoundDone, ytDemand, speedAlert,
}: {
  onAct: (l: string, e: boolean) => void;
  onRetry: () => void;
  ytAvgWait: number;
  ytRoundDone: boolean;
  ytDemand: Record<string, number>;
  speedAlert: string | null;
}) {
  const goalMet = ytAvgWait > 0 && ytAvgWait <= LIVE_GOALS.avgTrip;
  useEffect(() => {
    if (ytRoundDone && goalMet) onAct('See What the Algorithm Learned →', true);
    else onAct('', false);
  }, [ytRoundDone, goalMet, onAct]);


  return (
    <div className="ab-yt-panel">

      {/* Feedback message */}
      {!ytRoundDone && speedAlert && (
        <div className="ab-yt-feedback warn">
          {speedAlert}
        </div>
      )}

      {/* Per-hood live status */}
      {!ytRoundDone && (
        <div className="ab-yt-hood-stats">
          {HOODS.map(h => {
            const demand = ytDemand[h.id] ?? 0;
            const secs = liveTripSeconds(h.id);
            const speedLabel = secs <= 10 ? '⚡ Fastest' : secs <= 16 ? '🟢 Fast' : secs <= 25 ? '🟡 Slow' : '🔴 Slowest';
            const speedColor = secs <= 10 ? '#16a34a' : secs <= 16 ? '#15803d' : secs <= 25 ? '#d97706' : '#dc2626';
            const barPct = Math.round((secs / 40) * 100);
            return (
              <div key={h.id} className="ab-yt-hood-chip"
                style={{ borderColor: demand > 0 ? h.color + '80' : '#e2d9ce', background: demand > 0 ? h.bgColor : '#f8f5f1' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: h.textColor }}>{h.emoji} {h.name}</div>
                <div style={{ fontSize: 11, color: demand > 0 ? h.textColor : '#b0a499', marginBottom: 4 }}>
                  {demand > 0 ? `📦 ${demand} waiting` : 'No demand'}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: speedColor, marginBottom: 3 }}>{secs}s &nbsp;<span style={{ fontSize: 11, fontWeight: 600 }}>{speedLabel}</span></div>
                <div style={{ height: 5, borderRadius: 3, background: '#e2d9ce', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${barPct}%`, background: speedColor, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Round complete */}
      {ytRoundDone && (
        <div className={`ab-round-done`} style={{ margin: 0, background: goalMet ? '#f0fdf4' : '#fef2f2', border: `2px solid ${goalMet ? '#86efac' : '#fca5a5'}` }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>{goalMet ? '✅ Goal Met!' : '❌ Goal Missed'}</div>
          <div style={{ fontSize: 14, color: goalMet ? '#166534' : '#991b1b' }}>
            Average trip time: <strong>{Math.round(ytAvgWait)} sec</strong> — target was under <strong>{LIVE_GOALS.avgTrip}s</strong>.
          </div>
          {goalMet
            ? <div style={{ fontSize: 13, color: '#15803d', marginTop: 6 }}>Your average ride time stayed below the target. Press the button below to continue.</div>
            : <>
                <div style={{ fontSize: 13, color: '#991b1b', marginTop: 6 }}>Too many long-distance trips kept riders away. Try sending more riders to closer neighborhoods.</div>
                <button onClick={onRetry} style={{ marginTop: 12, padding: '10px 28px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Try Again
                </button>
              </>}
        </div>
      )}
    </div>
  );
}

// ─── Shared: Dispatch Rule + Live Sim Panel ───────────────────────────────────

const DISPATCH_RULES = [
  { id: 'downtown', hood: 'Downtown',     note: 'fastest trips',  action: 'Fill all demand here first.' },
  { id: 'midtown', hood: 'Midtown',      note: 'next fastest',   action: 'Assign remaining riders here.' },
  { id: 'northsuburb', hood: 'North Suburb', note: 'slower trips',   action: 'Send riders if any are left.' },
  { id: 'easthills', hood: 'East Hills',   note: 'longest trips',  action: 'Last priority — leftovers only.' },
];

function DispatchSimPanel({
  simTimer, totalTime, simDemand, simDelivered, surgeHoodId,
}: {
  simTimer: number;
  totalTime: number;
  simDemand: Record<string, number>;
  simDelivered: Record<string, number>;
  surgeHoodId?: string;
}) {
  const pct = Math.max(0, simTimer / totalTime) * 100;
  const activeRuleId = DISPATCH_RULES.find(rule => (simDemand[rule.id] ?? 0) > 0)?.id ?? null;
  return (
    <>
      {/* Dispatch Rule */}
      <div style={{ background: '#f4f1fd', border: '1.5px solid #c4b5fd', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5', marginBottom: 8 }}>Dispatch Rule Learned</div>
        {DISPATCH_RULES.map(({ id, hood, note, action }, i) => {
          const isActive = id === activeRuleId;
          const remaining = simDemand[id] ?? 0;
          return (
          <div key={hood} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: i < 3 ? 6 : 0,
            background: isActive ? '#fff' : 'transparent',
            border: isActive ? '1.5px solid #8b5cf6' : '1.5px solid transparent',
            borderRadius: 10,
            padding: isActive ? '6px 8px' : '0 8px',
            marginLeft: isActive ? -8 : 0,
            transition: 'all 0.18s ease',
          }}>
            <div style={{ minWidth: 20, height: 20, borderRadius: '50%', background: isActive ? '#7c3aed' : '#4f46e5', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
            <div style={{ lineHeight: 1.3 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2d2419' }}>{hood}</span>
              <span style={{ fontSize: 11, color: '#8a7a6d', marginLeft: 5 }}>({note})</span>
              <div style={{ fontSize: 11, color: '#5b50c7', marginTop: 1 }}>{action}</div>
              {isActive && <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 800, marginTop: 3 }}>{remaining} waiting - filling this queue now</div>}
            </div>
          </div>
        );})}
      </div>

      {/* Timer bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8a7a6d', marginBottom: 3 }}>
          <span>{simTimer > 0 ? 'Running with 8 riders…' : 'Simulation complete'}</span>
          <span style={{ fontWeight: 700, color: '#2d2419' }}>{simTimer > 0 ? `${Math.ceil(simTimer)}s` : 'Done'}</span>
        </div>
        <div style={{ height: 5, background: '#e2d9ce', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#4f46e5', borderRadius: 4, transition: 'width 0.1s linear' }} />
        </div>
      </div>

      {/* Live delivery tiles */}
      <div className="ab-algo-tiles">
        {HOODS.map(h => {
          const delivered = simDelivered[h.id] ?? 0;
          const demand = simDemand[h.id] ?? 0;
          const isSurge = h.id === surgeHoodId;
          return (
            <div key={h.id} className="ab-algo-tile"
              style={{ borderColor: isSurge ? '#dc2626' : h.color, outline: isSurge ? '2px dashed #dc2626' : undefined }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{h.emoji}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: isSurge ? '#dc2626' : h.textColor, marginBottom: 3 }}>{h.name}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: isSurge ? '#dc2626' : h.color }}>{delivered}</div>
              <div style={{ fontSize: 9, color: '#8a7a6d', marginTop: 1 }}>delivered</div>
              <div style={{ fontSize: 9, color: isSurge ? '#b91c1c' : '#a8998c', marginTop: 2, fontWeight: 600 }}>{demand} waiting</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Stage 4: Automate ────────────────────────────────────────────────────────

function PhaseAutomate({
  onAct, algoStep, autoSimTimer, autoSimDemand, autoSimDelivered,
}: {
  onAct: (l: string, e: boolean) => void;
  algoStep: number;
  autoSimTimer: number;
  autoSimDemand: Record<string, number>;
  autoSimDelivered: Record<string, number>;
}) {
  const complete = algoStep >= TOTAL_RIDERS;
  const simRunning = autoSimTimer > 0;
  useEffect(() => {
    if (complete && !simRunning) onAct('Run the Algorithm →', true);
    else onAct('', false);
  }, [complete, simRunning, onAct]);

  return (
    <div className="ab-card">
      <div className="ab-card-title">🤖 {complete ? 'Algorithm Running' : 'Building the Algorithm…'}</div>
      <div className="ab-card-sub">SpeedEats is automating dispatch around one objective: keep average trip time under {LIVE_GOALS.avgTrip}s.</div>
      {!complete ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8a7a6d', fontSize: 13, marginBottom: 14 }}>
          <div className="ab-spinner" /> Analyzing your dispatch patterns…
        </div>
      ) : (
        <DispatchSimPanel
          simTimer={autoSimTimer}
          totalTime={20}
          simDemand={autoSimDemand}
          simDelivered={autoSimDelivered}
        />
      )}
    </div>
  );
}

// ─── Stage 5: Bias ────────────────────────────────────────────────────────────

function PhaseBias({
  onAct, biasSubPhase, setBiasSubPhase,
  biasSimTimer, biasSimDemand, biasSimDelivered,
  algoResults,
}: {
  onAct: (l: string, e: boolean) => void;
  biasSubPhase: 'event' | 'running' | 'results';
  setBiasSubPhase: (s: 'event' | 'running' | 'results') => void;
  biasSimTimer: number;
  biasSimDemand: Record<string, number>;
  biasSimDelivered: Record<string, number>;
  algoResults: NResult[];
}) {

  useEffect(() => {
    if (biasSubPhase === 'event') {
      onAct('', false);
    } else if (biasSubPhase === 'running') {
      onAct('', false);
    } else {
      onAct('What Does This Mean? →', true);
    }
  }, [biasSubPhase, onAct]);

  if (biasSubPhase === 'event') {
    return (
      <div className="ab-card">
        <div className="ab-news-banner">
          <div className="ab-news-tag">🚨 BREAKING NEWS</div>
          <div className="ab-news-text">East Hills: 8 orders today — nearly triple the usual 3. The algorithm is already running.</div>
        </div>
        <button
          onClick={() => setBiasSubPhase('running')}
          style={{
            width: '100%', padding: '12px 20px', borderRadius: 10, cursor: 'pointer',
            background: '#f8f5f1', border: '1.5px solid #e2d9ce',
            color: '#2d2419', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          ▶ Run Algorithm Simulation
        </button>
      </div>
    );
  }

  if (biasSubPhase === 'running') {
    return (
      <div className="ab-card">
        <DispatchSimPanel
          simTimer={biasSimTimer}
          totalTime={20}
          simDemand={biasSimDemand}
          simDelivered={biasSimDelivered}
          surgeHoodId="easthills"
        />
      </div>
    );
  }

  return (
    <div className="ab-card">
      <div className="ab-card-title">📊 What the Algorithm Did</div>
      <div className="ab-card-sub">The algorithm protected the {LIVE_GOALS.avgTrip}s trip-time goal. Here's what that meant for each neighborhood.</div>
      <ResultTable results={algoResults} showOrders hideSatisfaction />
    </div>
  );
}

// ─── Stage 6: Reflect ─────────────────────────────────────────────────────────

function PhaseReflect({
  onAct, algoResults,
}: {
  onAct: (l: string, e: boolean) => void;
  algoResults: NResult[];
}) {
  useEffect(() => { onAct('Finish →', true); }, [onAct]);
  const ehResult = algoResults.find(r => r.id === 'easthills');

  const ehUnmet = Math.max(0, ALGO_ORDERS_SURGE.easthills - (ehResult?.delivered ?? 1));
  const ehEarningsLost = ehUnmet * 16; // East Hills earns $16/delivery

  return (
    <div className="ab-card">
      <div className="ab-card-title">🎓 What Actually Happened</div>
      <div className="ab-card-sub">SpeedEats hit its speed target — and still lost money. East Hills residents are furious.</div>

      {/* Company lost money */}
      <div style={{ background: '#fef9ec', border: '1.5px solid #fde68a', borderRadius: 14, padding: '14px 18px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#92400e', marginBottom: 8 }}>💸 Company Lost Revenue</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#78350f', marginBottom: 6 }}>
          {ehUnmet} undelivered orders in East Hills = <span style={{ color: '#dc2626' }}>−${ehEarningsLost} lost</span>
        </div>
        <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          The algorithm chased a <strong>speed metric</strong>, not revenue. East Hills has the highest earnings per delivery (${16}/order) but got the fewest riders. The company optimised for the wrong goal — and paid for it.
        </div>
      </div>

      {/* East Hills residents unhappy */}
      <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 14, padding: '14px 18px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#dc2626', marginBottom: 8 }}>😡 East Hills Residents Are Furious</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
            "I ordered an hour ago. My food is still not here. Every time it's the same." — East Hills resident
          </div>
          <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
            "There are always riders sitting idle downtown while we wait. The app just doesn't care about us."
          </div>
        </div>
        <div style={{ marginTop: 10, background: '#fee2e2', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#7f1d1d', fontWeight: 600 }}>
          {ehResult?.drivers ?? 1} rider assigned to {ALGO_ORDERS_SURGE.easthills} orders — {ehUnmet} customers left waiting. Repeat frustration = lost customers permanently.
        </div>
      </div>

      {/* Core lesson */}
      <div style={{ background: '#1e1b4b', borderRadius: 14, padding: '16px 18px', color: '#fff' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a5b4fc', marginBottom: 8 }}>The Core Problem</div>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5, marginBottom: 8 }}>
          The goal was "minimize average trip time" — not "make more money" or "serve every customer."
        </div>
        <div style={{ fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 }}>
          When you optimise for the wrong metric, the algorithm does exactly what you asked — and exactly the wrong thing. A better goal would balance speed, coverage, and revenue across all neighborhoods.
        </div>
      </div>
    </div>
  );
}

// ─── HIDDEN STAGES (code preserved) ──────────────────────────────────────────

const FIX_CHOICES = [
  { id: 'A' as const, title: 'Keep the speed-only goal', desc: '"Minimize average delivery time", same as before.', feedback: 'This is the same goal that caused the problem. Optimizing only for average speed still systematically deprioritizes remote neighborhoods.' },
  { id: 'B' as const, title: 'Switch to a volume goal', desc: '"Maximize total deliveries completed per shift."', feedback: 'Volume-only optimization still rewards easy, nearby neighborhoods. The algorithm would still neglect East Hills.' },
  { id: 'C' as const, title: 'Balance speed and guaranteed coverage', desc: '"Minimize average delivery time, while ensuring every neighborhood receives at least 2 riders."', feedback: '✓ By guaranteeing a minimum for every area, the algorithm cannot quietly deprioritize remote neighborhoods, even when they have lower historical demand.' },
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
      <div className="ab-card-sub">The problem wasn't the algorithm's math, it was the goal it was given. Which objective would you choose?</div>
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
      <div className="ab-card-sub">{complete ? 'Every neighborhood receives at least 2 riders, guaranteed.' : 'The new algorithm ensures a minimum of 2 riders per neighborhood before distributing by demand.'}</div>
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
      {complete && <div className="ab-callout green" style={{ marginTop: 14 }}>East Hills now has <strong>2 riders for 8 orders</strong>, dramatically better than 1.</div>}
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
      <div className="ab-card-title">🎓 What Changed and Why It Matters</div>
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
        <strong>What fairness requires:</strong> Explicitly designing for equity, not just efficiency. Ask "Who benefits from this goal, and who doesn't?" before the algorithm runs.
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AlgorithmBias() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<GamePhase>('explore');

  useEffect(() => {
    if (phase === 'reflect') markGameCompleted('algorithm-bias');
  }, [phase]);

  // Button state
  const [btnLabel, setBtnLabel] = useState('');
  const [btnEnabled, setBtnEnabled] = useState(false);
  const actionFnRef = useRef<(() => void) | null>(null);

  // Stage 1: Explore
  const [visitedSet, setVisitedSet] = useState(new Set<string>());
  const [activeExploreTab, setActiveExploreTab] = useState<string | null>(null);
  const [demoState, setDemoState] = useState<ExploreDemo | null>(null);

  // ── Stage 3: Your Turn, individual click-to-dispatch mechanic ──
  const ytLiveRidersRef = useRef<LiveRider[]>([]);
  const [ytIdleRiders, setYtIdleRiders] = useState(TOTAL_RIDERS);
  const [ytRenderTick, setYtRenderTick] = useState(0); // drives map re-render
  const ytRiderIdRef = useRef(0);

  const [ytDemand, setYtDemand] = useState<Record<string, number>>({ ...INITIAL_DEMAND });
  const [ytWaveCount, setYtWaveCount] = useState(0);
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
  // Rider animation for Automate/FairerRound phases (cycling loop)
  const autoRidersRef = useRef<{ id: number; hoodId: string; progress: number }[]>([]);
  const [autoRiderPositions, setAutoRiderPositions] = useState<RiderMapPos[]>([]);
  // Automate live simulation (runs after building completes)
  const autoSimLiveRidersRef = useRef<LiveRider[]>([]);
  const autoSimRiderIdRef = useRef(0);
  const autoSimDemandRef = useRef<Record<string, number>>({});
  const autoSimAssignedRef = useRef<Record<string, number>>({});
  const autoSimReservedRef = useRef<Record<string, number>>({});
  const autoSimIdleRef = useRef(TOTAL_RIDERS);
  const autoSimDeliveredRef = useRef<Record<string, number>>({});
  const autoSimDispatchFrameGapRef = useRef(AUTO_DISPATCH_FRAME_GAP);
  const [autoSimRunning, setAutoSimRunning] = useState(false);
  const [autoSimTimer, setAutoSimTimer] = useState(20);
  const [autoSimDemand, setAutoSimDemand] = useState<Record<string, number>>({});
  const [autoSimDelivered, setAutoSimDelivered] = useState<Record<string, number>>({});

  // Stage 5: Bias
  const [biasSubPhase, setBiasSubPhase] = useState<'event' | 'running' | 'results'>('event');
  const [algoResults, setAlgoResults] = useState<NResult[]>([]);

  // Bias live simulation
  const biasLiveRidersRef = useRef<LiveRider[]>([]);
  const biasRiderIdRef = useRef(0);
  const biasSimDemandRef = useRef<Record<string, number>>({});
  const biasSimStartDemandRef = useRef<Record<string, number>>(ALGO_ORDERS_SURGE);
  const biasSimAssignedRef = useRef<Record<string, number>>({});
  const biasSimReservedRef = useRef<Record<string, number>>({});
  const biasSimIdleRef = useRef(TOTAL_RIDERS);
  const biasSimDeliveredRef = useRef<Record<string, number>>({});
  const biasSimDispatchFrameGapRef = useRef(AUTO_DISPATCH_FRAME_GAP);
  const [biasSimRunning, setBiasSimRunning] = useState(false);
  const [biasSimTimer, setBiasSimTimer] = useState(20);
  const [biasSimDemand, setBiasSimDemand] = useState<Record<string, number>>({});
  const [biasSimDelivered, setBiasSimDelivered] = useState<Record<string, number>>({});

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
    setYtCompletedTimes([]);
    setYtDispatchLog([]);
    setYtFeedback(null);
    setYtTimer(YOUR_TURN_DURATION);
    setYtRoundDone(false);
    const t = setTimeout(() => setYtRunning(true), 400);
    return () => clearTimeout(t);
  }, [phase]);

  const resetYourTurn = useCallback(() => {
    ytLiveRidersRef.current = [];
    setYtIdleRiders(TOTAL_RIDERS);
    setYtRenderTick(0);
    ytRiderIdRef.current = 0;
    setYtDemand({ ...INITIAL_DEMAND });
    setYtWaveCount(0);
    setYtCompletedTimes([]);
    setYtDispatchLog([]);
    setYtFeedback(null);
    setYtTimer(YOUR_TURN_DURATION);
    setYtRoundDone(false);
    setYtRunning(false);
    setTimeout(() => setYtRunning(true), 400);
  }, []);

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

    if (ytIdleRiders <= 0) return;
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

  // ── Automate: start live simulation when building completes ──
  useEffect(() => {
    if (phase !== 'automate' || algoStep < TOTAL_RIDERS) return;
    autoRidersRef.current = [];
    autoSimLiveRidersRef.current = [];
    autoSimRiderIdRef.current = 0;
    autoSimDemandRef.current = { ...INITIAL_DEMAND };
    autoSimAssignedRef.current = { ...EMPTY_HOOD_COUNTS };
    autoSimReservedRef.current = { ...EMPTY_HOOD_COUNTS };
    autoSimIdleRef.current = TOTAL_RIDERS;
    autoSimDeliveredRef.current = { ...EMPTY_HOOD_COUNTS };
    autoSimDispatchFrameGapRef.current = AUTO_DISPATCH_FRAME_GAP;
    setAutoSimRunning(true);
    setAutoSimTimer(20);
    setAutoSimDemand({ ...INITIAL_DEMAND });
    setAutoSimDelivered({ ...EMPTY_HOOD_COUNTS });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, algoStep]);

  // ── Automate: countdown timer ──
  useEffect(() => {
    if (!autoSimRunning) return;
    const interval = setInterval(() => {
      setAutoSimTimer(prev => {
        const next = prev - 1 / 30;
        if (next <= 0) { setAutoSimRunning(false); return 0; }
        return next;
      });
    }, 33);
    return () => clearInterval(interval);
  }, [autoSimRunning]);

  // ── Automate: main simulation loop ──
  useEffect(() => {
    if (!autoSimRunning || phase !== 'automate') return;
    const interval = setInterval(() => {
      // Advance riders
      const updated: LiveRider[] = [];
      for (const rider of autoSimLiveRidersRef.current) {
        const h = hoodById(rider.hoodId);
        const newProgress = rider.progress + riderSpeedForHood(h);
        let served = rider.served;
        if (!served && rider.progress < 1.0 && newProgress >= 1.0) {
          served = true;
          autoSimDeliveredRef.current[rider.hoodId] = (autoSimDeliveredRef.current[rider.hoodId] ?? 0) + 1;
          autoSimDemandRef.current[rider.hoodId] = Math.max(
            0,
            (INITIAL_DEMAND[rider.hoodId] ?? 0) - (autoSimDeliveredRef.current[rider.hoodId] ?? 0)
          );
        }
        if (newProgress >= 2.3) { autoSimIdleRef.current += 1; continue; }
        updated.push({ ...rider, progress: newProgress, served });
      }
      autoSimLiveRidersRef.current = updated;

      // Dispatch exactly one rider per visible beat, following the learned
      // priority rule so users can see each neighborhood queue drain in order.
      autoSimDispatchFrameGapRef.current += 1;
      if (
        autoSimIdleRef.current > 0 &&
        autoSimDispatchFrameGapRef.current >= AUTO_DISPATCH_FRAME_GAP
      ) {
        for (const hoodId of ['downtown', 'midtown', 'northsuburb', 'easthills'] as const) {
          if ((autoSimReservedRef.current[hoodId] ?? 0) < (INITIAL_DEMAND[hoodId] ?? 0)) {
            autoSimLiveRidersRef.current = [...autoSimLiveRidersRef.current,
              { id: autoSimRiderIdRef.current++, hoodId, progress: 0, served: false }];
            autoSimReservedRef.current[hoodId] = (autoSimReservedRef.current[hoodId] ?? 0) + 1;
            autoSimAssignedRef.current[hoodId] = (autoSimAssignedRef.current[hoodId] ?? 0) + 1;
            autoSimIdleRef.current -= 1;
            autoSimDispatchFrameGapRef.current = 0;
            break;
          }
        }
      }

      const positions: RiderMapPos[] = autoSimLiveRidersRef.current
        .map(r => {
          const [x, y] = progressToXY(r.hoodId, r.progress);
          const [sx, sy] = spreadRiderXY(r.id, x, y);
          return { id: r.id, x: sx, y: sy, delivering: riderIsDelivering(r.progress) };
        });
      setAutoRiderPositions(positions);
      setAutoSimDemand({ ...autoSimDemandRef.current });
      setAutoSimDelivered({ ...autoSimDeliveredRef.current });
    }, 33);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSimRunning, phase]);

  // ── Bias: start real simulation when biasSubPhase → 'running' ──
  useEffect(() => {
    if (phase !== 'bias' || biasSubPhase !== 'running') return;
    biasLiveRidersRef.current = [];
    biasRiderIdRef.current = 0;
    const biasStartDemand = { ...ALGO_ORDERS_SURGE };
    biasSimStartDemandRef.current = { ...biasStartDemand };
    biasSimDemandRef.current = { ...biasStartDemand };
    biasSimAssignedRef.current = { ...EMPTY_HOOD_COUNTS };
    biasSimReservedRef.current = { ...EMPTY_HOOD_COUNTS };
    biasSimIdleRef.current = TOTAL_RIDERS;
    biasSimDeliveredRef.current = { ...EMPTY_HOOD_COUNTS };
    biasSimDispatchFrameGapRef.current = AUTO_DISPATCH_FRAME_GAP;
    setBiasSimRunning(true);
    setBiasSimTimer(20);
    setBiasSimDemand({ ...biasStartDemand });
    setBiasSimDelivered({ ...EMPTY_HOOD_COUNTS });
  }, [phase, biasSubPhase]);

  // ── Bias: countdown timer ──
  useEffect(() => {
    if (!biasSimRunning) return;
    const interval = setInterval(() => {
      setBiasSimTimer(prev => {
        const next = prev - 1 / 30;
        if (next <= 0) { setBiasSimRunning(false); return 0; }
        return next;
      });
    }, 33);
    return () => clearInterval(interval);
  }, [biasSimRunning]);

  // ── Bias: transition to results when timer ends ──
  useEffect(() => {
    if (biasSimRunning || biasSimTimer > 0.05 || biasSubPhase !== 'running' || phase !== 'bias') return;
    setAlgoResults(liveResultsFromRun(
      biasSimAssignedRef.current,
      biasSimDeliveredRef.current,
      biasSimStartDemandRef.current
    ));
    setTimeout(() => setBiasSubPhase('results'), 1000);
  }, [biasSimRunning, biasSimTimer, biasSubPhase, phase]);

  // ── Bias: main simulation loop (dispatch + animate) ──
  const BIAS_PRIORITY = ['downtown', 'midtown', 'northsuburb', 'easthills'] as const;
  useEffect(() => {
    if (!biasSimRunning || phase !== 'bias') return;
    const interval = setInterval(() => {
      // 1. Advance rider progress
      const riders = biasLiveRidersRef.current;
      const updated: LiveRider[] = [];
      for (const rider of riders) {
        const h = hoodById(rider.hoodId);
        const newProgress = rider.progress + riderSpeedForHood(h);
        let served = rider.served;
        if (!served && rider.progress < 1.0 && newProgress >= 1.0) {
          served = true;
          biasSimDeliveredRef.current[rider.hoodId] = (biasSimDeliveredRef.current[rider.hoodId] ?? 0) + 1;
          biasSimDemandRef.current[rider.hoodId] = Math.max(
            0,
            (biasSimStartDemandRef.current[rider.hoodId] ?? 0) - (biasSimDeliveredRef.current[rider.hoodId] ?? 0)
          );
        }
        if (newProgress >= 2.3) {
          biasSimIdleRef.current += 1;
          continue;
        }
        updated.push({ ...rider, progress: newProgress, served });
      }
      biasLiveRidersRef.current = updated;

      // 2. Dispatch exactly one rider per visible beat in strict priority
      // order. East Hills only receives riders after the faster queues empty.
      biasSimDispatchFrameGapRef.current += 1;
      if (
        biasSimIdleRef.current > 0 &&
        biasSimDispatchFrameGapRef.current >= AUTO_DISPATCH_FRAME_GAP
      ) {
        for (const hoodId of BIAS_PRIORITY) {
          if ((biasSimReservedRef.current[hoodId] ?? 0) < (biasSimStartDemandRef.current[hoodId] ?? 0)) {
            biasLiveRidersRef.current = [
              ...biasLiveRidersRef.current,
              { id: biasRiderIdRef.current++, hoodId, progress: 0, served: false },
            ];
            biasSimReservedRef.current[hoodId] = (biasSimReservedRef.current[hoodId] ?? 0) + 1;
            biasSimAssignedRef.current[hoodId] = (biasSimAssignedRef.current[hoodId] ?? 0) + 1;
            biasSimIdleRef.current -= 1;
            biasSimDispatchFrameGapRef.current = 0;
            break;
          }
        }
      }

      const positions: RiderMapPos[] = biasLiveRidersRef.current
        .map(r => {
          const [x, y] = progressToXY(r.hoodId, r.progress);
          const [sx, sy] = spreadRiderXY(r.id, x, y);
          return { id: r.id, x: sx, y: sy, delivering: riderIsDelivering(r.progress) };
        });
      setAutoRiderPositions(positions);

      // 4. Sync display state for panel
      setBiasSimDemand({ ...biasSimDemandRef.current });
      setBiasSimDelivered({ ...biasSimDeliveredRef.current });
    }, 33);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biasSimRunning, phase]);

  // ── Auto-phase rider animation (Automate / FairerRound only — bias has its own loop) ──
  useEffect(() => {
    const isActive = phase === 'automate' || phase === 'fairerRound';
    if (!isActive) return;

    const targetAssignments = phase === 'automate'
      ? computeSeqAssignments(ALGO_SEQUENCE, algoStep)
      : fairerAssignments;

    const ref = autoRidersRef.current;
    let autoIdCounter = ref.length > 0 ? Math.max(...ref.map(r => r.id)) + 1 : 0;
    const newPool: { id: number; hoodId: string; progress: number }[] = [];
    const startProgress = phase === 'fairerRound'
      ? (i: number, needed: number) => (i / Math.max(1, needed)) * 2.3
      : () => 0;
    for (const h of HOODS) {
      const needed = targetAssignments[h.id] ?? 0;
      const existing = ref.filter(r => r.hoodId === h.id);
      for (let i = 0; i < Math.min(needed, existing.length); i++) newPool.push(existing[i]);
      for (let i = existing.length; i < needed; i++) {
        newPool.push({ id: autoIdCounter++, hoodId: h.id, progress: startProgress(i, needed) });
      }
    }
    autoRidersRef.current = newPool;
  }, [phase, algoStep, fairerAssignments]);

  // Auto-rider animation loop (automate building phase + fairerRound only)
  const autoAnimRunning =
    (phase === 'automate' && !autoSimRunning) ||
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
        positions.push({ id: rider.id, x, y, delivering: riderIsDelivering(rider.progress) });
      }
      setAutoRiderPositions([...positions]);
    }, 33);
    return () => clearInterval(interval);
  }, [autoAnimRunning]);

  // ── Derive live rider positions for Your Turn (from ref, updated per tick) ──
  const ytRiderPositions: RiderMapPos[] = useMemo(() => {
    return ytLiveRidersRef.current
      .filter(rider => rider.progress > 0.08)
      .map(rider => {
        const [x, y] = progressToXY(rider.hoodId, rider.progress);
        return { id: rider.id, x, y, delivering: riderIsDelivering(rider.progress) };
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
      setAlgoResults([]);
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
    if (phase === 'reflect' || phase === 'finalReflect') {
      navigate('/');
      return;
    }
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
  const liveStaticDemand =
    phase === 'automate' && autoSimRunning ? autoSimDemand :
    phase === 'bias' && biasSubPhase === 'running' ? biasSimDemand :
    undefined;

  const activeRiderPositions: RiderMapPos[] = isYourTurn ? ytRiderPositions : autoRiderPositions;

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
      ? `Goal at risk, average trip is above ${LIVE_GOALS.avgTrip}s.`
      : avgTripStatus === 'warn'
        ? 'Speed target at risk, shorter rides return riders sooner.'
        : null
    : null;

  return (
    <div className="ab-page">
      <style>{STYLES}</style>
      <StepIndicator phase={phase} onBack={p => advance(p)} />

      {/* Live HUD, Your Turn only */}
      {isYourTurn && (() => {
        const pct = ytRoundDone ? 0 : Math.max(0, ytTimer / YOUR_TURN_DURATION) * 100;
        const barColor = pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444';
        return (
          <>
            <div className="ab-hud" style={{ marginTop: 8 }}>
              {/* Goal box */}
              <div style={{ flex: '1 1 200px', background: '#eef2ff', border: '2px solid #c7d2fe', borderRadius: 14, padding: '10px 16px' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Goal</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#3730a3' }}>Avg trip &lt; {LIVE_GOALS.avgTrip}s</div>
                <div style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>{ytIdleRiders}/{TOTAL_RIDERS} riders ready</div>
              </div>
              {/* Current avg box */}
              <div style={{ flex: '1 1 140px', background: avgTripStatus === 'safe' ? '#f0fdf4' : avgTripStatus === 'warn' ? '#fffbeb' : avgTripStatus === 'bad' ? '#fef2f2' : '#f8f5f1', border: `2px solid ${avgTripStatus === 'safe' ? '#86efac' : avgTripStatus === 'warn' ? '#fbbf24' : avgTripStatus === 'bad' ? '#fca5a5' : '#e2d9ce'}`, borderRadius: 14, padding: '10px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#a8998c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Current Avg Trip</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: avgTripStatus === 'safe' ? '#16a34a' : avgTripStatus === 'warn' ? '#d97706' : avgTripStatus === 'bad' ? '#dc2626' : '#6b5f55' }}>{ytAvgWait > 0 ? `${ytAvgWait}s` : '--'}</div>
              </div>
            </div>
            {/* Time remaining bar */}
            <div style={{ width: '100%', maxWidth: 860, marginTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#6b5f55', marginBottom: 3 }}>
                <span>Time Remaining</span>
                <span style={{ color: barColor, fontVariantNumeric: 'tabular-nums' }}>{ytRoundDone ? '0s' : `${timerSecs}s`}</span>
              </div>
              <div style={{ height: 10, borderRadius: 6, background: '#e2d9ce', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 6, transition: 'width 0.1s linear, background 0.4s' }} />
              </div>
            </div>
          </>
        );
      })()}

      {/* Explore title */}
      {phase === 'explore' && (
        <div style={{ width: '100%', maxWidth: 860, marginBottom: 8, textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#3730a3', margin: 0 }}>
            Explore the Different Neighborhoods
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Click each area on the map to learn about the community before dispatching riders.
          </p>
        </div>
      )}

      {/* Goal: title + white card above map */}
      {phase === 'goal' && (
        <>
          <div style={{ width: '100%', maxWidth: 860, marginBottom: 8, textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#3730a3', margin: 0 }}>
              🎯 Company Goal: Fast Deliveries
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
              Keep average trip time under <strong>{LIVE_GOALS.avgTrip}s</strong> — faster rides mean more completed orders and more earnings.
            </p>
          </div>
          <PhaseGoal onAct={setAction} />
        </>
      )}

      {/* Bias card above map */}
      {phase === 'bias' && (
        <PhaseBias
          onAct={setAction}
          biasSubPhase={biasSubPhase}
          setBiasSubPhase={setBiasSubPhase}
          biasSimTimer={biasSimTimer}
          biasSimDemand={biasSimDemand}
          biasSimDelivered={biasSimDelivered}
          algoResults={algoResults}
        />
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
          showDemand={showDemand}
          surgeActive={surgeActive}
          staticDemand={liveStaticDemand}
          displayAssignments={displayAssignments}
          highlightHoodId={highlightHoodId}
          buildingAlgo={phase === 'automate' && algoStep < TOTAL_RIDERS}
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
      {phase === 'yourTurn' && (
        <PhaseYourTurn
          onAct={setAction}
          onRetry={resetYourTurn}
          ytAvgWait={ytAvgWait}
          ytRoundDone={ytRoundDone}
          ytDemand={ytDemand}
          speedAlert={speedAlert}
        />
      )}
      {phase === 'automate' && (
        <PhaseAutomate
          onAct={setAction}
          algoStep={algoStep}
          autoSimTimer={autoSimTimer}
          autoSimDemand={autoSimDemand}
          autoSimDelivered={autoSimDelivered}
        />
      )}
      {phase === 'reflect' && (
        <PhaseReflect
          onAct={setAction}
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
