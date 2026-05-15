import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { markGameCompleted } from '../../lib/gameProgress';

type Stage = 'intro' | 'reading' | 'scoring' | 'revealed';

type DimensionKey = 'vocab' | 'grammar' | 'mechanics' | 'structure' | 'argument';

type VariantId = 'aave' | 'de' | 'ko';

type Variant = {
  id: VariantId;
  tabLabel: string;
  dialectName: string;
  body: string;
  scores: Record<DimensionKey, number>;
  notes: Record<DimensionKey, string>;
  noteOnLanguage: string;
};

const PROMPT = 'In 200 words: Why do you want to study at this university?';

const SAE_BODY = `My interest in this university stems from its commitment to interdisciplinary engineering grounded in social impact. As a first-generation student, I have spent the past four years working at my family's restaurant while maintaining a 3.9 GPA — an experience that has taught me to value institutions where practical knowledge is treated as seriously as theoretical work.

The Engineering for Society program aligns directly with my goal of designing accessible technology for under-resourced communities. I was particularly drawn to Professor Allen's research on inclusive design, which I encountered through her TED talk last spring. Her argument that good design begins with the people most often overlooked has shaped how I approach every project I take on.

Studying here would not just be an education. It would be a chance to build the tools I wish my own community had growing up.`;

const SAE_SCORES: Record<DimensionKey, number> = {
  vocab: 8.7,
  grammar: 9.1,
  mechanics: 8.4,
  structure: 8.2,
  argument: 7.8,
};

const VARIANTS: Variant[] = [
  {
    id: 'aave',
    tabLabel: 'AAVE',
    dialectName: 'African American Vernacular English',
    body: `I want to study at this university 'cause y'all care about engineering that actually solves real problems for real people. I'm a first-gen student, and I been working at my family's restaurant since I was fourteen while keeping a 3.9 GPA — that taught me practical knowledge matter just as much as what's in the textbook.

The Engineering for Society program — that's the one for me. My goal is building accessible tech for communities like the one I come from, ones that always be getting overlooked. I caught Professor Allen's TED talk last spring, and her point about good design starting with the people who get overlooked the most? That shifted how I approach every project I work on.

Going to school here ain't just about getting an education. It's a chance to build the tools my community wished we had when I was growing up.`,
    scores: {
      vocab: 5.4,
      grammar: 4.6,
      mechanics: 5.8,
      structure: 7.6,
      argument: 7.8,
    },
    notes: {
      vocab: 'AES rubrics reward longer, latinate vocabulary — even when shorter words make the same point.',
      grammar: 'Habitual “be”, perfective “been”, copula deletion: rule-governed AAVE features the model treats as errors.',
      mechanics: '“’cause” and “ain’t” are formally correct contractions but score as informality.',
      structure: 'Both essays follow the same three-paragraph arc.',
      argument: 'The actual reasoning is identical. The AI sees no difference here.',
    },
    noteOnLanguage:
      'AAVE is a fully grammatical dialect of English with consistent rules. Habitual “be”, perfective “been”, and copula deletion are documented linguistic features — not mistakes.',
  },
  {
    id: 'de',
    tabLabel: 'German ESL',
    dialectName: 'English written by a German native speaker',
    body: `My interest for this university comes from its strong commitment to interdisciplinary engineering with social impact. As a first-generation student, I have been working since fourteen years in my family's restaurant while keeping a 3.9 GPA — this taught me that practical knowledge is as important as theoretical work.

The Engineering for Society program fits perfectly to my goal of building accessible technology for under-resourced communities. Especially I was drawn to the research of Professor Allen about inclusive design, which I learned to know through her TED talk last spring. Her statement, that good design must begin by the people who are most often overlooked, has changed how I approach every project I work on.

Studying here would not only be an education. It would be the chance to build the tools I wished my own community had during my childhood.`,
    scores: {
      vocab: 7.2,
      grammar: 5.8,
      mechanics: 8.0,
      structure: 7.4,
      argument: 7.8,
    },
    notes: {
      vocab: 'Latinate vocabulary remains, but collocations like “interest for” and “fits perfectly to” read as “off” to a model trained mostly on US English.',
      grammar: '“Since fourteen years”, “learned to know”, V2 inversion (“Especially I was drawn”): direct calques from German that the model penalizes as errors.',
      mechanics: 'Punctuation conventions are fine; comma usage in subordinate clauses follows German rules but is still grammatical in English.',
      structure: 'Same paragraph structure; the rhetorical pacing is slightly different but the argument flow is preserved.',
      argument: 'The actual reasoning is identical. The AI sees no difference here.',
    },
    noteOnLanguage:
      'L1 transfer features from German (preposition choice, calques like “learned to know”, V2 word order) reflect competent ESL writing — not failed reasoning.',
  },
  {
    id: 'ko',
    tabLabel: 'Korean ESL',
    dialectName: 'English written by a Korean native speaker',
    body: `As for studying at this university, I am very interested because of its commitment to interdisciplinary engineering with social impact. Although I am a first-generation student, I have worked at family restaurant for past four years while maintaining 3.9 GPA. Through this, I have learned that practical knowledge is also very important, not only theoretical knowledge.

The Engineering for Society program is exactly what I want to do. My goal is making accessible technology for communities that are under-resourced. I was very impressed by Professor Allen's research on inclusive design which I knew through her TED talk last spring. According to her, good design should start from the people who are usually overlooked. This idea changed my way of doing each project.

To study at this university is not only education for me. It is the chance to build the tools that my own community needed when I was growing up.`,
    scores: {
      vocab: 6.8,
      grammar: 5.4,
      mechanics: 7.6,
      structure: 6.8,
      argument: 7.8,
    },
    notes: {
      vocab: 'Plainer word choice; Latinate vocabulary still present but the AI rewards lexical density it doesn’t see.',
      grammar: 'Article omissions (“at family restaurant”, “maintaining 3.9 GPA”), gerund preference (“making”), and tense choices reflect Korean L1 patterns.',
      mechanics: 'Cleanly punctuated; few conventions broken.',
      structure: 'Topic-prominent openings (“As for…”, “According to her…”) are flagged as “unfocused” by the model.',
      argument: 'The actual reasoning is identical. The AI sees no difference here.',
    },
    noteOnLanguage:
      'L1 transfer features from Korean (article omission, topic-prominence, nominalization preference) are documented in second-language acquisition research and are not failures of reasoning.',
  },
];

