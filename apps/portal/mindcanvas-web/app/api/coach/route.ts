// app/api/coach/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getProfileContent } from "@/lib/profileContent";

type CoachRequest = { submissionId: string; message?: string };

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function getStr(o: Record<string, unknown>, key: string): string | null {
  const v = o[key];
  return typeof v === "string" ? v : null;
}
function getNestedStr(o: Record<string, unknown>, parent: string, child: string): string | null {
  const p = o[parent];
  if (!isObj(p)) return null;
  const v = (p as Record<string, unknown>)[child];
  return typeof v === "string" ? v : null;
}

async function parseBody(req: Request): Promise<CoachRequest | null> {
  try {
    const raw: unknown = await req.json();
    if (!isObj(raw)) return null;
    const sub = raw["submissionId"];
    const msg = raw["message"];
    if (typeof sub !== "string") return null;
    return { submissionId: sub, message: typeof msg === "string" ? msg.trim() : undefined };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });

  const db = supabaseServer();

  // Look up the result row by trying common ID column names
  const idCols = ["submission_id", "submissionId", "mc_submission_id", "submission", "id"] as const;
  const pick = async (table: string) => {
    for (const col of idCols) {
      const r = await db.from(table).select("*").eq(col, body.submissionId).limit(1).maybeSingle();
      if (!r.error && r.data) return r.data as Record<string, unknown>;
    }
    return null;
  };

  let row = await pick("test_results");
  if (!row) row = await pick("v_results_latest");

  // If still not found, return generic advice and flag it
  if (!row) {
    const m = (body.message ?? "").toLowerCase();
    const advice: string[] = [];
    if (m.includes("conflict")) advice.push("Acknowledge interests → propose 2 options → agree next step.");
    if (m.includes("standup")) advice.push("Run 15-min standups: plan, blockers, dependencies, owners.");
    if (!advice.length) advice.push("Clarify outcome, list 3 actions, assign owner + deadline.");
    return NextResponse.json({
      ok: true,
      needsResult: true,
      frequency: null,
      profile: null,
      profileContent: null,
      advice,
    });
  }

  // ✅ Safely extract strings (never an object)
  const frequency =
    getStr(row, "frequency") ??
    getStr(row, "freq") ??
    getNestedStr(row, "result", "frequency") ??
    "";

  const profileKey =
    getStr(row, "profile") ??
    getStr(row, "profile_key") ??
    getStr(row, "profile_name") ??
    getNestedStr(row, "result", "profile") ??
    "";

  const profileContent = profileKey ? await getProfileContent(db, profileKey) : null;

  const m = (body.message ?? "").toLowerCase();
  const advice: string[] = [];
  if (m.includes("conflict")) advice.push("Acknowledge interests → propose 2 options → agree next step.");
  if (m.includes("standup")) advice.push("Run 15-min standups: plan, blockers, dependencies, owners.");
  if (!advice.length) advice.push("Clarify outcome, list 3 actions, assign owner + deadline.");

  return NextResponse.json({
    ok: true,
    needsResult: false,
    frequency,
    profile: profileKey,
    profileContent,
    advice,
  });
}

