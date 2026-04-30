import { useState, useEffect, type ReactNode } from 'react';

// ============================================================
// TYPES
// ============================================================
type GamePhase =
  | 'intro'
  | 'labeling'
  | 'training'
  | 'reveal'
  | 'explanation'
  | 'fix-intro'
  | 'fix-labeling'
  | 'fix-training'
  | 'fix-reveal'
  | 'complete';

interface AnimalCard {
  id: string;
  type: 'cat' | 'dog';
  color: 'white' | 'black';
  label: 'cat' | 'not-cat';      // correct label (ground truth)
  userLabel?: 'cat' | 'not-cat'; // what the user chose
  labeled: boolean;               // user has made any selection
}

interface TestCard {
  id: string;
  type: 'cat' | 'dog';
  color: 'white' | 'black';
  trueLabel: 'cat' | 'not-cat';
  aiPrediction: 'cat' | 'not-cat';
}

// ============================================================
// GAME DATA
// ============================================================
const TRAINING_R1: AnimalCard[] = [
  { id: 'wc1', type: 'cat', color: 'white', label: 'cat',     labeled: false },
  { id: 'wc2', type: 'cat', color: 'white', label: 'cat',     labeled: false },
  { id: 'wc3', type: 'cat', color: 'white', label: 'cat',     labeled: false },
  { id: 'wc4', type: 'cat', color: 'white', label: 'cat',     labeled: false },
  { id: 'wc5', type: 'cat', color: 'white', label: 'cat',     labeled: false },
  { id: 'bd1', type: 'dog', color: 'black', label: 'not-cat', labeled: false },
  { id: 'bd2', type: 'dog', color: 'black', label: 'not-cat', labeled: false },
  { id: 'bd3', type: 'dog', color: 'black', label: 'not-cat', labeled: false },
  { id: 'bd4', type: 'dog', color: 'black', label: 'not-cat', labeled: false },
  { id: 'bd5', type: 'dog', color: 'black', label: 'not-cat', labeled: false },
];

const TEST_R1: TestCard[] = [
  { id: 'wc', type: 'cat',  color: 'white', trueLabel: 'cat',     aiPrediction: 'cat'     }, // ✅ correct
  { id: 'bd', type: 'dog',  color: 'black', trueLabel: 'not-cat', aiPrediction: 'not-cat' }, // ✅ correct
  { id: 'bc', type: 'cat',  color: 'black', trueLabel: 'cat',     aiPrediction: 'not-cat' }, // ❌ wrong
  { id: 'wd', type: 'dog',  color: 'white', trueLabel: 'not-cat', aiPrediction: 'cat'     }, // ❌ wrong
];

const TRAINING_R2: AnimalCard[] = [
  { id: 'wc-r2', type: 'cat', color: 'white', label: 'cat', labeled: false },
  { id: 'bc-r2', type: 'cat', color: 'black', label: 'cat', labeled: false },
  { id: 'wd-r2', type: 'dog', color: 'white', label: 'not-cat', labeled: false },
  { id: 'bd-r2', type: 'dog', color: 'black', label: 'not-cat', labeled: false },
];

const TEST_R2: TestCard[] = [
  { id: 'wc2', type: 'cat', color: 'white', trueLabel: 'cat',     aiPrediction: 'cat'     }, // ✅
  { id: 'bd2', type: 'dog', color: 'black', trueLabel: 'not-cat', aiPrediction: 'not-cat' }, // ✅
  { id: 'bc2', type: 'cat', color: 'black', trueLabel: 'cat',     aiPrediction: 'cat'     }, // ✅ now fixed
  { id: 'wd2', type: 'dog', color: 'white', trueLabel: 'not-cat', aiPrediction: 'not-cat' }, // ✅ now fixed
];

