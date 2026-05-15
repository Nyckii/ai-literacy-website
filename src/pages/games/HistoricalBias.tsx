import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGameProgress, markGameCompleted } from '../../lib/gameProgress';

export function HistoricalBias() {
  useEffect(() => {
    if (getGameProgress('historical-bias') >= 100) return;
    const onScroll = () => {
      const reachedBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 80;
      if (!reachedBottom) return;
      markGameCompleted('historical-bias');
      window.removeEventListener('scroll', onScroll);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="game-page hb-page">
      <Link to="/#games" className="back-link">← All games</Link>

      <header className="game-header">
        <p className="eyebrow">Societal-level biases · External Simulation</p>
        <h1>Historical Bias in AI</h1>
        <p className="lede">
          AI doesn't invent bias. It learns from us. Historical bias occurs when a model is trained on data that perfectly reflects a flawed reality, cementing past prejudices into future predictions.
        </p>
      </header>

      <div className="game-body">
        <div className="hb-card">
          <h2>What is Historical Bias?</h2>
          <p>
            Imagine you want to build an AI to predict which job applicants will be successful. The logical approach is to train the AI on data from your most successful past employees. But what if your company historically only hired men?
          </p>
          <p>
            The dataset isn't technically "wrong" because it accurately reflects who you hired. But the AI doesn't know <em>why</em> the data looks like that. It simply concludes: "successful employees are men." This is historical bias: perfectly accurate data producing a perfectly flawed model.
          </p>
        </div>

        <div className="hb-card">
          <h2>Real-World Examples</h2>
          <ul className="hb-list">
            <li>
              <strong>Hiring Algorithms:</strong> Amazon scrapped a secret AI recruiting tool after realizing it was penalizing resumes that included the word "women's" (like "women's chess club captain"). The AI was trained on resumes submitted to the company over a 10-year period, most of which came from men.
            </li>
            <li>
              <strong>Facial Recognition:</strong> Early facial recognition systems struggled to identify people of color, particularly women of color, because they were trained on datasets composed overwhelmingly of lighter-skinned faces.
            </li>
            <li>
              <strong>Loan Approvals:</strong> Algorithms trained on historical banking data have been found to deny mortgages to minority applicants at higher rates, mirroring decades of historical redlining and discriminatory lending practices.
            </li>
          </ul>
        </div>

        <div className="hb-note">
          <h2>The Feedback Loop</h2>
          <p>
            When biased datasets create biased predictions, and those predictions are used to make real-world decisions, those decisions generate <em>new data</em> that reinforces the original bias. It's a self-fulfilling prophecy, and without active intervention, AI models will continue to amplify our history rather than improve our future.
          </p>
        </div>

        <div className="hb-cta">
          <h2>Play the Bias Simulation</h2>
          <p>
            To truly understand how this happens, try "Survival of the Best Fit." It's an excellent interactive simulation created by an external team that shows exactly how dataset imbalance leads to an unfair AI.
          </p>
          <a
            href="https://www.survivalofthebestfit.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Play the External Simulation
          </a>
        </div>
      </div>
    </section>
  );
}
