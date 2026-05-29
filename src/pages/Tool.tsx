import { Link } from "react-router-dom";

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
        <h2>Section 1: Access and setup</h2>

        <h3>Access the tool</h3>
        <p>
          Bias Arcade is a web-based tool that runs entirely in your browser.
          There is nothing to install and no account to create. Open the link
          below and start playing.
        </p>
        <p>
          <Link className="button-primary" to="/">
            Open Bias Arcade →
          </Link>
        </p>

        <h3>What users need to prepare</h3>
        <ul>
          <li>
            <strong>Device:</strong> a desktop or laptop is recommended. Tablets
            work, but some games use drag-and-drop interactions that are easier
            with a mouse or trackpad. Phones are not supported.
          </li>
          <li>
            <strong>Browser:</strong> a recent version of Chrome, Firefox, Safari,
            or Edge (released in the last two years). JavaScript must be enabled.
          </li>
          <li>
            <strong>Screen:</strong> a screen at least 1280 × 800 px. Some games
            include images and side-by-side comparisons that benefit from a
            larger display.
          </li>
          <li>
            <strong>Connection:</strong> a stable internet connection to load
            the games and the embedded demo video.
          </li>
          <li>
            <strong>Other:</strong> no audio, microphone, or special hardware is
            required. Plan roughly 10–15 minutes per featured game.
          </li>
        </ul>

        <p>
          Each game is self-contained. You can play any of them on their own,
          in any order, and stop whenever you like. If something is unclear or
          you run into trouble, the <Link to="/faq">FAQ</Link> covers the most
          common questions.
        </p>
      </section>

      <section className="content-block">
        <h2>Section 2: Demo video</h2>
        <p>
          The video below walks through Bias Arcade: the home page, one of the
          featured games, and the recap that follows.
        </p>

        <div className="video-embed">
          <iframe
            src="https://www.youtube.com/embed/oDNTVYh09I8"
            title="Bias Arcade demo video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>
    </article>
  );
}
