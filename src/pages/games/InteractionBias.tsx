import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { games } from '../../data/games';
import './InteractionBias.css';

interface FlipCardProps {
  icon: string;
  front: string;
  back: string;
}

export function InteractionBias() {
  const slug = "interaction-bias";
  const game = games.find((g) => g.slug === slug);
  const containerRef = useRef<HTMLDivElement>(null);

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

      {/* 1. Webpage Header & Pre-game Intro */}
      <header className="game-header">
        <h1>The Silent Square</h1>
        <p className="lede">In the digital age, we are accustomed to letting data make decisions for us.</p>
        <div style={{ marginTop: '1.5rem', color: '#555' }}>
          <p>Artificial Intelligence can scrape millions of likes, comments, and posts to paint a perfect picture of "public opinion" in a matter of seconds. We firmly believe that as long as the dataset is large enough, the algorithm must be absolutely objective.</p>
          <p style={{ fontWeight: 'bold', margin: '1rem 0' }}>But does data really represent everyone?</p>
          <p>Where do the voices go of those who don’t post, don’t hit "like," or don't even know how to use digital devices?</p>
          <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>Begin your journey below. You will step into the shoes of the AI Project Lead for the Riverside District, tasked with using a state-of-the-art algorithm to plan a new park. Please remember: For every dataset you see, there is a hidden cost you don't.</p>
        </div>
      </header>

      {/* 2. Game Section */}
      <div className="game-section" style={{ marginTop: '2rem' }}>
        <div
          ref={containerRef}
          className="game-container"
          style={{
            width: '100%',
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
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

      {/* 3. Post-game Intro & Reflection */}
      <div className="game-content-rich-text" style={{ marginTop: '4rem' }}>
        <h2>Back to Reality — Who Stole Their Voices?</h2>
        <p>In the story you just experienced, the Riverside AI didn't suffer a coding glitch. It executed its statistical task perfectly and efficiently—yet it nearly stripped the elderly and exhausted commuters of their right to a peaceful resting place.</p>
        <p>It did this because it could only "see" those who had the ability, and the time, to wave at it.</p>
        <p>The game may be over, but the "square" in our real world is just opening.</p>
        <p><strong>Take a minute to reflect: In your own life, as you enjoy the highly personalized services brought by algorithms, who is quietly being left behind by the system for being "inactive"?</strong></p>
        <p style={{ color: '#666', marginTop: '1rem' }}>Flip the cards below to see how this invisible bias spreads into every corner of the real world.</p>

        {/* 4. Interactive Flip Cards */}
        <div className="flip-cards-container">
          <FlipCard
            icon="🏥"
            front="Why might the most advanced AI doctors be more prone to misdiagnosing marginalized groups?"
            back="Privilege Bias. Advanced medical AI is often deployed in affluent hospitals. Because vulnerable groups face barriers to accessing healthcare, the system rarely collects 'interaction data' from them. Consequently, the algorithm lacks the required experience when diagnosing minorities, failing to provide equitable medical support."
          />
          <FlipCard
            icon="📱"
            front="Why does the trending content on your feed often make your worldview feel increasingly narrow?"
            back="Information Blind Spots. Recommendation algorithms are dominated by a tiny fraction of highly active creators and users who love to argue. To maximize 'engagement rates,' the system buries moderate, nuanced, and diverse perspectives, depriving everyday users of the right to see the full picture."
          />
          <FlipCard
            icon="🏢"
            front="In modern companies using AI performance reviews, why do hard-working, veteran employees suddenly become 'low performers'?"
            back="Algorithmic Marginalization. Frontline workers who aren't 'tech-savvy' lack the digital footprint of 'clocking in, reporting, and high-frequency interactions' within the system. In a purely data-driven evaluation, the tangible results of their hard labor become invisible to the algorithm."
          />
          <FlipCard
            icon="⚖️"
            front="Could not knowing how to use a smartphone cost you your eligibility for government assistance?"
            back="The Penalty of the Digital Divide. In automated social welfare assessments, citizens lacking digital skills often submit incomplete or incorrectly formatted information. The algorithm instantly flags and rejects them as 'ineligible,' leading to extreme injustice in the distribution of social aid."
          />
        </div>

        {/* 5. Core Concept Summary - 恢复为普通文字排版 */}
        <div className="core-concept-section" style={{ marginTop: '5rem', paddingBottom: '5rem' }}>
          <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>Core Concept: Interaction Bias</h2>
          <p style={{ marginTop: '1.5rem' }}>Through the experience and exploration above, we can assign a formal definition to this phenomenon:</p>
          <p style={{ margin: '1rem 0', padding: '1rem', background: '#f9f9f9', borderRadius: '8px' }}>
            <strong>Interaction Bias</strong> refers to the systemic deviation that occurs when AI systems provide resources or decision-making support, caused by differences in users' engagement levels, usage habits, or objective access to resources during their continuous interaction with the system.
          </p>
          <p>It is not simply a matter of personal "laziness" or "inactivity," but a social issue amplified by three core mechanisms:</p>

          <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem' }}>
            <li style={{ marginBottom: '1rem' }}>
              <strong>Data's "Winner-Takes-All":</strong> Algorithms evolve based on feedback. Highly active users generate a disproportionately massive amount of data, steering the algorithm's optimization and creating a "Matthew Effect" (the rich get richer).
            </li>
            <li style={{ marginBottom: '1rem' }}>
              <strong>Mapping Structural Disadvantages:</strong> Low engagement is often constrained by objective conditions (e.g., a lack of digital literacy, time poverty, or poor accessibility design). The system mistakenly interprets these objective disadvantages as a "lack of demand."
            </li>
            <li style={{ marginBottom: '1rem' }}>
              <strong>The Vicious Cycle:</strong> As the algorithm increasingly caters to the highly active demographic, the user experience for vulnerable groups plummets. This makes them even less willing (or able) to interact with the system, ultimately pushing them into total marginalization.
            </li>
          </ul>

          <p style={{ marginTop: '2rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: '#333' }}>
             Algorithms measure the frequency of interaction, not the depth of intention. When we chase AI efficiency and personalization without actively compensating for "silent" voices, technology simply becomes a machine that automatically amplifies social inequality.
          </p>
        </div>
      </div>
    </section>
  );
}

function FlipCard({ icon, front, back }: FlipCardProps) {
  return (
    <div className="custom-flip-card">
      <div className="flip-card-inner">
        <div className="flip-card-front">
          <span style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{icon}</span>
          <p style={{ fontWeight: 'bold' }}>{front}</p>
        </div>
        <div className="flip-card-back">
          <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{back}</p>
        </div>
      </div>
    </div>
  );
}