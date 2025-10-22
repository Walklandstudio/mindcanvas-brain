// apps/web/app/api/portal/links/route.ts
import { NextResponse } from "next/server";
import { supabaseServer, getActiveOrgId } from "@/app/_lib/portal";

/**
 * POST /api/portal/links
 * Body: { test_id: string, max_uses?: number, mode?: "full" | "free" }
 * Returns: { url: string, token: string }
 */
export async function POST(req: Request) {
  try {
    const sb = await supabaseServer();

    // 🔧 getActiveOrgId() in your codebase does not take parameters
    const orgId = await getActiveOrgId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No active organization in session." },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      test_id?: string;
      max_uses?: number;
      mode?: string;
    };

    const test_id = String(body?.test_id || "").trim();
    const max_uses =
      Number.isFinite(body?.max_uses) && Number(body?.max_uses) > 0
        ? Number(body?.max_uses)
        : 5;
    const mode = (body?.mode || "full") as "full" | "free";

    if (!test_id) {
      return NextResponse.json({ error: "Missing test_id." }, { status: 400 });
    }

    // Ensure the test belongs to the active org
    const { data: testRow, error: testErr } = await sb
      .from("org_tests")
      .select("id, org_id")
      .eq("id", test_id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (testErr) {
      return NextResponse.json({ error: testErr.message }, { status: 500 });
    }
    if (!testRow) {
      return NextResponse.json(
        { error: "Test not found in your organization." },
        { status: 404 }
      );
    }

    // Simple unique token; swap for ULID/UUID if you prefer
    const token = `${orgId.slice(0, 2)}${Date.now()}`;

    const { data: inserted, error: insErr } = await sb
      .from("test_links")
      .insert({
        org_id: orgId,
        test_id,
        token,
        mode,
        max_uses,
      })
      .select("token")
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // Build absolute URL: prefer NEXT_PUBLIC_APP_URL, fallback to request Host
    const configured =
      process.env.NEXT_PUBLIC_APP_URL &&
      process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    const host = req.headers.get("host");
    const origin = configured || (host ? `https://${host}` : "");
    const url = `${origin}/t/${inserted.token}`;

    return NextResponse.json({ url, token: inserted.token });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}
