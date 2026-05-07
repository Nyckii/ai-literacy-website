/**
 * AlgorithmBias.tsx — "Fair or Fast?" Mini-Game
 *
 * Core lesson:
 *   Algorithmic bias isn't always caused by bad data or stereotypes.
 *   Sometimes it happens because the algorithm optimizes a goal that
 *   ignores unequal impact on different groups.
 *
 * Game flow:
 *   Intro → Predict → Round 1 (run + results) → Investigate
 *        → Round 2 event → Round 2 (run + results) → Reflection
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AlgorithmBias.css';

// ============================================================
// TYPES
// ============================================================

type GamePhase =
  | 'intro'
  | 'predict'
  | 'round1-ready'
  | 'round1-animating'
  | 'round1-results'
  | 'investigate'
  | 'round2-event'
  | 'round2-ready'
  | 'round2-animating'
  | 'round2-results'
  | 'reflection';

type NeighborhoodId = 'downtown' | 'midtown' | 'north-suburb' | 'east-hills';
type BiasLevel = 'medium' | 'high';

interface NeighborhoodConfig {
  id: NeighborhoodId;
  label: string;
  icon: string;
  color: string;
  tag: string;
  investigation: {
    title: string;
    algorithm: string;
    impact: string;
  };
}

interface RoundConfig {
  number: 1 | 2;
  avgTime: number;
  biasLevel: BiasLevel;
  coverage: Record<NeighborhoodId, number>;
  driverCount: Record<NeighborhoodId, number>;
}

interface DriverDot {
  id: number;
  neighborhood: NeighborhoodId;
  color: string;
  depotX: number;
  depotY: number;
  targetX: number;
  targetY: number;
  /** Trip duration in ms — longer for far neighborhoods */
  durationMs: number;
  /** CSS transition delay in ms — creates the staggered dispatch effect */
  delayMs: number;
  deployed: boolean;
}

// ============================================================
// NEIGHBORHOOD CONFIG
// ============================================================

const NEIGHBORHOODS: NeighborhoodConfig[] = [
  {
    id: 'downtown',
    label: 'Downtown',
    icon: '🏙️',
    color: '#6366f1',
    tag: 'Dense · Many restaurants · Short trips',
    investigation: {
      title: 'Why Downtown gets the most drivers',
      algorithm:
        'Drivers here complete 3–4 orders per hour. Each trip is short and many restaurants are packed close together. The algorithm sees this area as highly efficient and sends more drivers continuously.',
      impact:
        'Customers rarely wait more than 15 minutes. Fast, reliable service — and it only gets better each round.',
    },
  },
  {
    id: 'midtown',
    label: 'Midtown',
    icon: '🏢',
    color: '#0ea5e9',
    tag: 'Medium density · Mixed restaurants',
    investigation: {
      title: 'Midtown: acceptable but inconsistent',
      algorithm:
        'Trips are longer than Downtown but shorter than the suburbs. The algorithm sends a few drivers here as a secondary option when Downtown nears saturation.',
      impact:
        'Service is uneven. Some orders are fulfilled in 20 minutes; others wait over 35 minutes during peak hours.',
    },
  },
  {
    id: 'north-suburb',
    label: 'North Suburb',
    icon: '🏘️',
    color: '#f59e0b',
    tag: 'Spread out · Fewer restaurants · Longer trips',
    investigation: {
      title: 'North Suburb: underserved by design',
      algorithm:
        'Homes are far apart, so each delivery takes much longer. The algorithm rarely sends drivers here — one suburban run takes as long as two Downtown deliveries in time.',
      impact:
        'Orders frequently go unfulfilled. When drivers do arrive, wait times often exceed 45 minutes.',
    },
  },
  {
    id: 'east-hills',
    label: 'East Hills',
    icon: '🏔️',
    color: '#ef4444',
    tag: 'Far from restaurants · Longest trips',
    investigation: {
      title: 'East Hills: systematically neglected',
      algorithm:
        'The algorithm sent fewer drivers here because trips are longer — even though customers still need service. One East Hills delivery takes as long as 3–4 Downtown ones, so the algorithm avoids it.',
      impact:
        'Customers frequently see "no drivers available." Food access is severely limited for hours at a time — not by chance, but by the objective the algorithm was given.',
    },
  },
];

const HOOD_MAP = Object.fromEntries(
  NEIGHBORHOODS.map((n) => [n.id, n])
) as Record<NeighborhoodId, NeighborhoodConfig>;

const HOOD_ORDER: NeighborhoodId[] = [
  'downtown',
  'midtown',
  'north-suburb',
  'east-hills',
];

// ============================================================
// ROUND CONFIG
// ============================================================

