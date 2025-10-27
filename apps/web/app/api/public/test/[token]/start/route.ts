import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LinkRow = {
  id: string;
  token: string;
  max_uses: number | null;
  use_count: number | null;
  test_id: string;
};

type TestRow = Record<string, any>; // tolerate schema differences

export async function POST(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  try {
    // 1) Link by token
    const { data: link, error: linkErr } = await supabase
      .from("test_links")
      .select("id, token, max_uses, use_count, test_id")
      .eq("token", params.token)
      .maybeSingle<LinkRow>();
    if (linkErr) return NextResponse.json({ error: `Link lookup failed: ${linkErr.message}` }, { status: 500 });
    if (!link)  return NextResponse.json({ error: "Invalid or unknown token" }, { status: 404 });

    // 2) Test row (select * to avoid missing columns)
    const { data: test, error: testErr } = await supabase
      .from("tests")
      .select("*")
      .eq("id", link.test_id)
      .maybeSingle<TestRow>();
    if (testErr) return NextResponse.json({ error: `Test lookup failed: ${testErr.message}` }, { status: 500 });
    if (!test)   return NextResponse.json({ error: "Test not found for this link" }, { status: 404 });

    // Treat various flags as "inactive"
    const inactive =
      test?.is_active === false ||
      test?.active === false ||
      test?.archived === true;
    if (inactive) {
      return NextResponse.json({ error: "This test is not active" }, { status: 410 });
    }

    // 3) Best-effort use increment
    try {
      await supabase.rpc("increment_test_link_use", { link_token: params.token });
    } catch {}

    // 4) Best-effort taker record
    try {
      await supabase
        .from("test_takers")
        .insert({
          link_token: params.token,
          test_id: test.id,
          org_id: test.org_id,
          status: "started",
        })
        .select("id")
        .maybeSingle();
    } catch {}

    // 5) Success
    return NextResponse.json({
      ok: true,
      next: `/t/${params.token}`,
      test: { id: test.id, name: test.name ?? null },
      link: { id: link.id, token: link.token },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
