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

type OrgTestRow = {
  id: string;
  org_id: string | null;
  name: string | null;
  status: string | null; // "active" | "archived"
  slug: string | null;
};

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  try {
    // 1) Link by token
    const { data: link, error: linkErr } = await db
      .from("test_links")
      .select("id, token, max_uses, use_count, test_id")
      .eq("token", params.token)
      .maybeSingle<LinkRow>();
    if (linkErr) return NextResponse.json({ error: `Link lookup failed: ${linkErr.message}` }, { status: 500 });
    if (!link)  return NextResponse.json({ error: "Invalid or unknown token" }, { status: 404 });

    // 2) Test row from org_tests
    const { data: test, error: testErr } = await db
      .from("org_tests")
      .select("id, org_id, name, status, slug")
      .eq("id", link.test_id)
      .maybeSingle<OrgTestRow>();
    if (testErr) return NextResponse.json({ error: `Test lookup failed: ${testErr.message}` }, { status: 500 });
    if (!test)   return NextResponse.json({ error: "Test not found for this link" }, { status: 404 });

    // inactive if status is not "active"
    if (test.status && test.status !== "active") {
      return NextResponse.json({ error: "This test is not active" }, { status: 410 });
    }

    // 3) Increment uses (best-effort)
    try {
      await db.rpc("increment_test_link_use", { link_token: params.token });
    } catch {}

    // 4) Create a test taker record (best-effort)
    try {
      await db
        .from("test_takers")
        .insert({
          link_token: params.token,
          test_id: test.id,
          org_id: test.org_id ?? null,
          status: "started",
        })
        .select("id")
        .maybeSingle();
    } catch {}

    // 5) Success
    return NextResponse.json({
      ok: true,
      next: `/t/${params.token}`,
      test: { id: test.id, name: test.name ?? null, slug: test.slug ?? null },
      link: { id: link.id, token: link.token },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
