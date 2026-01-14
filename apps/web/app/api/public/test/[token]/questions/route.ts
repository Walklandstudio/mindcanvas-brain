// apps/web/app/api/public/test/[token]/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PortalClient = ReturnType<typeof createClient>;

type LinkRow = { token: string; test_id: string };
type TestRow = { id: string; meta: any | null };

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
  if (meta?.wrapper !== true) return testRow.id;

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

