// apps/web/app/admin/questions/seed.ts
export type OptionKey = 'A' | 'B' | 'C' | 'D';
export type QOption = { key: OptionKey; label: string };
export type QRow = { question_no: number; prompt: string; options: QOption[] };

export type WeightEntry = {
  key: OptionKey;
  points: number;
  profile: number;
  frequency: 'A' | 'B' | 'C' | 'D';
};
export type WeightedQuestion = { question_no: number; weights: WeightEntry[] };

export const BASE_QUESTIONS: QRow[] = [
  { question_no: 1,  prompt: 'How do you prefer to tackle new tasks?', options: [
    { key: 'A', label: 'I dive right in' },
    { key: 'B', label: 'I make a detailed plan' },
    { key: 'C', label: 'I like to brainstorm with others' },
    { key: 'D', label: 'I follow a structured process' },
  ]},
  { question_no: 2,  prompt: 'Which statement describes you best in a team setting?', options: [
    { key: 'A', label: 'I take charge and lead' },
    { key: 'B', label: 'Keep tasks on track' },
    { key: 'C', label: 'Build positive environment' },
    { key: 'D', label: 'Focus on details' },
  ]},
  { question_no: 3,  prompt: 'When faced with a problem, how do you best like to solve it?', options: [
    { key: 'A', label: 'I like to try new ideas and adjust' },
    { key: 'B', label: 'I break it into clear steps' },
    { key: 'C', label: 'I research before acting' },
    { key: 'D', label: 'I like to collaborate for solutions' },
  ]},
  { question_no: 4,  prompt: 'How do you prefer to communicate within a team?', options: [
    { key: 'A', label: 'I am thoughtful and organised' },
    { key: 'B', label: 'I like to focus on facts' },
    { key: 'C', label: 'I am direct and to the point' },
    { key: 'D', label: 'I am friendly and supportive' },
  ]},
  { question_no: 5,  prompt: 'What motivates you mostly in your work?', options: [
    { key: 'A', label: 'I like new challenges' },
    { key: 'B', label: 'I like to help others succeed' },
    { key: 'C', label: 'Making sure things are running smoothly' },
    { key: 'D', label: 'I like to produce high quality' },
  ]},
  { question_no: 6,  prompt: 'When things get stressful at work, how would you respond?', options: [
    { key: 'A', label: 'I like to pause and plan' },
    { key: 'B', label: 'I like to stay organised' },
    { key: 'C', label: 'I like to reach out for support' },
    { key: 'D', label: 'I just like to push through' },
  ]},
  { question_no: 7,  prompt: 'How do you generally handle feedback?', options: [
    { key: 'A', label: 'I value fact-based feedback' },
    { key: 'B', label: 'I appreciate quick feedback' },
    { key: 'C', label: 'I focus on relationships and connection' },
    { key: 'D', label: 'I prefer to receive detailed feedback' },
  ]},
  { question_no: 8,  prompt: 'How do you recover after making a mistake?', options: [
    { key: 'A', label: 'I like to reflect and plan' },
    { key: 'B', label: 'I fix the mistake' },
    { key: 'C', label: 'I like to discuss with a colleague' },
    { key: 'D', label: 'I like to move on and adjust' },
  ]},
  { question_no: 9,  prompt: 'How do you feel after completing a big project?', options: [
    { key: 'A', label: 'I am relieved it went to plan' },
    { key: 'B', label: 'I am proud of the accuracy' },
    { key: 'C', label: 'I am grateful for team support' },
    { key: 'D', label: 'I am excited to get on with the next challenge' },
  ]},
  { question_no: 10, prompt: 'How do you best approach learning new things?', options: [
    { key: 'A', label: 'I like to learn with others' },
    { key: 'B', label: 'I prefer structured learning' },
    { key: 'C', label: 'I like to experiment with concepts' },
    { key: 'D', label: 'I like a deep dive to fully understand' },
  ]},
  { question_no: 11, prompt: 'What type of work energises you?', options: [
    { key: 'A', label: 'Innovative projects' },
    { key: 'B', label: 'Organising and building processes' },
    { key: 'C', label: 'Collaborating with others' },
    { key: 'D', label: 'Analysing data' },
  ]},
  { question_no: 12, prompt: 'How do you prefer to approach personal growth?', options: [
    { key: 'A', label: 'I like to challenge myself' },
    { key: 'B', label: 'I like to refine my skills' },
    { key: 'C', label: 'I like to set specific goals' },
    { key: 'D', label: 'Through learning with others' },
  ]},
  { question_no: 13, prompt: 'How do you best handle disagreements?', options: [
    { key: 'A', label: 'I like to assert my position' },
    { key: 'B', label: 'I like to seek middle ground' },
    { key: 'C', label: 'I look for logical solutions' },
    { key: 'D', label: 'I feel better to stay objective' },
  ]},
  { question_no: 14, prompt: 'How do you prefer to work on a team?', options: [
    { key: 'A', label: 'I like to lead and make decisions' },
    { key: 'B', label: 'I prefer to foster team collaboration' },
    { key: 'C', label: 'I prefer to organise tasks' },
    { key: 'D', label: 'I provide analytical support' },
  ]},
  { question_no: 15, prompt: 'What frustrates you most in a team or social setting?', options: [
    { key: 'A', label: 'Lack of clear goals' },
    { key: 'B', label: 'Slow decision-making' },
    { key: 'C', label: 'Lack of attention to detail' },
    { key: 'D', label: 'Conflict between members' },
  ]},
];

