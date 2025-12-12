// apps/web/app/api/tests/[testId]/takers/[takerId]/route.ts
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

function isValidEmail(email: string) {
  // not over-strict; just sanity
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { testId?: string; takerId?: string } }
) {
  try {
    const testId = ctx.params?.testId;
    const takerId = ctx.params?.takerId;

    if (!testId) {
      return NextResponse.json(
        { ok: false, error: "missing testId" },
        { status: 400 }
      );
    }
    if (!takerId) {
      return NextResponse.json(
        { ok: false, error: "missing takerId" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({} as any));

    const first_name =
      typeof body.first_name === "string" ? body.first_name.trim() : "";
    const last_name =
      typeof body.last_name === "string" ? body.last_name.trim() : "";
    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    const email = emailRaw ? emailRaw.toLowerCase() : null;

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "invalid email" },
        { status: 400 }
      );
    }

    const sb = getPortalClient();

    // IMPORTANT: lock update to the testId as well (prevents cross-test edits)
    const { error } = await sb
      .from("test_takers")
      .update({
        first_name: first_name || null,
        last_name: last_name || null,
        email,
      })
      .eq("id", takerId)
      .eq("test_id", testId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
