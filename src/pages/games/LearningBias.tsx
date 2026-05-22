import { useState, useEffect, useCallback, useRef } from 'react';
import type { ElementType } from 'react';
import {
  ArrowsClockwise,
  BookOpen,
  Brain,
  Briefcase,
  Camera,
  Cat,
  ChartBar,
  Check,
  CheckCircle,
  Confetti,
  Database,
  Dog,
  FirstAid,
  Globe,
  GraduationCap,
  Lightbulb,
  Lightning,
  LinkSimple,
  MagnifyingGlass,
  Package,
  Palette,
  PushPin,
  Question,
  Robot,
  Sparkle,
  Tag,
  Trophy,
  Warning,
  X,
  XCircle,
} from '@phosphor-icons/react';
import { markGameCompleted } from '../../lib/gameProgress';

// ============================================================
// IMAGE IMPORTS
// ============================================================
import wc1Img from './assets/LearningBiasImg/white_cat_1.jpg';
import wc2Img from './assets/LearningBiasImg/white_cat_2.jpg';
import wc3Img from './assets/LearningBiasImg/white_cat_3.jpg';
import wc4Img from './assets/LearningBiasImg/white_cat_4.jpg';
import wc5Img from './assets/LearningBiasImg/white_cat_5.jpg';
import wc6Img from './assets/LearningBiasImg/white_cat_6.jpg';
import bd1Img from './assets/LearningBiasImg/black_dog_1.jpg';
import bd2Img from './assets/LearningBiasImg/black_dog_2.jpg';
import bd3Img from './assets/LearningBiasImg/black_dog_3.jpg';
import bd4Img from './assets/LearningBiasImg/black_dog_4.jpg';
import bd5Img from './assets/LearningBiasImg/black_dog_5.jpg';
import bd6Img from './assets/LearningBiasImg/black_dog_6.jpg';
import wd1Img from './assets/LearningBiasImg/white_dog_1.jpg';
import bc1Img from './assets/LearningBiasImg/black_cat_1.jpg';

// ============================================================
// ARCADE PALETTE, mirrors the site tokens in src/index.css
// ============================================================
const INK = '#0b1733';
const MUTED = '#5c6275';
const SURFACE = '#ffffff';
const CAT = '#6d4df0'; // category accent, "Cat"
const CAT_SOFT = '#ece8ff';
const NOTCAT = '#e8820a'; // category accent, "Not Cat"
const NOTCAT_SOFT = '#fff3e0';
const OK = '#0fa968';
const OK_SOFT = '#d8f5e6';
const BAD = '#ff3b46'; // arcade coral, doubles as the error colour
const BAD_SOFT = '#ffe1e3';

// ============================================================
// TYPES
// ============================================================
type GamePhase =
  | 'intro'
  | 'labeling'
  | 'training'
  | 'test'
  | 'challenge'
  | 'explanation'
  | 'complete';

type ZoneId = 'unsorted' | 'cat' | 'not-cat';
type Prediction = 'cat' | 'not-cat';

// Callback that each phase uses to tell the parent what the action button should look like.
// fn: if provided, clicking the button calls fn() instead of advancing to the next phase.
type ActionSetter = (label: string, enabled: boolean, fn?: () => void) => void;

interface ImageCard {
  id: string;
  src: string;
  type: 'cat' | 'dog';
  color: 'white' | 'black';
  correctLabel: Prediction;
}

interface TestImageCard extends ImageCard {
  trueLabel: Prediction;
  aiPrediction: Prediction;
}

// ============================================================
// GAME DATA
// ============================================================

const TRAINING_IMAGES: ImageCard[] = [
  { id: 'wc1', src: wc1Img, type: 'cat', color: 'white', correctLabel: 'cat' },
  { id: 'bd1', src: bd1Img, type: 'dog', color: 'black', correctLabel: 'not-cat' },
  { id: 'wc2', src: wc2Img, type: 'cat', color: 'white', correctLabel: 'cat' },
  { id: 'bd2', src: bd2Img, type: 'dog', color: 'black', correctLabel: 'not-cat' },
  { id: 'wc3', src: wc3Img, type: 'cat', color: 'white', correctLabel: 'cat' },
  { id: 'bd3', src: bd3Img, type: 'dog', color: 'black', correctLabel: 'not-cat' },
  { id: 'wc4', src: wc4Img, type: 'cat', color: 'white', correctLabel: 'cat' },
  { id: 'bd4', src: bd4Img, type: 'dog', color: 'black', correctLabel: 'not-cat' },
  { id: 'wc5', src: wc5Img, type: 'cat', color: 'white', correctLabel: 'cat' },
  { id: 'bd5', src: bd5Img, type: 'dog', color: 'black', correctLabel: 'not-cat' },
];

const TEST_IMAGES: TestImageCard[] = [
  { id: 'test-wc', src: wc6Img, type: 'cat', color: 'white', correctLabel: 'cat', trueLabel: 'cat', aiPrediction: 'cat' },
  { id: 'test-bd', src: bd6Img, type: 'dog', color: 'black', correctLabel: 'not-cat', trueLabel: 'not-cat', aiPrediction: 'not-cat' },
];

const CHALLENGE_IMAGES: TestImageCard[] = [
  {
    id: 'chal-wd', src: wd1Img, type: 'dog', color: 'white',
    correctLabel: 'not-cat', trueLabel: 'not-cat', aiPrediction: 'cat',
  },
  {
    id: 'chal-bc', src: bc1Img, type: 'cat', color: 'black',
    correctLabel: 'cat', trueLabel: 'cat', aiPrediction: 'not-cat',
  },
];

// ============================================================
// NAVIGATION METADATA
// ============================================================
const PHASE_ORDER: GamePhase[] = [
  'intro', 'labeling', 'training', 'test', 'challenge', 'explanation', 'complete',
];

const LB_STEPS = ['Sort Data', 'Train AI', 'Test AI', 'Challenge', 'Learn'];

// Maps step index → phase (for clicking completed steps in the stepper)
const STEP_TO_PHASE: GamePhase[] = ['labeling', 'training', 'test', 'challenge', 'explanation'];

// ============================================================
// SMALL HELPERS
// ============================================================
// A label badge with a leading icon, "Cat" / "Not Cat" used throughout.
function LabelText({ label }: { label: Prediction }) {
  return label === 'cat' ? (
    <>
      <Cat size={14} weight="fill" /> Cat
    </>
  ) : (
    <>
      <Dog size={14} weight="fill" /> Not Cat
    </>
  );
}

