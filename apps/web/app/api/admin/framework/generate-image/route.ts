// apps/web/app/api/admin/framework/generate-images/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";
import { generateImageURL } from "../../../../_lib/ai";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function POST() {
  const sb = getServiceClient();

  // Find framework
  const fw = await sb.from("org_frameworks").select("id,frequency_meta").eq("org_id", ORG_ID).maybeSingle();
  if (fw.error || !fw.data) {
    return NextResponse.json({ error: fw.error?.message || "framework not found" }, { status: 500 });
  }
  const framework_id = fw.data.id;

  // 1) Generate frequency images (if missing + prompt present)
  const meta = (fw.data.frequency_meta as any) || {};
  for (const key of ["A","B","C","D"]) {
    const item = meta[key] || {};
    if (!item.image_url && item.image_prompt) {
      item.image_url = await generateImageURL(item.image_prompt);
      meta[key] = item;
    }
  }
  await sb.from("org_frameworks").update({ frequency_meta: meta }).eq("id", framework_id);

  // 2) Generate profile images
  const profs = await sb
    .from("org_profiles")
    .select("id,name,image_url,image_prompt")
    .eq("org_id", ORG_ID)
    .eq("framework_id", framework_id);
  if (profs.error) return NextResponse.json({ error: profs.error.message }, { status: 500 });

  for (const p of profs.data || []) {
    if (!p.image_url && p.image_prompt) {
      const url = await generateImageURL(p.image_prompt);
      const upd = await sb.from("org_profiles").update({ image_url: url }).eq("id", p.id);
      if (upd.error) {
        return NextResponse.json({ error: upd.error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
