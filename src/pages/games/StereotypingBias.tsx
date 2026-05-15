import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { games, LEVEL_LABELS } from '../../data/games';
import { MirrorLabGame } from './MirrorLabGame';
import './StereotypingBias.css';
import { getGameProgress, markGameCompleted } from '../../lib/gameProgress';

export function StereotypingBias() {
  const slug = 'stereotyping-bias';
  const game = games.find((g) => g.slug === slug);

  useEffect(() => {
    if (getGameProgress(slug) >= 100) return;
    const onScroll = () => {
      const reachedBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 80;
      if (!reachedBottom) return;
      markGameCompleted(slug);
      window.removeEventListener('scroll', onScroll);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [slug]);

  if (!game) {
    return (
      <section className="game-page">
        <p>Unknown game.</p>
        <Link to="/" className="back-link">← Back home</Link>
      </section>
    );
  }

  return (
    <section className="game-page">
      <Link to="/#games" className="back-link">← All games</Link>

  
      <header className="game-header">
        <p className="eyebrow">
          {LEVEL_LABELS[game.level as keyof typeof LEVEL_LABELS]} · by {game.author}
        </p>
        <h1>{game.title}</h1>
        <p className="lede">{game.short}</p>
      </header>

      <article className="game-body">


        <div className="pre-game-section">
          <h2>A Test of "First Instinct"</h2>
          <p>
            We often consider ourselves objective enough, and we believe AI is synonymous with pure rationality.
            But the truth is, all of AI's knowledge originates from us—from a world that is already full of prejudices.
          </p>
          <p>
            Please complete the short game below. Let's find out together: <strong>Is AI truly objective?</strong>
          </p>
        </div>

    
        <div className="game-container-wrapper">
          <MirrorLabGame />
        </div>


        <div className="post-game-section">
          <h2>The Web of Bias: Why are we trapped in the algorithm?</h2>

          <div className="theory-intro">
            <p>
              The game you just played wasn't merely a test; it revealed the most hidden flaw of Artificial Intelligence: <strong>Stereotyping Bias</strong>.
            </p>


            <div className="definition-box" style={{ margin: '2rem 0', padding: '1.5rem', background: '#f9f9f9', borderRadius: '8px', borderLeft: '4px solid #1a1a1a' }}>
              <p style={{ margin: 0 }}>
                <strong>Definition:</strong> Stereotypical Bias refers to how AI systems absorb, solidify, and amplify long-standing group labels (such as ingrained stereotypes based on gender, race, religion, age, or class) from human social history, using them as "default premises" to evaluate, predict, or treat individuals.
              </p>
            </div>

            <p className="highlight-sentence">
              This is not just an AI mistake; it is the collective replication of human history's inequality in the digital world.
            </p>
          </div>

  
          <div className="theory-cards-container">
            <div className="theory-card">
              <h4>1. Algorithm "Labeling":<br />Invisible Deprivation</h4>
              <p>In resource allocation systems, algorithms often ignore your actual capabilities and directly apply the <strong>"group average impression."</strong></p>
              <ul>
                <li><strong>Screening Barriers:</strong> Recruitment AI might disadvantage female candidates simply because historical data dictates "tech leads are mostly male."</li>
                <li><strong>Information Blocking:</strong> Algorithms selectively push "high-value info" to specific groups, shutting the door on others.</li>
              </ul>
            </div>

            <div className="theory-card">
              <h4>2. Representation Toxicity:<br />Polluted Semantic Space</h4>
              <p>In the underlying logic of generative AI (like GPT), bias is encoded into the very marrow of vocabulary.</p>
              <ul>
                <li><strong>Harmful Associations:</strong> When completing text, algorithms stubbornly link minority groups with <strong>"negative"</strong> words.</li>
                <li><strong>Semantic Lock-in:</strong> In AI's math, certain professions are deeply tied to specific genders, reinforcing outdated social perceptions.</li>
              </ul>
            </div>

            <div className="theory-card">
              <h4>3. The Fatal Loop:<br />Self-Fulfilling Prophecies</h4>
              <p>This creates an inescapable closed loop: AI limits what you see, you react within those limits, and that restricted data reinforces the original bias.</p>
              <ul>
                <li><strong>Reinforcing Bias:</strong> The algorithm concludes: "See, this type of person is indeed only suited for these things."</li>
              </ul>
            </div>
          </div>

    
          <div className="final-thoughts">
            <h3>Final Thoughts: Debiasing</h3>
            <p>
              The original intention of AI is to break boundaries. But without human intervention and deliberate <strong>debiasing</strong> design, it will become the most efficient bias-manufacturing machine.
            </p>

            <div className="theory-quote">
              "Seeing this bias is the first step to breaking the digital shackles."
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}