// ============================================================
// STYLES
// ============================================================
const GLOBAL_STYLES = `
  .ab * { box-sizing: border-box; }
  .ab { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }

  @keyframes abFadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes abFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes abScaleIn {
    from { opacity: 0; transform: scale(0.65); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes abBounceIn {
    0%   { opacity: 0; transform: scale(0.3); }
    50%  { transform: scale(1.08); }
    75%  { transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes abScan {
    0%   { left: -20%; opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { left: 120%; opacity: 0; }
  }
  @keyframes abProgressBar {
    from { width: 0%; }
    to   { width: 100%; }
  }
  @keyframes abCountUp {
    0%   { opacity: 0; transform: scale(0.2) rotate(-15deg); }
    60%  { transform: scale(1.15) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes abShake {
    0%,100% { transform: translateX(0); }
    20%,60% { transform: translateX(-8px); }
    40%,80% { transform: translateX(8px); }
  }
  @keyframes abCheckPop {
    0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
    60%  { transform: scale(1.3) rotate(5deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes abSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes abPulse {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.35; }
  }
  @keyframes abGlow {
    0%,100% { box-shadow: 0 0 20px rgba(79,70,229,0.25); }
    50%     { box-shadow: 0 0 50px rgba(79,70,229,0.65), 0 0 80px rgba(124,58,237,0.3); }
  }
  @keyframes abSuccessGlow {
    0%,100% { box-shadow: 0 0 20px rgba(16,185,129,0.25); }
    50%     { box-shadow: 0 0 50px rgba(16,185,129,0.6), 0 0 80px rgba(5,150,105,0.3); }
  }
  @keyframes abFloat {
    0%,100% { transform: translateY(0px) rotate(-2deg); }
    50%     { transform: translateY(-12px) rotate(2deg); }
  }
  @keyframes abRevealBadge {
    0%   { opacity: 0; transform: translateY(-10px) scale(0.75); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes abWiggle {
    0%,100% { transform: rotate(0deg); }
    25%     { transform: rotate(-8deg); }
    75%     { transform: rotate(8deg); }
  }
  @keyframes abRipple {
    0%   { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes abSlideInRight {
    from { opacity: 0; transform: translateX(30px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .ab-fade-up   { animation: abFadeUp 0.55s ease both; }
  .ab-fade-in   { animation: abFadeIn 0.4s ease both; }
  .ab-scale-in  { animation: abScaleIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
  .ab-bounce-in { animation: abBounceIn 0.6s cubic-bezier(0.36,0.07,0.19,0.97) both; }
  .ab-float     { animation: abFloat 3.5s ease-in-out infinite; }
  .ab-glow      { animation: abGlow 2.5s ease-in-out infinite; }
  .ab-success-glow { animation: abSuccessGlow 2.5s ease-in-out infinite; }
  .ab-shake     { animation: abShake 0.55s ease; }
  .ab-spin      { animation: abSpin 0.9s linear infinite; }
  .ab-pulse     { animation: abPulse 1.6s ease-in-out infinite; }
  .ab-wiggle    { animation: abWiggle 0.5s ease-in-out; }
  .ab-slide-right { animation: abSlideInRight 0.4s ease both; }

  .ab-card {
    background: #fff;
    border-radius: 22px;
    box-shadow: 0 4px 28px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }
  .ab-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 36px rgba(0,0,0,0.11), 0 2px 8px rgba(0,0,0,0.06);
  }

  .ab-animal-card {
    border: 3px solid transparent;
    border-radius: 20px;
    background: #fff;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: 0 3px 18px rgba(0,0,0,0.08);
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .ab-animal-card:hover:not(.labeled) {
    border-color: #A5B4FC;
    transform: translateY(-4px);
    box-shadow: 0 10px 28px rgba(99,102,241,0.18);
  }
  .ab-animal-card.labeled {
    border-color: #10B981;
    cursor: default;
  }

  .ab-btn {
    border: none; cursor: pointer; font-weight: 700;
    border-radius: 14px; letter-spacing: -0.01em;
    transition: all 0.22s ease;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    font-family: inherit; line-height: 1;
  }
  .ab-btn:hover:not(:disabled) { transform: translateY(-2px); }
  .ab-btn:active:not(:disabled) { transform: translateY(0px) scale(0.97); }
  .ab-btn:disabled { opacity: 0.42; cursor: not-allowed; transform: none !important; }

  .ab-btn-xl  { font-size: 18px; padding: 17px 36px; border-radius: 16px; }
  .ab-btn-lg  { font-size: 16px; padding: 14px 28px; }
  .ab-btn-md  { font-size: 14px; padding: 10px 20px; }
  .ab-btn-sm  { font-size: 13px; padding: 8px 14px; border-radius: 10px; }

  .ab-btn-primary {
    background: linear-gradient(135deg, #4F46E5, #7C3AED);
    color: #fff;
    box-shadow: 0 4px 16px rgba(79,70,229,0.38);
  }
  .ab-btn-primary:hover:not(:disabled) {
    box-shadow: 0 7px 24px rgba(79,70,229,0.55);
    background: linear-gradient(135deg, #4338CA, #6D28D9);
  }
  .ab-btn-success {
    background: linear-gradient(135deg, #10B981, #059669);
    color: #fff;
    box-shadow: 0 4px 16px rgba(16,185,129,0.38);
  }
  .ab-btn-success:hover:not(:disabled) {
    box-shadow: 0 7px 24px rgba(16,185,129,0.5);
  }
  .ab-btn-warning {
    background: linear-gradient(135deg, #F59E0B, #D97706);
    color: #fff;
    box-shadow: 0 4px 16px rgba(245,158,11,0.38);
  }
  .ab-btn-outline {
    background: #fff;
    color: #4F46E5;
    border: 2.5px solid #4F46E5;
    box-shadow: 0 2px 8px rgba(79,70,229,0.1);
  }
  .ab-btn-outline:hover:not(:disabled) {
    background: #EEF2FF;
    box-shadow: 0 4px 14px rgba(79,70,229,0.2);
  }
  .ab-btn-ghost {
    background: rgba(255,255,255,0.7);
    color: #6B7280;
    border: 2px solid #E5E7EB;
  }
  .ab-btn-ghost:hover:not(:disabled) {
    background: #F9FAFB;
    color: #374151;
  }

  .ab-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 13px; border-radius: 999px;
    font-size: 13px; font-weight: 700; letter-spacing: -0.01em;
  }
  .ab-badge-cat    { background: #EEF2FF; color: #4338CA; border: 1.5px solid #C7D2FE; }
  .ab-badge-notcat { background: #FFF7ED; color: #C2410C; border: 1.5px solid #FED7AA; }
  .ab-badge-wrong  {
    background: #FEE2E2; color: #DC2626; border: 2px solid #FCA5A5;
    font-size: 15px; padding: 7px 16px;
    animation: abRevealBadge 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  .ab-badge-correct {
    background: #D1FAE5; color: #047857; border: 2px solid #6EE7B7;
    font-size: 15px; padding: 7px 16px;
    animation: abRevealBadge 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
  }

  .ab-insight {
    border-left: 4px solid #4F46E5;
    background: linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%);
    border-radius: 0 18px 18px 0;
    padding: 20px 24px;
  }

  .ab-scan-beam {
    position: absolute;
    top: 0;
    width: 22%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.55), transparent);
    animation: abScan 1.4s ease-in-out infinite;
    pointer-events: none;
  }

  .ab-step-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    transition: all 0.35s ease;
    flex-shrink: 0;
  }
  .ab-step-line {
    flex: 1; height: 2px;
    transition: background 0.5s ease;
    min-width: 12px;
  }
  .ab-step-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; margin-top: 5px;
    transition: color 0.35s;
  }

  .ab-guess-option {
    border: 2.5px solid #E5E7EB;
    border-radius: 16px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.22s ease;
    background: #fff;
    text-align: left;
    width: 100%;
    font-family: inherit;
    display: flex; align-items: center; gap: 14px;
  }
  .ab-guess-option:hover { border-color: #A5B4FC; background: #EEF2FF; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99,102,241,0.13); }
  .ab-guess-option.selected-color  { border-color: #4F46E5; background: #EEF2FF; box-shadow: 0 6px 20px rgba(79,70,229,0.2); }
  .ab-guess-option.selected-shape  { border-color: #10B981; background: #ECFDF5; box-shadow: 0 6px 20px rgba(16,185,129,0.2); }
  .ab-guess-option.selected-random { border-color: #F59E0B; background: #FFFBEB; box-shadow: 0 6px 20px rgba(245,158,11,0.2); }

  .ab-ripple {
    position: absolute; border-radius: 50%;
    width: 100%; padding-top: 100%;
    background: rgba(16,185,129,0.3);
    animation: abRipple 1s ease-out infinite;
    pointer-events: none;
  }

  .ab-progress-bar-track {
    background: #E5E7EB;
    border-radius: 999px;
    overflow: hidden;
    height: 10px;
    position: relative;
  }
  .ab-progress-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #6366F1, #8B5CF6, #A78BFA);
    background-size: 200% 100%;
    animation: abProgressBar 2.8s cubic-bezier(0.4,0,0.2,1) both;
  }

  .ab-color-swatch {
    width: 28px; height: 28px;
    border-radius: 8px;
    flex-shrink: 0;
    border: 2px solid rgba(0,0,0,0.12);
  }

  @media (max-width: 600px) {
    .ab-btn-xl { font-size: 16px; padding: 14px 26px; }
    .ab-btn-lg { font-size: 15px; padding: 12px 22px; }
    .ab-grid-2-force { grid-template-columns: repeat(2, 1fr) !important; }
    .ab-grid-3-force { grid-template-columns: repeat(3, 1fr) !important; }
  }
`;

// ============================================================
// STYLE INJECTOR
// ============================================================
function StyleInjector() {
  useEffect(() => {
    const id = 'ab-game-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = GLOBAL_STYLES;
      document.head.appendChild(style);
    }
  }, []);
  return null;
}

