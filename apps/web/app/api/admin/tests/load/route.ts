// app/api/admin/tests/load/route.ts
import { NextResponse } from "next/server";

// Minimal shape the builder expects
export async function GET() {
  // Stable 15-Q snapshot (text only; points map stays in your scoring layer)
  const questions = [
    { id: "q1", text: "How do you prefer to tackle new tasks?" },
    { id: "q2", text: "Which statement describes you best in a team setting?" },
    { id: "q3", text: "When faced with a problem, how do you best like to solve it?" },
    { id: "q4", text: "How do you prefer to communicate within a team?" },
    { id: "q5", text: "What motivates you mostly in your work?" },
    { id: "q6", text: "When things get stressful at work, how would you respond?" },
    { id: "q7", text: "How do you generally handle feedback?" },
    { id: "q8", text: "How do you recover after making a mistake?" },
    { id: "q9", text: "How do you feel after completing a big project?" },
    { id: "q10", text: "How do you best approach learning new things?" },
    { id: "q11", text: "What type of work energises you?" },
    { id: "q12", text: "How do you prefer to approach personal growth?" },
    { id: "q13", text: "How do you best handle disagreements?" },
    { id: "q14", text: "How do you prefer to work on a team?" },
    { id: "q15", text: "What frustrates you most in a team or social setting?" },
  ];
  return NextResponse.json({ questions });
}
