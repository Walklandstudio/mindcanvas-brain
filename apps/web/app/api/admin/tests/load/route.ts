// apps/web/app/api/admin/tests/load/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

/* ---------------- types and base ---------------- */
type BaseAnswer = {
  ordinal: number;
  text: string;
  points: number;
  profile_num: number;
  frequency: "A" | "B" | "C" | "D";
};
type BaseQ = { qnum: number; text: string; answers: BaseAnswer[] };

const BASE: BaseQ[] = [
  { qnum: 1, text: "How do you prefer to tackle new tasks?",
    answers: [
      { ordinal:1, text:"I dive right in", points:40, profile_num:1, frequency:"A" },
      { ordinal:2, text:"I make a detailed plan", points:10, profile_num:7, frequency:"D" },
      { ordinal:3, text:"I like to brainstorm with others", points:30, profile_num:4, frequency:"B" },
      { ordinal:4, text:"I follow a structured process", points:20, profile_num:6, frequency:"C" },
    ]},
  { qnum: 2, text: "Which statement describes you best in a team setting?",
    answers: [
      { ordinal:1, text:"I take charge and lead", points:40, profile_num:8, frequency:"A" },
      { ordinal:2, text:"Keep tasks on track", points:20, profile_num:6, frequency:"C" },
      { ordinal:3, text:"Build positive environment", points:30, profile_num:3, frequency:"B" },
      { ordinal:4, text:"Focus on details", points:10, profile_num:7, frequency:"D" },
    ]},
  { qnum: 3, text: "When faced with a problem, how do you best like to solve it?",
    answers: [
      { ordinal:1, text:"I like to try new ideas and adjust", points:40, profile_num:8, frequency:"A" },
      { ordinal:2, text:"I break it into clear steps", points:10, profile_num:6, frequency:"D" },
      { ordinal:3, text:"I research before acting", points:20, profile_num:5, frequency:"C" },
      { ordinal:4, text:"I like to collaborate for solutions", points:30, profile_num:3, frequency:"B" },
    ]},
  { qnum: 4, text: "How do you prefer to communicate within a team?",
    answers: [
      { ordinal:1, text:"I am thoughtful and organised", points:20, profile_num:5, frequency:"C" },
      { ordinal:2, text:"I like to focus on facts", points:10, profile_num:7, frequency:"D" },
      { ordinal:3, text:"I am direct and to the point", points:40, profile_num:8, frequency:"A" },
      { ordinal:4, text:"I am friendly and supportive", points:30, profile_num:3, frequency:"B" },
    ]},
  { qnum: 5, text: "What motivates you mostly in your work?",
    answers: [
      { ordinal:1, text:"I like new challenges", points:40, profile_num:1, frequency:"A" },
      { ordinal:2, text:"I like to help others succeed", points:30, profile_num:4, frequency:"B" },
      { ordinal:3, text:"Making sure things are running smoothly", points:20, profile_num:5, frequency:"C" },
      { ordinal:4, text:"I like to produce high quality", points:10, profile_num:7, frequency:"D" },
    ]},
  { qnum: 6, text: "When things get stressful at work, how would you respond?",
    answers: [
      { ordinal:1, text:"I like to pause and plan", points:10, profile_num:7, frequency:"D" },
      { ordinal:2, text:"I like to stay organised", points:20, profile_num:6, frequency:"C" },
      { ordinal:3, text:"I like to reach out for support", points:30, profile_num:4, frequency:"B" },
      { ordinal:4, text:"I just like to push through", points:40, profile_num:2, frequency:"A" },
    ]},
  { qnum: 7, text: "How do you generally handle feedback?",
    answers: [
      { ordinal:1, text:"I value fact-based feedback", points:10, profile_num:8, frequency:"D" },
      { ordinal:2, text:"I appreciate quick feedback", points:40, profile_num:8, frequency:"A" },
      { ordinal:3, text:"I focus on relationships and connection", points:30, profile_num:2, frequency:"B" },
      { ordinal:4, text:"I prefer to receive detailed feedback", points:20, profile_num:5, frequency:"C" },
    ]},
  { qnum: 8, text: "How do you recover after making a mistake?",
    answers: [
      { ordinal:1, text:"I like to reflect and plan", points:10, profile_num:7, frequency:"D" },
      { ordinal:2, text:"I fix the mistake", points:10, profile_num:8, frequency:"D" },
      { ordinal:3, text:"I like to discuss with a colleague", points:30, profile_num:4, frequency:"B" },
      { ordinal:4, text:"I like to move on and adjust", points:40, profile_num:2, frequency:"A" },
    ]},
  { qnum: 9, text: "How do you feel after completing a big project?",
    answers: [
      { ordinal:1, text:"I am relieved it went to plan", points:20, profile_num:5, frequency:"C" },
      { ordinal:2, text:"I am proud of the accuracy", points:10, profile_num:6, frequency:"D" },
      { ordinal:3, text:"I am grateful for team support", points:30, profile_num:4, frequency:"B" },
      { ordinal:4, text:"I am excited to get on with the next challenge", points:40, profile_num:1, frequency:"A" },
    ]},
  { qnum:10, text: "How do you best approach learning new things?",
    answers: [
      { ordinal:1, text:"I like to learn with others", points:30, profile_num:3, frequency:"B" },
      { ordinal:2, text:"I prefer structured learning", points:40, profile_num:2, frequency:"A" },
      { ordinal:3, text:"I like to experiment with concepts", points:40, profile_num:1, frequency:"A" },
      { ordinal:4, text:"I like a deep dive to fully understand", points:10, profile_num:7, frequency:"D" },
    ]},
  { qnum:11, text: "What type of work energises you?",
    answers: [
      { ordinal:1, text:"Innovative projects", points:40, profile_num:1, frequency:"A" },
      { ordinal:2, text:"Organising and building processes", points:20, profile_num:5, frequency:"C" },
      { ordinal:3, text:"Collaborating with others", points:30, profile_num:3, frequency:"B" },
      { ordinal:4, text:"Analysing data", points:10, profile_num:7, frequency:"D" },
    ]},
  { qnum:12, text: "How do you prefer to approach personal growth?",
    answers: [
      { ordinal:1, text:"I like to challenge myself", points:40, profile_num:2, frequency:"A" },
      { ordinal:2, text:"I like to refine my skills", points:20, profile_num:6, frequency:"C" },
      { ordinal:3, text:"I like to set specific goals", points:10, profile_num:8, frequency:"D" },
      { ordinal:4, text:"Through learning with others", points:30, profile_num:4, frequency:"B" },
    ]},
  { qnum:13, text: "How do you best handle disagreements?",
    answers: [
      { ordinal:1, text:"I like to assert my position", points:40, profile_num:2, frequency:"A" },
      { ordinal:2, text:"I like to seek middle ground", points:30, profile_num:4, frequency:"B" },
      { ordinal:3, text:"I look for logical solutions", points:20, profile_num:5, frequency:"C" },
      { ordinal:4, text:"I feel better to stay objective", points:10, profile_num:8, frequency:"D" },
    ]},
  { qnum:14, text: "How do you prefer to work on a team?",
    answers: [
      { ordinal:1, text:"I like to lead and make decisions", points:40, profile_num:1, frequency:"A" },
      { ordinal:2, text:"I prefer to foster team collaboration", points:30, profile_num:3, frequency:"B" },
      { ordinal:3, text:"I prefer to organise tasks", points:10, profile_num:6, frequency:"D" },
      { ordinal:4, text:"I provide analytical support", points:20, profile_num:6, frequency:"C" },
    ]},
  { qnum:15, text: "What frustrates you most in a team or social setting?",
    answers: [
      { ordinal:1, text:"Lack of clear goals", points:20, profile_num:5, frequency:"C" },
      { ordinal:2, text:"Slow decision-making", points:40, profile_num:2, frequency:"A" },
      { ordinal:3, text:"Lack of attention to detail", points:10, profile_num:8, frequency:"D" },
      { ordinal:4, text:"Conflict between members", points:30, profile_num:4, frequency:"B" },
    ]},
];