const ROUNDS: Record<1 | 2, RoundConfig> = {
  1: {
    number: 1,
    avgTime: 18,
    biasLevel: 'medium',
    coverage: {
      downtown: 92,
      midtown: 65,
      'north-suburb': 38,
      'east-hills': 24,
    },
    driverCount: {
      downtown: 7,
      midtown: 3,
      'north-suburb': 1,
      'east-hills': 1,
    },
  },
  2: {
    number: 2,
    avgTime: 17,
    biasLevel: 'high',
    coverage: {
      downtown: 95,
      midtown: 68,
      'north-suburb': 35,
      'east-hills': 18,
    },
    driverCount: {
      downtown: 9,
      midtown: 2,
      'north-suburb': 1,
      'east-hills': 0,
    },
  },
};

const BIAS_CONFIG: Record<
  BiasLevel,
  { icon: string; label: string; description: string }
> = {
  medium: {
    icon: '⚠️',
    label: 'Bias Warning: Medium',
    description:
      'The platform-wide average looks good, but coverage gaps between neighborhoods are already significant. Some residents have much worse access.',
  },
  high: {
    icon: '🚨',
    label: 'Bias Warning: High',
    description:
      'The algorithm got 1 minute faster overall — but East Hills coverage dropped by 6 more points, to nearly nothing. Speed improved by making inequality worse.',
  },
};

// ============================================================
// SVG MAP CONFIG
// ============================================================

/** SVG canvas size */
const MAP_W = 560;
const MAP_H = 380;

/** Depot (driver home base) — on the main road junction */
const DEPOT = { x: 303, y: 194 };

/**
 * Neighborhood zone geometry on the SVG canvas.
 * cx/cy = visual center point for driver clustering.
 */
const ZONES: Record<
  NeighborhoodId,
  { x: number; y: number; w: number; h: number; cx: number; cy: number }
> = {
  downtown:         { x: 18,  y: 198, w: 188, h: 162, cx: 112, cy: 279 },
  midtown:          { x: 220, y: 198, w: 162, h: 162, cx: 301, cy: 279 },
  'north-suburb':   { x: 18,  y: 18,  w: 298, h: 162, cx: 167, cy: 99  },
  'east-hills':     { x: 402, y: 18,  w: 142, h: 342, cx: 473, cy: 189 },
};

/** How long (ms) a driver takes to reach each neighborhood */
const TRIP_DURATION: Record<NeighborhoodId, number> = {
  downtown:       950,
  midtown:        1250,
  'north-suburb': 1900,
  'east-hills':   2450,
};

// ============================================================
// DRIVER HELPERS
// ============================================================

/**
 * Spread N drivers in a circular ring around the zone center
 * so they are individually visible on the map.
 */
function spreadPositions(
  cx: number,
  cy: number,
  count: number,
  zoneW: number,
  zoneH: number
): Array<{ x: number; y: number }> {
  if (count === 0) return [];
  if (count === 1) return [{ x: cx, y: cy }];
  const rX = Math.min(zoneW * 0.26, 42);
  const rY = Math.min(zoneH * 0.26, 34);
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * rX,
      y: cy + Math.sin(angle) * rY,
    };
  });
}

/** Build the full driver dot array for a round, with staggered dispatch delays. */
function buildDrivers(round: RoundConfig): DriverDot[] {
  const dots: DriverDot[] = [];
  let globalDelay = 0;

  for (const hoodId of HOOD_ORDER) {
    const count = round.driverCount[hoodId];
    const positions = spreadPositions(
      ZONES[hoodId].cx,
      ZONES[hoodId].cy,
      count,
      ZONES[hoodId].w,
      ZONES[hoodId].h
    );
    for (let i = 0; i < count; i++) {
      const idx = dots.length;
      dots.push({
        id: idx,
        neighborhood: hoodId,
        color: HOOD_MAP[hoodId].color,
        // Scatter slightly at depot so they don't all animate from the same pixel
        depotX: DEPOT.x + Math.sin(idx * 1.9) * 9,
        depotY: DEPOT.y + Math.cos(idx * 2.5) * 7,
        targetX: positions[i].x,
        targetY: positions[i].y,
        durationMs: TRIP_DURATION[hoodId],
        delayMs: globalDelay,
        deployed: false,
      });
      globalDelay += 180;
    }
  }
  return dots;
}

// ============================================================
// PROGRESS HELPERS
// ============================================================

const PHASE_SEQUENCE: GamePhase[] = [
  'intro',
  'predict',
  'round1-ready',
  'round1-animating',
  'round1-results',
  'investigate',
  'round2-event',
  'round2-ready',
  'round2-animating',
  'round2-results',
  'reflection',
];
const STEP_COUNT = 5;
const STEP_LABELS = ['Intro', 'Round 1', 'Investigate', 'Round 2', 'Reflection'];

function phaseProgress(phase: GamePhase): number {
  const idx = PHASE_SEQUENCE.indexOf(phase);
  return Math.min(
    Math.floor((idx / (PHASE_SEQUENCE.length - 1)) * STEP_COUNT),
    STEP_COUNT
  );
}

