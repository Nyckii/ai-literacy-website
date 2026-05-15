export function Resources() {
  return (
    <article className="content-page">
      <header className="content-header">
        <p className="eyebrow">Resources</p>
        <h1>Further reading</h1>
        <p className="lede">
          Papers, projects, and frameworks that shaped the Bias Arcade. Use
          them to dig deeper into any bias you encountered in a game.
        </p>
      </header>

      <section className="content-block">
        <h2>Foundational papers</h2>
        <ul className="resource-list">
          <li>
            <a
              href="https://arxiv.org/abs/2310.10148"
              target="_blank"
              rel="noreferrer"
            >
              González-Sendino, R. et al. (2023). <em>A review on bias in
              automated essay scoring systems.</em>
            </a>
            <span className="resource-note">
              Grounds the <em>Measurement Bias</em> game.
            </span>
          </li>
          <li>
            <a
              href="https://dl.acm.org/doi/10.1145/3457607"
              target="_blank"
              rel="noreferrer"
            >
              Mehrabi, N. et al. (2021). <em>A survey on bias and fairness in
              machine learning.</em> ACM Computing Surveys.
            </a>
            <span className="resource-note">
              A broad taxonomy of bias types used across most games.
            </span>
          </li>
          <li>
            <a
              href="https://www.fairmlbook.org/"
              target="_blank"
              rel="noreferrer"
            >
              Barocas, S., Hardt, M., &amp; Narayanan, A. <em>Fairness and
              Machine Learning.</em>
            </a>
            <span className="resource-note">
              Free textbook. Strong on historical and representation bias.
            </span>
          </li>
        </ul>
      </section>

      <section className="content-block">
        <h2>Interactive projects</h2>
        <ul className="resource-list">
          <li>
            <a
              href="https://www.survivalofthebestfit.com/"
              target="_blank"
              rel="noreferrer"
            >
              Survival of the Best Fit
            </a>
            <span className="resource-note">
              Inspiration for the <em>Historical Bias</em> game.
            </span>
          </li>
          <li>
            <a
              href="https://pair.withgoogle.com/explorables/"
              target="_blank"
              rel="noreferrer"
            >
              Google PAIR — AI Explorables
            </a>
            <span className="resource-note">
              Short interactive demos on fairness, hidden bias, and model
              behavior.
            </span>
          </li>
          <li>
            <a
              href="https://www.media.mit.edu/projects/gender-shades/overview/"
              target="_blank"
              rel="noreferrer"
            >
              Gender Shades (MIT Media Lab)
            </a>
            <span className="resource-note">
              The audit that put representation bias in face recognition on
              the public agenda.
            </span>
          </li>
        </ul>
      </section>

      <section className="content-block">
        <h2>Frameworks &amp; curricula</h2>
        <ul className="resource-list">
          <li>
            <a
              href="https://ethz.ch/en.html"
              target="_blank"
              rel="noreferrer"
            >
              ETH Zürich — PEACH
            </a>
            <span className="resource-note">
              Educational technology research group hosting this course.
            </span>
          </li>
          <li>
            <span>
              <strong>AI literacy framework (this project)</strong> — Attitudes,
              Skills, Knowledge dimensions. See the
              {' '}
              <a href="/about">About page</a>.
            </span>
          </li>
        </ul>
      </section>

      <section className="content-block">
        <h2>Source code</h2>
        <p>
          The Bias Arcade is open source. Read the games, file issues, or
          fork it:
          {' '}
          <a
            href="https://github.com/Nyckii/ai-literacy-website"
            target="_blank"
            rel="noreferrer"
          >
            github.com/Nyckii/ai-literacy-website
          </a>
          .
        </p>
      </section>
    </article>
  );
}
