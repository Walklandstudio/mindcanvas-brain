import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { extractIdFromUrl } from "@/lib/routeParams";

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export async function POST(req: Request) {
  const id = extractIdFromUrl(req.url);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseServer();

  // Get scored submission (you already store scores on mc_submissions)
  const sub = await db.from("mc_submissions").select("*").eq("id", id).limit(1).maybeSingle();
  if (sub.error) return NextResponse.json({ error: sub.error.message }, { status: 500 });
  if (!sub.data) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const s = sub.data as Record<string, unknown>;
  const frequency = typeof s["full_frequency"] === "string" ? (s["full_frequency"] as string) : null;
  const profile   = typeof s["full_profile_code"] === "string" ? (s["full_profile_code"] as string) : null;
  const scores    = isObj(s["scores_json"]) ? (s["scores_json"] as Record<string, unknown>) : null;

  // Build a normalized JSON payload
  const result = {
    submission_id: id,
    frequency,
    profile,
    scores,
    total_score: typeof s["total_score"] === "number" ? (s["total_score"] as number) : null,
    source: "mc_submissions",
  };

  // Upsert into test_results (supports either `submission_id` or `id` as PK/unique)
  // Adjust the ON CONFLICT target if your constraint differs.
  let upsert = await db.from("test_results").upsert(
    {
      submission_id: id, // if your table uses 'id' instead, switch this key to id
      frequency,
      profile,
      result,
      scores, // optional separate column if you have it
    },
    { onConflict: "submission_id" } // change to "id" if that's your unique column
  ).select().maybeSingle();

  if (upsert.error) {
    // Try again with 'id' as the conflict target in case your schema differs
    upsert = await db.from("test_results").upsert(
      {
        id, // fallback if your table uses 'id'
        frequency,
        profile,
        result,
        scores,
      },
      { onConflict: "id" }
    ).select().maybeSingle();
    if (upsert.error) return NextResponse.json({ error: upsert.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: upsert.data ?? null });
}
