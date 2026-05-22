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
import { featuredGames, moreGames, type Game } from "../data/games";
import {
  getAllGameProgress,
  subscribeToGameProgress,
} from "../lib/gameProgress";

function GameCard({ game, isDone }: { game: Game; isDone: boolean }) {
  return (
    <li>
      <Link
        to={`/games/${game.slug}`}
        className={`game-card ${isDone ? "is-done" : ""}`}
      >
        {isDone && (
          <span className="played-stamp" aria-label="Played">
            Played
          </span>
        )}
        <div className="game-card-body">
          <h4>{game.title}</h4>
          <p>{game.short}</p>
        </div>
        <div className="game-card-foot">
          <span className="author">by {game.author}</span>
          <span className="arrow" aria-hidden>
            →
          </span>
        </div>
      </Link>
    </li>
  );
}

export function Home() {
  const [progressBySlug, setProgressBySlug] = useState<Record<string, number>>(
    () => getAllGameProgress(),
  );

  useEffect(() => {
    return subscribeToGameProgress(() => {
      setProgressBySlug(getAllGameProgress());
    });
  }, []);

  const isDone = (slug: string) => (progressBySlug[slug] ?? 0) >= 100;

  // Progress tracks the featured study games.
  const totalGames = featuredGames.length;
  const playedCount = featuredGames.filter((g) => isDone(g.slug)).length;
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
            looks like, and where it comes from.
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
          Start with these four, each targets one type of bias. Play them in
          order or pick any to begin.
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

        <ul className="game-grid">
          {featuredGames.map((g) => (
            <GameCard key={g.slug} game={g} isDone={isDone(g.slug)} />
          ))}
        </ul>
      </section>

      <section id="more-games" className="games games-more">
        <h3 className="games-more-title">More biases to explore</h3>
        <p className="section-lede">
          Optional, more interactions covering other types of bias.
        </p>
        <ul className="game-grid">
          {moreGames.map((g) => (
            <GameCard key={g.slug} game={g} isDone={isDone(g.slug)} />
          ))}
        </ul>
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
