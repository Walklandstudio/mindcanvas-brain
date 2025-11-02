import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!, { auth: { persistSession: false } });

  const { data: link } = await db.from("portal.test_links").select("test_id").eq("token", params.token).maybeSingle();
  if (!link) return NextResponse.json({ error: "Invalid token", questions: [] }, { status: 404 });

  const { data: qs, error } = await db
    .from("portal.test_questions")
    .select("id, test_id, idx, \"order\", type, text, options")
    .eq("test_id", link.test_id)
    .order("idx", { ascending: true })
    .order("order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message, questions: [] }, { status: 500 });

  const questions = (qs ?? []).map((q: any) => ({
    id: q.id,
    order_index: q.idx ?? q.order ?? null,
    kind: q.type ?? "question",
    prompt: q.text ?? "",
    options: q.options ?? null,
  }));

  return NextResponse.json({ questions });
}
