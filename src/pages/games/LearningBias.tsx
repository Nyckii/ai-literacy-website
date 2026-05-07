import { useState, useEffect, useCallback, useRef } from 'react';

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
// CSS
// ============================================================
const GLOBAL_STYLES = `
  .lb * { box-sizing: border-box; }
  .lb { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }

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
    0%,100% { box-shadow: 0 0 18px rgba(16,185,129,0.22); }
    50%     { box-shadow: 0 0 48px rgba(16,185,129,0.6), 0 0 72px rgba(5,150,105,0.28); }
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
    0%,100% { box-shadow: 0 4px 20px rgba(0,0,0,0.07); }
    50%     { box-shadow: 0 0 0 4px rgba(99,102,241,0.35), 0 8px 32px rgba(99,102,241,0.2); }
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

  .lb-card {
    background: #fff;
    border-radius: 22px;
    box-shadow: 0 4px 28px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }
  .lb-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 36px rgba(0,0,0,0.11);
  }

  /* Buttons */
  .lb-btn {
    border: none; cursor: pointer; font-weight: 700;
    border-radius: 14px; letter-spacing: -0.01em;
    transition: all 0.22s ease;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    font-family: inherit; line-height: 1;
  }
  .lb-btn:hover:not(:disabled) { transform: translateY(-2px); }
  .lb-btn:active:not(:disabled) { transform: translateY(0) scale(0.97); }
  .lb-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }

  .lb-btn-xl  { font-size: 18px; padding: 17px 36px; border-radius: 16px; }
  .lb-btn-lg  { font-size: 16px; padding: 14px 28px; }
  .lb-btn-md  { font-size: 14px; padding: 10px 20px; }
  .lb-btn-sm  { font-size: 13px; padding: 8px 14px; border-radius: 10px; }

  .lb-btn-primary {
    background: linear-gradient(135deg, #4F46E5, #7C3AED);
    color: #fff; box-shadow: 0 4px 16px rgba(79,70,229,0.38);
  }
  .lb-btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #4338CA, #6D28D9);
    box-shadow: 0 7px 24px rgba(79,70,229,0.55);
  }
  .lb-btn-success {
    background: linear-gradient(135deg, #10B981, #059669);
    color: #fff; box-shadow: 0 4px 16px rgba(16,185,129,0.38);
  }
  .lb-btn-success:hover:not(:disabled) { box-shadow: 0 7px 24px rgba(16,185,129,0.5); }
  .lb-btn-warning {
    background: linear-gradient(135deg, #F59E0B, #D97706);
    color: #fff; box-shadow: 0 4px 16px rgba(245,158,11,0.38);
  }
  .lb-btn-warning:hover:not(:disabled) { box-shadow: 0 7px 24px rgba(245,158,11,0.5); }
  .lb-btn-ghost {
    background: rgba(255,255,255,0.75);
    color: #6B7280; border: 2px solid #E5E7EB;
  }
  .lb-btn-ghost:hover:not(:disabled) { background: #F9FAFB; color: #374151; }
  .lb-btn-outline {
    background: #fff; color: #4F46E5;
    border: 2.5px solid #4F46E5; box-shadow: 0 2px 8px rgba(79,70,229,0.1);
  }
  .lb-btn-outline:hover:not(:disabled) { background: #EEF2FF; }

  /* Guess buttons in challenge */
  .lb-guess-btn {
    flex: 1; padding: 10px 8px; border-radius: 10px;
    font-size: 13px; font-weight: 700;
    border: 2px solid #E5E7EB;
    background: #F9FAFB; color: #6B7280;
    cursor: pointer; transition: all 0.18s ease;
    font-family: inherit;
  }
  .lb-guess-btn:hover:not(:disabled):not(.selected-cat):not(.selected-notcat) {
    border-color: #A5B4FC; background: #EEF2FF; color: #4F46E5;
    transform: translateY(-1px);
  }
  .lb-guess-btn.selected-cat {
    border-color: #4F46E5; background: #EEF2FF; color: #3730A3;
    box-shadow: 0 0 0 3px rgba(79,70,229,0.15);
  }
  .lb-guess-btn.selected-notcat {
    border-color: #D97706; background: #FFFBEB; color: #92400E;
    box-shadow: 0 0 0 3px rgba(217,119,6,0.15);
  }

  /* Badges */
  .lb-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px; border-radius: 999px;
    font-size: 13px; font-weight: 700; letter-spacing: -0.01em;
  }
  .lb-badge-cat    { background: #EEF2FF; color: #4338CA; border: 1.5px solid #C7D2FE; }
  .lb-badge-notcat { background: #FFF7ED; color: #C2410C; border: 1.5px solid #FED7AA; }
  .lb-badge-correct {
    background: #D1FAE5; color: #047857; border: 2px solid #6EE7B7;
    font-size: 14px; padding: 6px 14px;
    animation: lbRevealBadge 0.42s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  .lb-badge-wrong {
    background: #FEE2E2; color: #DC2626; border: 2px solid #FCA5A5;
    font-size: 14px; padding: 6px 14px;
    animation: lbWrongReveal 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
  }

  .lb-insight {
    border-left: 4px solid #4F46E5;
    background: linear-gradient(135deg, #EEF2FF, #F5F3FF);
    border-radius: 0 18px 18px 0;
    padding: 18px 22px;
  }

  .lb-scan-beam {
    position: absolute; top: 0;
    width: 22%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.55), transparent);
    animation: lbScan 1.35s ease-in-out infinite;
    pointer-events: none;
  }

  /* Step indicator */
  .lb-step-dot {
    width: 10px; height: 10px; border-radius: 50%;
    transition: all 0.35s ease; flex-shrink: 0;
  }
  .lb-step-line { flex: 1; height: 2px; transition: background 0.5s ease; min-width: 12px; }
  .lb-step-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; margin-top: 5px; transition: color 0.35s;
  }
  /* Clickable past-step labels show a subtle underline on hover */
  .lb-step-past:hover .lb-step-label { text-decoration: underline; }
  .lb-step-past:hover .lb-step-dot { transform: scale(1.35); }

  /* Photo card — draggable */
  .lb-photo-card {
    border-radius: 12px; overflow: hidden;
    cursor: grab; user-select: none; -webkit-user-select: none;
    transition: opacity 0.15s, transform 0.15s, box-shadow 0.2s, outline 0.15s;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    position: relative; background: #E5E7EB;
    aspect-ratio: 1;
  }
  .lb-photo-card:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(0,0,0,0.16); }
  .lb-photo-card.dragging { opacity: 0.28; cursor: grabbing; transform: scale(0.95); }
  .lb-photo-card.selected {
    outline: 3px solid #4F46E5; outline-offset: 2px;
    transform: scale(1.06) translateY(-2px);
    box-shadow: 0 0 0 4px rgba(79,70,229,0.18), 0 10px 28px rgba(0,0,0,0.16);
    z-index: 2;
  }
  .lb-photo-card img {
    width: 100%; height: 100%;
    object-fit: cover; object-position: center;
    display: block; pointer-events: none;
  }

  /* Drop zones */
  .lb-drop-zone {
    flex: 1; border-radius: 20px;
    border: 2.5px dashed #D1D5DB; background: #F9FAFB;
    padding: 14px; transition: border-color 0.2s, background 0.2s, transform 0.15s;
    min-height: 180px;
  }
  .lb-drop-zone.drag-over-cat   { border-color: #6366F1 !important; background: #EEF2FF !important; transform: scale(1.01); }
  .lb-drop-zone.drag-over-notcat { border-color: #F59E0B !important; background: #FFFBEB !important; transform: scale(1.01); }
  .lb-drop-zone.tap-active      { border-color: #A5B4FC; background: #F5F3FF; cursor: pointer; }
  .lb-drop-zone-header {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1.5px solid #E5E7EB;
  }

  /* Unsorted pool: strict 5-col grid */
  .lb-unsorted-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }

  /* Test / challenge image card */
  .lb-test-card {
    border-radius: 20px; overflow: hidden;
    border: 3px solid #E5E7EB; background: #fff;
    box-shadow: 0 4px 20px rgba(0,0,0,0.07);
    transition: border-color 0.35s, box-shadow 0.35s;
  }
  .lb-test-card.correct {
    border-color: #10B981;
    box-shadow: 0 0 0 4px rgba(16,185,129,0.14), 0 6px 24px rgba(0,0,0,0.07);
  }
  .lb-test-card.wrong {
    border-color: #EF4444;
    box-shadow: 0 0 0 4px rgba(239,68,68,0.16), 0 6px 24px rgba(239,68,68,0.1);
  }
  .lb-test-card .photo { width: 100%; aspect-ratio: 4/3; overflow: hidden; background: #E5E7EB; }
  .lb-test-card .photo img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
  .lb-test-card .labels { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 8px; }
  .lb-test-card .label-row { display: flex; align-items: center; justify-content: space-between; }

  /* Bottom action bar — single centered button */
  .lb-bottom-action {
    position: fixed; bottom: 0; left: 0; right: 0;
    padding: 16px 28px;
    background: rgba(255,255,255,0.94);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid rgba(0,0,0,0.07);
    box-shadow: 0 -4px 24px rgba(0,0,0,0.07);
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
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = GLOBAL_STYLES;
      document.head.appendChild(el);
    }
  }, []);
  return null;
}

// ============================================================
// STEP INDICATOR — past steps are clickable to go back
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
                  style={{ background: done || active ? 'linear-gradient(90deg,#4F46E5,#7C3AED)' : '#E5E7EB' }}
                />
              )}
              <div
                className="lb-step-dot"
                style={{
                  background: done ? '#10B981' : active ? '#4F46E5' : '#E5E7EB',
                  boxShadow: active
                    ? '0 0 0 3px rgba(79,70,229,0.25)'
                    : done
                    ? '0 0 0 3px rgba(16,185,129,0.2)'
                    : 'none',
                  transform: active ? 'scale(1.3)' : 'scale(1)',
                }}
              />
              {i < LB_STEPS.length - 1 && (
                <div
                  className="lb-step-line"
                  style={{ background: done ? 'linear-gradient(90deg,#4F46E5,#7C3AED)' : '#E5E7EB' }}
                />
              )}
            </div>
            <span
              className="lb-step-label"
              style={{ color: done ? '#10B981' : active ? '#4F46E5' : '#9CA3AF' }}
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
// BOTTOM ACTION BUTTON — single centered primary action
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
// PHOTO CARD — draggable tile used during labeling
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
          position: 'absolute', inset: 0, background: 'rgba(79,70,229,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{ background: '#4F46E5', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#fff' }}>
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
  zone, label, emoji, accentColor,
  dragOverZone, selectedId, cardsHere, currentDragId,
  onDragOver, onDragLeave, onDrop, onZoneClick, onCardDragStart, onCardDragEnd, onCardClick,
}: {
  zone: 'cat' | 'not-cat'; label: string; emoji: string; accentColor: string;
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
        <span style={{ fontWeight: 800, fontSize: 15, color: accentColor }}>{emoji} {label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: accentColor, borderRadius: 999, padding: '2px 10px' }}>
          {cardsHere.length}
        </span>
      </div>
      {cardsHere.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, minHeight: 100 }}>
          <span style={{ fontSize: 28, opacity: 0.22 }}>{emoji}</span>
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 600, width: '100%' }}>
      <div className="lb-float" style={{ fontSize: 72, marginBottom: 4, lineHeight: 1 }}>🧠</div>
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[wc1Img, bd1Img].map((src, i) => (
          <div key={i} style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', flexShrink: 0 }}>
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          </div>
        ))}
        <span style={{ fontSize: 24, color: '#9CA3AF' }}>→</span>
        <span style={{ fontSize: 40 }}>🤖</span>
        <span style={{ fontSize: 24, color: '#9CA3AF' }}>→</span>
        <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(239,68,68,0.3)', flexShrink: 0 }}>
          <img src={wd1Img} alt="white dog" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        </div>
        <span style={{ fontSize: 22 }}>❌</span>
      </div>

      <h1 className="lb-fade-up" style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, textAlign: 'center', color: '#1F2937', margin: '0 0 10px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
        Did the AI Really Learn Cats?
      </h1>
      <p className="lb-fade-up" style={{ fontSize: 17, color: '#4F46E5', fontWeight: 700, textAlign: 'center', marginBottom: 24, animationDelay: '0.1s' }}>
        An interactive lesson in Learning Bias
      </p>

      <div className="lb-card lb-fade-up" style={{ padding: '26px 30px', marginBottom: 26, animationDelay: '0.2s', width: '100%' }}>
        <p style={{ margin: '0 0 14px', color: '#374151', fontSize: 16, lineHeight: 1.65 }}>
          You're going to <strong>train an AI</strong> to recognize cats. You'll sort training images,
          watch the AI learn, and then test it on new photos.
        </p>
        <p style={{ margin: 0, color: '#374151', fontSize: 16, lineHeight: 1.65 }}>
          Sounds simple — but the AI might achieve{' '}
          <strong style={{ color: '#4F46E5' }}>100% training accuracy</strong> while learning
          the <em>completely wrong thing</em>. This is called <strong>learning bias</strong>.
        </p>
      </div>

      <div className="lb-fade-up" style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center', animationDelay: '0.3s' }}>
        {['🏷️ Sort training data', '🤖 Train AI', '🧪 Test on new images', '💡 Discover the bias'].map(item => (
          <span key={item} style={{ background: '#EEF2FF', color: '#4F46E5', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: '1.5px solid #C7D2FE' }}>
            {item}
          </span>
        ))}
      </div>

      <button className="lb-btn lb-btn-xl lb-btn-primary lb-bounce-in" style={{ animationDelay: '0.4s' }} onClick={onStart}>
        Start Training ✨
      </button>
    </div>
  );
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
      onActionChange('Some images look wrong — check your sorting', false);
    } else {
      onActionChange(`Sort all ${unsorted.length} images to continue`, false);
    }
  }, [canTrain, allSorted, allCorrect, unsorted.length, onActionChange]);

  const statusMsg   = !allSorted ? `${unsorted.length} image${unsorted.length !== 1 ? 's' : ''} remaining` : !allCorrect ? 'Check your labels — something looks off' : '✅ All correct — ready to train!';
  const statusColor = !allSorted ? '#6B7280' : !allCorrect ? '#DC2626' : '#10B981';

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
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, color: '#1F2937', margin: '0 0 6px', letterSpacing: '-0.025em' }}>
          🏷️ Sort the Training Images
        </h2>
        <p style={{ color: '#6B7280', fontSize: 15, margin: 0 }}>
          Drag images into a zone — or tap to select, then tap a zone to place. Tap a placed image to return it.
        </p>
      </div>

      {selectedId && (
        <div className="lb-fade-in" style={{ margin: '8px 0 4px', background: '#EEF2FF', border: '1.5px solid #C7D2FE', borderRadius: 12, padding: '8px 16px', fontSize: 13, color: '#4F46E5', fontWeight: 700 }}>
          📌 Image selected — tap a zone below to place it
        </div>
      )}

      {/* Unsorted pool — strict 5×2 grid */}
      <div
        className="lb-fade-up"
        style={{
          width: '100%', marginTop: 16, marginBottom: 18,
          background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)',
          border: `2px solid ${selectedId ? '#A5B4FC' : '#E2E8F0'}`,
          borderRadius: 20, padding: '16px', transition: 'border-color 0.2s', animationDelay: '0.1s',
        }}
        onDragOver={e => handleDragOver(e, 'unsorted')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('unsorted')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, color: '#4B5563', fontSize: 14 }}>📦 Unsorted Images</span>
          <span style={{ fontSize: 12, fontWeight: 700, background: unsorted.length === 0 ? '#10B981' : '#6B7280', color: '#fff', borderRadius: 999, padding: '2px 10px' }}>
            {unsorted.length === 0 ? '✓ Done!' : `${unsorted.length} remaining`}
          </span>
        </div>

        {unsorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '18px 0', color: '#10B981', fontWeight: 700, fontSize: 14 }}>
            ✅ All images sorted into zones below
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
        <DropZone zone="cat"     label="Cat"     emoji="🐱" accentColor="#4F46E5" cardsHere={inCat}    {...sharedProps} />
        <DropZone zone="not-cat" label="Not Cat" emoji="🐶" accentColor="#D97706" cardsHere={inNotCat} {...sharedProps} />
      </div>

      {allSorted && !allCorrect && (
        <div className="lb-fade-in" style={{ width: '100%', marginBottom: 12, padding: '12px 18px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span style={{ fontSize: 14, color: '#B91C1C', fontWeight: 600 }}>
            Some images might be in the wrong zone. Look carefully and try again.
          </span>
        </div>
      )}

      <div className="lb-fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animationDelay: '0.2s' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>{statusMsg}</span>
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
      <h2 className="lb-fade-up" style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, color: '#1F2937', margin: '0 0 6px', letterSpacing: '-0.025em', textAlign: 'center' }}>
        {step < 4 ? '🤖 Training AI...' : '🎉 Training Complete!'}
      </h2>
      <p className="lb-fade-up" style={{ color: '#6B7280', fontSize: 15, marginBottom: 28, textAlign: 'center', animationDelay: '0.1s' }}>
        {step < 4 ? 'Analyzing patterns in your sorted images' : 'The AI has learned from your dataset'}
      </p>

      <div className="lb-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, width: '100%', marginBottom: 24, position: 'relative', padding: 14, background: '#F9FAFB', borderRadius: 18, border: '1.5px solid #E5E7EB', overflow: 'hidden', animationDelay: '0.15s' }}>
        {step < 4 && <div className="lb-scan-beam" />}
        {TRAINING_IMAGES.map((card, i) => (
          <div key={card.id} style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', animation: `lbFadeUp 0.3s ease ${i * 0.04}s both`, position: 'relative' }}>
            <img src={card.src} alt={`${card.color} ${card.type}`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '3px 4px', background: card.correctLabel === 'cat' ? 'rgba(79,70,229,0.85)' : 'rgba(217,119,6,0.85)', textAlign: 'center' }}>
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
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: done ? '#10B981' : active ? '#4F46E5' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s' }}>
                    {done ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7L6.5 10.5L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : active ? <div className="lb-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' }} />
                      : <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>{i + 1}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: done ? '#10B981' : active ? '#4F46E5' : '#9CA3AF' }}>{label}</span>
                      {done && <span style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>Loss: 0.{i === 0 ? '38' : i === 1 ? '12' : '02'}</span>}
                    </div>
                    <div style={{ height: 4, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: done ? '#10B981' : active ? 'linear-gradient(90deg,#4F46E5,#7C3AED)' : 'transparent', width: done ? '100%' : active ? '60%' : '0%', transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step >= 4 && (
        <div className="lb-card lb-success-glow" style={{ width: '100%', padding: '32px', textAlign: 'center', background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', border: '2px solid #6EE7B7', marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#059669', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Training Result</p>
          <div style={{ animation: 'lbCountUp 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: '#10B981', lineHeight: 1, display: 'block', letterSpacing: '-0.04em' }}>100%</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 16, color: '#047857', fontWeight: 700 }}>Training Accuracy 🎉</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#059669' }}>The AI correctly classified all {TRAINING_IMAGES.length} training images!</p>
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
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>True label</span>
          <span className={`lb-badge ${card.trueLabel === 'cat' ? 'lb-badge-cat' : 'lb-badge-notcat'}`} style={{ fontSize: 11 }}>
            {card.trueLabel === 'cat' ? '🐱 Cat' : '🐶 Not Cat'}
          </span>
        </div>
        <div className="label-row">
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>AI says</span>
          {show ? (
            <span className={`lb-badge ${isCorrect ? 'lb-badge-correct' : 'lb-badge-wrong'}`} style={{ fontSize: 12 }}>
              {card.aiPrediction === 'cat' ? '🐱 Cat' : '🐶 Not Cat'} {isCorrect ? '✅' : '❌'}
            </span>
          ) : (
            <span className="lb-pulse" style={{ fontSize: 20, lineHeight: 1 }}>❓</span>
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
      <h2 className="lb-fade-up" style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, color: '#1F2937', margin: '0 0 6px', letterSpacing: '-0.025em', textAlign: 'center' }}>
        🤖 Testing the AI
      </h2>
      <p className="lb-fade-up" style={{ color: '#6B7280', fontSize: 15, marginBottom: 28, textAlign: 'center', animationDelay: '0.1s' }}>
        The AI now sees images it has <em>never seen before</em>…
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, width: '100%', marginBottom: 24 }}>
        {TEST_IMAGES.map((card, i) => (
          <TestCard key={card.id} card={card} revealed={revealed} revealDelay={i * 700} />
        ))}
      </div>

      {showSummary && (
        <div className="lb-card lb-scale-in lb-success-glow" style={{ width: '100%', padding: '24px 28px', marginBottom: 20, background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', border: '2px solid #6EE7B7', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#047857' }}>2 / 2 correct!</h3>
          <p style={{ margin: '0 0 6px', fontSize: 15, color: '#065F46', lineHeight: 1.6 }}>The AI correctly identified the white cat and black dog. Looks like a success…</p>
          <p style={{ margin: 0, fontSize: 14, color: '#059669', fontWeight: 600 }}>But what about images with different colors?</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PHASE: CHALLENGE — interactive guess + AI reveal
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
      <h2 className="lb-fade-up" style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, color: '#1F2937', margin: '0 0 6px', letterSpacing: '-0.025em', textAlign: 'center' }}>
        🤔 The Real Test
      </h2>
      <p className="lb-fade-up" style={{ color: '#6B7280', fontSize: 15, marginBottom: 8, textAlign: 'center', animationDelay: '0.1s' }}>
        {challengeState === 'guessing'
          ? 'Before running the AI — what do you think it will predict?'
          : challengeState === 'scanning'
          ? 'AI analyzing images…'
          : "Here's what the AI actually predicted."}
      </p>

      {challengeState === 'guessing' && (
        <div className="lb-insight lb-fade-up" style={{ width: '100%', marginBottom: 20, animationDelay: '0.15s' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
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
              {/* Image — always visible */}
              <div className="photo" style={{ position: 'relative' }}>
                <img src={card.src} alt={`${card.color} ${card.type}`} />
                {/* Scanning overlay */}
                {isScanning && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(99,102,241,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', top: 0, width: '28%', height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)',
                      animation: 'lbScan 1.1s ease-in-out infinite',
                    }} />
                  </div>
                )}
                {/* Wrong badge after reveal */}
                {isRevealed && (
                  <div className="lb-bounce-in" style={{
                    position: 'absolute', top: 10, right: 10,
                    background: '#EF4444', borderRadius: '50%',
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 900, color: '#fff',
                    boxShadow: '0 2px 10px rgba(239,68,68,0.45)',
                  }}>
                    ✕
                  </div>
                )}
              </div>

              {/* Labels / guess area */}
              <div className="labels">
                {/* True label — always shown */}
                <div className="label-row">
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>True label</span>
                  <span className={`lb-badge ${card.trueLabel === 'cat' ? 'lb-badge-cat' : 'lb-badge-notcat'}`} style={{ fontSize: 11 }}>
                    {card.trueLabel === 'cat' ? '🐱 Cat' : '🐶 Not Cat'}
                  </span>
                </div>

                {/* User guess row */}
                {challengeState === 'guessing' && (
                  <div>
                    <p style={{ margin: '4px 0 8px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                      What will the AI predict?
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className={`lb-guess-btn${guess === 'cat' ? ' selected-cat' : ''}`}
                        onClick={() => handleGuess(card.id, 'cat')}
                      >
                        🐱 Cat
                      </button>
                      <button
                        className={`lb-guess-btn${guess === 'not-cat' ? ' selected-notcat' : ''}`}
                        onClick={() => handleGuess(card.id, 'not-cat')}
                      >
                        🐶 Not Cat
                      </button>
                    </div>
                    {guess && (
                      <p className="lb-fade-in" style={{ margin: '6px 0 0', fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
                        Your guess: <strong>{guess === 'cat' ? '🐱 Cat' : '🐶 Not Cat'}</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Scanning state */}
                {isScanning && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '4px 0' }}>
                    <div className="lb-spin" style={{ width: 14, height: 14, border: '2px solid #C7D2FE', borderTopColor: '#4F46E5', borderRadius: '50%' }} />
                    <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>AI analyzing…</span>
                  </div>
                )}

                {/* Revealed: AI prediction */}
                {isRevealed && (
                  <div className="label-row">
                    <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>AI says</span>
                    <span className="lb-badge lb-badge-wrong" style={{ fontSize: 12 }}>
                      {card.aiPrediction === 'cat' ? '🐱 Cat' : '🐶 Not Cat'} ❌
                    </span>
                  </div>
                )}

                {/* Revealed: did user predict correctly? */}
                {isRevealed && guess !== undefined && (
                  <div style={{ marginTop: 4, textAlign: 'center' }}>
                    {guessedRight ? (
                      <span className="lb-fade-in" style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>
                        ✓ You predicted correctly!
                      </span>
                    ) : (
                      <span className="lb-fade-in" style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>
                        You guessed {guess === 'cat' ? '🐱 Cat' : '🐶 Not Cat'}
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
          <div style={{ background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)', border: '2px solid #FCA5A5', borderRadius: 20, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 38, flexShrink: 0 }}>😱</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#DC2626', marginBottom: 4 }}>2 out of 2 wrong!</div>
              <div style={{ fontSize: 14, color: '#B91C1C', lineHeight: 1.55 }}>
                The AI completely failed — it ignored the animal and went by something else entirely.
              </div>
            </div>
          </div>

          {/* Visual shortcut explanation — revealed only after banner */}
          {showExplanation && (
            <div className="lb-card lb-fade-in" style={{ padding: '20px 22px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                💡 What the AI was actually doing
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {CHALLENGE_IMAGES.map((card, i) => (
                  <div key={card.id} style={{
                    display: 'grid', gridTemplateColumns: '52px 1fr 1fr', alignItems: 'center', gap: 14,
                    padding: '12px 14px', borderRadius: 14,
                    background: '#FFF1F2', border: '1.5px solid #FECDD3',
                    animation: `lbFadeUp 0.4s ease ${i * 0.15}s both`,
                  }}>
                    <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                      <img src={card.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 2 }}>Human sees</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#374151' }}>
                        {card.type === 'dog' ? '🐕 Dog' : '🐱 Cat'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 2 }}>AI shortcut</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>
                        {card.color === 'white' ? '⬜ White → Cat ❌' : '⬛ Black → Not Cat ❌'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
                The AI never learned what a cat <em>is</em> — it learned what color they <em>were</em> in training.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
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

  const insights = [
    { icon: '🗄️', title: 'Skewed training data',        text: 'Every training cat was white. Every training dog was black. No exceptions.' },
    { icon: '🔗', title: 'Perfect spurious correlation', text: 'Color was 100% correlated with the label — an irresistible shortcut for the model.' },
    { icon: '⚡', title: 'AI chose the easy path',       text: 'The model learned the simplest rule that fit the data. Real cat features were never needed.' },
    { icon: '📊', title: '100% accuracy ≠ understanding', text: 'Perfect training accuracy just means the AI fit your data — not that it learned the right concept.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 660, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>💡</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 900, color: '#1F2937', margin: '0 0 10px', letterSpacing: '-0.03em' }}>
          The AI didn't learn "cat."
        </h2>
        <p style={{ fontSize: 17, color: '#4F46E5', fontWeight: 700, margin: 0 }}>
          It learned the shortcut: <strong>white = cat, black = not cat.</strong>
        </p>
      </div>

      <div className="lb-card lb-fade-up" style={{ width: '100%', padding: '22px 26px', marginBottom: 20, background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border: '2px solid #FDE68A' }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🎓 This is called Learning Bias
        </p>
        <p style={{ margin: 0, fontSize: 15, color: '#78350F', lineHeight: 1.65 }}>
          <strong>Learning bias</strong> happens when an AI picks up a shortcut pattern instead of the true concept. Because the training data had a perfect color correlation, the model had no reason to look deeper — it achieved 100% accuracy without ever understanding what a cat is.
        </p>
      </div>

      {visStep >= 1 && (
        <div className="lb-card lb-scale-in" style={{ width: '100%', padding: '20px 22px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What the AI's rule predicts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { src: wc6Img, label: 'White Cat',  result: 'Cat',     correct: true  },
              { src: bd6Img, label: 'Black Dog',  result: 'Not Cat', correct: true  },
              { src: wd1Img, label: 'White Dog',  result: 'Cat',     correct: false },
              { src: bc1Img, label: 'Black Cat',  result: 'Not Cat', correct: false },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: row.correct ? '#F0FDF4' : '#FFF1F2', border: `1.5px solid ${row.correct ? '#BBF7D0' : '#FECDD3'}`, animation: `lbFadeUp 0.4s ease ${i * 0.1}s both` }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={row.src} alt={row.label} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
                </div>
                <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600, minWidth: 88 }}>{row.label}</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>AI sees color →</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{row.result}</span>
                </div>
                <span style={{ fontSize: 16 }}>{row.correct ? '✅' : '❌'}</span>
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
            <div style={{ fontSize: 24, marginBottom: 6 }}>{ins.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1F2937', marginBottom: 4 }}>{ins.title}</div>
            <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.55 }}>{ins.text}</div>
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
  const keyLessons = [
    { icon: '⚡', title: 'AI takes shortcuts',        text: 'Models learn the easiest pattern that fits the data — not necessarily the true concept.', color: '#4F46E5' },
    { icon: '📊', title: 'Accuracy can deceive',       text: '100% training accuracy only means the model fit that dataset. It says nothing about real understanding.', color: '#10B981' },
    { icon: '🌈', title: 'Diversity breaks shortcuts', text: 'Varied examples (black cats, white dogs) force the model to learn real distinguishing features.', color: '#F59E0B' },
    { icon: '🔍', title: 'Test out-of-distribution',   text: 'Always validate on data that differs from training to reveal what the model truly learned.', color: '#EF4444' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 660, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="lb-float" style={{ fontSize: 64, marginBottom: 12, display: 'block' }}>🏆</div>
        <h2 className="lb-fade-up" style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 900, color: '#1F2937', margin: '0 0 10px', letterSpacing: '-0.03em' }}>
          You discovered learning bias!
        </h2>
        <p className="lb-fade-up" style={{ color: '#6B7280', fontSize: 16, margin: 0, animationDelay: '0.1s' }}>Here's what you learned today</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, width: '100%', marginBottom: 28 }}>
        {keyLessons.map((lesson, i) => (
          <div key={i} className="lb-card lb-card-hover lb-fade-up" style={{ padding: '20px', animation: `lbFadeUp 0.5s ease ${0.1 + i * 0.1}s both`, borderTop: `3px solid ${lesson.color}` }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{lesson.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#1F2937', marginBottom: 6 }}>{lesson.title}</div>
            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.55 }}>{lesson.text}</div>
          </div>
        ))}
      </div>

      <div className="lb-card lb-fade-up" style={{ width: '100%', padding: '20px 24px', marginBottom: 28, background: 'linear-gradient(135deg, #1F2937, #111827)', animationDelay: '0.5s' }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Real-world examples of learning bias
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { e: '🏥', t: "Medical AI trained on one hospital's data predicting poorly for patients elsewhere with different demographics." },
            { e: '📷', t: "Image classifiers learning to detect \"wolf\" from snow in the background, not the animal's actual features." },
            { e: '💼', t: 'Hiring models associating short résumés with rejection because junior roles historically used brief formats.' },
            { e: '🌍', t: 'Translation models performing worse on low-resource languages because training data skewed toward English.' },
          ].map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{ex.e}</span>
              <span style={{ fontSize: 13, color: '#D1D5DB', lineHeight: 1.55 }}>{ex.t}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="lb-btn lb-btn-lg lb-btn-primary lb-bounce-in" onClick={onRestart} style={{ minWidth: 180 }}>
          🔄 Play Again
        </button>
        <a href="https://en.wikipedia.org/wiki/Inductive_bias" target="_blank" rel="noopener noreferrer" className="lb-btn lb-btn-lg lb-btn-outline" style={{ minWidth: 180, textDecoration: 'none' }}>
          📖 Learn More
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

  // Step indicator click — only allows going back to completed steps
  function handleStepClick(stepIdx: number) {
    const currentStepIdx = stepMap[phase];
    if (currentStepIdx !== undefined && stepIdx < currentStepIdx) {
      advance(STEP_TO_PHASE[stepIdx]);
    }
  }

  const stepMap: Record<GamePhase, number> = {
    intro: -1, labeling: 0, training: 1, test: 2, challenge: 3, explanation: 4, complete: 4,
  };

  const showNav = phase !== 'intro' && phase !== 'complete';

  return (
    <div
      className="lb"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #EEF2FF 0%, #F5F3FF 40%, #FDF4FF 80%, #FFF0F6 100%)',
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
