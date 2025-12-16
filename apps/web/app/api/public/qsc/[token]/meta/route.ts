import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

/**
 * GET /api/public/qsc/[token]/meta
 * Lightweight endpoint used to safely derive audience even if qsc_results.audience is missing.
 */
export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing token" },
        { status: 400 }
      );
    }

    const sb = supa();

    // 1) Find the qsc_results row (latest)
    const { data: r, error: rErr } = await sb
      .from("qsc_results")
      .select("id, test_id, token, audience, created_at")
      .eq("token", token)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rErr) {
      return NextResponse.json(
        { ok: false, error: `qsc_results load failed: ${rErr.message}` },
        { status: 500 }
      );
    }
    if (!r) {
      return NextResponse.json(
        { ok: false, error: "No QSC result found" },
        { status: 404 }
      );
    }

    // 2) If audience exists on results, trust it
    if (r.audience === "leader" || r.audience === "entrepreneur") {
      return NextResponse.json(
        {
          ok: true,
          __api_version: "qsc-meta-2025-12-12",
          token,
          test_id: r.test_id,
          audience: r.audience,
          source: "qsc_results.audience",
        },
        { status: 200 }
      );
    }

    // 3) Fallback: derive from portal.tests.test_type
    // Adjust selected fields if your schema differs.
    const { data: t, error: tErr } = await sb
      .from("tests")
      .select("id, test_type, name")
      .eq("id", r.test_id)
      .maybeSingle();

    if (tErr) {
      return NextResponse.json(
        { ok: false, error: `tests load failed: ${tErr.message}` },
        { status: 500 }
      );
    }

    const testType = String(t?.test_type || "").toLowerCase();
    const testName = String(t?.name || "").toLowerCase();

    const derivedAudience =
      testType.includes("leader") || testName.includes("leader")
        ? "leader"
        : "entrepreneur";

    return NextResponse.json(
      {
        ok: true,
        __api_version: "qsc-meta-2025-12-12",
        token,
        test_id: r.test_id,
        audience: derivedAudience,
        source: "derived_from_tests",
        debug: { test_type: t?.test_type ?? null, name: t?.name ?? null },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
