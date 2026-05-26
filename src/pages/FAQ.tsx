type QA = { q: string; a: React.ReactNode };

const faqs: QA[] = [
  {
    q: "What is Bias Arcade?",
    a: (
      <p>
        Bias Arcade is a collection of short interactive experiences and resources designed to help users understand biases in AI models. Each experience explores either how a bias gets built into a system or what happens in the real world when a biased AI makes decisions.
      </p>
    ),
  },
  {
    q: "What is the target group of Bias Arcade?",
    a: (
      <p>
        Bias Arcade is designed for high school and university students, particularly those outside of computer science, as well as educators looking to explore AI bias with their students.
      </p>
    ),
  },
  {
    q: "Do learners need to know how to code to participate in the experiences?",
    a: (
      <p>
        No. The experiences focus on concepts, consequences and critical thinking. No coding or technical experience is needed to participate.
      </p>
    ),
  },
  {
    q: "Do learners need any prior knowledge?",
    a: (
      <p>
        Some basic familiarity with how AI models work, such as how models are trained and learn from data, is helpful for getting the most out of the interactive experiences. Under the Teacher Guide you will find external materials that can be used to introduce these concepts beforehand.
      </p>
    ),
  },
  {
    q: "What biases are covered?",
    a: (
      <p>
        Bias Arcade currently covers confirmation bias, learning bias, algorithmic bias, and interaction bias, as well as historical bias which is from an external team. Each experience focuses on one specific bias. A detailed overview with explanation of each bias can be found in the Teacher Guide.
      </p>
    ),
  },
  {
    q: "How long does each interactive experience take?",
    a: (
      <p>
        The estimated time for each experience is between 5-10 minutes.
      </p>
    ),
  },
  {
    q: "Do I need to complete the experiences in a certain order?",
    a: (
      <p>
        No, the experiences can be completed in any order and each one is self-contained. In the Teacher Guide, an overview of the experiences, a lesson plan and suggested discussion questions are available.
      </p>
    ),
  },
  {
    q: "Can Bias Arcade be used in a classroom?",
    a: (
      <p>
        Yes. The interactive experiences can be used individually or as part of a structured lesson.
      </p>
    ),
  },
  {
    q: "Do I need an internet connection for Bias Arcade?",
    a: (
      <p>
        Yes, Bias Arcade is a collection of web-based interactive experiences, so you will need an internet connection to access them.
      </p>
    ),
  },
  {
    q: "Does Bias Arcade work on mobile devices?",
    a: (
      <p>
        Bias Arcade is designed to work on desktop and laptop browsers. Some experiences may work on phones, but a larger screen is recommended for the best user experience.
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
