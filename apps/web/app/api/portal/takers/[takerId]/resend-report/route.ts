// apps/web/app/api/portal/takers/[takerId]/resend-report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";
import { sendTemplatedEmail } from "@/lib/server/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function supaAdmin() {
  return createClient().schema("portal");
}

function getBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (explicit && explicit.trim().length > 0) return explicit.replace(/\/$/, "");

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL || "";
  if (!vercel) return "";
  return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel.replace(/\/$/, "")}`;
}

function normalizeEmail(v: string | null | undefined) {
  const s = (v || "").trim();
  return s.length ? s : "";
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

export async function POST(req: NextRequest, { params }: { params: { takerId: string } }) {
  try {
    const takerId = params.takerId;
    if (!takerId) return NextResponse.json({ ok: false, error: "MISSING_TAKER_ID" }, { status: 400 });

    const sb = supaAdmin();

    // Load taker (needs org/test/token/email)
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select("id, org_id, test_id, link_token, email, first_name, last_name, phone, company, last_result_url")
      .eq("id", takerId)
      .maybeSingle();

    if (takerErr || !taker) {
      return NextResponse.json({ ok: false, error: "TAKER_NOT_FOUND" }, { status: 404 });
    }

    const to = normalizeEmail(taker.email);
    if (!to) {
      return NextResponse.json({ ok: false, error: "NO_EMAIL" }, { status: 400 });
    }

    // Load org (name + support email)
    const { data: org, error: orgErr } = await sb
      .from("orgs")
      .select("id, slug, name, support_email, website_url, website")
      .eq("id", taker.org_id)
      .maybeSingle();

    if (orgErr || !org) {
      return NextResponse.json({ ok: false, error: "ORG_NOT_FOUND" }, { status: 404 });
    }

    // Load test (for QSC detection)
    const { data: test, error: testErr } = await sb
      .from("tests")
      .select("id, name, slug, test_type")
      .eq("id", taker.test_id)
      .maybeSingle();

    if (testErr || !test) {
      return NextResponse.json({ ok: false, error: "TEST_NOT_FOUND" }, { status: 500 });
    }

    const base = getBaseUrl();

    // Build report link deterministically (ignore last_result_url here to avoid wrong report types)
    let reportLink = "";
    if (base) {
      const { isQsc, variant } = getQscVariant({ slug: test.slug, testType: test.test_type });

      if (isQsc) {
        if (variant) {
          reportLink = `${base}/qsc/${encodeURIComponent(taker.link_token)}/${variant}?tid=${encodeURIComponent(taker.id)}`;
        } else {
          reportLink = `${base}/qsc/${encodeURIComponent(taker.link_token)}?tid=${encodeURIComponent(taker.id)}`;
        }
      } else {
        reportLink = `${base}/t/${encodeURIComponent(taker.link_token)}/report?tid=${encodeURIComponent(taker.id)}`;
      }
    }

    const firstName = taker.first_name || "";
    const lastName = taker.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    const ctx = {
      first_name: firstName,
      last_name: lastName,
      test_taker_full_name: fullName || to,
      test_taker_email: to,
      test_taker_mobile: taker.phone || "",
      test_taker_org: taker.company || "",
      test_name: test.name || "your assessment",
      org_name: org.name || org.slug,
      report_link: reportLink,
      test_link: "", // not used in resend_report
      next_steps_link: "",
      internal_report_link: base ? `${base}/portal/${org.slug}/database/${taker.id}` : "",
      internal_results_dashboard_link: base ? `${base}/portal/${org.slug}/dashboard?testId=${taker.test_id}` : "",
      owner_email: org.support_email || "",
      owner_website: org.website_url || org.website || "",
      owner_first_name: "",
      owner_full_name: "",
    };

    const result = await sendTemplatedEmail({
      orgId: org.id,
      type: "resend_report",
      to,
      context: ctx,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "SEND_FAILED", detail: result }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        sent_to: to,
        report_link: reportLink,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[takers/resend-report] error", err);
    return NextResponse.json({ ok: false, error: err?.message || "UNKNOWN" }, { status: 500 });
  }
}

