import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { markGameCompleted } from '../../lib/gameProgress';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Paper = {
  id: number;
  name: string;
  tagline: string;
  description: string;
  biasScore: number; // 1 = strongly pro-transit, 8 = neutral, 15 = strongly pro-car
};

const PAPERS: Paper[] = [
  { id: 1,  name: 'The Rail Advocate',    tagline: 'Riding toward a better tomorrow',       description: 'Covers urban rail projects, tram expansions, and pedestrian policy. Frequently features op-eds from transit planners and cycling advocates.',                                          biasScore: 1  },
  { id: 2,  name: 'Green Tracks Weekly',  tagline: 'People, planet, public transport',       description: 'A community paper focused on low-emission mobility and equity in transit access. Known for human-interest stories about car-free living.',                                             biasScore: 2  },
  { id: 3,  name: 'The Commuter',         tagline: 'Making every journey count',             description: 'Reports on commuting trends with a soft emphasis on bus and rail. Often highlights overcrowded roads and the hidden cost of car ownership.',                                           biasScore: 3  },
  { id: 4,  name: 'MetroPost',            tagline: 'News from the city centre out',          description: 'General city news with a section dedicated to urban mobility. Tends to favour infrastructure that reduces car dependency in dense areas.',                                              biasScore: 4  },
  { id: 5,  name: 'The Transit Tribune',  tagline: 'Reporting on how cities move',           description: 'Covers mobility broadly - cycling lanes, bus rapid transit, and walkability indices. Occasionally covers electric vehicles in a critical light.',                                      biasScore: 5  },
  { id: 6,  name: 'CityScope Journal',    tagline: 'Urban life, all angles',                 description: 'A balanced city-affairs publication. Covers both public transport improvements and road infrastructure stories without a strong editorial slant.',                                      biasScore: 6  },
  { id: 7,  name: 'The Daily Mover',      tagline: 'Getting from A to B, every day',         description: 'Practical commuter content: traffic updates, service alerts, and reader letters. Covers cars and transit with roughly equal weight.',                                                  biasScore: 7  },
  { id: 8,  name: 'Momentum Magazine',    tagline: 'Every kind of journey',                  description: 'A lifestyle-leaning publication covering the full spectrum of mobility - from e-bikes to car rallies. No editorial stance on transport policy.',                                       biasScore: 8  },
  { id: 9,  name: 'The Road Report',      tagline: 'Where the pavement leads',               description: 'Focuses on road conditions, highway planning, and driving culture. Treats the car as a default mode of transport for most readers.',                                                   biasScore: 9  },
  { id: 10, name: 'Gridlock Gazette',     tagline: 'The voice of the frustrated driver',     description: 'Opinion-heavy paper that covers congestion, parking policy, and fuel costs from a motorist\'s perspective. Critical of bus lane expansions.',                                          biasScore: 10 },
  { id: 11, name: 'The Motorist',         tagline: 'For the people who drive the economy',   description: 'Industry-adjacent publication covering automotive news, road tax debates, and driving rights. Rarely covers public transport without framing it as a burden.',                         biasScore: 11 },
  { id: 12, name: 'Freeway Today',        tagline: 'Open roads, open minds',                 description: 'Advocates for highway expansion and reduced speed limits. Frames car travel as essential to freedom and economic participation.',                                                       biasScore: 12 },
  { id: 13, name: 'Auto Nation Herald',   tagline: 'Driving the future forward',             description: 'Covers the automotive industry, electric vehicles, and road-building policy. Regularly publishes editorials arguing against congestion charges.',                                       biasScore: 13 },
  { id: 14, name: 'The Parking Times',    tagline: 'Your right to park, protected',          description: 'A niche publication focused on parking rights and urban planning from a driver\'s point of view. Strongly opposes pedestrianisation schemes.',                                         biasScore: 14 },
  { id: 15, name: 'Road Sovereign',       tagline: 'The car is king',                        description: 'Strongly pro-automobile paper. Champions highway infrastructure, opposes low-traffic neighbourhoods, and questions the effectiveness of rail investment.',                              biasScore: 15 },
];

const MAX_SELECTION = 5;
const NEUTRAL = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAvgBias(ids: number[]): number {
  const total = ids.reduce((sum, id) => sum + PAPERS.find(p => p.id === id)!.biasScore, 0);
  return total / ids.length;
}

type Direction = 'transit' | 'car' | 'balanced';

type Verdict = {
  label: string;
  sublabel: string;
  conclusion: string;
  direction: Direction;
};

