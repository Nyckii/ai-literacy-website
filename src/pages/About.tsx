export function About() {
  return (
    <article className="content-page">
      <header className="content-header">
        <p className="eyebrow">About</p>
        <h1>About the Bias Arcade</h1>
        <p className="lede">
          An interactive AI literacy project that helps users understand how
          bias appears in AI predictions through simple, hands-on games.
        </p>
      </header>

      <section className="content-block">
        <h2>The problem</h2>
        <p>
          LLMs show up everywhere now: coursework, writing, search, decisions
          big and small. But they carry biases from their training data,
          design choices, and the way people prompt them.
        </p>
        <p>
          The tricky part: these biases are hard to spot. The output sounds
          confident and neutral even when it isn't.
        </p>
      </section>

      <section className="content-block">
        <h2>Who this is for</h2>
        <p>
          University students who use AI tools, or study them. No technical
          background needed. The point is to help students notice bias in AI
          outputs, trace where it comes from, and read AI answers with a
          sharper eye.
        </p>
      </section>

      <section className="content-block">
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
      </section>

      <section className="content-block">
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
            <dd>
              K1.1, K1.2, K2.2 <span className="muted">(TBD)</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="content-block">
        <h2>The team</h2>
        <p>
          Group 2, FS26 — Xiaozihan Wang, Akankshya Ingale, Nagyung Kim,
          Leroy Borgeaud dit Avocat, Nicolas Stucki. Built as part of
          <em> Design in Educational Technology</em> at ETH Zürich, in
          collaboration with ETH PEACH.
        </p>
      </section>
    </article>
  );
}
