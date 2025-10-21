import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const sb = supabaseAdmin();
  const { data: link, error } = await sb
    .from("test_links")
    .select("id, token, org_id, test_id")
    .eq("token", params.token)
    .maybeSingle();

  if (error || !link) return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });

  const { data: test } = await sb
    .from("org_tests")
    .select("id, name")
    .eq("id", link.test_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    data: { name: test?.name ?? "Test", test_id: link.test_id, token: link.token },
  });
}

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({}));

  const { data: link } = await sb
    .from("test_links")
    .select("id, org_id, test_id")
    .eq("token", params.token)
    .maybeSingle();
  if (!link) return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });

  // Upsert taker into this org
  const email: string = body?.email ?? "";
  const full_name = [body?.first_name, body?.last_name].filter(Boolean).join(" ").trim() || null;

  let takerId: string | null = null;
  if (email) {
    const { data: taker, error: te } = await sb
      .from("test_takers")
      .upsert([{ org_id: link.org_id, email, full_name }], { onConflict: "org_id,email" })
      .select("id")
      .maybeSingle();
    if (te) return NextResponse.json({ ok: false, error: te.message }, { status: 400 });
    takerId = taker?.id ?? null;
  }

  // ✅ return taker id for your /t/[token]/start redirect
  return NextResponse.json({ ok: true, id: takerId });
}
