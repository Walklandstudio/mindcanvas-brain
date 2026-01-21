// app/api/public/qsc/[token]/meta/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
    String(s || "").trim()
  );
}

type TestRow = { id: string; slug: string | null; meta: any | null; test_type?: string | null; name?: string | null };

async function resolveContentTestIdFromWrapper(sb: ReturnType<typeof supa>, wrapperTestId: string) {
  const { data: t, error } = await sb
    .from("tests")
    .select("id, slug, meta, test_type, name")
    .eq("id", wrapperTestId)
    .maybeSingle();

  if (error || !t) {
    return { content_test_id: wrapperTestId, resolved_by: "tests.lookup_failed" as const, test: null as any };
  }

  const test = t as unknown as TestRow;
  const meta = (test.meta ?? {}) as any;

  if (meta?.wrapper !== true) {
    return { content_test_id: wrapperTestId, resolved_by: "not_wrapper" as const, test };
  }

  const defaultSource = typeof meta?.default_source_test === "string" ? meta.default_source_test : null;
  const sourceTests: string[] = Array.isArray(meta?.source_tests) ? meta.source_tests : [];

  if (defaultSource && isUuidLike(defaultSource)) {
    return { content_test_id: defaultSource, resolved_by: "meta.default_source_test" as const, test };
  }

  if (sourceTests.length && isUuidLike(sourceTests[0])) {
    return { content_test_id: sourceTests[0], resolved_by: "meta.source_tests[0]" as const, test };
  }

  return { content_test_id: wrapperTestId, resolved_by: "wrapper_no_sources" as const, test };
}

/**
 * GET /api/public/qsc/[token]/meta
 * Returns lightweight metadata incl audience + wrapper/content test ids.
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const token = String(params.token || "").trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
    }

    const sb = supa();

    // Latest results row
    const { data: r, error: rErr } = await sb
      .from("qsc_results")
      .select("id, test_id, content_test_id, token, audience, created_at")
      .eq("token", token)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rErr) {
      return NextResponse.json({ ok: false, error: `qsc_results load failed: ${rErr.message}` }, { status: 500 });
    }
    if (!r) {
      return NextResponse.json({ ok: false, error: "No QSC result found" }, { status: 404 });
    }

    const wrapper_test_id = String(r.test_id);
    let content_test_id: string = (r as any).content_test_id ? String((r as any).content_test_id) : "";
    let content_resolved_by: string | null = null;

    // If not present yet, derive from wrapper meta (pre-backfill safety)
    if (!content_test_id) {
      const resolved = await resolveContentTestIdFromWrapper(sb, wrapper_test_id);
      content_test_id = resolved.content_test_id;
      content_resolved_by = resolved.resolved_by;
    } else {
      content_resolved_by = "qsc_results.content_test_id";
    }

    // Audience
    let audience: "leader" | "entrepreneur" = "entrepreneur";

    if (r.audience === "leader" || r.audience === "entrepreneur") {
      audience = r.audience;
      return NextResponse.json(
        {
          ok: true,
          __api_version: "qsc-meta-2026-01-15",
          token,
          result_id: r.id,
          wrapper_test_id,
          content_test_id,
          content_resolved_by,
          audience,
          source: "qsc_results.audience",
        },
        { status: 200 }
      );
    }

    // Fallback: derive audience from wrapper test (existing behaviour)
    const { data: t, error: tErr } = await sb
      .from("tests")
      .select("id, test_type, name")
      .eq("id", wrapper_test_id)
      .maybeSingle();

    if (tErr) {
      return NextResponse.json({ ok: false, error: `tests load failed: ${tErr.message}` }, { status: 500 });
    }

    const testType = String((t as any)?.test_type || "").toLowerCase();
    const testName = String((t as any)?.name || "").toLowerCase();

    audience = testType.includes("leader") || testName.includes("leader") ? "leader" : "entrepreneur";

    return NextResponse.json(
      {
        ok: true,
        __api_version: "qsc-meta-2026-01-15",
        token,
        result_id: r.id,
        wrapper_test_id,
        content_test_id,
        content_resolved_by,
        audience,
        source: "derived_from_tests",
        debug: { test_type: (t as any)?.test_type ?? null, name: (t as any)?.name ?? null },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
