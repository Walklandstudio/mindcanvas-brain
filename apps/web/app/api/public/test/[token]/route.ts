import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPortalClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
  if (!url || !serviceRole) throw new Error("Missing Supabase env vars");
  return createClient(url, serviceRole, {
    auth: { persistSession: false },
    db: { schema: "portal" },
  }) as any;
}

// GET /api/public/test/[token] -> { ok, data: { token, test_id, name } }
export async function GET(_req: NextRequest, ctx: { params: { token?: string } }) {
  try {
    const token = ctx.params?.token?.trim();
    if (!token) return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });

    const sb = getPortalClient();

    // 1) resolve link -> test_id
    const { data: linkRow, error: linkErr } = await sb
      .from("test_links")
      .select("token, test_id")
      .eq("token", token)
      .maybeSingle();
    if (linkErr || !linkRow) {
      return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });
    }

    // 2) test name (optional nicety)
    const { data: testRow, error: testErr } = await sb
      .from("tests")
      .select("name")
      .eq("id", linkRow.test_id)
      .maybeSingle();
    if (testErr) {
      return NextResponse.json({ ok: false, error: testErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: { token: linkRow.token, test_id: linkRow.test_id, name: testRow?.name ?? "Test" },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// POST /api/public/test/[token]
// Body: { first_name?, last_name?, email?, phone?, company?, role_title? }
export async function POST(req: NextRequest, ctx: { params: { token?: string } }) {
  try {
    const token = ctx.params?.token?.trim();
    if (!token) return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) ?? {};
    const {
      first_name = null,
      last_name = null,
      email = null,
      phone = null,
      company = null,
      role_title = null,
    } = body;

    const sb = getPortalClient();

    // 1) resolve link -> test_id
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("test_id, token")
      .eq("token", token)
      .maybeSingle();
    if (linkErr || !link) {
      return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });
    }

    // 2) fetch org_id for that test (this is the missing piece)
    const { data: testRow, error: testErr } = await sb
      .from("tests")
      .select("org_id")
      .eq("id", link.test_id)
      .maybeSingle();
    if (testErr || !testRow?.org_id) {
      return NextResponse.json({ ok: false, error: "missing org for test" }, { status: 500 });
    }

    // 3) insert taker — include org_id and link_token to satisfy NOT NULL constraints
    const insertRow = {
      org_id: testRow.org_id,     // ← critical
      test_id: link.test_id,
      link_token: link.token,     // ← critical
      first_name,
      last_name,
      email,
      phone,
      company,                    // exists in your table
      role_title,                 // exists in your table
      status: "started" as const,
    };

    const { data: taker, error: insErr } = await sb
      .from("test_takers")
      .insert(insertRow)
      .select("id")
      .single();

    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: taker.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
