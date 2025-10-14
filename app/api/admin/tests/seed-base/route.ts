// apps/web/app/api/admin/tests/seed-base/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

type Opt = { onum: number; text: string; points: number; profile_index: number; frequency: "A"|"B"|"C"|"D" };
type Q = { qnum: number; text: string; options: Opt[] };

const DATA: Q[] = [
  { qnum:1, text:"How do you prefer to tackle new tasks?", options:[
    { onum:1, text:"I dive right in", points:40, profile_index:1, frequency:"A"},
    { onum:2, text:"I make a detailed plan", points:10, profile_index:7, frequency:"D"},
    { onum:3, text:"I like to brainstorm with others", points:30, profile_index:4, frequency:"B"},
    { onum:4, text:"I follow a structured process", points:20, profile_index:6, frequency:"C"},
  ]},
  { qnum:2, text:"Which statement describes you best in a team setting?", options:[
    { onum:1, text:"I take charge and lead", points:40, profile_index:8, frequency:"A"},
    { onum:2, text:"Keep tasks on track", points:20, profile_index:6, frequency:"C"},
    { onum:3, text:"Build positive environment", points:30, profile_index:3, frequency:"B"},
    { onum:4, text:"Focus on details", points:10, profile_index:7, frequency:"D"},
  ]},
  { qnum:3, text:"When faced with a problem, how do you best like to solve it?", options:[
    { onum:1, text:"I like to try new ideas and adjust", points:40, profile_index:8, frequency:"A"},
    { onum:2, text:"I break it into clear steps", points:10, profile_index:6, frequency:"D"},
    { onum:3, text:"I research before acting", points:20, profile_index:5, frequency:"C"},
    { onum:4, text:"I like to collaborate for solutions", points:30, profile_index:3, frequency:"B"},
  ]},
  { qnum:4, text:"How do you prefer to communicate within a team?", options:[
    { onum:1, text:"I am thoughtful and organised", points:20, profile_index:5, frequency:"C"},
    { onum:2, text:"I like to focus on facts", points:10, profile_index:7, frequency:"D"},
    { onum:3, text:"I am direct and to the point", points:40, profile_index:8, frequency:"A"},
    { onum:4, text:"I am friendly and supportive", points:30, profile_index:3, frequency:"B"},
  ]},
  { qnum:5, text:"What motivates you mostly in your work?", options:[
    { onum:1, text:"I like new challenges", points:40, profile_index:1, frequency:"A"},
    { onum:2, text:"I like to help others succeed", points:30, profile_index:4, frequency:"B"},
    { onum:3, text:"Making sure things are running smoothly", points:20, profile_index:5, frequency:"C"},
    { onum:4, text:"I like to produce high quality", points:10, profile_index:7, frequency:"D"},
  ]},
  { qnum:6, text:"When things get stressful at work, how would you respond?", options:[
    { onum:1, text:"I like to pause and plan", points:10, profile_index:7, frequency:"D"},
    { onum:2, text:"I like to stay organised", points:20, profile_index:6, frequency:"C"},
    { onum:3, text:"I like to reach out for support", points:30, profile_index:4, frequency:"B"},
    { onum:4, text:"I just like to push through", points:40, profile_index:2, frequency:"A"},
  ]},
  { qnum:7, text:"How do you generally handle feedback?", options:[
    { onum:1, text:"I value fact-based feedback", points:10, profile_index:8, frequency:"D"},
    { onum:2, text:"I appreciate quick feedback", points:40, profile_index:8, frequency:"A"},
    { onum:3, text:"I focus on relationships and connection", points:30, profile_index:2, frequency:"B"},
    { onum:4, text:"I prefer to receive detailed feedback", points:20, profile_index:5, frequency:"C"},
  ]},
  { qnum:8, text:"How do you recover after making a mistake?", options:[
    { onum:1, text:"I like to reflect and plan", points:10, profile_index:7, frequency:"D"},
    { onum:2, text:"I fix the mistake", points:10, profile_index:8, frequency:"D"},
    { onum:3, text:"I like to discuss with a colleague", points:30, profile_index:4, frequency:"B"},
    { onum:4, text:"I like to move on and adjust", points:40, profile_index:2, frequency:"A"},
  ]},
  { qnum:9, text:"How do you feel after completing a big project?", options:[
    { onum:1, text:"I am relieved it went to plan", points:20, profile_index:5, frequency:"C"},
    { onum:2, text:"I am proud of the accuracy", points:10, profile_index:6, frequency:"D"},
    { onum:3, text:"I am grateful for team support", points:30, profile_index:4, frequency:"B"},
    { onum:4, text:"I am excited to get on with the next challenge", points:40, profile_index:1, frequency:"A"},
  ]},
  { qnum:10, text:"How do you best approach learning new things?", options:[
    { onum:1, text:"I like to learn with others", points:30, profile_index:3, frequency:"B"},
    { onum:2, text:"I prefer structured learning", points:40, profile_index:2, frequency:"A"},
    { onum:3, text:"I like to experiment with concepts", points:40, profile_index:1, frequency:"A"},
    { onum:4, text:"I like a deep dive to fully understand", points:10, profile_index:7, frequency:"D"},
  ]},
  { qnum:11, text:"What type of work energises you?", options:[
    { onum:1, text:"Innovative projects", points:40, profile_index:1, frequency:"A"},
    { onum:2, text:"Organising and building processes", points:20, profile_index:5, frequency:"C"},
    { onum:3, text:"Collaborating with others", points:30, profile_index:3, frequency:"B"},
    { onum:4, text:"Analysing data", points:10, profile_index:7, frequency:"D"},
  ]},
  { qnum:12, text:"How do you prefer to approach personal growth?", options:[
    { onum:1, text:"I like to challenge myself", points:40, profile_index:2, frequency:"A"},
    { onum:2, text:"I like to refine my skills", points:20, profile_index:6, frequency:"C"},
    { onum:3, text:"I like to set specific goals", points:10, profile_index:8, frequency:"D"},
    { onum:4, text:"Through learning with others", points:30, profile_index:4, frequency:"B"},
  ]},
  { qnum:13, text:"How do you best handle disagreements?", options:[
    { onum:1, text:"I like to assert my position", points:40, profile_index:2, frequency:"A"},
    { onum:2, text:"I like to seek middle ground", points:30, profile_index:4, frequency:"B"},
    { onum:3, text:"I look for logical solutions", points:20, profile_index:5, frequency:"C"},
    { onum:4, text:"I feel better to stay objective", points:10, profile_index:8, frequency:"D"},
  ]},
  { qnum:14, text:"How do you prefer to work on a team?", options:[
    { onum:1, text:"I like to lead and make decisions", points:40, profile_index:1, frequency:"A"},
    { onum:2, text:"I prefer to foster team collaboration", points:30, profile_index:3, frequency:"B"},
    { onum:3, text:"I prefer to organise tasks", points:10, profile_index:6, frequency:"D"},
    { onum:4, text:"I provide analytical support", points:20, profile_index:6, frequency:"C"},
  ]},
  { qnum:15, text:"What frustrates you most in a team or social setting?", options:[
    { onum:1, text:"Lack of clear goals", points:20, profile_index:5, frequency:"C"},
    { onum:2, text:"Slow decision-making", points:40, profile_index:2, frequency:"A"},
    { onum:3, text:"Lack of attention to detail", points:10, profile_index:8, frequency:"D"},
    { onum:4, text:"Conflict between members", points:30, profile_index:4, frequency:"B"},
  ]}
];

export async function POST() {
  const supabase = getServiceClient();

  // Clear and seed
  const del1 = await supabase.from("base_options").delete().neq("id", -1);
  if (del1.error) return NextResponse.json({ error: del1.error.message }, { status: 500 });
  const del2 = await supabase.from("base_questions").delete().neq("id", -1);
  if (del2.error) return NextResponse.json({ error: del2.error.message }, { status: 500 });

  // Insert questions
  const qRows = DATA.map(q => ({ qnum: q.qnum, text: q.text }));
  const qs = await supabase.from("base_questions").insert(qRows).select("id,qnum");
  if (qs.error) return NextResponse.json({ error: qs.error.message }, { status: 500 });

  const idByQnum = new Map<number, number>();
  (qs.data ?? []).forEach((r:any)=> idByQnum.set(r.qnum, r.id));

  const oRows = DATA.flatMap(q =>
    q.options.map(o => ({
      question_id: idByQnum.get(q.qnum)!,
      onum: o.onum,
      text: o.text,
      points: o.points,
      profile_index: o.profile_index,
      frequency: o.frequency
    }))
  );
  const os = await supabase.from("base_options").insert(oRows).select("id");
  if (os.error) return NextResponse.json({ error: os.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: DATA.length });
}
