import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

export async function POST(req: Request) {
  const sb = supabaseAdmin();
  const { submissionId, qid, optionId, points } = await req.json().catch(() => ({}));
  if (!submissionId || !qid || !optionId)
    return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const { data: sub } = await sb
    .from("test_submissions")
    .select("answers,total_points")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });

  const answers = Array.isArray(sub.answers) ? sub.answers : [];
  answers.push({ qid, optionId, points: points ?? 0 });
  const total = (sub.total_points ?? 0) + (points ?? 0);

  const { error } = await sb
    .from("test_submissions")
    .update({ answers, total_points: total })
    .eq("id", submissionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, total_points: total });
}
