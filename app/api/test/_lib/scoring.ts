// Frequencies A/B/C/D and Profiles 1..8 from your spec
export type Frequency = 'A'|'B'|'C'|'D';

export type ChoiceMap = {
  points: number;
  profile: 1|2|3|4|5|6|7|8;
  freq: Frequency;
};

type QMap = [ChoiceMap, ChoiceMap, ChoiceMap, ChoiceMap];

// Keyed by question order (1..15)
export const SCORING: Record<number, QMap> = {
  1: [
    { points: 40, profile: 1, freq: 'A' }, // 1.1 I dive right in
    { points: 10, profile: 7, freq: 'D' }, // 1.2 detailed plan
    { points: 30, profile: 4, freq: 'B' }, // 1.3 brainstorm
    { points: 20, profile: 6, freq: 'C' }, // 1.4 structured process
  ],
  2: [
    { points: 40, profile: 8, freq: 'A' }, // 2.1 lead
    { points: 20, profile: 6, freq: 'C' }, // 2.2 keep tasks on track
    { points: 30, profile: 3, freq: 'B' }, // 2.3 build positive env
    { points: 10, profile: 7, freq: 'D' }, // 2.4 focus on details
  ],
  3: [
    { points: 40, profile: 8, freq: 'A' }, // 3.1 try new ideas
    { points: 10, profile: 6, freq: 'D' }, // 3.2 break into steps (D)
    { points: 20, profile: 5, freq: 'C' }, // 3.3 research
    { points: 30, profile: 3, freq: 'B' }, // 3.4 collaborate
  ],
  4: [
    { points: 20, profile: 5, freq: 'C' }, // thoughtful/organised
    { points: 10, profile: 7, freq: 'D' }, // focus on facts
    { points: 40, profile: 8, freq: 'A' }, // direct
    { points: 30, profile: 3, freq: 'B' }, // friendly/supportive
  ],
  5: [
    { points: 40, profile: 1, freq: 'A' }, // new challenges
    { points: 30, profile: 4, freq: 'B' }, // help others succeed
    { points: 20, profile: 5, freq: 'C' }, // smooth operations
    { points: 10, profile: 7, freq: 'D' }, // high quality
  ],
  6: [
    { points: 10, profile: 7, freq: 'D' }, // pause and plan
    { points: 20, profile: 6, freq: 'C' }, // stay organised
    { points: 30, profile: 4, freq: 'B' }, // reach out
    { points: 40, profile: 2, freq: 'A' }, // push through
  ],
  7: [
    { points: 10, profile: 8, freq: 'D' }, // fact-based feedback (D)
    { points: 40, profile: 8, freq: 'A' }, // quick feedback (A)
    { points: 30, profile: 2, freq: 'B' }, // relationships (B)
    { points: 20, profile: 5, freq: 'C' }, // detailed feedback (C)
  ],
  8: [
    { points: 10, profile: 7, freq: 'D' }, // reflect and plan
    { points: 10, profile: 8, freq: 'D' }, // fix the mistake (D)
    { points: 30, profile: 4, freq: 'B' }, // discuss with colleague
    { points: 40, profile: 2, freq: 'A' }, // move on and adjust
  ],
  9: [
    { points: 20, profile: 5, freq: 'C' }, // relieved plan
    { points: 10, profile: 6, freq: 'D' }, // proud accuracy
    { points: 30, profile: 4, freq: 'B' }, // grateful for support
    { points: 40, profile: 1, freq: 'A' }, // excited next challenge
  ],
  10: [
    { points: 30, profile: 3, freq: 'B' }, // learn with others
    { points: 40, profile: 2, freq: 'A' }, // structured learning  (your table shows A)
    { points: 40, profile: 1, freq: 'A' }, // experiment concepts   (A)
    { points: 10, profile: 7, freq: 'D' }, // deep dive             (D)
  ],
  11: [
    { points: 40, profile: 1, freq: 'A' }, // innovative projects
    { points: 20, profile: 5, freq: 'C' }, // organising processes
    { points: 30, profile: 3, freq: 'B' }, // collaborating
    { points: 10, profile: 7, freq: 'D' }, // analysing data
  ],
  12: [
    { points: 40, profile: 2, freq: 'A' }, // challenge myself
    { points: 20, profile: 6, freq: 'C' }, // refine skills
    { points: 10, profile: 8, freq: 'D' }, // set specific goals (D)
    { points: 30, profile: 4, freq: 'B' }, // learning with others
  ],
  13: [
    { points: 40, profile: 2, freq: 'A' }, // assert position
    { points: 30, profile: 4, freq: 'B' }, // seek middle ground
    { points: 20, profile: 5, freq: 'C' }, // logical solutions
    { points: 10, profile: 8, freq: 'D' }, // stay objective (D)
  ],
  14: [
    { points: 40, profile: 1, freq: 'A' }, // lead & decide
    { points: 30, profile: 3, freq: 'B' }, // foster collaboration
    { points: 10, profile: 6, freq: 'D' }, // organise tasks (D)
    { points: 20, profile: 6, freq: 'C' }, // analytical support (C)
  ],
  15: [
    { points: 20, profile: 5, freq: 'C' }, // lack of clear goals (C)
    { points: 40, profile: 2, freq: 'A' }, // slow decision-making (A)
    { points: 10, profile: 8, freq: 'D' }, // lack of attention (D)
    { points: 30, profile: 4, freq: 'B' }, // conflict (B)
  ],
};
