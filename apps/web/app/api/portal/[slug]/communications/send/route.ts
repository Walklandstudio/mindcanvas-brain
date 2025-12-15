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
  return createClient().schema("portal");
}

type SendPayload =
  | { type: "send_test_link"; testId: string; takerId: string }
  | { type: "report"; testId: string; takerId: string }
  | { type: "resend_report"; testId: string; takerId: string }
  | { type: "test_owner_notification"; testId: string; takerId: string };

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

async function getTestById(testId: string) {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from("tests")
    .select("id, name, slug, test_type")
    .eq("id", testId)
    .maybeSingle();

  if (error || !data) {
    console.warn("[communications/send] getTestById missing test", {
      testId,
      error,
    });
    return {
      id: testId,
      name: "your assessment" as string | null,
      slug: null as string | null,
      test_type: null as string | null,
    };
  }

  return data as {
    id: string;
    name: string | null;
    slug: string | null;
    test_type: string | null;
  };
}

function getBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (explicit && explicit.trim().length > 0) return explicit.replace(/\/$/, "");

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL || "";
  if (!vercel) return "";
  return vercel.startsWith("http")
    ? vercel.replace(/\/$/, "")
    : `https://${vercel.replace(/\/$/, "")}`;
}

function getQscVariant(opts: { slug?: string | null; testType?: string | null }) {
  const t = (opts.testType || "").toLowerCase();
  const s = (opts.slug || "").toLowerCase();

  const hasQsc = t.includes("qsc") || s.includes("qsc");
  if (!hasQsc) return { isQsc: false as const, variant: null as null | "leader" | "entrepreneur" };

  let variant: "leader" | "entrepreneur" | null = null;

  if (t.includes("leader") || s.includes("leader")) variant = "leader";
  else if (t.includes("entrepreneur") || s.includes("entrepreneur") || s.includes("entre")) variant = "entrepreneur";

  return { isQsc: true as const, variant };
}

function buildLinks(opts: {
  orgSlug: string;
  testId: string;
  linkToken: string;
  lastResultUrl?: string | null;
  takerId: string;
  testSlug?: string | null;
  testType?: string | null;
}) {
  const base = getBaseUrl();

  const testLink = base
    ? `${base}/portal/${opts.orgSlug}/tests/${opts.testId}/take?token=${encodeURIComponent(
        opts.linkToken
      )}`
    : "";

  let reportLink = "";

  if (opts.lastResultUrl) {
    const v = opts.lastResultUrl;
    if (v.startsWith("http://") || v.startsWith("https://")) reportLink = v;
    else if (v.startsWith("/")) reportLink = base ? `${base}${v}` : v;
    else reportLink = base ? `${base}/${v}` : v;
  } else if (base) {
    const { isQsc, variant } = getQscVariant({ slug: opts.testSlug, testType: opts.testType });

    if (isQsc) {
      if (variant) {
        reportLink = `${base}/qsc/${encodeURIComponent(opts.linkToken)}/${variant}?tid=${encodeURIComponent(opts.takerId)}`;
      } else {
        reportLink = `${base}/qsc/${encodeURIComponent(opts.linkToken)}?tid=${encodeURIComponent(opts.takerId)}`;
      }
    } else {
      reportLink = `${base}/t/${encodeURIComponent(opts.linkToken)}/report?tid=${encodeURIComponent(opts.takerId)}`;
    }
  }

  const nextStepsLink = "";

  const internalReportLink = base ? `${base}/portal/${opts.orgSlug}/database/${opts.takerId}` : "";
  const internalResultsDashboardLink = base ? `${base}/portal/${opts.orgSlug}/dashboard?testId=${opts.testId}` : "";

  return { testLink, reportLink, nextStepsLink, internalReportLink, internalResultsDashboardLink };
}

function getInternalNotificationsTo() {
  return (process.env.INTERNAL_NOTIFICATIONS_EMAIL || "notifications@profiletest.ai").trim();
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const slug = params.slug;
    const body = (await req.json()) as SendPayload;

    const org = await getOrgBySlug(slug);
    const takerRow = await getTakerById(body.takerId);
    const testRow = await getTestById(body.testId);

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
      testSlug: testRow.slug,
      testType: testRow.test_type,
    });

    const firstName = takerRow.first_name || "";
    const lastName = takerRow.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    const ctx = {
      first_name: firstName,
      last_name: lastName,

      test_taker_full_name: fullName || takerRow.email || "",
      test_taker_email: takerRow.email || "",
      test_taker_mobile: takerRow.phone || "",
      test_taker_org: takerRow.company || "",

      test_name: testRow.name || "your assessment",
      org_name: org.name || slug,

      test_link: testLink,
      report_link: reportLink,
      next_steps_link: nextStepsLink,

      internal_report_link: internalReportLink,
      internal_results_dashboard_link: internalResultsDashboardLink,

      owner_first_name: "",
      owner_full_name: "",
      owner_email: "",
      owner_website: "",
    };

    const type: EmailTemplateType = body.type;

    const sentTo =
      type === "test_owner_notification"
        ? getInternalNotificationsTo()
        : (takerRow.email || "").trim();

    if (type !== "test_owner_notification" && !sentTo) {
      return NextResponse.json(
        { error: "NO_EMAIL", message: "Test taker has no email address." },
        { status: 400 }
      );
    }

    const result = await sendTemplatedEmail({
      orgId: org.id,
      type,
      to: sentTo,
      context: ctx,
    });

    if (!result.ok) {
      return NextResponse.json({ error: "SEND_FAILED", detail: result }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        sent_to: sentTo,
        type,
        links: {
          report_link: reportLink,
          test_link: testLink,
          internal_report_link: internalReportLink,
          internal_results_dashboard_link: internalResultsDashboardLink,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[communications/send] Error", err);
    const msg = typeof err?.message === "string" ? err.message : "UNKNOWN";
    const status = msg === "ORG_NOT_FOUND" || msg === "TAKER_NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

