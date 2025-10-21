import { NextResponse } from "next/server";
import { getActiveOrgId, supabaseServer } from "@/app/_lib/portal";
import { customAlphabet } from "nanoid";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 14);

export async function GET(req: Request) {
  const supabase = supabaseServer();
  const orgId = await getActiveOrgId();
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const testId = searchParams.get("testId");

  let q = supabase.from("test_links").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (testId) q = q.eq("test_id", testId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ links: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const orgId = await getActiveOrgId();
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const { testId, takerEmail, takerName, expiresAt, maxUses = 1 } = payload || {};
  if (!testId) return NextResponse.json({ error: "testId required" }, { status: 400 });

  // Ensure test exists and belongs to org
  const { data: test } = await supabase.from("org_tests").select("id").eq("id", testId).eq("org_id", orgId).maybeSingle();
  if (!test) return NextResponse.json({ error: "Invalid test" }, { status: 404 });

  // Ensure taker (optional)
  let takerId: string | null = null;
  if (takerEmail) {
    const { data: taker, error: te } = await supabase
      .from("test_takers")
      .upsert([{ org_id: orgId, email: takerEmail, full_name: takerName }], { onConflict: "org_id,email" })
      .select("id")
      .maybeSingle();
    if (te) return NextResponse.json({ error: te.message }, { status: 400 });
    takerId = taker?.id ?? null;
  }

  const token = nano();
  const { data: link, error } = await supabase
    .from("test_links")
    .insert([{ org_id: orgId, test_id: testId, taker_id: takerId, token, expires_at: expiresAt ?? null, max_uses: maxUses }])
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/t/${token}`;
  return NextResponse.json({ link, publicUrl });
}
