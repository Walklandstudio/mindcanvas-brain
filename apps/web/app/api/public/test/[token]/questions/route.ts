import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );
  const token = params.token;

  try {
    // Map token -> test_id
    const { data: link, error: linkErr } = await supabase
      .from("test_links")
      .select("test_id")
      .eq("token", token)
      .maybeSingle();

    if (linkErr || !link) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    // Try common sources for questions
    let questions: any[] | null = null;

    // 1) test_questions
    if (!questions) {
      const { data } = await supabase
        .from("test_questions")
        .select("id, test_id, order_index, kind, prompt, options")
        .eq("test_id", link.test_id)
        .order("order_index", { ascending: true });
      if (data?.length) questions = data;
    }

    // 2) questions_view
    if (!questions) {
      const { data } = await supabase
        .from("questions_view")
        .select("id, test_id, order_index, kind, prompt, options")
        .eq("test_id", link.test_id)
        .order("order_index", { ascending: true });
      if (data?.length) questions = data;
    }

    // 3) fallback – empty list instead of error
    return NextResponse.json({ questions: questions ?? [] });
  } catch (e: any) {
    // Return empty list with error text (visible in UI)
    return NextResponse.json(
      { questions: [], error: e?.message ?? "Server error" },
      { status: 200 }
    );
  }
}
