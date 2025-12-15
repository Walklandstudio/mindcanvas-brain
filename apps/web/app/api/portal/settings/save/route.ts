// apps/web/app/api/portal/settings/save/route.ts
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";
import { getActiveOrgId } from "@/app/_lib/portal";

function isNonEmptyString(v: any): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeEmail(v: any): string | null {
  if (!isNonEmptyString(v)) return null;
  const s = v.trim();
  return s.length ? s : null;
}

function normalizeUrl(v: any): string | null {
  if (!isNonEmptyString(v)) return null;
  let s = v.trim();
  if (!s) return null;

  // Allow "example.com" and normalize to https://example.com
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s;
}

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
    return new Response(
      JSON.stringify({ ok: false, error: "No active org found" }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      }
    );
  }

  // -------------------------------
  // 1) Save brand settings (existing)
  // -------------------------------
  // Whitelist fields we expect in org_brand_settings to avoid type errors on unknown keys.
  const allowBrand = [
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

  const brandPayload: Record<string, any> = { org_id };
  let hasBrandUpdates = false;

  for (const k of allowBrand) {
    if (k in body) {
      brandPayload[k] = body[k];
      hasBrandUpdates = true;
    }
  }

  // Only upsert if we actually received any brand keys
  if (hasBrandUpdates) {
    const { error } = await sb
      .from("org_brand_settings")
      .upsert(brandPayload, { onConflict: "org_id" });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  }

  // ----------------------------------------
  // 2) Save org operational settings (NEW)
  // ----------------------------------------
  // These should live on portal.orgs, not org_brand_settings.
  const orgUpdates: Record<string, any> = {};
  let hasOrgUpdates = false;

  if ("notification_email" in body) {
    orgUpdates.notification_email = normalizeEmail(body.notification_email);
    hasOrgUpdates = true;
  }

  // Optional but useful: lets you default Next Steps later, and show on profile.
  if ("website" in body) {
    orgUpdates.website = normalizeUrl(body.website);
    hasOrgUpdates = true;
  }

  if (hasOrgUpdates) {
    const { error: orgErr } = await sb
      .from("orgs")
      .update(orgUpdates)
      .eq("id", org_id);

    if (orgErr) {
      return new Response(
        JSON.stringify({ ok: false, error: orgErr.message }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      updated: {
        brand: hasBrandUpdates,
        org: hasOrgUpdates,
      },
    }),
    {
      headers: { "content-type": "application/json" },
    }
  );
}

