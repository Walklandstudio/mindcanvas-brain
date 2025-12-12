// apps/web/app/api/portal/[slug]/communications/templates/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  EmailTemplateType,
  EmailTemplate,
  loadOrgTemplates,
  getDefaultTemplate,
} from "@/lib/server/emailTemplates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function supaAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

async function getOrgBySlug(slug: string) {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from("orgs")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    throw new Error("ORG_NOT_FOUND");
  }

  return data;
}

// GET /api/portal/[slug]/communications/templates
// Returns the current org's email templates (custom or default)
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const org = await getOrgBySlug(slug);

    // Load templates (this already merges DB rows + defaults)
    let templates: EmailTemplate[] = await loadOrgTemplates(org.id);

    // Safety: ensure all four types exist, even if something went weird
    const allTypes: EmailTemplateType[] = [
      "report",
      "test_owner_notification",
      "resend_report",
      "send_test_link",
    ];
    const byType = new Map<EmailTemplateType, EmailTemplate>();
    templates.forEach((t) => byType.set(t.type, t));

    templates = allTypes.map((t) => {
      const existing = byType.get(t);
      return (
        existing || {
          ...getDefaultTemplate(t),
        }
      );
    });

    return NextResponse.json(templates);
  } catch (err: any) {
    console.error("[communications/templates] Error", err);
    const msg = typeof err?.message === "string" ? err.message : "UNKNOWN";
    const status = msg === "ORG_NOT_FOUND" ? 404 : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}



