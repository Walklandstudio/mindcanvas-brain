// apps/web/app/api/public/test/[token]/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PortalClient = ReturnType<typeof createClient>;

type LinkRow = { token: string; test_id: string };
type TestRow = { id: string; meta: any | null };

// IMPORTANT: In your codebase, test_questions.id appears to be the QUESTION ID.
// (Your submit route selects: .select("id, idx, profile_map") and then uses q.id as question id.)
type TestQuestionRow = {
  id: string; // question id
  idx?: number | null;
  order?: number | null;
  type?: string | null;
};

type QuestionRow = {
  id: string;
  text?: string | null;
  type?: string | null;
  options?: string[] | null;
  category?: string | null;
};

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

    // 1) resolve link -> wrapper test_id
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

    // 2) load wrapper test meta
    const { data: testRow, error: testErr } = (await sb
      .from("tests")
      .select("id, meta")
      .eq("id", linkRow.test_id)
      .maybeSingle()) as { data: TestRow | null; error: any };

    if (testErr || !testRow) {
      return NextResponse.json(
        { ok: false, error: testErr?.message || "test not found" },
        { status: 500 }
      );
    }

    const effectiveTestId = resolveEffectiveTestId(testRow);

    // 3) fetch test_questions for effective test
    // NOTE: We DO NOT use relationship joins because schema cache doesn't have them.
    const { data: tqRows, error: tqErr } = (await sb
      .from("test_questions")
      .select("id, idx, order, type")
      .eq("test_id", effectiveTestId)
      .order("order", { ascending: true })
      .order("idx", { ascending: true })
      .order("created_at", { ascending: true })) as {
      data: TestQuestionRow[] | null;
      error: any;
    };

    if (tqErr) {
      return NextResponse.json(
        { ok: false, error: `Questions load failed: ${tqErr.message}` },
        { status: 500 }
      );
    }

    const tqList = tqRows ?? [];
    if (tqList.length === 0) {
      return NextResponse.json({
        ok: true,
        token: linkRow.token,
        test_id: linkRow.test_id,
        effective_test_id: effectiveTestId,
        questions: [],
      });
    }

    const qIds = tqList.map((r) => r.id);

    // 4) fetch question content rows
    // Assumes you have a portal.questions table keyed by id.
    const { data: qRows, error: qErr } = (await sb
      .from("questions")
      .select("id, text, type, options, category")
      .in("id", qIds)) as { data: QuestionRow[] | null; error: any };

    if (qErr) {
      return NextResponse.json(
        { ok: false, error: `Question content load failed: ${qErr.message}` },
        { status: 500 }
      );
    }

    const qById = new Map<string, QuestionRow>();
    for (const qr of qRows ?? []) qById.set(qr.id, qr);

    // 5) merge + preserve test_questions ordering
    const questions = tqList.map((tq) => {
      const qr = qById.get(tq.id);
      return {
        id: tq.id,
        order: tq.order ?? null,
        idx: tq.idx ?? null,
        // prefer content.type; fallback to tq.type
        type: (qr?.type ?? tq.type ?? null) as any,
        text: (qr?.text ?? null) as any,
        options: (qr?.options ?? null) as any,
        category: (qr?.category ?? null) as any,
      };
    });

    return NextResponse.json({
      ok: true,
      token: linkRow.token,
      test_id: linkRow.test_id,
      effective_test_id: effectiveTestId,
      questions,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}

