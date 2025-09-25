import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getProfileContent } from "@/lib/profileContent";

type CoachRequest = { submissionId: string; message?: string };

function isObj(x: unknown): x is Record<string, unknown> { return typeof x === "object" && x !== null; }
function getStr(o: Record<string, unknown>, key: string): string | null { const v = o[key]; return typeof v === "string" ? v : null; }
function getNestedStr(o: Record<string, unknown>, parent: string, child: string): string | null {
  const p = o[parent]; if (!isObj(p)) return null; const v = (p as Record<string, unknown>)[child]; return typeof v === "string" ? v : null;
}
function getNestedRecord(o: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const v = o[key]; return isObj(v) ? (v as Record<string, unknown>) : null;
}
function topKeyByNumber(rec: Record<string, unknown> | null): string | null {
  if (!rec) return null; let bestKey: string | null = null; let bestVal = -Infinity;
  for (const [k, v] of Object.entries(rec)) { const n = typeof v === "number" ? v : Number(v); if (Number.isFinite(n) && n > bestVal) { bestVal = n; bestKey = k; } }
  return bestKey;
}
async function parseBody(req: Request): Promise<CoachRequest | null> {
  try { const raw: unknown = await req.json(); if (!isObj(raw)) return null;
    const sub = raw["submissionId"]; const msg = raw["message"];
    if (typeof sub !== "string") return null;
    return { submissionId: sub, message: typeof msg === "string" ? msg.trim() : undefined };
  } catch { return null; }
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  if (!body) return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });

  const db = supabaseServer();
  const idCols = ["submission_id","submissionId","mc_submission_id","submission","id"] as const;
  const pick = async (table: string) => {
    for (const col of idCols) {
      const r = await db.from(table).select("*").eq(col, body.submissionId).limit(1).maybeSingle();
      if (!r.error && r.data) return r.data as Record<string, unknown>;
    }
    return null;
  };

  // Try results stores first
  let row = await pick("test_results");
  if (!row) row = await pick("v_results_latest");

  // Fallback: read directly from mc_submissions (you have scoring columns here)
  if (!row) {
    const sub = await db.from("mc_submissions").select("*").eq("id", body.submissionId).limit(1).maybeSingle();
    if (sub.error) return NextResponse.json({ error: sub.error.message }, { status: 500 });
    if (sub.data) {
      const s = sub.data as Record<string, unknown>;
      const frequency = getStr(s, "full_frequency") ?? getNestedStr(s, "result", "frequency") ?? "";
      let profileKey = getStr(s, "full_profile_code") ?? getNestedStr(s, "result", "profile") ?? "";
      if (!profileKey) {
        const scores = getNestedRecord(s, "scores_json");
        const byProfile = scores ? getNestedRecord(scores, "profiles") : null;
        profileKey = topKeyByNumber(byProfile) ?? "";
      }
      if (frequency || profileKey) {
        const profileContent = profileKey ? await getProfileContent(db, profileKey) : null;
        const m = (body.message ?? "").toLowerCase();
        const advice: string[] = [];
        if (m.includes("conflict")) advice.push("Acknowledge interests → propose 2 options → agree next step.");
        if (m.includes("standup")) advice.push("Run 15-min standups: plan, blockers, dependencies, owners.");
        if (!advice.length) advice.push("Clarify outcome, list 3 actions, assign owner + deadline.");
        return NextResponse.json({ ok: true, needsResult: false, frequency, profile: profileKey, profileContent, advice });
      }
    }
  }

  // Generic fallback
  const m = (body.message ?? "").toLowerCase();
  const advice: string[] = [];
  if (m.includes("conflict")) advice.push("Acknowledge interests → propose 2 options → agree next step.");
  if (m.includes("standup")) advice.push("Run 15-min standups: plan, blockers, dependencies, owners.");
  if (!advice.length) advice.push("Clarify outcome, list 3 actions, assign owner + deadline.");
  return NextResponse.json({ ok: true, needsResult: true, frequency: null, profile: null, profileContent: null, advice });
}
