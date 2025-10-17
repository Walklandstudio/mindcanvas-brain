// apps/web/app/api/portal/settings/save/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase, ensurePortalMember } from "@/app/_lib/portal";

export async function POST(req: Request) {
  try {
    const sb = await getServerSupabase();

    // Accept both application/x-www-form-urlencoded (from <form>) and JSON bodies.
    let org_id = "";
    let logo_url: string | null = null;
    let brand_voice: string | null = null;

    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({} as any));
      org_id = body.org_id || "";
      logo_url = body.logo_url ?? null;
      brand_voice = body.brand_voice ?? null;
    } else {
      const form = await req.formData();
      org_id = String(form.get("org_id") || "");
      logo_url = (form.get("logo_url") ? String(form.get("logo_url")) : null) ?? null;
      brand_voice = (form.get("brand_voice") ? String(form.get("brand_voice")) : null) ?? null;
    }

    // Guard: ensure the current portal context can write to this org (demo bypass allows-through)
    const resolvedOrgId = await ensurePortalMember({ orgId: org_id, sb });

    // Upsert branding
    const { error } = await sb.from("org_brand_settings").upsert({
      org_id: resolvedOrgId,
      logo_url,
      brand_voice,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // For form posts, redirect back to settings. For JSON, return JSON.
    if (!ct.includes("application/json")) {
      return NextResponse.redirect(new URL("/portal/settings", req.url), { status: 303 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}
