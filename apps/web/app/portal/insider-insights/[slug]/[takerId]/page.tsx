// apps/web/app/portal/insider-insights/[slug]/[takerId]/page.tsx
//
// Insider Insights — the private, adviser-facing companion report for an
// Inevitable Standard test taker. Reached from the "Open Insider Insights"
// button on /portal/[slug]/database/[takerId].
//
// Deliberately NOT under /portal/[slug]/* : that segment's layout wraps every
// child in the portal sidebar + "Welcome" header. This report renders
// standalone, matching the client-facing Reports 1 and 2 under /t/[token]/*.
//
// Access: middleware.ts guarantees a signed-in portal user; requirePortalOrgAccess
// then enforces session -> org -> membership. A caller outside the org (or the
// taker outside the org) gets notFound(), matching the "don't leak existence"
// posture of the parent profile page.
import "server-only";

import { notFound } from "next/navigation";

import { requirePortalOrgAccess } from "@/lib/portal/authz";
import { createClient } from "@/lib/server/supabaseAdmin";
import { buildInsiderInsightsReport } from "@/lib/inevitable-standard/buildInsiderInsightsReport";

import InsiderInsightsReportClient from "./InsiderInsightsReportClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseTotals(totals: unknown): any {
  if (!totals) return {};
  try {
    if (typeof totals === "string") {
      const once = JSON.parse(totals);
      return typeof once === "string" ? JSON.parse(once) : once;
    }
    return totals || {};
  } catch {
    return {};
  }
}

/**
 * The definitive signal that a stored result is an Inevitable Standard one: the
 * score engine writes `totals.inevitable_standard` with a `pillars` map. The
 * test-metadata checks mirror the public result route for older/edge rows.
 */
function inevitableStandardScore(totals: any, test: any): unknown | null {
  const score = totals?.inevitable_standard;
  if (score && typeof score === "object" && score.pillars) return score;

  const meta = (test?.meta as any) ?? {};
  const slug = String(test?.slug || "").toLowerCase().trim();
  const name = String(test?.name || "").toLowerCase().trim();
  const looksInevitable =
    meta?.is_inevitable_standard === true ||
    totals?.meta?.is_inevitable_standard === true ||
    slug === "inevitable-standard" ||
    slug.startsWith("inevitable-standard-") ||
    name.includes("inevitable standard");

  return looksInevitable && score && typeof score === "object" ? score : null;
}

export default async function InsiderInsightsPage({
  params,
}: {
  params: { slug: string; takerId: string };
}) {
  const { slug, takerId } = params;

  const guard = await requirePortalOrgAccess({ slug, permission: "read" });
  if (!guard.ok) return notFound();
  const org = guard.access.org;

  const sb = createClient().schema("portal");

  const { data: taker, error: takerError } = await sb
  .from("test_takers")
  .select(
    "id, org_id, test_id, link_token, first_name, last_name, email, company"
  )
  .eq("id", takerId)
  .maybeSingle();

if (takerError) {
  console.error("[Insider Insights] Unable to load test taker:", {
    takerId,
    error: takerError.message,
  });

  throw takerError;
}

if (!taker) return notFound();

  if (!taker) return notFound();

  // The taker must belong to this org, or have a submission for one of the org's
  // tests (matches the parent profile page's allow rule).
  let allowed = taker.org_id === org.id;
  if (!allowed) {
    const { data: subs } = await sb
      .from("test_submissions")
      .select("test_id")
      .eq("taker_id", taker.id)
      .order("created_at", { ascending: false })
      .limit(25);
    const testIds = Array.from(
      new Set((subs || []).map((s: any) => s?.test_id).filter(Boolean)),
    ) as string[];
    if (testIds.length) {
      const { data: testsForSubs } = await sb
        .from("tests")
        .select("id, org_id")
        .in("id", testIds);
      allowed = (testsForSubs || []).some((t: any) => t?.org_id === org.id);
    }
  }
  if (!allowed) return notFound();

  const { data: test } = await sb
    .from("tests")
    .select("id, name, slug, meta")
    .eq("id", taker.test_id)
    .maybeSingle();

  const { data: results } = await sb
    .from("test_results")
    .select("id, created_at, totals")
    .eq("taker_id", taker.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const latest = (results ?? [])[0] || null;
  const totals = parseTotals(latest?.totals);
  const score = inevitableStandardScore(totals, test);
  if (!score) return notFound();

let nextStepsHref: string | null = null;

if (taker.link_token) {
  const { data: originatingLink, error: linkError } = await sb
    .from("test_links")
    .select("next_steps_url, redirect_url")
    .eq("token", taker.link_token)
    .maybeSingle();

  if (linkError) {
    console.warn("[Insider Insights] Unable to load originating link:", {
      takerId,
      linkToken: taker.link_token,
      error: linkError.message,
    });
  }

  nextStepsHref =
    (
      originatingLink?.next_steps_url ||
      originatingLink?.redirect_url ||
      ""
    ).trim() || null;
  }

  const fullName = [taker.first_name, taker.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const report = buildInsiderInsightsReport({
    score,
    taker: { fullName, email: taker.email, company: taker.company },
    test: { name: test?.name ?? null },
    org: { name: org.name },
    completedAt: latest?.created_at ?? null,
  });

  if (!report) return notFound();

  return (
    <InsiderInsightsReportClient
      report={report}
      backHref={`/portal/${encodeURIComponent(slug)}/database/${encodeURIComponent(
        taker.id,
      )}`}
      nextStepsHref={nextStepsHref}
    />
  );
}
