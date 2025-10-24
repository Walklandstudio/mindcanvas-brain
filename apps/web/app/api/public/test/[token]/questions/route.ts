import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  try {
    const { data: link } = await supabase
      .from("test_links")
      .select("test_id")
      .eq("token", token)
      .maybeSingle();

    if (!link) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const { data: questions } = await supabase
      .from("test_questions")
      .select("id, test_id, order_index, kind, prompt, options")
      .eq("test_id", link.test_id)
      .order("order_index", { ascending: true });

    return NextResponse.json({ questions: questions ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error", questions: [] }, { status: 200 });
  }
}
