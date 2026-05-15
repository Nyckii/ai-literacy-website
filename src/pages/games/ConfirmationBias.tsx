import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './ConfirmationBias.css';
import { markGameCompleted } from '../../lib/gameProgress';

// ── Types ─────────────────────────────────────────────────────────────────────

type Topic = 'tech' | 'science' | 'sports' | 'politics' | 'health' | 'culture';
type Phase = 'intro' | 'playing' | 'transitioning' | 'reveal' | 'learn';

type Article = {
  id: string;
  topic: Topic;
  headline: string;
  source: string;
  readTime: string;
  slides: [string, string];
};

type RoundRecord = {
  day: number;
  feedDistribution: Record<Topic, number>;
  reads: number;
};

// ── Config ────────────────────────────────────────────────────────────────────

const TOPICS: Topic[] = ['tech', 'science', 'sports', 'politics', 'health', 'culture'];

const TOPIC_META: Record<Topic, { label: string; emoji: string; color: string; gradAngle: string }> = {
  tech:     { label: 'Tech',     emoji: '💻', color: '#3b82f6', gradAngle: '150deg' },
  science:  { label: 'Science',  emoji: '🔬', color: '#8b5cf6', gradAngle: '135deg' },
  sports:   { label: 'Sports',   emoji: '⚽', color: '#22c55e', gradAngle: '160deg' },
  politics: { label: 'Politics', emoji: '🗳️', color: '#f97316', gradAngle: '120deg' },
  health:   { label: 'Health',   emoji: '🏥', color: '#ec4899', gradAngle: '145deg' },
  culture:  { label: 'Culture',  emoji: '🎨', color: '#eab308', gradAngle: '130deg' },
};

const ROUND_CONFIG = [
  { roundNum: 1, day: 1,  label: 'Day 1',  slots: [2, 2, 1, 1, 1, 1] },
  { roundNum: 2, day: 5,  label: 'Day 5',  slots: [4, 2, 1, 1, 0, 0] },
  { roundNum: 3, day: 10, label: 'Day 10', slots: [6, 1, 1, 0, 0, 0] },
  { roundNum: 4, day: 14, label: 'Day 14', slots: [8, 0, 0, 0, 0, 0] },
];

// ── Article Pool ──────────────────────────────────────────────────────────────

