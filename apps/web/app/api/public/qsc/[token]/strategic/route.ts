// apps/web/app/api/public/qsc/[token]/strategic/route.ts
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

type TestMetaRow = {
  id: string;
  slug: string | null;
  meta: any | null;
};

async function resolveContentTestIdForEntrepreneur(
  sb: ReturnType<typeof supa>,
  wrapperTestId: string
) {
  const { data: testRow, error } = await sb
    .from("tests")
    .select("id, slug, meta")
    .eq("id", wrapperTestId)
    .maybeSingle();

  if (error || !testRow) {
    return {
      contentTestId: wrapperTestId,
      contentResolvedBy: "tests.lookup_failed" as const,
    };
  }

  const meta = (testRow as any)?.meta ?? {};
  const isWrapper = meta?.wrapper === true;

  if (!isWrapper) {
    return { contentTestId: wrapperTestId, contentResolvedBy: "not_wrapper" as const };
  }

  const sourceTests: string[] = Array.isArray(meta?.source_tests) ? meta.source_tests : [];
  const defaultSource: string | null =
    typeof meta?.default_source_test === "string" ? meta.default_source_test : null;

  if (sourceTests.length) {
    const { data: candidates } = await sb
      .from("tests")
      .select("id, slug, meta")
      .in("id", sourceTests);

    const list = (candidates ?? []) as unknown as TestMetaRow[];
    const core = list.find((t) => String(t.slug || "").toLowerCase() === "qsc-core");
    if (core?.id) {
      return {
        contentTestId: core.id,
        contentResolvedBy: "meta.source_tests.slug=qsc-core" as const,
      };
    }
  }

  if (defaultSource && isUuidLike(defaultSource)) {
    return {
      contentTestId: defaultSource,
      contentResolvedBy: "meta.default_source_test" as const,
    };
  }

  if (sourceTests.length && isUuidLike(sourceTests[0])) {
    return {
      contentTestId: sourceTests[0],
      contentResolvedBy: "meta.source_tests[0]" as const,
    };
  }

  return {
    contentTestId: wrapperTestId,
    contentResolvedBy: "wrapper_no_sources" as const,
  };
}

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = String(params.token || "").trim();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing token in URL" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const tid = String(url.searchParams.get("tid") || "").trim();

    const sb = supa();

    // 1) Load QSC results row
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

    if (tid && isUuidLike(tid)) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(select)
        .eq("token", token)
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
      resultRow = data ?? null;
    }

    if (!resultRow) {
      const { data, error } = await sb
        .from("qsc_results")
        .select(select)
        .eq("token", token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: `qsc_results load failed: ${error.message}` },
          { status: 500 }
        );
      }
      resultRow = data ?? null;
    }

    if (!resultRow) {
      return NextResponse.json(
        { ok: false, error: "No QSC result found for this token", debug: { token, tid: tid || null } },
        { status: 404 }
      );
    }

    const wrapperTestId: string = String(resultRow.test_id);

    // 2) Resolve canonical content test id
    const { contentTestId, contentResolvedBy } =
      await resolveContentTestIdForEntrepreneur(sb, wrapperTestId);

    // 3) Load profile
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

    // 4) Load Strategic report sections from canonical test id
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
          token,
          tid: tid || null,
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
      { ok: false, error: err?.message || "Unexpected error in QSC strategic endpoint" },
      { status: 500 }
    );
  }
}
