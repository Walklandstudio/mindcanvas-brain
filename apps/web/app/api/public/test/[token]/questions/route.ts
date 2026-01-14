// apps/web/app/api/public/test/[token]/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LinkRow = { token: string; test_id: string };
type TestRow = { id: string; slug: string | null; meta: any | null };

// Your app uses test_questions.id as the question_id (see submit route).
type TestQuestionRow = {
  id: string;
  idx?: number | null;
  order?: number | null;
  type?: string | null;
  text?: string | null;
  options?: string[] | null;
  category?: string | null;
};

function getPortalClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
  if (!url || !serviceRole) throw new Error("Missing Supabase env vars");
  return createClient(url, serviceRole, {
    auth: { persistSession: false },
    db: { schema: "portal" },
  }) as any;
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
    String(s || "").trim()
  );
}

function normSlug(v: any) {
  return String(v || "").trim().toLowerCase();
}

/**
 * Global wrapper->content resolver.
 * - If not wrapper: return self
 * - If wrapper:
 *   - Prefer source test by slug if available (qsc-leaders / qsc-core)
 *   - Else default_source_test
 *   - Else first source_tests entry
 */
async function resolveEffectiveTestId(args: {
  sb: any;
  wrapperTest: TestRow;
}): Promise<{ effectiveTestId: string; resolvedBy: string }> {
  const { sb, wrapperTest } = args;

  const meta = wrapperTest?.meta ?? {};
  const isWrapper = meta?.wrapper === true;

  if (!isWrapper) {
    return { effectiveTestId: wrapperTest.id, resolvedBy: "not_wrapper" };
  }

  const sourceTests: string[] = Array.isArray(meta?.source_tests)
    ? meta.source_tests
    : [];
  const defaultSource: string | null =
    typeof meta?.default_source_test === "string" ? meta.default_source_test : null;

  // If we have multiple source tests, prefer specific known slugs when present
  if (sourceTests.length) {
    const clean = sourceTests.filter((id) => isUuidLike(id));
    if (clean.length) {
      const { data: candidates } = await sb
        .from("tests")
        .select("id, slug, meta")
        .in("id", clean);

      const list = (candidates ?? []) as TestRow[];

      // Prefer qsc-leaders if it exists (leader question set is typically different)
      const leaders = list.find((t) => normSlug(t.slug) === "qsc-leaders");
      if (leaders?.id) {
        return {
          effectiveTestId: leaders.id,
          resolvedBy: "meta.source_tests.slug=qsc-leaders",
        };
      }

      // Else prefer qsc-core
      const core = list.find((t) => normSlug(t.slug) === "qsc-core");
      if (core?.id) {
        return {
          effectiveTestId: core.id,
          resolvedBy: "meta.source_tests.slug=qsc-core",
        };
      }
    }
  }

  // Fallback: default source
  if (defaultSource && isUuidLike(defaultSource)) {
    return { effectiveTestId: defaultSource, resolvedBy: "meta.default_source_test" };
  }

  // Fallback: first source
  if (sourceTests.length && isUuidLike(sourceTests[0])) {
    return { effectiveTestId: sourceTests[0], resolvedBy: "meta.source_tests[0]" };
  }

  return { effectiveTestId: wrapperTest.id, resolvedBy: "wrapper_no_sources" };
}

export async function GET(_req: NextRequest, ctx: { params: { token?: string } }) {
  try {
    const token = String(ctx.params?.token || "").trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });
    }

    const sb = getPortalClient();

    // 1) resolve link -> wrapper test_id
    const { data: linkRow, error: linkErr } = (await sb
      .from("test_links")
      .select("token, test_id")
      .eq("token", token)
      .maybeSingle()) as { data: LinkRow | null; error: any };

    if (linkErr || !linkRow) {
      return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });
    }

    // 2) load wrapper test meta (and slug for better selection)
    const { data: testRow, error: testErr } = (await sb
      .from("tests")
      .select("id, slug, meta")
      .eq("id", linkRow.test_id)
      .maybeSingle()) as { data: TestRow | null; error: any };

    if (testErr || !testRow) {
      return NextResponse.json(
        { ok: false, error: testErr?.message || "test not found" },
        { status: 500 }
      );
    }

    const { effectiveTestId, resolvedBy } = await resolveEffectiveTestId({
      sb,
      wrapperTest: testRow,
    });

    // 3) load questions DIRECTLY from portal.test_questions
    // IMPORTANT: no relationship joins, no question_id column references.
    const { data: rows, error: qErr } = (await sb
      .from("test_questions")
      .select("id, idx, order, type, text, options, category")
      .eq("test_id", effectiveTestId)
      .order("order", { ascending: true })
      .order("idx", { ascending: true })
      .order("created_at", { ascending: true })) as {
      data: TestQuestionRow[] | null;
      error: any;
    };

    if (qErr) {
      return NextResponse.json(
        { ok: false, error: `Questions load failed: ${qErr.message}` },
        { status: 500 }
      );
    }

    const questions = (rows ?? []).map((q) => ({
      id: q.id,
      idx: q.idx ?? null,
      order: q.order ?? null,
      type: q.type ?? null,
      text: q.text ?? null,
      options: q.options ?? null,
      category: q.category ?? null,
    }));

    return NextResponse.json({
      ok: true,
      token: linkRow.token,
      test_id: linkRow.test_id, // wrapper test id
      effective_test_id: effectiveTestId, // canonical content test id
      questions,
      __debug: {
        wrapper_slug: testRow.slug ?? null,
        wrapper_is_wrapper: (testRow.meta?.wrapper === true) || false,
        resolved_by: resolvedBy,
        question_count: questions.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

