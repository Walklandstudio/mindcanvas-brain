// apps/web/app/api/public/test/[token]/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PortalClient = ReturnType<typeof createClient>;

type LinkRow = { token: string; test_id: string };
type TestRow = { id: string; meta: any | null };

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

    // Fetch questions for effective test id
    const { data: rows, error: qErr } = (await sb
      .from("test_questions")
      .select(
        `
        question_id,
        order,
        idx,
        questions:question_id (
          id,
          text,
          type,
          options,
          category
        )
      `
      )
      .eq("test_id", effectiveTestId)) as { data: any[] | null; error: any };

    if (qErr) {
      return NextResponse.json(
        { ok: false, error: qErr.message },
        { status: 500 }
      );
    }

    const questions =
      (rows ?? [])
        .map((r: any) => {
          const qq = r?.questions ?? null;
          if (!qq?.id) return null;
          return {
            id: qq.id,
            order: r?.order ?? null,
            idx: r?.idx ?? null,
            type: qq?.type ?? null,
            text: qq?.text ?? null,
            options: qq?.options ?? null,
            category: qq?.category ?? null,
          };
        })
        .filter(Boolean) || [];

    questions.sort((a: any, b: any) => {
      const ao = a.order ?? 999999;
      const bo = b.order ?? 999999;
      if (ao !== bo) return ao - bo;
      const ai = a.idx ?? 999999;
      const bi = b.idx ?? 999999;
      if (ai !== bi) return ai - bi;
      return String(a.id).localeCompare(String(b.id));
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

