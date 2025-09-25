import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/** Body: { submissionId?: string, message?: string } */
export async function POST(req: Request) {
  let submissionId = "";
  let message = "";
  try {
    const bodyUnknown: unknown = await req.json();
    if (bodyUnknown && typeof bodyUnknown === "object") {
      const b = bodyUnknown as Record<string, unknown>;
      if (typeof b.submissionId === "string") submissionId = b.submissionId;
      if (typeof b.message === "string") message = b.message.trim();
    }
  } catch {
    /* no body is fine */
  }

  if (!submissionId) {
    return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
  }

  const supabase = supabaseServer();

  // 1) Try canonical results table first
  const { data: tr, error: trErr } = await supabase
    .from("test_results")
    .select("*")
    .eq("submission_id", submissionId)
    .limit(1)
    .maybeSingle();

  if (trErr) return NextResponse.json({ error: trErr.message }, { status: 500 });

  // 2) If not found, fall back to latest results view (if it carries submission_id)
  let resultRow = tr;
  if (!resultRow) {
    const { data: viewRow, error: vErr } = await supabase
      .from("v_results_latest")
      .select("*")
      .eq("submission_id", submissionId)
      .limit(1)
      .maybeSingle();
    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
    resultRow = viewRow ?? null;
  }

  if (!resultRow) {
    return NextResponse.json(
      { error: "Result not found. Make sure the submission is finished." },
      { status: 404 }
    );
  }

  // Expect these common fields; keep robust if schema differs
  const frequency =
    (resultRow.frequency as string | undefined) ??
    (resultRow.result?.frequency as string | undefined) ??
    "";
  const profile =
    (resultRow.profile as string | undefined) ??
    (resultRow.result?.profile as string | undefined) ??
    "";
  const scores =
    (resultRow.scores as unknown) ??
    (resultRow.result?.frequencies as unknown) ??
    null;

  // 3) Enrich from `profiles` table if present (best-effort)
  let profileInfo: Record<string, unknown> | null = null;
  if (profile) {
    const { data: p1, error: pErr1 } = await supabase
      .from("profiles")
      .select("*")
      .eq("key", profile) // if you store a key/slug
      .limit(1)
      .maybeSingle();

    if (!pErr1 && p1) profileInfo = p1;
    if (!profileInfo) {
      const { data: p2 } = await supabase
        .from("profiles")
        .select("*")
        .eq("name", profile) // or by printed name
        .limit(1)
        .maybeSingle();
      if (p2) profileInfo = p2;
    }
  }

  // 4) Simple rule-based advice (customize as you like)
  const advice: string[] = [];
  if (typeof message === "string" && message) {
    const m = message.toLowerCase();
    if (m.includes("conflict")) advice.push("Acknowledge interests, propose 2 options, agree on next step.");
    if (m.includes("standup")) advice.push("Use a 15-min standup: plan, blockers, dependencies.");
    if (advice.length === 0) advice.push("Clarify outcome, list 3 actions, set an owner + deadline.");
  }

  return NextResponse.json({
    ok: true,
    submissionId,
    frequency,
    profile,
    scores,
    profileInfo,
    advice,
  });
}
