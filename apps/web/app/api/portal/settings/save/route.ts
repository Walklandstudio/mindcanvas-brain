// apps/web/app/api/portal/settings/save/route.ts
import { NextResponse } from "next/server";
import { ensurePortalMember } from "@/app/_lib/portal";

export async function POST(req: Request) {
  const { supabase, orgId } = await ensurePortalMember();
  const form = await req.formData();
  const payload = {
    org_id: orgId,
    logo_url: (form.get("logo_url") || null) as string | null,
    brand_voice: (form.get("brand_voice") || null) as string | null,
    audience: (form.get("audience") || null) as string | null,
    notes: (form.get("notes") || null) as string | null,
  };

  const { error } = await supabase.from("org_brand_settings").upsert(payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.redirect("/portal/settings", { status: 302 });
}
