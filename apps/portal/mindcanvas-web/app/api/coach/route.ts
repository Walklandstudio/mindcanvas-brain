import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getProfileContent } from "@/lib/profileContent";

/** Body: { submissionId: string, message?: string } */
export async function POST(req: Request) {
  let submissionId = "", message = "";
  try {
    const b = (await req.json()) as Record<string, unknown>;
    if (typeof b.submissionId === "string") submissionId = b.submissionId;
    if (typeof b.message === "string") message = b.message.trim();
  } catch {}

  if (!submissionId) return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });

  const db = supabaseServer();

  // 1) canonical results
  const tr = await db
    .from("test_results")
    .select("*")
    .eq("submission_id", submissionId)
    .limit(1)
    .maybeSingle();

  if (tr.error) return NextResponse.json({ error: tr.error.message }, { status: 500 });

  let resultRow = tr.data as Record<string, any> | null;

  // 2) fallback: view
  if (!resultRow) {
    const vr = await db
      .from("v_results_latest")
      .select("*")
      .eq("submission_id", submissionId)
      .limit(1)
      .maybeSingle();
    if (vr.error) return NextResponse.json({ error: vr.error.message }, { status: 500 });
    resultRow = (vr.data as Record<string, any>) ?? null;
  }

  if (!resultRow) {
    return NextResponse.json(
      { error: "No result for this submission. Ensure scoring has run." },
      { status: 404 }
    );
  }

  // 3) normalize fields commonly present in result rows
  const frequency =
    (resultRow.frequency as string | undefined) ??
    (resultRow.result?.frequency as string | undefined) ??
    (resultRow.freq as string | undefined) ??
    "";
  const profile =
    (resultRow.profile as string | undefined) ??
    (resultRow.result?.profile as string | undefined) ??
    (resultRow.profile_key as string | undefined) ??
    (resultRow.profile_name as string | undefined) ??
    "";

  // 4) fetch profile content from `profiles` (best-effort)
  const profileContent = profile ? await getProfileContent(db, profile) : null;

  // 5) simple rule-based advice you can extend
  const m = (message || "").toLowerCase();
  const advice: string[] = [];
  if (m.includes("conflict")) advice.push("Acknowledge interests → propose 2 options → agree next step.");
  if (m.includes("standup")) advice.push("Run 15-min standups: plan, blockers, dependencies, owners.");
  if (!advice.length) advice.push("Clarify desired outcome, list 3 actions, set owner + deadline.");

  return NextResponse.json({
    ok: true,
    submissionId,
    frequency,
    profile,
    profileContent, // strengths/watchouts/tips if present in table
    advice,
  });
}

