// apps/web/app/api/public/qsc/[token]/report/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Audience = "entrepreneur" | "leader";

type TestMetaRow = {
  id: string;
  slug: string | null;
  meta: any | null;
};

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
    String(s || "").trim()
  );
}

function normalizeSlug(s: any) {
  return String(s || "").trim().toLowerCase();
}

async function resolveContentTestIdForEntrepreneur(
  sb: ReturnType<typeof supa>,
  wrapperTestId: string
): Promise<{ contentTestId: string; contentResolvedBy: string }> {
  const { data: testRow, error } = await sb
    .from("tests")
    .select("id, slug, meta")
    .eq("id", wrapperTestId)
    .maybeSingle();

  if (error || !testRow) {
    return {
      contentTestId: wrapperTestId,
      contentResolvedBy: "tests.lookup_failed",
    };
  }

  const meta = (testRow as any)?.meta ?? {};
  const isWrapper = meta?.wrapper === true;

  if (!isWrapper) {
    return { contentTestId: wrapperTestId, contentResolvedBy: "not_wrapper" };
  }

  const sourceTests: string[] = Array.isArray(meta?.source_tests)
    ? meta.source_tests
    : [];

  const defaultSource: string | null =
    typeof meta?.default_source_test === "string"
      ? meta.default_source_test
      : null;

  // Prefer canonical by slug qsc-core
  if (sourceTests.length) {
    const { data: candidates } = await sb
      .from("tests")
      .select("id, slug, meta")
      .in("id", sourceTests);

    const list = (candidates ?? []) as unknown as TestMetaRow[];
    const core = list.find((t) => normalizeSlug(t.slug) === "qsc-core");

    if (core?.id) {
      return {
        contentTestId: core.id,
        contentResolvedBy: "meta.source_tests.slug=qsc-core",
      };
    }
  }

  // Fallback to default_source_test
  if (defaultSource && isUuidLike(defaultSource)) {
    return {
      contentTestId: defaultSource,
      contentResolvedBy: "meta.default_source_test",
    };
  }

  // Fallback to first source test
  if (sourceTests.length && isUuidLike(sourceTests[0])) {
    return {
      contentTestId: sourceTests[0],
      contentResolvedBy: "meta.source_tests[0]",
    };
  }

  return {
    contentTestId: wrapperTestId,
    contentResolvedBy: "wrapper_no_sources",
  };
}

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const tokenParam = String(params.token || "").trim();
    if (!tokenParam) {
      return NextResponse.json(
        { ok: false, error: "Missing token in URL" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const tid = String(url.searchParams.get("tid") || "").trim();

    const sb = supa();

    const select = `
      id,
      test_id,
      token,
      taker_id,
      audience,
      personality_totals,
      personality_percentages,
      mindset_totals,
      mindset_percentages,
      primary_personality,
      secondary_personality,
      primary_mindset,
      secondary_mindset,
      combined_profile_code,
      qsc_profile_id,
      created_at
    `;

    let resultRow: any = null;
    let resolvedBy:
      | "result_id"
      | "token+taker_id"
      | "token_unique"
      | "token_latest"
      | null = null;

    // (0) If token looks like qsc_results.id
    if (isUuidLike(tokenParam)) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(select)
        .eq("id", tokenParam)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: `qsc_results load failed: ${error.message}` },
          { status: 500 }
        );
      }
      if (data) {
        resultRow = data;
        resolvedBy = "result_id";
      }
    }

    // (1) token + tid (deterministic)
    if (!resultRow && tid && isUuidLike(tid)) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(select)
        .eq("token", tokenParam)
        .eq("taker_id", tid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: `qsc_results load failed: ${error.message}` },
          { status: 500 }
        );
      }
      if (data) {
        resultRow = data;
        resolvedBy = "token+taker_id";
      }
    }

    // (2) token only — require uniqueness or reject
    if (!resultRow) {
      const { count, error: countErr } = await sb
        .from("qsc_results")
        .select("id", { count: "exact", head: true })
        .eq("token", tokenParam);

      if (countErr) {
        return NextResponse.json(
          { ok: false, error: `qsc_results count failed: ${countErr.message}` },
          { status: 500 }
        );
      }

      const c = Number(count || 0);

      if (!tid && c > 1) {
        return NextResponse.json(
          {
            ok: false,
            error: "AMBIGUOUS_TOKEN_REQUIRES_TID",
            debug: {
              token: tokenParam,
              tid: tid || null,
              matches: c,
              hint:
                "Pass ?tid=<test_takers.id> when loading this report to disambiguate shared tokens.",
            },
          },
          { status: 409 }
        );
      }

      if (c === 1) {
        const { data, error } = await sb
          .from("qsc_results")
          .select(select)
          .eq("token", tokenParam)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          return NextResponse.json(
            { ok: false, error: `qsc_results load failed: ${error.message}` },
            { status: 500 }
          );
        }
        if (data) {
          resultRow = data;
          resolvedBy = "token_unique";
        }
      }

      // last-resort fallback (kept for edge cases)
      if (!resultRow && c > 0) {
        const { data, error } = await sb
          .from("qsc_results")
          .select(select)
          .eq("token", tokenParam)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          return NextResponse.json(
            { ok: false, error: `qsc_results load failed: ${error.message}` },
            { status: 500 }
          );
        }
        if (data) {
          resultRow = data;
          resolvedBy = "token_latest";
        }
      }
    }

    if (!resultRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "RESULT_NOT_FOUND",
          debug: { token: tokenParam, tid: tid || null },
        },
        { status: 404 }
      );
    }

    // Snapshot route is entrepreneur-facing
    // If this is clearly a leader record, fail fast (prevents “wrong report”)
    const aud = (resultRow.audience ?? null) as Audience | null;
    if (aud === "leader") {
      return NextResponse.json(
        {
          ok: false,
          error: "WRONG_AUDIENCE",
          debug: { expected: "entrepreneur", got: aud },
        },
        { status: 400 }
      );
    }

    const wrapperTestId: string = String(resultRow.test_id);

    // Resolve canonical content test id (wrapper -> qsc-core)
    const { contentTestId, contentResolvedBy } =
      await resolveContentTestIdForEntrepreneur(sb, wrapperTestId);

    // Load profile snapshot
    let profile: any = null;
    const qscProfileId: string | null = resultRow.qsc_profile_id ?? null;

    if (qscProfileId) {
      const { data: profRow, error: profErr } = await sb
        .from("qsc_profiles")
        .select(
          `
          id,
          personality_code,
          mindset_level,
          profile_code,
          profile_label,
          how_to_communicate,
          decision_style,
          business_challenges,
          trust_signals,
          offer_fit,
          sale_blockers,
          created_at
        `
        )
        .eq("id", qscProfileId)
        .maybeSingle();

      if (profErr) {
        return NextResponse.json(
          { ok: false, error: `qsc_profiles load failed: ${profErr.message}` },
          { status: 500 }
        );
      }

      profile = profRow ?? null;
    }

    // Load snapshot sections from canonical test id (NOT wrapper)
    const { data: sectionRows, error: secErr } = await sb
      .from("report_sections")
      .select(
        `
        id,
        test_id,
        section_key,
        title,
        content,
        persona_code,
        order_index,
        is_active
      `
      )
      .eq("test_id", contentTestId)
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    if (secErr) {
      return NextResponse.json(
        { ok: false, error: `report_sections load failed: ${secErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        results: resultRow,
        profile,
        sections: sectionRows ?? [],
        __debug: {
          token: tokenParam,
          tid: tid || null,
          resolved_by: resolvedBy,
          audience: aud,
          wrapper_test_id: wrapperTestId,
          content_test_id: contentTestId,
          content_resolved_by: contentResolvedBy,
          section_count: (sectionRows ?? []).length,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unexpected error in QSC report endpoint",
      },
      { status: 500 }
    );
  }
}



