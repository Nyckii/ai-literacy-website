import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type Stage = 'intro' | 'home' | 'predicting' | 'deploy' | 'revealed';
type DestId = 'us' | 'in' | 'id' | 'ch1955';
type FeatureId =
  | 'currency'
  | 'cost'
  | 'industry'
  | 'education'
  | 'tax'
  | 'pension'
  | 'era';

type TrainingFeature = {
  id: FeatureId;
  label: string;
  detail: string;
};

type Destination = {
  id: DestId;
  flag: string;
  label: string;
  short: string;
  axis: 'space' | 'time';
  actualMedianCHF: number;
  actualRangeCHF: [number, number];
  breaks: Partial<Record<FeatureId, string>>;
  consequence: string;
  // Position on the bullseye (relative to a 400x400 viewBox, centered at 200,200)
  position: { x: number; y: number };
  // Domain-distance label
  distance: 'near' | 'far' | 'very-far';
};

const PROFILE_TITLE = 'Software engineer';
const PROFILE_DETAILS = 'BSc in Computer Science · 5 years experience';

const HOME_PREDICTION = 108_000;
const HOME_ACTUAL_MEDIAN = 110_000;
const HOME_ACTUAL_RANGE: [number, number] = [92_000, 138_000];
const CONFIDENCE = 95;

const TRAINING_FEATURES: TrainingFeature[] = [
  {
    id: 'currency',
    label: 'Currency: CHF',
    detail: 'All wages denominated in Swiss francs.',
  },
  {
    id: 'cost',
    label: 'Cost-of-living anchor: Swiss',
    detail: 'Median rent CHF 1,800/mo; basket of goods priced in Zürich.',
  },
  {
    id: 'industry',
    label: 'Industry mix: banking · pharma · ICT · watches',
    detail: 'Banking 18% · Pharma 14% · ICT 12% · Watches 8% of training payroll.',
  },
  {
    id: 'education',
    label: 'Credentials: BSc + Lehre (apprenticeship)',
    detail: 'Swiss apprenticeship (Lehre) heavily weighted as a positive signal.',
  },
  {
    id: 'tax',
    label: '26 cantonal tax structures',
    detail: 'Net-pay calibration baked in per canton.',
  },
  {
    id: 'pension',
    label: 'BVG pension (hidden ~CHF 25k/yr)',
    detail: 'Swiss employer pension contribution treated as part of compensation.',
  },
  {
    id: 'era',
    label: 'Era: 2018–2023',
    detail: 'Wage levels, inflation, and industry composition of recent Swiss data.',
  },
];

