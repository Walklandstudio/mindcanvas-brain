// lib/testConfigs.ts
export type Weights = {
  flows?: Record<string, number>;
  profiles?: Record<string, number>;
};

export type Option = { key: string; label: string; weight?: Weights };
export type Question = { id: string; prompt: string; options: Option[] };
export type TestConfig = {
  slug: string;
  title: string;
  intro?: string;
  questions: Question[];
};

// Profile code map (edit to your canonical codes)
const P = {
  ChangeAgent: "CA",
  Thinker: "TH",
  Negotiator: "NG",
  Mastermind: "MM",
  Storyteller: "ST",
  GroundedGuide: "GG",
  HeartCentredCoach: "HC",
  Investigator: "INV",
  Innovator: "INN",
} as const;

const w = (profiles: Record<string, number>): Weights => ({ profiles });

// Only weighted answers contribute to scoring.
// Qualification questions have options without weight.
const competencyCoach: TestConfig = {
  slug: "competency-coach",
  title: "Competency Coach — DNA Blueprint",
  intro: "Answer the questions below. We’ll compute your primary profile and frequency.",
  questions: [
    // 1
    {
      id: "q1",
      prompt: "How do you naturally approach new coaching challenges?",
      options: [
        { key: "A", label: "I jump in and take action immediately.", weight: w({ [P.ChangeAgent]: 40 }) },
        { key: "B", label: "I create a structured plan before proceeding.", weight: w({ [P.Thinker]: 10 }) },
        { key: "C", label: "I discuss ideas with others first to gain insight.", weight: w({ [P.Negotiator]: 30 }) },
        { key: "D", label: "I follow an established framework to ensure consistency.", weight: w({ [P.Mastermind]: 20 }) },
      ],
    },
    // 2
    {
      id: "q2",
      prompt: "Which statement best describes your role in a coaching setting?",
      options: [
        { key: "A", label: "I take charge and guide the direction of the session.", weight: w({ [P.Storyteller]: 40 }) },
        { key: "B", label: "I keep coaching sessions organised and on track.", weight: w({ [P.GroundedGuide]: 20 }) },
        { key: "C", label: "I create a supportive and engaging environment for clients.", weight: w({ [P.HeartCentredCoach]: 30 }) },
        { key: "D", label: "I ensure every detail is considered before moving forward.", weight: w({ [P.Investigator]: 10 }) },
      ],
    },
    // 3
    {
      id: "q3",
      prompt: "How do you typically solve coaching challenges?",
      options: [
        { key: "A", label: "I experiment with new approaches and adjust as needed.", weight: w({ [P.Innovator]: 40 }) },
        { key: "B", label: "I break it into clear, structured steps for clarity.", weight: w({ [P.GroundedGuide]: 10 }) },
        { key: "C", label: "I research thoroughly before making a decision.", weight: w({ [P.Thinker]: 20 }) },
        { key: "D", label: "I collaborate with others to find the best solution.", weight: w({ [P.Negotiator]: 30 }) },
      ],
    },
    // 4
    {
      id: "q4",
      prompt: "How do you prefer to communicate as a coach?",
      options: [
        { key: "A", label: "I organise my thoughts carefully before speaking.", weight: w({ [P.GroundedGuide]: 20 }) },
        { key: "B", label: "I focus on data and logical reasoning.", weight: w({ [P.Investigator]: 10 }) },
        { key: "C", label: "I am direct and cut straight to the point.", weight: w({ [P.Storyteller]: 40 }) },
        { key: "D", label: "I prioritise emotional connection and support.", weight: w({ [P.HeartCentredCoach]: 30 }) },
      ],
    },
    // 5
    {
      id: "q5",
      prompt: "What drives your passion for coaching?",
      options: [
        { key: "A", label: "I thrive on fast-paced challenges and breakthroughs.", weight: w({ [P.ChangeAgent]: 40 }) },
        { key: "B", label: "I love empowering others to achieve success.", weight: w({ [P.Negotiator]: 30 }) },
        { key: "C", label: "I ensure systems and processes run smoothly.", weight: w({ [P.GroundedGuide]: 20 }) },
        { key: "D", label: "I am driven by delivering high-quality, detailed results.", weight: w({ [P.Investigator]: 10 }) },
      ],
    },
    // 6
    {
      id: "q6",
      prompt: "How do you respond under pressure in a coaching session?",
      options: [
        { key: "A", label: "I pause, plan, and reassess before moving forward.", weight: w({ [P.Investigator]: 10 }) },
        { key: "B", label: "I maintain structure and organisation to stay on track.", weight: w({ [P.Mastermind]: 20 }) },
        { key: "C", label: "I seek support or external input to gain new perspectives.", weight: w({ [P.HeartCentredCoach]: 30 }) },
        { key: "D", label: "I push through challenges and keep moving.", weight: w({ [P.ChangeAgent]: 40 }) },
      ],
    },
    // 7
    {
      id: "q7",
      prompt: "How do you typically receive feedback on your coaching?",
      options: [
        { key: "A", label: "I prefer structured, fact-based feedback.", weight: w({ [P.Investigator]: 10 }) },
        { key: "B", label: "I appreciate quick, direct feedback to keep improving.", weight: w({ [P.Storyteller]: 40 }) },
        { key: "C", label: "I prioritise feedback that nurtures relationships and connection.", weight: w({ [P.HeartCentredCoach]: 30 }) },
        { key: "D", label: "I value detailed, in-depth feedback for refinement.", weight: w({ [P.Thinker]: 20 }) },
      ],
    },
    // 8
    {
      id: "q8",
      prompt: "How do you handle setbacks or mistakes in coaching?",
      options: [
        { key: "A", label: "I reflect and develop a plan to improve.", weight: w({ [P.Thinker]: 10 }) },
        { key: "B", label: "I analyse and fix the mistake before moving on.", weight: w({ [P.Innovator]: 10 }) },
        { key: "C", label: "I discuss it with a colleague for different insights.", weight: w({ [P.Negotiator]: 30 }) },
        { key: "D", label: "I adapt quickly and move forward with new adjustments.", weight: w({ [P.ChangeAgent]: 40 }) },
      ],
    },
    // 9
    {
      id: "q9",
      prompt: "How do you feel after a successful coaching session?",
      options: [
        { key: "A", label: "Relieved that everything went according to plan.", weight: w({ [P.GroundedGuide]: 20 }) },
        { key: "B", label: "Proud of the precision and accuracy of my approach.", weight: w({ [P.Investigator]: 10 }) },
        { key: "C", label: "Grateful for the collaboration and insights shared.", weight: w({ [P.HeartCentredCoach]: 30 }) },
        { key: "D", label: "Excited and ready to take on the next coaching challenge.", weight: w({ [P.ChangeAgent]: 40 }) },
      ],
    },
    // 10
    {
      id: "q10",
      prompt: "How do you best approach learning and development in coaching?",
      options: [
        { key: "A", label: "I enjoy learning in group settings with discussion.", weight: w({ [P.Negotiator]: 30 }) },
        { key: "B", label: "I prefer structured, high-energy learning environments.", weight: w({ [P.Storyteller]: 40 }) },
        { key: "C", label: "I like experimenting with concepts through hands-on experience.", weight: w({ [P.ChangeAgent]: 40 }) },
        { key: "D", label: "I take a deep, analytical dive to fully understand a concept.", weight: w({ [P.Investigator]: 10 }) },
      ],
    },
    // 11
    {
      id: "q11",
      prompt: "What type of coaching work energises you the most?",
      options: [
        { key: "A", label: "Working on innovative coaching techniques and models.", weight: w({ [P.Innovator]: 40 }) },
        { key: "B", label: "Designing and refining coaching systems and structures.", weight: w({ [P.Mastermind]: 20 }) },
        { key: "C", label: "Collaborating with clients to unlock their potential.", weight: w({ [P.HeartCentredCoach]: 30 }) },
        { key: "D", label: "Analysing data and trends to enhance coaching strategies.", weight: w({ [P.Investigator]: 10 }) },
      ],
    },
    // 12
    {
      id: "q12",
      prompt: "How do you approach personal growth as a coach?",
      options: [
        { key: "A", label: "I push myself with ambitious challenges.", weight: w({ [P.Storyteller]: 40 }) },
        { key: "B", label: "I refine and perfect my coaching methodologies.", weight: w({ [P.Thinker]: 20 }) },
        { key: "C", label: "I set structured goals and track my progress.", weight: w({ [P.Investigator]: 10 }) },
        { key: "D", label: "I grow best through shared learning experiences.", weight: w({ [P.Negotiator]: 30 }) },
      ],
    },
    // 13
    {
      id: "q13",
      prompt: "How do you resolve conflicts or coaching disagreements?",
      options: [
        { key: "A", label: "I confidently assert my position with conviction.", weight: w({ [P.Storyteller]: 40 }) },
        { key: "B", label: "I focus on finding a balanced, win-win solution.", weight: w({ [P.Negotiator]: 30 }) },
        { key: "C", label: "I seek logical, well-structured solutions.", weight: w({ [P.Thinker]: 20 }) },
        { key: "D", label: "I prefer to stay objective and neutral in the discussion.", weight: w({ [P.Investigator]: 10 }) },
      ],
    },
    // 14
    {
      id: "q14",
      prompt: "What role do you naturally take in a coaching team?",
      options: [
        { key: "A", label: "I take the lead and drive decisions.", weight: w({ [P.ChangeAgent]: 40 }) },
        { key: "B", label: "I focus on facilitating team collaboration and connection.", weight: w({ [P.HeartCentredCoach]: 30 }) },
        { key: "C", label: "I ensure organisation, structure, and accountability.", weight: w({ [P.Mastermind]: 10 }) },
        { key: "D", label: "I provide analytical support to enhance decision-making.", weight: w({ [P.Thinker]: 20 }) },
      ],
    },
    // 15
    {
      id: "q15",
      prompt: "What coaching challenge frustrates you the most?",
      options: [
        { key: "A", label: "Lack of clear goals and direction.", weight: w({ [P.GroundedGuide]: 20 }) },
        { key: "B", label: "Slow decision-making and hesitation.", weight: w({ [P.ChangeAgent]: 40 }) },
        { key: "C", label: "Inattention to important details.", weight: w({ [P.Investigator]: 10 }) },
        { key: "D", label: "Tension and unresolved conflicts within a team.", weight: w({ [P.Negotiator]: 30 }) },
      ],
    },

    // Qualification (no weights)
    { id: "q16", prompt: "How long have you been coaching professionally?", options: [
      { key: "A", label: "Less than 1 year" }, { key: "B", label: "1 to 3 years" },
      { key: "C", label: "3 to 5 years" }, { key: "D", label: "5 to 10 years" }, { key: "E", label: "More than 10 years" },
    ]},
    { id: "q17", prompt: "How many clients have you coached in total in the past 12 months?", options: [
      { key: "A", label: "Less than 10" }, { key: "B", label: "11 to 50" }, { key: "C", label: "51 to 100" },
      { key: "D", label: "101 to 500" }, { key: "E", label: "More than 501" },
    ]},
    { id: "q18", prompt: "What was your highest revenue year as a coach?", options: [
      { key: "A", label: "Less than $50,000" }, { key: "B", label: "$50,001 – $100,000" },
      { key: "C", label: "$100,001 – $250,000" }, { key: "D", label: "$250,001 – $500,000" }, { key: "E", label: "More than $500,001" },
    ]},
    { id: "q19", prompt: "What was your coaching revenue in the past 12 months?", options: [
      { key: "A", label: "Less than $50,000" }, { key: "B", label: "$50,001 – $100,000" },
      { key: "C", label: "$100,001 – $250,000" }, { key: "D", label: "$250,001 – $500,000" }, { key: "E", label: "More than $500,001" },
    ]},
    { id: "q20", prompt: "What is your revenue goal for the next 12 months?", options: [
      { key: "A", label: "$50,000 – $100,000" }, { key: "B", label: "$100,000 – $250,000" },
      { key: "C", label: "$250,000 – $500,000" }, { key: "D", label: "More than $500,000" },
    ]},
  ],
};

const tests: Record<string, TestConfig> = {
  [competencyCoach.slug]: competencyCoach,
};

export function getTestConfig(slug: string): TestConfig | null {
  return tests[slug] ?? null;
}
