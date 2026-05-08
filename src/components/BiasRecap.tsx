import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';

type Level = 'individual' | 'multi-level' | 'group';

type Entry = {
  slug: string;
  title: string;
  level: Level;
  /**
   * Core idea of the bias, written to match the specific framing of the
   * game on this site. Each one drops a small concrete hook (essay, ZIP
   * code, CEO, training set...) so a player who has played the games can
   * map them back.
   */
  essence: string;
};

const ENTRIES: Entry[] = [
  {
    slug: 'confirmation-bias',
    title: 'Confirmation Bias',
    level: 'individual',
    essence:
      'Click what you like → see more of it. The feed converges on a single viewpoint.',
  },
  {
    slug: 'measurement-bias',
    title: 'Measurement Bias',
    level: 'individual',
    essence:
      'Same idea, written in a different dialect → graded lower. The proxy isn\'t the thing.',
  },
  {
    slug: 'algorithm-bias',
    title: 'Algorithm Bias',
    level: 'multi-level',
    essence:
      'Even when the model fits its data correctly, the data itself encodes inequalities the model can\'t see past.',
  },
  {
    slug: 'learning-bias',
    title: 'Learning Bias',
    level: 'multi-level',
    essence:
      'The model takes a shortcut — grabbing the easiest pattern instead of the meaningful one.',
  },
  {
    slug: 'interaction-bias',
    title: 'Interaction Bias',
    level: 'multi-level',
    essence:
      'Loud users dominate the signal; the silent majority gets read as agreement.',
  },
  {
    slug: 'stereotyping-bias',
    title: 'Stereotyping Bias',
    level: 'multi-level',
    essence:
      'The CEO, the nurse, the doctor — the model fills in defaults that mirror social stereotypes.',
  },
  {
    slug: 'historical-bias',
    title: 'Historical Bias',
    level: 'group',
    essence:
      'Same applicant, different neighborhood, different decision. The past sets the prediction.',
  },
  {
    slug: 'exclusion-bias',
    title: 'Exclusion Bias',
    level: 'group',
    essence:
      'Advice that helps a default user — and quietly fails everyone who isn\'t one.',
  },
  {
    slug: 'representation-bias',
    title: 'Representation Bias',
    level: 'group',
    essence:
      'Pick the training set, pick the worldview. Whoever\'s missing is missing from the output.',
  },
  {
    slug: 'mapping-bias',
    title: 'Mapping Bias',
    level: 'group',
    essence:
      'The model isn\'t broken — it\'s being asked questions outside the world it was trained on.',
  },
];

