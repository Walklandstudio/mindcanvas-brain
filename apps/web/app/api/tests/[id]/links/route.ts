import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  try {
    // Ensure test exists
    const { data: test, error: testErr } = await supabase
      .from("tests")
      .select("id, org_id, is_active")
      .eq("id", params.id)
      .maybeSingle();
    if (testErr || !test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Insert link
    const { data: link, error: linkErr } = await supabase
      .from("test_links")
      .insert({
        test_id: test.id,
        org_id: test.org_id,
        status: "open",
        max_uses: 1,
      })
      .select("id, token, status, max_uses, use_count")
      .maybeSingle();

    if (linkErr || !link) {
      return NextResponse.json(
        { error: linkErr?.message ?? "Could not create link" },
        { status: 500 }
      );
    }

    return NextResponse.json({ link });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
