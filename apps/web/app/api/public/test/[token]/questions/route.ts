import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );
  try {
    const { data: link } = await supabase.from("test_links").select("test_id").eq("token", params.token).maybeSingle();
    if (!link) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

    // Adjust table/columns here to your schema; this won’t crash if empty
    const { data: questions } = await supabase
      .from("test_questions")
      .select("id, order_index, kind, prompt, options")
      .eq("test_id", link.test_id)
      .order("order_index", { ascending: true });

    return NextResponse.json({ questions: questions ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error", questions: [] }, { status: 200 });
  }
}
