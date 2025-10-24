import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = admin();
  const { data, error } = await supabase
    .from("test_links")
    .select("id, token, test_id, org_id, expires_at, max_uses, use_count, is_disabled")
    .eq("test_id", params.id)
    .order("id", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data ?? [] });
}

type CreatePayload = {
  expires_at?: string | null; // ISO
  max_uses?: number | null;   // null = unlimited
};
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = admin();
  const body = (await req.json().catch(() => ({}))) as CreatePayload;

  // get test (and org) to bind link correctly
  const { data: test, error: testErr } = await supabase
    .from("tests")
    .select("id, org_id")
    .eq("id", params.id)
    .maybeSingle();
  if (testErr) return NextResponse.json({ error: testErr.message }, { status: 500 });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  // generate token (short & URL-safe)
  const token = crypto.randomUUID().split("-")[0] + crypto.randomUUID().slice(0, 6);

  const { data, error } = await supabase
    .from("test_links")
    .insert({
      token,
      org_id: test.org_id,
      test_id: test.id,
      expires_at: body.expires_at ?? null,
      max_uses: body.max_uses ?? null,
      use_count: 0,
      is_disabled: false,
    })
    .select("id, token, test_id, org_id, expires_at, max_uses, use_count, is_disabled")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data });
}