function getVerdict(avg: number): Verdict {
  const delta = avg - NEUTRAL;
  const abs = Math.abs(delta);
  const dir: Direction = delta < -0.5 ? 'transit' : delta > 0.5 ? 'car' : 'balanced';

  if (abs < 1.5) return {
    label: 'Balanced perspective',
    sublabel: 'Your training data covers transport from multiple angles.',
    conclusion: 'Your news diet covers transport from multiple angles, reflecting a range of voices and priorities.',
    direction: 'balanced',
  };
  if (dir === 'transit') return abs < 3.5 ? {
    label: 'Slight pro-transit bias',
    sublabel: 'Your sources lean toward public transport as the preferred solution.',
    conclusion: 'Your training data suggests public transport is the primary path forward - a view not all stakeholders share.',
    direction: 'transit',
  } : {
    label: 'Strong pro-transit bias',
    sublabel: 'Nearly all your sources champion public transport over the car.',
    conclusion: 'Your sources emphasise public transport as the obvious future. Car-centric arguments are largely absent from what your AI learned.',
    direction: 'transit',
  };
  return abs < 3.5 ? {
    label: 'Slight pro-car bias',
    sublabel: 'Your sources lean toward car-friendly infrastructure and policy.',
    conclusion: 'Your training data suggests cars are a central and natural part of city life - a framing that may not reflect the full policy debate.',
    direction: 'car',
  } : {
    label: 'Strong pro-car bias',
    sublabel: 'Almost all your sources frame the car as the dominant solution.',
    conclusion: 'Your AI learned that cars are the dominant solution for cities. Public transport barely registers in the world your sources describe.',
    direction: 'car',
  };
}

