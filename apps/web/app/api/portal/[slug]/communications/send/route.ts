// apps/web/app/api/portal/[slug]/communications/send/route.ts
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
    throw new Error("ORG_NOT_FOUND");
  }

  return data;
}

async function getTestAndTaker(testId: string, takerId: string) {
  const supa = supaAdmin();
  const { data, error } = (await supa
    .from("test_takers")
    .select(
      `
      id,
      email,
      first_name,
      last_name,
      link_token,
      last_result_url,
      tests:test_id (
        id,
        name,
        public_result_enabled,
        public_result_path
      )
    `
    )
    .eq("id", takerId)
    .eq("test_id", testId)
    .maybeSingle()) as any;

  if (error || !data) {
    console.error("[communications/send] getTestAndTaker error", error);
    throw new Error("TAKER_NOT_FOUND");
  }

  return data;
}

function buildLinks(opts: {
  orgSlug: string;
  testId: string;
  linkToken: string;
  lastResultUrl?: string | null;
}) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_VERCEL_URL
      : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`);

  const cleanBase = (baseUrl || "").replace(/\/$/, "");

  // Link to TAKE the test (uses the same link_token used elsewhere)
  const testLink = `${cleanBase}/portal/${opts.orgSlug}/tests/${opts.testId}/take?token=${encodeURIComponent(
    opts.linkToken
  )}`;

  // Report link:
  // 1) Prefer last_result_url if it looks like a URL or path
  // 2) Fall back to /t/[token]/report based on link_token
  let reportLink: string;

  if (opts.lastResultUrl) {
    const v = opts.lastResultUrl;
    if (v.startsWith("http://") || v.startsWith("https://")) {
      reportLink = v;
    } else if (v.startsWith("/")) {
      reportLink = `${cleanBase}${v}`;
    } else {
      // some relative path – be defensive and still try to use it
      reportLink = `${cleanBase}/${v}`;
    }
  } else {
    reportLink = `${cleanBase}/t/${encodeURIComponent(
      opts.linkToken
    )}/report`;
  }

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
    const takerRow = await getTestAndTaker(body.testId, body.takerId);

    if (!takerRow.email) {
      return NextResponse.json(
        { error: "NO_EMAIL", message: "Test taker has no email address." },
        { status: 400 }
      );
    }

    const { testLink, reportLink } = buildLinks({
      orgSlug: slug,
      testId: body.testId,
      linkToken: takerRow.link_token,
      lastResultUrl: takerRow.last_result_url,
    });

    const ctx = {
      first_name: takerRow.first_name || "",
      last_name: takerRow.last_name || "",
      test_name: takerRow.tests?.name || "your assessment",
      test_link: testLink,
      report_link: reportLink,
      org_name: org.name || slug,
      // you can extend this later with owner data when we join it
      owner_name: "",
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