export const WEIGHTS: WeightedQuestion[] = [
  { question_no: 1,  weights: [{ key: 'A', points: 40, profile: 1, frequency: 'A' }, { key: 'B', points: 10, profile: 7, frequency: 'D' }, { key: 'C', points: 30, profile: 4, frequency: 'B' }, { key: 'D', points: 20, profile: 6, frequency: 'C' }]},
  { question_no: 2,  weights: [{ key: 'A', points: 40, profile: 8, frequency: 'A' }, { key: 'B', points: 20, profile: 6, frequency: 'C' }, { key: 'C', points: 30, profile: 3, frequency: 'B' }, { key: 'D', points: 10, profile: 7, frequency: 'D' }]},
  { question_no: 3,  weights: [{ key: 'A', points: 40, profile: 8, frequency: 'A' }, { key: 'B', points: 10, profile: 6, frequency: 'D' }, { key: 'C', points: 20, profile: 5, frequency: 'C' }, { key: 'D', points: 30, profile: 3, frequency: 'B' }]},
  { question_no: 4,  weights: [{ key: 'A', points: 20, profile: 5, frequency: 'C' }, { key: 'B', points: 10, profile: 7, frequency: 'D' }, { key: 'C', points: 40, profile: 8, frequency: 'A' }, { key: 'D', points: 30, profile: 3, frequency: 'B' }]},
  { question_no: 5,  weights: [{ key: 'A', points: 40, profile: 1, frequency: 'A' }, { key: 'B', points: 30, profile: 4, frequency: 'B' }, { key: 'C', points: 20, profile: 5, frequency: 'C' }, { key: 'D', points: 10, profile: 7, frequency: 'D' }]},
  { question_no: 6,  weights: [{ key: 'A', points: 10, profile: 7, frequency: 'D' }, { key: 'B', points: 20, profile: 6, frequency: 'C' }, { key: 'C', points: 30, profile: 4, frequency: 'B' }, { key: 'D', points: 40, profile: 2, frequency: 'A' }]},
  { question_no: 7,  weights: [{ key: 'A', points: 10, profile: 8, frequency: 'D' }, { key: 'B', points: 40, profile: 8, frequency: 'A' }, { key: 'C', points: 30, profile: 2, frequency: 'B' }, { key: 'D', points: 20, profile: 5, frequency: 'C' }]},
  { question_no: 8,  weights: [{ key: 'A', points: 10, profile: 7, frequency: 'D' }, { key: 'B', points: 10, profile: 8, frequency: 'D' }, { key: 'C', points: 30, profile: 4, frequency: 'B' }, { key: 'D', points: 40, profile: 2, frequency: 'A' }]},
  { question_no: 9,  weights: [{ key: 'A', points: 20, profile: 5, frequency: 'C' }, { key: 'B', points: 10, profile: 6, frequency: 'D' }, { key: 'C', points: 30, profile: 4, frequency: 'B' }, { key: 'D', points: 40, profile: 1, frequency: 'A' }]},
  { question_no: 10, weights: [{ key: 'A', points: 30, profile: 3, frequency: 'B' }, { key: 'B', points: 40, profile: 2, frequency: 'A' }, { key: 'C', points: 40, profile: 1, frequency: 'A' }, { key: 'D', points: 10, profile: 7, frequency: 'D' }]},
  { question_no: 11, weights: [{ key: 'A', points: 40, profile: 1, frequency: 'A' }, { key: 'B', points: 20, profile: 5, frequency: 'C' }, { key: 'C', points: 30, profile: 3, frequency: 'B' }, { key: 'D', points: 10, profile: 7, frequency: 'D' }]},
  { question_no: 12, weights: [{ key: 'A', points: 40, profile: 2, frequency: 'A' }, { key: 'B', points: 20, profile: 6, frequency: 'C' }, { key: 'C', points: 10, profile: 8, frequency: 'D' }, { key: 'D', points: 30, profile: 4, frequency: 'B' }]},
  { question_no: 13, weights: [{ key: 'A', points: 40, profile: 2, frequency: 'A' }, { key: 'B', points: 30, profile: 4, frequency: 'B' }, { key: 'C', points: 20, profile: 5, frequency: 'C' }, { key: 'D', points: 10, profile: 8, frequency: 'D' }]},
  { question_no: 14, weights: [{ key: 'A', points: 40, profile: 1, frequency: 'A' }, { key: 'B', points: 30, profile: 3, frequency: 'B' }, { key: 'C', points: 10, profile: 6, frequency: 'D' }, { key: 'D', points: 20, profile: 6, frequency: 'C' }]},
  { question_no: 15, weights: [{ key: 'A', points: 20, profile: 5, frequency: 'C' }, { key: 'B', points: 40, profile: 2, frequency: 'A' }, { key: 'C', points: 10, profile: 8, frequency: 'D' }, { key: 'D', points: 30, profile: 4, frequency: 'B' }]},
];
