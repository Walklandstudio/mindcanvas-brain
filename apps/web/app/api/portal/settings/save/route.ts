// apps/web/app/api/portal/settings/save/route.ts
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";
import { getActiveOrgId } from "@/app/_lib/portal";

export async function POST(req: Request) {
  const sb = supabaseAdmin();

  // Determine org: priority = body.org_id > ?orgId override > first active membership
  const url = new URL(req.url);
  const queryOrgId = url.searchParams.get("orgId");
  const body = (await req.json().catch(() => ({}))) as any;

  const org_id: string | null =
    (typeof body.org_id === "string" && body.org_id) ||
    queryOrgId ||
    (await getActiveOrgId());

  if (!org_id) {
    return new Response(JSON.stringify({ ok: false, error: "No active org found" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Whitelist fields we expect in org_brand_settings to avoid type errors on unknown keys.
  const allow = [
    "logo_url",
    "name",
    "brand_color",
    "primary_color",
    "secondary_color",
    "accent_color",
    "brand_voice",
    "theme",
    "header_title",
    "footer_text",
  ] as const;

  const payload: Record<string, any> = { org_id };
  for (const k of allow) {
    if (k in body) payload[k] = body[k];
  }

  // Upsert branding (idempotent on org_id)
  const { error } = await sb
    .from("org_brand_settings")
    .upsert(payload, { onConflict: "org_id" });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
}
