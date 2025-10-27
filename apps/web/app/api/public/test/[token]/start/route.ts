import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!, { auth: { persistSession: false } }
  );
  const token = params.token;

  try {
    // link (single row, no join ambiguity)
    const { data: link, error: linkErr } = await supabase
      .from("test_links")
      .select("id, token, status, max_uses, use_count, test_id, org_id")
      .eq("token", token)
      .maybeSingle();
    if (linkErr || !link) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

    // test (single row)
    const { data: test, error: testErr } = await supabase
      .from("tests")
      .select("id, org_id, name, slug, is_active")
      .eq("id", link.test_id)
      .maybeSingle();
    if (testErr || !test) return NextResponse.json({ error: "Test not found for token" }, { status: 404 });
    if (!test.is_active) return NextResponse.json({ error: "This test is not active" }, { status: 410 });

    // best-effort increment
    const { error: incErr } = await supabase.rpc("increment_test_link_use", { link_token: token });
    if (incErr) console.warn("increment_test_link_use:", incErr.message);

    // create taker
    const { data: taker, error: takerErr } = await supabase
      .from("test_takers")
      .insert({
        link_token: token,
        test_id: test.id,
        org_id: test.org_id ?? link.org_id,
        status: "started",
      })
      .select("id, link_token, status")
      .maybeSingle();
    if (takerErr || !taker) {
      return NextResponse.json({ error: "Could not create test taker", details: takerErr?.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      next: `/t/${token}`,
      test: { id: test.id, name: test.name, slug: test.slug },
      link: { id: link.id, token: link.token },
      taker,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
