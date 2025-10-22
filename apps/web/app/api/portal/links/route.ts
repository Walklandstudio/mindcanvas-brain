// apps/web/app/api/portal/links/route.ts
import { NextResponse } from "next/server";
import {
  getServerSupabase,
  getActiveOrgId,
  ensurePortalMember,
  getActiveOrg,
  type Org,
} from "@/app/_lib/portal";

type Body =
  | { testId: string; maxUses?: number; expiresInDays?: number; kind?: "full" | "free" }
  | { testSlug: string; maxUses?: number; expiresInDays?: number; kind?: "full" | "free" };

export async function POST(req: Request) {
  try {
    const sb = await getServerSupabase();

    // Resolve org
    const orgId = await getActiveOrgId(sb);
    if (!orgId) {
      return NextResponse.json({ ok: false, error: "No active org." }, { status: 401 });
    }
    await ensurePortalMember(sb, orgId);

    // Get org details (for token prefix, display, etc.)
    let org: Org | null = null;
    try {
      org = await getActiveOrg(sb, orgId);
    } catch {
      org = null;
    }

    // Parse body
    const body = (await req.json().catch(() => ({}))) as Body;
    const maxUses = Number((body as any).maxUses ?? 1);
    const expiresInDays = Number((body as any).expiresInDays ?? 30);
    const kind = (body as any).kind === "free" ? "free" : "full";

    // Resolve test id (UUID or slug)
    let testId: string | null = null;

    if ("testId" in body && body.testId) {
      const { data: own, error: ownErr } = await sb
        .from("org_tests")
        .select("id")
        .eq("id", body.testId)
        .eq("org_id", orgId)
        .limit(1)
        .maybeSingle();
      if (ownErr) throw ownErr;
      if (!own) {
        return NextResponse.json(
          { ok: false, error: "Test not found in this org." },
          { status: 404 }
        );
      }
      testId = own.id as string;
    } else if ("testSlug" in body && body.testSlug) {
      const { data: row, error: rowErr } = await sb
        .from("org_tests")
        .select("id")
        .eq("org_id", orgId)
        .eq("slug", body.testSlug)
        .limit(1)
        .maybeSingle();
      if (rowErr) throw rowErr;
      if (!row) {
        return NextResponse.json(
          { ok: false, error: "Test slug not found in this org." },
          { status: 404 }
        );
      }
      testId = row.id as string;
    } else {
      return NextResponse.json(
        { ok: false, error: "Provide 'testId' or 'testSlug'." },
        { status: 400 }
      );
    }

    // Generate token prefix by org slug
    let prefix = "lk";
    if (org?.slug?.startsWith("team")) prefix = "tp";
    else if (org?.slug?.startsWith("competency")) prefix = "cc";
    const token = `${prefix}${Math.floor(Date.now() / 1000)}`;

    // Expiry
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    // Insert link
    const { data: ins, error: insErr } = await sb
      .from("test_links")
      .insert([
        {
          org_id: orgId,
          test_id: testId,
          token,
          kind,
          max_uses: maxUses,
          expires_at: expiresAt,
        },
      ])
      .select("id, token")
      .maybeSingle();

    if (insErr) throw insErr;
    if (!ins) {
      return NextResponse.json({ ok: false, error: "Failed to create link." }, { status: 500 });
    }

    // Absolute URL
    const site =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const url = site ? `${site}/t/${ins.token}` : `/t/${ins.token}`;

    return NextResponse.json({
      ok: true,
      data: {
        id: ins.id,
        token: ins.token,
        url,
        maxUses,
        kind,
        expiresInDays,
      },
    });
  } catch (err: any) {
    console.error("POST /api/portal/links error:", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
