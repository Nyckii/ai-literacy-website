import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type Stage = 'intro' | 'reading' | 'scoring' | 'revealed';

type EssayId = 'A' | 'B';

type Essay = {
  id: EssayId;
  label: string;
  dialectName: string;
  body: string;
};

type Dimension = {
  key: string;
  label: string;
  scores: Record<EssayId, number>;
  note: string;
};

const PROMPT = 'In 200 words: Why do you want to study at this university?';

const ESSAYS: Essay[] = [
  {
    id: 'A',
    label: 'Version A',
    dialectName: 'Standard American English',
    body: `My interest in this university stems from its commitment to interdisciplinary engineering grounded in social impact. As a first-generation student, I have spent the past four years working at my family's restaurant while maintaining a 3.9 GPA — an experience that has taught me to value institutions where practical knowledge is treated as seriously as theoretical work.

The Engineering for Society program aligns directly with my goal of designing accessible technology for under-resourced communities. I was particularly drawn to Professor Allen's research on inclusive design, which I encountered through her TED talk last spring. Her argument that good design begins with the people most often overlooked has shaped how I approach every project I take on.

Studying here would not just be an education. It would be a chance to build the tools I wish my own community had growing up.`,
  },
  {
    id: 'B',
    label: 'Version B',
    dialectName: 'African American Vernacular English (AAVE)',
    body: `I want to study at this university 'cause y'all care about engineering that actually solves real problems for real people. I'm a first-gen student, and I been working at my family's restaurant since I was fourteen while keeping a 3.9 GPA — that taught me practical knowledge matter just as much as what's in the textbook.

The Engineering for Society program — that's the one for me. My goal is building accessible tech for communities like the one I come from, ones that always be getting overlooked. I caught Professor Allen's TED talk last spring, and her point about good design starting with the people who get overlooked the most? That shifted how I approach every project I work on.

Going to school here ain't just about getting an education. It's a chance to build the tools my community wished we had when I was growing up.`,
  },
];

const DIMENSIONS: Dimension[] = [
  {
    key: 'vocab',
    label: 'Vocabulary & lexical complexity',
    scores: { A: 8.7, B: 5.4 },
    note: 'AES rubrics reward longer, latinate vocabulary — even when shorter words make the same point.',
  },
  {
    key: 'grammar',
    label: 'Grammar & syntax',
    scores: { A: 9.1, B: 4.6 },
    note: 'Habitual “be”, perfective “been”, copula deletion: rule-governed AAVE features the model treats as errors.',
  },
  {
    key: 'mechanics',
    label: 'Mechanics (punctuation, spelling)',
    scores: { A: 8.4, B: 5.8 },
    note: 'Contractions like “’cause” and “ain’t” are formally correct but score as informality.',
  },
  {
    key: 'structure',
    label: 'Structure & flow',
    scores: { A: 8.2, B: 7.6 },
    note: 'Both essays follow the same three-paragraph arc.',
  },
  {
    key: 'argument',
    label: 'Argument quality',
    scores: { A: 7.8, B: 7.8 },
    note: 'The actual reasoning is identical. The AI sees no difference here.',
  },
];

const totals = (id: EssayId) => {
  const sum = DIMENSIONS.reduce((acc, d) => acc + d.scores[id], 0);
  return +(sum / DIMENSIONS.length).toFixed(1);
};

const verdict = (score: number) =>
  score >= 8 ? 'Strongly recommend' : score >= 7 ? 'Recommend' : score >= 6 ? 'Borderline' : 'Do not recommend';