/* ---------------- helpers ---------------- */

async function ensureFramework(sb: any): Promise<{ id: string } | { error: string }> {
  // try read latest framework
  let fw = await sb
    .from("org_frameworks")
    .select("id")
    .eq("org_id", ORG_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!fw.error && fw.data?.id) return { id: fw.data.id as string };

  // create minimal framework row
  const shapes = [
    [{ org_id: ORG_ID, name: "Signature", version: 1 }],
    [{ org_id: ORG_ID, name: "Signature" }],
    [{ org_id: ORG_ID, version: 1 }],
    [{ org_id: ORG_ID }],
  ];
  let lastErr: string | null = null;
  for (const rows of shapes) {
    const ins = await sb.from("org_frameworks").insert(rows as any).select("id").maybeSingle();
    if (!ins.error && ins.data?.id) return { id: ins.data.id as string };
    lastErr = ins.error?.message ?? lastErr;
  }
  return { error: lastErr || "failed to create org_frameworks row" };
}

/** Ensure a parent test row in org_test_defs (preferred) or org_tests (fallback). */
async function ensureParentTest(sb: any): Promise<
  { parentTable: "org_test_defs" | "org_tests"; id: string } | { error: string }
> {
  // prefer org_test_defs if it exists
  let useDefs = true;
  const probeDefs = await sb
    .from("org_test_defs")
    .select("id")
    .limit(1);
  if (probeDefs.error && /relation .* does not exist|42P01/i.test(probeDefs.error.message)) {
    useDefs = false;
  }

  if (useDefs) {
    // we MUST have a framework_id
    const fw = await ensureFramework(sb);
    if ("error" in fw) return { error: fw.error };

    // try read an existing test_def for this framework
    let td = await sb
      .from("org_test_defs")
      .select("id")
      .eq("org_id", ORG_ID)
      .eq("framework_id", fw.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!td.error && td.data?.id) {
      return { parentTable: "org_test_defs", id: td.data.id as string };
    }

    // create shapes satisfying NOT NULLs (e.g., mode)
    const shapes = [
      [{ org_id: ORG_ID, framework_id: fw.id, name: "Signature Test", mode: "full" }],
      [{ org_id: ORG_ID, framework_id: fw.id, name: "Signature Test" }],
      [{ org_id: ORG_ID, framework_id: fw.id, mode: "full" }],
      [{ org_id: ORG_ID, framework_id: fw.id }],
    ];
    let lastErr: string | null = null;
    for (const rows of shapes) {
      const ins = await sb.from("org_test_defs").insert(rows as any).select("id").maybeSingle();
      if (!ins.error && ins.data?.id) return { parentTable: "org_test_defs", id: ins.data.id as string };
      lastErr = ins.error?.message ?? lastErr;
    }
    return { error: lastErr || "failed to create org_test_defs row" };
  } else {
    // fallback to legacy org_tests table
    let t = await sb
      .from("org_tests")
      .select("id")
      .eq("org_id", ORG_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!t.error && t.data?.id) return { parentTable: "org_tests", id: t.data.id as string };

    const shapes = [
      [{ org_id: ORG_ID, name: "Signature Test", mode: "full" }],
      [{ org_id: ORG_ID, name: "Signature Test" }],
      [{ org_id: ORG_ID, mode: "full" }],
      [{ org_id: ORG_ID }],
    ];
    let lastErr: string | null = null;
    for (const rows of shapes) {
      const ins = await sb.from("org_tests").insert(rows as any).select("id").maybeSingle();
      if (!ins.error && ins.data?.id) return { parentTable: "org_tests", id: ins.data.id as string };
      lastErr = ins.error?.message ?? lastErr;
    }
    return { error: lastErr || "failed to create org_tests row" };
  }
}