// ============================================================
// SVG ANIMALS
// ============================================================
function CatSVG({ color }: { color: 'white' | 'black' }) {
  const f  = color === 'white' ? '#F5F0DE' : '#232323';
  const s  = color === 'white' ? '#C4A882' : '#4A4A4A';
  const ie = color === 'white' ? '#FFB3C6' : '#7D3050';
  const ey = color === 'white' ? '#3A8C3A' : '#66BB6A';
  const wh = color === 'white' ? '#C4B090' : '#666';
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
      {/* Ears */}
      <polygon points="17,52 32,10 48,52" fill={f} stroke={s} strokeWidth="2.5" strokeLinejoin="round"/>
      <polygon points="23,50 32,20 42,50" fill={ie}/>
      <polygon points="72,52 88,10 103,52" fill={f} stroke={s} strokeWidth="2.5" strokeLinejoin="round"/>
      <polygon points="78,50 88,20 98,50" fill={ie}/>
      {/* Head */}
      <circle cx="60" cy="70" r="42" fill={f} stroke={s} strokeWidth="2.5"/>
      {/* Eyes */}
      <ellipse cx="43" cy="64" rx="8" ry="9.5" fill={ey}/>
      <ellipse cx="77" cy="64" rx="8" ry="9.5" fill={ey}/>
      <ellipse cx="43" cy="64" rx="4" ry="9.5" fill="#111"/>
      <ellipse cx="77" cy="64" rx="4" ry="9.5" fill="#111"/>
      <circle cx="46" cy="59.5" r="2.5" fill="white"/>
      <circle cx="80" cy="59.5" r="2.5" fill="white"/>
      {/* Nose */}
      <path d="M57 77 L60 73 L63 77 Z" fill="#E8748A"/>
      {/* Mouth */}
      <path d="M57,77 Q52,83 48,81" stroke={s} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M63,77 Q68,83 72,81" stroke={s} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {/* Whiskers */}
      <line x1="4" y1="73" x2="50" y2="72" stroke={wh} strokeWidth="1.3"/>
      <line x1="4" y1="79" x2="50" y2="78" stroke={wh} strokeWidth="1.3"/>
      <line x1="70" y1="72" x2="116" y2="73" stroke={wh} strokeWidth="1.3"/>
      <line x1="70" y1="78" x2="116" y2="79" stroke={wh} strokeWidth="1.3"/>
    </svg>
  );
}

function DogSVG({ color }: { color: 'white' | 'black' }) {
  const f  = color === 'white' ? '#F2E8D2' : '#242424';
  const s  = color === 'white' ? '#B8945A' : '#4A4A4A';
  const sn = color === 'white' ? '#E8D5A8' : '#343434';
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
      {/* Floppy ears */}
      <ellipse cx="22" cy="60" rx="18" ry="26" fill={f} stroke={s} strokeWidth="2.5"/>
      <ellipse cx="98" cy="60" rx="18" ry="26" fill={f} stroke={s} strokeWidth="2.5"/>
      {/* Head */}
      <circle cx="60" cy="55" r="38" fill={f} stroke={s} strokeWidth="2.5"/>
      {/* Snout */}
      <ellipse cx="60" cy="72" rx="20" ry="14" fill={sn} stroke={s} strokeWidth="1.8"/>
      {/* Eyes */}
      <circle cx="44" cy="49" r="8" fill="#1A1200"/>
      <circle cx="76" cy="49" r="8" fill="#1A1200"/>
      <circle cx="46.5" cy="46" r="2.5" fill="white"/>
      <circle cx="78.5" cy="46" r="2.5" fill="white"/>
      <circle cx="44" cy="49" r="4" fill="#5C3D1E"/>
      <circle cx="76" cy="49" r="4" fill="#5C3D1E"/>
      <circle cx="46.5" cy="46" r="2" fill="white"/>
      <circle cx="78.5" cy="46" r="2" fill="white"/>
      {/* Nose */}
      <ellipse cx="60" cy="66" rx="9" ry="6.5" fill="#1A1200"/>
      <ellipse cx="57.5" cy="64.5" rx="2" ry="1.5" fill="#444"/>
      {/* Mouth */}
      <line x1="60" y1="72.5" x2="60" y2="79" stroke={s} strokeWidth="2" strokeLinecap="round"/>
      <path d="M50,79 Q60,87 70,79" stroke={s} strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Eyebrow marks */}
      <line x1="38" y1="39" x2="50" y2="40.5" stroke={s} strokeWidth="2" strokeLinecap="round"/>
      <line x1="70" y1="40.5" x2="82" y2="39" stroke={s} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function AnimalDisplay({ type, color, size = 90 }: { type: 'cat' | 'dog'; color: 'white' | 'black'; size?: number }) {
  const bg = color === 'white'
    ? 'radial-gradient(circle at 40% 40%, #FFFEF5, #F0EDD8)'
    : 'radial-gradient(circle at 40% 40%, #3A3A3A, #1A1A1A)';
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: bg,
      border: `2px solid ${color === 'white' ? '#E5D5B0' : '#555'}`,
      padding: size * 0.06,
      flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {type === 'cat' ? <CatSVG color={color} /> : <DogSVG color={color} />}
    </div>
  );
}

