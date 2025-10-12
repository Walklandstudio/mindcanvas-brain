// apps/web/app/api/admin/tests/load/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

/** Base 15 questions + answers (backend mappings kept) */
const BASE: {
  qnum: number;
  text: string;
  answers: { ordinal: number; text: string; points: number; profile_num: number; frequency: "A"|"B"|"C"|"D" }[];
}[] = [
  { qnum: 1, text: "How do you prefer to tackle new tasks?",
    answers: [
      { ordinal:1, text:"I dive right in",                 points:40, profile_num:1, frequency:"A" },
      { ordinal:2, text:"I make a detailed plan",          points:10, profile_num:7, frequency:"D" },
      { ordinal:3, text:"I like to brainstorm with others",points:30, profile_num:4, frequency:"B" },
      { ordinal:4, text:"I follow a structured process",   points:20, profile_num:6, frequency:"C" },
    ]},
  { qnum: 2, text: "Which statement describes you best in a team setting?",
    answers: [
      { ordinal:1, text:"I take charge and lead",          points:40, profile_num:8, frequency:"A" },
      { ordinal:2, text:"Keep tasks on track",             points:20, profile_num:6, frequency:"C" },
      { ordinal:3, text:"Build positive environment",      points:30, profile_num:3, frequency:"B" },
      { ordinal:4, text:"Focus on details",                points:10, profile_num:7, frequency:"D" },
    ]},
  { qnum: 3, text: "When faced with a problem, how do you best like to solve it?",
    answers: [
      { ordinal:1, text:"I like to try new ideas and adjust", points:40, profile_num:8, frequency:"A" },
      { ordinal:2, text:"I break it into clear steps",        points:10, profile_num:6, frequency:"D" },
      { ordinal:3, text:"I research before acting",           points:20, profile_num:5, frequency:"C" },
      { ordinal:4, text:"I like to collaborate for solutions",points:30, profile_num:3, frequency:"B" },
    ]},
  { qnum: 4, text: "How do you prefer to communicate within a team?",
    answers: [
      { ordinal:1, text:"I am thoughtful and organised",      points:20, profile_num:5, frequency:"C" },
      { ordinal:2, text:"I like to focus on facts",           points:10, profile_num:7, frequency:"D" },
      { ordinal:3, text:"I am direct and to the point",       points:40, profile_num:8, frequency:"A" },
      { ordinal:4, text:"I am friendly and supportive",       points:30, profile_num:3, frequency:"B" },
    ]},
  { qnum: 5, text: "What motivates you mostly in your work?",
    answers: [
      { ordinal:1, text:"I like new challenges",              points:40, profile_num:1, frequency:"A" },
      { ordinal:2, text:"I like to help others succeed",      points:30, profile_num:4, frequency:"B" },
      { ordinal:3, text:"Making sure things are running smoothly", points:20, profile_num:5, frequency:"C" },
      { ordinal:4, text:"I like to produce high quality",     points:10, profile_num:7, frequency:"D" },
    ]},
  { qnum: 6, text: "When things get stressful at work, how would you respond?",
    answers: [
      { ordinal:1, text:"I like to pause and plan",           points:10, profile_num:7, frequency:"D" },
      { ordinal:2, text:"I like to stay organised",           points:20, profile_num:6, frequency:"C" },
      { ordinal:3, text:"I like to reach out for support",    points:30, profile_num:4, frequency:"B" },
      { ordinal:4, text:"I just like to push through",        points:40, profile_num:2, frequency:"A" },
    ]},
  { qnum: 7, text: "How do you generally handle feedback?",
    answers: [
      { ordinal:1, text:"I value fact-based feedback",        points:10, profile_num:8, frequency:"D"},
      { ordinal:2, text:"I appreciate quick feedback",        points:40, profile_num:8, frequency:"A" },
      { ordinal:3, text:"I focus on relationships and connection", points:30, profile_num:2, frequency:"B" },
      { ordinal:4, text:"I prefer to receive detailed feedback",   points:20, profile_num:5, frequency:"C" },
    ]},
  { qnum: 8, text: "How do you recover after making a mistake?",
    answers: [
      { ordinal:1, text:"I like to reflect and plan",         points:10, profile_num:7, frequency:"D" },
      { ordinal:2, text:"I fix the mistake",                  points:10, profile_num:8, frequency:"D" },
      { ordinal:3, text:"I like to discuss with a colleague", points:30, profile_num:4, frequency:"B" },
      { ordinal:4, text:"I like to move on and adjust",       points:40, profile_num:2, frequency:"A" },
    ]},
  { qnum: 9, text: "How do you feel after completing a big project?",
    answers: [
      { ordinal:1, text:"I am relieved it went to plan",      points:20, profile_num:5, frequency:"C" },
      { ordinal:2, text:"I am proud of the accuracy",         points:10, profile_num:6, frequency:"D" },
      { ordinal:3, text:"I am grateful for team support",     points:30, profile_num:4, frequency:"B" },
      { ordinal:4, text:"I am excited to get on with the next challenge", points:40, profile_num:1, frequency:"A" },
    ]},
  { qnum:10, text: "How do you best approach learning new things?",
    answers: [
      { ordinal:1, text:"I like to learn with others",        points:30, profile_num:3, frequency:"B" },
      { ordinal:2, text:"I prefer structured learning",       points:40, profile_num:2, frequency:"A" },
      { ordinal:3, text:"I like to experiment with concepts", points:40, profile_num:1, frequency:"A" },
      { ordinal:4, text:"I like a deep dive to fully understand", points:10, profile_num:7, frequency:"D" },
    ]},
  { qnum:11, text: "What type of work energises you?",
    answers: [
      { ordinal:1, text:"Innovative projects",                points:40, profile_num:1, frequency:"A" },
      { ordinal:2, text:"Organising and building processes",  points:20, profile_num:5, frequency:"C" },
      { ordinal:3, text:"Collaborating with others",          points:30, profile_num:3, frequency:"B" },
      { ordinal:4, text:"Analysing data",                     points:10, profile_num:7, frequency:"D" },
    ]},
  { qnum:12, text: "How do you prefer to approach personal growth?",
    answers: [
      { ordinal:1, text:"I like to challenge myself",         points:40, profile_num:2, frequency:"A" },
      { ordinal:2, text:"I like to refine my skills",         points:20, profile_num:6, frequency:"C" },
      { ordinal:3, text:"I like to set specific goals",       points:10, profile_num:8, frequency:"D" },
      { ordinal:4, text:"Through learning with others",       points:30, profile_num:4, frequency:"B" },
    ]},
  { qnum:13, text: "How do you best handle disagreements?",
    answers: [
      { ordinal:1, text:"I like to assert my position",       points:40, profile_num:2, frequency:"A" },
      { ordinal:2, text:"I like to seek middle ground",       points:30, profile_num:4, frequency:"B" },
      { ordinal:3, text:"I look for logical solutions",       points:20, profile_num:5, frequency:"C" },
      { ordinal:4, text:"I feel better to stay objective",    points:10, profile_num:8, frequency:"D" },
    ]},
  { qnum:14, text: "How do you prefer to work on a team?",
    answers: [
      { ordinal:1, text:"I like to lead and make decisions",  points:40, profile_num:1, frequency:"A" },
      { ordinal:2, text:"I prefer to foster team collaboration", points:30, profile_num:3, frequency:"B" },
      { ordinal:3, text:"I prefer to organise tasks",         points:10, profile_num:6, frequency:"D" },
      { ordinal:4, text:"I provide analytical support",       points:20, profile_num:6, frequency:"C" },
    ]},
  { qnum:15, text: "What frustrates you most in a team or social setting?",
    answers: [
      { ordinal:1, text:"Lack of clear goals",                points:20, profile_num:5, frequency:"C" },
      { ordinal:2, text:"Slow decision-making",               points:40, profile_num:2, frequency:"A" },
      { ordinal:3, text:"Lack of attention to detail",        points:10, profile_num:8, frequency:"D" },
      { ordinal:4, text:"Conflict between members",           points:30, profile_num:4, frequency:"B" },
    ]},
];

