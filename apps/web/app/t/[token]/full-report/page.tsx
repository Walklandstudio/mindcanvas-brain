// apps/web/app/t/[token]/full-report/page.tsx
import InevitableStandardFullDiagnosticClient from "./InevitableStandardFullDiagnosticClient";
import ReportPaywall from "./ReportPaywall";
import { portalAdmin } from "@/app/_lib/supabaseAdmin";
import { requireOrgAccess } from "@/lib/server/orgAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function InevitableStandardFullReportPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { tid?: string };
}) {
  const tid = typeof searchParams?.tid === "string" ? searchParams.tid : "";

  if (tid) {
    const sb = portalAdmin();
    const link = await sb
      .from("test_links")
      .select("id, org_id, meta")
      .eq("token", params.token)
      .maybeSingle();

    const meta = (link.data?.meta || {}) as Record<string, any>;
    if (meta.report_paywall_enabled === true) {
      const submission = await sb
        .from("test_submissions")
        .select("id")
        .eq("taker_id", tid)
        .eq("link_token", params.token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const paid = submission.data?.id
        ? await sb
            .from("purchases")
            .select("id")
            .eq("purchase_type", "report_upgrade")
            .eq("submission_id", submission.data.id)
            .eq("status", "paid")
            .limit(1)
            .maybeSingle()
        : { data: null };

      if (!paid.data) {
        // The paygate restricts the test taker, not the organisation
        // that owns the diagnostic. A signed-in org member or platform
        // superadmin may inspect the Full Diagnostic Report without
        // unlocking it for the test taker.
        const orgId =
          typeof link.data?.org_id === "string"
            ? link.data.org_id
            : "";

        const ownerAccess = orgId
          ? await requireOrgAccess(orgId)
          : null;

        if (!ownerAccess?.ok) {
          return (
            <ReportPaywall
              token={params.token}
              tid={tid}
              amountCents={Number(meta.report_price_cents || 0)}
              currency={String(meta.report_currency || "gbp")}
            />
          );
        }
      }
    }
  }

  return <InevitableStandardFullDiagnosticClient token={params.token} tid={tid} />;
}
