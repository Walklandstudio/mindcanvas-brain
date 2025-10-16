export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

/* ---------- seed data (same style as your loader) ---------- */
type BaseAnswer = {
  ordinal: number; text: string; points: number;
  profile_num?: number; frequency?: "A" | "B" | "C" | "D";
};
type BaseQ = { qnum: number; text: string; answers: BaseAnswer[] };

function seedBase(count: number): BaseQ[] {
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
  return BASE.slice(0, Math.min(count, BASE.length));
}

/* ---------- helpers to adapt to your schema variants ---------- */

async function ensureFramework(sb: any) {
  // mirror your loader's logic
  let fw = await sb
    .from("org_frameworks")
    .select("id")
    .eq("org_id", ORG_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!fw.error && fw.data?.id) return fw.data.id as string;

  const shapes = [
    [{ org_id: ORG_ID, name: "Signature", version: 1 }],
    [{ org_id: ORG_ID, name: "Signature" }],
    [{ org_id: ORG_ID, version: 1 }],
    [{ org_id: ORG_ID }],
  ];
  for (const rows of shapes) {
    const ins = await sb.from("org_frameworks").insert(rows as any).select("id").maybeSingle();
    if (!ins.error && ins.data?.id) return ins.data.id as string;
  }
  throw new Error("failed to create org_frameworks row");
}

async function chooseParentTable(sb: any) {
  const defsProbe = await sb.from("org_test_defs").select("id").limit(1);
  const useDefs = !(defsProbe.error && /relation .* does not exist|42P01/i.test(defsProbe.error.message));
  return useDefs ? "org_test_defs" : "org_tests";
}

async function createParent(sb: any, table: "org_test_defs" | "org_tests", fwId?: string, mode?: "free" | "full") {
  const rows =
    table === "org_test_defs"
      ? [{ org_id: ORG_ID, framework_id: fwId, name: mode === "free" ? "Signature Test (Free)" : "Signature Test", mode: mode ?? "full" }]
      : [{ org_id: ORG_ID, name: mode === "free" ? "Signature Test (Free)" : "Signature Test", mode: mode ?? "full" }];

  const ins = await sb.from(table).insert(rows as any).select("id").maybeSingle();
  if (ins.error || !ins.data?.id) throw new Error(ins.error?.message || "failed to create parent test");
  return ins.data.id as string;
}

async function insertQuestions(sb: any, testId: string, base: BaseQ[]) {
  const variants = [
    { key: "qnum", withPrompt: false, withSource: false },
    { key: "qnum", withPrompt: true,  withSource: false },
    { key: "qnum", withPrompt: false, withSource: true  },
    { key: "qnum", withPrompt: true,  withSource: true  },
    { key: "q_no", withPrompt: false, withSource: false },
    { key: "q_no", withPrompt: true,  withSource: false },
    { key: "q_no", withPrompt: false, withSource: true  },
    { key: "q_no", withPrompt: true,  withSource: true  },
  ] as const;

  let lastErr: string | null = null;
  for (const v of variants) {
    const rows = base.map((b) => {
      const r: any = { test_id: testId, [v.key]: b.qnum, text: b.text };
      if (v.withPrompt) r.prompt = b.text;
      if (v.withSource) r.source = "base";
      return r;
    });
    const ins = await sb.from("org_test_questions").insert(rows).select("id,qnum,q_no");
    if (!ins.error) return ins.data as any[];
    lastErr = ins.error?.message ?? lastErr;
  }
  throw new Error(lastErr || "insert questions failed");
}

async function insertAnswers(sb: any, qRows: any[], base: BaseQ[]) {
  const aProbe = await sb.from("org_test_answers").select("*").limit(1);
  const sample = (!aProbe.error && Array.isArray(aProbe.data) && aProbe.data[0]) ? aProbe.data[0] : {};
  const hasProfileNum = Object.prototype.hasOwnProperty.call(sample, "profile_num");
  const hasFrequency = Object.prototype.hasOwnProperty.call(sample, "frequency");

  // map qnum -> id
  const idByNum = new Map<number, string>();
  for (const row of qRows) {
    const num = (row?.qnum ?? row?.q_no) as number;
    if (typeof num === "number" && row?.id) idByNum.set(num, row.id as string);
  }

  const rowsFull: any[] = [];
  for (const b of base) {
    const qid = idByNum.get(b.qnum);
    if (!qid) continue;
    for (const a of b.answers) {
      const r: any = { question_id: qid, ordinal: a.ordinal, text: a.text, points: a.points };
      if (hasProfileNum && typeof a.profile_num === "number") r.profile_num = a.profile_num;
      if (hasFrequency && a.frequency) r.frequency = a.frequency;
      rowsFull.push(r);
    }
  }

  const attempts = [
    rowsFull,
    rowsFull.map(({ profile_num, ...rest }) => rest),
    rowsFull.map(({ frequency, ...rest }) => rest),
    rowsFull.map(({ profile_num, frequency, ...rest }) => rest),
  ];

  let lastErr: string | null = null;
  for (const rows of attempts) {
    const ins = await sb.from("org_test_answers").insert(rows).select("id");
    if (!ins.error) return;
    lastErr = ins.error?.message ?? lastErr;
  }
  throw new Error(lastErr || "insert answers failed");
}

/* ---------- route ---------- */

export async function POST(req: Request) {
  try {
    const { mode } = await req.json().catch(() => ({ mode: "full" }));
    const count = mode === "free" ? 5 : 20;
    const base = seedBase(count);

    const sb = getServiceClient();

    const table = await chooseParentTable(sb);
    const fwId = table === "org_test_defs" ? await ensureFramework(sb) : undefined;
    const parentId = await createParent(sb, table, fwId, mode);

    const qRows = await insertQuestions(sb, parentId, base);
    await insertAnswers(sb, qRows, base);

    return NextResponse.json({ ok: true, id: parentId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Create failed" }, { status: 400 });
  }
}
