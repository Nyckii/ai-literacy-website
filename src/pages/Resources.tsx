import { DownloadSimple, FileDoc } from "@phosphor-icons/react";

interface DownloadItem {
  title: string;
  description: string;
  filename: string;
  fileSize: string;
  fileType: "docx" | "pdf" | "generic";
  url: string;
  accentClass: string;
}

const DOWNLOADS: DownloadItem[] = [
  {
    title: "Bias & Fairness Worksheet",
    description: "A printable worksheet that guides students through analyzing the four types of AI bias: measurement, historical, representation, and evaluation. Perfect for classroom activities.",
    filename: "Biases.docx",
    fileSize: "28 KB",
    fileType: "docx",
    url: "/downloads/Biases.docx",
    accentClass: "tile-lavender",
  },
];

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
        <h2>Downloadable materials</h2>
        <div className="download-grid">
          {DOWNLOADS.map((item, index) => {
            const Icon = item.fileType === "docx" ? FileDoc : FileDoc;
            return (
              <div key={index} className="download-card">
                <div className="download-card-body">
                  <div className={`download-card-icon ${item.accentClass}`}>
                    <Icon size={24} weight="bold" />
                  </div>
                  <div className="download-card-content">
                    <span className="download-card-badge">{item.fileType.toUpperCase()}</span>
                    <h3 className="download-card-title">{item.title}</h3>
                    <p className="download-card-desc">{item.description}</p>
                  </div>
                </div>
                <div className="download-card-footer">
                  <span className="download-card-size">{item.fileSize}</span>
                  <a
                    href={item.url}
                    download={item.filename}
                    className="btn btn-ghost btn-download"
                    aria-label={`Download ${item.title}`}
                  >
                    <DownloadSimple size={16} weight="bold" />
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="content-block">
        <h2>Additional resources</h2>
        <p className="section-description">
          Explore external projects, interactive tools, and curriculum designs from the broader educational technology and AI ethics community.
        </p>
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
              An interactive game exploring the impacts of historical bias on automated hiring algorithms.
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
              Interactive visual explanations and demos about fairness, model behavior, and machine learning.
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
              An influential research audit highlighting representation bias in commercial facial recognition algorithms.
            </span>
          </li>
          <li>
            <a
              href="https://ethz.ch/en.html"
              target="_blank"
              rel="noreferrer"
            >
              ETH Zürich — PEACH
            </a>
            <span className="resource-note">
              The Educational Technology research group hosting this course and exploring learning designs.
            </span>
          </li>
        </ul>
      </section>

      <section className="content-block">
        <h2>Foundational papers</h2>
        <p className="section-description">
          A curated collection of academic research and literature that formed the theoretical groundwork for the games and concepts inside the Bias Arcade.
        </p>
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

