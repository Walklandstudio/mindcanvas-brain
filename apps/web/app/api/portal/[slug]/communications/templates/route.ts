// apps/web/app/api/portal/[slug]/communications/templates/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";
import {
  EmailTemplateType,
  EmailTemplate,
  getOrgEmailTemplates,
  getDefaultTemplate,
} from "@/lib/server/emailTemplates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function supaPortal() {
  return createClient().schema("portal");
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const sb = supaPortal();

    // 1) Resolve org by slug
    const { data: org, error: orgErr } = await sb
      .from("orgs")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (orgErr || !org) {
      return NextResponse.json(
        { error: "ORG_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 2) Load templates for this org (DB + defaults)
    const templates = await getOrgEmailTemplates(org.id);

    // 3) Ensure all 4 types are present (fallback to defaults if any missing)
    const allTypes: EmailTemplateType[] = [
      "report",
      "test_owner_notification",
      "resend_report",
      "send_test_link",
    ];

    const byType = new Map<EmailTemplateType, EmailTemplate>();
    templates.forEach((tpl) => byType.set(tpl.type, tpl));

    const rows = allTypes.map((t) => {
      const existing = byType.get(t);
      if (existing) return existing;

      const def = getDefaultTemplate(t);
      return {
        type: t,
        subject: def.subject,
        body_html: def.body_html, // ✅ snake_case
      };
    });

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("[communications/templates] Error", err);
    return NextResponse.json(
      { error: "TEMPLATES_LOAD_FAILED" },
      { status: 500 }
    );
  }
}