const DESTINATIONS: Destination[] = [
  {
    id: 'us',
    flag: '🇺🇸',
    label: 'United States, 2024',
    short: 'USA',
    axis: 'space',
    actualMedianCHF: 145_000,
    actualRangeCHF: [85_000, 280_000],
    breaks: {
      cost: 'SF/NYC tech hubs run 2–3× the US median. The Swiss anchor under-shoots.',
      industry:
        'US tech is dominated by Big Tech with stock comp; Swiss training set saw mostly cash salaries from banking + pharma.',
      education:
        'Swiss apprenticeships barely exist in the US labor market — the model gives a positive signal that has nowhere to land.',
      pension:
        'In Switzerland, BVG pensions are treated as ~CHF 25k of hidden comp. In the US, healthcare + 401k structure is totally different.',
    },
    consequence:
      'The model would lowball every senior offer by ~CHF 35k. You\'d lose every candidate to a competitor before signing.',
    position: { x: 290, y: 178 },
    distance: 'near',
  },
  {
    id: 'in',
    flag: '🇮🇳',
    label: 'India, 2024',
    short: 'India',
    axis: 'space',
    actualMedianCHF: 18_500,
    actualRangeCHF: [9_000, 35_000],
    breaks: {
      currency:
        'CHF 108k converted into INR is ~94 lakh — about 6× a typical senior engineer\'s package.',
      cost:
        'Mumbai rent ≈ CHF 600/mo; Zürich rent ≈ CHF 2,200/mo. The salary baseline is calibrated to costs that don\'t apply.',
      industry:
        'Indian tech is dominated by services firms (TCS, Infosys, Wipro) — different pay structures than Swiss banking + pharma.',
      education:
        'A BSc from IIT Bombay vs. a Tier-3 college means wildly different things — a split the Swiss data has never seen.',
      tax: 'Indian tax brackets and bonus structures don\'t map to 26 Swiss cantonal regimes.',
      pension:
        'Indian provident-fund structure differs from Swiss BVG; the "hidden comp" assumption is wrong.',
    },
    consequence:
      'The model would offer a Mumbai engineer roughly 6× the local market rate — bankrupting the company on its first hire.',
    position: { x: 350, y: 220 },
    distance: 'very-far',
  },
  {
    id: 'id',
    flag: '🇮🇩',
    label: 'Indonesia, 2024',
    short: 'Indonesia',
    axis: 'space',
    actualMedianCHF: 12_500,
    actualRangeCHF: [6_000, 28_000],
    breaks: {
      currency:
        'IDR salaries don\'t scale linearly with CHF; converting blows up the number even more.',
      cost:
        'Jakarta living costs are a fraction of Zürich\'s — the salary baseline has no anchor here.',
      industry:
        'Indonesia\'s tech scene is concentrated in Jakarta, dominated by Southeast-Asian unicorns the Swiss data has never seen.',
      education:
        'Tertiary penetration is much lower; a BSc means something different in the Indonesian labor market.',
      tax: 'Indonesian tax + BPJS structure is unrelated to Swiss cantonal taxes.',
      pension:
        'BPJS Ketenagakerjaan ≠ BVG pensions; the hidden-comp assumption inflates the prediction.',
    },
    consequence:
      'Predictions are 8× the actual market. Every offer is a giveaway — your margins evaporate by month two.',
    position: { x: 365, y: 180 },
    distance: 'very-far',
  },
  {
    id: 'ch1955',
    flag: '🇨🇭',
    label: 'Switzerland, 1955',
    short: 'Switzerland (1955)',
    axis: 'time',
    actualMedianCHF: 7_200,
    actualRangeCHF: [5_000, 12_000],
    breaks: {
      cost: 'Cost of living in 1955 Switzerland was ~1/5 of today\'s. Salaries scale with prices.',
      industry:
        'In 1955, the Swiss economy ran on watchmaking, textiles, and manufacturing — not banking, pharma, ICT.',
      education:
        '~3% of the population had a university degree in 1955 vs. ~32% today. A BSc was an elite signal, not a baseline.',
      tax: 'Cantonal tax brackets were structured very differently before federal harmonization.',
      era: 'The role "software engineer" barely existed. The closest comparable was a technical clerk.',
    },
    consequence:
      'Same country, same currency, different decade. The model is just as wrong here as in Indonesia. Domain shift isn\'t only about geography.',
    position: { x: 198, y: 35 },
    distance: 'very-far',
  },
];

const fmtCHF = (n: number) => `CHF ${n.toLocaleString('de-CH')}`;
const fmtCHFShort = (n: number) =>
  n >= 1000 ? `CHF ${(n / 1000).toFixed(0)}k` : `CHF ${n}`;

const ratioLabel = (predicted: number, actual: number) => {
  if (predicted >= actual) {
    const r = predicted / actual;
    return r < 1.1 ? '≈ 1×' : `${r.toFixed(1)}× too high`;
  }
  const r = actual / predicted;
  return r < 1.1 ? '≈ 1×' : `${r.toFixed(1)}× too low`;
};