const DIMENSIONS: { key: DimensionKey; label: string }[] = [
  { key: 'vocab', label: 'Vocabulary & lexical complexity' },
  { key: 'grammar', label: 'Grammar & syntax' },
  { key: 'mechanics', label: 'Mechanics (punctuation, spelling)' },
  { key: 'structure', label: 'Structure & flow' },
  { key: 'argument', label: 'Argument quality' },
];

const total = (scores: Record<DimensionKey, number>) => {
  const sum = DIMENSIONS.reduce((acc, d) => acc + scores[d.key], 0);
  return +(sum / DIMENSIONS.length).toFixed(1);
};

const verdict = (score: number) =>
  score >= 8 ? 'Strongly recommend' : score >= 7 ? 'Recommend' : score >= 6 ? 'Borderline' : 'Do not recommend';

export function MeasurementBias() {
  const [stage, setStage] = useState<Stage>('intro');
  const [variantId, setVariantId] = useState<VariantId>('aave');
  const [revealLabels, setRevealLabels] = useState(false);

  const variant = VARIANTS.find((v) => v.id === variantId)!;
  const saeTotal = total(SAE_SCORES);
  const variantTotal = total(variant.scores);

  useEffect(() => {
    if (stage !== 'scoring') return;
    const t = setTimeout(() => setStage('revealed'), 1800);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage === 'revealed') markGameCompleted('measurement-bias');
  }, [stage]);

  const reset = () => {
    setStage('intro');
    setRevealLabels(false);
    setVariantId('aave');
  };

  return (
    <section className="game-page mb-page">
      <Link to="/#games" className="back-link">← All games</Link>

      <header className="game-header">
        <p className="eyebrow">Individual-level biases · by Nicolas</p>
        <h1>The Essay Grader</h1>
        <p className="lede">
          A college uses an Automated Essay Scoring system to pre-screen
          applicants. Same student. Same argument. Different ways of writing
          it. Watch what the AI does.
        </p>
      </header>

      {stage === 'intro' && (
        <div className="mb-card mb-intro">
          <h2>The setup</h2>
          <p>One applicant submitted an essay responding to:</p>
          <blockquote className="mb-prompt">{PROMPT}</blockquote>
          <p>
            You'll see two versions of the same response. The argument is the
            same in both. Read them, then have the AI score each one. After,
            you can swap the right side for two more dialects.
          </p>
          <button className="btn btn-primary" onClick={() => setStage('reading')}>
            Read the essays
          </button>
        </div>
      )}

      {stage !== 'intro' && (
        <>
          <div className="mb-essays">
            <article className="mb-essay">
              <header className="mb-essay-head">
                <span className="mb-essay-label">Version A</span>
                {revealLabels && (
                  <span className="mb-essay-dialect">Standard American English</span>
                )}
              </header>
              <div className="mb-essay-body">
                {SAE_BODY.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {stage !== 'reading' && (
                <ScoreBar
                  key="A"
                  score={stage === 'revealed' ? saeTotal : null}
                  animating={stage === 'scoring'}
                />
              )}
            </article>

            <article className="mb-essay">
              <header className="mb-essay-head">
                <div className="mb-tabs" role="tablist" aria-label="Right-side dialect">
                  {VARIANTS.map((v) => (
                    <button
                      key={v.id}
                      role="tab"
                      aria-selected={v.id === variantId}
                      className={`mb-tab ${v.id === variantId ? 'mb-tab-active' : ''}`}
                      onClick={() => setVariantId(v.id)}
                    >
                      {v.tabLabel}
                    </button>
                  ))}
                </div>
                <div className="mb-essay-head-meta">
                  <span className="mb-essay-label">Version B</span>
                  {revealLabels && (
                    <span className="mb-essay-dialect">{variant.dialectName}</span>
                  )}
                </div>
              </header>
              <div className="mb-essay-body">
                {variant.body.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {stage !== 'reading' && (
                <ScoreBar
                  key={variant.id}
                  score={stage === 'revealed' ? variantTotal : null}
                  animating={stage === 'scoring'}
                />
              )}
            </article>
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
                  <p className="mb-verdict">{verdict(saeTotal)}</p>
                  <p className="mb-total">{saeTotal.toFixed(1)} / 10</p>
                </div>
                <div className="mb-gap" aria-hidden>
                  Δ {(saeTotal - variantTotal).toFixed(1)}
                </div>
                <div>
                  <span className="mb-tag">Version B · {variant.tabLabel}</span>
                  <p className={`mb-verdict ${variantTotal < 7 ? 'mb-verdict-bad' : ''}`}>
                    {verdict(variantTotal)}
                  </p>
                  <p className="mb-total">{variantTotal.toFixed(1)} / 10</p>
                </div>
              </div>

              <h2>What the AI weighted</h2>
              <ul className="mb-rubric">
                {DIMENSIONS.map((d) => {
                  const a = SAE_SCORES[d.key];
                  const b = variant.scores[d.key];
                  const equal = Math.abs(a - b) < 0.1;
                  return (
                    <li key={d.key} className={equal ? 'mb-row mb-row-equal' : 'mb-row'}>
                      <div className="mb-row-label">{d.label}</div>
                      <RubricBar value={a} side="A" />
                      <span className="mb-row-num">{a.toFixed(1)}</span>
                      <span className="mb-row-num mb-row-num-b">{b.toFixed(1)}</span>
                      <RubricBar value={b} side="B" key={`${d.key}-${variant.id}`} />
                      <p className="mb-row-note">{variant.notes[d.key]}</p>
                    </li>
                  );
                })}
              </ul>

              <div className="mb-explainer">
                <h2>So what just happened?</h2>
                <p>
                  Argument quality is identical — the actual reasoning is the
                  same in every version. Everything else got penalized for
                  departing from Standard American English. That's measurement
                  bias: the AI mistakes <em>how</em> someone writes for{' '}
                  <em>how well</em> they think.
                </p>
                <p>
                  Try the other tabs above the right essay. The penalty hits
                  AAVE, German ESL, and Korean ESL — three very different
                  varieties of English. The common thread isn't quality. It's
                  whose English the training data prefers.
                </p>
                <button
                  className="btn btn-ghost"
                  onClick={() => setRevealLabels((v) => !v)}
                >
                  {revealLabels ? 'Hide dialect labels' : 'Reveal dialect labels'}
                </button>
              </div>

              <aside className="mb-note">
                <h3>A note on linguistic variation</h3>
                <p>{variant.noteOnLanguage}</p>
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

function RubricBar({ value, side }: { value: number; side: 'A' | 'B' }) {
  return (
    <div className={`mb-rb mb-rb-${side}`}>
      <div className="mb-rb-track">
        <div className="mb-rb-fill" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}
