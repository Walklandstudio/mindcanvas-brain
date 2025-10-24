import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  try {
    // 1) Resolve link + test by token
    const { data: link, error: linkErr } = await supabase
      .from("test_links")
      .select("*, test:tests(id, org_id, name, slug, is_active)")
      .eq("token", token)
      .maybeSingle();

    if (linkErr || !link) {
      return NextResponse.json({ error: "Invalid or unknown token" }, { status: 404 });
    }
    if (!link.test?.is_active) {
      return NextResponse.json({ error: "This test is not active" }, { status: 410 });
    }

    // 2) Increment link uses (best-effort; don't fail whole request)
    const { error: incErr } = await supabase.rpc("increment_test_link_use", {
      link_token: token,
    });
    if (incErr) {
      // Log but continue; not fatal for starting a session
      console.warn("increment_test_link_use error:", incErr.message);
    }

    // 3) Create taker record
    const { data: taker, error: takerErr } = await supabase
      .from("test_takers")
      .insert({
        link_token: token,
        test_id: link.test.id,
        org_id: link.test.org_id,
        status: "started",
      })
      .select()
      .maybeSingle();

    if (takerErr) {
      return NextResponse.json(
        { error: "Could not create test taker", details: takerErr.message },
        { status: 500 }
      );
    }

    // 4) Success payload
    return NextResponse.json({
      ok: true,
      next: `/t/${token}`, // questions page
      test: { id: link.test.id, name: link.test.name, slug: link.test.slug },
      link: { id: link.id, token: link.token },
      taker,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
