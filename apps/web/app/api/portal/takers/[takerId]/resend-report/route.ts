// apps/web/app/api/portal/takers/[takerId]/resend-report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendTemplatedEmail,
  EmailTemplateType,
} from "@/lib/server/emailTemplates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function supaAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

async function getTakerWithTest(takerId: string) {
  const supa = supaAdmin();

  const { data, error } = await supa
    .from("test_takers")
    .select(
      `
      id,
      org_id,
      test_id,
      token,
      email,
      first_name,
      last_name,
      mobile,
      organisation,
      tests:test_id (
        id,
        name
      )
    `
    )
    .eq("id", takerId)
    .maybeSingle() as any;

  if (error || !data) {
    throw new Error("TAKER_NOT_FOUND");
  }

  return data;
}

function buildLinks(opts: {
  orgSlug: string | null;
  takerToken: string;
}) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_VERCEL_URL
      : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "");

  const cleanBase = (baseUrl || "").replace(/\/$/, "");

  // Public report link
  const reportLink = `${cleanBase}/t/${opts.takerToken}/report`;

  // If we ever want an internal link, we can add it here later
  return { reportLink };
}

async function getOrgSlug(orgId: string): Promise<string | null> {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from("orgs")
    .select("slug")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !data) return null;
  return data.slug || null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { takerId: string } }
) {
  try {
    const takerId = params.takerId;
    const taker = await getTakerWithTest(takerId);

    if (!taker.email) {
      return NextResponse.json(
        {
          error: "NO_EMAIL",
          message: "Test taker has no email address.",
        },
        { status: 400 }
      );
    }

    const orgSlug = await getOrgSlug(taker.org_id);
    const { reportLink } = buildLinks({
      orgSlug,
      takerToken: taker.token,
    });

    const fullName =
      `${taker.first_name || ""} ${taker.last_name || ""}`.trim();

    const ctx = {
      // test taker
      first_name: taker.first_name || "",
      last_name: taker.last_name || "",
      test_taker_full_name: fullName,
      test_taker_email: taker.email || "",
      test_taker_mobile: taker.mobile || "",
      test_taker_org: taker.organisation || "",

      // test
      test_name: taker.tests?.name || "your assessment",

      // links
      report_link: reportLink,

      // owner info – you can join this later
      owner_first_name: "",
      owner_full_name: "",
      owner_email: "",
      owner_website: "",

      // internal links for owner notification – placeholders for now
      internal_report_link: "",
      internal_results_dashboard_link: "",
    };

    const type: EmailTemplateType = "resend_report";

    const result = await sendTemplatedEmail({
      orgId: taker.org_id,
      type,
      to: taker.email,
      context: ctx,
    });

    if (!result.ok) {
      // Bubble up more detail so you can see OneSignal's message
      return NextResponse.json(
        {
          error: "SEND_FAILED",
          detail: result,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("[takers/resend-report] Error", err);
    const msg = typeof err?.message === "string" ? err.message : "UNKNOWN";
    const status = msg === "TAKER_NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