// ============================================================
// STEP INDICATOR
// ============================================================
const STEPS = ['Label Data', 'Train AI', 'Test', 'Lesson', 'Fix Data'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, marginBottom: 32, maxWidth: 520, width: '100%' }}>
      {STEPS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {i > 0 && (
                <div className="ab-step-line" style={{
                  background: done || active ? 'linear-gradient(90deg,#4F46E5,#7C3AED)' : '#E5E7EB',
                }}/>
              )}
              <div className="ab-step-dot" style={{
                background: done ? '#10B981' : active ? '#4F46E5' : '#E5E7EB',
                boxShadow: active ? '0 0 0 3px rgba(79,70,229,0.25)' : done ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
                transform: active ? 'scale(1.3)' : 'scale(1)',
              }}/>
              {i < STEPS.length - 1 && (
                <div className="ab-step-line" style={{
                  background: done ? 'linear-gradient(90deg,#4F46E5,#7C3AED)' : '#E5E7EB',
                }}/>
              )}
            </div>
            <span className="ab-step-label" style={{
              color: done ? '#10B981' : active ? '#4F46E5' : '#9CA3AF',
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// ANIMAL CARD (interactive, for labeling phases)
// ============================================================
function AnimalCardItem({
  card, onLabel
}: {
  card: AnimalCard;
  onLabel: (id: string, label: 'cat' | 'not-cat') => void;
}) {
  const colorLabel  = card.color === 'white' ? 'White' : 'Black';
  const typeLabel   = card.type  === 'cat'   ? 'Cat'   : 'Dog';
  const isCorrect   = card.labeled && card.userLabel === card.label;
  const isWrong     = card.labeled && card.userLabel !== card.label;

  const bgGrad = card.color === 'white'
    ? 'linear-gradient(160deg, #FFFEF8 0%, #F5EDD8 100%)'
    : 'linear-gradient(160deg, #2E2E2E 0%, #1A1A1A 100%)';
  const textColor = card.color === 'black' ? '#E5E7EB' : '#374151';

  // Border and shadow based on validation state
  const borderColor = isCorrect ? '#10B981' : isWrong ? '#EF4444' : 'transparent';
  const cardShadow  = isCorrect
    ? '0 0 0 3px rgba(16,185,129,0.18), 0 4px 18px rgba(16,185,129,0.12)'
    : isWrong
    ? '0 0 0 3px rgba(239,68,68,0.18), 0 4px 18px rgba(239,68,68,0.12)'
    : '0 3px 18px rgba(0,0,0,0.08)';

  return (
    <div
      className="ab-animal-card"
      style={{
        userSelect: 'none',
        border: `3px solid ${borderColor}`,
        boxShadow: cardShadow,
        cursor: 'default',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
      aria-label={`${colorLabel} ${typeLabel}`}
    >
      {/* Illustration */}
      <div style={{
        background: bgGrad,
        padding: '18px 14px 12px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        position: 'relative',
      }}>
        <div style={{ width: 80, height: 80 }}>
          {card.type === 'cat' ? <CatSVG color={card.color}/> : <DogSVG color={card.color}/>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: textColor, opacity: 0.75, letterSpacing: '0.02em' }}>
          {colorLabel} {typeLabel}
        </span>

        {/* State badge: top-right corner */}
        {isCorrect && (
          <div className="ab-fade-in" style={{
            position: 'absolute', top: 8, right: 8,
            width: 26, height: 26, borderRadius: '50%',
            background: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'abCheckPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            boxShadow: '0 2px 8px rgba(16,185,129,0.45)',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2.5 6.5L5.5 9.5L10.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        {isWrong && (
          <div className="ab-fade-in" style={{
            position: 'absolute', top: 8, right: 8,
            width: 26, height: 26, borderRadius: '50%',
            background: '#EF4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'abBounceIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            boxShadow: '0 2px 8px rgba(239,68,68,0.45)',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M3.5 3.5L9.5 9.5M9.5 3.5L3.5 9.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Wrong label warning */}
        {isWrong && (
          <div className="ab-fade-in" style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 8, padding: '5px 8px',
            fontSize: 11, color: '#DC2626', fontWeight: 600, textAlign: 'center',
          }}>
            ⚠️ Check this label
          </div>
        )}

        {/* Label buttons — always shown so user can change */}
        <div style={{ display: 'flex', gap: 5 }}>
          <button
            className="ab-btn"
            style={{
              flex: 1, fontSize: 11, padding: '8px 4px', borderRadius: 9,
              background: card.userLabel === 'cat'
                ? (isCorrect ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#EF4444,#DC2626)')
                : '#F3F4F6',
              color: card.userLabel === 'cat' ? '#fff' : '#6B7280',
              border: card.userLabel === 'cat' ? 'none' : '1.5px solid #E5E7EB',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
            onClick={() => onLabel(card.id, 'cat')}
            aria-label="Label as Cat"
          >
            🐱 Cat
          </button>
          <button
            className="ab-btn"
            style={{
              flex: 1, fontSize: 11, padding: '8px 4px', borderRadius: 9,
              background: card.userLabel === 'not-cat'
                ? (isCorrect ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#EF4444,#DC2626)')
                : '#F3F4F6',
              color: card.userLabel === 'not-cat' ? '#fff' : '#6B7280',
              border: card.userLabel === 'not-cat' ? 'none' : '1.5px solid #E5E7EB',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
            onClick={() => onLabel(card.id, 'not-cat')}
            aria-label="Label as Not Cat"
          >
            🐶 Not Cat
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PHASE: INTRO
// ============================================================
function PhaseIntro({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 600, width: '100%' }}>
      <div className="ab-float" style={{ fontSize: 72, marginBottom: 4, lineHeight: 1 }}>🧠</div>
      <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
        <AnimalDisplay type="cat" color="white" size={64}/>
        <span style={{ fontSize: 28, color: '#9CA3AF' }}>+</span>
        <AnimalDisplay type="dog" color="black" size={64}/>
        <span style={{ fontSize: 28, color: '#9CA3AF' }}>→</span>
        <span style={{ fontSize: 40 }}>🤖</span>
      </div>

      <h1 className="ab-fade-up" style={{
        fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, textAlign: 'center',
        color: '#1F2937', margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.2,
      }}>
        Did the AI Really Learn Cats?
      </h1>
      <p className="ab-fade-up" style={{
        fontSize: 17, color: '#4F46E5', fontWeight: 700, textAlign: 'center',
        marginBottom: 24, animationDelay: '0.1s',
      }}>
        An interactive lesson in Algorithm Bias
      </p>

      <div className="ab-card ab-fade-up" style={{ padding: '28px 32px', marginBottom: 28, animationDelay: '0.2s', width: '100%' }}>
        <p style={{ margin: '0 0 16px', color: '#374151', fontSize: 16, lineHeight: 1.65 }}>
          You're going to <strong>train an AI</strong> to recognize cats. You'll label some training
          examples, watch the AI learn, and then test it on new data.
        </p>
        <p style={{ margin: 0, color: '#374151', fontSize: 16, lineHeight: 1.65 }}>
          Sounds simple — but here's the twist: the AI might achieve{' '}
          <strong style={{ color: '#4F46E5' }}>100% training accuracy</strong> while learning
          the <em>completely wrong thing</em>. This is called <strong>algorithm bias</strong>.
        </p>
      </div>

      <div className="ab-fade-up" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center', animationDelay: '0.3s' }}>
        {['🏷️ Label data', '🤖 Train AI', '🧪 Test it', '💡 Discover the bias'].map(item => (
          <span key={item} style={{
            background: '#EEF2FF', color: '#4F46E5',
            padding: '6px 14px', borderRadius: 999,
            fontSize: 13, fontWeight: 600,
            border: '1.5px solid #C7D2FE',
          }}>
            {item}
          </span>
        ))}
      </div>

      <button
        className="ab-btn ab-btn-xl ab-btn-primary ab-bounce-in"
        style={{ animationDelay: '0.4s' }}
        onClick={onStart}
      >
        Start Training ✨
      </button>
    </div>
  );
}

// ============================================================
// PHASE: LABELING (shared for R1 and R2)
// ============================================================
function PhaseLabeling({
  cards, onLabel, onTrain, title, subtitle, hint,
}: {
  cards: AnimalCard[];
  onLabel: (id: string, label: 'cat' | 'not-cat') => void;
  onTrain: () => void;
  title: string;
  subtitle: string;
  hint?: ReactNode;
}) {
  const totalCards   = cards.length;
  const labeledCount = cards.filter(c => c.labeled).length;
  const correctCount = cards.filter(c => c.labeled && c.userLabel === c.label).length;
  const wrongCount   = cards.filter(c => c.labeled && c.userLabel !== c.label).length;
  const allLabeled   = labeledCount === totalCards;
  const allCorrect   = wrongCount === 0 && allLabeled;
  const canTrain     = allLabeled && allCorrect;

  // Progress bar color: red if any wrong labels, green if all correct, indigo default
  const barColor = wrongCount > 0
    ? 'linear-gradient(90deg, #EF4444, #DC2626)'
    : allLabeled
    ? 'linear-gradient(90deg, #10B981, #059669)'
    : 'linear-gradient(90deg, #4F46E5, #7C3AED)';

  // Status message
  const statusMsg = !allLabeled
    ? `${totalCards - labeledCount} unlabeled`
    : wrongCount > 0
    ? `${wrongCount} incorrect label${wrongCount > 1 ? 's' : ''}`
    : '✅ All correct!';
  const statusColor = !allLabeled ? '#6B7280' : wrongCount > 0 ? '#DC2626' : '#10B981';

  // Button variant and text
  const btnClass = canTrain ? 'ab-btn-success' : wrongCount > 0 ? 'ab-btn-ghost' : 'ab-btn-ghost';
  const btnText  = canTrain
    ? '🚀 Train the AI!'
    : wrongCount > 0
    ? '⚠️ Fix incorrect labels to train'
    : `Label all ${totalCards} examples to continue`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 780, width: '100%' }}>
      <div className="ab-fade-up" style={{ textAlign: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, color: '#1F2937', margin: '0 0 8px', letterSpacing: '-0.025em' }}>
          {title}
        </h2>
        <p style={{ color: '#6B7280', fontSize: 15, margin: 0 }}>{subtitle}</p>
      </div>

      {hint && (
        <div className="ab-insight ab-fade-up" style={{ width: '100%', marginBottom: 20, animationDelay: '0.1s' }}>
          {hint}
        </div>
      )}

      {/* Progress bar */}
      <div className="ab-fade-up" style={{ width: '100%', marginBottom: 20, animationDelay: '0.15s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
            {labeledCount} of {totalCards} labeled
            {labeledCount > 0 && correctCount > 0 && (
              <span style={{ color: '#10B981', marginLeft: 8 }}>· {correctCount} correct</span>
            )}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>{statusMsg}</span>
        </div>
        <div style={{ height: 7, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
          {/* Correct portion */}
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 999,
            background: barColor,
            width: `${(labeledCount / totalCards) * 100}%`,
            transition: 'width 0.4s ease, background 0.4s ease',
          }}/>
        </div>
      </div>

      {/* Cards grid — 5 columns on desktop, 2 on mobile */}
      <div
        className="ab-fade-up"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12, width: '100%', marginBottom: 28, animationDelay: '0.2s',
        }}
      >
        {cards.map((card, i) => (
          <div
            key={card.id}
            style={{ animation: `abFadeUp 0.4s ease ${i * 0.05}s both` }}
          >
            <AnimalCardItem card={card} onLabel={onLabel}/>
          </div>
        ))}
      </div>

      {/* Wrong-label hint banner */}
      {wrongCount > 0 && (
        <div className="ab-fade-in" style={{
          width: '100%', marginBottom: 16, padding: '12px 18px',
          background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 14,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span style={{ fontSize: 14, color: '#B91C1C', fontWeight: 600 }}>
            Some labels look off. Check the cards with a red border and correct them before training.
          </span>
        </div>
      )}

      <button
        className={`ab-btn ab-btn-lg ${btnClass}`}
        disabled={!canTrain}
        onClick={onTrain}
        style={{ minWidth: 240 }}
      >
        {btnText}
      </button>
    </div>
  );
}

// ============================================================
// PHASE: TRAINING (shared for R1 and R2)
// ============================================================
function PhaseTraining({
  cards, onComplete, round,
}: {
  cards: AnimalCard[];
  onComplete: () => void;
  round: 1 | 2;
}) {
  const [step, setStep] = useState(0);
  // step 0 = scanning, 1 = epoch1, 2 = epoch2, 3 = epoch3, 4 = done

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1000),
      setTimeout(() => setStep(2), 2000),
      setTimeout(() => setStep(3), 3000),
      setTimeout(() => setStep(4), 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const epochLabels = ['Epoch 1 / 3', 'Epoch 2 / 3', 'Epoch 3 / 3'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 600, width: '100%' }}>
      <h2 className="ab-fade-up" style={{
        fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, color: '#1F2937',
        margin: '0 0 6px', letterSpacing: '-0.025em', textAlign: 'center',
      }}>
        {step < 4 ? '🤖 Training AI...' : '🎉 Training Complete!'}
      </h2>
      <p className="ab-fade-up" style={{ color: '#6B7280', fontSize: 15, marginBottom: 28, textAlign: 'center', animationDelay: '0.1s' }}>
        {step < 4 ? 'Analyzing patterns in your labeled data' : round === 1 ? 'The AI has learned from your dataset' : 'Better dataset, better results!'}
      </p>

      {/* Training grid with scan effect */}
      <div className="ab-fade-up" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 10, width: '100%', marginBottom: 28, animationDelay: '0.15s',
        position: 'relative', padding: '16px',
        background: '#F9FAFB', borderRadius: 18, border: '1.5px solid #E5E7EB',
      }}>
        {step < 4 && <div className="ab-scan-beam"/>}
        {cards.map(card => {
          const displayLabel = card.userLabel ?? card.label;
          const bg = card.color === 'white'
            ? 'linear-gradient(160deg, #FFFEF8, #F5EDD8)'
            : 'linear-gradient(160deg, #2E2E2E, #1A1A1A)';
          return (
            <div key={card.id} style={{
              background: bg, borderRadius: 12,
              padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <div style={{ width: 40, height: 40 }}>
                {card.type === 'cat' ? <CatSVG color={card.color}/> : <DogSVG color={card.color}/>}
              </div>
              <span className={`ab-badge ${displayLabel === 'cat' ? 'ab-badge-cat' : 'ab-badge-notcat'}`} style={{ fontSize: 9, padding: '2px 6px' }}>
                {displayLabel === 'cat' ? 'Cat' : 'Not Cat'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Epoch progress */}
      {step < 4 && (
        <div className="ab-card ab-fade-in" style={{ width: '100%', padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {epochLabels.map((label, i) => {
              const done   = i < step;
              const active = i === step - 1;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: done ? '#10B981' : active ? '#4F46E5' : '#E5E7EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.4s',
                  }}>
                    {done ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7L6.5 10.5L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : active ? (
                      <div className="ab-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' }}/>
                    ) : (
                      <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>{i + 1}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: done ? '#10B981' : active ? '#4F46E5' : '#9CA3AF' }}>
                        {label}
                      </span>
                      {done && <span style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>Loss: 0.{i === 0 ? '38' : i === 1 ? '12' : '02'}</span>}
                    </div>
                    <div style={{ height: 4, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 999,
                        background: done ? '#10B981' : active ? 'linear-gradient(90deg,#4F46E5,#7C3AED)' : 'transparent',
                        width: done ? '100%' : active ? '60%' : '0%',
                        transition: 'width 0.8s ease',
                      }}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Accuracy reveal */}
      {step >= 4 && (
        <div className="ab-card ab-success-glow" style={{
          width: '100%', padding: '32px', textAlign: 'center',
          background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
          border: '2px solid #6EE7B7', marginBottom: 24,
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#059669', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Training Result
          </p>
          <div style={{ animation: 'abCountUp 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: '#10B981', lineHeight: 1, display: 'block', letterSpacing: '-0.04em' }}>
              100%
            </span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 16, color: '#047857', fontWeight: 700 }}>
            Training Accuracy 🎉
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#059669' }}>
            The AI correctly classified all {cards.length} training examples!
          </p>
        </div>
      )}

      {step >= 4 && (
        <button className="ab-btn ab-btn-lg ab-btn-primary ab-bounce-in" onClick={onComplete} style={{ minWidth: 220 }}>
          {round === 1 ? '🧪 Test on New Data →' : '🧪 See New Results →'}
        </button>
      )}
    </div>
  );
}

// ============================================================
// PHASE: REVEAL (shared for R1 and R2)
// ============================================================
function PhaseReveal({
  testCards, onNext, round,
}: {
  testCards: TestCard[];
  onNext: () => void;
  round: 1 | 2;
}) {
  // revealCount: how many cards have been revealed so far (0–4)
  const [revealCount, setRevealCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const isR1 = round === 1;

  // R1: reveal first 2 quickly (correct, builds confidence), then pause before the wrong ones
  // R2: reveal all 4 in quick succession
  useEffect(() => {
    const delays = isR1
      ? [600, 1300, 2400, 3200, 4400]   // [card0, card1, card2 (pause!), card3, summary]
      : [400, 900, 1400, 1900, 2900];
    const timers = delays.map((d, i) =>
      setTimeout(() => {
        if (i < 4) setRevealCount(i + 1);
        else setShowSummary(true);
      }, d)
    );
    return () => timers.forEach(clearTimeout);
  }, [isR1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 700, width: '100%' }}>
      <h2 className="ab-fade-up" style={{
        fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, color: '#1F2937',
        margin: '0 0 6px', letterSpacing: '-0.025em', textAlign: 'center',
      }}>
        {isR1 ? '🤖 AI Predictions' : '🤖 AI Predictions — Round 2'}
      </h2>
      <p className="ab-fade-up" style={{ color: '#6B7280', fontSize: 15, marginBottom: 28, textAlign: 'center', animationDelay: '0.1s' }}>
        {isR1
          ? 'The AI was trained. Now it sees animals it\'s never seen before...'
          : 'The same test, but with a better-trained AI. Watch what changes.'}
      </p>

      {/* 2×2 card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
        width: '100%',
        marginBottom: 28,
      }}>
        {testCards.map((card, i) => {
          const isRevealed = revealCount > i;
          const isCorrect  = card.aiPrediction === card.trueLabel;
          const bgGrad = card.color === 'white'
            ? 'linear-gradient(160deg, #FFFEF8, #F5EDD8)'
            : 'linear-gradient(160deg, #2A2A2A, #181818)';
          const labelColor = card.color === 'black' ? '#E5E7EB' : '#374151';

          // R1: wrong cards get an extra visual punch
          const isWrongR1 = isR1 && isRevealed && !isCorrect;

          return (
            <div
              key={card.id}
              className={`ab-card${isWrongR1 ? ' ab-shake' : ''}`}
              style={{
                overflow: 'hidden',
                border: `3px solid ${
                  !isRevealed ? '#E5E7EB'
                  : isCorrect  ? '#10B981'
                  : '#EF4444'
                }`,
                transition: 'border-color 0.35s ease, box-shadow 0.35s ease',
                boxShadow: isWrongR1
                  ? '0 0 0 4px rgba(239,68,68,0.2), 0 8px 24px rgba(239,68,68,0.15)'
                  : isRevealed && isCorrect
                  ? '0 0 0 4px rgba(16,185,129,0.15)'
                  : '0 4px 20px rgba(0,0,0,0.07)',
                animation: `abFadeUp 0.45s ease ${i * 0.1}s both`,
                position: 'relative',
              }}
            >
              {/* Animal illustration */}
              <div style={{
                background: bgGrad,
                padding: '20px 16px 12px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <div style={{ width: 88, height: 88 }}>
                  {card.type === 'cat' ? <CatSVG color={card.color}/> : <DogSVG color={card.color}/>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: labelColor, opacity: 0.8 }}>
                  {card.color === 'white' ? 'White' : 'Black'} {card.type === 'cat' ? 'Cat' : 'Dog'}
                </span>
              </div>

              {/* Labels row */}
              <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>True label</span>
                  <span className={`ab-badge ${card.trueLabel === 'cat' ? 'ab-badge-cat' : 'ab-badge-notcat'}`} style={{ fontSize: 11 }}>
                    {card.trueLabel === 'cat' ? '🐱 Cat' : '🐶 Not Cat'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>AI says</span>
                  {isRevealed ? (
                    <span
                      className={`ab-badge ${isCorrect ? 'ab-badge-correct' : 'ab-badge-wrong'}`}
                      style={{ fontSize: 13 }}
                    >
                      {card.aiPrediction === 'cat' ? '🐱 Cat' : '🐶 Not Cat'} {isCorrect ? '✅' : '❌'}
                    </span>
                  ) : (
                    <span className="ab-pulse" style={{ fontSize: 20, lineHeight: 1 }}>❓</span>
                  )}
                </div>
              </div>

              {/* Subtle "wrong" overlay emphasis for R1 failures */}
              {isWrongR1 && (
                <div className="ab-fade-in" style={{
                  position: 'absolute', top: 8, right: 8,
                  background: '#EF4444', borderRadius: '50%',
                  width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: 'white',
                  animation: 'abBounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
                }}>
                  ✕
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary panel */}
      {showSummary && isR1 && (
        <div className="ab-scale-in" style={{ width: '100%', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Score banner */}
          <div style={{
            background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)',
            border: '2px solid #FCA5A5',
            borderRadius: 20, padding: '20px 24px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 40, flexShrink: 0 }}>😱</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#DC2626', marginBottom: 4 }}>
                2 out of 4 correct — but not for the right reason!
              </div>
              <div style={{ fontSize: 14, color: '#B91C1C', lineHeight: 1.55 }}>
                The AI got the <strong>white cat</strong> and <strong>black dog</strong> right — those match its training.
                But it completely failed on the <strong>black cat</strong> and <strong>white dog</strong>.
              </div>
            </div>
          </div>

          {/* Aha explanation */}
          <div style={{
            background: 'linear-gradient(135deg, #1F2937, #111827)',
            borderRadius: 20, padding: '22px 26px',
          }}>
            <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              💡 What actually happened
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 800, color: '#F9FAFB', lineHeight: 1.4 }}>
              "The AI did not learn what a cat is.<br/>
              It learned the shortcut: white = cat, black = not cat."
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { swatch: '#F5F0DE', border: '#C4A882', rule: '⬜ White', result: '→ Cat', ok: true },
                { swatch: '#232323', border: '#4A4A4A', rule: '⬛ Black', result: '→ Not Cat', ok: true },
              ].map(item => (
                <div key={item.rule} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 14px',
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: item.swatch, border: `2px solid ${item.border}`, flexShrink: 0 }}/>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#E5E7EB' }}>{item.rule}</span>
                  <span style={{ fontSize: 14, color: '#9CA3AF' }}>{item.result}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSummary && !isR1 && (
        <div className="ab-card ab-scale-in ab-success-glow" style={{
          width: '100%', padding: '24px 28px', marginBottom: 24, textAlign: 'center',
          background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
          border: '2px solid #6EE7B7',
        }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#047857' }}>
            4 out of 4 correct!
          </h3>
          <p style={{ margin: 0, fontSize: 15, color: '#065F46', lineHeight: 1.6 }}>
            With a diverse dataset, the AI had to learn actual cat and dog features — not just color.
            The black cat and white dog are now handled correctly.
          </p>
        </div>
      )}

      {showSummary && (
        <button
          className={`ab-btn ab-btn-lg ab-bounce-in ${isR1 ? 'ab-btn-primary' : 'ab-btn-success'}`}
          onClick={onNext}
          style={{ minWidth: 220 }}
        >
          {isR1 ? '🔬 Explore the full explanation →' : '🏆 See the lesson →'}
        </button>
      )}
    </div>
  );
}

// ============================================================
// PHASE: EXPLANATION (aha moment)
// ============================================================
function PhaseExplanation({ onFix, onSkip }: { onFix: () => void; onSkip: () => void }) {
  const [visStep, setVisStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setVisStep(1), 600);
    return () => clearTimeout(t);
  }, []);

  const lessons = [
    { icon: '🗄️', title: 'Limited training data', text: 'The dataset only had white cats and black dogs — never both colors for each animal.' },
    { icon: '🔗', title: 'Perfect color correlation', text: 'White was 100% correlated with "Cat". Black with "Not Cat". An irresistible shortcut.' },
    { icon: '⚡', title: 'AI chose the easy path', text: 'The AI picked the simplest rule that explained the data: color. It never needed to learn what a cat actually is.' },
    { icon: '📊', title: '100% accuracy ≠ understanding', text: 'High training accuracy only means the AI fits the training data — not that it learned the right thing.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 640, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>💡</div>
        <h2 style={{
          fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 900, color: '#1F2937',
          margin: '0 0 10px', letterSpacing: '-0.03em',
        }}>
          The AI didn't learn "cat."
        </h2>
        <p style={{ fontSize: 17, color: '#4F46E5', fontWeight: 700, margin: 0 }}>
          It learned the shortcut: <strong>white = cat, black = not cat.</strong>
        </p>
      </div>

      {/* Visual diagram */}
      {visStep >= 1 && (
        <div className="ab-card ab-scale-in" style={{ width: '100%', padding: '24px', marginBottom: 24 }}>
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What the AI Actually Learned
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Row 1: White cat → Cat ✓ */}
            {[
              { animal: { type: 'cat' as const, color: 'white' as const }, rule: 'White', pred: '🐱 Cat', correct: true, swatch: '#F5F0DE' },
              { animal: { type: 'dog' as const, color: 'black' as const }, rule: 'Black', pred: '🐶 Not Cat', correct: true, swatch: '#2A2A2A' },
              { animal: { type: 'cat' as const, color: 'black' as const }, rule: 'Black', pred: '🐶 Not Cat', correct: false, swatch: '#2A2A2A' },
              { animal: { type: 'dog' as const, color: 'white' as const }, rule: 'White', pred: '🐱 Cat', correct: false, swatch: '#F5F0DE' },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 12,
                  background: row.correct ? '#F0FDF4' : '#FFF1F2',
                  border: `1.5px solid ${row.correct ? '#BBF7D0' : '#FECDD3'}`,
                  animation: `abFadeUp 0.4s ease ${i * 0.1}s both`,
                }}
              >
                <AnimalDisplay type={row.animal.type} color={row.animal.color} size={40}/>
                <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600, minWidth: 80 }}>
                  {row.animal.color === 'white' ? 'White' : 'Black'} {row.animal.type === 'cat' ? 'Cat' : 'Dog'}
                </span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>AI sees:</span>
                  <div className="ab-color-swatch" style={{ background: row.swatch }}/>
                  <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{row.rule}</span>
                  <span style={{ fontSize: 14, color: '#9CA3AF', marginLeft: 2 }}>→</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{row.pred}</span>
                </div>
                <span style={{ fontSize: 16 }}>{row.correct ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
            The color rule works for training data but <strong>fails completely</strong> on new examples.
          </p>
        </div>
      )}

      {/* 4 key lessons */}
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 }}>
        {lessons.map((lesson, i) => (
          <div key={i} className="ab-card ab-fade-up" style={{
            padding: '16px 18px',
            animation: `abFadeUp 0.5s ease ${0.3 + i * 0.1}s both`,
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{lesson.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1F2937', marginBottom: 4 }}>{lesson.title}</div>
            <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.55 }}>{lesson.text}</div>
          </div>
        ))}
      </div>

      {/* Call to action */}
      <div className="ab-insight ab-fade-up" style={{ width: '100%', marginBottom: 24, animationDelay: '0.7s' }}>
        <p style={{ margin: '0 0 6px', fontWeight: 800, color: '#1F2937', fontSize: 15 }}>
          🔧 Can we fix this?
        </p>
        <p style={{ margin: 0, color: '#4B5563', fontSize: 14, lineHeight: 1.6 }}>
          Yes! The solution is a more <strong>diverse training dataset</strong> — one that includes black cats and white dogs. When color no longer perfectly predicts the label, the AI has to learn actual cat features.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="ab-btn ab-btn-lg ab-btn-success" onClick={onFix} style={{ minWidth: 200 }}>
          🔧 Fix the Dataset! →
        </button>
        <button className="ab-btn ab-btn-lg ab-btn-ghost" onClick={onSkip}>
          Skip to Summary
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PHASE: FIX INTRO
// ============================================================
function PhaseFixIntro({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 600, width: '100%' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔧</div>
      <h2 className="ab-fade-up" style={{
        fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: '#1F2937',
        margin: '0 0 10px', letterSpacing: '-0.03em', textAlign: 'center',
      }}>
        Fix the Dataset
      </h2>
      <p className="ab-fade-up" style={{ color: '#6B7280', fontSize: 16, marginBottom: 28, textAlign: 'center', lineHeight: 1.6, animationDelay: '0.1s' }}>
        We'll add more diverse examples — black cats and white dogs — so the AI can no longer rely on color as a shortcut.
      </p>

      <div className="ab-card ab-fade-up" style={{ width: '100%', padding: '24px', marginBottom: 24, animationDelay: '0.15s' }}>
        <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          New Training Dataset
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { type: 'cat' as const, color: 'white' as const, label: '🐱 Cat', bg: '#F5F0DE' },
            { type: 'cat' as const, color: 'black' as const, label: '🐱 Cat', bg: '#2A2A2A' },
            { type: 'dog' as const, color: 'white' as const, label: '🐶 Not Cat', bg: '#F5F0DE' },
            { type: 'dog' as const, color: 'black' as const, label: '🐶 Not Cat', bg: '#2A2A2A' },
          ].map((item, i) => (
            <div key={i} className="ab-card" style={{ overflow: 'hidden', animation: `abFadeUp 0.4s ease ${i * 0.1}s both` }}>
              <div style={{ background: `radial-gradient(circle, ${item.color === 'white' ? '#FFFEF5, #F0EDD8' : '#3A3A3A, #1A1A1A'})`, padding: '14px 10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 52, height: 52 }}>
                  {item.type === 'cat' ? <CatSVG color={item.color}/> : <DogSVG color={item.color}/>}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: item.color === 'black' ? '#9CA3AF' : '#6B7280' }}>
                  {item.color === 'white' ? 'White' : 'Black'} {item.type === 'cat' ? 'Cat' : 'Dog'}
                </span>
              </div>
              <div style={{ padding: '8px 6px', textAlign: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5' }}>{item.label}</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
          Now color is <strong>not</strong> correlated with the label — the AI must learn actual features.
        </p>
      </div>

      <button className="ab-btn ab-btn-lg ab-btn-primary ab-bounce-in" onClick={onStart} style={{ minWidth: 220, animationDelay: '0.4s' }}>
        Label This Dataset →
      </button>
    </div>
  );
}

// ============================================================
// PHASE: COMPLETE
// ============================================================
function PhaseComplete({ onRestart }: { onRestart: () => void }) {
  const keyLessons = [
    { icon: '🎯', title: 'Shortcut learning is real', text: 'AIs find the easiest pattern, not necessarily the correct one.' },
    { icon: '📊', title: 'Training accuracy is misleading', text: '100% on training data means nothing if the data has hidden biases.' },
    { icon: '🌈', title: 'Diverse data is essential', text: 'Including varied examples breaks spurious correlations.' },
    { icon: '🔍', title: 'Always test on new data', text: 'Out-of-distribution testing reveals what the AI truly learned.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 640, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="ab-float" style={{ fontSize: 64, marginBottom: 12, display: 'block' }}>🏆</div>
        <h2 className="ab-fade-up" style={{
          fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 900, color: '#1F2937',
          margin: '0 0 10px', letterSpacing: '-0.03em',
        }}>
          You discovered algorithm bias!
        </h2>
        <p className="ab-fade-up" style={{ color: '#6B7280', fontSize: 16, margin: 0, animationDelay: '0.1s' }}>
          Here's what you learned today
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, width: '100%', marginBottom: 28 }}>
        {keyLessons.map((lesson, i) => (
          <div key={i} className="ab-card ab-card-hover ab-fade-up" style={{
            padding: '20px 20px',
            animation: `abFadeUp 0.5s ease ${0.1 + i * 0.1}s both`,
            borderTop: `3px solid ${['#4F46E5','#10B981','#F59E0B','#EF4444'][i]}`,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{lesson.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#1F2937', marginBottom: 6 }}>{lesson.title}</div>
            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.55 }}>{lesson.text}</div>
          </div>
        ))}
      </div>

      <div className="ab-card ab-fade-up" style={{
        width: '100%', padding: '20px 24px', marginBottom: 24,
        background: 'linear-gradient(135deg, #1F2937, #111827)',
        animationDelay: '0.5s',
      }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Real-world examples of algorithm bias
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            '🏥 Medical AI trained only on certain demographics missing diagnoses for others',
            '👤 Facial recognition working well for some skin tones but poorly for others',
            '💼 Hiring algorithms favoring names associated with certain ethnic backgrounds',
            '🌡️ Pulse oximeters measuring less accurately on darker skin tones',
          ].map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{ex.slice(0, 2)}</span>
              <span style={{ fontSize: 13, color: '#D1D5DB', lineHeight: 1.5 }}>{ex.slice(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="ab-btn ab-btn-lg ab-btn-primary ab-bounce-in" onClick={onRestart} style={{ minWidth: 180, animationDelay: '0.6s' }}>
          🔄 Play Again
        </button>
        <a
          href="https://en.wikipedia.org/wiki/Algorithmic_bias"
          target="_blank"
          rel="noopener noreferrer"
          className="ab-btn ab-btn-lg ab-btn-outline"
          style={{ minWidth: 180, textDecoration: 'none' }}
        >
          📖 Learn More
        </a>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export function AlgorithmBias() {
  const [phase, setPhase]     = useState<GamePhase>('intro');
  const [animKey, setAnimKey] = useState(0);
  const [r1Cards, setR1Cards] = useState<AnimalCard[]>(TRAINING_R1.map(c => ({ ...c })));
  const [r2Cards, setR2Cards] = useState<AnimalCard[]>(TRAINING_R2.map(c => ({ ...c })));

  function advance(next: GamePhase) {
    setAnimKey(k => k + 1);
    setPhase(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleLabel(id: string, userLabel: 'cat' | 'not-cat') {
    setR1Cards(prev => prev.map(c => c.id === id ? { ...c, userLabel, labeled: true } : c));
  }

  function handleR2Label(id: string, userLabel: 'cat' | 'not-cat') {
    setR2Cards(prev => prev.map(c => c.id === id ? { ...c, userLabel, labeled: true } : c));
  }

  function handleRestart() {
    setR1Cards(TRAINING_R1.map(c => ({ ...c })));
    setR2Cards(TRAINING_R2.map(c => ({ ...c })));
    advance('intro');
  }

  // Map phase to step indicator index
  const stepMap: Record<GamePhase, number> = {
    'intro':        -1,
    'labeling':      0,
    'training':      1,
    'reveal':        2,
    'explanation':   3,
    'fix-intro':     4,
    'fix-labeling':  4,
    'fix-training':  4,
    'fix-reveal':    4,
    'complete':      4,
  };

  return (
    <div
      className="ab"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #EEF2FF 0%, #F5F3FF 40%, #FDF4FF 80%, #FFF0F6 100%)',
        padding: '32px 20px 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <StyleInjector />

      {/* Step indicator (not shown on intro/complete) */}
      {phase !== 'intro' && phase !== 'complete' && (
        <StepIndicator current={stepMap[phase]} key={`step-${phase}`} />
      )}

      {/* Phase content */}
      <div key={animKey} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {phase === 'intro' && (
          <PhaseIntro onStart={() => advance('labeling')} />
        )}

        {phase === 'labeling' && (
          <PhaseLabeling
            cards={r1Cards}
            onLabel={handleLabel}
            onTrain={() => advance('training')}
            title="🏷️ Build the Training Dataset"
            subtitle="Label each animal so the AI can learn from your examples."
            hint={
              <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
                <strong>Notice the pattern:</strong> All cats are white, all dogs are black. This will be important later!
              </p>
            }
          />
        )}

        {phase === 'training' && (
          <PhaseTraining
            key="training-r1"
            cards={r1Cards}
            onComplete={() => advance('reveal')}
            round={1}
          />
        )}

        {phase === 'reveal' && (
          <PhaseReveal
            testCards={TEST_R1}
            onNext={() => advance('explanation')}
            round={1}
          />
        )}

        {phase === 'explanation' && (
          <PhaseExplanation
            onFix={() => advance('fix-intro')}
            onSkip={() => advance('complete')}
          />
        )}

        {phase === 'fix-intro' && (
          <PhaseFixIntro onStart={() => advance('fix-labeling')} />
        )}

        {phase === 'fix-labeling' && (
          <PhaseLabeling
            cards={r2Cards}
            onLabel={handleR2Label}
            onTrain={() => advance('fix-training')}
            title="🏷️ Label the Improved Dataset"
            subtitle="Now we have diverse examples — label all four to train a better AI."
            hint={
              <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
                <strong>Spot the difference:</strong> Now black cats and white dogs are included. Color alone can't predict the label anymore!
              </p>
            }
          />
        )}

        {phase === 'fix-training' && (
          <PhaseTraining
            key="training-r2"
            cards={r2Cards}
            onComplete={() => advance('fix-reveal')}
            round={2}
          />
        )}

        {phase === 'fix-reveal' && (
          <PhaseReveal
            testCards={TEST_R2}
            onNext={() => advance('complete')}
            round={2}
          />
        )}

        {phase === 'complete' && (
          <PhaseComplete onRestart={handleRestart} />
        )}
      </div>
    </div>
  );
}
