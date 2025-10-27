import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  try {
    // resolve test_id from token
    const { data: link } = await db
      .from("test_links")
      .select("test_id")
      .eq("token", params.token)
      .maybeSingle();
    if (!link) return NextResponse.json({ error: "Invalid token", questions: [] }, { status: 404 });

    // your schema: test_questions has "order", "type", "text", "options"
    const { data: qs, error } = await db
      .from("test_questions")
      .select("id, test_id, \"order\", type, text, options, kind, idx")
      .eq("test_id", link.test_id)
      .order("idx", { ascending: true })    // prefer idx if present, else "order"
      .order("order", { ascending: true });
    if (error) return NextResponse.json({ error: error.message, questions: [] }, { status: 500 });

    // normalize to a friendly shape the UI can render
    const questions = (qs ?? []).map((q: any) => ({
      id: q.id,
      order_index: q.idx ?? q.order ?? null,
      kind: q.type ?? q.kind ?? "question",
      prompt: q.text ?? "",
      options: q.options ?? null,
    }));

    return NextResponse.json({ questions });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error", questions: [] }, { status: 500 });
  }
}
