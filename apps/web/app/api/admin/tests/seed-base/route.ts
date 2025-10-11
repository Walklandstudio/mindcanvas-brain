// apps/web/app/api/admin/tests/seed-base/route.ts
import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const MAP = [
  [1, "How do you prefer to tackle new tasks?", [
    [1,"I dive right in",40,1,"A"],
    [2,"I make a detailed plan",10,7,"D"],
    [3,"I like to brainstorm with others",30,4,"B"],
    [4,"I follow a structured process",20,6,"C"],
  ]],
  [2, "Which statement describes you best in a team setting?", [
    [1,"I take charge and lead",40,8,"A"],
    [2,"Keep tasks on track",20,6,"C"],
    [3,"Build positive environment",30,3,"B"],
    [4,"Focus on details",10,7,"D"],
  ]],
  [3, "When faced with a problem, how do you best like to solve it?", [
    [1,"I like to try new ideas and adjust",40,8,"A"],
    [2,"I break it into clear steps",10,6,"D"],
    [3,"I research before acting",20,5,"C"],
    [4,"I like to collaborate for solutions",30,3,"B"],
  ]],
  [4, "How do you prefer to communicate within a team?", [
    [1,"I am thoughtful and organised",20,5,"C"],
    [2,"I like to focus on facts",10,7,"D"],
    [3,"I am direct and to the point",40,8,"A"],
    [4,"I am friendly and supportive",30,3,"B"],
  ]],
  [5, "What motivates you mostly in your work?", [
    [1,"I like new challenges",40,1,"A"],
    [2,"I like to help others succeed",30,4,"B"],
    [3,"Making sure things are running smoothly",20,5,"C"],
    [4,"I like to produce high quality",10,7,"D"],
  ]],
  [6, "When things get stressful at work, how would you respond?", [
    [1,"I like to pause and plan",10,7,"D"],
    [2,"I like to stay organised",20,6,"C"],
    [3,"I like to reach out for support",30,4,"B"],
    [4,"I just like to push through",40,2,"A"],
  ]],
  [7, "How do you generally handle feedback?", [
    [1,"I value fact-based feedback",10,8,"D"],
    [2,"I appreciate quick feedback",40,8,"A"],
    [3,"I focus on relationships and connection",30,2,"B"],
    [4,"I prefer to receive detailed feedback",20,5,"C"],
  ]],
  [8, "How do you recover after making a mistake?", [
    [1,"I like to reflect and plan",10,7,"D"],
    [2,"I fix the mistake",10,8,"D"],
    [3,"I like to discuss with a colleague",30,4,"B"],
    [4,"I like to move on and adjust",40,2,"A"],
  ]],
  [9, "How do you feel after completing a big project?", [
    [1,"I am relieved it went to plan",20,5,"C"],
    [2,"I am proud of the accuracy",10,6,"D"],
    [3,"I am grateful for team support",30,4,"B"],
    [4,"I am excited to get on with the next challenge",40,1,"A"],
  ]],
  [10, "How do you best approach learning new things?", [
    [1,"I like to learn with others",30,3,"B"],
    [2,"I prefer structured learning",40,2,"A"],
    [3,"I like to experiment with concepts",40,1,"A"],
    [4,"I like a deep dive to fully understand",10,7,"D"],
  ]],
  [11, "What type of work energises you?", [
    [1,"Innovative projects",40,1,"A"],
    [2,"Organising and building processes",20,5,"C"],
    [3,"Collaborating with others",30,3,"B"],
    [4,"Analysing data",10,7,"D"],
  ]],
  [12, "How do you prefer to approach personal growth?", [
    [1,"I like to challenge myself",40,2,"A"],
    [2,"I like to refine my skills",20,6,"C"],
    [3,"I like to set specific goals",10,8,"D"],
    [4,"Through learning with others",30,4,"B"],
  ]],
  [13, "How do you best handle disagreements?", [
    [1,"I like to assert my position",40,2,"A"],
    [2,"I like to seek middle ground",30,4,"B"],
    [3,"I look for logical solutions",20,5,"C"],
    [4,"I feel better to stay objective",10,8,"D"],
  ]],
  [14, "How do you prefer to work on a team?", [
    [1,"I like to lead and make decisions",40,1,"A"],
    [2,"I prefer to foster team collaboration",30,3,"B"],
    [3,"I prefer to organise tasks",10,6,"D"],
    [4,"I provide analytical support",20,6,"C"],
  ]],
  [15, "What frustrates you most in a team or social setting?", [
    [1,"Lack of clear goals",20,5,"C"],
    [2,"Slow decision-making",40,2,"A"],
    [3,"Lack of attention to detail",10,8,"D"],
    [4,"Conflict between members",30,4,"B"],
  ]],
];

export async function POST() {
  const supabase = getServiceClient();

  // create tables if missing (idempotent safety)
  await supabase.rpc("noop"); // no-op if you don't have an RPC; kept for sequencing

  for (const [qnum, text, opts] of MAP as any[]) {
    const { data: q, error: qErr } = await supabase
      .from("base_questions")
      .upsert({ qnum, text }, { onConflict: "qnum" })
      .select("id")
      .single();
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    for (const [onum, otext, points, profile_index, frequency] of opts) {
      const { error: oErr } = await supabase
        .from("base_options")
        .upsert(
          { question_id: q.id, onum, text: otext, points, profile_index, frequency },
          { onConflict: "question_id,onum" }
        );
      if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, count: MAP.length });
}
