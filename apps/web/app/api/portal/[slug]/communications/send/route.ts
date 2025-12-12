// apps/web/app/api/portal/[slug]/communications/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";
import {
  sendTemplatedEmail,
  EmailTemplateType,
} from "@/lib/server/emailTemplates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function supaAdmin() {
  // Use shared server client in portal schema
  return createClient().schema("portal");
}

type SendPayload =
  | {
      type: "send_test_link";
      testId: string;
      takerId: string;
    }
  | {
      type: "report";
      testId: string;
      takerId: string;
    }
  | {
      type: "resend_report";
      testId: string;
      takerId: string;
    }
  | {
      type: "test_owner_notification";
      testId: string;
      takerId: string;
    };

async function getOrgBySlug(slug: string) {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from("orgs")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    console.error("[communications/send] getOrgBySlug error", error);
    throw new Error("ORG_NOT_FOUND");
  }

  return data as { id: string; slug: string; name: string | null };
}

/**
 * Fetch taker by primary key only.
 */
async function getTakerById(takerId: string) {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from("test_takers")
    .select(
      `
      id,
      org_id,
      test_id,
      email,
      first_name,
      last_name,
      link_token,
      last_result_url,
      phone,
      company
    `
    )
    .eq("id", takerId)
    .maybeSingle();

  if (error || !data) {
    console.error("[communications/send] getTakerById error", error, {
      takerId,
    });
    throw new Error("TAKER_NOT_FOUND");
  }

  return data as {
    id: string;
    org_id: string;
    test_id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    link_token: string;
    last_result_url: string | null;
    phone: string | null;
    company: string | null;
  };
}

/**
 * Fetch base test info by id (for test name).
 */
async function getTestById(testId: string) {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from("tests")
    .select("id, name")
    .eq("id", testId)
    .maybeSingle();

  if (error || !data) {
    console.warn("[communications/send] getTestById missing test", {
      testId,
      error,
    });
    return { id: testId, name: "your assessment" as string | null };
  }

  return data as { id: string; name: string | null };
}

function getBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (explicit && explicit.trim().length > 0) {
    return explicit.replace(/\/$/, "");
  }

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL || "";
  if (!vercel) return "";
  return vercel.startsWith("http")
    ? vercel.replace(/\/$/, "")
    : `https://${vercel.replace(/\/$/, "")}`;
}

/**
 * Build all important links used in templates.
 */
function buildLinks(opts: {
  orgSlug: string;
  testId: string;
  linkToken: string;
  lastResultUrl?: string | null;
  takerId: string;
}) {
  const base = getBaseUrl();

  // 1) Public test link (for send_test_link emails)
  const testLink = base
    ? `${base}/portal/${opts.orgSlug}/tests/${opts.testId}/take?token=${encodeURIComponent(
        opts.linkToken
      )}`
    : "";

  // 2) Public report link for the test-taker
  let reportLink = "";

  if (opts.lastResultUrl) {
    const v = opts.lastResultUrl;
    if (v.startsWith("http://") || v.startsWith("https://")) {
      reportLink = v;
    } else if (v.startsWith("/")) {
      reportLink = base ? `${base}${v}` : v;
    } else {
      reportLink = base ? `${base}/${v}` : v;
    }
  } else if (base) {
    // fallback to token-based report route
    reportLink = `${base}/t/${encodeURIComponent(opts.linkToken)}/report`;
  }

  // 3) “Next steps” link – for now, send them to the org’s Links page
  const nextStepsLink = base
    ? `${base}/portal/${opts.orgSlug}/links`
    : "";

  // 4) Internal links (for test owner notification)
  const internalReportLink = base
    ? `${base}/portal/${opts.orgSlug}/database/${opts.takerId}`
    : "";

  const internalResultsDashboardLink = base
    ? `${base}/portal/${opts.orgSlug}/dashboard?testId=${opts.testId}`
    : "";

  return { testLink, reportLink, nextStepsLink, internalReportLink, internalResultsDashboardLink };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const body = (await req.json()) as SendPayload;

    const org = await getOrgBySlug(slug);
    const takerRow = await getTakerById(body.takerId);
    const testRow = await getTestById(body.testId);

    if (!takerRow.email) {
      return NextResponse.json(
        { error: "NO_EMAIL", message: "Test taker has no email address." },
        { status: 400 }
      );
    }

    const {
      testLink,
      reportLink,
      nextStepsLink,
      internalReportLink,
      internalResultsDashboardLink,
    } = buildLinks({
      orgSlug: slug,
      testId: body.testId,
      linkToken: takerRow.link_token,
      lastResultUrl: takerRow.last_result_url,
      takerId: takerRow.id,
    });

    const firstName = takerRow.first_name || "";
    const lastName = takerRow.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    // Context for all templates
    const ctx = {
      // generic person fields
      first_name: firstName,
      last_name: lastName,
      test_taker_full_name: fullName || takerRow.email || "",
      test_taker_email: takerRow.email || "",
      test_taker_mobile: takerRow.phone || "",
      test_taker_org: takerRow.company || "",

      // test & org
      test_name: testRow.name || "your assessment",
      org_name: org.name || slug,

      // public links
      test_link: testLink,
      report_link: reportLink,
      next_steps_link: nextStepsLink,

      // internal links
      internal_report_link: internalReportLink,
      internal_results_dashboard_link: internalResultsDashboardLink,

      // owner fields (can be filled properly later when we join the owner)
      owner_first_name: "",
      owner_full_name: "",
      owner_email: "",
      owner_website: "",
    };

    const type: EmailTemplateType = body.type;

    const result = await sendTemplatedEmail({
      orgId: org.id,
      type,
      to: takerRow.email,
      context: ctx,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "SEND_FAILED", detail: result },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[communications/send] Error", err);
    const msg = typeof err?.message === "string" ? err.message : "UNKNOWN";
    const status =
      msg === "ORG_NOT_FOUND" || msg === "TAKER_NOT_FOUND" ? 404 : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}
