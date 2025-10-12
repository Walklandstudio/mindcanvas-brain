// apps/web/app/api/admin/tests/load/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

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

/** Try to read a table to see if it exists. */
async function tableExists(sb: any, table: string): Promise<boolean> {
  const res = await sb.rpc("exec_sql", {
    sql: `select to_regclass('public.${table}') is not null as ok`,
  }).maybeSingle();
  // If you don't have exec_sql RPC, fall back to probing with a harmless select:
  if (res?.data?.ok === true) return true;
  const probe = await sb.from(table).select("count").limit(1);
  return !probe.error;
}

/** Ensure a parent test row exists and return its id and table name used. */
async function ensureParentTest(sb: any): Promise<{ parentTable: "org_test_defs" | "org_tests"; id: string } | { error: string }> {
  // Prefer org_test_defs if present
  let parentTable: "org_test_defs" | "org_tests" = "org_test_defs";
  let probe = await sb.from("org_test_defs").select("id").eq("org_id", ORG_ID).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (probe.error && /relation .* does not exist|42P01/i.test(probe.error.message)) {
    parentTable = "org_tests";
    probe = await sb.from("org_tests").select("id").eq("org_id", ORG_ID).order("created_at", { ascending: false }).limit(1).maybeSingle();
  }

  if (!probe.error && probe.data?.id) {
    return { parentTable, id: probe.data.id as string };
  }

  // Insert shapes to satisfy possible NOT NULL columns (e.g., mode)
  const shapes =
    parentTable === "org_test_defs"
      ? [
          [{ org_id: ORG_ID, name: "Signature Test", mode: "full" }],
          [{ org_id: ORG_ID, name: "Signature Test" }],
          [{ org_id: ORG_ID, mode: "full" }],
          [{ org_id: ORG_ID }],
        ]
      : [
          [{ org_id: ORG_ID, name: "Signature Test", mode: "full" }],
          [{ org_id: ORG_ID, name: "Signature Test" }],
          [{ org_id: ORG_ID, mode: "full" }],
          [{ org_id: ORG_ID }],
        ];

  let lastErr: string | null = null;
  for (const rows of shapes) {
    const ins = await sb.from(parentTable).insert(rows as any).select("id").maybeSingle();
    if (!ins.error && ins.data?.id) {
      return { parentTable, id: ins.data.id as string };
    }
    lastErr = ins.error?.message ?? lastErr;
  }
  return { error: lastErr || `failed to create row in ${parentTable}` };
}

/** Insert question rows with schema-adaptive shapes. */
async function tryInsertQuestions(sb: any, testId: string) {
  // detect columns by making small probes
  const qProbe = await sb.from("org_test_questions").select("*").limit(1);
  const cols = new Set<string>();
  if (!qProbe.error && Array.isArray(qProbe.data) && qProbe.data[0]) {
    Object.keys(qProbe.data[0]).forEach((k) => cols.add(k));
  } else {
    // fallback: assume nothing; we will try multiple variants
  }

  const hasQnum = cols.has("qnum") || !cols.has("q_no"); // prefer qnum
  const hasQno = cols.has("q_no");
  const needsPrompt = cols.has("prompt");
  const needsSource = cols.has("source");

  // Build variants to satisfy NOT NULLs
  type Variant = { useQNo: boolean; withPrompt: boolean; withSource: boolean };
  const variants: Variant[] = [
    { useQNo: false, withPrompt: false, withSource: false },
    { useQNo: false, withPrompt: true, withSource: false },
    { useQNo: false, withPrompt: false, withSource: true },
    { useQNo: false, withPrompt: true, withSource: true },
    { useQNo: true, withPrompt: false, withSource: false },
    { useQNo: true, withPrompt: true, withSource: false },
    { useQNo: true, withPrompt: false, withSource: true },
    { useQNo: true, withPrompt: true, withSource: true },
  ];

  let lastErr: string | null = null;
  for (const v of variants) {
    const key = v.useQNo ? "q_no" : "qnum";
    const rows = BASE.map((b) => {
      const r: any = { test_id: testId, [key]: b.qnum, text: b.text };
      if (v.withPrompt) r.prompt = b.text;
      if (v.withSource) r.source = "base";
      return r;
    });
    const ins = await sb.from("org_test_questions").insert(rows).select("id,qnum,q_no");
    if (!ins.error) {
      return ins;
    }
    lastErr = ins.error?.message ?? lastErr;
  }
  return { error: lastErr || "insert failed" };
}

/** Seed answers for every question id mapped by qnum/q_no. */
async function insertAnswers(sb: any, ins: any) {
  const idByQnum = new Map<number, string>();
  for (const row of (ins.data as any[]) || []) {
    const num = (row?.qnum ?? row?.q_no) as number;
    if (typeof num === "number") idByQnum.set(num, row.id);
  }
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
  return sb.from("org_test_answers").insert(aRows).select("id");
}

export async function GET() {
  const sb = getServiceClient();

  // 1) Ensure parent exists (org_test_defs preferred)
  const parent = await ensureParentTest(sb);
  if ("error" in parent) {
    return NextResponse.json({ error: parent.error }, { status: 500 });
  }

  // 2) If questions already exist for this parent, load & return them
  let qs = await sb.from("org_test_questions").select("*").eq("test_id", parent.id);
  if (qs.error) return NextResponse.json({ error: qs.error.message }, { status: 500 });

  if (!qs.data || qs.data.length === 0) {
    // 3) Seed questions (with schema-adaptive shapes)
    const ins = await tryInsertQuestions(sb, parent.id);
    if ((ins as any).error) {
      // if FK violation specifically mentions org_test_defs, that means we used wrong parentTable
      return NextResponse.json({ error: (ins as any).error }, { status: 500 });
    }
    // 4) Seed answers
    const aIns = await insertAnswers(sb, ins);
    if (aIns.error) return NextResponse.json({ error: aIns.error.message }, { status: 500 });

    // re-read
    qs = await sb.from("org_test_questions").select("*").eq("test_id", parent.id);
    if (qs.error) return NextResponse.json({ error: qs.error.message }, { status: 500 });
  }

  // 5) Normalize & return
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
