import { useState } from 'react';

export function About() {
  const [showTheory, setShowTheory] = useState(false);

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
          Bias Arcade uses multiple decision-making interactive experiences to build a comprehensive understanding of biases in AI systems. It is built on three core pillars: Interactive Learning to maximise learner motivation, Situated Learning to ground concepts in real-world contexts and Cognitive Load Theory to ensure the experience remains focused and accessible.
        </p>

        <h3>Interactive learning</h3>
        <p>
          Rather than presenting AI bias through reading materials or videos, the interactive experiences place learners in situations where they must make decisions, observe consequences and reflect on outcomes. This active involvement supports deeper understanding and is better suited to developing critical thinking skills. Research in interactive learning highlights its benefits for motivation, engagement and knowledge retention.
        </p>

        <h3>Situated in real-world contexts</h3>
        <p>
          Interactive experiences in Bias Arcade are set in real-world contexts such as hiring, healthcare or social media. This grounds the learning experience in contexts learners can relate to, thereby making the consequences of AI bias feel more concrete. Furthermore, it directly supports learners in connecting biases to harmful real-world outcomes.
        </p>

        <h3>Designed for non-technical audiences</h3>
        <p>
          Bias Arcade requires no coding knowledge or technical background to use. This was an intentional decision based on our target audience: high school and university students outside of computer science and educators who may have limited experience with AI systems. The interactive experiences focus on concepts, decisions and consequences rather than implementation. This aligns with the AILit Framework's emphasis on AI literacy as a broad competency that should be accessible to all learners, not only those with a technical background.
        </p>

        <h3>One bias per experience</h3>
        <p>
          Each experience focuses on a single type of bias. This decision was driven by cognitive load considerations. Introducing multiple types of bias in one experience risks overwhelming and confusing learners. Isolating one bias per experience allows learners to develop a clear and accurate mental model of how each bias operates.
        </p>

        <h3>Shorter experiences</h3>
        <p>
          Rather than creating longer interactions, we aimed to create a collection of short, self-contained experiences with additional supporting resources. This provides two advantages: first, it maintains learner motivation and attention. Second, it gives educators the flexibility to incorporate the experiences in multiple ways: For example, as a warm-up activity, a standalone lesson, or a brief in-class exercise. This makes Bias Arcade suitable for both self-study and structured classroom use.
        </p>

        <button
          className="toggle-theory-btn"
          onClick={() => setShowTheory(v => !v)}
        >
          {showTheory ? 'Hide theoretical rationale' : 'View theoretical rationale'}
        </button>

        {showTheory && (
          <div className="theory-rationale">
            <h3>Learner-centered design</h3>
            <p>
              Bias Arcade uses learner-centered design to support mental model change, not just task success. Many non-technical learners assume algorithms are neutral because they are computational. The games challenge this misconception by placing learners in decision-making situations where biased outcomes become opportunities to learn from error. Learners see how reasonable optimization targets and engagement signals can still produce unfair outcomes.
            </p>

            <h3>Constructivist learning</h3>
            <p>
              The tool follows constructivist learning theory by grounding bias in concrete scenarios: delivery allocation, social media feeds, training data, and civic participation. Learners build understanding by acting within these contexts before receiving abstract definitions. The games use scaffolding and productive struggle by guiding learners through staged experiences while preserving meaningful decisions and consequences.
            </p>

            <h3>Cognitive load</h3>
            <p>
              Bias Arcade manages cognitive load through intrinsic load, extraneous load, and germane load. One bias per experience limits the intrinsic complexity of algorithmic bias. For example, in Confirmation Bias, early stages intentionally exclude side objectives such as revenue, user satisfaction, and broader business metrics, reducing extraneous load so learners can focus on the core optimization logic first. Decision-making, observation, and debriefing preserve germane load: the productive effort that builds understanding.
            </p>

            <h3>Multimedia learning</h3>
            <p>
              The interface supports working memory and attention through focused stages, clear metrics, visible feedback, and simple choices. It also applies multimedia learning principles. The active-processing assumption appears because learners act before receiving explanation. The coherence principle appears in the one-bias-per-game structure. The segmenting principle appears through short, step-by-step phases.
            </p>

            <h3>Formative assessment</h3>
            <p>
              Feedback functions as formative assessment. Learners receive visible feedback and progress cues during the experience, helping them update their understanding as they proceed. Confirmation Bias makes this especially explicit: a live interaction history panel logs each like, read, and dwell event as it happens. When the next session loads, the feed narrows around those accumulated signals, making the link between behavior and outcome visible. Bias Recap adds an assessment layer by checking whether learners can match the four featured bias types to abstract descriptions.
            </p>

            <h3>Bloom's taxonomy</h3>
            <p>
              The learning goals align with Bloom's taxonomy, especially Apply and Analyze. Learners must apply bias concepts to concrete scenarios and analyze how design choices produce harmful outcomes. Bias Recap reinforces this by asking learners to recognize the same bias mechanisms in different wording from the original games, checking whether their understanding holds up when the framing changes.
            </p>

            <h3>Motivation</h3>
            <p>
              For motivation, Bias Arcade draws on Self-Determination Theory. It supports autonomy through meaningful choices in the learning scenarios and competence through short experiences, clear goals, visible progress, retries or restarts where appropriate, and completion feedback. The low-stakes no embarrassment setting lets learners make biased choices privately, receive feedback, and reflect honestly.
            </p>

            <h3>Epistemic layer</h3>
            <p>
              Overall, Bias Arcade works beyond the interaction layer. The goal is not simply that learners click correctly, but that they build a revised understanding of how bias enters systems that appear to operate normally. The epistemic layer is supported through debriefing that connects visible outcomes to objectives, signals, data, and interaction patterns. This makes Bias Arcade a learning intervention with an evaluable design sequence: the design links choices, feedback, debriefing, and recap assessment into a coherent path from first encounter to conceptual understanding.
            </p>
          </div>
        )}
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
