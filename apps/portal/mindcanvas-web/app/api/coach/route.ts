// app/api/coach/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getProfileContent } from "@/lib/profileContent";

/** Body: { submissionId: string, message?: string } */
type CoachRequest = {
  submissionId: string;
  message?: string;
};

type ResultJson = {
  frequency?: string | null;
  profile?: string | null;
  frequencies?: unknown; // map of frequency scores (shape can vary)
} | null;

type ResultRow = {
  submission_id?: string | null;
  frequency?: string | null;
  profile?: string | null;
  result?: ResultJson;
  profile_key?: string | null;
  profile_name?: string | null;
  scores?: unknown;
  created_at?: string | null;
  /** some schemas use `freq` instead of `frequency` */
  freq?: string | null;
} | null;

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

async function parseBody(req: Request): Promise<CoachRequest | null> {
  try {
    const raw: unknown = await req.json();
    if (!isObject(raw)) return null;
    const sub = raw["submissionId"];
    const msg = raw["message"];
    if (typeof sub !== "string") return null;
    return {
      submissionId: sub,
      message: typeof msg === "string" ? msg.trim() : undefined,
    };
  } catch {
    return null;
  }
}

function normalizeResult(row: ResultRow) {
  const frequency =
    row?.frequency ??
    row?.result?.frequency ??
    row?.freq ??
    null;

  const profile =
    row?.profile ??
    row?.result?.profile ??
    row?.profile_key ??
    row?.profile_name ??
    null;

  const scores =
    row?.scores ??
    row?.result?.frequencies ??
    null;

  return {
    frequency: frequency ?? "",
    profile: profile ?? "",
    scores,
  };
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body?.submissionId) {
    return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
  }

  const db = supabaseServer();

  // 1) Try canonical results table first (select specific columns to keep types narrow)
  const tr = await db
    .from("test_results")
    .select(
      "submission_id, frequency, profile, result, profile_key, profile_name, scores, created_at, freq"
    )
    .eq("submission_id", body.submissionId)
    .limit(1)
    .maybeSingle();

  if (tr.error) {
    return NextResponse.json({ error: tr.error.message }, { status: 500 });
  }

  let row: ResultRow = tr.data ?? null;

  // 2) Fallback to latest-results view
  if (!row) {
    const vr = await db
      .from("v_results_latest")
      .select(
        "submission_id, frequency, profile, result, profile_key, profile_name, scores, created_at, freq"
      )
      .eq("submission_id", body.submissionId)
      .limit(1)
      .maybeSingle();

    if (vr.error) {
      return NextResponse.json({ error: vr.error.message }, { status: 500 });
    }
    row = vr.data ?? null;
  }

  if (!row) {
    return NextResponse.json(
      { error: "No result for this submission. Ensure scoring has completed." },
      { status: 404 }
    );
  }

  const { frequency, profile, scores } = normalizeResult(row);

  // 3) Load profile content from `profiles` table if present (best-effort)
  const profileContent = profile ? await getProfileContent(db, profile) : null;

  // 4) Simple rules you can extend (LLM optional)
  const m = (body.message ?? "").toLowerCase();
  const advice: string[] = [];
  if (m.includes("conflict")) advice.push("Acknowledge interests → propose 2 options → agree next step.");
  if (m.includes("standup")) advice.push("Run 15-min standups: plan, blockers, dependencies, owners.");
  if (!advice.length) advice.push("Clarify desired outcome, list 3 actions, set owner + deadline.");

  return NextResponse.json({
    ok: true,
    submissionId: body.submissionId,
    frequency,
    profile,
    scores,
    profileContent,
    advice,
  });
}

