// apps/web/app/api/portal/[slug]/communications/send/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";
import {
  sendTemplatedEmail,
  EmailTemplateType,
} from "@/lib/server/emailTemplates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Use the same helper as the Database page
function supaPortal() {
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
  const sb = supaPortal();
  const { data, error } = await sb
    .from("orgs")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    console.error("[communications/send] org lookup error", error);
    throw new Error("ORG_NOT_FOUND");
  }

  return data;
}

// 🔑 Match your actual schema: link_token, phone, company, last_result_url
async function getTaker(takerId: string) {
  const sb = supaPortal();

  const { data, error } = await sb
    .from("test_takers")
    .select(
      `
      id,
      org_id,
      test_id,
      link_token,
      email,
      first_name,
      last_name,
      phone,
      company,
      last_result_url
    `
    )
    .eq("id", takerId)
    .maybeSingle();

  if (error) {
    console.error("[communications/send] taker lookup error", error);
    throw new Error("TAKER_NOT_FOUND");
  }

  if (!data) {
    console.warn("[communications/send] taker not found for id", takerId);
    throw new Error("TAKER_NOT_FOUND");
  }

  return data as {
    id: string;
    org_id: string;
    test_id: string;
    link_token: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    company: string | null;
    last_result_url: string | null;
  };
}

// Optional: get test name for nicer subject
async function getTestName(testId: string | null) {
  if (!testId) return "your assessment";

  const sb = supaPortal();
  const { data, error } = await sb
    .from("tests")
    .select("name")
    .eq("id", testId)
    .maybeSingle();

  if (error || !data) return "your assessment";
  return data.name || "your assessment";
}

// Build links using link_token + last_result_url
function buildLinks(opts: {
  baseUrl: string;
  linkToken: string;
  lastResultUrl: string | null;
}) {
  const cleanBase = (opts.baseUrl || "").replace(/\/$/, "");

  // Public test link (the same token used in test_links)
  const testLink = `${cleanBase}/t/${opts.linkToken}`;

  // Report link – prefer the stored last_result_url, fallback to /t/[token]/report
  const reportLink =
    opts.lastResultUrl && opts.lastResultUrl.trim().length > 0
      ? opts.lastResultUrl
      : `${cleanBase}/t/${opts.linkToken}/report`;

  return { testLink, reportLink };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const body = (await req.json()) as SendPayload;

    const org = await getOrgBySlug(slug);
    const taker = await getTaker(body.takerId);
    const testName = await getTestName(taker.test_id);

    if (!taker.email) {
      return NextResponse.json(
        {
          error: "NO_EMAIL",
          message: "Test taker has no email address.",
        },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_BASE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL?.startsWith("http")
        ? process.env.NEXT_PUBLIC_VERCEL_URL
        : process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "");

    const { testLink, reportLink } = buildLinks({
      baseUrl: baseUrl || "",
      linkToken: taker.link_token,
      lastResultUrl: taker.last_result_url,
    });

    const fullName =
      `${taker.first_name || ""} ${taker.last_name || ""}`.trim();

    const ctx = {
      // test taker info (mapped to your template placeholders)
      first_name: taker.first_name || "",
      last_name: taker.last_name || "",
      test_taker_full_name: fullName,
      test_taker_email: taker.email || "",
      test_taker_mobile: taker.phone || "",
      test_taker_org: taker.company || "",

      // test info
      test_name: testName,

      // links
      test_link: testLink,
      report_link: reportLink,
      next_steps_link: "",

      // owner info – you can enrich later from tests/orgs/owners
      owner_first_name: "",
      owner_full_name: "",
      owner_email: "",
      owner_website: "",

      // owner-only links – TODO: wire up internal dashboard URLs later
      internal_report_link: "",
      internal_results_dashboard_link: "",
      org_name: org.name || slug,
    };

    const type: EmailTemplateType = body.type;

    const result = await sendTemplatedEmail({
      orgId: org.id,
      type,
      to: taker.email,
      context: ctx,
    });

    if (!result.ok) {
      console.error("[communications/send] sendTemplatedEmail failed", result);
      return NextResponse.json(
        { error: "SEND_FAILED", detail: result },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error("[communications/send] Error", err);
    const msg = typeof err?.message === "string" ? err.message : "UNKNOWN";
    const status =
      msg === "ORG_NOT_FOUND" || msg === "TAKER_NOT_FOUND" ? 404 : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}

