// apps/web/app/api/admin/tests/segment/add/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

/** Body shape:
 * {
 *   "question": "Which department are you in?",
 *   "options": ["Sales","Marketing","Engineering","Operations"]
 * }
 */
type Body = { question: string; options: string[] };

async function ensureFramework(sb: any): Promise<{ id: string } | { error: string }> {
  const fw = await sb
    .from("org_frameworks")
    .select("id")
    .eq("org_id", ORG_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!fw.error && fw.data?.id) return { id: fw.data.id as string };

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
  // Prefer org_test_defs if table exists
  const probeDefs = await sb.from("org_test_defs").select("id").limit(1);
  const useDefs = !(probeDefs.error && /relation .* does not exist|42P01/i.test(probeDefs.error.message));

  if (useDefs) {
    const fw = await ensureFramework(sb);
    if ("error" in fw) return { error: fw.error };

    const td = await sb
      .from("org_test_defs")
      .select("id")
      .eq("org_id", ORG_ID)
      .eq("framework_id", fw.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!td.error && td.data?.id) return { parentTable: "org_test_defs", id: td.data.id as string };

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
  }

  // Fallback: org_tests
  const t = await sb
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

export async function POST(req: Request) {
  const sb = getServiceClient();

  // Parse & validate
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.question || !Array.isArray(body.options) || body.options.length < 2) {
    return NextResponse.json(
      { error: "Provide 'question' and at least 2 'options'." },
      { status: 400 },
    );
  }

  // Parent test id
  const parent = await ensureParentTest(sb);
  if ("error" in parent) return NextResponse.json({ error: parent.error }, { status: 500 });
  const testId = parent.id;

  // Probe question columns (qnum vs q_no, prompt/source)
  const qProbe = await sb.from("org_test_questions").select("*").limit(1);
  const sampleQ = (!qProbe.error && Array.isArray(qProbe.data) && qProbe.data[0]) ? qProbe.data[0] : {};
  const hasQnum   = Object.prototype.hasOwnProperty.call(sampleQ, "qnum");
  const hasQNo    = Object.prototype.hasOwnProperty.call(sampleQ, "q_no");
  const hasPrompt = Object.prototype.hasOwnProperty.call(sampleQ, "prompt");
  const hasSource = Object.prototype.hasOwnProperty.call(sampleQ, "source");

  // Compute next question number (no RPC; TS-safe)
  const qMax = await sb
    .from("org_test_questions")
    .select("qnum,q_no")
    .eq("test_id", testId)
    .order("qnum", { ascending: false })
    .order("q_no", { ascending: false })
    .limit(1);

  const maxRow = Array.isArray(qMax.data) && qMax.data.length ? qMax.data[0] : null;
  const current = Number(maxRow?.qnum ?? maxRow?.q_no ?? 0);
  const nextNum = (Number.isFinite(current) ? current : 0) + 1;

  // Insert segmentation question
  const qRow: any = { test_id: testId, text: body.question };
  if (hasQnum || !hasQNo) qRow.qnum = nextNum;
  if (hasQNo) qRow.q_no = nextNum;
  if (hasPrompt) qRow.prompt = body.question;
  if (hasSource) qRow.source = "segment";

  const qIns = await sb.from("org_test_questions").insert(qRow).select("id").maybeSingle();
  if (qIns.error || !qIns.data?.id) {
    return NextResponse.json({ error: qIns.error?.message || "Could not insert question" }, { status: 500 });
  }
  const questionId = qIns.data.id as string;

  // Probe answers schema
  const aProbe = await sb.from("org_test_answers").select("*").limit(1);
  const sampleA = (!aProbe.error && Array.isArray(aProbe.data) && aProbe.data[0]) ? aProbe.data[0] : {};
  const hasProfileNum = Object.prototype.hasOwnProperty.call(sampleA, "profile_num");
  const hasFrequency  = Object.prototype.hasOwnProperty.call(sampleA, "frequency");

  // Build segmentation answers (zero points)
  const fullRows: any[] = body.options.map((opt, idx) => {
    const r: any = {
      question_id: questionId,
      ordinal: idx + 1,
      text: String(opt),
      points: 0,
    };
    if (hasProfileNum) r.profile_num = null;
    if (hasFrequency)  r.frequency  = null;
    return r;
  });

  // Insert answers; strip optional cols if needed
  const attempts = [
    fullRows,
    fullRows.map(({ profile_num, ...rest }) => rest),
    fullRows.map(({ frequency, ...rest }) => rest),
    fullRows.map(({ profile_num, frequency, ...rest }) => rest),
  ];

  let lastErr: string | null = null;
  for (const rows of attempts) {
    const ins = await sb.from("org_test_answers").insert(rows).select("id");
    if (!ins.error) {
      return NextResponse.json({ ok: true, question_id: questionId });
    }
    lastErr = ins.error?.message ?? lastErr;
  }

  return NextResponse.json({ error: lastErr || "Failed to insert answers" }, { status: 500 });
}
