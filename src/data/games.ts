// Pedagogical taxonomy — where the bias sits in the AI lifecycle.
// Used by individual game pages and the Bias Recap quiz.
export type BiasLevel = "individual" | "multi-level" | "group";

export const LEVEL_LABELS: Record<BiasLevel, string> = {
  individual: "Individual-level biases",
  "multi-level": "Multi-level biases",
  group: "Group-level biases",
};

// UX taxonomy — how the player encounters the bias.
// Used by the home page to group games by interaction style.
export type GameStyle = "narrative" | "task" | "visual";

export const STYLE_LABELS: Record<GameStyle, string> = {
  narrative: "Narrative & Immersive",
  task: "Task-Oriented Simulation",
  visual: "Visual Experiment",
};

export const STYLE_DESCRIPTIONS: Record<GameStyle, string> = {
  narrative:
    "Dialogue-heavy, character-driven games focused on social context.",
  task: "Step into a decision-maker's seat and balance conflicting goals.",
  visual:
    "Minimalist controls, high-impact visual results — built for the Aha! moment.",
};

export type Game = {
  slug: string;
  title: string;
  level: BiasLevel;
  style: GameStyle;
  author: string;
  short: string;
  description: string;
};

export const games: Game[] = [
  {
    slug: "confirmation-bias",
    title: "Confirmation Bias",
    level: "individual",
    style: "task",
    author: "Akankshya",
    short: "A personalized feed that narrows the more you click.",
    description:
      "Users interact with article headlines. Depending on the choices, the AI personalizes the feed more and more so it converges on a single topic — surfacing how confirmation bias compounds in recommendation systems.",
  },
  {
    slug: "measurement-bias",
    title: "Measurement Bias",
    level: "individual",
    style: "visual",
    author: "Nicolas",
    short: "Same essay, two dialects — watch the AI grade them differently.",
    description:
      "An automated essay scoring system grades a college admission essay. The same student wrote two versions: one in Standard American English, one in AAVE. The argument is identical. The AI's score isn't. Surfaces how measurement bias arises when models conflate *how* something is written with *how well* it's reasoned. Grounded in the AES bias literature (González-Sendino et al., 2023).",
  },
  {
    slug: "algorithm-bias",
    title: "Algorithm Bias",
    level: "multi-level",
    style: "task",
    author: "Nagyung",
    short: "Patterns in the data become unfair outcomes in the model.",
    description:
      "Algorithm bias refers to systematic and unfair outcomes produced by an AI system, often reflecting imbalances present in the data, design choices, or broader social context. Even when the model accurately learns patterns from its training data, those patterns may encode existing inequalities.",
  },
  {
    slug: "learning-bias",
    title: "Learning Bias",
    level: "multi-level",
    style: "visual",
    author: "Nagyung",
    short: "Models grab the easiest signal, not the most meaningful one.",
    description:
      "Learning bias refers to the assumptions or preferences a model relies on when generalizing to new cases. Because data is always limited, models tend to favor patterns that are easier to detect — often relying on superficial features instead of capturing the true underlying concept.",
  },
  {
    slug: "interaction-bias",
    title: "Interaction Bias",
    level: "multi-level",
    style: "narrative",
    author: "Xiaozihan",
    short: "Loud voices speak; the AI thinks everyone agrees.",
    description:
      "A town uses AI to analyze forum comments to decide what new facility to build. 5% post loudly demanding a skate park; the silent 95% want a library. The AI concludes “everyone wants a skate park.” Players experience the consequences before learning what the data missed.",
  },
  {
    slug: "stereotyping-bias",
    title: "Stereotyping Bias",
    level: "multi-level",
    style: "visual",
    author: "Xiaozihan",
    short:
      "Predict how the AI fills in the blank — then see if you were right.",
    description:
      "Players guess how an LLM will complete sentences with gendered pronouns or names (e.g. “The CEO walked into the room and ___ placed the documents”). Comparing predictions with actual model output reveals stereotypes — and the discomfort of being able to predict them.",
  },
  {
    slug: "historical-bias",
    title: "Historical Bias",
    level: "group",
    style: "narrative",
    author: "Leroy",
    short: "Same applicant, different ZIP code, different decision.",
    description:
      "A loan-application model trained on historical data. Switch the applicant’s city between a wealthy and a poor neighborhood — nothing else changes — and watch the model’s decision flip. Inspired by survivalofthebestfit.com.",
  },
  {
    slug: "exclusion-bias",
    title: "Exclusion Bias",
    level: "group",
    style: "visual",
    author: "Akankshya",
    short: "Helpful advice — for a student who isn’t you.",
    description:
      "A study chatbot recommends “join evening study groups,” which is useless if you work evenings or commute long distances. The interaction surfaces how AI advice silently assumes a default user.",
  },
  {
    slug: "representation-bias",
    title: "Representation Bias",
    level: "group",
    style: "visual",
    author: "Leroy",
    short: "Pick your training set, watch the model take a side.",
    description:
      "Choose 5 of 15 newspapers to train a summarizer. The selection skews coverage toward a viewpoint, and the resulting summaries reveal how training-set composition becomes editorial slant.",
  },
  {
    slug: "mapping-bias",
    title: "Mapping Bias",
    level: "group",
    style: "visual",
    author: "Nicolas",
    short: "A model trained in Switzerland predicting salaries in Indonesia.",
    description:
      "A salary predictor trained on Swiss labor data is applied in another country — with predictions that are confidently wrong. Demonstrates how a model’s validity is bounded by the population it was trained on.",
  },
];

// Grouped by pedagogical level (kept for backwards-compat / other consumers).
export const gamesByLevel = (Object.keys(LEVEL_LABELS) as BiasLevel[]).map(
  (level) => ({
    level,
    label: LEVEL_LABELS[level],
    items: games.filter((g) => g.level === level),
  }),
);

// Grouped by interaction style — used by the home page.
export const gamesByStyle = (Object.keys(STYLE_LABELS) as GameStyle[]).map(
  (style) => ({
    style,
    label: STYLE_LABELS[style],
    description: STYLE_DESCRIPTIONS[style],
    items: games.filter((g) => g.style === style),
  }),
);
