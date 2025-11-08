import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  const body = await req.json();
  const { orgId, testId, showResults, hiddenResultsMessage } = body || {};

  if (!orgId || !testId || typeof showResults !== "boolean") {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const sb = createClient().schema("portal");

  // 1) ensure org + test exist
  const { data: org, error: orgErr } = await sb
    .from("orgs").select("id, slug").eq("id", orgId).maybeSingle();
  if (orgErr || !org) return NextResponse.json({ ok: false, error: "Org not found" }, { status: 400 });

  const { data: test, error: testErr } = await sb
    .from("tests").select("id, name").eq("id", testId).maybeSingle();
  if (testErr || !test) return NextResponse.json({ ok: false, error: "Test not found" }, { status: 400 });

  // 2) create link token + row
  const token = randomBytes(16).toString("hex");
  const { error: linkErr } = await sb.from("test_links").insert({
    org_id: org.id,
    test_id: test.id,
    token,
    show_results: showResults,
    hidden_results_message: hiddenResultsMessage ?? null,
    is_active: true
  });
  if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });

  // 3) return public URL (adjust base if needed)
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/t/${token}`;
  return NextResponse.json({ ok: true, url });
}
