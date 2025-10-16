// apps/web/app/admin/test-builder/templates.ts
export const TEMPLATE = [
  {
    stem: 'How do you prefer to tackle new tasks?',
    options: [
      { label: 'I dive right in', frequency: 'A', profile: 'Visionary', points: 1 },
      { label: 'I make a detailed plan', frequency: 'D', profile: 'Architect', points: 1 },
      { label: 'I brainstorm with others', frequency: 'B', profile: 'Spark', points: 1 },
      { label: 'I follow a structured process', frequency: 'C', profile: 'Anchor', points: 1 },
    ],
  },
  {
    stem: 'When solving problems, you tend to…',
    options: [
      { label: 'Experiment quickly', frequency: 'A', profile: 'Visionary', points: 1 },
      { label: 'Seek input and alignment', frequency: 'B', profile: 'Spark', points: 1 },
      { label: 'Rely on proven methods', frequency: 'C', profile: 'Anchor', points: 1 },
      { label: 'Model the system first', frequency: 'D', profile: 'Architect', points: 1 },
    ],
  },
  {
    stem: 'Your ideal workday feels…',
    options: [
      { label: 'Fast-paced and creative', frequency: 'A', profile: 'Visionary', points: 1 },
      { label: 'Collaborative and energetic', frequency: 'B', profile: 'Spark', points: 1 },
      { label: 'Calm and predictable', frequency: 'C', profile: 'Anchor', points: 1 },
      { label: 'Analytical and precise', frequency: 'D', profile: 'Architect', points: 1 },
    ],
  },
];
