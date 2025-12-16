// apps/web/app/api/portal/links/send-email/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";
import { sendTemplatedEmail } from "@/lib/server/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  orgId: string;
  orgSlug?: string;
  email: string;
  linkUrl: string;
  orgName?: string;
  testName?: string;
};

function supaAdmin() {
  return createClient().schema("portal");
}

function normalizeEmail(v: string | null | undefined) {
  const s = (v || "").trim();
  return s.length ? s : "";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Body>;

    const orgId = String(body.orgId || "").trim();
    const to = String(body.email || "").trim();
    const testLink = String(body.linkUrl || "").trim();
    const testName = String(body.testName || "your assessment").trim();

    if (!orgId) {
      return NextResponse.json({ ok: false, error: "MISSING_ORG_ID" }, { status: 400 });
    }
    if (!to) {
      return NextResponse.json({ ok: false, error: "MISSING_EMAIL" }, { status: 400 });
    }
    if (!testLink) {
      return NextResponse.json({ ok: false, error: "MISSING_LINK" }, { status: 400 });
    }

    const sb = supaAdmin();

    const { data: org, error: orgErr } = await sb
      .from("orgs")
      .select("id, slug, name, support_email")
      .eq("id", orgId)
      .maybeSingle();

    if (orgErr || !org) {
      console.error("[portal/links/send-email] org lookup failed", orgErr);
      return NextResponse.json({ ok: false, error: "ORG_NOT_FOUND" }, { status: 404 });
    }

    const orgName = String(org.name || org.slug || body.orgName || "Our team").trim();
    const supportEmail =
      normalizeEmail(org.support_email) || normalizeEmail(process.env.INTERNAL_NOTIFICATIONS_EMAIL) || "support@profiletest.ai";

    // Important: this flow doesn’t know the recipient’s first name.
    // We use a friendly default to avoid "Hi ,"
    const ctx: Record<string, string> = {
      first_name: "there",
      test_name: testName,
      org_name: orgName,
      support_email: supportEmail,
      test_link: testLink,
    };

    const result = await sendTemplatedEmail({
      orgId: org.id,
      type: "send_test_link",
      to,
      context: ctx,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "SEND_FAILED", detail: result }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[portal/links/send-email] error", err);
    return NextResponse.json({ ok: false, error: "UNKNOWN" }, { status: 500 });
  }
}