const ARTICLES: Article[] = [
  // ── Tech ──
  {
    id: 't1', topic: 'tech',
    headline: "New AI model writes code faster than senior engineers — and it's getting hired",
    source: 'TechPulse', readTime: '4 min',
    slides: [
      "A new large language model trained on 500 billion lines of code has outperformed senior engineers on standard benchmarks at three major tech firms. The model completes typical sprint tasks in under four minutes — tasks that take human developers an average of two hours.",
      "Over 200 engineering managers surveyed say they plan to use AI coding tools to reduce hiring by 15–30% within two years. Advocates argue the tech frees engineers for higher-level work; critics warn it accelerates job displacement with no safety net in place.",
    ],
  },
  {
    id: 't2', topic: 'tech',
    headline: "Apple's next chip is 40% faster — here's what that means for your laptop",
    source: 'Silicon Weekly', readTime: '3 min',
    slides: [
      "Leaked benchmarks for Apple's next-generation M4 chip show a 40% leap in performance over the current M3. The chip's neural processing unit runs machine-learning tasks at speeds previously confined to data centres.",
      "The chip can generate real-time 4K video with zero latency on battery power. Analysts predict the new MacBook lineup will push base-model pricing past $2,500 — and sell out within 48 hours of launch.",
    ],
  },
  {
    id: 't3', topic: 'tech',
    headline: "Why every big tech company is quietly building their own operating system",
    source: 'The Byte', readTime: '6 min',
    slides: [
      "Google, Meta, Apple, and Amazon are all developing proprietary operating systems to reduce reliance on third-party platforms. Each company spent over $1 billion on OS infrastructure projects last year alone.",
      "The shift signals a new era of platform fragmentation where your app, your data, and your experience could differ dramatically depending on which ecosystem you live in. Developers are already warning of a 'Tower of Babel' moment for the open web.",
    ],
  },
  {
    id: 't4', topic: 'tech',
    headline: "Scientists build first computer chip from lab-grown human brain cells",
    source: 'Future Forward', readTime: '5 min',
    slides: [
      "Scientists at Johns Hopkins have used lab-grown human neurons to perform simple arithmetic operations — the first functional use of biological brain tissue in computing. The chip consumes 1,000 times less energy than a comparable silicon processor.",
      "The team calls the technology 'organoid intelligence.' Ethicists are raising urgent questions about consciousness, consent, and the rights of biological computing systems — questions regulators are entirely unprepared to answer.",
    ],
  },
  {
    id: 't5', topic: 'tech',
    headline: "The dark side of 'free' AI tools: what they're really collecting about you",
    source: 'Digital Rights Now', readTime: '7 min',
    slides: [
      "An investigation reveals that 11 of the 15 most popular free AI tools collect and sell detailed behavioral profiles — including conversation content, typing patterns, and inferred emotional states. The data is often shared with brokers within minutes of a session ending.",
      "Three of the tools reviewed granted themselves perpetual rights to use your content for training, including private therapy notes and medical questions. Regulators in the EU have opened formal investigations into four of the platforms.",
    ],
  },
  {
    id: 't6', topic: 'tech',
    headline: "Quantum internet takes a leap closer to reality with stunning new data",
    source: 'TechPulse', readTime: '4 min',
    slides: [
      "Researchers transmitted quantum-encrypted data across 500 kilometres of fibre optic cable — breaking the previous record by a factor of five and achieving zero data loss, something previously considered theoretically impossible.",
      "If commercialised, quantum networks would make interception of communications physically impossible, not just computationally difficult. Governments worldwide are racing to develop national quantum networks before the technology becomes available to private actors.",
    ],
  },
  {
    id: 't7', topic: 'tech',
    headline: "Why developers are abandoning JavaScript for this surprising alternative",
    source: 'The Byte', readTime: '5 min',
    slides: [
      "A survey of 80,000 developers shows satisfaction with JavaScript has dropped 22 points in three years. Many cite 'runtime unpredictability' and 'dependency hell' as primary reasons; Rust, Go, and TypeScript are all gaining significant ground.",
      "One senior engineer at a major streaming platform said migrating core services from Node.js to Rust cut server costs by 40%. The JavaScript Foundation has announced a major overhaul, but many in the community say it may be too late.",
    ],
  },
  {
    id: 't8', topic: 'tech',
    headline: "Social media algorithms now predict political views with 94% accuracy",
    source: 'Digital Rights Now', readTime: '6 min',
    slides: [
      "A new study shows commercial algorithms can correctly infer a user's political views, income bracket, and health status from as few as 12 likes — without the user ever sharing that information directly. The accuracy rate is 94%.",
      "The research raises serious alarm for users in countries where political views can lead to discrimination or prosecution. Researchers found even 'anonymous' accounts could be fully profiled within 48 hours of first use.",
    ],
  },
  // ── Science ──
  {
    id: 's1', topic: 'science',
    headline: "Scientists discover deep-sea creature that hasn't evolved in 500 million years",
    source: 'The Science Weekly', readTime: '4 min',
    slides: [
      "A species of microscopic organism discovered near Pacific hydrothermal vents is genetically identical to fossils found in 500-million-year-old Cambrian rock layers. Biologists say this makes it the most evolutionarily stable complex organism ever recorded.",
      "Nicknamed 'the timeless one,' the creature appears to have survived five mass extinction events. Scientists believe its ability to enter suspended metabolic stasis for up to 10,000 years holds the key to its extraordinary resilience.",
    ],
  },
  {
    id: 's2', topic: 'science',
    headline: "CRISPR treatment reverses hearing loss in children for the first time",
    source: 'Lab Report', readTime: '5 min',
    slides: [
      "Gene-editing therapy successfully restored partial hearing in six children born with a rare hereditary form of deafness. All six could hear speech at conversational volume within three months of a single treatment session.",
      "The therapy targets a mutation in the OTOF gene responsible for a protein essential to inner ear function. Researchers say the technique could be adapted for 26 other forms of genetic hearing loss within a decade.",
    ],
  },
  {
    id: 's3', topic: 'science',
    headline: "NASA finds evidence of ancient rivers on Mars that lasted far longer than thought",
    source: 'Orbit Observer', readTime: '5 min',
    slides: [
      "New analysis of Mars Reconnaissance Orbiter data suggests rivers on the red planet flowed for at least 100,000 years — ten times longer than previous estimates. Some channels show evidence of episodic flooding over 2 million years.",
      "The findings raise the possibility that Mars had a warm, wet climate long enough for simple life to emerge and evolve. NASA's Perseverance rover is now tasked with drilling former river delta sites specifically to search for biosignatures.",
    ],
  },
  {
    id: 's4', topic: 'science',
    headline: "New study: the universe may be 26.7 billion years old — not 13.8",
    source: 'Cosmos Today', readTime: '6 min',
    slides: [
      "A new model of cosmic expansion, based on James Webb Space Telescope observations, suggests the universe may be nearly twice as old as the standard 13.8-billion-year estimate. The revised model resolves a longstanding tension between the ages of the oldest known stars and the universe itself.",
      "The theory has been controversial for decades but is gaining traction with new data. If confirmed, it would require a fundamental rethinking of the Big Bang and the physics of cosmic inflation.",
    ],
  },
  {
    id: 's5', topic: 'science',
    headline: "The mushroom network under your feet is smarter than we thought",
    source: 'The Science Weekly', readTime: '4 min',
    slides: [
      "A study mapping fungal networks across 180 forest sites found a single mycorrhizal network can span over 200 kilometres, connecting thousands of trees and transferring nutrients between species that would otherwise compete.",
      "Old-growth trees act as 'mother nodes,' disproportionately feeding seedlings too shaded to photosynthesize effectively. Logging these hub trees can collapse entire forest networks within 18 months — a finding with major implications for conservation policy.",
    ],
  },
  {
    id: 's6', topic: 'science',
    headline: "First complete map of a human brain's wiring published after 14 years of work",
    source: 'Lab Report', readTime: '7 min',
    slides: [
      "After 14 years and 3 petabytes of electron microscope data, researchers published the first complete connectome of a mammalian brain — a cubic millimetre of mouse cortex containing 57,000 cells and 150 million synapses, accurate to the nanometre.",
      "Among the discoveries: individual neurons form loops back to themselves, a phenomenon previously thought impossible. The team also found unexpected structural similarities to artificial neural networks used in modern deep learning.",
    ],
  },
  {
    id: 's7', topic: 'science',
    headline: "Psychedelics rewire the brain in ways antidepressants can't — trials explain why",
    source: 'Mind Matters', readTime: '5 min',
    slides: [
      "A trial comparing psilocybin therapy to standard antidepressants found psychedelic treatment produced measurable changes in brain connectivity that persisted for six months after a single session. Antidepressant users showed no such structural changes.",
      "Patients in the psilocybin group reported a 57% reduction in depression severity — significantly higher than the 28% reduction seen with SSRIs. The FDA has granted the treatment Breakthrough Therapy status, fast-tracking clinical approval.",
    ],
  },
  {
    id: 's8', topic: 'science',
    headline: "Ocean temperatures hit record highs for 400 days straight — scientists alarmed",
    source: 'Cosmos Today', readTime: '4 min',
    slides: [
      "Global ocean surface temperatures have exceeded the previous record high for 400 consecutive days — a streak scientists call 'statistically unprecedented' in 170 years of recorded data. The North Atlantic reached temperatures 1.3°C above the prior record.",
      "Marine biologists report mass bleaching events affecting 80% of the Great Barrier Reef for the second consecutive year. Oceanographers warn a collapsing ocean heat pump could permanently alter rainfall patterns across three continents.",
    ],
  },
  // ── Sports ──
  {
    id: 'sp1', topic: 'sports',
    headline: "Underdog college team defeats top seed in jaw-dropping overtime comeback",
    source: 'Field Report', readTime: '3 min',
    slides: [
      "16th-seeded Riverton State erased a 24-point deficit in the final eight minutes to beat the defending national champion — what commentators are calling the greatest upset in college athletics history. Point guard Deja Okafor scored 31 points in the fourth quarter alone.",
      "The game drew a peak TV audience of 18 million, more than the NBA Finals Game 7 last year. Riverton State's head coach, who earns $58,000 a year, was immediately offered a $2.4 million contract by a Division I program.",
    ],
  },
  {
    id: 'sp2', topic: 'sports',
    headline: "Why this generation of athletes is challenging coaches publicly — and winning",
    source: 'Sports Culture', readTime: '5 min',
    slides: [
      "A growing number of elite athletes are publicly contradicting coaches, team doctors, and governing bodies on training methods, mental health protocols, and pay — and winning disputes. Six high-profile cases in the past year resulted in contract restructuring in the athletes' favour.",
      "Sports psychologists say the shift reflects a generation raised to advocate for themselves, armed with data from personal performance trackers that often contradict official team metrics. Several national federations are piloting athlete-led governance models.",
    ],
  },
  {
    id: 'sp3', topic: 'sports',
    headline: "E-sports viewership now outpaces the NFL playoffs for viewers under 25",
    source: 'Game On', readTime: '4 min',
    slides: [
      "For the first time, a major esports tournament — the League of Legends World Championship — drew more live viewers aged 18–24 than the NFL playoff weekend in the same period. The esports event peaked at 6.4 million US viewers in that demographic; the NFL game at 5.8 million.",
      "Advertising rates for esports broadcasts have tripled in two years as brands chase the demographic. Three NFL teams have quietly acquired esports franchises as a hedge against long-term viewership decline.",
    ],
  },
  {
    id: 'sp4', topic: 'sports',
    headline: "The hidden injury crisis in college athletics: what universities won't tell you",
    source: 'Sports Culture', readTime: '7 min',
    slides: [
      "An investigation found that over 40% of Division I college athletes play through injuries team doctors have flagged as 'significant risk' — often under explicit or implied pressure from coaching staff. Fewer than 10% file formal complaints.",
      "Researchers documented 23 cases where athletes suffered permanent damage after being pressured to compete while injured. Universities have quietly settled 14 of these cases for undisclosed sums, with non-disclosure agreements preventing public reporting.",
    ],
  },
  {
    id: 'sp5', topic: 'sports',
    headline: "How data analytics is changing who gets scouted — and who gets left out",
    source: 'Field Report', readTime: '5 min',
    slides: [
      "Advanced analytics tools are reshaping talent scouting, with teams using biometric data, GPS tracking, and computer vision to identify prospects previously overlooked by human scouts. Several top-ten draft picks in the last three years were flagged by algorithms before any scout saw them play live.",
      "Critics argue the systems encode existing biases — consistently under-rating athletes from lower-income backgrounds who lack access to high-tech training environments. One study found Black athletes were 23% less likely to be correctly ranked by three of the five major AI scouting platforms.",
    ],
  },
  {
    id: 'sp6', topic: 'sports',
    headline: "Record-breaking sprint time leaves rivals — and physics — stunned",
    source: 'Track Today', readTime: '3 min',
    slides: [
      "A 19-year-old Ethiopian sprinter ran the 100 metres in 9.48 seconds at a qualifying meet in Addis Ababa — 0.10 seconds faster than Usain Bolt's world record. Wind readings were within legal limits and the timing system was certified by World Athletics.",
      "Biomechanists say the time approaches the theoretical human maximum, which most models placed decades away. The athlete, Kedir Tesfaye, is virtually unknown outside Ethiopia and has competed in fewer than 30 professional races.",
    ],
  },
  {
    id: 'sp7', topic: 'sports',
    headline: "The rise of NIL deals: how college athletes became small business owners",
    source: 'Game On', readTime: '6 min',
    slides: [
      "Since the NCAA's Name, Image, and Likeness rule change, college athletes have collectively earned over $1.7 billion in brand deals, social media contracts, and endorsements. The top-earning college athlete made $6.3 million last year — more than most professional sports salaries.",
      "The income gap between star athletes and benchwarmers has created new tensions in locker rooms, with several programs reporting internal conflicts over playing time and team cohesion. Academic advisers say financial stakes are distorting athletes' course choices and graduation rates.",
    ],
  },
  {
    id: 'sp8', topic: 'sports',
    headline: "Female athletes earn 18% of sports revenue despite 40% of the global audience",
    source: 'Sports Culture', readTime: '5 min',
    slides: [
      "Despite accounting for 40% of the global sports audience, women's sports generate only 18% of total broadcast and sponsorship revenue. The gap has widened by 3 points in the last decade as men's leagues secured multi-billion-dollar streaming deals.",
      "Female athletes are paid 73 cents for every dollar earned by male athletes at equivalent performance levels — a gap driven primarily by differences in broadcast deals, not talent or audience size, according to a new report by the Women's Sports Foundation.",
    ],
  },
  // ── Politics ──
  {
    id: 'p1', topic: 'politics',
    headline: "Student debt relief bill stalls in Senate — what it means for borrowers",
    source: 'Capitol Dispatch', readTime: '4 min',
    slides: [
      "A bipartisan student debt relief bill that would have cancelled up to $20,000 in federal loans for borrowers earning under $75,000 has stalled after three moderate Democrats joined Republicans to block a procedural vote. The bill had passed the House 241–192.",
      "An estimated 14 million borrowers were projected to see immediate full cancellation under the plan. The White House says it is exploring executive action, but legal advisers warn any order would face immediate court challenges after the Supreme Court's 2023 ruling.",
    ],
  },
  {
    id: 'p2', topic: 'politics',
    headline: "Cities experimenting with 4-day work weeks report higher productivity",
    source: 'Policy Watch', readTime: '5 min',
    slides: [
      "Twelve US cities and three states have launched pilot programmes for a 4-day work week in public sector jobs, following data from a 61-company UK trial showing 21% higher productivity and 65% lower attrition. Results so far show similar trends in government roles.",
      "Critics argue the model doesn't translate to service industries requiring continuous staffing. Some city councils report pushback from managers who associate long hours with work ethic — a cultural barrier researchers say is the biggest obstacle to adoption.",
    ],
  },
  {
    id: 'p3', topic: 'politics',
    headline: "Gen Z voter turnout hits record high — but trust in politicians hits a low",
    source: 'Civic Pulse', readTime: '4 min',
    slides: [
      "Voter turnout among 18-to-26-year-olds hit 52% in the last general election — a record high for that demographic and an 11-point jump from the previous cycle. Analysts attribute the surge to digital-native organising and a single galvanising issue: housing costs.",
      "Despite record turnout, trust in politicians among Gen Z stands at an all-time low of 14% — lower than any other age group. Many young voters describe their participation as 'damage control' rather than genuine civic enthusiasm.",
    ],
  },
  {
    id: 'p4', topic: 'politics',
    headline: "The algorithm that decides if your neighborhood gets policed — and who built it",
    source: 'Capitol Dispatch', readTime: '6 min',
    slides: [
      "Over 60 US cities use AI-based 'predictive policing' software to allocate patrol resources — tools that consistently direct more police to lower-income, predominantly minority neighbourhoods regardless of actual crime rates. The systems operate with zero public oversight.",
      "Internal audits obtained through FOIA requests show three of the five most widely deployed systems have accuracy rates below 20% for predicting actual crimes. Cities pay between $80,000 and $2 million annually for the software.",
    ],
  },
  {
    id: 'p5', topic: 'politics',
    headline: "Free public transit: bold experiment or expensive failure? Three cities tried it.",
    source: 'Policy Watch', readTime: '5 min',
    slides: [
      "Luxembourg, Tallinn, and Kansas City have made all public transit free for residents — with radically different results. Luxembourg saw a 40% ridership increase; Tallinn saw 8%; Kansas City saw almost no change, largely because its bus network was already too unreliable to attract car users.",
      "Economists say the Kansas City experiment reveals a key flaw: free transit only works if the transit itself is worth taking. Infrastructure investment, not price, is the binding constraint in most North American cities.",
    ],
  },
  {
    id: 'p6', topic: 'politics',
    headline: "Why housing affordability is the defining political issue for people in their 20s",
    source: 'Civic Pulse', readTime: '5 min',
    slides: [
      "For the first time in polling history, housing cost is the single top political issue for adults aged 18–29, outranking climate change, student debt, and healthcare. The median house price is now 11.5 times the median income for first-time buyers — up from 4.2 times in 1990.",
      "Young adults in major cities spend an average of 48% of take-home pay on rent alone — well above the 30% threshold economists consider sustainable. Three in five say they have delayed starting a family specifically because of housing costs.",
    ],
  },
  {
    id: 'p7', topic: 'politics',
    headline: "AI-generated political ads: impossible to detect and increasingly hard to stop",
    source: 'Capitol Dispatch', readTime: '6 min',
    slides: [
      "Deepfake political ads using AI-generated audio and video of real candidates are now virtually undetectable with the naked eye — and increasingly hard to flag with automated systems. Researchers at Stanford tested 40 deepfake ads against 12 detection tools; none flagged more than 60% correctly.",
      "In the last election cycle, an estimated 14,000 AI-generated political ads ran across social platforms, most without disclosure. The FEC has proposed mandatory labelling, but enforcement mechanisms lag years behind the technology.",
    ],
  },
  {
    id: 'p8', topic: 'politics',
    headline: "The country that gave citizens a universal basic income — and what happened next",
    source: 'Policy Watch', readTime: '7 min',
    slides: [
      "Finland ran a two-year universal basic income trial paying €560 per month to 2,000 unemployed citizens with no conditions. Results show participants were significantly happier, healthier, and just as likely to find employment as the control group.",
      "Despite positive results, Finland did not expand the programme — citing fiscal concerns and political resistance. The trial's biggest finding: guaranteed income does not reduce the will to work, directly contradicting the most common argument against it.",
    ],
  },
  // ── Health ──
  {
    id: 'h1', topic: 'health',
    headline: "New study links ultra-processed food to depression — the data is hard to ignore",
    source: 'Wellbeing Today', readTime: '4 min',
    slides: [
      "A meta-analysis of 29 studies covering 300,000 participants found a consistent association between ultra-processed food consumption and depression severity. People in the highest consumption bracket showed 44% higher rates of clinical depression, even after controlling for income, exercise, and sleep.",
      "The proposed mechanism is gut-brain axis disruption: ultra-processed foods alter gut bacteria within two weeks, reducing production of serotonin precursors. Researchers note that 58% of the average American's daily calories now come from ultra-processed foods.",
    ],
  },
  {
    id: 'h2', topic: 'health',
    headline: "The sleep debt myth: you can't catch up on weekends, say neuroscientists",
    source: 'Mind & Body', readTime: '5 min',
    slides: [
      "A new Johns Hopkins study confirms that 'recovery sleep' on weekends does not reverse cognitive damage caused by weekday sleep deprivation. Participants who slept 6 hours per night for 5 days showed impaired reaction times and memory that persisted despite 10 hours of weekend sleep.",
      "After 10 days of short sleep, individuals lost the ability to accurately perceive their own impairment — effectively becoming blind to their own exhaustion. Researchers say this has serious implications for shift workers, medical residents, and students.",
    ],
  },
  {
    id: 'h3', topic: 'health',
    headline: "Burnout among university students reaches a historic high — nobody is ready",
    source: 'Campus Health', readTime: '5 min',
    slides: [
      "A survey of 45,000 university students across 22 countries found that 61% meet the clinical definition of burnout — characterised by exhaustion, cynicism, and reduced academic efficacy. The rate has nearly doubled in five years, with the sharpest increase among first-generation students.",
      "Mental health services at most universities are operating at 140–200% of intended capacity, with average counselling wait times reaching 6 weeks at major institutions. Three in four students who sought help reported being turned away or referred to services they couldn't afford.",
    ],
  },
  {
    id: 'h4', topic: 'health',
    headline: "Why your gut microbiome might be the key to finally treating anxiety",
    source: 'Wellbeing Today', readTime: '6 min',
    slides: [
      "A randomised controlled trial found that a targeted probiotic supplement, taken for 8 weeks, reduced anxiety symptoms as effectively as a commonly prescribed SSRI — with significantly fewer side effects. The treatment works by increasing Lactobacillus rhamnosus, a bacterium that produces GABA, the brain's primary calming neurotransmitter.",
      "The gut-brain connection — the enteric nervous system — contains 500 million neurons, more than the spinal cord. Researchers say the microbiome may be the 'missing variable' in psychiatric treatment, and that existing therapies have largely ignored it for decades.",
    ],
  },
  {
    id: 'h5', topic: 'health',
    headline: "New cancer therapy shows 98% success rate in early trial — what comes next",
    source: 'Medical Frontiers', readTime: '5 min',
    slides: [
      "A personalised mRNA cancer vaccine — built using the same platform as COVID-19 vaccines — has shown 98% success at eliminating residual cancer cells in an early trial for pancreatic cancer, historically one of the deadliest cancers with an 11% five-year survival rate.",
      "The vaccine is custom-built per patient using a biopsy of their tumour, teaching the immune system to recognise cells carrying specific mutations. All 18 participants remained cancer-free at the 18-month follow-up. Phase 3 trials involving 400 patients are now underway.",
    ],
  },
  {
    id: 'h6', topic: 'health',
    headline: "The hidden cost of phone addiction: what it's doing to posture and eyesight",
    source: 'Mind & Body', readTime: '4 min',
    slides: [
      "Orthopaedic surgeons report a 68% increase in cervical spine abnormalities — 'tech neck' — in patients under 30 over the past decade. Looking down at screens for 4+ hours daily can add the equivalent of 60 lbs of pressure to the top of the spine.",
      "Ophthalmologists are simultaneously recording rates of myopia affecting 1 in 2 people in urban populations globally. Screen time before age 12 is identified as the primary driver — even more significant than genetics — making it one of the most preventable epidemics in modern medicine.",
    ],
  },
  {
    id: 'h7', topic: 'health',
    headline: "How 10 minutes of cold water rewires your stress response, per neuroscience",
    source: 'Wellbeing Today', readTime: '3 min',
    slides: [
      "A neuroscience study found that regular cold water exposure — just 10 minutes at 15°C — produces measurable changes in the brain's stress regulation circuitry after three weeks. Participants showed a 37% reduction in cortisol response to standardised stressors.",
      "The mechanism involves repeated activation and deactivation of the sympathetic nervous system, which recalibrates the body's 'stress setpoint.' Researchers note the effect is comparable to moderate daily exercise and may be especially accessible for people with mobility limitations.",
    ],
  },
  {
    id: 'h8', topic: 'health',
    headline: "Therapy wait times hit 6 months at most universities — students seek alternatives",
    source: 'Campus Health', readTime: '5 min',
    slides: [
      "Average wait times for on-campus mental health appointments have reached 6 months at 64% of universities surveyed, with the worst-performing institutions reporting waits of over a year. The demand surge follows pandemic-era increases that services have never recovered from.",
      "In response, students are turning to AI chatbot therapy tools — some with no clinical oversight and advice that contradicts standard psychological guidelines. Researchers warn inadequate alternatives may create a false sense of support while leaving underlying conditions untreated.",
    ],
  },
  // ── Culture ──
  {
    id: 'c1', topic: 'culture',
    headline: "How a 22-year-old's TikTok series became the most-watched documentary of the year",
    source: 'Culture Wire', readTime: '4 min',
    slides: [
      "A TikTok series created by journalism student Amara Osei, shot on a phone and posted in 90-second episodes, has accumulated 340 million views and been re-edited into a feature documentary screened at Sundance. The series investigated predatory lending practices in Baltimore.",
      "Major documentary platforms passed on the project when pitched traditionally. Osei turned to TikTok after 14 producer rejections, deliberately optimising posting times to hit peak viewership. Netflix has since acquired global rights for an undisclosed sum.",
    ],
  },
  {
    id: 'c2', topic: 'culture',
    headline: "The vinyl comeback isn't about nostalgia — it's about owning something real",
    source: 'Sound & Vision', readTime: '5 min',
    slides: [
      "Vinyl record sales have outpaced CDs for the third consecutive year. A survey of buyers under 30 reveals nostalgia is not the primary driver — 71% cite 'physical ownership' and 'intentional listening.' The average vinyl buyer streams 4.2 hours of music daily but says vinyl feels fundamentally different.",
      "The trend is reshaping the music economy: vinyl releases now face 6–12 month pressing lead times. Smaller artists who sell directly to fans earn 62% of the sale price per unit — compared to a fraction of a cent per stream on major platforms.",
    ],
  },
  {
    id: 'c3', topic: 'culture',
    headline: "AI art won a fine arts competition. The backlash reveals everything.",
    source: 'Culture Wire', readTime: '6 min',
    slides: [
      "An AI-generated image won first place in the 'digital art' category at the Colorado State Fair, beating hundreds of human artists. The creator entered using Midjourney and disclosed the AI use in the title — which judges said they overlooked when scoring.",
      "Dozens of artists withdrew from future competitions that allow AI entries. Others argued that curating and directing AI is itself a creative act. The controversy has prompted art institutions worldwide to rapidly draft AI submission policies — a debate with no clear resolution in sight.",
    ],
  },
  {
    id: 'c4', topic: 'culture',
    headline: "Why fanfiction communities are now the best writing schools on the internet",
    source: 'The Literary Beat', readTime: '5 min',
    slides: [
      "A study of published novelists finds 34% of authors under 35 got their start writing fanfiction online, citing immediate feedback, engaged communities, and the freedom to experiment without commercial pressure. Several bestselling series began as fan works.",
      "Archive of Our Own hosts more written words than all physical books ever published combined — and feedback loops are instantaneous. Writing teachers say the model — write, publish, receive comment, revise — is more effective than any MFA workshop structure.",
    ],
  },
  {
    id: 'c5', topic: 'culture',
    headline: "The architecture that makes cities feel inhuman — and the people fighting back",
    source: 'Space & Place', readTime: '6 min',
    slides: [
      "A study in environmental psychology has linked the rise of 'defensive architecture' — spikes on benches, hostile pavement, narrow sidewalks — to measurable increases in stress hormones and social isolation. Cities with the most hostile design features showed 28% higher rates of reported loneliness.",
      "A growing movement of architects now designs with 'social affordance' as the primary metric — asking whether a space invites people to linger, meet, and interact. Several European cities have passed legislation banning anti-homeless architecture on all public land.",
    ],
  },
  {
    id: 'c6', topic: 'culture',
    headline: "Streaming destroyed the monoculture. Was that actually a good thing?",
    source: 'Sound & Vision', readTime: '5 min',
    slides: [
      "For the first time since the invention of television, there is no single show, song, or cultural event that a majority of adults in any major country have consumed in the past week. The fragmentation of media into micro-niches has made shared cultural reference points increasingly rare.",
      "Some researchers see this as liberation from a single taste-making industry. Others warn of 'cultural atomisation,' where communities lose the shared stories that create social cohesion — a debate that has become a proxy war for arguments about algorithmic personalisation.",
    ],
  },
  {
    id: 'c7', topic: 'culture',
    headline: "The rise of the 'deinfluencer' and what it reveals about our brand fatigue",
    source: 'Culture Wire', readTime: '4 min',
    slides: [
      "A new wave of creators — 'deinfluencers' — have amassed millions of followers by explicitly telling audiences not to buy products. Their content features honest reviews, product failures, and deconstructions of influencer marketing tactics. Several brands have reportedly paid them to stop posting.",
      "Trust in influencer recommendations has dropped 31% in three years, while trust in 'anti-recommendation' content has risen 47% — creating a paradox brands are struggling to navigate. Some deinfluencers have quietly signed brand deals, raising questions about the movement's authenticity.",
    ],
  },
  {
    id: 'c8', topic: 'culture',
    headline: "Street murals are being painted over. Here's who decides what art survives.",
    source: 'Space & Place', readTime: '5 min',
    slides: [
      "An investigation found 40% of murals commissioned under public art programmes in major US cities are removed within three years — most often to make way for commercial redevelopment or after complaints from new property owners who moved in after the art was created.",
      "The pattern reveals a structural contradiction: cities commission murals as cultural landmarks but lack legal frameworks to protect them as such. Art preservation advocates are pushing for a 'cultural covenant' requiring developers to negotiate with artists before removing publicly funded work.",
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function zeroScores(): Record<Topic, number> {
  return Object.fromEntries(TOPICS.map(t => [t, 0])) as Record<Topic, number>;
}

function generateFeed(roundIndex: number, scores: Record<Topic, number>): Article[] {
  const { slots } = ROUND_CONFIG[roundIndex];
  const ranked = [...TOPICS].sort((a, b) => scores[b] - scores[a]);
  const usedInRound = new Set<string>();
  const result: Article[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const count = slots[i] ?? 0;
    if (count === 0) continue;
    const pool = ARTICLES.filter(a => a.topic === ranked[i] && !usedInRound.has(a.id));
    const picked = shuffle(pool).slice(0, count);
    picked.forEach(a => usedInRound.add(a.id));
    result.push(...picked);
  }
  if (result.length < 8) {
    const extra = shuffle(ARTICLES.filter(a => !usedInRound.has(a.id))).slice(0, 8 - result.length);
    result.push(...extra);
  }
  return shuffle(result);
}

function computeDistribution(articles: Article[]): Record<Topic, number> {
  const dist = zeroScores();
  articles.forEach(a => dist[a.topic]++);
  return dist;
}

function dominantOf(scores: Record<Topic, number>): Topic {
  return TOPICS.reduce((a, b) => scores[a] >= scores[b] ? a : b);
}

function echoIntensity(dist: Record<Topic, number>): number {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return Math.round(Math.max(...Object.values(dist)) / total * 100);
}

function getTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toHandle(source: string): string {
  return source.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fakeLikes(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i) * (i + 1);
  return 247 + (n * 137 + 89) % 14800;
}

// ── AI Narration ──────────────────────────────────────────────────────────────

function getAiMessage(topic: Topic, upcomingRound: number) {
  const { label, emoji } = TOPIC_META[topic];
  const messages: Record<number, { title: string; steps: string[] }> = {
    2: {
      title: `Personalizing your feed ${emoji}`,
      steps: [
        `Scanning likes, reads, and dwell-time signals...`,
        `Strong affinity detected: ${label} content`,
        `Updating recommendation weights...`,
        `Done — showing more ${label} starting now.`,
      ],
    },
    3: {
      title: `We know exactly what you like 🎯`,
      steps: [
        `Profile confidence: 84% — ${label} superfan`,
        `Removing low-engagement categories from queue`,
        `Amplifying ${label} content weight by 3.4×`,
        `Engagement optimization complete!`,
      ],
    },
    4: {
      title: `Your feed is perfectly dialed in ✨`,
      steps: [
        `Persona locked: "${label} Power User" (97% match)`,
        `Eliminated topics below 5% engagement threshold`,
        `Maximising your content relevance score...`,
        `Hyper-personalized feed is ready!`,
      ],
    },
  };
  return messages[upcomingRound] ?? messages[2];
}

// ── IntroScreen ───────────────────────────────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="cb-intro">
      <div className="cb-intro-content">
        <p className="eyebrow">Confirmation Bias · Interactive Game</p>
        <h1 className="cb-intro-title">
          Your feed learns<br />from every like.
        </h1>
        <p className="cb-intro-sub">
          Scroll through a social feed across 14 days. Like and read the posts that catch your eye.
          Watch the algorithm turn your taste into a tunnel.
        </p>
        <div className="cb-intro-steps">
          <div className="cb-intro-step">
            <div className="cb-step-num">1</div>
            <div>
              <strong>Swipe through carousel posts</strong>
              <span>Each post has 3 slides — read to the end or just scroll past</span>
            </div>
          </div>
          <div className="cb-intro-step">
            <div className="cb-step-num">2</div>
            <div>
              <strong>The AI watches every signal</strong>
              <span>Likes, reading time, carousel depth — all feed the model</span>
            </div>
          </div>
          <div className="cb-intro-step">
            <div className="cb-step-num">3</div>
            <div>
              <strong>Watch your echo chamber form</strong>
              <span>Feed diversity collapses faster than you'd think</span>
            </div>
          </div>
        </div>
        <button className="btn btn-primary cb-intro-btn" onClick={onStart}>
          Open the app →
        </button>
        <p className="cb-intro-meta">4 sessions spanning 14 days · ~3 min</p>
      </div>

      <div className="cb-intro-device" aria-hidden="true">
        <div className="cb-mini-ipad">
          <div className="cb-mini-screen">
            {TOPICS.map((t, i) => (
              <div key={t} className="cb-mini-bar" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="cb-mini-dot" style={{ background: TOPIC_META[t].color }} />
                <div className="cb-mini-lines">
                  <div style={{ width: `${65 + i * 5}%`, background: `${TOPIC_META[t].color}40` }} />
                  <div style={{ width: `${40 + i * 7}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="cb-mini-label">Day 1 — diverse feed</div>
        </div>
        <div className="cb-intro-arrow">→</div>
        <div className="cb-mini-ipad cb-mini-ipad--echo">
          <div className="cb-mini-screen">
            {[78, 85, 72, 90, 68, 80, 75, 83].map((w, i) => (
              <div key={i} className="cb-mini-bar">
                <div className="cb-mini-dot" style={{ background: '#3b82f6' }} />
                <div className="cb-mini-lines">
                  <div style={{ width: `${w}%`, background: '#3b82f640' }} />
                  <div style={{ width: `${Math.round(w * 0.6)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="cb-mini-label cb-mini-label--echo">Day 14 — echo chamber</div>
        </div>
      </div>
    </div>
  );
}

// ── InstagramPost (carousel) ──────────────────────────────────────────────────

function InstagramPost({
  article,
  isLiked,
  delay,
  onLike,
  onRead,
  onDwell,
}: {
  article: Article;
  isLiked: boolean;
  delay: number;
  onLike: () => void;
  onRead: () => void;
  onDwell: () => void;
}) {
  const meta = TOPIC_META[article.topic];
  const handle = toHandle(article.source);
  const likeCount = fakeLikes(article.id) + (isLiked ? 1 : 0);
  const commentCount = 12 + (fakeLikes(article.id) % 200);

  const [slide, setSlide] = useState(0);
  const [hasRead, setHasRead] = useState(false);
  const totalSlides = 3; // cover + 2 text slides

  const postRef = useRef<HTMLElement>(null);
  const entryTimeRef = useRef(0);
  const onReadRef = useRef(onRead);
  const onDwellRef = useRef(onDwell);

  useEffect(() => { onReadRef.current = onRead; }, [onRead]);
  useEffect(() => { onDwellRef.current = onDwell; }, [onDwell]);

  // Dwell-time detection via IntersectionObserver
  useEffect(() => {
    const el = postRef.current;
    if (!el) return;
    const feed = el.closest('.cb-ipad-feed') as Element | null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entryTimeRef.current = Date.now();
        } else if (entryTimeRef.current > 0) {
          const secs = (Date.now() - entryTimeRef.current) / 1000;
          entryTimeRef.current = 0;
          if (secs >= 7) onDwellRef.current();
        }
      },
      { threshold: 0.5, root: feed },
    );
    observer.observe(el);
    return () => {
      if (entryTimeRef.current > 0) {
        const secs = (Date.now() - entryTimeRef.current) / 1000;
        if (secs >= 7) onDwellRef.current();
      }
      observer.disconnect();
    };
  }, []); // stable — uses refs for callbacks

  const goNext = () => {
    const next = Math.min(slide + 1, totalSlides - 1);
    setSlide(next);
    if (next === totalSlides - 1 && !hasRead) {
      setHasRead(true);
      onReadRef.current();
    }
  };

  const goPrev = () => setSlide(s => Math.max(s - 1, 0));

  return (
    <article
      ref={postRef}
      className="cb-ig-post"
      style={{
        '--ig-color': meta.color,
        '--ig-angle': meta.gradAngle,
        animationDelay: `${delay}ms`,
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="cb-ig-header">
        <div className="cb-ig-avatar"><span>{meta.emoji}</span></div>
        <div className="cb-ig-user">
          <span className="cb-ig-handle">@{handle}</span>
          <span className="cb-ig-subline">{article.source} · 2h</span>
        </div>
        <div className="cb-ig-header-right">
          {hasRead && <span className="cb-ig-read-pill">📖 Read</span>}
          <span className="cb-ig-topic-chip" style={{ color: meta.color, background: `${meta.color}18` }}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Carousel */}
      <div className="cb-ig-carousel">
        {/* Dot indicators */}
        <div className="cb-ig-dots">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div
              key={i}
              className={`cb-ig-dot ${i === slide ? 'cb-ig-dot--active' : ''}`}
              style={i === slide ? { background: meta.color } : {}}
            />
          ))}
        </div>

        {/* Slide track */}
        <div
          className="cb-ig-slides-track"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {/* Slide 0 — visual cover */}
          <div className="cb-ig-slide cb-ig-slide--cover">
            <div className="cb-ig-image-glow" />
            <span className="cb-ig-image-emoji" aria-hidden="true">{meta.emoji}</span>
            <span className="cb-ig-image-hashtag">#{meta.label.toLowerCase()}</span>
            {slide === 0 && (
              <div className="cb-ig-swipe-hint">
                <span>swipe for article</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            )}
          </div>

          {/* Slides 1 & 2 — text content */}
          {article.slides.map((text, i) => (
            <div
              key={i}
              className="cb-ig-slide cb-ig-slide--text"
              style={{ '--slide-color': meta.color } as React.CSSProperties}
            >
              <div className="cb-ig-slide-top">
                <span className="cb-ig-slide-emoji">{meta.emoji}</span>
                <span className="cb-ig-slide-num">{i + 2} / {totalSlides}</span>
              </div>
              <p className="cb-ig-slide-text">{text}</p>
              <div className="cb-ig-slide-bottom">
                <span className="cb-ig-slide-src">{article.source}</span>
                {i === article.slides.length - 1 && (
                  <span className="cb-ig-slide-end">✓ full story</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Nav buttons */}
        {slide > 0 && (
          <button className="cb-ig-nav cb-ig-nav--prev" onClick={goPrev} aria-label="Previous slide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
        {slide < totalSlides - 1 && (
          <button className="cb-ig-nav cb-ig-nav--next" onClick={goNext} aria-label="Next slide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Headline */}
      <div className="cb-ig-headline-row">
        <p className="cb-ig-headline">{article.headline}</p>
      </div>

      {/* Actions */}
      <div className="cb-ig-actions">
        <div className="cb-ig-actions-left">
          <button
            className={`cb-ig-btn cb-ig-like-btn ${isLiked ? 'cb-ig-like-btn--on' : ''}`}
            onClick={onLike}
            aria-pressed={isLiked}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <span className="cb-ig-heart">{isLiked ? '❤️' : '🤍'}</span>
          </button>
          <button className="cb-ig-btn" aria-label="Comment">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button className="cb-ig-btn" aria-label="Share">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <button className="cb-ig-btn" aria-label="Save">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polygon points="19 21 12 16 5 21 5 3 19 3 19 21"/>
          </svg>
        </button>
      </div>

      {/* Meta */}
      <div className="cb-ig-meta">
        <span className="cb-ig-like-count">{likeCount.toLocaleString()} likes</span>
        <span className="cb-ig-comment-count">View all {commentCount} comments</span>
      </div>
    </article>
  );
}

// ── IpadFrame ─────────────────────────────────────────────────────────────────

function IpadFrame({
  day, children, time, feedCounts, totalPosts,
}: {
  day: number;
  children: React.ReactNode;
  time: string;
  feedCounts: Record<Topic, number>;
  totalPosts: number;
}) {
  return (
    <div className="cb-ipad-wrapper">
      <div className="cb-ipad">
        <div className="cb-ipad-top-bezel"><div className="cb-ipad-camera" /></div>
        <div className="cb-ipad-screen">
          {/* Status bar */}
          <div className="cb-status-bar">
            <span className="cb-status-time">{time}</span>
            <div className="cb-status-right">
              <span className="cb-status-signal"><span /><span /><span /><span /></span>
              <svg className="cb-status-wifi" viewBox="0 0 20 14" fill="currentColor">
                <path d="M10 11.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-3.6-3a5.1 5.1 0 017.2 0l1.5-1.5a7.2 7.2 0 00-10.2 0l1.5 1.5zm-3.5-3.5a9.7 9.7 0 0114.2 0l1.5-1.5C16.1 1 13.2 0 10 0S3.9 1 1.4 3.5l1.5 1.5z"/>
              </svg>
              <span className="cb-status-battery">
                <span className="cb-battery-body"><span className="cb-battery-fill" /></span>
                <span className="cb-battery-tip" />
              </span>
            </div>
          </div>

          {/* Gram nav */}
          <div className="cb-gram-nav">
            <span className="cb-gram-logo">Gram</span>
            <div className="cb-gram-nav-icons">
              <button className="cb-gram-icon-btn" aria-label="Messages">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Stories */}
          <div className="cb-stories-bar">
            {TOPICS.map(t => {
              const count = feedCounts[t];
              const active = totalPosts > 0 && count > 0;
              const m = TOPIC_META[t];
              return (
                <div key={t} className="cb-story">
                  <div
                    className={`cb-story-ring ${active ? 'cb-story-ring--active' : 'cb-story-ring--grey'}`}
                    style={active ? { borderColor: m.color } : {}}
                  >
                    <div className="cb-story-avatar" style={active ? { background: `${m.color}22` } : {}}>
                      <span>{m.emoji}</span>
                    </div>
                  </div>
                  <span className={`cb-story-name ${active ? '' : 'cb-story-name--grey'}`}>{m.label}</span>
                  {!active && <span className="cb-story-filtered">filtered</span>}
                </div>
              );
            })}
            <div className="cb-day-badge">
              <span className="cb-day-pip" />
              Day {day}
            </div>
          </div>

          {/* Scrollable feed */}
          <div className="cb-ipad-feed">{children}</div>

          {/* Bottom tabs */}
          <div className="cb-gram-tabbar">
            <button className="cb-gram-tab cb-gram-tab--active" aria-label="Home">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            </button>
            <button className="cb-gram-tab" aria-label="Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>
              </svg>
            </button>
            <button className="cb-gram-tab cb-gram-tab--add" aria-label="New post">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
            </button>
            <button className="cb-gram-tab" aria-label="Activity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <button className="cb-gram-tab" aria-label="Profile">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="cb-ipad-home-bar" />
      </div>
    </div>
  );
}

// ── AiTransition ──────────────────────────────────────────────────────────────

function AiTransition({
  dominantTopic, upcomingRound, step, topicScores,
}: {
  dominantTopic: Topic;
  upcomingRound: number;
  step: number;
  topicScores: Record<Topic, number>;
}) {
  const msg = getAiMessage(dominantTopic, upcomingRound);
  const totalSignals = Object.values(topicScores).reduce((a, b) => a + b, 0);
  return (
    <div className="cb-transition">
      <div className="cb-transition-card">
        <div className="cb-t-header">
          <div className="cb-t-dots">
            <span style={{ animationDelay: '0s' }} />
            <span style={{ animationDelay: '0.2s' }} />
            <span style={{ animationDelay: '0.4s' }} />
          </div>
          <span className="cb-t-label">Gram · AI Recommendation Engine</span>
        </div>
        <h2 className="cb-t-title">{msg.title}</h2>
        {totalSignals > 0 && (
          <div className="cb-t-profile">
            <p className="cb-t-profile-label">Your engagement profile (likes + reads + dwell):</p>
            <div className="cb-t-profile-bars">
              {TOPICS.map(t => {
                const pct = totalSignals > 0 ? topicScores[t] / totalSignals * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div key={t} className="cb-t-pbar">
                    <span className="cb-t-pbar-label">{TOPIC_META[t].emoji}</span>
                    <div className="cb-t-pbar-track">
                      <div className="cb-t-pbar-fill" style={{ width: `${pct}%`, background: TOPIC_META[t].color }} />
                    </div>
                    <span className="cb-t-pbar-pct">{Math.round(pct)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="cb-t-log">
          {msg.steps.slice(0, step).map((s, i) => (
            <div key={i} className="cb-t-step">
              <span className="cb-t-check">✓</span>
              <span>{s}</span>
            </div>
          ))}
          {step < msg.steps.length && (
            <div className="cb-t-step cb-t-step--pending">
              <span className="cb-t-cursor">▋</span>
              <span>{msg.steps[step]}</span>
            </div>
          )}
        </div>
        {step >= msg.steps.length && (
          <p className="cb-t-done">Loading Day {ROUND_CONFIG[upcomingRound - 1]?.day} feed…</p>
        )}
      </div>
    </div>
  );
}

// ── StackedBar ────────────────────────────────────────────────────────────────

function StackedBar({ record, index }: { record: RoundRecord; index: number }) {
  const intensity = echoIntensity(record.feedDistribution);
  return (
    <div className="cb-rv-col" style={{ '--bar-delay': `${index * 0.12}s` } as React.CSSProperties}>
      <div className="cb-rv-intensity">{intensity}%</div>
      <div className="cb-rv-bar">
        {TOPICS.map(t => {
          const count = record.feedDistribution[t];
          if (count === 0) return null;
          return (
            <div key={t} className="cb-rv-seg" style={{ flex: count, background: TOPIC_META[t].color }}
              title={`${TOPIC_META[t].label}: ${count}`} />
          );
        })}
      </div>
      <div className="cb-rv-day">{record.day === 1 ? 'Day 1' : `Day ${record.day}`}</div>
    </div>
  );
}

// ── RevealScreen ──────────────────────────────────────────────────────────────

function RevealScreen({
  history, topicScores, onLearn, onRestart,
}: {
  history: RoundRecord[];
  topicScores: Record<Topic, number>;
  onLearn: () => void;
  onRestart: () => void;
}) {
  const dominant = dominantOf(topicScores);
  const domMeta = TOPIC_META[dominant];
  const totalSignals = Object.values(topicScores).reduce((a, b) => a + b, 0);
  const domSignals = topicScores[dominant];
  const finalIntensity = history.length > 0 ? echoIntensity(history[history.length - 1].feedDistribution) : 0;
  const totalReads = history.reduce((sum, r) => sum + r.reads, 0);
  const missedTopics = TOPICS.filter(t => t !== dominant);
  const missedSamples = shuffle(ARTICLES.filter(a => missedTopics.includes(a.topic))).slice(0, 3);

  return (
    <div className="cb-reveal">
      <Link to="/" className="back-link">← All games</Link>
      <div className="cb-rv-header">
        <p className="eyebrow">14-Day Simulation Complete</p>
        <h1 className="cb-rv-title">Your echo chamber formed.</h1>
        <p className="cb-rv-sub">
          In 14 days, your feed went from 6 balanced topics to{' '}
          <strong style={{ color: domMeta.color }}>
            {domMeta.emoji} {domMeta.label} dominating {finalIntensity}% of every post
          </strong>{' '}
          — driven by your likes, reading habits, and time spent.
        </p>
      </div>

      <div className="cb-rv-stats">
        <div className="cb-rv-stat">
          <span className="cb-rv-stat-num" style={{ color: domMeta.color }}>
            {domMeta.emoji} {domSignals}
          </span>
          <span className="cb-rv-stat-label">{domMeta.label} engagement signals</span>
        </div>
        <div className="cb-rv-stat">
          <span className="cb-rv-stat-num">{totalSignals}</span>
          <span className="cb-rv-stat-label">total engagement signals</span>
        </div>
        <div className="cb-rv-stat">
          <span className="cb-rv-stat-num">📖 {totalReads}</span>
          <span className="cb-rv-stat-label">posts read in full</span>
        </div>
        <div className="cb-rv-stat">
          <span className="cb-rv-stat-num" style={{ color: '#e05252' }}>{finalIntensity}%</span>
          <span className="cb-rv-stat-label">echo chamber intensity</span>
        </div>
      </div>

      <div className="cb-rv-section">
        <h2 className="cb-rv-section-title">Watch one topic swallow your feed</h2>
        <p className="cb-rv-section-sub">Each bar is one session. See how fast diversity disappears.</p>
        <div className="cb-rv-chart">
          {history.map((r, i) => <StackedBar key={i} record={r} index={i} />)}
        </div>
        <div className="cb-rv-legend">
          {TOPICS.map(t => (
            <span key={t} className="cb-rv-legend-item">
              <span className="cb-rv-legend-dot" style={{ background: TOPIC_META[t].color }} />
              {TOPIC_META[t].emoji} {TOPIC_META[t].label}
            </span>
          ))}
        </div>
      </div>

      <div className="cb-rv-section">
        <h2 className="cb-rv-section-title">Posts you stopped seeing by Day 14</h2>
        <p className="cb-rv-section-sub">
          These were buried — not because they weren't interesting, but because you didn't engage with their category early on.
        </p>
        <div className="cb-rv-missed">
          {missedSamples.map(a => (
            <div key={a.id} className="cb-rv-missed-card">
              <div className="cb-rv-missed-overlay" />
              <span className="cb-rv-missed-topic" style={{ color: TOPIC_META[a.topic].color }}>
                {TOPIC_META[a.topic].emoji} {TOPIC_META[a.topic].label}
              </span>
              <p className="cb-rv-missed-headline">{a.headline}</p>
              <span className="cb-rv-missed-source">{a.source}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cb-rv-cta">
        <button className="btn btn-primary" onClick={onLearn}>Understand what happened →</button>
        <button className="btn btn-ghost" onClick={onRestart}>Try again with different choices</button>
      </div>
    </div>
  );
}

// ── LearnScreen ───────────────────────────────────────────────────────────────

function LearnScreen({ dominantTopic, onRestart }: { dominantTopic: Topic; onRestart: () => void }) {
  const domMeta = TOPIC_META[dominantTopic];
  return (
    <div className="cb-learn">
      <Link to="/" className="back-link">← All games</Link>
      <div className="game-header">
        <p className="eyebrow">Confirmation Bias · Debrief</p>
        <h1>What just happened to your feed</h1>
        <p className="lede">
          You just lived through confirmation bias — amplified and automated by an AI recommendation engine.
        </p>
      </div>
      <div className="cb-learn-grid">
        <div className="cb-learn-card cb-learn-card--accent">
          <h2>What is confirmation bias?</h2>
          <p>
            Confirmation bias is the tendency to seek, favour, and remember information that confirms
            what we already believe or enjoy. It's a deeply human cognitive shortcut — but AI systems
            can amplify it to an extreme.
          </p>
          <p>
            Your early reads and likes on{' '}
            <strong style={{ color: domMeta.color }}>{domMeta.emoji} {domMeta.label}</strong>{' '}
            felt natural. The algorithm treated them as a mandate to show you more of the same —
            until it was all you saw.
          </p>
        </div>
        <div className="cb-learn-card">
          <h2>Every signal counts</h2>
          <p>
            In this simulation, the algorithm tracked three signals: likes (+3), reading all slides
            of a post (+2), and dwelling on a post for 7+ seconds (+1). Real platforms track hundreds
            more — including how far you scrolled, how long you paused, and whether you screenshot.
          </p>
          <p>
            The result is a profile so detailed that platforms can predict what you'll engage with
            before you've consciously decided yourself.
          </p>
        </div>
        <div className="cb-learn-card">
          <h2>This happens on every platform</h2>
          <ul>
            <li>YouTube's autoplay pushes viewers toward increasingly extreme content</li>
            <li>Instagram and TikTok personalise so aggressively that two friends see completely different feeds</li>
            <li>Search results differ based on your history — even for the same query</li>
            <li>News aggregators bury sources outside your engagement pattern</li>
          </ul>
        </div>
        <div className="cb-learn-card">
          <h2>Why it matters</h2>
          <p>
            A narrowing information diet affects how we understand the world. If your feed never
            surfaces anything outside your comfort zone, it becomes harder to understand why others
            disagree — or to notice what you're missing.
          </p>
          <p>
            At scale, this fuels political polarisation, misinformation spread, and a fractured
            sense of shared reality.
          </p>
        </div>
        <div className="cb-learn-card cb-learn-card--tip">
          <h2>What you can do</h2>
          <ul>
            <li><strong>Diversify your follows</strong> — follow creators outside your usual topics</li>
            <li><strong>Use incognito mode</strong> to see what the algorithm shows before it knows you</li>
            <li><strong>Read before you like</strong> — the like is a stronger signal than a scroll</li>
            <li><strong>Audit your absence</strong> — the topics missing from your feed are just as revealing</li>
          </ul>
        </div>
        <div className="cb-learn-card">
          <h2>The key insight</h2>
          <p>
            AI systems don't just reflect your preferences — they <em>amplify</em> them.
            A natural lean toward {domMeta.label.toLowerCase()} content became a near-total
            filter bubble in 14 simulated days.
          </p>
          <p>
            The algorithm wasn't broken. It did exactly what it was built to do: maximise engagement.
            The bias isn't a bug. <strong>It's the feature.</strong>
          </p>
        </div>
      </div>
      <div className="cb-learn-cta">
        <button className="btn btn-primary" onClick={onRestart}>Play again with different choices</button>
        <Link to="/" className="btn btn-ghost">Explore other biases</Link>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ConfirmationBias() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [roundIndex, setRoundIndex] = useState(0);
  const [topicScores, setTopicScores] = useState<Record<Topic, number>>(zeroScores);
  const [currentFeed, setCurrentFeed] = useState<Article[]>([]);
  const [likedThisRound, setLikedThisRound] = useState<Set<string>>(new Set());
  const [readThisRound, setReadThisRound] = useState<Set<string>>(new Set());
  const [dwelledThisRound, setDwelledThisRound] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [aiStep, setAiStep] = useState(0);
  const [time, setTime] = useState(getTime);

  useEffect(() => {
    if (phase === 'learn') markGameCompleted('confirmation-bias');
  }, [phase]);

  useEffect(() => {
    const t = setInterval(() => setTime(getTime()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (phase === 'playing') window.scrollTo({ top: 0, behavior: 'instant' });
  }, [phase]);

  const config = ROUND_CONFIG[roundIndex];
  const dominant = dominantOf(topicScores);
  const canProceed = likedThisRound.size >= 1;

  const feedCounts = Object.fromEntries(
    TOPICS.map(t => [t, currentFeed.filter(a => a.topic === t).length])
  ) as Record<Topic, number>;

  const maxCount = Math.max(...Object.values(feedCounts), 1);
  const diversity = currentFeed.length > 0
    ? Math.round((1 - maxCount / currentFeed.length) * 100)
    : 100;
  const diversityColor = diversity > 60 ? '#22c55e' : diversity > 30 ? '#f97316' : '#ef4444';

  const startGame = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setCurrentFeed(generateFeed(0, zeroScores()));
    setPhase('playing');
  }, []);

  const handleLike = useCallback((article: Article) => {
    setLikedThisRound(prev => {
      const next = new Set(prev);
      if (next.has(article.id)) {
        next.delete(article.id);
        setTopicScores(s => ({ ...s, [article.topic]: Math.max(0, s[article.topic] - 3) }));
      } else {
        next.add(article.id);
        setTopicScores(s => ({ ...s, [article.topic]: s[article.topic] + 3 }));
      }
      return next;
    });
  }, []);

  const handleRead = useCallback((article: Article) => {
    setReadThisRound(prev => {
      if (prev.has(article.id)) return prev;
      const next = new Set(prev);
      next.add(article.id);
      setTopicScores(s => ({ ...s, [article.topic]: s[article.topic] + 2 }));
      return next;
    });
  }, []);

  const handleDwell = useCallback((article: Article) => {
    setDwelledThisRound(prev => {
      if (prev.has(article.id)) return prev;
      const next = new Set(prev);
      next.add(article.id);
      setTopicScores(s => ({ ...s, [article.topic]: s[article.topic] + 1 }));
      return next;
    });
  }, []);

  const handleNextRound = useCallback(() => {
    const dist = computeDistribution(currentFeed);
    setHistory(prev => [...prev, { day: config.day, feedDistribution: dist, reads: readThisRound.size }]);
    setLikedThisRound(new Set());
    setReadThisRound(new Set());
    setDwelledThisRound(new Set());
    if (roundIndex >= 3) {
      setPhase('reveal');
    } else {
      setAiStep(0);
      setPhase('transitioning');
    }
  }, [currentFeed, config, roundIndex, readThisRound]);

  useEffect(() => {
    if (phase !== 'transitioning') return;
    const upcomingRound = roundIndex + 2;
    const msg = getAiMessage(dominant, upcomingRound);
    if (aiStep < msg.steps.length) {
      const t = setTimeout(() => setAiStep(s => s + 1), 850);
      return () => clearTimeout(t);
    }
    const nextIdx = roundIndex + 1;
    const t = setTimeout(() => {
      setCurrentFeed(generateFeed(nextIdx, topicScores));
      setRoundIndex(nextIdx);
      setPhase('playing');
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, aiStep, roundIndex, topicScores, dominant]);

  const handleRestart = useCallback(() => {
    setPhase('intro');
    setRoundIndex(0);
    setTopicScores(zeroScores());
    setCurrentFeed([]);
    setLikedThisRound(new Set());
    setReadThisRound(new Set());
    setDwelledThisRound(new Set());
    setHistory([]);
    setAiStep(0);
  }, []);

  if (phase === 'intro') return <IntroScreen onStart={startGame} />;

  if (phase === 'transitioning') {
    return (
      <AiTransition
        dominantTopic={dominant}
        upcomingRound={roundIndex + 2}
        step={aiStep}
        topicScores={topicScores}
      />
    );
  }

  if (phase === 'reveal') {
    return (
      <RevealScreen
        history={history}
        topicScores={topicScores}
        onLearn={() => setPhase('learn')}
        onRestart={handleRestart}
      />
    );
  }

  if (phase === 'learn') {
    return <LearnScreen dominantTopic={dominant} onRestart={handleRestart} />;
  }

  // ── Playing phase ──

  const totalEngaged = likedThisRound.size + readThisRound.size + dwelledThisRound.size;

  return (
    <div className="cb-game">
      {/* Top controls */}
      <div className="cb-game-header">
        <div className="cb-gh-round">
          <span className="cb-gh-label">Session {roundIndex + 1} of 4</span>
          <div className="cb-round-dots">
            {ROUND_CONFIG.map((r, i) => (
              <div
                key={r.roundNum}
                className={`cb-round-dot ${i < roundIndex ? 'done' : ''} ${i === roundIndex ? 'active' : ''}`}
                title={r.label}
              />
            ))}
          </div>
          <span className="cb-gh-day">{config.label}</span>
        </div>
        <div className="cb-gh-diversity">
          <div className="cb-diversity-bar">
            {TOPICS.map(t => {
              const count = feedCounts[t];
              return count > 0 ? (
                <div key={t} className="cb-diversity-seg"
                  style={{ flex: count, background: TOPIC_META[t].color }}
                  title={`${TOPIC_META[t].label}: ${count}`} />
              ) : null;
            })}
          </div>
          <span className="cb-diversity-score" style={{ color: diversityColor }}>
            {diversity}% diverse
          </span>
        </div>
      </div>

      {/* iPad */}
      <IpadFrame day={config.day} time={time} feedCounts={feedCounts} totalPosts={currentFeed.length}>
        {currentFeed.map((article, i) => (
          <InstagramPost
            key={`${article.id}-${roundIndex}`}
            article={article}
            isLiked={likedThisRound.has(article.id)}
            delay={i * 60}
            onLike={() => handleLike(article)}
            onRead={() => handleRead(article)}
            onDwell={() => handleDwell(article)}
          />
        ))}
      </IpadFrame>

      {/* Footer */}
      <div className="cb-game-footer">
        <p className="cb-footer-hint">
          {totalEngaged === 0
            ? '❤️ Like or swipe through posts — the algorithm watches everything'
            : `❤️ ${likedThisRound.size} liked · 📖 ${readThisRound.size} read · 👁 ${dwelledThisRound.size} viewed — the algorithm sees it all`}
        </p>
        <button
          className="btn btn-primary cb-next-btn"
          onClick={handleNextRound}
          disabled={!canProceed}
        >
          {roundIndex >= 3 ? 'See my echo chamber →' : 'Let the AI update my feed →'}
        </button>
      </div>
    </div>
  );
}
