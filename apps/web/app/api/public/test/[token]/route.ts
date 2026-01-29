// apps/web/app/api/public/test/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PortalClient = ReturnType<typeof createClient>;

type LinkRow = { token: string; test_id: string };
type TestRow = { id: string; name: string | null; org_id: string; meta: any | null };
type OrgRow = { name: string | null; slug: string | null };

function getPortalClient(): PortalClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
  if (!url || !serviceRole) throw new Error("Missing Supabase env vars");
  return createClient(url, serviceRole, {
    auth: { persistSession: false },
    db: { schema: "portal" },
  }) as any;
}

function resolveEffectiveTestId(testRow: TestRow): string {
  const meta = testRow?.meta ?? {};
  const isWrapper = meta?.wrapper === true;
  if (!isWrapper) return testRow.id;

  const def = meta?.default_source_test;
  if (typeof def === "string" && def.length > 10) return def;

  const arr = meta?.source_tests;
  if (Array.isArray(arr) && typeof arr[0] === "string") return arr[0];

  return testRow.id;
}

// GET /api/public/test/[token]
export async function GET(
  _req: NextRequest,
  ctx: { params: { token?: string } }
) {
  try {
    const token = ctx.params?.token?.trim();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "missing token" },
        { status: 400 }
      );
    }

    const sb = getPortalClient();

    // 1) resolve link -> test_id
    const { data: linkRow, error: linkErr } = (await sb
      .from("test_links")
      .select("token, test_id")
      .eq("token", token)
      .maybeSingle()) as { data: LinkRow | null; error: any };

    if (linkErr || !linkRow) {
      return NextResponse.json(
        { ok: false, error: "invalid link" },
        { status: 404 }
      );
    }

    // 2) load test
    const { data: testRow, error: testErr } = (await sb
      .from("tests")
      .select("id, name, org_id, meta")
      .eq("id", linkRow.test_id)
      .maybeSingle()) as { data: TestRow | null; error: any };

    if (testErr || !testRow) {
      return NextResponse.json(
        { ok: false, error: testErr?.message || "test not found" },
        { status: 500 }
      );
    }

    // 3) org niceties (name/slug)
    const { data: orgRow } = (await sb
      .from("orgs")
      .select("name, slug")
      .eq("id", testRow.org_id)
      .maybeSingle()) as { data: OrgRow | null; error: any };

    const effectiveTestId = resolveEffectiveTestId(testRow);

    return NextResponse.json({
      ok: true,
      data: {
        token: linkRow.token,
        test_id: linkRow.test_id,
        effective_test_id: effectiveTestId,
        name: testRow?.name ?? "Test",
        org_name: orgRow?.name ?? null,
        org_slug: orgRow?.slug ?? null,
        meta: testRow?.meta ?? null,
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
export async function POST(
  req: NextRequest,
  ctx: { params: { token?: string } }
) {
  try {
    const token = ctx.params?.token?.trim();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "missing token" },
        { status: 400 }
      );
    }

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

    const fn = typeof first_name === "string" ? first_name.trim() : "";
    const ln = typeof last_name === "string" ? last_name.trim() : "";
    const em = typeof email === "string" ? email.trim().toLowerCase() : "";
    const consent = data_consent === true;

    if (!fn || !ln || !em) {
      return NextResponse.json(
        {
          ok: false,
          error: "first_name, last_name and email are required to start this test.",
        },
        { status: 400 }
      );
    }

    if (!consent) {
      return NextResponse.json(
        {
          ok: false,
          error: "You must agree to the use of your data in order to start this test.",
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // resolve link -> test_id
    const { data: link } = (await sb
      .from("test_links")
      .select("test_id, token")
      .eq("token", token)
      .maybeSingle()) as { data: { test_id: string; token: string } | null; error: any };

    if (!link) {
      return NextResponse.json(
        { ok: false, error: "invalid link" },
        { status: 404 }
      );
    }

    // test org_id + meta
    const { data: testRow, error: testErr } = (await sb
      .from("tests")
      .select("id, org_id, meta")
      .eq("id", link.test_id)
      .maybeSingle()) as { data: TestRow | null; error: any };

    if (testErr || !testRow?.org_id) {
      return NextResponse.json(
        { ok: false, error: testErr?.message || "missing org for test" },
        { status: 500 }
      );
    }

    const effectiveTestId = resolveEffectiveTestId(testRow);

    const insertRow: any = {
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
      // If you have a meta jsonb column on test_takers you can store effective_test_id there.
      // meta: { effective_test_id: effectiveTestId },
    };

    const { data: taker, error: insErr } = (await sb
      .from("test_takers")
      .insert(insertRow)
      .select("id")
      .single()) as { data: { id: string } | null; error: any };

    if (insErr || !taker?.id) {
      return NextResponse.json(
        { ok: false, error: insErr?.message || "insert failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: taker.id, effective_test_id: effectiveTestId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}

