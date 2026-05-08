import { Link } from 'react-router-dom';
import { gamesByLevel } from '../data/games';
import { BiasRecap } from '../components/BiasRecap';

export function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">AI Literacy · ETH FS26</p>
        <h1>Spotting bias in AI, by playing with it.</h1>
        <p className="lede">
          Short, gamified interactions that surface what bias in AI actually
          looks like — and where it comes from.
        </p>
        <div className="hero-cta">
          <a href="#games" className="btn btn-primary">Try the games</a>
          <a href="#about" className="btn btn-ghost">Learn more</a>
        </div>
      </section>

      <section id="about" className="about">
        <div className="about-block">
          <h2>The problem</h2>
          <p>
            LLMs show up everywhere now: coursework, writing, search, decisions
            big and small. But they carry biases from their training data,
            design choices, and the way people prompt them.
          </p>
          <p>
            The tricky part: these biases are hard to spot. The output sounds
            confident and neutral even when it isn’t.
          </p>
        </div>

        <div className="about-block">
          <h2>Who this is for</h2>
          <p>
            University students who use AI tools, or study them. No technical
            background needed. The point is to help students notice bias in AI
            outputs, trace where it comes from, and read AI answers with a
            sharper eye.
          </p>
        </div>

        <div className="about-block">
          <h2>Learning objectives</h2>
          <ul>
            <li>
              Identify the main sources of LLM bias: data, algorithms,
              interaction, and social context.
            </li>
            <li>
              Tell different types of bias apart — stereotyping, confirmation,
              historical, representation.
            </li>
            <li>Explain why biased output often sounds objective.</li>
            <li>Think more critically about how you use AI yourself.</li>
          </ul>
        </div>

        <div className="about-block">
          <h2>AI framework</h2>
          <dl className="framework">
            <div>
              <dt>Attitudes</dt>
              <dd>Responsible · Curious · Empathetic</dd>
            </div>
            <div>
              <dt>Skills</dt>
              <dd>
                Critical thinking · Self &amp; social awareness · Communication
              </dd>
            </div>
            <div>
              <dt>Knowledge</dt>
              <dd>K1.1, K1.2, K2.2 <span className="muted">(TBD)</span></dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="games" className="games">
        <h2>The games</h2>
        <p className="section-lede">
          Each interaction targets one type of bias. Pick any to start — they
          are independent.
        </p>

        {gamesByLevel.map(({ level, label, items }) => (
          <div key={level} className="games-group">
            <h3 className="games-group-label">{label}</h3>
            <ul className="game-grid">
              {items.map((g) => (
                <li key={g.slug}>
                  <Link to={`/games/${g.slug}`} className="game-card">
                    <div className="game-card-body">
                      <h4>{g.title}</h4>
                      <p>{g.short}</p>
                    </div>
                    <div className="game-card-foot">
                      <span className="author">by {g.author}</span>
                      <span className="arrow" aria-hidden>→</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section id="recap" className="recap-section">
        <h2>Test your knowledge</h2>
        <p className="section-lede">
          Once you've played a few games, see if you can match each bias to
          its core idea. Drag and drop, or tap.
        </p>
        <BiasRecap />
      </section>
    </>
  );
}