// ============================================================
// CSS, arcade flavour: chunky 2px ink borders, hard offset shadows
// ============================================================
const GLOBAL_STYLES = `
  .lb * { box-sizing: border-box; }
  .lb {
    font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --ink: ${INK};
  }

  @keyframes lbFadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lbFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes lbScaleIn {
    from { opacity: 0; transform: scale(0.72); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes lbBounceIn {
    0%   { opacity: 0; transform: scale(0.3); }
    55%  { transform: scale(1.08); }
    80%  { transform: scale(0.97); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes lbShake {
    0%,100% { transform: translateX(0); }
    20%,60% { transform: translateX(-9px); }
    40%,80% { transform: translateX(9px); }
  }
  @keyframes lbSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes lbPulse {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.35; }
  }
  @keyframes lbFloat {
    0%,100% { transform: translateY(0) rotate(-1.5deg); }
    50%     { transform: translateY(-11px) rotate(1.5deg); }
  }
  @keyframes lbSuccessGlow {
    0%,100% { box-shadow: 6px 6px 0 ${INK}; }
    50%     { box-shadow: 6px 6px 0 ${INK}, 0 0 38px rgba(15,169,104,0.5); }
  }
  @keyframes lbRevealBadge {
    0%   { opacity: 0; transform: translateY(-8px) scale(0.78); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes lbScan {
    0%   { left: -24%; opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { left: 124%; opacity: 0; }
  }
  @keyframes lbCountUp {
    0%   { opacity: 0; transform: scale(0.18) rotate(-12deg); }
    60%  { transform: scale(1.14) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes lbCardPulse {
    0%,100% { box-shadow: 6px 6px 0 ${INK}; }
    50%     { box-shadow: 6px 6px 0 ${CAT}; }
  }
  @keyframes lbWrongReveal {
    0%   { opacity: 0; transform: scale(0.4) rotate(-8deg); }
    60%  { transform: scale(1.12) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }

  .lb-fade-up      { animation: lbFadeUp 0.52s ease both; }
  .lb-fade-in      { animation: lbFadeIn 0.38s ease both; }
  .lb-scale-in     { animation: lbScaleIn 0.42s cubic-bezier(0.34,1.56,0.64,1) both; }
  .lb-bounce-in    { animation: lbBounceIn 0.55s cubic-bezier(0.36,0.07,0.19,0.97) both; }
  .lb-float        { animation: lbFloat 3.4s ease-in-out infinite; }
  .lb-success-glow { animation: lbSuccessGlow 2.5s ease-in-out infinite; }
  .lb-shake        { animation: lbShake 0.52s ease; }
  .lb-spin         { animation: lbSpin 0.85s linear infinite; }
  .lb-pulse        { animation: lbPulse 1.5s ease-in-out infinite; }
  .lb-card-pulse   { animation: lbCardPulse 0.8s ease-in-out infinite; }

  /* Arcade tile card, white, chunky ink border, hard offset shadow */
  .lb-card {
    background: ${SURFACE};
    border: 2px solid ${INK};
    border-radius: 18px;
    box-shadow: 6px 6px 0 ${INK};
    transition: transform 0.16s ease, box-shadow 0.16s ease;
  }
  .lb-card-hover:hover {
    transform: translate(-3px, -3px);
    box-shadow: 9px 9px 0 ${INK};
  }

  /* Buttons, pill, ink border, hard shadow that presses on click */
  .lb-btn {
    cursor: pointer; font-weight: 800;
    border-radius: 999px; letter-spacing: -0.01em;
    border: 2px solid ${INK};
    transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.15s ease;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    font-family: inherit; line-height: 1;
    box-shadow: 4px 4px 0 ${INK};
  }
  .lb-btn:hover:not(:disabled) { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 ${INK}; }
  .lb-btn:active:not(:disabled) { transform: translate(2px, 2px); box-shadow: 1px 1px 0 ${INK}; }
  .lb-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: 4px 4px 0 ${INK}; transform: none !important; }

  .lb-btn-xl  { font-size: 18px; padding: 17px 36px; }
  .lb-btn-lg  { font-size: 16px; padding: 14px 28px; }
  .lb-btn-md  { font-size: 14px; padding: 10px 20px; }
  .lb-btn-sm  { font-size: 13px; padding: 8px 14px; }

  .lb-btn-primary { background: ${BAD}; color: #fff; }
  .lb-btn-primary:hover:not(:disabled) { background: #ff525c; }
  .lb-btn-success { background: ${OK}; color: #fff; }
  .lb-btn-ghost   { background: ${SURFACE}; color: ${INK}; }
  .lb-btn-ghost:hover:not(:disabled) { background: #f4f4f5; }
  .lb-btn-outline { background: ${SURFACE}; color: ${INK}; }
  .lb-btn-outline:hover:not(:disabled) { background: ${CAT_SOFT}; }

  /* Guess buttons in challenge */
  .lb-guess-btn {
    flex: 1; padding: 10px 8px; border-radius: 12px;
    font-size: 13px; font-weight: 800;
    border: 2px solid ${INK};
    background: ${SURFACE}; color: ${INK};
    box-shadow: 2px 2px 0 ${INK};
    cursor: pointer; transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
    font-family: inherit;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  }
  .lb-guess-btn:hover:not(:disabled):not(.selected-cat):not(.selected-notcat) {
    transform: translate(-1px,-1px); box-shadow: 3px 3px 0 ${INK};
  }
  .lb-guess-btn.selected-cat {
    background: ${CAT}; color: #fff; border-color: ${INK};
  }
  .lb-guess-btn.selected-notcat {
    background: ${NOTCAT}; color: #fff; border-color: ${INK};
  }

  /* Badges */
  .lb-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px; border-radius: 999px;
    font-size: 13px; font-weight: 800; letter-spacing: -0.01em;
    border: 2px solid ${INK};
  }
  .lb-badge-cat    { background: ${CAT_SOFT}; color: ${CAT}; }
  .lb-badge-notcat { background: ${NOTCAT_SOFT}; color: #b45d04; }
  .lb-badge-correct {
    background: ${OK_SOFT}; color: ${OK};
    font-size: 14px; padding: 6px 14px;
    animation: lbRevealBadge 0.42s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  .lb-badge-wrong {
    background: ${BAD_SOFT}; color: ${BAD};
    font-size: 14px; padding: 6px 14px;
    animation: lbWrongReveal 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
  }

  .lb-insight {
    border: 2px solid ${INK};
    border-left-width: 6px;
    background: ${BAD_SOFT};
    border-radius: 14px;
    padding: 16px 20px;
  }

  .lb-scan-beam {
    position: absolute; top: 0;
    width: 22%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(109,77,240,0.55), transparent);
    animation: lbScan 1.35s ease-in-out infinite;
    pointer-events: none;
  }

  /* Step indicator */
  .lb-step-dot {
    width: 12px; height: 12px; border-radius: 50%;
    border: 2px solid ${INK};
    transition: all 0.35s ease; flex-shrink: 0;
  }
  .lb-step-line { flex: 1; height: 3px; transition: background 0.5s ease; min-width: 12px; }
  .lb-step-label {
    font-size: 11px; font-weight: 800; letter-spacing: 0.04em;
    text-transform: uppercase; margin-top: 6px; transition: color 0.35s;
  }
  .lb-step-past:hover .lb-step-label { text-decoration: underline; }
  .lb-step-past:hover .lb-step-dot { transform: scale(1.35); }

  /* Photo card, draggable */
  .lb-photo-card {
    border-radius: 12px; overflow: hidden;
    cursor: grab; user-select: none; -webkit-user-select: none;
    transition: opacity 0.15s, transform 0.15s, box-shadow 0.2s, outline 0.15s;
    border: 2px solid ${INK};
    box-shadow: 3px 3px 0 ${INK};
    position: relative; background: #E5E7EB;
    aspect-ratio: 1;
  }
  .lb-photo-card:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 ${INK}; }
  .lb-photo-card.dragging { opacity: 0.28; cursor: grabbing; transform: scale(0.95); }
  .lb-photo-card.selected {
    outline: 3px solid ${CAT}; outline-offset: 2px;
    transform: scale(1.05) translate(-1px,-1px);
    box-shadow: 5px 5px 0 ${INK};
    z-index: 2;
  }
  .lb-photo-card img {
    width: 100%; height: 100%;
    object-fit: cover; object-position: center;
    display: block; pointer-events: none;
  }

  /* Drop zones */
  .lb-drop-zone {
    flex: 1; border-radius: 18px;
    border: 2.5px dashed ${INK}; background: ${SURFACE};
    padding: 14px; transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    min-height: 180px;
  }
  .lb-drop-zone.drag-over-cat   { background: ${CAT_SOFT} !important; border-style: solid !important; box-shadow: 4px 4px 0 ${INK}; transform: scale(1.01); }
  .lb-drop-zone.drag-over-notcat { background: ${NOTCAT_SOFT} !important; border-style: solid !important; box-shadow: 4px 4px 0 ${INK}; transform: scale(1.01); }
  .lb-drop-zone.tap-active      { background: #f7f5ff; cursor: pointer; }
  .lb-drop-zone-header {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 10px; margin-bottom: 10px; border-bottom: 2px solid ${INK};
  }

  /* Unsorted pool: strict 5-col grid */
  .lb-unsorted-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }

  /* Test / challenge image card */
  .lb-test-card {
    border-radius: 18px; overflow: hidden;
    border: 2px solid ${INK}; background: ${SURFACE};
    box-shadow: 6px 6px 0 ${INK};
    transition: box-shadow 0.35s, transform 0.2s;
  }
  .lb-test-card.correct { box-shadow: 6px 6px 0 ${OK}; }
  .lb-test-card.wrong   { box-shadow: 6px 6px 0 ${BAD}; }
  .lb-test-card .photo { width: 100%; aspect-ratio: 4/3; overflow: hidden; background: #E5E7EB; border-bottom: 2px solid ${INK}; }
  .lb-test-card .photo img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
  .lb-test-card .labels { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 8px; }
  .lb-test-card .label-row { display: flex; align-items: center; justify-content: space-between; }

  /* Bottom action bar, single centered button */
  .lb-bottom-action {
    position: fixed; bottom: 0; left: 0; right: 0;
    padding: 16px 28px;
    background: rgba(255,255,255,0.94);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border-top: 2px solid ${INK};
    display: flex; justify-content: center; align-items: center;
    z-index: 200;
  }

  @media (max-width: 540px) {
    .lb-unsorted-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .lb-bottom-action { padding: 14px 20px; }
    .lb-btn-xl { font-size: 16px; padding: 14px 24px; }
    .lb-btn-lg { font-size: 15px; padding: 12px 20px; }
    .lb-zones-row { flex-direction: column !important; }
  }
`;