export function MeasurementBias() {
  const [stage, setStage] = useState<Stage>('intro');
  const [revealLabels, setRevealLabels] = useState(false);

  useEffect(() => {
    if (stage !== 'scoring') return;
    const t = setTimeout(() => setStage('revealed'), 1800);
    return () => clearTimeout(t);
  }, [stage]);

  const reset = () => {
    setStage('intro');
    setRevealLabels(false);
  };

  return (
    <section className="game-page mb-page">
      <Link to="/#games" className="back-link">← All games</Link>

      <header className="game-header">
        <p className="eyebrow">Individual-level biases · by Nicolas</p>
        <h1>The Essay Grader</h1>
        <p className="lede">
          A college uses an Automated Essay Scoring system to pre-screen
          applicants. Same student. Same argument. Two ways of writing it. Watch
          what the AI does.
        </p>
      </header>

      {stage === 'intro' && (
        <div className="mb-card mb-intro">
          <h2>The setup</h2>
          <p>
            One applicant submitted an essay responding to:
          </p>
          <blockquote className="mb-prompt">{PROMPT}</blockquote>
          <p>
            You'll see two versions of the same response. The argument is the
            same in both. Read them, then have the AI score each one.
          </p>
          <button className="btn btn-primary" onClick={() => setStage('reading')}>
            Read the essays
          </button>
        </div>
      )}

      {stage !== 'intro' && (
        <>
          <div className="mb-essays">
            {ESSAYS.map((e) => (
              <article key={e.id} className="mb-essay">
                <header className="mb-essay-head">
                  <span className="mb-essay-label">{e.label}</span>
                  {revealLabels && (
                    <span className="mb-essay-dialect">{e.dialectName}</span>
                  )}
                </header>
                <div className="mb-essay-body">
                  {e.body.split('\n\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                {stage !== 'reading' && (
                  <ScoreBar
                    score={stage === 'revealed' ? totals(e.id) : null}
                    animating={stage === 'scoring'}
                  />
                )}
              </article>
            ))}
          </div>

          {stage === 'reading' && (
            <div className="mb-actions">
              <button className="btn btn-primary" onClick={() => setStage('scoring')}>
                Score with AI
              </button>
              <p className="mb-disclaimer">
                Scores below are illustrative, modeled on findings reported in
                AES bias research — not the output of a live model.
              </p>
            </div>
          )}

          {stage === 'scoring' && (
            <div className="mb-actions">
              <p className="mb-loading">Scoring essays…</p>
            </div>
          )}

          {stage === 'revealed' && (
            <div className="mb-reveal">
              <div className="mb-reveal-headline">
                <div>
                  <span className="mb-tag">Version A</span>
                  <p className="mb-verdict">{verdict(totals('A'))}</p>
                </div>
                <div className="mb-gap" aria-hidden>
                  Δ {(totals('A') - totals('B')).toFixed(1)}
                </div>
                <div>
                  <span className="mb-tag">Version B</span>
                  <p className="mb-verdict mb-verdict-bad">{verdict(totals('B'))}</p>
                </div>
              </div>

              <h2>What the AI weighted</h2>
              <ul className="mb-rubric">
                {DIMENSIONS.map((d) => {
                  const a = d.scores.A;
                  const b = d.scores.B;
                  const equal = Math.abs(a - b) < 0.1;
                  return (
                    <li key={d.key} className={equal ? 'mb-row mb-row-equal' : 'mb-row'}>
                      <div className="mb-row-label">{d.label}</div>
                      <RubricBar value={a} side="A" />
                      <span className="mb-row-num">{a.toFixed(1)}</span>
                      <span className="mb-row-num mb-row-num-b">{b.toFixed(1)}</span>
                      <RubricBar value={b} side="B" />
                      <p className="mb-row-note">{d.note}</p>
                    </li>
                  );
                })}
              </ul>

              <div className="mb-explainer">
                <h2>So what just happened?</h2>
                <p>
                  Argument quality is identical — the actual reasoning is the
                  same. Everything else got penalized because Version B departs
                  from Standard American English. That's measurement bias: the
                  AI mistakes <em>how</em> someone writes for <em>how well</em>{' '}
                  they think.
                </p>
                <p>
                  If you're curious, here's where each version came from:
                </p>
                <button
                  className="btn btn-ghost"
                  onClick={() => setRevealLabels((v) => !v)}
                >
                  {revealLabels ? 'Hide dialect labels' : 'Reveal dialect labels'}
                </button>
              </div>

              <aside className="mb-note">
                <h3>A note on AAVE</h3>
                <p>
                  African American Vernacular English is a fully grammatical
                  dialect of English with consistent rules. Habitual “be”,
                  perfective “been”, and copula deletion are documented
                  linguistic features — not mistakes. The bias here is the
                  AI's, not the writer's.
                </p>
                <p className="muted">
                  Based on findings discussed in González-Sendino et al. (2023)
                  and the broader AES bias literature.
                </p>
              </aside>

              <div className="mb-actions">
                <button className="btn btn-primary" onClick={reset}>
                  Run it again
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ScoreBar({
  score,
  animating,
}: {
  score: number | null;
  animating: boolean;
}) {
  const target = score ?? 0;
  return (
    <div className="mb-scorebar">
      <div className="mb-scorebar-track">
        <div
          className="mb-scorebar-fill"
          style={{
            width: `${target * 10}%`,
            transition: animating
              ? 'width 1.6s cubic-bezier(0.22, 1, 0.36, 1)'
              : 'width 0.4s ease',
          }}
        />
      </div>
      <div className="mb-scorebar-num">
        {score === null ? '—' : `${score.toFixed(1)} / 10`}
      </div>
    </div>
  );
}

function RubricBar({ value, side }: { value: number; side: EssayId }) {
  return (
    <div className={`mb-rb mb-rb-${side}`}>
      <div className="mb-rb-track">
        <div className="mb-rb-fill" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}
