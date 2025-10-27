import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { testId: string } }
) {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  // 1) Confirm test exists
  const { data: test } = await s
    .from("tests")
    .select("id, name, slug, is_active")
    .eq("id", params.testId)
    .maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found", questions: [] }, { status: 404 });

  // 2) Try common question sources (adjust names if your schema differs)
  const tryTable = async (table: string) => {
    const { data } = await s
      .from(table)
      .select("id, test_id, order_index, kind, prompt, options")
      .eq("test_id", params.testId)
      .order("order_index", { ascending: true });
    return data ?? [];
  };

  let questions = await tryTable("test_questions");
  if (!questions.length) questions = await tryTable("questions_view");
  if (!questions.length) questions = await tryTable("questions"); // last-resort

  return NextResponse.json({
    test: { id: test.id, name: test.name, slug: test.slug, is_active: test.is_active },
    questions,
  });
}
