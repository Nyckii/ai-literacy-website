type QA = { q: string; a: React.ReactNode };

const faqs: QA[] = [
  {
    q: "What is the Bias Arcade?",
    a: (
      <p>
        An interactive AI literacy project built at ETH Zürich (FS26). It's a
        small collection of mini-games that each surface a different kind of
        bias in AI systems — confirmation, measurement, historical,
        stereotyping, and more.
      </p>
    ),
  },
  {
    q: "Who is it for?",
    a: (
      <p>
        University students who use or study AI tools. No technical
        background needed. If you've ever used ChatGPT, you have enough
        context to play.
      </p>
    ),
  },
  {
    q: "How long does a game take?",
    a: (
      <p>
        Most games take 3–8 minutes. The games are independent — pick any one
        to start. The <em>Bias Recap</em> at the end is a short matching
        quiz once you've played a few.
      </p>
    ),
  },
  {
    q: "Do I need to play in order?",
    a: (
      <p>
        No. The games are grouped by level (individual, multi-level, group)
        but each one is self-contained. Start wherever the title intrigues
        you.
      </p>
    ),
  },
  {
    q: "Is the AI in the games real or simulated?",
    a: (
      <p>
        It varies by game. Some surface real model outputs; others use
        carefully constructed examples drawn from the AI bias research
        literature. Each game's explainer notes what's real and what's
        scripted.
      </p>
    ),
  },
  {
    q: "Will the games change my opinion about AI?",
    a: (
      <p>
        That's not really the goal. The goal is to give you a sharper eye —
        so when an AI output sounds confident and neutral, you can ask the
        right follow-up questions. Whether to use AI is still up to you.
      </p>
    ),
  },
  {
    q: "Where can I read more?",
    a: (
      <p>
        Check the <a href="/resources">Resources page</a> for the papers
        and projects this work is grounded in.
      </p>
    ),
  },
  {
    q: "Can I use the Bias Arcade in my course?",
    a: (
      <p>
        Yes. The source is on{' '}
        <a
          href="https://github.com/Nyckii/ai-literacy-website"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        . If you adapt it for teaching, we'd love to hear how it went —
        file an issue on the repo.
      </p>
    ),
  },
];

export function FAQ() {
  return (
    <article className="content-page">
      <header className="content-header">
        <p className="eyebrow">FAQ</p>
        <h1>Frequently asked questions</h1>
        <p className="lede">
          Quick answers about what the Bias Arcade is, who it's for, and how
          to get the most out of it.
        </p>
      </header>

      <section className="faq-list">
        {faqs.map((item, i) => (
          <details key={i} className="faq-item">
            <summary>
              <span className="faq-q">{item.q}</span>
              <span className="faq-icon" aria-hidden>+</span>
            </summary>
            <div className="faq-a">{item.a}</div>
          </details>
        ))}
      </section>
    </article>
  );
}
