import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const sb = supabaseAdmin();

  const { data: link } = await sb
    .from("test_links")
    .select("id, org_id, test_id")
    .eq("token", params.token)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "invalid link" }, { status: 404 });

  // Adapt names if your tables differ (legacy vs new).
  const { data: qs, error } = await sb
    .from("test_questions")
    .select("id, prompt, order_index")
    .eq("test_id", link.test_id)
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const qIds = (qs ?? []).map((q) => q.id);
  const { data: ops } = await sb
    .from("test_options")
    .select("id, question_id, label, points")
    .in("question_id", qIds.length ? qIds : ["00000000-0000-0000-0000-000000000000"]);

  const byQ = new Map<string, any[]>();
  (ops ?? []).forEach((o) => {
    const arr = byQ.get(o.question_id) ?? [];
    arr.push({ id: o.id, label: o.label, points: o.points ?? 0 });
    byQ.set(o.question_id, arr);
  });

  const questions = (qs ?? []).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: byQ.get(q.id) ?? [],
  }));

  return NextResponse.json({ ok: true, questions });
}
