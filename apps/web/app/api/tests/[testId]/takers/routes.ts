// apps/web/app/api/tests/[testId]/takers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPortalClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
  if (!url || !serviceRole) {
    throw new Error("Missing Supabase env vars");
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false },
    db: { schema: "portal" },
  });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: { testId?: string } }
) {
  try {
    const testId = ctx.params?.testId;
    if (!testId) {
      return NextResponse.json(
        { ok: false, error: "missing testId" },
        { status: 400 }
      );
    }

    const sb = getPortalClient();

    const { data, error } = await sb
      .from("test_takers")
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        company,
        role_title,
        status,
        created_at,
        started_at,
        completed_at,
        data_consent,
        data_consent_at
      `
      )
      .eq("test_id", testId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      takers: data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