export function MappingBias() {
  const [stage, setStage] = useState<Stage>('intro');
  const [predictAnim, setPredictAnim] = useState(false);
  const [activeDest, setActiveDest] = useState<DestId | null>(null);
  const [visited, setVisited] = useState<Set<DestId>>(new Set());

  // The "home" prediction: animate the score-bar fill in once we land on
  // the home stage. predictAnim is reset to false in reset().
  useEffect(() => {
    if (stage !== 'home') return;
    const t = setTimeout(() => setPredictAnim(true), 120);
    return () => clearTimeout(t);
  }, [stage]);

  const active = useMemo(
    () => DESTINATIONS.find((d) => d.id === activeDest) ?? null,
    [activeDest],
  );

  const reset = () => {
    setStage('intro');
    setActiveDest(null);
    setVisited(new Set());
    setPredictAnim(false);
  };

  const selectDestination = (id: DestId) => {
    setActiveDest(id);
    setVisited((s) => {
      const n = new Set(s);
      n.add(id);
      return n;
    });
  };

  return (
    <section className="game-page mp-page">
      <Link to="/#games" className="back-link">← All games</Link>

      <header className="game-header">
        <p className="eyebrow">Group-level biases · by Nicolas</p>
        <h1>Out of Bounds</h1>
        <p className="lede">
          You trained a salary predictor on Swiss labor data. It works.
          Tomorrow your CEO wants to ship it worldwide. Let's see what happens.
        </p>
      </header>

      {stage === 'intro' && (
        <div className="mp-card mp-intro">
          <h2>The setup</h2>
          <p>
            You're a data scientist at <strong>SwissPay AG</strong>, a Zürich
            HR-tech startup. You spent six months training a salary
            recommendation model on{' '}
            <strong>412,000 Swiss payroll records</strong> from 2018 to 2023.
            On Swiss test data it's accurate to within ±3%.
          </p>
          <p>
            Tomorrow's launch is global. Before it goes out, run a few
            predictions.
          </p>
          <button className="btn btn-primary" onClick={() => setStage('home')}>
            Test it on Swiss data →
          </button>
        </div>
      )}

      {stage !== 'intro' && (
        <>
          <div className="mp-profile">
            <div className="mp-profile-row">
              <span className="mp-profile-label">Profile</span>
              <span className="mp-profile-value">
                {PROFILE_TITLE} · {PROFILE_DETAILS}
              </span>
            </div>
            <div className="mp-profile-row">
              <span className="mp-profile-label">Model</span>
              <span className="mp-profile-value">
                SwissPay-v1 · trained on Swiss payroll data, 2018–2023
              </span>
            </div>
          </div>

          <div className="mp-stage-grid">
            {/* LEFT: prediction box. Always visible after intro. */}
            <article className="mp-card mp-prediction">
              <header className="mp-prediction-head">
                <span className="mp-prediction-label">Model prediction</span>
                <span className="mp-confidence" title="Model's self-reported confidence">
                  <span className="mp-confidence-dot" /> {CONFIDENCE}% confidence
                </span>
              </header>

              <div className="mp-prediction-amount">
                {fmtCHF(HOME_PREDICTION)}
              </div>
              <div className="mp-prediction-meta">
                annual gross · point estimate
              </div>

              <div className="mp-prediction-bar">
                <div
                  className="mp-prediction-bar-fill"
                  style={{
                    width: predictAnim ? `${CONFIDENCE}%` : '0%',
                  }}
                />
              </div>

              <p className="mp-prediction-foot">
                The model gives the same number, with the same confidence,
                no matter where you deploy it. That's the trick.
              </p>
            </article>

            {/* RIGHT: changes by stage */}
            <article className="mp-card mp-actual">
              {stage === 'home' && (
                <HomeActual
                  median={HOME_ACTUAL_MEDIAN}
                  range={HOME_ACTUAL_RANGE}
                  predicted={HOME_PREDICTION}
                  onContinue={() => setStage('deploy')}
                />
              )}

              {(stage === 'deploy' || stage === 'revealed') && active && (
                <DestinationActual destination={active} />
              )}

              {(stage === 'deploy' || stage === 'revealed') && !active && (
                <div className="mp-actual-empty">
                  <h3>Pick a market →</h3>
                  <p>
                    Choose a destination below. The model will keep predicting{' '}
                    <strong>{fmtCHF(HOME_PREDICTION)}</strong> with{' '}
                    <strong>{CONFIDENCE}% confidence</strong>. Watch what the
                    actual local market looks like.
                  </p>
                </div>
              )}
            </article>
          </div>

          {(stage === 'deploy' || stage === 'revealed') && (
            <>
              <div className="mp-deploy">
                <h2 className="mp-deploy-title">
                  <span className="mp-deploy-eyebrow">Deploy to</span>
                </h2>
                <div className="mp-deploy-tabs" role="tablist">
                  {DESTINATIONS.map((d) => (
                    <button
                      key={d.id}
                      role="tab"
                      aria-selected={activeDest === d.id}
                      className={[
                        'mp-deploy-tab',
                        activeDest === d.id ? 'mp-deploy-tab-active' : '',
                        visited.has(d.id) ? 'mp-deploy-tab-visited' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => selectDestination(d.id)}
                    >
                      <span className="mp-deploy-flag">{d.flag}</span>
                      <span className="mp-deploy-name">{d.short}</span>
                      {d.axis === 'time' && (
                        <span className="mp-deploy-badge">time-shift</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <FeaturesPanel active={active} />

              {visited.size >= 2 && stage === 'deploy' && (
                <div className="mp-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => setStage('revealed')}
                  >
                    See the domain of validity →
                  </button>
                  <p className="mp-actions-sub">
                    {visited.size}/{DESTINATIONS.length} markets tested. You
                    can try the rest later.
                  </p>
                </div>
              )}

              {visited.size < 2 && stage === 'deploy' && active && (
                <p className="mp-hint">
                  Try at least one more market — domain shift looks different
                  on every axis.
                </p>
              )}
            </>
          )}

          {stage === 'revealed' && (
            <Reveal onReset={reset} />
          )}
        </>
      )}
    </section>
  );
}

function HomeActual({
  median,
  range,
  predicted,
  onContinue,
}: {
  median: number;
  range: [number, number];
  predicted: number;
  onContinue: () => void;
}) {
  const errorPct = Math.round(((predicted - median) / median) * 100);
  return (
    <>
      <header className="mp-actual-head">
        <span className="mp-actual-label">Actual market · 🇨🇭 Switzerland, 2024</span>
        <span className="mp-actual-tag mp-actual-tag-good">in-domain ✓</span>
      </header>

      <div className="mp-actual-amount">{fmtCHF(median)}</div>
      <div className="mp-actual-meta">
        median · range {fmtCHFShort(range[0])} – {fmtCHFShort(range[1])}
      </div>

      <DistributionBar
        range={range}
        median={median}
        predicted={predicted}
      />

      <p className="mp-actual-verdict mp-actual-verdict-good">
        Off by {errorPct >= 0 ? '+' : ''}
        {errorPct}%. Inside the model's training distribution — exactly what
        we'd hope.
      </p>

      <div className="mp-actions">
        <button className="btn btn-primary" onClick={onContinue}>
          Looks good. Ship it worldwide →
        </button>
      </div>
    </>
  );
}

function DestinationActual({ destination }: { destination: Destination }) {
  const { actualMedianCHF, actualRangeCHF, label, flag } = destination;
  const overshoot = HOME_PREDICTION >= actualMedianCHF;
  return (
    <>
      <header className="mp-actual-head">
        <span className="mp-actual-label">
          Actual market · {flag} {label}
        </span>
        <span className="mp-actual-tag mp-actual-tag-bad">out-of-domain</span>
      </header>

      <div className="mp-actual-amount">{fmtCHF(actualMedianCHF)}</div>
      <div className="mp-actual-meta">
        median · range {fmtCHFShort(actualRangeCHF[0])} –{' '}
        {fmtCHFShort(actualRangeCHF[1])}
      </div>

      <DistributionBar
        range={actualRangeCHF}
        median={actualMedianCHF}
        predicted={HOME_PREDICTION}
      />

      <p className="mp-actual-verdict mp-actual-verdict-bad">
        Off by {ratioLabel(HOME_PREDICTION, actualMedianCHF)} ·{' '}
        {overshoot ? 'over-predicting' : 'under-predicting'} the local market.
        The model didn't notice.
      </p>

      <div className="mp-consequence">
        <span className="mp-consequence-label">If you deployed this:</span>
        <p>{destination.consequence}</p>
      </div>
    </>
  );
}

/**
 * A horizontal bar showing the local salary range with a marker for the
 * actual median (white) and the model's prediction (red). When the
 * prediction lies outside the local range, the marker is pinned to the edge
 * with a "→" indicator and a numeric overflow label.
 */
function DistributionBar({
  range,
  median,
  predicted,
}: {
  range: [number, number];
  median: number;
  predicted: number;
}) {
  // Build a chart range that always shows both the local range and the
  // model's prediction so the user can see how far off it is.
  const padFactor = 0.08;
  const minVisible = Math.min(range[0], predicted, median);
  const maxVisible = Math.max(range[1], predicted, median);
  const span = maxVisible - minVisible;
  const lo = Math.max(0, minVisible - span * padFactor);
  const hi = maxVisible + span * padFactor;
  const total = hi - lo;

  const pct = (v: number) => ((v - lo) / total) * 100;

  const localStart = pct(range[0]);
  const localEnd = pct(range[1]);
  const medianPct = pct(median);
  const predictedPct = pct(predicted);

  return (
    <div className="mp-dist">
      <div className="mp-dist-track">
        <div
          className="mp-dist-range"
          style={{ left: `${localStart}%`, width: `${localEnd - localStart}%` }}
          aria-label="local salary range"
        />
        <div
          className="mp-dist-median"
          style={{ left: `${medianPct}%` }}
          aria-label="local median"
          title="Local median"
        />
        <div
          className="mp-dist-predicted"
          style={{ left: `${predictedPct}%` }}
          aria-label="model prediction"
          title="Model prediction"
        >
          <span className="mp-dist-predicted-flag">model says</span>
        </div>
      </div>
      <div className="mp-dist-axis">
        <span>{fmtCHFShort(lo)}</span>
        <span>{fmtCHFShort(hi)}</span>
      </div>
    </div>
  );
}

function FeaturesPanel({ active }: { active: Destination | null }) {
  return (
    <section className="mp-card mp-features">
      <header className="mp-features-head">
        <h2>What's baked into this model</h2>
        <p className="muted">
          Seven assumptions encoded during training. Pick a market above —
          the ones that no longer hold get crossed out.
        </p>
      </header>
      <ul className="mp-features-list">
        {TRAINING_FEATURES.map((f) => {
          const note = active?.breaks[f.id];
          const broken = !!note;
          return (
            <li
              key={f.id}
              className={`mp-feature ${broken ? 'mp-feature-broken' : ''}`}
            >
              <div className="mp-feature-row">
                <span className="mp-feature-marker" aria-hidden>
                  {broken ? '✕' : '•'}
                </span>
                <span className="mp-feature-label">{f.label}</span>
              </div>
              <p className="mp-feature-detail">{f.detail}</p>
              {broken && (
                <p className="mp-feature-broken-note">
                  <strong>Breaks here:</strong> {note}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Reveal({ onReset }: { onReset: () => void }) {
  return (
    <div className="mp-reveal">
      <section className="mp-card mp-domain">
        <header className="mp-domain-head">
          <h2>Domain of validity</h2>
          <p className="muted">
            A model is only valid where it was trained. The center is Swiss
            payroll, 2018–2023. Everything outside is extrapolation — even
            when the confidence stays at 95%.
          </p>
        </header>

        <div className="mp-bullseye-wrap">
          <svg
            className="mp-bullseye"
            viewBox="0 0 400 400"
            role="img"
            aria-label="Domain of validity diagram"
          >
            {/* Outer rings */}
            <circle cx="200" cy="200" r="180" className="mp-ring mp-ring-far" />
            <circle cx="200" cy="200" r="120" className="mp-ring mp-ring-mid" />
            <circle cx="200" cy="200" r="60" className="mp-ring mp-ring-near" />

            {/* Crosshair */}
            <line x1="20" y1="200" x2="380" y2="200" className="mp-axis" />
            <line x1="200" y1="20" x2="200" y2="380" className="mp-axis" />

            {/* Axis labels */}
            <text x="380" y="195" className="mp-axis-label" textAnchor="end">
              shift in space →
            </text>
            <text
              x="200"
              y="14"
              className="mp-axis-label"
              textAnchor="middle"
            >
              ↑ shift in time
            </text>

            {/* Ring labels */}
            <text x="200" y="204" className="mp-ring-label">
              in domain
            </text>
            <text x="200" y="138" className="mp-ring-label mp-ring-label-mid">
              degraded
            </text>
            <text x="200" y="34" className="mp-ring-label mp-ring-label-far">
              extrapolating
            </text>

            {/* Home marker */}
            <g className="mp-dot mp-dot-home">
              <circle cx="200" cy="200" r="8" />
              <text x="210" y="222" className="mp-dot-label">
                🇨🇭 Switzerland · 2024 (trained here)
              </text>
            </g>

            {/* Destinations */}
            {DESTINATIONS.map((d) => (
              <g
                key={d.id}
                className={`mp-dot mp-dot-${d.distance} mp-dot-${d.id}`}
              >
                <circle cx={d.position.x} cy={d.position.y} r="9" />
                <text
                  x={d.position.x + (d.position.x > 200 ? 14 : -14)}
                  y={d.position.y + 4}
                  className="mp-dot-label"
                  textAnchor={d.position.x > 200 ? 'start' : 'end'}
                >
                  {d.flag} {d.short}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="mp-takeaway">
          <h3>The takeaway</h3>
          <p>
            <strong>Mapping bias</strong> is what happens when a model is
            applied outside the population it was trained on. The model
            isn't broken — it's just being asked questions it has no answer
            for.
          </p>
          <p>
            The dangerous part is the confidence score. It stays at 95% in
            India, the US, Indonesia, and 1955 Switzerland alike. Confidence
            is calibrated <em>against the training distribution</em>. Step
            outside, and that number means nothing.
          </p>
        </div>
      </section>

      <aside className="mp-note">
        <h3>How this is different from data bias</h3>
        <p>
          The Swiss training data isn't biased <em>against</em> anyone — it
          captures Swiss salaries accurately. Mapping bias isn't about the
          data being flawed. It's about <em>where the model is deployed</em>.
          The same model is fine in Zürich and harmful in Mumbai. The bias
          lives in the act of transfer, not in the data.
        </p>
        <p className="muted">
          Numbers above are illustrative — calibrated to plausible orders
          of magnitude from public labor-statistics sources, not the output
          of a live model.
        </p>
      </aside>

      <div className="mp-actions">
        <button className="btn btn-ghost" onClick={onReset}>
          Run it again
        </button>
      </div>
    </div>
  );
}