// ============================================================
// STYLE INJECTOR
// ============================================================
function StyleInjector() {
  useEffect(() => {
    const id = 'lb-game-styles';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = GLOBAL_STYLES;
  }, []);
  return null;
}

// ============================================================
// STEP INDICATOR, past steps are clickable to go back
// ============================================================
function StepIndicator({
  current,
  onStepClick,
}: {
  current: number;
  onStepClick: (stepIdx: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 32, maxWidth: 520, width: '100%' }}>
      {LB_STEPS.map((label, i) => {
        const done = i < current, active = i === current;
        const clickable = done;
        return (
          <div
            key={i}
            className={clickable ? 'lb-step-past' : ''}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
              cursor: clickable ? 'pointer' : 'default',
              opacity: !done && !active ? 0.45 : 1,
              transition: 'opacity 0.3s',
            }}
            onClick={() => clickable && onStepClick(i)}
            title={clickable ? `Go back to ${label}` : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {i > 0 && (
                <div
                  className="lb-step-line"
                  style={{ background: done || active ? INK : '#E5E7EB' }}
                />
              )}
              <div
                className="lb-step-dot"
                style={{
                  background: done ? OK : active ? BAD : '#E5E7EB',
                  transform: active ? 'scale(1.3)' : 'scale(1)',
                }}
              />
              {i < LB_STEPS.length - 1 && (
                <div
                  className="lb-step-line"
                  style={{ background: done ? INK : '#E5E7EB' }}
                />
              )}
            </div>
            <span
              className="lb-step-label"
              style={{ color: done ? OK : active ? BAD : '#9CA3AF' }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// BOTTOM ACTION BUTTON, single centered primary action
// ============================================================
function BottomActionButton({
  label,
  enabled,
  onClick,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="lb-bottom-action">
      <button
        className={`lb-btn lb-btn-lg ${enabled ? 'lb-btn-primary' : 'lb-btn-ghost'}`}
        disabled={!enabled}
        onClick={onClick}
        style={{ minWidth: 260, fontSize: 15 }}
      >
        {label}
      </button>
    </div>
  );
}

// ============================================================
// PHOTO CARD, draggable tile used during labeling
// ============================================================
function PhotoCard({
  card, isSelected, isDragging, onDragStart, onDragEnd, onClick,
}: {
  card: ImageCard; isSelected: boolean; isDragging: boolean;
  onDragStart: () => void; onDragEnd: () => void; onClick: () => void;
}) {
  const cls = ['lb-photo-card', isDragging ? 'dragging' : '', isSelected ? 'selected' : ''].filter(Boolean).join(' ');
  return (
    <div
      className={cls}
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', card.id); onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={e => { e.stopPropagation(); onClick(); }}
      role="button" tabIndex={0}
      aria-label={`${card.color} ${card.type}${isSelected ? ', selected' : ', tap to select'}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <img src={card.src} alt={`${card.color} ${card.type}`} draggable={false} />
      {isSelected && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(109,77,240,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{ background: CAT, border: `2px solid ${INK}`, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#fff' }}>
            Selected
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DROP ZONE
// ============================================================
function DropZone({
  zone, label, Icon, accentColor,
  dragOverZone, selectedId, cardsHere, currentDragId,
  onDragOver, onDragLeave, onDrop, onZoneClick, onCardDragStart, onCardDragEnd, onCardClick,
}: {
  zone: 'cat' | 'not-cat'; label: string; Icon: ElementType; accentColor: string;
  dragOverZone: ZoneId | null; selectedId: string | null; cardsHere: ImageCard[]; currentDragId: string | null;
  onDragOver: (e: React.DragEvent, zone: ZoneId) => void; onDragLeave: () => void;
  onDrop: (zone: ZoneId) => void; onZoneClick: (zone: ZoneId) => void;
  onCardDragStart: (id: string) => void; onCardDragEnd: () => void; onCardClick: (id: string) => void;
}) {
  const isDragOver = dragOverZone === zone;
  const hasTap = selectedId !== null;
  let cls = 'lb-drop-zone';
  if (isDragOver) cls += zone === 'cat' ? ' drag-over-cat' : ' drag-over-notcat';
  else if (hasTap) cls += ' tap-active';

  return (
    <div
      className={cls}
      onDragOver={e => onDragOver(e, zone)}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(zone)}
      onClick={() => hasTap && onZoneClick(zone)}
      aria-label={`${label} zone`}
    >
      <div className="lb-drop-zone-header">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 15, color: accentColor }}>
          <Icon size={18} weight="fill" /> {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', background: accentColor, border: `2px solid ${INK}`, borderRadius: 999, padding: '2px 10px' }}>
          {cardsHere.length}
        </span>
      </div>
      {cardsHere.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, minHeight: 100 }}>
          <Icon size={30} weight="duotone" color={accentColor} style={{ opacity: 0.32 }} />
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>
            {hasTap ? 'Tap to place here' : 'Drag images here'}
          </span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
          {cardsHere.map(card => (
            <PhotoCard
              key={card.id} card={card}
              isSelected={selectedId === card.id}
              isDragging={currentDragId === card.id}
              onDragStart={() => onCardDragStart(card.id)}
              onDragEnd={onCardDragEnd}
              onClick={() => onCardClick(card.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PHASE: INTRO
// ============================================================
function PhaseIntro({ onStart }: { onStart: () => void }) {
  const chips: { Icon: ElementType; label: string }[] = [
    { Icon: Tag, label: 'Sort training data' },
    { Icon: Robot, label: 'Train AI' },
    { Icon: MagnifyingGlass, label: 'Test on new images' },
    { Icon: Lightbulb, label: 'Discover the bias' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 600, width: '100%' }}>
      <div className="lb-float" style={{ marginBottom: 8, lineHeight: 1 }}>
        <Brain size={72} weight="duotone" color={CAT} />
      </div>
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[wc1Img, bd1Img].map((src, i) => (
          <div key={i} style={{ width: 72, height: 72, borderRadius: 14, overflow: 'hidden', border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, flexShrink: 0 }}>
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          </div>
        ))}
        <span style={{ color: MUTED, display: 'inline-flex' }}><ArrowRightGlyph /></span>
        <Robot size={40} weight="fill" color={INK} />
        <span style={{ color: MUTED, display: 'inline-flex' }}><ArrowRightGlyph /></span>
        <div style={{ width: 72, height: 72, borderRadius: 14, overflow: 'hidden', border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${BAD}`, flexShrink: 0 }}>
          <img src={wd1Img} alt="white dog" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        </div>
        <XCircle size={26} weight="fill" color={BAD} />
      </div>

      <h1 className="lb-fade-up" style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900, textAlign: 'center', color: INK, margin: '0 0 10px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
        Did the AI Really Learn Cats?
      </h1>
      <p className="lb-fade-up" style={{ fontSize: 17, color: CAT, fontWeight: 800, textAlign: 'center', marginBottom: 24, animationDelay: '0.1s' }}>
        An interactive lesson in Learning Bias
      </p>

      <div className="lb-card lb-fade-up" style={{ padding: '26px 30px', marginBottom: 26, animationDelay: '0.2s', width: '100%' }}>
        <p style={{ margin: '0 0 14px', color: INK, fontSize: 16, lineHeight: 1.65 }}>
          You're going to <strong>train an AI</strong> to recognize cats. You'll sort training images,
          watch the AI learn, and then test it on new photos.
        </p>
        <p style={{ margin: 0, color: INK, fontSize: 16, lineHeight: 1.65 }}>
          Sounds simple, but the AI might achieve{' '}
          <strong style={{ color: CAT }}>100% training accuracy</strong> while learning
          the <em>completely wrong thing</em>. This is called <strong>learning bias</strong>.
        </p>
      </div>

      <div className="lb-fade-up" style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center', animationDelay: '0.3s' }}>
        {chips.map(({ Icon, label }) => (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: SURFACE, color: INK, padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, border: `2px solid ${INK}` }}>
            <Icon size={15} weight="bold" color={CAT} /> {label}
          </span>
        ))}
      </div>

      <button className="lb-btn lb-btn-xl lb-btn-primary lb-bounce-in" style={{ animationDelay: '0.4s' }} onClick={onStart}>
        Start Training <Sparkle size={20} weight="fill" />
      </button>
    </div>
  );
}

// Plain right-arrow glyph component (kept consistent with the site's arrow usage)
function ArrowRightGlyph() {
  return <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>→</span>;
}

// ============================================================
// PHASE: DRAG-AND-DROP LABELING
// ============================================================
function PhaseDragLabeling({
  onActionChange,
}: {
  onActionChange: ActionSetter;
}) {
  const [placements, setPlacements] = useState<Record<string, ZoneId>>(
    () => Object.fromEntries(TRAINING_IMAGES.map(c => [c.id, 'unsorted']))
  );
  const [dragId, setDragId]             = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<ZoneId | null>(null);
  const [selectedId, setSelectedId]     = useState<string | null>(null);

  const cardsIn    = (z: ZoneId) => TRAINING_IMAGES.filter(c => placements[c.id] === z);
  const unsorted   = cardsIn('unsorted');
  const inCat      = cardsIn('cat');
  const inNotCat   = cardsIn('not-cat');
  const allSorted  = unsorted.length === 0;
  const allCorrect = allSorted && TRAINING_IMAGES.every(c => placements[c.id] === c.correctLabel);
  const canTrain   = allCorrect;

  useEffect(() => {
    if (canTrain) {
      onActionChange('Train AI →', true);
    } else if (allSorted && !allCorrect) {
      onActionChange('Some images look wrong, check your sorting', false);
    } else {
      onActionChange(`Sort all ${unsorted.length} images to continue`, false);
    }
  }, [canTrain, allSorted, allCorrect, unsorted.length, onActionChange]);

  const statusMsg   = !allSorted ? `${unsorted.length} image${unsorted.length !== 1 ? 's' : ''} remaining` : !allCorrect ? 'Check your labels, something looks off' : 'All correct, ready to train!';
  const statusColor = !allSorted ? MUTED : !allCorrect ? BAD : OK;

  function moveCard(id: string, to: ZoneId) { setPlacements(prev => ({ ...prev, [id]: to })); setSelectedId(null); }

  function handleDragStart(id: string) { setDragId(id); setSelectedId(null); }
  function handleDragEnd()             { setDragId(null); setDragOverZone(null); }
  function handleDragOver(e: React.DragEvent, zone: ZoneId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverZone(zone); }
  function handleDragLeave()           { setDragOverZone(null); }
  function handleDrop(zone: ZoneId)   {
    if (!dragId) { setDragId(null); setDragOverZone(null); return; }
    moveCard(dragId, placements[dragId] === 'unsorted' ? zone : 'unsorted');
    setDragId(null); setDragOverZone(null);
  }
  function handleCardClick(id: string) {
    if (placements[id] !== 'unsorted') { moveCard(id, 'unsorted'); }
    else { setSelectedId(prev => prev === id ? null : id); }
  }
  function handleZoneClick(zone: ZoneId) {
    if (selectedId && placements[selectedId] === 'unsorted') moveCard(selectedId, zone);
    else setSelectedId(null);
  }

  const sharedProps = { currentDragId: dragId, onCardDragStart: handleDragStart, onCardDragEnd: handleDragEnd, onCardClick: handleCardClick, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, onZoneClick: handleZoneClick, selectedId, dragOverZone };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 860, width: '100%' }}>
      <div className="lb-fade-up" style={{ textAlign: 'center', marginBottom: 8 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: INK, margin: '0 0 6px', letterSpacing: '-0.025em' }}>
          <Tag size={26} weight="fill" color={CAT} /> Sort the Training Images
        </h2>
        <p style={{ color: MUTED, fontSize: 15, margin: 0 }}>
          Drag images into a zone, or tap to select, then tap a zone to place. Tap a placed image to return it.
        </p>
      </div>

      {selectedId && (
        <div className="lb-fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '8px 0 4px', background: CAT_SOFT, border: `2px solid ${INK}`, borderRadius: 999, padding: '8px 16px', fontSize: 13, color: CAT, fontWeight: 800 }}>
          <PushPin size={15} weight="fill" /> Image selected, tap a zone below to place it
        </div>
      )}

      {/* Unsorted pool, strict 5×2 grid */}
      <div
        className="lb-fade-up"
        style={{
          width: '100%', marginTop: 16, marginBottom: 18,
          background: SURFACE,
          border: `2px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}`,
          borderRadius: 18, padding: '16px', animationDelay: '0.1s',
        }}
        onDragOver={e => handleDragOver(e, 'unsorted')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('unsorted')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 800, color: INK, fontSize: 14 }}>
            <Package size={17} weight="fill" /> Unsorted Images
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, background: unsorted.length === 0 ? OK : INK, color: '#fff', border: `2px solid ${INK}`, borderRadius: 999, padding: '2px 10px' }}>
            {unsorted.length === 0 ? <><Check size={12} weight="bold" /> Done!</> : `${unsorted.length} remaining`}
          </span>
        </div>

        {unsorted.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '18px 0', color: OK, fontWeight: 800, fontSize: 14 }}>
            <CheckCircle size={18} weight="fill" /> All images sorted into zones below
          </div>
        ) : (
          <div className="lb-unsorted-grid">
            {TRAINING_IMAGES.map((card, i) => {
              const isHere = placements[card.id] === 'unsorted';
              return (
                <div key={card.id} style={{ animation: `lbFadeUp 0.3s ease ${i * 0.04}s both`, visibility: isHere ? 'visible' : 'hidden', pointerEvents: isHere ? 'auto' : 'none' }}>
                  <PhotoCard card={card} isSelected={selectedId === card.id} isDragging={dragId === card.id} onDragStart={() => handleDragStart(card.id)} onDragEnd={handleDragEnd} onClick={() => handleCardClick(card.id)} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drop zones */}
      <div className="lb-zones-row lb-fade-up" style={{ display: 'flex', gap: 14, width: '100%', marginBottom: 18, animationDelay: '0.15s' }}>
        <DropZone zone="cat"     label="Cat"     Icon={Cat} accentColor={CAT}    cardsHere={inCat}    {...sharedProps} />
        <DropZone zone="not-cat" label="Not Cat" Icon={Dog} accentColor={NOTCAT} cardsHere={inNotCat} {...sharedProps} />
      </div>

      {allSorted && !allCorrect && (
        <div className="lb-fade-in" style={{ width: '100%', marginBottom: 12, padding: '12px 18px', background: BAD_SOFT, border: `2px solid ${INK}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Warning size={22} weight="fill" color={BAD} />
          <span style={{ fontSize: 14, color: '#b1232c', fontWeight: 700 }}>
            Some images might be in the wrong zone. Look carefully and try again.
          </span>
        </div>
      )}

      <div className="lb-fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animationDelay: '0.2s' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: statusColor }}>{statusMsg}</span>
      </div>
    </div>
  );
}

// ============================================================
// PHASE: TRAINING ANIMATION
// ============================================================
function PhaseTraining({
  onActionChange,
}: {
  onActionChange: ActionSetter;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 900),
      setTimeout(() => setStep(2), 1900),
      setTimeout(() => setStep(3), 2900),
      setTimeout(() => setStep(4), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (step >= 4) {
      onActionChange('Test AI →', true);
    } else {
      onActionChange('Training AI…', false);
    }
  }, [step, onActionChange]);

  const epochLabels = ['Epoch 1 / 3', 'Epoch 2 / 3', 'Epoch 3 / 3'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 620, width: '100%' }}>
      <h2 className="lb-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: INK, margin: '0 0 6px', letterSpacing: '-0.025em', textAlign: 'center' }}>
        {step < 4 ? <><Robot size={26} weight="fill" color={CAT} /> Training AI...</> : <><Confetti size={26} weight="fill" color={OK} /> Training Complete!</>}
      </h2>
      <p className="lb-fade-up" style={{ color: MUTED, fontSize: 15, marginBottom: 28, textAlign: 'center', animationDelay: '0.1s' }}>
        {step < 4 ? 'Analyzing patterns in your sorted images' : 'The AI has learned from your dataset'}
      </p>

      <div className="lb-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, width: '100%', marginBottom: 24, position: 'relative', padding: 14, background: SURFACE, borderRadius: 18, border: `2px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}`, overflow: 'hidden', animationDelay: '0.15s' }}>
        {step < 4 && <div className="lb-scan-beam" />}
        {TRAINING_IMAGES.map((card, i) => (
          <div key={card.id} style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1', border: `2px solid ${INK}`, animation: `lbFadeUp 0.3s ease ${i * 0.04}s both`, position: 'relative' }}>
            <img src={card.src} alt={`${card.color} ${card.type}`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '3px 4px', background: card.correctLabel === 'cat' ? CAT : NOTCAT, textAlign: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>{card.correctLabel === 'cat' ? 'Cat' : 'Not Cat'}</span>
            </div>
          </div>
        ))}
      </div>

      {step < 4 && (
        <div className="lb-card lb-fade-in" style={{ width: '100%', padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {epochLabels.map((label, i) => {
              const done = i < step, active = i === step - 1;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, border: `2px solid ${INK}`, background: done ? OK : active ? CAT : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s' }}>
                    {done ? <Check size={14} weight="bold" color="#fff" />
                      : active ? <div className="lb-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' }} />
                      : <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 800 }}>{i + 1}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: done ? OK : active ? CAT : '#9CA3AF' }}>{label}</span>
                      {done && <span style={{ fontSize: 12, color: OK, fontWeight: 800 }}>Loss: 0.{i === 0 ? '38' : i === 1 ? '12' : '02'}</span>}
                    </div>
                    <div style={{ height: 6, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden', border: `1.5px solid ${INK}` }}>
                      <div style={{ height: '100%', borderRadius: 999, background: done ? OK : active ? CAT : 'transparent', width: done ? '100%' : active ? '60%' : '0%', transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step >= 4 && (
        <div className="lb-card lb-success-glow" style={{ width: '100%', padding: '32px', textAlign: 'center', background: OK_SOFT, marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: OK, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Training Result</p>
          <div style={{ animation: 'lbCountUp 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: OK, lineHeight: 1, display: 'block', letterSpacing: '-0.04em' }}>100%</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 16, color: '#0a7d4d', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Training Accuracy <Confetti size={18} weight="fill" />
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: OK }}>The AI correctly classified all {TRAINING_IMAGES.length} training images!</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SHARED: Test result card (used in PhaseTest)
// ============================================================
function TestCard({ card, revealed, revealDelay = 0 }: { card: TestImageCard; revealed: boolean; revealDelay?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!revealed) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), revealDelay);
    return () => clearTimeout(t);
  }, [revealed, revealDelay]);

  const isCorrect = card.aiPrediction === card.trueLabel;
  let cardClass = 'lb-test-card' + (show ? isCorrect ? ' correct' : ' wrong' : '') + (show && !isCorrect ? ' lb-shake' : '');

  return (
    <div className={cardClass} style={{ animation: 'lbFadeUp 0.45s ease both' }}>
      <div className="photo"><img src={card.src} alt={`${card.color} ${card.type}`} /></div>
      <div className="labels">
        <div className="label-row">
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>True label</span>
          <span className={`lb-badge ${card.trueLabel === 'cat' ? 'lb-badge-cat' : 'lb-badge-notcat'}`} style={{ fontSize: 11 }}>
            <LabelText label={card.trueLabel} />
          </span>
        </div>
        <div className="label-row">
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>AI says</span>
          {show ? (
            <span className={`lb-badge ${isCorrect ? 'lb-badge-correct' : 'lb-badge-wrong'}`} style={{ fontSize: 12 }}>
              <LabelText label={card.aiPrediction} />
              {isCorrect ? <CheckCircle size={14} weight="fill" /> : <XCircle size={14} weight="fill" />}
            </span>
          ) : (
            <span className="lb-pulse" style={{ display: 'inline-flex', lineHeight: 1 }}><Question size={20} weight="bold" color={MUTED} /></span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PHASE: FIRST TEST (white cat + black dog → both correct)
// ============================================================
function PhaseTest({
  onActionChange,
}: {
  onActionChange: ActionSetter;
}) {
  const [revealed, setRevealed]       = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 800);
    const t2 = setTimeout(() => setShowSummary(true), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    onActionChange('Challenge →', showSummary);
  }, [showSummary, onActionChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 640, width: '100%' }}>
      <h2 className="lb-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: INK, margin: '0 0 6px', letterSpacing: '-0.025em', textAlign: 'center' }}>
        <Robot size={26} weight="fill" color={CAT} /> Testing the AI
      </h2>
      <p className="lb-fade-up" style={{ color: MUTED, fontSize: 15, marginBottom: 28, textAlign: 'center', animationDelay: '0.1s' }}>
        The AI now sees images it has <em>never seen before</em>…
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, width: '100%', marginBottom: 24 }}>
        {TEST_IMAGES.map((card, i) => (
          <TestCard key={card.id} card={card} revealed={revealed} revealDelay={i * 700} />
        ))}
      </div>

      {showSummary && (
        <div className="lb-card lb-scale-in lb-success-glow" style={{ width: '100%', padding: '24px 28px', marginBottom: 20, background: OK_SOFT, textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}><Confetti size={40} weight="fill" color={OK} /></div>
          <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: '#0a7d4d' }}>2 / 2 correct!</h3>
          <p style={{ margin: '0 0 6px', fontSize: 15, color: '#0a7d4d', lineHeight: 1.6 }}>The AI correctly identified the white cat and black dog. Looks like a success…</p>
          <p style={{ margin: 0, fontSize: 14, color: OK, fontWeight: 700 }}>But what about images with different colors?</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PHASE: CHALLENGE, interactive guess + AI reveal
// ============================================================
type ChallengeState = 'guessing' | 'scanning' | 'revealed';

function PhaseChallenge({
  onActionChange,
}: {
  onActionChange: ActionSetter;
}) {
  const [userGuesses, setUserGuesses] = useState<Record<string, Prediction | undefined>>({});
  const [challengeState, setChallengeState] = useState<ChallengeState>('guessing');
  const [showExplanation, setShowExplanation] = useState(false);

  const allGuessed = CHALLENGE_IMAGES.every(c => userGuesses[c.id] !== undefined);

  // Stable run-test function we can safely pass as an action
  const handleRunTest = useCallback(() => {
    setChallengeState('scanning');
    setTimeout(() => {
      setChallengeState('revealed');
      setTimeout(() => setShowExplanation(true), 1800);
    }, 2200);
  }, []);

  // Tell parent what the action button should do at each sub-state
  useEffect(() => {
    if (challengeState === 'guessing') {
      onActionChange(
        allGuessed ? 'Run AI Test' : 'Make a prediction for each image',
        allGuessed,
        allGuessed ? handleRunTest : undefined,
      );
    } else if (challengeState === 'scanning') {
      onActionChange('Running AI Test…', false);
    } else {
      // revealed
      onActionChange('See Why →', showExplanation);
    }
  }, [challengeState, allGuessed, showExplanation, handleRunTest, onActionChange]);

  function handleGuess(cardId: string, guess: Prediction) {
    if (challengeState !== 'guessing') return;
    setUserGuesses(prev => ({ ...prev, [cardId]: guess }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 700, width: '100%' }}>
      {/* Header */}
      <h2 className="lb-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: INK, margin: '0 0 6px', letterSpacing: '-0.025em', textAlign: 'center' }}>
        <Brain size={26} weight="fill" color={CAT} /> The Real Test
      </h2>
      <p className="lb-fade-up" style={{ color: MUTED, fontSize: 15, marginBottom: 8, textAlign: 'center', animationDelay: '0.1s' }}>
        {challengeState === 'guessing'
          ? 'Before running the AI, what do you think it will predict?'
          : challengeState === 'scanning'
          ? 'AI analyzing images…'
          : "Here's what the AI actually predicted."}
      </p>

      {challengeState === 'guessing' && (
        <div className="lb-insight lb-fade-up" style={{ width: '100%', marginBottom: 20, animationDelay: '0.15s' }}>
          <p style={{ margin: 0, fontSize: 14, color: INK }}>
            These images use a <strong>different color combination</strong> than the training data.
            Make your prediction for each image, then run the AI test.
          </p>
        </div>
      )}

      {/* Challenge cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, width: '100%', marginBottom: 24 }}>
        {CHALLENGE_IMAGES.map((card, cardIdx) => {
          const guess      = userGuesses[card.id];
          const isRevealed = challengeState === 'revealed';
          const isScanning = challengeState === 'scanning';
          const isCorrect  = card.aiPrediction === card.trueLabel;
          const guessedRight = guess === card.aiPrediction;

          return (
            <div
              key={card.id}
              className={[
                'lb-test-card',
                isScanning ? 'lb-card-pulse' : '',
                isRevealed ? (isCorrect ? 'correct' : 'wrong') : '',
                isRevealed && !isCorrect ? 'lb-shake' : '',
              ].filter(Boolean).join(' ')}
              style={{ animation: `lbFadeUp 0.45s ease ${cardIdx * 0.1}s both`, overflow: 'hidden' }}
            >
              {/* Image, always visible */}
              <div className="photo" style={{ position: 'relative' }}>
                <img src={card.src} alt={`${card.color} ${card.type}`} />
                {/* Scanning overlay */}
                {isScanning && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(109,77,240,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', top: 0, width: '28%', height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(109,77,240,0.5), transparent)',
                      animation: 'lbScan 1.1s ease-in-out infinite',
                    }} />
                  </div>
                )}
                {/* Wrong badge after reveal */}
                {isRevealed && (
                  <div className="lb-bounce-in" style={{
                    position: 'absolute', top: 10, right: 10,
                    background: BAD, borderRadius: '50%', border: `2px solid ${INK}`,
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `2px 2px 0 ${INK}`,
                  }}>
                    <X size={16} weight="bold" color="#fff" />
                  </div>
                )}
              </div>

              {/* Labels / guess area */}
              <div className="labels">
                {/* True label, always shown */}
                <div className="label-row">
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>True label</span>
                  <span className={`lb-badge ${card.trueLabel === 'cat' ? 'lb-badge-cat' : 'lb-badge-notcat'}`} style={{ fontSize: 11 }}>
                    <LabelText label={card.trueLabel} />
                  </span>
                </div>

                {/* User guess row */}
                {challengeState === 'guessing' && (
                  <div>
                    <p style={{ margin: '4px 0 8px', fontSize: 12, color: MUTED, fontWeight: 700 }}>
                      What will the AI predict?
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className={`lb-guess-btn${guess === 'cat' ? ' selected-cat' : ''}`}
                        onClick={() => handleGuess(card.id, 'cat')}
                      >
                        <Cat size={15} weight="fill" /> Cat
                      </button>
                      <button
                        className={`lb-guess-btn${guess === 'not-cat' ? ' selected-notcat' : ''}`}
                        onClick={() => handleGuess(card.id, 'not-cat')}
                      >
                        <Dog size={15} weight="fill" /> Not Cat
                      </button>
                    </div>
                    {guess && (
                      <p className="lb-fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, margin: '6px auto 0', fontSize: 11, color: '#9CA3AF', width: '100%', justifyContent: 'center' }}>
                        Your guess: <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: INK }}><LabelText label={guess} /></strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Scanning state */}
                {isScanning && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '4px 0' }}>
                    <div className="lb-spin" style={{ width: 14, height: 14, border: `2px solid ${CAT_SOFT}`, borderTopColor: CAT, borderRadius: '50%' }} />
                    <span style={{ fontSize: 13, color: MUTED, fontWeight: 700 }}>AI analyzing…</span>
                  </div>
                )}

                {/* Revealed: AI prediction */}
                {isRevealed && (
                  <div className="label-row">
                    <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>AI says</span>
                    <span className="lb-badge lb-badge-wrong" style={{ fontSize: 12 }}>
                      <LabelText label={card.aiPrediction} /> <XCircle size={14} weight="fill" />
                    </span>
                  </div>
                )}

                {/* Revealed: did user predict correctly? */}
                {isRevealed && guess !== undefined && (
                  <div style={{ marginTop: 4, textAlign: 'center' }}>
                    {guessedRight ? (
                      <span className="lb-fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: OK, fontWeight: 800 }}>
                        <Check size={13} weight="bold" /> You predicted correctly!
                      </span>
                    ) : (
                      <span className="lb-fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>
                        You guessed <LabelText label={guess} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Post-reveal: failure banner */}
      {challengeState === 'revealed' && (
        <div className="lb-scale-in" style={{ width: '100%', marginBottom: 16 }}>
          <div style={{ background: BAD_SOFT, border: `2px solid ${INK}`, boxShadow: `6px 6px 0 ${BAD}`, borderRadius: 18, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <XCircle size={38} weight="fill" color={BAD} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: BAD, marginBottom: 4 }}>2 out of 2 wrong!</div>
              <div style={{ fontSize: 14, color: '#b1232c', lineHeight: 1.55 }}>
                The AI completely failed, it ignored the animal and went by something else entirely.
              </div>
            </div>
          </div>

          {/* Visual shortcut explanation, revealed only after banner */}
          {showExplanation && (
            <div className="lb-card lb-fade-in" style={{ padding: '20px 22px' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Lightbulb size={16} weight="fill" color={NOTCAT} /> What the AI was actually doing
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {CHALLENGE_IMAGES.map((card, i) => (
                  <div key={card.id} style={{
                    display: 'grid', gridTemplateColumns: '52px 1fr 1fr', alignItems: 'center', gap: 14,
                    padding: '12px 14px', borderRadius: 14,
                    background: BAD_SOFT, border: `2px solid ${INK}`,
                    animation: `lbFadeUp 0.4s ease ${i * 0.15}s both`,
                  }}>
                    <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', border: `2px solid ${INK}`, flexShrink: 0 }}>
                      <img src={card.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 2 }}>Human sees</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 800, color: INK }}>
                        {card.type === 'dog' ? <><Dog size={16} weight="fill" /> Dog</> : <><Cat size={16} weight="fill" /> Cat</>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 2 }}>AI shortcut</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: BAD }}>
                        <Swatch tone={card.color} />
                        {card.color === 'white' ? 'White → Cat' : 'Black → Not Cat'}
                        <XCircle size={14} weight="fill" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 13, color: MUTED, textAlign: 'center' }}>
                The AI never learned what a cat <em>is</em>, it learned what color they <em>were</em> in training.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Small colour swatch used to represent the "white"/"black" shortcut
function Swatch({ tone }: { tone: 'white' | 'black' }) {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14, borderRadius: 4,
      background: tone === 'white' ? '#fff' : '#1a1a1a',
      border: `2px solid ${INK}`,
    }} />
  );
}

// ============================================================
// PHASE: EXPLANATION
// ============================================================
function PhaseExplanation({
  onActionChange,
}: {
  onActionChange: ActionSetter;
}) {
  const [visStep, setVisStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setVisStep(1), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    onActionChange('Finish →', true);
  }, [onActionChange]);

  const insights: { Icon: ElementType; title: string; text: string }[] = [
    { Icon: Database,   title: 'Skewed training data',        text: 'Every training cat was white. Every training dog was black. No exceptions.' },
    { Icon: LinkSimple, title: 'Perfect spurious correlation', text: 'Color was 100% correlated with the label, an irresistible shortcut for the model.' },
    { Icon: Lightning,  title: 'AI chose the easy path',       text: 'The model learned the simplest rule that fit the data. Real cat features were never needed.' },
    { Icon: ChartBar,   title: '100% accuracy ≠ understanding', text: 'Perfect training accuracy just means the AI fit your data, not that it learned the right concept.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 660, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ marginBottom: 8 }}><Lightbulb size={52} weight="duotone" color={NOTCAT} /></div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 900, color: INK, margin: '0 0 10px', letterSpacing: '-0.03em' }}>
          The AI didn't learn "cat."
        </h2>
        <p style={{ fontSize: 17, color: CAT, fontWeight: 800, margin: 0 }}>
          It learned the shortcut: <strong>white = cat, black = not cat.</strong>
        </p>
      </div>

      <div className="lb-card lb-fade-up" style={{ width: '100%', padding: '22px 26px', marginBottom: 20, background: NOTCAT_SOFT }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px', fontSize: 13, fontWeight: 800, color: '#b45d04', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <GraduationCap size={17} weight="fill" /> This is called Learning Bias
        </p>
        <p style={{ margin: 0, fontSize: 15, color: '#7a4708', lineHeight: 1.65 }}>
          <strong>Learning bias</strong> happens when an AI picks up a shortcut pattern instead of the true concept. Because the training data had a perfect color correlation, the model had no reason to look deeper, it achieved 100% accuracy without ever understanding what a cat is.
        </p>
      </div>

      {visStep >= 1 && (
        <div className="lb-card lb-scale-in" style={{ width: '100%', padding: '20px 22px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What the AI's rule predicts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { src: wc6Img, label: 'White Cat',  result: 'Cat',     correct: true  },
              { src: bd6Img, label: 'Black Dog',  result: 'Not Cat', correct: true  },
              { src: wd1Img, label: 'White Dog',  result: 'Cat',     correct: false },
              { src: bc1Img, label: 'Black Cat',  result: 'Not Cat', correct: false },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: row.correct ? OK_SOFT : BAD_SOFT, border: `2px solid ${INK}`, animation: `lbFadeUp 0.4s ease ${i * 0.1}s both` }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', border: `2px solid ${INK}`, flexShrink: 0 }}>
                  <img src={row.src} alt={row.label} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
                </div>
                <span style={{ fontSize: 13, color: INK, fontWeight: 700, minWidth: 88 }}>{row.label}</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>AI sees color →</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: INK }}>{row.result}</span>
                </div>
                {row.correct ? <CheckCircle size={18} weight="fill" color={OK} /> : <XCircle size={18} weight="fill" color={BAD} />}
              </div>
            ))}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
            The color shortcut worked on training data but <strong>fails completely</strong> on new color combinations.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, width: '100%', marginBottom: 24 }}>
        {insights.map((ins, i) => (
          <div key={i} className="lb-card lb-fade-up" style={{ padding: '16px 18px', animation: `lbFadeUp 0.5s ease ${0.3 + i * 0.1}s both` }}>
            <div style={{ marginBottom: 8 }}><ins.Icon size={24} weight="fill" color={CAT} /></div>
            <div style={{ fontWeight: 800, fontSize: 13, color: INK, marginBottom: 4 }}>{ins.title}</div>
            <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{ins.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PHASE: COMPLETE
// ============================================================
function PhaseComplete({ onRestart }: { onRestart: () => void }) {
  const keyLessons: { Icon: ElementType; title: string; text: string; color: string }[] = [
    { Icon: Lightning,       title: 'AI takes shortcuts',        text: 'Models learn the easiest pattern that fits the data, not necessarily the true concept.', color: CAT },
    { Icon: ChartBar,        title: 'Accuracy can deceive',       text: '100% training accuracy only means the model fit that dataset. It says nothing about real understanding.', color: OK },
    { Icon: Palette,         title: 'Diversity breaks shortcuts', text: 'Varied examples (black cats, white dogs) force the model to learn real distinguishing features.', color: NOTCAT },
    { Icon: MagnifyingGlass, title: 'Test out-of-distribution',   text: 'Always validate on data that differs from training to reveal what the model truly learned.', color: BAD },
  ];

  const examples: { Icon: ElementType; t: string }[] = [
    { Icon: FirstAid, t: "Medical AI trained on one hospital's data predicting poorly for patients elsewhere with different demographics." },
    { Icon: Camera, t: "Image classifiers learning to detect \"wolf\" from snow in the background, not the animal's actual features." },
    { Icon: Briefcase, t: 'Hiring models associating short résumés with rejection because junior roles historically used brief formats.' },
    { Icon: Globe, t: 'Translation models performing worse on low-resource languages because training data skewed toward English.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 660, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="lb-float" style={{ marginBottom: 12, display: 'block' }}><Trophy size={64} weight="fill" color={NOTCAT} /></div>
        <h2 className="lb-fade-up" style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 900, color: INK, margin: '0 0 10px', letterSpacing: '-0.03em' }}>
          You discovered learning bias!
        </h2>
        <p className="lb-fade-up" style={{ color: MUTED, fontSize: 16, margin: 0, animationDelay: '0.1s' }}>Here's what you learned today</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, width: '100%', marginBottom: 28 }}>
        {keyLessons.map((lesson, i) => (
          <div key={i} className="lb-card lb-card-hover lb-fade-up" style={{ padding: '20px', animation: `lbFadeUp 0.5s ease ${0.1 + i * 0.1}s both`, borderTop: `5px solid ${lesson.color}` }}>
            <div style={{ marginBottom: 8 }}><lesson.Icon size={28} weight="fill" color={lesson.color} /></div>
            <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 6 }}>{lesson.title}</div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.55 }}>{lesson.text}</div>
          </div>
        ))}
      </div>

      <div className="lb-card lb-fade-up" style={{ width: '100%', padding: '20px 24px', marginBottom: 28, background: INK, borderColor: INK, animationDelay: '0.5s' }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: '#9aa3bf', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Real-world examples of learning bias
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {examples.map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <ex.Icon size={18} weight="fill" color="#ffd0d6" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#d8dbe6', lineHeight: 1.55 }}>{ex.t}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="lb-btn lb-btn-lg lb-btn-primary lb-bounce-in" onClick={onRestart} style={{ minWidth: 180 }}>
          <ArrowsClockwise size={18} weight="bold" /> Play Again
        </button>
        <a href="https://en.wikipedia.org/wiki/Inductive_bias" target="_blank" rel="noopener noreferrer" className="lb-btn lb-btn-lg lb-btn-outline" style={{ minWidth: 180, textDecoration: 'none' }}>
          <BookOpen size={18} weight="bold" /> Learn More
        </a>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export function LearningBias() {
  const [phase, setPhase]   = useState<GamePhase>('intro');
  const [animKey, setAnimKey] = useState(0);

  // Action button state
  const [btnLabel, setBtnLabel]     = useState('');
  const [btnEnabled, setBtnEnabled] = useState(false);
  // Store override fn in a ref (avoids function-in-state issues)
  const actionFnRef = useRef<(() => void) | null>(null);

  // Stable setter passed to every phase component
  const setAction = useCallback((label: string, enabled: boolean, fn?: () => void) => {
    setBtnLabel(label);
    setBtnEnabled(enabled);
    actionFnRef.current = fn ?? null;
  }, []);

  function advance(next: GamePhase) {
    setAnimKey(k => k + 1);
    setBtnLabel('');
    setBtnEnabled(false);
    actionFnRef.current = null;
    setPhase(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < PHASE_ORDER.length - 1) advance(PHASE_ORDER[idx + 1]);
  }

  function handleActionClick() {
    if (actionFnRef.current) {
      actionFnRef.current();
    } else {
      goNext();
    }
  }

  const stepMap: Record<GamePhase, number> = {
    intro: -1, labeling: 0, training: 1, test: 2, challenge: 3, explanation: 4, complete: 4,
  };

  // Step indicator click, only allows going back to completed steps
  function handleStepClick(stepIdx: number) {
    const currentStepIdx = stepMap[phase];
    if (currentStepIdx !== undefined && stepIdx < currentStepIdx) {
      advance(STEP_TO_PHASE[stepIdx]);
    }
  }

  const showNav = phase !== 'intro' && phase !== 'complete';

  useEffect(() => {
    if (phase === 'complete') markGameCompleted('learning-bias');
  }, [phase]);

  return (
    <div
      className="lb"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #fff0f1 0%, #f3f0ff 45%, #eafaf2 100%)',
        padding: showNav ? '32px 20px 108px' : '32px 20px 60px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}
    >
      <StyleInjector />

      {showNav && (
        <StepIndicator
          current={stepMap[phase]}
          onStepClick={handleStepClick}
          key={`step-${phase}`}
        />
      )}

      <div key={animKey} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {phase === 'intro'       && <PhaseIntro onStart={() => advance('labeling')} />}
        {phase === 'labeling'    && <PhaseDragLabeling onActionChange={setAction} />}
        {phase === 'training'    && <PhaseTraining onActionChange={setAction} />}
        {phase === 'test'        && <PhaseTest onActionChange={setAction} />}
        {phase === 'challenge'   && <PhaseChallenge onActionChange={setAction} />}
        {phase === 'explanation' && <PhaseExplanation onActionChange={setAction} />}
        {phase === 'complete'    && <PhaseComplete onRestart={() => advance('intro')} />}
      </div>

      {showNav && (
        <BottomActionButton
          label={btnLabel}
          enabled={btnEnabled}
          onClick={handleActionClick}
        />
      )}
    </div>
  );
}
