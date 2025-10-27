import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!, { auth: { persistSession: false } }
  );
  const token = params.token;

  try {
    const { data: link } = await supabase
      .from("test_links")
      .select("test_id")
      .eq("token", token)
      .maybeSingle();
    if (!link) return NextResponse.json({ error: "Invalid token", questions: [] }, { status: 404 });

    // Adjust these table names if needed; returns [] instead of throwing
    const trySelect = async (table: string) => {
      const { data } = await supabase
        .from(table)
        .select("id, test_id, order_index, kind, prompt, options")
        .eq("test_id", link.test_id)
        .order("order_index", { ascending: true });
      return data ?? [];
    };

    let questions = await trySelect("test_questions");
    if (!questions.length) questions = await trySelect("questions_view");

    return NextResponse.json({ questions });
  } catch (e: any) {
    return NextResponse.json({ questions: [], error: e?.message ?? "Server error" }, { status: 200 });
  }
}