export async function GET() {
  const sb = getServiceClient();

  // Find or create latest test for org
  let test = await sb
    .from("org_tests")
    .select("id")
    .eq("org_id", ORG_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (test.error) return NextResponse.json({ error: test.error.message }, { status: 500 });

  if (!test.data) {
    const ins = await sb
      .from("org_tests")
      .insert([{ org_id: ORG_ID, name: "Signature Test", kind: "full" }])
      .select("id")
      .maybeSingle();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    test = ins;
  }

  // Load questions by test_id ONLY (no org_id dependency)
  const haveQs = await sb
    .from("org_test_questions")
    .select("id,qnum,text")
    .eq("test_id", test.data!.id)
    .order("qnum", { ascending: true });

  if (haveQs.error && haveQs.error.message?.includes("does not exist")) {
    return NextResponse.json({ error: haveQs.error.message }, { status: 500 });
  }
  if (haveQs.error) return NextResponse.json({ error: haveQs.error.message }, { status: 500 });

  if (!haveQs.data || haveQs.data.length === 0) {
    // Seed questions
    const qRows = BASE.map((b) => ({ test_id: test.data!.id, qnum: b.qnum, text: b.text }));
    const qIns = await sb.from("org_test_questions").insert(qRows).select("id,qnum");
    if (qIns.error) return NextResponse.json({ error: qIns.error.message }, { status: 500 });

    const idByQnum = new Map<number, string>();
    qIns.data!.forEach((q: any) => idByQnum.set(q.qnum, q.id));

    const aRows: any[] = [];
    for (const b of BASE) {
      const qid = idByQnum.get(b.qnum)!;
      for (const a of b.answers) {
        aRows.push({
          question_id: qid,
          ordinal: a.ordinal,
          text: a.text,
          points: a.points,
          profile_num: a.profile_num,
          frequency: a.frequency,
        });
      }
    }
    const aIns = await sb.from("org_test_answers").insert(aRows).select("id");
    if (aIns.error) return NextResponse.json({ error: aIns.error.message }, { status: 500 });
  }

  // Return full shape
  const qs = await sb
    .from("org_test_questions")
    .select("id,qnum,text")
    .eq("test_id", test.data!.id)
    .order("qnum", { ascending: true });

  if (qs.error) return NextResponse.json({ error: qs.error.message }, { status: 500 });

  const qids = (qs.data || []).map((q: any) => q.id);
  const ans = await sb
    .from("org_test_answers")
    .select("id,question_id,text,ordinal")
    .in("question_id", qids);

  if (ans.error) return NextResponse.json({ error: ans.error.message }, { status: 500 });

  const byQ = new Map<string, any[]>();
  (ans.data || []).forEach((a: any) => {
    const arr = byQ.get(a.question_id) || [];
    arr.push(a);
    byQ.set(a.question_id, arr);
  });

  const items = (qs.data || []).map((q: any) => ({
    id: q.id,
    qnum: q.qnum,
    text: q.text,
    answers: (byQ.get(q.id) || []).sort((a, b) => a.ordinal - b.ordinal),
  }));

  return NextResponse.json({ items });
}
