import { DownloadSimple, FileDoc, FileZip } from "@phosphor-icons/react";

interface DownloadItem {
  title: string;
  description: string;
  filename: string;
  fileSize: string;
  fileType: "docx" | "pdf" | "zip" | "generic";
  url: string;
  accentClass: string;
}

const DOWNLOADS: DownloadItem[] = [
  {
    title: "Teacher Resources",
    description: "A collection of teaching materials that includes single lessons and a jigsaw lesson with multiple worksheets.",
    filename: "TeacherResources.zip",
    fileSize: "330 KB",
    fileType: "zip",
    url: "/downloads/TeacherResources.zip",
    accentClass: "tile-lavender",
  },
  {
    title: "Bias Overview",
    description: "An overview document explaining various biases and their impacts.",
    filename: "BiasOverview.docx",
    fileSize: "23 KB",
    fileType: "docx",
    url: "/downloads/BiasOverview.docx",
    accentClass: "tile-salmon",
  },
  {
    title: "Teacher Guide",
    description: "A comprehensive guide for teachers on how to use the Bias Arcade and teach AI literacy concepts.",
    filename: "TeacherGuide.pdf",
    fileSize: "213 KB",
    fileType: "pdf",
    url: "/downloads/TeacherGuide.pdf",
    accentClass: "tile-sky",
  },
];

export function Resources() {
  return (
    <article className="content-page">
      <header className="content-header">
        <p className="eyebrow">Resources</p>
        <h1>Resources</h1>
        <p className="lede">
          A comprehensive collection of materials to support teaching and learning with the Bias Arcade. Explore lesson plans with learning objectives and discussion questions, teacher guides, additional external projects, and foundational reading lists.
        </p>
      </header>

      <section className="content-block">
        <h2>Downloadable materials</h2>
        <div className="download-grid">
          {DOWNLOADS.map((item, index) => {
            const Icon = item.fileType === "zip" ? FileZip : FileDoc;
            return (
              <div key={index} className="download-card">
                <div className="download-card-body">
                  <div className={`download-card-icon ${item.accentClass}`}>
                    <Icon size={24} weight="bold" />
                  </div>
                  <div className="download-card-content">
                    <h3 className="download-card-title">{item.title}</h3>
                    <p className="download-card-desc">{item.description}</p>
                  </div>
                </div>
                <div className="download-card-footer">
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
              href="https://pair.withgoogle.com/explorables/"
              target="_blank"
              rel="noreferrer"
            >
              Google PAIR, AI Explorables
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
              href="https://github.com/survivalofthebestfit/survivalofthebestfit/wiki/Reading-List"
              target="_blank"
              rel="noreferrer"
            >
              Reading List
            </a>
            <span className="resource-note">
              This list is for anyone who wants to learn more about the case for why and how we can make AI systems more inclusive.
            </span>
          </li>
        </ul>
      </section>

      <section className="content-block">
        <h2>Foundational papers</h2>
        <p className="section-description">
          A curated collection of academic research and literature that formed the theoretical groundwork for the interactive experiences and concepts inside the Bias Arcade.
        </p>
        <ul className="resource-list">
          <li>
            <a
              href="https://dl.acm.org/doi/10.1145/3457607"
              target="_blank"
              rel="noreferrer"
            >
              A survey on bias and fairness in machine learning (2021)
            </a>
            <span className="resource-note">
              A comprehensive survey investigating real-world AI biases, classifying their various sources, and establishing a detailed taxonomy of mathematical fairness definitions to prevent discriminatory outcomes.
            </span>
          </li>
          <li>
            <a
              href="https://ailiteracyframework.org/"
              target="_blank"
              rel="noreferrer"
            >
              AI Literacy Framework (AILitFramework) (2025)
            </a>
            <span className="resource-note">
              A structured framework defining the critical dimensions of AI literacy: knowledge, skills, attitudes, and ethical considerations.
            </span>
          </li>
          <li>
            <a
              href="https://arxiv.org/html/2407.18745v2"
              target="_blank"
              rel="noreferrer"
            >
              FairAIED: Navigating Fairness, Bias, and Ethics in Educational AI Applications (2024)
            </a>
            <span className="resource-note">
              A systematic review bridging the gap between technical fairness research and educational applications, establishing a harmonized framework for bias sources, mitigation strategies, and multi-level student fairness concerns.
            </span>
          </li>
          <li>
            <a
              href="https://www.sciencedirect.com/science/article/pii/S0893395224002667"
              target="_blank"
              rel="noreferrer"
            >
              Ethical and Bias Considerations in Artificial Intelligence/Machine Learning (2025)
            </a>
            <span className="resource-note">
              A review of ethical considerations and bias in medical AI systems, outlining key sources of bias in data, model development, and clinical deployment. The paper highlights the need for transparent, fair, and carefully evaluated machine learning systems to ensure reliable and equitable healthcare outcomes.
            </span>
          </li>
          <li>
            <a
              href="https://arxiv.org/abs/2301.07483"
              target="_blank"
              rel="noreferrer"
            >
              Biases in Scholarly Recommender Systems: Impact, Prevalence, and Mitigation (2023)
            </a>
            <span className="resource-note">
              A review of bias in scholarly recommender systems, examining how recommendation algorithms can shape research visibility, amplify inequalities, and influence scientific discovery. The paper explores the prevalence and impact of these biases while discussing strategies for creating fairer and more transparent recommendation systems.
            </span>
          </li>
          <li>
            <a
              href="https://www.researchgate.net/publication/343654659_Evolution_and_impact_of_bias_in_human_and_machine_learning_algorithm_interaction"
              target="_blank"
              rel="noreferrer"
            >
              Evolution and impact of bias in human and machine learning algorithm interaction (2020)
            </a>
            <span className="resource-note">
              A study of how bias evolves through repeated interactions between humans and machine learning systems, showing how biased data, predictions, and user behavior can reinforce one another over time. The paper introduces an iterative framework for analyzing algorithmic bias and highlights the long-term risks of personalization and filtering mechanisms on fairness and information discovery.
            </span>
          </li>
        </ul>
      </section>

      <section className="content-block">
        <h2>Source code</h2>
        <p>
          The Bias Arcade is open source. Explore the code, file issues, or
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

