import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { gamesByLevel } from "../data/games";
import {
  getAllGameProgress,
  subscribeToGameProgress,
} from "../lib/gameProgress";

export function Home() {
  const [progressBySlug, setProgressBySlug] = useState<Record<string, number>>(
    () => getAllGameProgress(),
  );

  useEffect(() => {
    return subscribeToGameProgress(() => {
      setProgressBySlug(getAllGameProgress());
    });
  }, []);

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Bias Arcade</p>
        <h1>
          When AI sounds certain<span className="hero-dots">…</span>
          <br />
          Is it secretly <span className="hero-underline">biased</span>?
        </h1>
        <p className="lede">
          Short, gamified interactions that surface what bias in AI actually
          looks like — and where it comes from.
        </p>
        <div className="hero-cta">
          <a href="#games" className="btn btn-primary">
            Find the answers in our mini-games
            <span aria-hidden>→</span>
          </a>
          <Link to="/about" className="btn btn-ghost">
            Learn more
          </Link>
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
              {items.map((g) => {
                const progress = progressBySlug[g.slug] ?? 0;
                const isDone = progress >= 100;
                return (
                  <li key={g.slug}>
                    <Link to={`/games/${g.slug}`} className="game-card">
                      <div className="game-card-body">
                        <h4>{g.title}</h4>
                        <p>{g.short}</p>
                      </div>
                      <div className="game-card-foot">
                        <span className="author">by {g.author}</span>
                        <span
                          className={`progress-pill ${isDone ? "is-done" : "is-todo"}`}
                        >
                          {progress}%
                        </span>
                        <span className="arrow" aria-hidden>
                          →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section id="recap" className="recap-section">
        <h2>Test your knowledge</h2>
        <Link to={`bias-recap`} className="game-card">
          <div className="game-card-body">
            <h4>Bias Recap</h4>
            <p>
              Once you've played a few games, see if you can match each bias to
              its core idea.
            </p>
          </div>
          <div className="game-card-foot">
            <span className="arrow" aria-hidden>
              →
            </span>
          </div>
        </Link>
      </section>
    </>
  );
}