const LEVEL_LABEL: Record<Level, string> = {
  individual: 'Individual-level',
  'multi-level': 'Multi-level',
  group: 'Group-level',
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const emptySlots = (): Record<string, string | null> =>
  Object.fromEntries(ENTRIES.map((e) => [e.slug, null]));

export function BiasRecap() {
  // slots[biasSlug] = essence's slug (or null if empty)
  const [slots, setSlots] = useState<Record<string, string | null>>(emptySlots);
  const [chipOrder, setChipOrder] = useState<string[]>(() =>
    shuffle(ENTRIES.map((e) => e.slug)),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const placedSet = useMemo(
    () => new Set(Object.values(slots).filter(Boolean) as string[]),
    [slots],
  );
  const pool = chipOrder.filter((slug) => !placedSet.has(slug));
  const allPlaced = pool.length === 0;
  const score = ENTRIES.filter((e) => slots[e.slug] === e.slug).length;

  const place = (essenceSlug: string, biasSlug: string) => {
    if (checked) return;
    setSlots((prev) => {
      const next = { ...prev };
      // Clear this essence from any previous slot
      for (const k of Object.keys(next)) {
        if (next[k] === essenceSlug) next[k] = null;
      }
      next[biasSlug] = essenceSlug;
      return next;
    });
    setSelected(null);
  };

  const unplace = (essenceSlug: string) => {
    if (checked) return;
    setSlots((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (next[k] === essenceSlug) next[k] = null;
      }
      return next;
    });
  };

  const reset = () => {
    setSlots(emptySlots());
    setChipOrder(shuffle(ENTRIES.map((e) => e.slug)));
    setChecked(false);
    setSelected(null);
  };

  const handleChipClick = (slug: string) => {
    if (checked) return;
    setSelected((s) => (s === slug ? null : slug));
  };

  const handleBiasClick = (biasSlug: string) => {
    if (selected) place(selected, biasSlug);
  };

  const onDragStart = (e: DragEvent, essenceSlug: string) => {
    if (checked) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', essenceSlug);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: DragEvent) => {
    if (checked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: DragEvent, biasSlug: string) => {
    if (checked) return;
    e.preventDefault();
    const dragged = e.dataTransfer.getData('text/plain');
    if (dragged) place(dragged, biasSlug);
  };

  const findEssence = (slug: string) =>
    ENTRIES.find((e) => e.slug === slug)!.essence;

  return (
    <section className="qz-card" aria-labelledby="qz-heading">
      <header className="qz-head">
        <h2 id="qz-heading">One last check — match each bias to its core idea</h2>
        <p className="qz-sub">
          Drag each statement onto the bias it best describes. (Or tap a
          statement to select it, then tap a bias card.)
        </p>
      </header>

      <div className="qz-pool" role="list" aria-label="Statements to place">
        {pool.length === 0 ? (
          <p className="qz-pool-empty">
            All ten placed. Hit <strong>Check answers</strong> to see how
            you did.
          </p>
        ) : (
          pool.map((slug) => (
            <button
              key={slug}
              role="listitem"
              draggable={!checked}
              className={`qz-chip ${selected === slug ? 'qz-chip-selected' : ''}`}
              onClick={() => handleChipClick(slug)}
              onDragStart={(e) => onDragStart(e, slug)}
              type="button"
            >
              <span className="qz-chip-grip" aria-hidden>⋮⋮</span>
              <span className="qz-chip-text">{findEssence(slug)}</span>
            </button>
          ))
        )}
      </div>

      <ol className="qz-bias-grid">
        {ENTRIES.map((e) => {
          const placed = slots[e.slug];
          const correct = checked && placed === e.slug;
          const wrong = checked && placed !== null && placed !== e.slug;
          const className = [
            'qz-bias',
            placed ? 'qz-bias-filled' : 'qz-bias-empty',
            correct ? 'qz-bias-correct' : '',
            wrong ? 'qz-bias-wrong' : '',
            selected && !placed ? 'qz-bias-droppable' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li
              key={e.slug}
              className={className}
              onDragOver={onDragOver}
              onDrop={(ev) => onDrop(ev, e.slug)}
              onClick={() => handleBiasClick(e.slug)}
            >
              <header className="qz-bias-head">
                <span className="qz-bias-tag">{LEVEL_LABEL[e.level]}</span>
                <span className="qz-bias-title">{e.title}</span>
                {checked && (
                  <span
                    className={`qz-bias-mark ${correct ? 'qz-bias-mark-good' : 'qz-bias-mark-bad'}`}
                    aria-label={correct ? 'correct' : 'incorrect'}
                  >
                    {correct ? '✓' : '✕'}
                  </span>
                )}
              </header>
              {placed ? (
                <button
                  className="qz-placed"
                  draggable={!checked}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (!checked) unplace(placed);
                  }}
                  onDragStart={(ev) => onDragStart(ev, placed)}
                  type="button"
                  title={checked ? '' : 'Click to send back to the pool'}
                >
                  {findEssence(placed)}
                </button>
              ) : (
                <p className="qz-bias-placeholder">
                  {selected ? 'tap to place here' : 'drop a statement here'}
                </p>
              )}
              {checked && wrong && (
                <p className="qz-correct-hint">
                  <strong>Correct:</strong> {e.essence}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="qz-actions">
        {!checked ? (
          <>
            <button
              className="btn btn-primary"
              disabled={!allPlaced}
              onClick={() => setChecked(true)}
            >
              {allPlaced
                ? 'Check answers'
                : `Place all 10 (${ENTRIES.length - pool.length}/${ENTRIES.length})`}
            </button>
            {!allPlaced && (
              <p className="qz-hint">
                You've matched {ENTRIES.length - pool.length} of{' '}
                {ENTRIES.length}.
              </p>
            )}
          </>
        ) : (
          <>
            <p className={`qz-score ${score === ENTRIES.length ? 'qz-score-perfect' : ''}`}>
              {score === ENTRIES.length
                ? '🎯 Perfect — all ten matched.'
                : `${score} / ${ENTRIES.length} correct`}
            </p>
            <button className="btn btn-ghost" onClick={reset}>
              Try again
            </button>
          </>
        )}
      </div>
    </section>
  );
}
