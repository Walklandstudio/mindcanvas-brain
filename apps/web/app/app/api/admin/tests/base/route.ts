// apps/web/app/api/admin/tests/base/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * Demo-friendly base questions endpoint.
 * Returns 15 questions with 4 answers each and the internal mapping
 * (points, frequency, profile_index). No DB dependency.
 */
export async function GET() {
  const questions = [
    {
      qnum: 1,
      text: "How do you prefer to tackle new tasks?",
      answers: [
        { text: "I dive right in", points: 40, frequency: "A", profile_index: 1 },
        { text: "I make a detailed plan", points: 10, frequency: "D", profile_index: 7 },
        { text: "I like to brainstorm with others", points: 30, frequency: "B", profile_index: 4 },
        { text: "I follow a structured process", points: 20, frequency: "C", profile_index: 6 },
      ],
    },
    {
      qnum: 2,
      text: "Which statement describes you best in a team setting?",
      answers: [
        { text: "I take charge and lead", points: 40, frequency: "A", profile_index: 8 },
        { text: "Keep tasks on track", points: 20, frequency: "C", profile_index: 6 },
        { text: "Build positive environment", points: 30, frequency: "B", profile_index: 3 },
        { text: "Focus on details", points: 10, frequency: "D", profile_index: 7 },
      ],
    },
    {
      qnum: 3,
      text: "When faced with a problem, how do you best like to solve it?",
      answers: [
        { text: "I like to try new ideas and adjust", points: 40, frequency: "A", profile_index: 8 },
        { text: "I break it into clear steps", points: 10, frequency: "D", profile_index: 6 },
        { text: "I research before acting", points: 20, frequency: "C", profile_index: 5 },
        { text: "I like to collaborate for solutions", points: 30, frequency: "B", profile_index: 3 },
      ],
    },
    {
      qnum: 4,
      text: "How do you prefer to communicate within a team?",
      answers: [
        { text: "I am thoughtful and organised", points: 20, frequency: "C", profile_index: 5 },
        { text: "I like to focus on facts", points: 10, frequency: "D", profile_index: 7 },
        { text: "I am direct and to the point", points: 40, frequency: "A", profile_index: 8 },
        { text: "I am friendly and supportive", points: 30, frequency: "B", profile_index: 3 },
      ],
    },
    {
      qnum: 5,
      text: "What motivates you mostly in your work?",
      answers: [
        { text: "I like new challenges", points: 40, frequency: "A", profile_index: 1 },
        { text: "I like to help others succeed", points: 30, frequency: "B", profile_index: 4 },
        { text: "Making sure things are running smoothly", points: 20, frequency: "C", profile_index: 5 },
        { text: "I like to produce high quality", points: 10, frequency: "D", profile_index: 7 },
      ],
    },
    {
      qnum: 6,
      text: "When things get stressful at work, how would you respond?",
      answers: [
        { text: "I like to pause and plan", points: 10, frequency: "D", profile_index: 7 },
        { text: "I like to stay organised", points: 20, frequency: "C", profile_index: 6 },
        { text: "I like to reach out for support", points: 30, frequency: "B", profile_index: 4 },
        { text: "I just like to push through", points: 40, frequency: "A", profile_index: 2 },
      ],
    },
    {
      qnum: 7,
      text: "How do you generally handle feedback?",
      answers: [
        { text: "I value fact-based feedback", points: 10, frequency: "D", profile_index: 8 },
        { text: "I appreciate quick feedback", points: 40, frequency: "A", profile_index: 8 },
        { text: "I focus on relationships and connection", points: 30, frequency: "B", profile_index: 2 },
        { text: "I prefer to receive detailed feedback", points: 20, frequency: "C", profile_index: 5 },
      ],
    },
    {
      qnum: 8,
      text: "How do you recover after making a mistake?",
      answers: [
        { text: "I like to reflect and plan", points: 10, frequency: "D", profile_index: 7 },
        { text: "I fix the mistake", points: 10, frequency: "D", profile_index: 8 },
        { text: "I like to discuss with a colleague", points: 30, frequency: "B", profile_index: 4 },
        { text: "I like to move on and adjust", points: 40, frequency: "A", profile_index: 2 },
      ],
    },
    {
      qnum: 9,
      text: "How do you feel after completing a big project?",
      answers: [
        { text: "I am relieved it went to plan", points: 20, frequency: "C", profile_index: 5 },
        { text: "I am proud of the accuracy", points: 10, frequency: "D", profile_index: 6 },
        { text: "I am grateful for team support", points: 30, frequency: "B", profile_index: 4 },
        { text: "I am excited to get on with the next challenge", points: 40, frequency: "A", profile_index: 1 },
      ],
    },
    {
      qnum: 10,
      text: "How do you best approach learning new things?",
      answers: [
        { text: "I like to learn with others", points: 30, frequency: "B", profile_index: 3 },
        { text: "I prefer structured learning", points: 40, frequency: "A", profile_index: 2 },
        { text: "I like to experiment with concepts", points: 40, frequency: "A", profile_index: 1 },
        { text: "I like a deep dive to fully understand", points: 10, frequency: "D", profile_index: 7 },
      ],
    },
    {
      qnum: 11,
      text: "What type of work energises you?",
      answers: [
        { text: "Innovative projects", points: 40, frequency: "A", profile_index: 1 },
        { text: "Organising and building processes", points: 20, frequency: "C", profile_index: 5 },
        { text: "Collaborating with others", points: 30, frequency: "B", profile_index: 3 },
        { text: "Analysing data", points: 10, frequency: "D", profile_index: 7 },
      ],
    },
    {
      qnum: 12,
      text: "How do you prefer to approach personal growth?",
      answers: [
        { text: "I like to challenge myself", points: 40, frequency: "A", profile_index: 2 },
        { text: "I like to refine my skills", points: 20, frequency: "C", profile_index: 6 },
        { text: "I like to set specific goals", points: 10, frequency: "D", profile_index: 8 },
        { text: "Through learning with others", points: 30, frequency: "B", profile_index: 4 },
      ],
    },
    {
      qnum: 13,
      text: "How do you best handle disagreements?",
      answers: [
        { text: "I like to assert my position", points: 40, frequency: "A", profile_index: 2 },
        { text: "I like to seek middle ground", points: 30, frequency: "B", profile_index: 4 },
        { text: "I look for logical solutions", points: 20, frequency: "C", profile_index: 5 },
        { text: "I feel better to stay objective", points: 10, frequency: "D", profile_index: 8 },
      ],
    },
    {
      qnum: 14,
      text: "How do you prefer to work on a team?",
      answers: [
        { text: "I like to lead and make decisions", points: 40, frequency: "A", profile_index: 1 },
        { text: "I prefer to foster team collaboration", points: 30, frequency: "B", profile_index: 3 },
        { text: "I prefer to organise tasks", points: 10, frequency: "D", profile_index: 6 },
        { text: "I provide analytical support", points: 20, frequency: "C", profile_index: 6 },
      ],
    },
    {
      qnum: 15,
      text: "What frustrates you most in a team or social setting?",
      answers: [
        { text: "Lack of clear goals", points: 20, frequency: "C", profile_index: 5 },
        { text: "Slow decision-making", points: 40, frequency: "A", profile_index: 2 },
        { text: "Lack of attention to detail", points: 10, frequency: "D", profile_index: 8 },
        { text: "Conflict between members", points: 30, frequency: "B", profile_index: 4 },
      ],
    },
  ];

  return NextResponse.json({ questions });
}
