import { useEffect, useRef } from 'react';
import type { ElementType } from 'react';
import { Link } from 'react-router-dom';
import { Buildings, DeviceMobile, FirstAid, Quotes, Scales } from '@phosphor-icons/react';
import { games, LEVEL_LABELS } from '../../data/games';
import './InteractionBias.css';
import { getGameProgress, markGameCompleted } from '../../lib/gameProgress';

interface FlipCardProps {
  Icon: ElementType;
  front: string;
  back: string;
}

export function InteractionBias() {
  const slug = "interaction-bias";
  const game = games.find((g) => g.slug === slug);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const toggleFullScreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch((err) => {
          alert(`Error: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  if (!game) return <p>Game data not found.</p>;

  return (
    <section className="game-page">
      <Link to="/#games" className="back-link">← All games</Link>

      <header className="game-header">
        <p className="eyebrow">{LEVEL_LABELS[game.level]} · by {game.author}</p>
        <h1>{game.title}</h1>
        <p className="lede">{game.short}</p>

      </header>

      <p className="lede">In the digital age, we are accustomed to letting data make decisions for us.</p>
      <div className="ib-intro">
        <p>Artificial Intelligence can scrape millions of likes, comments, and posts to paint a perfect picture of "public opinion" in a matter of seconds. We firmly believe that as long as the dataset is large enough, the algorithm must be absolutely objective.</p>
        <p className="ib-intro-q">But does data really represent everyone?</p>
        <p>Where do the voices go of those who don’t post, don’t hit "like," or don't even know how to use digital devices?</p>
        <p className="ib-intro-brief">Begin your journey below. You will step into the shoes of the AI Project Lead for the Riverside District, tasked with using a state-of-the-art algorithm to plan a new park. Please remember: For every dataset you see, there is a hidden cost you don't.</p>
      </div>

      {/* 2. Game Section */}
      <div className="game-section" style={{ marginTop: '2rem' }}>
        <div
          ref={containerRef}
          className="game-container ib-game-frame"
        >
          <iframe
            src="/Interaction_Bias_Game/index.html"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={game.title}
            allow="fullscreen; cross-origin-isolated"
          />
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
          <button onClick={toggleFullScreen} className="fullscreen-toggle">
            Full Screen
          </button>
        </div>
      </div>

      {/* 3. Reflection Section */}
      <div className="game-content-rich-text" style={{ marginTop: '4rem' }}>
        <h2>Back to Reality: Who Stole Their Voices?</h2>
        <p>In the story you just experienced, the Riverside AI didn't suffer a coding glitch. It executed its statistical task perfectly and efficiently, yet it nearly stripped the elderly and exhausted commuters of their right to a peaceful resting place.</p>

        <p className="ib-highlight">
          It did this because it could only "see" those who had the ability, and the time, to wave at it.
        </p>

        <p style={{ color: 'var(--text-muted)', marginTop: '2rem' }}>Flip the cards below to see how this invisible bias spreads into every corner of the real world.</p>

        {/* 4. Interactive Flip Cards */}
        <div className="flip-cards-container">
          <FlipCard
            Icon={FirstAid}
            front="Why might the most advanced AI doctors be more prone to misdiagnosing marginalized groups?"
            back="Privilege Bias. Advanced medical AI is often deployed in affluent hospitals. Because vulnerable groups face barriers to accessing healthcare, the system rarely collects 'interaction data' from them."
          />
          <FlipCard
            Icon={DeviceMobile}
            front="Why does the trending content on your feed often make your worldview feel increasingly narrow?"
            back="Information Blind Spots. Recommendation algorithms are dominated by a tiny fraction of highly active creators. The system buries moderate and diverse perspectives to maximize engagement."
          />
          <FlipCard
            Icon={Buildings}
            front="In modern companies using AI performance reviews, why do veteran employees suddenly become 'low performers'?"
            back="Algorithmic Marginalization. Frontline workers who aren't 'tech-savvy' lack a digital footprint. In a data-driven evaluation, the tangible results of their hard labor become invisible."
          />
          <FlipCard
            Icon={Scales}
            front="Could not knowing how to use a smartphone cost you your eligibility for government assistance?"
            back="The Penalty of the Digital Divide. In automated welfare assessments, citizens lacking digital skills often submit incomplete info. The algorithm instantly flags them as 'ineligible'."
          />
        </div>

        {/* 5. Core Concept Summary - 这里的排版与 Stereotyping Bias 完全同步 */}
        <div className="core-concept-section" style={{ marginTop: '5rem', paddingBottom: '5rem' }}>
          <h2 className="ib-concept-title">Core Concept: Interaction Bias</h2>
          <p style={{ marginTop: '1.5rem' }}>Through the experience and exploration above, we can assign a formal definition to this phenomenon:</p>

          <div className="ib-definition">
            <p>
              <strong>Interaction Bias</strong> refers to the systemic deviation that occurs when AI systems provide resources or decision-making support, caused by differences in users' engagement levels, usage habits, or objective access to resources during their continuous interaction with the system.
            </p>
          </div>

          <p>It is not simply a matter of personal "laziness" or "inactivity," but a social issue amplified by three core mechanisms:</p>

          <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem' }}>
            <li style={{ marginBottom: '1rem' }}>
              <strong>Data's "Winner-Takes-All":</strong> Algorithms evolve based on feedback. Highly active users generate a disproportionately massive amount of data, steering the algorithm's optimization.
            </li>
            <li style={{ marginBottom: '1rem' }}>
              <strong>Mapping Structural Disadvantages:</strong> Low engagement is often constrained by objective conditions (e.g., lack of digital literacy). The system mistakenly interprets these as a "lack of demand."
            </li>
            <li style={{ marginBottom: '1rem' }}>
              <strong>The Vicious Cycle:</strong> As the algorithm caters to active demographics, the user experience for others drops, ultimately pushing them into total marginalization.
            </li>
          </ul>

          <div className="ib-quote">
            <span className="ib-quote-mark" aria-hidden>
              <Quotes size={28} weight="fill" />
            </span>
            "Algorithms measure the frequency of interaction, not the depth of intention. When we chase AI efficiency without compensating for 'silent' voices, technology becomes a machine that amplifies social inequality."
          </div>
        </div>
      </div>
    </section>
  );
}

function FlipCard({ Icon, front, back }: FlipCardProps) {
  return (
    <div className="custom-flip-card" tabIndex={0}>
      <div className="flip-card-inner">
        <div className="flip-card-front">
          <Icon size={40} weight="duotone" color="var(--accent)" />
          <p>{front}</p>
        </div>
        <div className="flip-card-back">
          <p>{back}</p>
        </div>
      </div>
    </div>
  );
}