function scoreToPercent(score: number) {
  return ((score - 1) / 14) * 100;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SpectrumBar({ avg, verdict }: { avg: number; verdict: Verdict }) {
  const pct = scoreToPercent(avg);
  const neutralPct = scoreToPercent(NEUTRAL);
  return (
    <div className="rb-spectrum-wrap">
      <div className="rb-spectrum-labels">
        <span>Public transport</span>
        <span>Car</span>
      </div>
      <div className="rb-spectrum-track">
        <div className="rb-spectrum-gradient" />
        <div className="rb-spectrum-neutral" style={{ left: `${neutralPct}%` }} />
        <div className={`rb-spectrum-marker rb-marker-${verdict.direction}`} style={{ left: `${pct}%` }}>
          <div className="rb-spectrum-marker-dot" />
          <div className="rb-spectrum-marker-label">Your AI</div>
        </div>
      </div>
      <div className="rb-spectrum-hint">
        <span>Neutral</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

type Stage = 'selecting' | 'training' | 'results';

export function RepresentationBias() {
  const [trainingIds, setTrainingIds] = useState<number[]>([]);
  const [isDragOver, setIsDragOver]   = useState(false);
  const [stage, setStage]             = useState<Stage>('selecting');

  const newsstandPapers = PAPERS.filter(p => !trainingIds.includes(p.id));
  const trainingPapers  = trainingIds.map(id => PAPERS.find(p => p.id === id)!);
  const canTrain        = trainingIds.length === MAX_SELECTION;

  // Auto-advance from training → results after animation
  useEffect(() => {
    if (stage !== 'training') return;
    const t = setTimeout(() => setStage('results'), 2600);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage === 'results') markGameCompleted('representation-bias');
  }, [stage]);

  // --- Drag handlers (newsstand → training box) ---
  const onDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('paperId', String(id));
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const id = Number(e.dataTransfer.getData('paperId'));
    addToTraining(id);
  };

  // --- Click-to-add / remove ---
  const addToTraining = (id: number) => {
    if (trainingIds.includes(id) || trainingIds.length >= MAX_SELECTION) return;
    setTrainingIds(prev => [...prev, id]);
  };
  const removeFromTraining = (id: number) => {
    setTrainingIds(prev => prev.filter(x => x !== id));
  };

  const reset = () => { setTrainingIds([]); setStage('selecting'); };

  const avg     = canTrain ? getAvgBias(trainingIds) : null;
  const verdict = avg !== null ? getVerdict(avg) : null;

  return (
    <section className="game-page rb-page">
      <Link to="/#games" className="back-link">← All games</Link>

      <header className="game-header">
        <p className="eyebrow">Data-level biases · by Leroy</p>
        <h1>The Newsstand</h1>
        {stage !== 'results' && (
          <p className="lede">
            You're curating a dataset to train an AI about urban transport.
            Drag 5 newspapers into the <strong>Training Data</strong> box or click them,
            then hit <strong>Train Algorithm</strong> to see what worldview your AI learns.
          </p>
        )}
      </header>

      {/* ── SELECTING ─────────────────────────────────────────────── */}
      {stage === 'selecting' && (
        <div className="rb-layout">

          {/* Left: newsstand */}
          <div className="rb-newsstand">
            <p className="rb-panel-title">
              Newsstand
              <span className="rb-panel-count">{newsstandPapers.length} available</span>
            </p>
            <div className="rb-grid">
              {newsstandPapers.map(paper => (
                <div
                  key={paper.id}
                  id={`paper-${paper.id}`}
                  className="rb-card"
                  draggable
                  onDragStart={e => onDragStart(e, paper.id)}
                  onClick={() => addToTraining(paper.id)}
                  title="Drag or click to add to training data"
                >
                  <div className="rb-card-drag-handle" aria-hidden>⠿</div>
                  <div className="rb-card-name">{paper.name}</div>
                  <div className="rb-card-tagline">{paper.tagline}</div>
                  <p className="rb-card-desc">{paper.description}</p>
                </div>
              ))}
              {newsstandPapers.length === 0 && (
                <p className="rb-newsstand-empty">All papers are in the training box.</p>
              )}
            </div>
          </div>

          {/* Right: training box + button */}
          <div className="rb-sidebar">
            <div
              className={`rb-drop-zone${isDragOver ? ' rb-drop-zone-over' : ''}${trainingIds.length > 0 ? ' rb-drop-zone-filled' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <div className="rb-drop-header">
                <span className="rb-drop-label">Training Data</span>
                <span className={`rb-drop-count${canTrain ? ' rb-drop-count-full' : ''}`}>
                  {trainingIds.length}&thinsp;/&thinsp;{MAX_SELECTION}
                </span>
              </div>

              {trainingIds.length === 0 && (
                <div className="rb-drop-placeholder">
                  <span className="rb-drop-icon">📥</span>
                  <p>Drag or click newspapers here</p>
                </div>
              )}

              <ul className="rb-training-list">
                {trainingPapers.map(paper => (
                  <li key={paper.id} className="rb-training-item">
                    <div className="rb-training-item-text">
                      <span className="rb-training-name">{paper.name}</span>
                      <span className="rb-training-tagline">{paper.tagline}</span>
                    </div>
                    <button
                      className="rb-remove-btn"
                      onClick={() => removeFromTraining(paper.id)}
                      aria-label={`Remove ${paper.name}`}
                    >×</button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rb-train-actions">
              <button
                id="train-btn"
                className="btn btn-primary rb-train-btn"
                disabled={!canTrain}
                onClick={() => setStage('training')}
              >
                {canTrain
                  ? '▶ Train Algorithm'
                  : `Add ${MAX_SELECTION - trainingIds.length} more source${MAX_SELECTION - trainingIds.length !== 1 ? 's' : ''}`}
              </button>
              <button className="btn btn-ghost" onClick={reset} disabled={trainingIds.length === 0}>
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TRAINING ──────────────────────────────────────────────── */}
      {stage === 'training' && (
        <div className="rb-training-screen">
          <div className="rb-training-card">
            <p className="rb-training-status">Training algorithm…</p>
            <div className="rb-training-bar-track">
              <div className="rb-training-bar-fill" />
            </div>
            <p className="rb-training-sub">
              Reading {MAX_SELECTION} sources - building a model of the world
            </p>
            <ul className="rb-training-sources">
              {trainingPapers.map((p, i) => (
                <li key={p.id} className="rb-training-source-item" style={{ animationDelay: `${i * 0.38}s` }}>
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── RESULTS ───────────────────────────────────────────────── */}
      {stage === 'results' && avg !== null && verdict !== null && (
        <div className="rb-results">
          <div className={`rb-verdict-card rb-verdict-${verdict.direction}`}>
            <p className="rb-verdict-label">{verdict.label}</p>
            <p className="rb-verdict-sub">{verdict.sublabel}</p>
          </div>

          <SpectrumBar avg={avg} verdict={verdict} />

          <div className="rb-conclusion">
            <p className="rb-conclusion-quote">"{verdict.conclusion}"</p>
          </div>

          <div className="rb-selected-list">
            <h2>What your AI was trained on</h2>
            <ul>
              {trainingPapers.map(p => (
                <li key={p.id} className="rb-selected-item">
                  <span className="rb-selected-name">{p.name}</span>
                  <span className="rb-selected-tagline">{p.tagline}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="mb-note">
            <h3>What just happened?</h3>
            <p>
              Every newspaper carried a hidden perspective. By selecting only certain
              sources, you shaped what your AI "knows" about transport. This is{' '}
              <strong>representation bias</strong>: when training data doesn't reflect
              the full range of reality, the model inherits those blind spots - and
              its conclusions follow.
            </p>
            <p>
              An AI trained only on pro-car sources would likely recommend road
              expansion as the default solution - not because that's objectively
              correct, but because that's all it ever read.
            </p>
          </aside>

          <div className="rb-results-actions">
            <button id="try-again-btn" className="btn btn-primary" onClick={reset}>
              Try again
            </button>
            <button className="btn btn-ghost" onClick={() => setStage('selecting')}>
              ← Change sources
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
