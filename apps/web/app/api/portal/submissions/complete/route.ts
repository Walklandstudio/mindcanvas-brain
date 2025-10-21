import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

export async function POST(req: Request) {
  const sb = supabaseAdmin();
  const { submissionId } = await req.json().catch(() => ({}));
  if (!submissionId) return NextResponse.json({ error: "submissionId required" }, { status: 400 });

  const { data: sub } = await sb
    .from("test_submissions")
    .select("id,test_id,total_points")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: test } = await sb
    .from("org_tests")
    .select("id, kind, config")
    .eq("id", sub.test_id)
    .maybeSingle();
  if (!test) return NextResponse.json({ error: "invalid test" }, { status: 400 });

  const total = sub.total_points ?? 0;
  const cfg = (test.config as any) || {};
  const mode = test.kind === "full" ? "full" : "free";
  const bands: any[] = cfg?.[mode]?.bands ?? [];

  let frequency: string | null = null;
  let profile: number | null = null;
  for (const b of bands) {
    if (total >= b.min && total <= b.max) {
      frequency = b.frequency ?? null;
      profile = b.profile ?? null;
      break;
    }
  }

  const { error } = await sb
    .from("test_submissions")
    .update({ completed_at: new Date().toISOString(), frequency, profile })
    .eq("id", submissionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ frequency, profile, total_points: total });
}