/** Insert question rows with schema-adaptive shapes. */
async function insertQuestions(sb: any, testId: string) {
  // probe columns
  const probe = await sb.from("org_test_questions").select("*").limit(1);
  const cols = new Set<string>();
  if (!probe.error && Array.isArray(probe.data) && probe.data[0]) {
    Object.keys(probe.data[0]).forEach((k) => cols.add(k));
  }
  const variants = [
    { key: "qnum", withPrompt: false, withSource: false },
    { key: "qnum", withPrompt: true, withSource: false },
    { key: "qnum", withPrompt: false, withSource: true },
    { key: "qnum", withPrompt: true, withSource: true },
    { key: "q_no", withPrompt: false, withSource: false },
    { key: "q_no", withPrompt: true, withSource: false },
    { key: "q_no", withPrompt: false, withSource: true },
    { key: "q_no", withPrompt: true, withSource: true },
  ] as const;

  let lastErr: string | null = null;
  for (const v of variants) {
    const rows = BASE.map((b) => {
      const r: any = { test_id: testId, [v.key]: b.qnum, text: b.text };
      if (v.withPrompt) r.prompt = b.text;
      if (v.withSource) r.source = "base";
      return r;
    });
    const ins = await sb.from("org_test_questions").insert(rows).select("id,qnum,q_no");
    if (!ins.error) return ins;
    lastErr = ins.error?.message ?? lastErr;
  }
  return { error: lastErr || "insert failed" };
}

