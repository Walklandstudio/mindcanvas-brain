// apps/web/app/api/public/test/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-only; dynamic I/O
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Service client targeting the `portal` schema.
 * Cast to `any` to avoid TS generic schema mismatch (public vs portal).
 * Runtime behavior is correct; types are relaxed to unblock you.
 */
function getPortalClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
  if (!url || !serviceRole) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE"
    );
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false },
    db: { schema: "portal" },
  }) as any;
}

// GET /api/public/test/[token]
// -> { ok, data: { token, test_id, name } }
export async function GET(_req: NextRequest, ctx: { params: { token?: string } }) {
  try {
    const token = ctx.params?.token?.trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });
    }

    const sb = getPortalClient();

    // 1) Resolve link -> test_id
    const { data: linkRow, error: linkErr } = await sb
      .from("test_links")
      .select("token, test_id")
      .eq("token", token)
      .limit(1)
      .maybeSingle();

    if (linkErr || !linkRow) {
      return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });
    }

    // 2) Fetch test name separately (avoid join typing ambiguity)
    const { data: testRow, error: testErr } = await sb
      .from("tests")
      .select("name")
      .eq("id", linkRow.test_id)
      .limit(1)
      .maybeSingle();

    if (testErr) {
      return NextResponse.json({ ok: false, error: testErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        token: linkRow.token,
        test_id: linkRow.test_id,
        name: testRow?.name ?? "Test",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// POST /api/public/test/[token]
// Body: { first_name?, last_name?, email?, phone?, company?, role_title?, team?, team_function? }
// -> { ok, id }
export async function POST(req: NextRequest, ctx: { params: { token?: string } }) {
  try {
    const token = ctx.params?.token?.trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });
    }

    const {
      first_name = null,
      last_name = null,
      email = null,
      phone = null,
      company = null,       // aligns with your table
      role_title = null,    // aligns with your table
      team = null,
      team_function = null,
    } = (await req.json().catch(() => ({}))) ?? {};

    const sb = getPortalClient();

    // Resolve the link -> test_id
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("test_id, token")
      .eq("token", token)
      .maybeSingle();

    if (linkErr || !link) {
      return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });
    }

    // Insert taker — include NOT NULL fields link_token + test_id
    const insert = {
      test_id: link.test_id,
      link_token: link.token,
      first_name,
      last_name,
      email,
      phone,
      company,
      role_title,
      team,
      team_function,
      status: "started" as const,
    };

    const { data: taker, error: insErr } = await sb
      .from("test_takers")
      .insert(insert)
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
