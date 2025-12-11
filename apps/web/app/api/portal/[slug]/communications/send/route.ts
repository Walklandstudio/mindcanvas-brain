// apps/web/app/api/portal/[slug]/communications/send/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";
import {
  sendTemplatedEmail,
  EmailTemplateType,
} from "@/lib/server/emailTemplates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Use the same helper as the Database page so we hit the same DB/schema
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

// 🔧 relaxed: look up taker by ID only, using same client as Database page
async function getTakerWithTest(takerId: string) {
  const sb = supaPortal();

  const { data, error } = await sb
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
    .maybeSingle();

  if (error) {
    console.error("[communications/send] taker lookup error", error);
    throw new Error("TAKER_NOT_FOUND");
  }

  if (!data) {
    console.warn("[communications/send] taker not found for id", takerId);
    throw new Error("TAKER_NOT_FOUND");
  }

  return data as any;
}

function buildLinks(opts: {
  orgSlug: string;
  testId: string;
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

  const testLink = `${cleanBase}/portal/${opts.orgSlug}/tests/${opts.testId}/take?token=${opts.takerToken}`;
  const reportLink = `${cleanBase}/t/${opts.takerToken}/report`;

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
    const taker = await getTakerWithTest(body.takerId);

    if (!taker.email) {
      return NextResponse.json(
        {
          error: "NO_EMAIL",
          message: "Test taker has no email address.",
        },
        { status: 400 }
      );
    }

    const { testLink, reportLink } = buildLinks({
      orgSlug: slug,
      // for the /tests/[id]/take link we use the client-supplied testId
      testId: body.testId,
      takerToken: taker.token,
    });

    const fullName =
      `${taker.first_name || ""} ${taker.last_name || ""}`.trim();

    const ctx = {
      // taker info
      first_name: taker.first_name || "",
      last_name: taker.last_name || "",
      test_taker_full_name: fullName,
      test_taker_email: taker.email || "",
      test_taker_mobile: taker.mobile || "",
      test_taker_org: taker.organisation || "",

      // test info
      test_name: taker.tests?.name || "your assessment",

      // links
      test_link: testLink,
      report_link: reportLink,
      next_steps_link: "",

      // owner info – to be enriched later
      owner_first_name: "",
      owner_full_name: "",
      owner_email: "",
      owner_website: "",

      // owner notification links – placeholders for now
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