async function insertAnswers(sb: any, ins: any) {
  const idByNum = new Map<number, string>();
  for (const row of (ins.data as any[]) || []) {
    const num = (row?.qnum ?? row?.q_no) as number;
    if (typeof num === "number") idByNum.set(num, row.id);
  }
  const aRows: any[] = [];
  for (const b of BASE) {
    const qid = idByNum.get(b.qnum)!;
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
  return sb.from("org_test_answers").insert(aRows).select("id");
}

/* ---------------- route ---------------- */

export async function GET() {
  const sb = getServiceClient();

  // 1) Ensure parent (org_test_defs with framework) or fallback
  const parent = await ensureParentTest(sb);
  if ("error" in parent) return NextResponse.json({ error: parent.error }, { status: 500 });

  // 2) Load existing questions
  let qs = await sb.from("org_test_questions").select("*").eq("test_id", parent.id);
  if (qs.error) return NextResponse.json({ error: qs.error.message }, { status: 500 });

  // 3) If empty, seed Q + A
  if (!qs.data || qs.data.length === 0) {
    const ins = await insertQuestions(sb, parent.id);
    if ((ins as any).error) return NextResponse.json({ error: (ins as any).error }, { status: 500 });

    const aIns = await insertAnswers(sb, ins);
    if (aIns.error) return NextResponse.json({ error: aIns.error.message }, { status: 500 });

    qs = await sb.from("org_test_questions").select("*").eq("test_id", parent.id);
    if (qs.error) return NextResponse.json({ error: qs.error.message }, { status: 500 });
  }

  // 4) Normalize and return
  const normalized = (qs.data as any[])
    .map((row) => ({
      id: row.id,
      qnum: (row.qnum ?? row.q_no ?? row.qno) as number,
      text: row.text as string,
    }))
    .sort((a, b) => (a.qnum ?? 0) - (b.qnum ?? 0));

  const qids = normalized.map((q) => q.id);
  const ans = await sb
    .from("org_test_answers")
    .select("id,question_id,text,ordinal")
    .in("question_id", qids);
  if (ans.error) return NextResponse.json({ error: ans.error.message }, { status: 500 });

  const byQ = new Map<string, any[]>();
  for (const a of (ans.data as any[]) || []) {
    const arr = byQ.get(a.question_id) || [];
    arr.push(a);
    byQ.set(a.question_id, arr);
  }

  const items = normalized.map((q) => ({
    id: q.id,
    qnum: q.qnum,
    text: q.text,
    answers: (byQ.get(q.id) || []).sort((a, b) => a.ordinal - b.ordinal),
  }));

  return NextResponse.json({ items });
}
