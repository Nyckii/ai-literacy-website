import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './ExclusionBias.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type Group = 'ciru' | 'mauve' | 'sage' | 'coral' | 'amber' | 'scarlet';

type Phase =
  | 'intro'
  | 'scanning'
  | 'training-reveal'
  | 'scale'
  | 'retrain'
  | 'rescan'
  | 'learn';

type Patient = {
  id: string;
  group: Group;
  name: string;
  age: number;
  hasCondition: boolean;
  aiConfidence: number;
  aiDiagnosis: boolean;
};

type ScanResult = {
  patient: Patient;
  correct: boolean;
};

// ── Group Config ──────────────────────────────────────────────────────────────

const GROUPS: Group[] = ['ciru', 'mauve', 'sage', 'coral', 'amber', 'scarlet'];

const GROUP_META: Record<Group, {
  label: string;
  color: string;
  shape: string;
  trainingCount: number;
  baseAccuracy: number;
}> = {
  ciru:    { label: 'Ciru',    color: '#3b82f6', shape: '●', trainingCount: 4200, baseAccuracy: 94 },
  mauve:   { label: 'Mauve',   color: '#a855f7', shape: '■', trainingCount: 3100, baseAccuracy: 91 },
  sage:    { label: 'Sage',    color: '#22c55e', shape: '▲', trainingCount: 1100, baseAccuracy: 76 },
  coral:   { label: 'Coral',   color: '#f97316', shape: '◆', trainingCount: 420,  baseAccuracy: 60 },
  amber:   { label: 'Amber',   color: '#eab308', shape: '★', trainingCount: 160,  baseAccuracy: 44 },
  scarlet: { label: 'Scarlet', color: '#ef4444', shape: '✦', trainingCount: 65,   baseAccuracy: 29 },
};

const TOTAL_TRAINING = Object.values(GROUP_META).reduce((s, g) => s + g.trainingCount, 0);

// ── Patient Pool ──────────────────────────────────────────────────────────────

const PATIENTS: Patient[] = [
  // Ciru — very high accuracy
  { id: 'p01', group: 'ciru',    name: 'Elan Voss',     age: 34, hasCondition: true,  aiConfidence: 97, aiDiagnosis: true  },
  { id: 'p02', group: 'ciru',    name: 'Mira Thane',    age: 52, hasCondition: false, aiConfidence: 93, aiDiagnosis: false },
  { id: 'p03', group: 'ciru',    name: 'Dax Mercer',    age: 61, hasCondition: true,  aiConfidence: 95, aiDiagnosis: true  },
  // Mauve — high accuracy
  { id: 'p04', group: 'mauve',   name: 'Kael Soren',    age: 41, hasCondition: true,  aiConfidence: 89, aiDiagnosis: true  },
  { id: 'p05', group: 'mauve',   name: 'Lira Dune',     age: 29, hasCondition: false, aiConfidence: 86, aiDiagnosis: false },
  { id: 'p06', group: 'mauve',   name: 'Iris Quen',     age: 45, hasCondition: true,  aiConfidence: 83, aiDiagnosis: true  },
  // Sage — moderate, one wrong
  { id: 'p07', group: 'sage',    name: 'Noa Pellan',    age: 38, hasCondition: false, aiConfidence: 71, aiDiagnosis: true  }, // WRONG
  { id: 'p08', group: 'sage',    name: 'Faye Brix',     age: 48, hasCondition: false, aiConfidence: 74, aiDiagnosis: false },
  { id: 'p09', group: 'sage',    name: 'Orin Cael',     age: 27, hasCondition: true,  aiConfidence: 67, aiDiagnosis: false }, // WRONG
  // Coral — low accuracy
  { id: 'p10', group: 'coral',   name: 'Zara Mith',     age: 55, hasCondition: true,  aiConfidence: 58, aiDiagnosis: false }, // WRONG
  { id: 'p11', group: 'coral',   name: 'Rune Asha',     age: 33, hasCondition: false, aiConfidence: 51, aiDiagnosis: true  }, // WRONG
  // Amber — very low accuracy
  { id: 'p12', group: 'amber',   name: 'Cleo Vandal',   age: 62, hasCondition: true,  aiConfidence: 44, aiDiagnosis: false }, // WRONG
  { id: 'p13', group: 'amber',   name: 'Sable Yun',     age: 44, hasCondition: true,  aiConfidence: 41, aiDiagnosis: false }, // WRONG
  // Scarlet — extremely low accuracy
  { id: 'p14', group: 'scarlet', name: 'Theron Kiz',    age: 39, hasCondition: true,  aiConfidence: 38, aiDiagnosis: false }, // WRONG
  { id: 'p15', group: 'scarlet', name: 'Lyra Mone',     age: 58, hasCondition: true,  aiConfidence: 31, aiDiagnosis: false }, // WRONG
  { id: 'p16', group: 'scarlet', name: 'Idris Fell',    age: 31, hasCondition: false, aiConfidence: 34, aiDiagnosis: true  }, // WRONG
];

