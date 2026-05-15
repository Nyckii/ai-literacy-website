import {
  Brain,
  Eye,
  Lightning,
  MagnifyingGlass,
  Question,
  Robot,
  Scales,
  Sparkle,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { games, gamesByStyle } from "../data/games";
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

  const totalGames = games.length;
  const playedCount = games.filter(
    (g) => (progressBySlug[g.slug] ?? 0) >= 100,
  ).length;
  const allPlayed = playedCount === totalGames;

  return (
    <>
      <section className="hero">
        <div className="hero-text">
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
            <a href="#games" className="btn btn-coral">
              Start playing
              <span aria-hidden>↓</span>
            </a>
            <Link to="/about" className="btn btn-ghost">
              Learn more
            </Link>
          </div>
        </div>

        <div className="hero-art" aria-hidden>
          <div className="hero-tile tile-pink"><Brain weight="bold" /></div>
          <div className="hero-tile tile-yellow"><Eye weight="bold" /></div>
          <div className="hero-tile tile-mint"><Robot weight="bold" /></div>
          <div className="hero-tile tile-lavender"><MagnifyingGlass weight="bold" /></div>
          <div className="hero-tile hero-tile-center">AI Bias</div>
          <div className="hero-tile tile-coral"><Lightning weight="bold" /></div>
          <div className="hero-tile tile-sky"><Scales weight="bold" /></div>
          <div className="hero-tile tile-purple"><Question weight="bold" /></div>
          <div className="hero-tile tile-rose"><Sparkle weight="bold" /></div>
        </div>
      </section>

      <section id="games" className="games">
        <h2>The games</h2>
        <p className="section-lede">
          Each interaction targets one type of bias. Pick any to start — they
          are independent.
        </p>

        <div
          className={`games-progress ${allPlayed ? "is-complete" : ""}`}
          aria-label={`${playedCount} of ${totalGames} games played`}
        >
          <div className="games-progress-dots" aria-hidden>
            {Array.from({ length: totalGames }).map((_, i) => (
              <span
                key={i}
                className={`progress-dot ${i < playedCount ? "is-filled" : ""}`}
              />
            ))}
          </div>
          {allPlayed ? (
            <Link to="/bias-recap" className="games-progress-cta">
              <span className="games-progress-cta-arrow" aria-hidden>→</span>
              Test your knowledge
            </Link>
          ) : (
            <span className="games-progress-text">
              {playedCount} / {totalGames} played
            </span>
          )}
        </div>

        {gamesByStyle.map(({ style, label, description, items }) => (
          <div key={style} className="games-group">
            <div className="games-group-head">
              <h3 className="games-group-label">{label}</h3>
              <p className="games-group-desc">{description}</p>
            </div>
            <ul className="game-grid">
              {items.map((g) => {
                const isDone = (progressBySlug[g.slug] ?? 0) >= 100;
                return (
                  <li key={g.slug}>
                    <Link
                      to={`/games/${g.slug}`}
                      className={`game-card ${isDone ? "is-done" : ""}`}
                    >
                      {isDone && (
                        <span className="played-stamp" aria-label="Played">
                          Played
                        </span>
                      )}
                      <div className="game-card-body">
                        <h4>{g.title}</h4>
                        <p>{g.short}</p>
                      </div>
                      <div className="game-card-foot">
                        <span className="author">by {g.author}</span>
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
