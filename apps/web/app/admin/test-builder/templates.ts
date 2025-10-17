// apps/web/app/admin/test-builder/templates.ts
type Opt = { label: string; frequency: string; profile: string; points: number };
type Q = { stem: string; kind?: 'base' | 'segment'; options: Opt[] };

/** 15 base questions — replace wording as needed */
export const TEMPLATE: Q[] = [
  { stem: 'How do you prefer to tackle new tasks?', options: [
    { label: 'I dive right in', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'I make a detailed plan', frequency: 'D', profile: 'Architect', points: 1 },
    { label: 'I brainstorm with others', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'I follow a structured process', frequency: 'C', profile: 'Anchor', points: 1 },
  ]},
  { stem: 'Which statement describes you best in a team setting?', options: [
    { label: 'I take charge and lead', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'I keep tasks on track', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'I build a positive environment', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'I focus on details', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'When faced with a problem, how do you best like to solve it?', options: [
    { label: 'Try ideas quickly', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Break into clear steps', frequency: 'D', profile: 'Architect', points: 1 },
    { label: 'Workshop with others', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Stick to proven methods', frequency: 'C', profile: 'Anchor', points: 1 },
  ]},
  { stem: 'What motivates you most at work?', options: [
    { label: 'Creating something new', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Helping people connect', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Keeping things reliable', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Improving precision & quality', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'Your ideal planning style is…', options: [
    { label: 'High-level vision, flexible path', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Collaborative and iterative', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Milestones and checklists', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Detailed spec before execution', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'When priorities shift, you…', options: [
    { label: 'Pivot fast and try new angles', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Align the team quickly', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Stabilize the plan & risks', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Re-evaluate system impact', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'How do you prefer to learn?', options: [
    { label: 'Experiment and iterate', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Discuss and co-create', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Read docs and SOPs', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Study models and principles', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'What do teammates rely on you for?', options: [
    { label: 'Inspiration and direction', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Energy and connection', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Consistency and dependability', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Clarity and accuracy', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'When deadlines loom, you…', options: [
    { label: 'Focus on the big win', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Rally the team', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Tighten the execution plan', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Reduce ambiguity', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'What kind of feedback helps you most?', options: [
    { label: 'Vision & opportunity framing', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'People impact & messaging', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Process & risk control', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Technical depth & logic', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'Your natural communication style is…', options: [
    { label: 'Big-picture & aspirational', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Relational & story-driven', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Structured & concise', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Analytical & precise', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'How do you measure success?', options: [
    { label: 'Breakthrough outcomes', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Team engagement', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Reliability & predictability', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Quality & correctness', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'When conflicts arise, you…', options: [
    { label: 'Reframe around vision', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Facilitate shared understanding', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Clarify roles/process', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Ground in facts/data', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'Pick the work you enjoy most:', options: [
    { label: '0→1 exploration', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Community & comms', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Program/ops excellence', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Systems & design', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
  { stem: 'Which description fits your “best day” flow?', options: [
    { label: 'Fast, inspiring, new ideas', frequency: 'A', profile: 'Visionary', points: 1 },
    { label: 'Collaborative, high-energy', frequency: 'B', profile: 'Spark', points: 1 },
    { label: 'Calm, planned, predictable', frequency: 'C', profile: 'Anchor', points: 1 },
    { label: 'Deep, focused, rigorous', frequency: 'D', profile: 'Architect', points: 1 },
  ]},
];

export const SEGMENT_STARTER: Q = {
  kind: 'segment',
  stem: 'Which industry best describes your company?',
  options: [
    { label: 'Tech', frequency: '-', profile: '-', points: 0 },
    { label: 'Finance', frequency: '-', profile: '-', points: 0 },
    { label: 'Retail', frequency: '-', profile: '-', points: 0 },
    { label: 'Healthcare', frequency: '-', profile: '-', points: 0 },
  ],
};
