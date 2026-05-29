export function About() {
  return (
    <article className="content-page">
      <header className="content-header">
        <p className="eyebrow">About</p>
        <h1>About Bias Arcade</h1>
        <p className="lede">
          A collection of short interactive experiences and resources designed to help users understand biases in AI models.
        </p>
      </header>

      <section className="content-block">
        <h2>What is the tool about?</h2>
        <p>
          Bias Arcade is a collection of short interactive experiences and resources designed to help users understand bias in AI models. Each experience explores either how bias becomes embedded in a system or what happens in the real world when a biased AI system makes decisions. No technical background is required for the interactive experiences.
        </p>
      </section>

      <section className="content-block">
        <h2>Who is the tool intended for?</h2>
        <p>
          Bias Arcade is for anyone curious about how AI models can contain unwanted biases. It is especially aimed at high school and university students outside of computer science, as well as educators looking to explore AI bias with their students.
        </p>
        <p>
          Learners don't need to know how to code or build AI systems to use the website. The interactive experiences focus on concepts, consequences, and critical thinking rather than technical implementation. However, some basic familiarity with how AI models work (for example, how they are trained and learn from data) is helpful for better understanding the causes and impacts of biases.
        </p>
      </section>

      <section className="content-block">
        <h2>Why we built Bias Arcade</h2>
        <p>
          As AI systems become increasingly embedded in high-stakes decisions from hiring and healthcare to education and credit scoring, understanding how bias enters these systems has never been more important. Yet public awareness of AI bias remains limited, and the resources that do exist are largely aimed at technical audiences: developers, researchers, and computer scientists.
        </p>
        <p>
          Non-technical learners, including high school and university students outside of computer science, are rarely given accessible tools to engage critically with AI bias. Existing materials often rely on code-heavy explanations or abstract descriptions that fail to connect bias to its real-world consequences. This leaves a large and important audience without the knowledge they need to recognize, question, or respond to biased AI systems they may encounter in everyday life.
        </p>
        <p>
          Bias Arcade was designed to meet that need, giving any curious learner the tools to understand not just that AI systems can be biased, but how and why that bias develops, and what it means for the people affected.
        </p>
      </section>

      <section className="content-block">
        <h2>Learning objectives</h2>
        <p>By the end of the interactive experiences, learners will be able to:</p>
        <ul>
          <li>Identify specific points in the AI development process where human choices can introduce bias.</li>
          <li>Connect a type of AI bias to a harmful outcome in a real-world domain.</li>
          <li>Explain why human oversight is necessary before acting on an AI-generated decision in a high-stakes context.</li>
        </ul>
      </section>

      <section className="content-block">
        <h2>Design rationale</h2>
        <p>
          Bias Arcade uses <strong>learner-centered design</strong> to support <strong>mental model change</strong>, not just <strong>task success</strong>. Many non-technical learners assume algorithms are neutral because they are computational. The games challenge this misconception by placing learners in decision-making situations where biased outcomes become opportunities to <strong>learn from error</strong>. Learners see how reasonable <strong>optimization targets</strong> and engagement signals can still produce unfair outcomes.
        </p>
        <p>
          The tool follows <strong>constructivist learning theory</strong> by grounding bias in concrete scenarios: delivery allocation, social media feeds, training data, and civic participation. Learners build understanding by acting within these contexts before receiving abstract definitions. The games use <strong>scaffolding</strong> and <strong>productive struggle</strong> by guiding learners through staged experiences while preserving meaningful decisions and consequences.
        </p>
        <p>
          Bias Arcade manages <strong>cognitive load</strong> through <strong>intrinsic load</strong>, <strong>extraneous load</strong>, and <strong>germane load</strong>. One bias per experience limits the intrinsic complexity of algorithmic bias. For example, in Confirmation Bias, early stages intentionally exclude side objectives such as revenue, user satisfaction, and broader business metrics, reducing extraneous load so learners can focus on the core optimization logic first. Decision-making, observation, and debriefing preserve germane load: the productive effort that builds understanding.
        </p>
        <p>
          The interface supports <strong>working memory</strong> and <strong>attention</strong> through focused stages, clear metrics, visible feedback, and simple choices. It also applies <strong>multimedia learning</strong> principles. The <strong>active-processing assumption</strong> appears because learners act before receiving explanation. The <strong>coherence principle</strong> appears in the one-bias-per-game structure. The <strong>segmenting principle</strong> appears through short, step-by-step phases.
        </p>
        <p>
          Feedback functions as <strong>formative assessment</strong>. Learners receive visible feedback and progress cues during the experience, helping them update their understanding as they proceed. Confirmation Bias makes this especially explicit: a live interaction history panel logs each like, read, and dwell event as it happens. When the next session loads, the feed narrows around those accumulated signals, making the link between behavior and outcome visible. Bias Recap adds an <strong>assessment layer</strong> by checking whether learners can match the four featured bias types to abstract descriptions.
        </p>
        <p>
          The learning goals align with <strong>Bloom's taxonomy</strong>, especially <strong>Apply</strong> and <strong>Analyze</strong>. Learners must apply bias concepts to concrete scenarios and analyze how design choices produce harmful outcomes. Bias Recap reinforces this by asking learners to recognize the same bias mechanisms in different wording from the original games, checking whether their understanding holds up when the framing changes.
        </p>
        <p>
          For motivation, Bias Arcade draws on <strong>Self-Determination Theory</strong>. It supports <strong>autonomy</strong> through meaningful choices in the learning scenarios and <strong>competence</strong> through short experiences, clear goals, visible progress, retries or restarts where appropriate, and completion feedback. The low-stakes <strong>no embarrassment</strong> setting lets learners make biased choices privately, receive feedback, and reflect honestly.
        </p>
        <p>
          Overall, Bias Arcade works beyond the <strong>interaction layer</strong>. The goal is not simply that learners click correctly, but that they build a revised understanding of how bias enters systems that appear to operate normally. The <strong>epistemic layer</strong> is supported through debriefing that connects visible outcomes to objectives, signals, data, and interaction patterns. This makes Bias Arcade a <strong>learning intervention</strong> with an evaluable design sequence: the design links choices, feedback, debriefing, and recap assessment into a coherent path from first encounter to conceptual understanding.
        </p>
      </section>

      <section className="content-block">
        <h2>Related works</h2>

        <h3>AILit Framework</h3>
        <p>
          The learning objectives are based on the <a href="https://ailiteracyframework.org/">AILit Framework</a>, which emphasizes that AI literacy equips learners and educators to understand both the risks and opportunities that AI represents. The framework defines AI competences through a combination of technical knowledge, durable skills and future-ready attitudes. For this reason, the design of the learning objectives is based on the three-part structure defined in the framework: technical knowledge, skills and attitudes.
        </p>

        <div>
          <p><strong>Learning objective 1: Identifying Sources of Bias in AI Systems:</strong></p>
          <ul>
            <li><strong>Technical Knowledge:</strong> K2.1, K2.4, and K2.5</li>
            <li><strong>Skills:</strong> Critical Thinking</li>
            <li><strong>Attitudes:</strong> Curious</li>
          </ul>
        </div>

        <div>
          <p><strong>Learning objective 2: Understanding the real-world impact of AI Bias:</strong></p>
          <ul>
            <li><strong>Technical Knowledge:</strong> K2.5, K4.1, K5.1, and K5.2</li>
            <li><strong>Skills:</strong> Self &amp; Social Awareness and Critical Thinking</li>
            <li><strong>Attitudes:</strong> Responsible, Empathetic</li>
          </ul>
        </div>

        <div>
          <p><strong>Learning objective 3: Evaluating the need for Human Oversight:</strong></p>
          <ul>
            <li><strong>Technical Knowledge:</strong> K3.3, K4.1, and K5.2</li>
            <li><strong>Skills:</strong> Critical Thinking and Communication</li>
            <li><strong>Attitudes:</strong> Responsible</li>
          </ul>
        </div>

        <h3>FairAIED: Navigating Fairness, Bias, and Ethics in Educational AI Applications</h3>
        <p>
          The selection of biases featured in Bias Arcade is based on the bias framework proposed by Yin et al. in FairAIED (2025), which presents a systematic survey of algorithmic fairness in educational AI. The paper classifies AI bias according to the primary unit of harm into three levels:
        </p>
        <ul>
          <li><strong>Group-level biases:</strong> Systematically disadvantage specific groups based on demographic factors.</li>
          <li><strong>Individual-level biases:</strong> Affect specific people inconsistently, even when their abilities or profiles are similar to others'.</li>
          <li><strong>Multi-level biases:</strong> Simultaneously operate at both individual and group levels.</li>
        </ul>
        <p>
          We selected five biases: confirmation bias at the individual level, algorithmic bias, learning bias, and interaction bias from the multi-level category, as well as historical bias which is from an external team.
        </p>
      </section>

      <section className="content-block">
        <h2>The team</h2>
        <p>
          This project was developed as part of the <a href="https://peachlab.inf.ethz.ch/teaching/diet2026/">Design in Educational Technology 2026</a> course at ETH Zürich.
        </p>
        <ul>
          <li><strong>Akankshya Ingale:</strong> BSc Computer Science – USI Università della Svizzera italiana</li>
          <li><strong>Leroy Borgeaud dit Avocat:</strong> MSc Computer Science – ETH Zürich</li>
          <li><strong>Nagyung Kim:</strong> MSc Computer Science – ETH Zürich</li>
          <li><strong>Nicolas Stucki:</strong> MSc Computer Science – ETH Zürich</li>
          <li><strong>Xiaozihan Wang:</strong> BSc Computer Science – USI Università della Svizzera italiana</li>
        </ul>
      </section>
    </article>
  );
}
