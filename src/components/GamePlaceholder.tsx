import { Link } from 'react-router-dom';
import { games, LEVEL_LABELS } from '../data/games';

type Props = { slug: string };

export function GamePlaceholder({ slug }: Props) {
  const game = games.find((g) => g.slug === slug);

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
        <p className="eyebrow">{LEVEL_LABELS[game.level]} · by {game.author}</p>
        <h1>{game.title}</h1>
        <p className="lede">{game.short}</p>
      </header>

      <article className="game-body">
        <h2>What this is about</h2>
        <p>{game.description}</p>

        <div className="placeholder-card">
          <p>
            <strong>Under construction.</strong> {game.author} is building this
            interaction. Replace the body of{' '}
            <code>src/pages/games/{game.slug}.tsx</code> with the actual game.
          </p>
        </div>
      </article>
    </section>
  );
}
