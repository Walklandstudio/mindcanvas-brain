import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!, { auth: { persistSession: false } });

  // link
  const { data: link, error: linkErr } = await db
    .from("portal.test_links")
    .select("id, token, max_uses, use_count, test_id")
    .eq("token", params.token)
    .maybeSingle();
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
  if (!link)  return NextResponse.json({ error: "Invalid or unknown token" }, { status: 404 });

  // test
  const { data: test, error: testErr } = await db
    .from("portal.v_org_tests")
    .select("id, org_id, name, status, slug")
    .eq("id", link.test_id)
    .maybeSingle();
  if (testErr) return NextResponse.json({ error: testErr.message }, { status: 500 });
  if (!test)   return NextResponse.json({ error: "Test not found for this link" }, { status: 404 });
  if (test.status && test.status !== "active") {
    return NextResponse.json({ error: "This test is not active" }, { status: 410 });
  }

  // increment & taker (best-effort)
  try { await db.rpc("portal.increment_test_link_use", { link_token: params.token }); } catch {}
  try { await db.from("portal.test_takers").insert({ link_token: params.token, test_id: test.id, org_id: test.org_id, status: "started" }); } catch {}

  return NextResponse.json({ ok: true, next: `/t/${params.token}`, test: { id: test.id, name: test.name ?? null }, link: { token: link.token } });
}
