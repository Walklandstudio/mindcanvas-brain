// lib/testConfigs.ts
export type Weights = {
  flows?: Record<string, number>;     // e.g. { B: 2, D: 1 }
  profiles?: Record<string, number>;  // e.g. { P8: 2, P3: 1 }
};

export type Option = { key: string; label: string; weight: Weights };
export type Question = { id: string; prompt: string; options: Option[] };
export type TestConfig = {
  slug: string;
  title: string;
  intro?: string;
  questions: Question[];
};

/**
 * Minimal live test config for the "competency-coach" slug.
 * Edit text/weights to fit your framework.
 */
const competencyCoach: TestConfig = {
  slug: "competency-coach",
  title: "Competency Coach — Quick Profile",
  intro:
    "Answer a few questions. We’ll compute your profile and dominant frequency.",
  questions: [
    {
      id: "q1",
      prompt: "In weekly planning, what do you prioritize most?",
      options: [
        { key: "A", label: "Clear tasks and deadlines", weight: { flows: { B: 2 }, profiles: { P8: 2 } } },
        { key: "B", label: "Exploring new ideas",          weight: { flows: { D: 2 }, profiles: { P3: 2 } } },
        { key: "C", label: "Balancing team dynamics",      weight: { flows: { B: 1, D: 1 }, profiles: { P4: 2 } } },
      ],
    },
    {
      id: "q2",
      prompt: "When a blocker appears, you typically…",
      options: [
        { key: "A", label: "Assign an owner and due date", weight: { flows: { B: 2 }, profiles: { P8: 2 } } },
        { key: "B", label: "Brainstorm alternatives",      weight: { flows: { D: 2 }, profiles: { P3: 2 } } },
        { key: "C", label: "Facilitate alignment",         weight: { flows: { B: 1, D: 1 }, profiles: { P4: 2 } } },
      ],
    },
    {
      id: "q3",
      prompt: "Your ideal standup focuses on…",
      options: [
        { key: "A", label: "Outcomes and blockers",        weight: { flows: { B: 2 }, profiles: { P8: 2 } } },
        { key: "B", label: "Learning and experiments",     weight: { flows: { D: 2 }, profiles: { P3: 2 } } },
        { key: "C", label: "Collaboration and handoffs",   weight: { flows: { B: 1, D: 1 }, profiles: { P4: 2 } } },
      ],
    },
    {
      id: "q4",
      prompt: "Your default leadership style is…",
      options: [
        { key: "A", label: "Decisive and structured",       weight: { flows: { B: 2 }, profiles: { P8: 2 } } },
        { key: "B", label: "Curious and adaptive",          weight: { flows: { D: 2 }, profiles: { P3: 2 } } },
        { key: "C", label: "People-oriented and supportive",weight: { flows: { B: 1, D: 1 }, profiles: { P4: 2 } } },
      ],
    },
    {
      id: "q5",
      prompt: "Faced with an ambiguous goal, you…",
      options: [
        { key: "A", label: "Define milestones first",       weight: { flows: { B: 2 }, profiles: { P8: 2 } } },
        { key: "B", label: "Prototype to learn",            weight: { flows: { D: 2 }, profiles: { P3: 2 } } },
        { key: "C", label: "Align stakeholders",            weight: { flows: { B: 1, D: 1 }, profiles: { P4: 2 } } },
      ],
    },
  ],
};

const tests: Record<string, TestConfig> = {
  [competencyCoach.slug]: competencyCoach,
};

export function getTestConfig(slug: string): TestConfig | null {
  return tests[slug] ?? null;
}