// ============================================================
// CITY MAP COMPONENT
// ============================================================

interface CityMapProps {
  drivers: DriverDot[];
  roundData?: RoundConfig;
  showCoverage?: boolean;
  selectedHood?: NeighborhoodId | null;
  prediction?: NeighborhoodId | null;
  onZoneClick?: (id: NeighborhoodId) => void;
}

function CityMap({
  drivers,
  roundData,
  showCoverage = false,
  selectedHood = null,
  prediction = null,
  onZoneClick,
}: CityMapProps) {
  return (
    <div>
      <div className="fof-map-wrap">
        {/* ── Base SVG map ── */}
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="fof-map-svg"
          aria-label="City map showing four delivery neighborhoods"
        >
          {/* City night background */}
          <rect width={MAP_W} height={MAP_H} fill="#0f172a" />

          {/* Road network */}
          <rect x="0"   y="188" width={MAP_W} height="12" fill="#1e293b" />
          <rect x="392" y="0"   width="12"    height={MAP_H} fill="#1e293b" />
          <rect x="210" y="188" width="12"    height={MAP_H - 188} fill="#1e293b" />
          <rect x="18"  y="96"  width="296"   height="4"  fill="#172032" />

          {/* Road centre-line dashes */}
          <line x1="0" y1="194" x2="392" y2="194"
                stroke="#334155" strokeWidth="1.2" strokeDasharray="8 6" />
          <line x1="404" y1="0" x2="404" y2={MAP_H}
                stroke="#334155" strokeWidth="1.2" strokeDasharray="8 6" opacity="0.5" />

          {/* ── Neighborhood zones ── */}
          {HOOD_ORDER.map((hoodId) => {
            const zone   = ZONES[hoodId];
            const config = HOOD_MAP[hoodId];
            const highlight = selectedHood === hoodId || prediction === hoodId;
            const coverage  = roundData?.coverage[hoodId];
            const clickable = !!onZoneClick;

            return (
              <g
                key={hoodId}
                onClick={() => onZoneClick?.(hoodId)}
                style={{ cursor: clickable ? 'pointer' : 'default' }}
              >
                {/* Zone fill */}
                <rect
                  x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                  fill={config.color}
                  opacity={highlight ? 0.32 : 0.14}
                  rx="6"
                />
                {/* Zone border */}
                <rect
                  x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                  fill="none"
                  stroke={config.color}
                  strokeWidth={highlight ? 2.5 : 1.5}
                  rx="6"
                  opacity={highlight ? 1 : 0.55}
                />

                {/* Building silhouettes */}
                {hoodId === 'downtown' && (
                  <g fill={config.color} opacity="0.5">
                    {([
                      [30,242,14,56],[50,220,18,78],[74,232,13,66],
                      [93,214,21,84],[120,238,14,60],[140,224,17,74],
                      [163,244,13,54],[182,227,12,71],
                    ] as [number,number,number,number][]).map(([x,y,w,h],i) => (
                      <rect key={i} x={x} y={y} width={w} height={h} rx="2" />
                    ))}
                  </g>
                )}

                {hoodId === 'midtown' && (
                  <g fill={config.color} opacity="0.45">
                    {([
                      [228,248,15,50],[249,233,18,65],[273,244,14,54],
                      [293,236,17,62],[316,250,13,48],[335,239,16,59],[357,252,14,46],
                    ] as [number,number,number,number][]).map(([x,y,w,h],i) => (
                      <rect key={i} x={x} y={y} width={w} height={h} rx="2" />
                    ))}
                  </g>
                )}

                {hoodId === 'north-suburb' && (
                  <g fill={config.color} opacity="0.45">
                    {([
                      [34,116],[80,125],[136,110],[192,120],[248,108],[292,118],
                    ] as [number,number][]).map(([hx,hy],i) => (
                      <g key={i}>
                        <rect x={hx} y={hy} width="22" height="15" rx="2" />
                        <polygon points={`${hx},${hy} ${hx+11},${hy-10} ${hx+22},${hy}`} />
                      </g>
                    ))}
                  </g>
                )}

                {hoodId === 'east-hills' && (
                  <g fill={config.color}>
                    <polygon points="410,362 440,286 470,362" opacity="0.28" />
                    <polygon points="436,362 468,256 500,362" opacity="0.34" />
                    <polygon points="462,362 495,308 528,362" opacity="0.24" />
                    {([
                      [415,90],[450,76],[488,92],
                    ] as [number,number][]).map(([hx,hy],i) => (
                      <g key={i} opacity="0.48">
                        <rect x={hx} y={hy} width="18" height="13" rx="2" />
                        <polygon points={`${hx},${hy} ${hx+9},${hy-9} ${hx+18},${hy}`} />
                      </g>
                    ))}
                  </g>
                )}

                {/* Zone label */}
                <text
                  x={zone.cx} y={zone.y + 22}
                  textAnchor="middle"
                  fill="white" fontSize="12" fontWeight="700" opacity="0.92"
                >
                  {config.icon} {config.label}
                </text>

                {/* Coverage bar */}
                {showCoverage && coverage !== undefined && (
                  <>
                    <rect
                      x={zone.x + 8} y={zone.y + zone.h - 21}
                      width={zone.w - 16} height="10"
                      fill="rgba(0,0,0,0.5)" rx="5"
                    />
                    <rect
                      x={zone.x + 8} y={zone.y + zone.h - 21}
                      width={Math.max(0, (zone.w - 16) * (coverage / 100))} height="10"
                      fill={config.color} rx="5"
                    />
                    <text
                      x={zone.cx} y={zone.y + zone.h - 25}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.8)" fontSize="10" fontWeight="600"
                    >
                      {coverage}%
                    </text>
                  </>
                )}

                {/* Prediction pointer */}
                {prediction === hoodId && (
                  <text
                    x={zone.cx} y={zone.cy + 8}
                    textAnchor="middle" dominantBaseline="middle" fontSize="26"
                  >
                    👆
                  </text>
                )}

                {/* Selected dashed ring */}
                {selectedHood === hoodId && (
                  <rect
                    x={zone.x - 3} y={zone.y - 3}
                    width={zone.w + 6} height={zone.h + 6}
                    fill="none"
                    stroke="white" strokeWidth="2" strokeDasharray="7 4"
                    rx="9" opacity="0.55"
                  />
                )}
              </g>
            );
          })}

          {/* Depot marker */}
          <circle cx={DEPOT.x} cy={DEPOT.y} r="16"
                  fill="#0f172a" stroke="#475569" strokeWidth="2" />
          <text x={DEPOT.x} y={DEPOT.y + 1}
                textAnchor="middle" dominantBaseline="middle" fontSize="16">
            🏭
          </text>
          <text x={DEPOT.x} y={DEPOT.y + 28}
                textAnchor="middle" fill="#64748b" fontSize="8.5" fontWeight="600"
                letterSpacing="0.05em">
            DEPOT
          </text>
        </svg>

        {/* ── HTML driver overlay (enables smooth CSS position transitions) ── */}
        <div className="fof-map-overlay">
          {drivers.map((driver) => {
            const x = driver.deployed ? driver.targetX : driver.depotX;
            const y = driver.deployed ? driver.targetY : driver.depotY;
            return (
              <div
                key={driver.id}
                className="fof-driver"
                aria-hidden="true"
                style={{
                  left: `${(x / MAP_W) * 100}%`,
                  top:  `${(y / MAP_H) * 100}%`,
                  backgroundColor: driver.color,
                  transition: driver.deployed
                    ? [
                        `left ${driver.durationMs}ms cubic-bezier(0.4,0,0.2,1) ${driver.delayMs}ms`,
                        `top  ${driver.durationMs}ms cubic-bezier(0.4,0,0.2,1) ${driver.delayMs}ms`,
                      ].join(', ')
                    : 'none',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Map legend */}
      <div className="fof-map-legend">
        {NEIGHBORHOODS.map((n) => (
          <span key={n.id}>
            <span className="fof-legend-dot" style={{ backgroundColor: n.color }} />
            {n.label}
          </span>
        ))}
        <span>🏭 Depot</span>
      </div>
    </div>
  );
}

// ============================================================
// BIAS WARNING
// ============================================================

function BiasWarning({ level }: { level: BiasLevel }) {
  const cfg = BIAS_CONFIG[level];
  return (
    <div className={`fof-bias-warning ${level}`}>
      <span className="fof-bias-icon">{cfg.icon}</span>
      <div>
        <div className="fof-bias-label">{cfg.label}</div>
        <div className="fof-bias-desc">{cfg.description}</div>
      </div>
    </div>
  );
}

// ============================================================
// COVERAGE BARS
// ============================================================

function CoverageBars({ coverage }: { coverage: Record<NeighborhoodId, number> }) {
  return (
    <div className="fof-coverage-list">
      {HOOD_ORDER.map((hoodId) => {
        const config = HOOD_MAP[hoodId];
        const pct    = coverage[hoodId];
        return (
          <div key={hoodId} className="fof-coverage-row">
            <div className="fof-coverage-header">
              <span className="fof-coverage-name">{config.icon} {config.label}</span>
              <span className="fof-coverage-pct" style={{ color: config.color }}>{pct}%</span>
            </div>
            <div className="fof-coverage-track">
              <div
                className="fof-coverage-fill"
                style={{ width: `${pct}%`, backgroundColor: config.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// NEIGHBORHOOD EXPLANATION
// ============================================================

function NeighborhoodExplanation({ hoodId }: { hoodId: NeighborhoodId }) {
  const config = HOOD_MAP[hoodId];
  const inv    = config.investigation;
  return (
    <div className="fof-explain-card" style={{ borderLeftColor: config.color }}>
      <div className="fof-explain-title">{config.icon} {inv.title}</div>
      <div className="fof-explain-section">
        <div className="fof-explain-section-label">🤖 Why the algorithm does this</div>
        <p className="fof-explain-text">{inv.algorithm}</p>
      </div>
      <div className="fof-explain-section">
        <div className="fof-explain-section-label">👥 Impact on residents</div>
        <p className="fof-explain-text">{inv.impact}</p>
      </div>
    </div>
  );
}

// ============================================================
// PROGRESS BAR
// ============================================================

function ProgressBar({ phase }: { phase: GamePhase }) {
  const progress = phaseProgress(phase);
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        className="fof-progress"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemax={STEP_COUNT}
        aria-label={`Game progress: step ${progress} of ${STEP_COUNT}`}
      >
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <div
            key={i}
            className={`fof-step ${i < progress ? 'done' : i === progress ? 'active' : ''}`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -6 }}>
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            style={{
              fontSize: 10,
              fontWeight: i <= progress ? 700 : 500,
              color: i <= progress ? 'var(--accent-strong)' : 'var(--text-muted)',
              opacity: i <= progress ? 1 : 0.55,
              letterSpacing: '0.02em',
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN GAME COMPONENT
// ============================================================

export function AlgorithmBias() {
  const [phase, setPhase]           = useState<GamePhase>('intro');
  const [prediction, setPrediction] = useState<NeighborhoodId | null>(null);
  const [selectedHood, setSelectedHood] = useState<NeighborhoodId | null>(null);
  const [drivers, setDrivers]       = useState<DriverDot[]>([]);

  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  /**
   * runAnimation — the core mechanic:
   *   1. Build driver list (all at depot, deployed=false)
   *   2. After one paint, flip deployed=true for all
   *      → CSS transition-delay staggers each driver's departure
   *   3. After all animations complete, advance to results phase
   */
  const runAnimation = useCallback(
    (roundNum: 1 | 2) => {
      clearTimers();
      const round      = ROUNDS[roundNum];
      const newDrivers = buildDrivers(round);

      setDrivers(newDrivers.map((d) => ({ ...d, deployed: false })));
      setPhase(roundNum === 1 ? 'round1-animating' : 'round2-animating');

      // One-frame grace period, then deploy all (stagger is CSS)
      const t1 = setTimeout(() => {
        setDrivers((prev) => prev.map((d) => ({ ...d, deployed: true })));
      }, 80);
      timerRefs.current.push(t1);

      // Advance to results after the last transition finishes
      const maxMs =
        Math.max(...newDrivers.map((d) => d.delayMs + d.durationMs)) + 900;
      const t2 = setTimeout(() => {
        setPhase(roundNum === 1 ? 'round1-results' : 'round2-results');
      }, maxMs);
      timerRefs.current.push(t2);
    },
    [clearTimers]
  );

  const resetGame = useCallback(() => {
    clearTimers();
    setPhase('intro');
    setDrivers([]);
    setPrediction(null);
    setSelectedHood(null);
  }, [clearTimers]);

  // ── Derived map props ──────────────────────────────────────

  const showCoverage = [
    'round1-results', 'investigate',
    'round2-results', 'reflection',
  ].includes(phase);

  const mapRoundData: RoundConfig | undefined =
    ['round1-results', 'investigate', 'round2-event', 'round2-ready'].includes(phase)
      ? ROUNDS[1]
      : ['round2-results', 'reflection'].includes(phase)
      ? ROUNDS[2]
      : undefined;

  const mapClickable = ['predict', 'investigate'].includes(phase);

  const handleZoneClick = useCallback(
    (id: NeighborhoodId) => {
      if (phase === 'predict')    setPrediction(id);
      if (phase === 'investigate') setSelectedHood(id);
    },
    [phase]
  );

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="fof-game">

      {/* ── Header ── */}
      <Link to="/" className="fof-back-link">← Back to Home</Link>
      <h1 className="fof-title">🚚 Fair or Fast?</h1>
      <p className="fof-subtitle">
        Algorithm Bias · Can a neutral goal produce unfair outcomes?
      </p>
      {phase !== 'intro' && <ProgressBar phase={phase} />}

      {/* ══════════════════════════════════════════════════════
          INTRO — full-width, no map needed
         ══════════════════════════════════════════════════════ */}
      {phase === 'intro' && (
        <div className="fof-intro-wrap">

          <div className="fof-card">
            <div className="fof-card-label">🌆 The Scenario</div>
            <h2 className="fof-card-title">You run a food-delivery platform</h2>
            <p className="fof-card-body">
              Your city has four neighborhoods. Your team built an algorithm
              with a single, straightforward goal:
            </p>
            <div className="fof-goal-chip">⚡ Minimize average delivery time</div>
            <p className="fof-card-body" style={{ marginTop: 12 }}>
              The algorithm uses <strong>no demographic data</strong>. It
              doesn't know who lives where. It only measures how many orders
              a driver can complete per hour.
            </p>
          </div>

          <div className="fof-card">
            <div className="fof-card-label">🗺️ Your City's Four Neighborhoods</div>
            <div className="fof-intro-hoods">
              {NEIGHBORHOODS.map((n) => (
                <div
                  key={n.id}
                  className="fof-hood-chip"
                  style={{ borderColor: n.color, color: n.color }}
                >
                  <span className="chip-icon">{n.icon}</span>
                  <span className="chip-name">{n.label}</span>
                  <span className="chip-tag" style={{ color: 'var(--text-muted)' }}>
                    {n.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button className="fof-btn-primary" onClick={() => setPhase('predict')}>
            Start Simulation →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ALL OTHER PHASES — two-column layout
         ══════════════════════════════════════════════════════ */}
      {phase !== 'intro' && (
        <div className="fof-layout">

          {/* ── LEFT: sticky city map ── */}
          <div className="fof-map-col">
            <CityMap
              drivers={drivers}
              roundData={mapRoundData}
              showCoverage={showCoverage}
              selectedHood={selectedHood}
              prediction={phase === 'predict' ? prediction : null}
              onZoneClick={mapClickable ? handleZoneClick : undefined}
            />
          </div>

          {/* ── RIGHT: phase-specific control panel ── */}
          <div className="fof-panel-col">

            {/* ─── PREDICT ─────────────────────────────────── */}
            {phase === 'predict' && (
              <>
                <div className="fof-card">
                  <div className="fof-card-label">Round 1 · Your Prediction</div>
                  <h2 className="fof-card-title">Where will most drivers go?</h2>
                  <p className="fof-card-body">
                    Before running the algorithm, predict which neighborhood
                    will receive the most drivers. Click a zone on the map —
                    or use the buttons below.
                  </p>
                  <div className="fof-predict-grid">
                    {NEIGHBORHOODS.map((n) => (
                      <button
                        key={n.id}
                        className={`fof-predict-btn ${prediction === n.id ? 'selected' : ''}`}
                        style={
                          prediction === n.id
                            ? { borderColor: n.color, backgroundColor: `${n.color}1a` }
                            : {}
                        }
                        onClick={() => setPrediction(n.id)}
                      >
                        <span className="pbn">{n.icon} {n.label}</span>
                        <span className="pbt">{n.tag}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="fof-btn-primary"
                  disabled={!prediction}
                  onClick={() => setPhase('round1-ready')}
                >
                  Lock In Prediction →
                </button>
              </>
            )}

            {/* ─── ROUND 1 READY ───────────────────────────── */}
            {phase === 'round1-ready' && (
              <>
                <div className="fof-card">
                  <div className="fof-card-label">Round 1 · Dispatch</div>
                  <h2 className="fof-card-title">Ready to run the algorithm</h2>
                  {prediction && (
                    <div className="fof-predict-result">
                      <span className="fof-predict-result-icon">🎯</span>
                      <span>
                        Your prediction:{' '}
                        <strong>
                          {HOOD_MAP[prediction].icon} {HOOD_MAP[prediction].label}
                        </strong>
                      </span>
                    </div>
                  )}
                  <p className="fof-card-body">
                    12 drivers are waiting at the depot. The algorithm will
                    assign each one to maximise platform-wide efficiency.
                    Watch where they go.
                  </p>
                  <div className="fof-goal-chip">⚡ Goal: minimize average delivery time</div>
                </div>
                <button className="fof-btn-primary" onClick={() => runAnimation(1)}>
                  🚀 Run Algorithm
                </button>
              </>
            )}

            {/* ─── ROUND 1 ANIMATING ───────────────────────── */}
            {phase === 'round1-animating' && (
              <div className="fof-card">
                <div className="fof-running-inner">
                  <div className="fof-spinner" />
                  <div className="fof-running-label">Dispatching drivers…</div>
                  <div className="fof-running-sub">
                    Optimizing for minimum average time
                  </div>
                  <div className="fof-dispatch-chips">
                    {NEIGHBORHOODS.map((n) => (
                      <span
                        key={n.id}
                        className="fof-dispatch-chip"
                        style={{
                          borderColor: n.color,
                          color: n.color,
                          backgroundColor: `${n.color}18`,
                        }}
                      >
                        <strong>{ROUNDS[1].driverCount[n.id]}</strong> {n.icon}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── ROUND 1 RESULTS ─────────────────────────── */}
            {phase === 'round1-results' && (
              <>
                <div className="fof-card">
                  <div className="fof-card-label">Round 1 · Results</div>
                  {prediction && (
                    <div className="fof-predict-result">
                      <span className="fof-predict-result-icon">
                        {prediction === 'downtown' ? '✅' : '🤔'}
                      </span>
                      <span style={{ fontSize: 13 }}>
                        You predicted{' '}
                        <strong>
                          {HOOD_MAP[prediction].icon} {HOOD_MAP[prediction].label}
                        </strong>
                        {prediction === 'downtown'
                          ? ' — correct! Downtown got the most drivers.'
                          : ' — the algorithm actually sent the most to Downtown.'}
                      </span>
                    </div>
                  )}
                  <div className="fof-metrics-row">
                    <div className="fof-metric-block">
                      <span className="fof-metric-value">18</span>
                      <span className="fof-metric-unit">min avg</span>
                      <span className="fof-metric-label">✓ Platform looks efficient citywide</span>
                    </div>
                  </div>
                  <div className="fof-card-label" style={{ marginTop: 6 }}>
                    Coverage by Neighborhood
                  </div>
                  <CoverageBars coverage={ROUNDS[1].coverage} />
                </div>

                <BiasWarning level="medium" />

                <button
                  className="fof-btn-primary"
                  onClick={() => {
                    setSelectedHood('east-hills');
                    setPhase('investigate');
                  }}
                >
                  🔍 Investigate Why →
                </button>
              </>
            )}

            {/* ─── INVESTIGATE ─────────────────────────────── */}
            {phase === 'investigate' && (
              <>
                <div className="fof-card">
                  <div className="fof-card-label">Investigate · Click Any Neighborhood</div>
                  <h2 className="fof-card-title">Why did this happen?</h2>
                  <p className="fof-card-body">
                    The algorithm used no demographic data. So why does East
                    Hills get almost no service? Click any neighborhood — on
                    the map or below — to find out.
                  </p>
                  <div className="fof-hood-pills">
                    {NEIGHBORHOODS.map((n) => (
                      <button
                        key={n.id}
                        className={`fof-hood-pill ${selectedHood === n.id ? 'selected' : ''}`}
                        style={{
                          borderColor: n.color,
                          color: selectedHood === n.id ? 'white' : n.color,
                          backgroundColor:
                            selectedHood === n.id ? n.color : 'transparent',
                        }}
                        onClick={() => setSelectedHood(n.id)}
                      >
                        {n.icon} {n.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedHood && (
                  <NeighborhoodExplanation hoodId={selectedHood} />
                )}

                <button
                  className="fof-btn-primary"
                  style={{ marginTop: 14 }}
                  onClick={() => {
                    setDrivers([]);
                    setPhase('round2-event');
                  }}
                >
                  Continue to Round 2 →
                </button>
              </>
            )}

            {/* ─── ROUND 2 EVENT ───────────────────────────── */}
            {phase === 'round2-event' && (
              <>
                <div className="fof-event-card">
                  <div className="fof-event-badge">⚡ Live Demand Spike</div>
                  <h2 className="fof-event-title">
                    High demand in East Hills today
                  </h2>
                  <p className="fof-event-body">
                    East Hills residents are placing significantly more orders
                    than usual. The algorithm hasn't changed — same goal, same
                    logic. Let's run it again and see if it responds to need.
                  </p>
                </div>
                <div className="fof-card">
                  <div className="fof-card-label">Think about it</div>
                  <p className="fof-card-body">
                    With higher demand in East Hills, will the algorithm send
                    more drivers there — or keep prioritising Downtown because
                    it's more efficient?
                  </p>
                </div>
                <button
                  className="fof-btn-primary"
                  onClick={() => setPhase('round2-ready')}
                >
                  Run the Same Algorithm Again →
                </button>
              </>
            )}

            {/* ─── ROUND 2 READY ───────────────────────────── */}
            {phase === 'round2-ready' && (
              <>
                <div className="fof-card">
                  <div className="fof-card-label">Round 2 · Dispatch</div>
                  <h2 className="fof-card-title">Algorithm is unchanged</h2>
                  <p className="fof-card-body">
                    Same code. Same goal. No updates, no retraining. The
                    algorithm will still optimise for minimum average delivery
                    time. 12 drivers are ready at the depot.
                  </p>
                  <div className="fof-goal-chip">
                    ⚡ Still optimising: minimize average delivery time
                  </div>
                </div>
                <button className="fof-btn-primary" onClick={() => runAnimation(2)}>
                  🚀 Run Algorithm Again
                </button>
              </>
            )}

            {/* ─── ROUND 2 ANIMATING ───────────────────────── */}
            {phase === 'round2-animating' && (
              <div className="fof-card">
                <div className="fof-running-inner">
                  <div className="fof-spinner" />
                  <div className="fof-running-label">Dispatching drivers…</div>
                  <div className="fof-running-sub">
                    East Hills demand is high — but the algorithm sees efficiency,
                    not demand.
                  </div>
                  <div className="fof-dispatch-chips">
                    {NEIGHBORHOODS.map((n) => (
                      <span
                        key={n.id}
                        className="fof-dispatch-chip"
                        style={{
                          borderColor: n.color,
                          color: n.color,
                          backgroundColor: `${n.color}18`,
                        }}
                      >
                        <strong>{ROUNDS[2].driverCount[n.id]}</strong> {n.icon}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── ROUND 2 RESULTS ─────────────────────────── */}
            {phase === 'round2-results' && (
              <>
                <div className="fof-card">
                  <div className="fof-card-label">Round 2 · Results</div>
                  <div className="fof-metrics-row">
                    <div className="fof-metric-block">
                      <span className="fof-metric-value" style={{ color: '#22c55e' }}>17</span>
                      <span className="fof-metric-unit">min avg</span>
                      <span className="fof-metric-label">↓ 1 min faster — platform looks great</span>
                    </div>
                    <div className="fof-metric-block">
                      <span className="fof-metric-value" style={{ color: '#ef4444' }}>18%</span>
                      <span className="fof-metric-unit">E. Hills</span>
                      <span className="fof-metric-label">↓ dropped 6 more points</span>
                    </div>
                  </div>
                  <div className="fof-card-label" style={{ marginTop: 4 }}>
                    Coverage by Neighborhood
                  </div>
                  <CoverageBars coverage={ROUNDS[2].coverage} />
                </div>

                <BiasWarning level="high" />

                <div className="fof-card">
                  <div className="fof-card-label">💡 What just happened?</div>
                  <p className="fof-card-body">
                    The algorithm became <strong>faster overall</strong> and{' '}
                    <strong>more unfair</strong> simultaneously. Despite the
                    demand spike in East Hills, it sent{' '}
                    <strong
                      style={{
                        color: '#ef4444',
                        background: '#fef2f2',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      zero drivers
                    </strong>{' '}
                    there. It was doing exactly what it was designed to do.
                  </p>
                </div>

                <button
                  className="fof-btn-primary"
                  onClick={() => setPhase('reflection')}
                >
                  See the Full Picture →
                </button>
              </>
            )}

            {/* ─── REFLECTION ──────────────────────────────── */}
            {phase === 'reflection' && (
              <>
                <div className="fof-card">
                  <div className="fof-card-label">📊 Round 1 vs Round 2</div>
                  <div className="fof-comparison-grid">
                    <div className="fof-compare-col">
                      <h4>Round 1</h4>
                      {[
                        { label: 'East Hills', value: '24%', color: '#ef4444', note: 'coverage' },
                        { label: 'Downtown',   value: '92%', color: '#6366f1', note: 'coverage' },
                        { label: 'Avg time',   value: '18 min', color: 'var(--text)', note: '' },
                      ].map((s) => (
                        <div key={s.label} className="fof-compare-stat">
                          <div className="fof-big-num" style={{ color: s.color }}>{s.value}</div>
                          <div className="fof-big-label">{s.label} {s.note}</div>
                        </div>
                      ))}
                    </div>
                    <div className="fof-compare-col">
                      <h4>Round 2</h4>
                      {[
                        { label: 'East Hills ↓', value: '18%',    color: '#dc2626', note: 'coverage' },
                        { label: 'Downtown ↑',   value: '95%',    color: '#4f46e5', note: 'coverage' },
                        { label: 'Avg time ↓',   value: '17 min', color: '#22c55e', note: '' },
                      ].map((s) => (
                        <div key={s.label} className="fof-compare-stat">
                          <div className="fof-big-num" style={{ color: s.color }}>{s.value}</div>
                          <div className="fof-big-label">{s.label} {s.note}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="fof-reflection-callout">
                  <p>
                    <strong>The algorithm didn't make a random mistake.</strong>{' '}
                    It repeatedly gave worse service to the same neighborhoods —
                    not because of bad data or stereotypes, but because of{' '}
                    <em>what it was optimised for</em>. East Hills was never in
                    its blind spot by accident; it was in its blind spot
                    by design.
                  </p>
                </div>

                <div className="fof-lesson-box">
                  <h3>🎓 Core Lesson</h3>
                  <p>
                    Algorithmic bias doesn't require discriminatory intent.
                    When an algorithm optimises a goal — like <em>speed</em> —
                    without accounting for unequal impact, it can systematically
                    disadvantage the same groups again and again. That pattern
                    of repeated, unequal outcome <strong>is</strong> algorithmic
                    bias.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <button className="fof-btn-secondary" onClick={resetGame}>
                    🔄 Play Again
                  </button>
                  <Link to="/" className="fof-btn-secondary" style={{ textDecoration: 'none' }}>
                    ← Back to Home
                  </Link>
                </div>
              </>
            )}

          </div>{/* end panel col */}
        </div>
      )}
    </div>
  );
}