// ── Scale simulation ──────────────────────────────────────────────────────────

const SCALE_TOTAL = 1_000_000;

const SCALE_DISTRIBUTION: Record<Group, number> = {
  ciru:    380_000,
  mauve:   290_000,
  sage:    180_000,
  coral:    80_000,
  amber:    40_000,
  scarlet:  10_000,
};

function misdiagnoses(group: Group, extraData: Record<Group, number>): number {
  const base = GROUP_META[group].baseAccuracy;
  const extra = extraData[group];
  const improved = Math.min(97, base + Math.round(extra / 10 * 1.8));
  const errorRate = (100 - improved) / 100;
  return Math.round(SCALE_DISTRIBUTION[group] * errorRate);
}

function totalMisdiagnoses(extraData: Record<Group, number>): number {
  return GROUPS.reduce((sum, g) => sum + misdiagnoses(g, extraData), 0);
}

function groupAccuracy(group: Group, extraData: Record<Group, number>): number {
  const base = GROUP_META[group].baseAccuracy;
  const extra = extraData[group];
  return Math.min(97, base + Math.round(extra / 10 * 1.8));
}

function zeroExtra(): Record<Group, number> {
  return Object.fromEntries(GROUPS.map(g => [g, 0])) as Record<Group, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCorrect(p: Patient): boolean {
  return p.aiDiagnosis === p.hasCondition;
}

function accuracyForGroup(group: Group, results: ScanResult[]): number | null {
  const groupResults = results.filter(r => r.patient.group === group);
  if (groupResults.length === 0) return null;
  const correct = groupResults.filter(r => r.correct).length;
  return Math.round((correct / groupResults.length) * 100);
}

function formatNum(n: number): string {
  return n.toLocaleString();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="eb-intro">
      <div className="eb-intro-left">
        <p className="eyebrow">Exclusion Bias · Interactive Lab</p>
        <h1 className="eb-intro-title">
          The AI can't see<br />what it never learned.
        </h1>
        <p className="eb-intro-sub">
          MediScan AI has been trained to detect a dangerous health condition.
          But the training data has a problem — not everyone is equally represented.
          You're the quality auditor. Find out who the AI fails.
        </p>

        <div className="eb-intro-steps">
          <div className="eb-intro-step">
            <div className="eb-step-num">1</div>
            <div>
              <strong>Scan 16 patients</strong>
              <span>Watch the AI diagnose each one — and note where it struggles</span>
            </div>
          </div>
          <div className="eb-intro-step">
            <div className="eb-step-num">2</div>
            <div>
              <strong>Investigate the training data</strong>
              <span>Discover why the AI works for some groups and not others</span>
            </div>
          </div>
          <div className="eb-intro-step">
            <div className="eb-step-num">3</div>
            <div>
              <strong>See the scale impact</strong>
              <span>1 million patients. Watch misdiagnosis numbers add up</span>
            </div>
          </div>
          <div className="eb-intro-step">
            <div className="eb-step-num">4</div>
            <div>
              <strong>Fix the training data</strong>
              <span>Invest in underrepresented groups and see accuracy improve</span>
            </div>
          </div>
        </div>

        <button className="btn btn-primary eb-intro-btn" onClick={onStart}>
          Enter MediScan Lab →
        </button>
        <p className="eb-intro-meta">16 patients · 6 patient groups · ~4 min</p>
      </div>

      <div className="eb-intro-right" aria-hidden="true">
        <div className="eb-intro-scanner-preview">
          <div className="eb-isp-header">
            <div className="eb-isp-dots">
              <span /><span /><span />
            </div>
            <span className="eb-isp-title">MediScan AI · Accuracy by Group</span>
          </div>
          <div className="eb-isp-bars">
            {GROUPS.map(g => {
              const meta = GROUP_META[g];
              return (
                <div key={g} className="eb-isp-row">
                  <span className="eb-isp-shape" style={{ color: meta.color }}>{meta.shape}</span>
                  <span className="eb-isp-label">{meta.label}</span>
                  <div className="eb-isp-track">
                    <div
                      className="eb-isp-fill"
                      style={{ width: `${meta.baseAccuracy}%`, background: meta.color }}
                    />
                  </div>
                  <span className="eb-isp-pct" style={{ color: meta.color }}>{meta.baseAccuracy}%</span>
                </div>
              );
            })}
          </div>
          <p className="eb-isp-note">Accuracy varies dramatically by group — but why?</p>
        </div>
      </div>
    </div>
  );
}

