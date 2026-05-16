export function About() {
  return (
    <article className="content-page">
      <header className="content-header">
        <p className="eyebrow">About</p>
        <h1>About Bias Arcade</h1>
        <p className="lede">
          A collection of short interactive games and resources designed to help users understand biases in AI models.
        </p>
      </header>

      <section className="content-block">
        <h2>What is the tool about?</h2>
        <p>
          Bias Arcade is a collection of short interactive games and resources designed to help users understand bias in AI models. Each game explores either how bias becomes embedded in a system or what happens in the real world when a biased AI system makes decisions. No technical background is required for the games.
        </p>
      </section>

      <section className="content-block">
        <h2>Who is the tool intended for?</h2>
        <p>
          Bias Arcade is for anyone curious about how AI models can contain unwanted biases. It is especially aimed at high school and university students outside of computer science, as well as educators looking to explore AI bias with their students.
        </p>
        <p>
          Learners don't need to know how to code or build AI systems to use the website. The games focus on concepts, consequences, and critical thinking rather than technical implementation. However, some basic familiarity with how AI models work (for example, how they are trained and learn from data) is helpful for better understanding the causes and impacts of biases.
        </p>
      </section>

      <section className="content-block">
        <h2>Learning objectives</h2>
        <p>By the end of the games, learners will be able to:</p>
        <ul>
          <li>Identify specific points in the AI development process where human choices can introduce bias.</li>
          <li>Connect a type of AI bias to a harmful outcome in a real-world domain.</li>
          <li>Explain why human oversight is necessary before acting on an AI-generated decision in a high-stakes context.</li>
        </ul>
      </section>

      <section className="content-block">
        <h2>Design rationale</h2>
        <p>
          Bias Arcade uses multiple decision-making games to build a comprehensive understanding of biases in AI systems. It is built on three core pillars: Game-Based Learning to maximise learner motivation, Situated Learning to ground concepts in real-world contexts and Cognitive Load Theory to ensure the experience remains focused and accessible.
        </p>

        <h3>Game-based learning</h3>
        <p>
          Rather than presenting AI bias through reading materials or videos, the games place learners in situations where they must make decisions, observe consequences and reflect on outcomes. This active involvement supports deeper understanding and is better suited to developing critical thinking skills. Research in game-based learning highlights its benefits for motivation, engagement and knowledge retention.
        </p>

        <h3>Situated in real-world contexts</h3>
        <p>
          Games in Bias Arcade are set in real-world contexts such as hiring, healthcare or social media. This grounds the learning experience in contexts learners can relate to, thereby making the consequences of AI bias feel more concrete. Furthermore, it directly supports learners in connecting biases to harmful real-world outcomes.
        </p>

        <h3>Designed for non-technical audiences</h3>
        <p>
          Bias Arcade requires no coding knowledge or technical background to use. This was an intentional decision based on our target audience: high school and university students outside of computer science and educators who may have limited experience with AI systems. The games focus on concepts, decisions and consequences rather than implementation. This aligns with the AILit Framework's emphasis on AI literacy as a broad competency that should be accessible to all learners, not only those with a technical background.
        </p>

        <h3>One bias per game</h3>
        <p>
          Each game focuses on a single type of bias. This decision was driven by cognitive load considerations. Introducing multiple types of bias in one game risks overwhelming and confusing learners. Isolating one bias per game allows learners to develop a clear and accurate mental model of how each bias operates.
        </p>

        <h3>Shorter games</h3>
        <p>
          Rather than creating longer experiences, we aimed to create a collection of short, self-contained games with additional supporting resources. This provides two advantages: first, it maintains learner motivation and attention. Second, it gives educators the flexibility to incorporate the games in multiple ways: For example, as a warm-up activity, a standalone lesson, or a brief in-class exercise. This makes Bias Arcade suitable for both self-study and structured classroom use.
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
          We selected six biases spanning all three levels: historical bias and exclusion bias at the group level, confirmation bias at the individual level, and algorithm bias, learning bias, and interaction bias from the multi-level category. This choice was intentional and reflects a core goal of Bias Arcade, which is to show users that bias enters AI systems in multiple ways.
        </p>
      </section>

      <section className="content-block">
        <h2>The team</h2>
        <p>
          This project was developed as part of the <a href="https://peachlab.inf.ethz.ch/teaching/diet2026/">Design in Educational Technology 2026</a> course at ETH Zürich.
        </p>
        <ul>
          <li><strong>Akankshya Ingale:</strong> BSc Computer Science – University of Lugano</li>
          <li><strong>Leroy Borgeaud dit Avocat:</strong> MSc Computer Science – ETH Zürich</li>
          <li><strong>Nagyung Kim:</strong> MSc Computer Science – ETH Zürich</li>
          <li><strong>Nicolas Stucki:</strong> MSc Computer Science – ETH Zürich</li>
          <li><strong>Xiaozihan Wang:</strong> BSc Computer Science – University of Lugano</li>
        </ul>
      </section>
    </article>
  );
}
