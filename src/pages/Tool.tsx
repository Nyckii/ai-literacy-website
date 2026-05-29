export function Tool() {
  return (
    <article className="content-page">
      <header className="content-header">
        <p className="eyebrow">Tool</p>
        <h1>Tool Page</h1>
        <p className="lede">
          Information about the tool and how to access and use it.
        </p>
      </header>

      <section className="content-block">
        <h2>Section 1 — Access and setup</h2>

        <h3>Access the tool</h3>
        <p>
          {/* TODO: Replace with a short description of how to access Bias Arcade. */}
          Bias Arcade runs entirely in the browser — no installation or account
          is required.
        </p>
        <p>
          <a
            className="button-primary"
            href="https://example.com" /* TODO: replace with the deployed URL */
            target="_blank"
            rel="noreferrer"
          >
            Open Bias Arcade →
          </a>
        </p>

        <h3>What users need to prepare</h3>
        <ul>
          <li>
            {/* TODO: device requirements (e.g., desktop / laptop / tablet). */}
            Device: …
          </li>
          <li>
            {/* TODO: supported browsers and minimum versions. */}
            Browser: …
          </li>
          <li>
            {/* TODO: screen / display recommendations. */}
            Screen: …
          </li>
          <li>
            {/* TODO: any audio, input, or physical setup needs. */}
            Other: …
          </li>
        </ul>
      </section>

      <section className="content-block">
        <h2>Section 2 — Demo video</h2>
        <p>
          A short demo (max 5 minutes) showing the interface and how learners
          interact with the tool.
        </p>

        <div className="video-embed">
          <iframe
            src="https://www.youtube.com/embed/oDNTVYh09I8"
            title="Bias Arcade demo video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <h3>What the demo covers</h3>
        <ul>
          <li>{/* TODO */}Walkthrough of the landing page and navigation.</li>
          <li>{/* TODO */}Playing one of the featured bias experiences end-to-end.</li>
          <li>{/* TODO */}Reflection / recap after a game.</li>
          <li>{/* TODO */}Where to find the supporting resources and FAQ.</li>
        </ul>
      </section>
    </article>
  );
}