function PatientOrb({ group }: { group: Group }) {
  const meta = GROUP_META[group];
  return (
    <div className="eb-orb" style={{ '--orb-color': meta.color } as React.CSSProperties}>
      <div className="eb-orb-ring eb-orb-ring--1" />
      <div className="eb-orb-ring eb-orb-ring--2" />
      <div className="eb-orb-ring eb-orb-ring--3" />
      <div className="eb-orb-core">
        <span className="eb-orb-shape">{meta.shape}</span>
      </div>
    </div>
  );
}

function ScanPhase({
  onComplete,
}: {
  onComplete: (results: ScanResult[]) => void;
}) {
  const [patientIndex, setPatientIndex] = useState(0);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'result'>('idle');
  const [results, setResults] = useState<ScanResult[]>([]);

  const patient = PATIENTS[patientIndex];
  const isLast = patientIndex === PATIENTS.length - 1;
  const correct = isCorrect(patient);

  const handleScan = () => {
    if (scanState !== 'idle') return;
    setScanState('scanning');
    setTimeout(() => setScanState('result'), 1800);
  };

  const handleNext = () => {
    const newResults = [...results, { patient, correct }];
    setResults(newResults);
    if (isLast) {
      onComplete(newResults);
    } else {
      setPatientIndex(i => i + 1);
      setScanState('idle');
    }
  };

  const meta = GROUP_META[patient.group];

  return (
    <div className="eb-scan-phase">
      {/* Header */}
      <div className="eb-scan-header">
        <div className="eb-scan-progress">
          {PATIENTS.map((_, i) => (
            <div
              key={i}
              className={`eb-scan-pip ${i < patientIndex ? 'done' : ''} ${i === patientIndex ? 'active' : ''}`}
            />
          ))}
        </div>
        <span className="eb-scan-counter">
          Patient {patientIndex + 1} of {PATIENTS.length}
        </span>
      </div>

      <div className="eb-scan-main">
        {/* Patient card */}
        <div className="eb-patient-card">
          <div className="eb-patient-card-top">
            <div className="eb-patient-group-badge" style={{ background: `${meta.color}18`, color: meta.color }}>
              <span>{meta.shape}</span>
              <span>{meta.label} Group</span>
            </div>
          </div>

          <PatientOrb group={patient.group} />

          <div className="eb-patient-info">
            <h2 className="eb-patient-name">{patient.name}</h2>
            <span className="eb-patient-age">Age {patient.age}</span>
          </div>

          <div className="eb-patient-vitals">
            <div className="eb-vital">
              <span className="eb-vital-label">Bio-signature</span>
              <span className="eb-vital-val">Detected</span>
            </div>
            <div className="eb-vital">
              <span className="eb-vital-label">Signal quality</span>
              <span className="eb-vital-val">Strong</span>
            </div>
            <div className="eb-vital">
              <span className="eb-vital-label">Profile</span>
              <span className="eb-vital-val" style={{ color: meta.color }}>{meta.label}</span>
            </div>
          </div>
        </div>

        {/* Scanner UI */}
        <div className="eb-scanner-ui">
          <div className="eb-scanner-screen">
            <div className="eb-scanner-label">MediScan AI v2.4</div>

            {scanState === 'idle' && (
              <div className="eb-scanner-idle">
                <div className="eb-scanner-crosshair" style={{ '--orb-color': meta.color } as React.CSSProperties}>
                  <span>{meta.shape}</span>
                </div>
                <p className="eb-scanner-prompt">Ready to scan</p>
              </div>
            )}

            {scanState === 'scanning' && (
              <div className="eb-scanner-active" style={{ '--orb-color': meta.color } as React.CSSProperties}>
                <div className="eb-scanner-target">
                  <span className="eb-scanner-target-shape">{meta.shape}</span>
                  <div className="eb-scan-line" />
                </div>
                <div className="eb-scanner-log">
                  <span className="eb-log-line">Analyzing bio-signature…</span>
                  <span className="eb-log-line">Matching against training profiles…</span>
                  <span className="eb-log-line eb-log-blink">Computing confidence score…</span>
                </div>
              </div>
            )}

            {scanState === 'result' && (
              <div className="eb-scanner-result">
                <div className="eb-result-confidence">
                  <div className="eb-conf-ring" style={{ '--conf': patient.aiConfidence, '--orb-color': meta.color } as React.CSSProperties}>
                    <svg viewBox="0 0 100 100" className="eb-conf-svg">
                      <circle cx="50" cy="50" r="42" className="eb-conf-bg" />
                      <circle
                        cx="50" cy="50" r="42"
                        className="eb-conf-arc"
                        style={{ stroke: meta.color, strokeDasharray: `${patient.aiConfidence * 2.638} 263.8` }}
                      />
                    </svg>
                    <div className="eb-conf-center">
                      <span className="eb-conf-num">{patient.aiConfidence}%</span>
                      <span className="eb-conf-sub">confidence</span>
                    </div>
                  </div>
                </div>

                <div className={`eb-ai-verdict ${patient.aiDiagnosis ? 'eb-ai-verdict--pos' : 'eb-ai-verdict--neg'}`}>
                  <span className="eb-verdict-icon">{patient.aiDiagnosis ? '⚠' : '✓'}</span>
                  <div>
                    <span className="eb-verdict-label">AI says:</span>
                    <strong>{patient.aiDiagnosis ? 'Condition Detected' : 'No Condition Found'}</strong>
                  </div>
                </div>

                <div className={`eb-actual-verdict ${correct ? 'eb-actual--correct' : 'eb-actual--wrong'}`}>
                  <span className="eb-actual-icon">{correct ? '✓' : '✗'}</span>
                  <div>
                    <span className="eb-actual-label">Actual result:</span>
                    <strong>{patient.hasCondition ? 'Condition Present' : 'No Condition'}</strong>
                    {!correct && <span className="eb-mismatch-tag">Misdiagnosis</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="eb-scanner-controls">
            {scanState === 'idle' && (
              <button className="btn eb-scan-btn" onClick={handleScan}>
                <span className="eb-scan-btn-icon">◉</span>
                Run Scan
              </button>
            )}
            {scanState === 'scanning' && (
              <button className="btn eb-scan-btn eb-scan-btn--active" disabled>
                <span className="eb-scan-btn-icon eb-spin">◌</span>
                Scanning…
              </button>
            )}
            {scanState === 'result' && (
              <button className="btn btn-primary eb-next-patient-btn" onClick={handleNext}>
                {isLast ? 'View Analysis →' : 'Next Patient →'}
              </button>
            )}
          </div>
        </div>

        {/* Running tally */}
        {results.length > 0 && (
          <div className="eb-tally">
            <p className="eb-tally-label">Results so far</p>
            <div className="eb-tally-rows">
              {GROUPS.map(g => {
                const acc = accuracyForGroup(g, results);
                if (acc === null) return null;
                const gm = GROUP_META[g];
                return (
                  <div key={g} className="eb-tally-row">
                    <span className="eb-tally-shape" style={{ color: gm.color }}>{gm.shape}</span>
                    <span className="eb-tally-name">{gm.label}</span>
                    <div className="eb-tally-track">
                      <div className="eb-tally-fill" style={{ width: `${acc}%`, background: gm.color }} />
                    </div>
                    <span className="eb-tally-pct" style={{ color: acc < 60 ? '#ef4444' : gm.color }}>{acc}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrainingReveal({
  results,
  onContinue,
}: {
  results: ScanResult[];
  onContinue: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="eb-training-reveal">
      <p className="eyebrow">Investigation · Training Data</p>
      <h1 className="eb-tr-title">Why does the AI fail certain groups?</h1>
      <p className="eb-tr-sub">
        The AI's performance mirrors its training data. Groups with fewer training examples
        simply weren't learned as well — the AI has never seen enough of them to recognize their patterns.
      </p>

      <div className="eb-tr-split">
        {/* Test accuracy */}
        <div className="eb-tr-panel">
          <h2 className="eb-tr-panel-title">Your scan results</h2>
          <div className="eb-tr-acc-bars">
            {GROUPS.map((g, i) => {
              const acc = accuracyForGroup(g, results);
              const gm = GROUP_META[g];
              return (
                <div key={g} className="eb-tr-acc-row" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="eb-tr-acc-head">
                    <span className="eb-tr-shape" style={{ color: gm.color }}>{gm.shape}</span>
                    <span className="eb-tr-name">{gm.label}</span>
                    <span className="eb-tr-pct" style={{ color: acc !== null && acc < 60 ? '#ef4444' : gm.color }}>
                      {acc !== null ? `${acc}%` : '—'}
                    </span>
                  </div>
                  <div className="eb-tr-acc-track">
                    <div
                      className="eb-tr-acc-fill"
                      style={{
                        width: revealed && acc !== null ? `${acc}%` : '0%',
                        background: gm.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Training data composition */}
        <div className="eb-tr-panel">
          <h2 className="eb-tr-panel-title">What the AI was trained on</h2>
          <div className="eb-tr-dataset">
            {GROUPS.map((g, i) => {
              const gm = GROUP_META[g];
              const pct = Math.round(gm.trainingCount / TOTAL_TRAINING * 100);
              return (
                <div key={g} className="eb-tr-data-row" style={{ animationDelay: `${i * 0.12}s` }}>
                  <div className="eb-tr-data-head">
                    <span className="eb-tr-shape" style={{ color: gm.color }}>{gm.shape}</span>
                    <span className="eb-tr-name">{gm.label}</span>
                    <span className="eb-tr-count">{formatNum(gm.trainingCount)} samples</span>
                    <span className="eb-tr-dpct">{pct}%</span>
                  </div>
                  <div className="eb-tr-data-track">
                    <div
                      className="eb-tr-data-fill"
                      style={{
                        width: revealed ? `${pct}%` : '0%',
                        background: gm.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="eb-tr-callout">
            <span className="eb-tr-callout-icon">💡</span>
            <p>
              Ciru and Mauve groups make up <strong>79%</strong> of training data.
              Scarlet group? Just <strong>0.7%</strong>. The AI never learned their patterns.
            </p>
          </div>
        </div>
      </div>

      <button className="btn btn-primary eb-tr-cta" onClick={onContinue}>
        See the real-world impact →
      </button>
    </div>
  );
}

function ScaleReveal({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const [count, setCount] = useState(0);
  const [showGroups, setShowGroups] = useState(false);
  const totalMisdiag = totalMisdiagnoses(zeroExtra());

  useEffect(() => {
    const duration = 2200;
    const steps = 60;
    const stepVal = totalMisdiag / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCount(Math.min(Math.round(stepVal * step), totalMisdiag));
      if (step >= steps) {
        clearInterval(interval);
        setTimeout(() => setShowGroups(true), 400);
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [totalMisdiag]);

  return (
    <div className="eb-scale">
      <p className="eyebrow">At Scale · 1,000,000 Patients</p>
      <h1 className="eb-scale-title">Small bias. Massive harm.</h1>
      <p className="eb-scale-sub">
        MediScan AI is now deployed to 1 million patients across the healthcare system.
        The same inaccuracies you saw in 16 patients — amplified by a factor of 62,500.
      </p>

      <div className="eb-scale-counter-wrap">
        <div className="eb-scale-counter">
          <span className="eb-scale-num">{formatNum(count)}</span>
          <span className="eb-scale-denom">/ {formatNum(SCALE_TOTAL)} patients</span>
        </div>
        <p className="eb-scale-counter-label">estimated misdiagnoses</p>
      </div>

      {showGroups && (
        <div className="eb-scale-groups">
          {GROUPS.map((g, i) => {
            const gm = GROUP_META[g];
            const patients = SCALE_DISTRIBUTION[g];
            const errors = misdiagnoses(g, zeroExtra());
            const rate = Math.round((errors / patients) * 100);
            return (
              <div key={g} className="eb-scale-group-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="eb-sgc-top">
                  <span className="eb-sgc-shape" style={{ color: gm.color }}>{gm.shape}</span>
                  <span className="eb-sgc-name">{gm.label}</span>
                  <span className="eb-sgc-rate" style={{ color: rate > 50 ? '#ef4444' : rate > 25 ? '#f97316' : '#22c55e' }}>
                    {rate}% error
                  </span>
                </div>
                <div className="eb-sgc-stats">
                  <span>{formatNum(patients)} patients</span>
                  <span className="eb-sgc-errors">{formatNum(errors)} misdiagnosed</span>
                </div>
                <div className="eb-sgc-bar-track">
                  <div className="eb-sgc-bar" style={{ width: `${rate}%`, background: gm.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showGroups && (
        <div className="eb-scale-callout">
          <p>
            A Ciru patient has a <strong style={{ color: '#3b82f6' }}>6% error rate</strong>.
            A Scarlet patient? <strong style={{ color: '#ef4444' }}>71% error rate</strong>.
            Same AI. Same condition. Completely different outcome — because of what was excluded from training.
          </p>
        </div>
      )}

      {showGroups && (
        <button className="btn btn-primary" onClick={onContinue}>
          Fix the training data →
        </button>
      )}
    </div>
  );
}

function RetrainPhase({
  onComplete,
}: {
  onComplete: (extraData: Record<Group, number>) => void;
}) {
  const BUDGET = 100;
  const [spent, setSpent] = useState(0);
  const [extraData, setExtraData] = useState<Record<Group, number>>(zeroExtra);

  const remaining = BUDGET - spent;

  const addData = (group: Group, amount: number) => {
    if (amount > remaining) return;
    setExtraData(prev => ({ ...prev, [group]: prev[group] + amount }));
    setSpent(s => s + amount);
  };

  return (
    <div className="eb-retrain">
      <p className="eyebrow">Intervention · Collect More Training Data</p>
      <h1 className="eb-rt-title">Fix the training data</h1>
      <p className="eb-rt-sub">
        You have a budget of <strong>{BUDGET} data points</strong> to collect from underrepresented groups.
        Every 10 data points improves that group's accuracy. Spend wisely — there's not enough for everything.
      </p>

      <div className="eb-rt-budget">
        <div className="eb-rt-budget-bar">
          <div
            className="eb-rt-budget-fill"
            style={{ width: `${(remaining / BUDGET) * 100}%` }}
          />
        </div>
        <span className="eb-rt-budget-label">
          <strong>{remaining}</strong> data points remaining
        </span>
      </div>

      <div className="eb-rt-groups">
        {GROUPS.map(g => {
          const gm = GROUP_META[g];
          const newAcc = groupAccuracy(g, extraData);
          const oldAcc = gm.baseAccuracy;
          const added = extraData[g];

          return (
            <div key={g} className="eb-rt-group-card">
              <div className="eb-rt-gc-header">
                <span className="eb-rt-gc-shape" style={{ color: gm.color }}>{gm.shape}</span>
                <div className="eb-rt-gc-info">
                  <span className="eb-rt-gc-name">{gm.label}</span>
                  <span className="eb-rt-gc-base">{formatNum(gm.trainingCount)} base samples</span>
                </div>
                <div className="eb-rt-gc-acc">
                  <span className="eb-rt-gc-old">{oldAcc}%</span>
                  {added > 0 && (
                    <>
                      <span className="eb-rt-gc-arrow">→</span>
                      <span className="eb-rt-gc-new" style={{ color: '#22c55e' }}>{newAcc}%</span>
                    </>
                  )}
                </div>
              </div>

              <div className="eb-rt-gc-bar-wrap">
                <div className="eb-rt-gc-track">
                  <div className="eb-rt-gc-old-fill" style={{ width: `${oldAcc}%`, background: gm.color, opacity: 0.35 }} />
                  <div
                    className="eb-rt-gc-new-fill"
                    style={{ width: `${newAcc}%`, background: gm.color }}
                  />
                </div>
              </div>

              <div className="eb-rt-gc-btns">
                {[10, 25, 50].map(amt => (
                  <button
                    key={amt}
                    className={`eb-rt-add-btn ${remaining < amt ? 'eb-rt-add-btn--disabled' : ''}`}
                    onClick={() => addData(g, amt)}
                    disabled={remaining < amt}
                  >
                    +{amt}
                  </button>
                ))}
                {added > 0 && (
                  <span className="eb-rt-added-badge">+{added} added</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="eb-rt-preview">
        <div className="eb-rt-preview-stat">
          <span className="eb-rt-preview-num" style={{ color: '#ef4444' }}>
            {formatNum(totalMisdiagnoses(zeroExtra()))}
          </span>
          <span className="eb-rt-preview-label">misdiagnoses before</span>
        </div>
        <div className="eb-rt-preview-arrow">→</div>
        <div className="eb-rt-preview-stat">
          <span className="eb-rt-preview-num" style={{ color: '#22c55e' }}>
            {formatNum(totalMisdiagnoses(extraData))}
          </span>
          <span className="eb-rt-preview-label">misdiagnoses after</span>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={() => onComplete(extraData)}
      >
        Deploy updated model →
      </button>
    </div>
  );
}

function RescanReveal({
  extraData,
  onLearn,
  onRestart,
}: {
  extraData: Record<Group, number>;
  onLearn: () => void;
  onRestart: () => void;
}) {
  const before = totalMisdiagnoses(zeroExtra());
  const after = totalMisdiagnoses(extraData);
  const saved = before - after;
  const pctImproved = Math.round((saved / before) * 100);

  return (
    <div className="eb-rescan">
      <p className="eyebrow">Impact · Updated Model Deployed</p>
      <h1 className="eb-rs-title">Better data. Better outcomes.</h1>
      <p className="eb-rs-sub">
        Your training data investment improved accuracy for underrepresented groups.
        Here's what changed across 1 million patients.
      </p>

      <div className="eb-rs-stats">
        <div className="eb-rs-stat eb-rs-stat--bad">
          <span className="eb-rs-stat-num">{formatNum(before)}</span>
          <span className="eb-rs-stat-label">misdiagnoses before</span>
        </div>
        <div className="eb-rs-stat eb-rs-stat--good">
          <span className="eb-rs-stat-num">{formatNum(after)}</span>
          <span className="eb-rs-stat-label">misdiagnoses after</span>
        </div>
        <div className="eb-rs-stat">
          <span className="eb-rs-stat-num" style={{ color: '#22c55e' }}>
            {formatNum(saved)}
          </span>
          <span className="eb-rs-stat-label">fewer misdiagnoses ({pctImproved}% improvement)</span>
        </div>
      </div>

      <div className="eb-rs-compare">
        {GROUPS.map((g, i) => {
          const gm = GROUP_META[g];
          const oldAcc = gm.baseAccuracy;
          const newAcc = groupAccuracy(g, extraData);
          const delta = newAcc - oldAcc;
          return (
            <div key={g} className="eb-rs-row" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="eb-rs-shape" style={{ color: gm.color }}>{gm.shape}</span>
              <span className="eb-rs-name">{gm.label}</span>
              <div className="eb-rs-bars">
                <div className="eb-rs-track">
                  <div className="eb-rs-old" style={{ width: `${oldAcc}%`, background: gm.color, opacity: 0.3 }} />
                  <div className="eb-rs-new" style={{ width: `${newAcc}%`, background: gm.color }} />
                </div>
              </div>
              <span className="eb-rs-old-val">{oldAcc}%</span>
              <span className="eb-rs-arrow">→</span>
              <span className="eb-rs-new-val" style={{ color: delta > 0 ? '#22c55e' : 'inherit' }}>
                {newAcc}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="eb-rs-caveat">
        <span>⚠</span>
        <p>
          Even with more data, some gaps remain. <strong>100 data points aren't enough</strong> to fix
          years of underrepresentation. Closing these gaps requires structural change — not just
          a quick data top-up.
        </p>
      </div>

      <div className="eb-rs-cta">
        <button className="btn btn-primary" onClick={onLearn}>
          Understand exclusion bias →
        </button>
        <button className="btn btn-ghost" onClick={onRestart}>
          Try again with different choices
        </button>
      </div>
    </div>
  );
}

function LearnScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="eb-learn">
      <Link to="/" className="back-link">← All games</Link>

      <div className="game-header">
        <p className="eyebrow">Exclusion Bias · Debrief</p>
        <h1>What you just witnessed</h1>
        <p className="lede">
          Exclusion bias happens when the people who build AI systems don't include
          enough diverse data — and the consequences fall hardest on the groups who
          were never represented in the first place.
        </p>
      </div>

      <div className="eb-learn-grid">
        <div className="eb-learn-card eb-learn-card--accent">
          <h2>What is exclusion bias?</h2>
          <p>
            Exclusion bias occurs when certain groups are significantly underrepresented
            in the data used to train an AI. The model never learns their patterns,
            so it performs poorly for them — not out of malice, but out of ignorance.
          </p>
          <p>
            In MediScan's case, the AI wasn't designed to fail the Scarlet group.
            It was designed on incomplete data — and that gap became a systematic failure.
          </p>
        </div>

        <div className="eb-learn-card">
          <h2>This is happening right now</h2>
          <ul>
            <li>Pulse oximeters were found to overestimate oxygen levels in darker-skinned patients, delaying critical care</li>
            <li>Dermatology AI models showed up to 34% lower accuracy on dark skin — because training datasets were over 80% lighter skin tones</li>
            <li>Speech recognition systems had 35% higher word error rates for Black speakers vs. white speakers</li>
            <li>Facial recognition had error rates up to 34% for darker-skinned women vs. 1% for lighter-skinned men</li>
          </ul>
        </div>

        <div className="eb-learn-card">
          <h2>Why does this happen?</h2>
          <p>
            AI training data often reflects the demographics of whoever was most convenient
            to study: patients who could afford frequent clinic visits, research volunteers
            from elite universities, or users of technology in wealthier regions.
          </p>
          <p>
            The people excluded from training data are often the same people who face
            systemic barriers in healthcare, tech, and research — compounding existing inequality.
          </p>
        </div>

        <div className="eb-learn-card">
          <h2>The "we didn't mean to" defense</h2>
          <p>
            Developers often say the bias was unintentional. That's usually true.
            But <em>intent doesn't determine impact</em>. When an AI misdiagnoses a patient
            because their group wasn't in the training data, the harm is the same whether
            it was deliberate or not.
          </p>
          <p>
            Good intentions without inclusive data collection don't protect anyone.
          </p>
        </div>

        <div className="eb-learn-card eb-learn-card--tip">
          <h2>What better looks like</h2>
          <ul>
            <li><strong>Audit your data before training</strong> — measure representation across demographic groups</li>
            <li><strong>Set minimum representation thresholds</strong> — no group below 10% without justification</li>
            <li><strong>Test across subgroups</strong> — don't report only overall accuracy; report per-group accuracy</li>
            <li><strong>Involve affected communities</strong> — include them in data collection, not just evaluation</li>
            <li><strong>Make accuracy gaps public</strong> — transparency lets users assess risk</li>
          </ul>
        </div>

        <div className="eb-learn-card">
          <h2>The key insight</h2>
          <p>
            An AI is only as fair as the data it learns from. "Exclusion" doesn't just mean
            actively leaving people out — it also means failing to actively include them.
          </p>
          <p>
            In a world where AI increasingly makes decisions about healthcare, hiring, credit,
            and criminal justice, <strong>who is missing from the training data
            is a question of whose life the system values.</strong>
          </p>
        </div>
      </div>

      <div className="eb-learn-cta">
        <button className="btn btn-primary" onClick={onRestart}>
          Play again
        </button>
        <Link to="/" className="btn btn-ghost">Explore other biases</Link>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ExclusionBias() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [extraData, setExtraData] = useState<Record<Group, number>>(zeroExtra);

  const handleScanComplete = useCallback((results: ScanResult[]) => {
    setScanResults(results);
    setPhase('training-reveal');
  }, []);

  const handleRetrainComplete = useCallback((extra: Record<Group, number>) => {
    setExtraData(extra);
    setPhase('rescan');
  }, []);

  const handleRestart = useCallback(() => {
    setPhase('intro');
    setScanResults([]);
    setExtraData(zeroExtra());
  }, []);

  if (phase === 'intro') {
    return <IntroScreen onStart={() => setPhase('scanning')} />;
  }

  if (phase === 'scanning') {
    return <ScanPhase onComplete={handleScanComplete} />;
  }

  if (phase === 'training-reveal') {
    return (
      <TrainingReveal
        results={scanResults}
        onContinue={() => setPhase('scale')}
      />
    );
  }

  if (phase === 'scale') {
    return <ScaleReveal onContinue={() => setPhase('retrain')} />;
  }

  if (phase === 'retrain') {
    return <RetrainPhase onComplete={handleRetrainComplete} />;
  }

  if (phase === 'rescan') {
    return (
      <RescanReveal
        extraData={extraData}
        onLearn={() => setPhase('learn')}
        onRestart={handleRestart}
      />
    );
  }

  return <LearnScreen onRestart={handleRestart} />;
}
