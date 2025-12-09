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
export async function GET(
  _req: NextRequest,
  ctx: { params: { token?: string } }
) {
  try {
    const token = ctx.params?.token?.trim();
    if (!token)
      return NextResponse.json(
        { ok: false, error: "missing token" },
        { status: 400 }
      );

    const sb = getPortalClient();

    // 1) resolve link -> test_id
    const { data: linkRow, error: linkErr } = await sb
      .from("test_links")
      .select("token, test_id")
      .eq("token", token)
      .maybeSingle();
    if (linkErr || !linkRow) {
      return NextResponse.json(
        { ok: false, error: "invalid link" },
        { status: 404 }
      );
    }

    // 2) test name (optional nicety)
    const { data: testRow, error: testErr } = await sb
      .from("tests")
      .select("name")
      .eq("id", linkRow.test_id)
      .maybeSingle();
    if (testErr) {
      return NextResponse.json(
        { ok: false, error: testErr.message },
        { status: 500 }
      );
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
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}

// POST /api/public/test/[token]
// Body: { first_name, last_name, email, phone?, company?, role_title?, data_consent? }
export async function POST(
  req: NextRequest,
  ctx: { params: { token?: string } }
) {
  try {
    const token = ctx.params?.token?.trim();
    if (!token)
      return NextResponse.json(
        { ok: false, error: "missing token" },
        { status: 400 }
      );

    const body = (await req.json().catch(() => ({}))) ?? {};
    const {
      first_name = null,
      last_name = null,
      email = null,
      phone = null,
      company = null,
      role_title = null,
      data_consent = null,
    } = body;

    const sb = getPortalClient();

    // Basic server-side validation to mirror frontend requirements
    const fn = typeof first_name === "string" ? first_name.trim() : "";
    const ln = typeof last_name === "string" ? last_name.trim() : "";
    const em = typeof email === "string" ? email.trim().toLowerCase() : "";
    const consent = data_consent === true;

    if (!fn || !ln || !em) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "first_name, last_name and email are required to start this test.",
        },
        { status: 400 }
      );
    }

    if (!consent) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "You must agree to the use of your data in order to start this test.",
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // 1) resolve link -> test_id
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("test_id, token")
      .eq("token", token)
      .maybeSingle();
    if (linkErr || !link) {
      return NextResponse.json(
        { ok: false, error: "invalid link" },
        { status: 404 }
      );
    }

    // 2) fetch org_id for that test
    const { data: testRow, error: testErr } = await sb
      .from("tests")
      .select("org_id")
      .eq("id", link.test_id)
      .maybeSingle();
    if (testErr || !testRow?.org_id) {
      return NextResponse.json(
        { ok: false, error: "missing org for test" },
        { status: 500 }
      );
    }

    // 3) insert taker — include org_id, link_token and consent fields
    const insertRow = {
      org_id: testRow.org_id,
      test_id: link.test_id,
      link_token: link.token,
      first_name: fn,
      last_name: ln,
      email: em,
      phone,
      company,
      role_title,
      status: "started" as const,
      data_consent: true,
      data_consent_at: nowIso,
    };

    const { data: taker, error: insErr } = await sb
      .from("test_takers")
      .insert(insertRow)
      .select("id")
      .single();

    if (insErr) {
      return NextResponse.json(
        { ok: false, error: insErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: taker.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
