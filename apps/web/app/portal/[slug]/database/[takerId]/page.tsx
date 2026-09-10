// apps/web/app/portal/[slug]/database/[takerId]/page.tsx
// Server component — /portal/[slug]/database/[takerId]
// Contact info + latest results with Frequency/Profile mixes (no fragile views)

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";
import { StandardResultGraphs, QscResultGraphs } from "./ResultGraphs";

export const dynamic = "force-dynamic";

type Totals = Record<string, any> | string | null | undefined;

type GedChoiceAnswer = {
  question_id?: string | null;
  question_text?: string | null;
  value?: string | null;
  label?: string | null;
};

type GedDiagnostics = {
  business_stage: GedChoiceAnswer | null;
  core_constraint: GedChoiceAnswer | null;
  scale_readiness: GedChoiceAnswer | null;
  self_diagnosis: string | null;
};

function parseTotals(totals: Totals): any {
  if (!totals) return {};

  try {
    if (typeof totals === "string") {
      const once = JSON.parse(totals);

      if (typeof once === "string") {
        return JSON.parse(once);
      }

      return once;
    }

    return totals || {};
  } catch {
    return {};
  }
}

function normaliseGedChoice(value: any): GedChoiceAnswer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const questionId =
    typeof value.question_id === "string" ? value.question_id.trim() : null;

  const questionText =
    typeof value.question_text === "string"
      ? value.question_text.trim()
      : null;

  const answerValue =
    typeof value.value === "string" ? value.value.trim() : null;

  const answerLabel =
    typeof value.label === "string" ? value.label.trim() : null;

  if (!questionId && !questionText && !answerValue && !answerLabel) {
    return null;
  }

  return {
    question_id: questionId || null,
    question_text: questionText || null,
    value: answerValue || null,
    label: answerLabel || null,
  };
}

function extractGedDiagnostics(totals: Totals): GedDiagnostics | null {
  const parsed = parseTotals(totals);
  const rawGed = parsed?.meta?.ged;

  if (!rawGed || typeof rawGed !== "object" || Array.isArray(rawGed)) {
    return null;
  }

  const selfDiagnosis =
    typeof rawGed.self_diagnosis === "string"
      ? rawGed.self_diagnosis.trim() || null
      : null;

  const diagnostics: GedDiagnostics = {
    business_stage: normaliseGedChoice(rawGed.business_stage),
    core_constraint: normaliseGedChoice(rawGed.core_constraint),
    scale_readiness: normaliseGedChoice(rawGed.scale_readiness),
    self_diagnosis: selfDiagnosis,
  };

  const hasAnyValue = Boolean(
    diagnostics.business_stage ||
      diagnostics.core_constraint ||
      diagnostics.scale_readiness ||
      diagnostics.self_diagnosis
  );

  return hasAnyValue ? diagnostics : null;
}

function gedAnswerText(answer: GedChoiceAnswer | null): string {
  if (!answer) return "—";

  return answer.label || answer.value || "—";
}

function asPercentMap(values: Record<string, number>): Record<string, number> {
  const sum = Object.values(values).reduce((a, b) => a + (Number(b) || 0), 0);

  if (!sum) {
    return Object.fromEntries(Object.keys(values).map((k) => [k, 0]));
  }

  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [
      k,
      Math.round(((Number(v) || 0) / sum) * 100),
    ])
  );
}

function sortDesc(obj: Record<string, number>) {
  return Object.entries(obj).sort((a, b) =>
    b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]
  );
}

function codeToPShort(code?: string | null) {
  if (!code) return "";

  const m = code.match(/PROFILE_(\d+)/i);
  if (m) return `P${m[1]}`;

  const m2 = code.match(/P(\d+)/i);
  return m2 ? `P${m2[1]}` : code;
}

function BarRow({
  label,
  pct,
  note,
}: {
  label: string;
  pct: number;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-48 text-sm">
        <span className="font-medium">{label}</span>
        {note ? <span className="text-gray-500"> {note}</span> : null}
      </div>

      <div className="h-2 flex-1 rounded bg-gray-200">
        <div
          className="h-2 rounded bg-blue-600"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>

      <div className="w-10 text-right text-sm tabular-nums">{pct}%</div>
    </div>
  );
}

type QscAudience = "entrepreneur" | "leader";

export default async function TakerDetail({
  params,
}: {
  params: { slug: string; takerId: string };
}) {
  const { slug, takerId } = params;
  const sb = createClient().schema("portal");

  const { data: org } = await sb
    .from("orgs")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!org) return notFound();

  const { data: taker } = await sb
    .from("test_takers")
    .select(
      "id, org_id, test_id, first_name, last_name, email, phone, created_at, company, role_title, link_token, last_result_url"
    )
    .eq("id", takerId)
    .maybeSingle();

  if (!taker) return notFound();

  let allowed = taker.org_id === org.id;

  if (!allowed) {
    const { data: subs } = await sb
      .from("test_submissions")
      .select("test_id")
      .eq("taker_id", taker.id)
      .order("created_at", { ascending: false })
      .limit(25);

    const testIds = Array.from(
      new Set((subs || []).map((s: any) => s?.test_id).filter(Boolean))
    ) as string[];

    if (testIds.length) {
      const { data: testsForSubs } = await sb
        .from("tests")
        .select("id, org_id")
        .in("id", testIds);

      allowed = (testsForSubs || []).some(
        (testRow: any) => testRow?.org_id === org.id
      );
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
  const totalsRaw = parseTotals(latest?.totals);

  const isVisibility =
    Boolean(totalsRaw?.visibility) ||
    String(totalsRaw?.meta?.engine || "").toLowerCase().includes("visibility");

  const meta: any = (test?.meta as any) ?? {};
  const framework: any = meta?.framework || meta || {};

  const profilesSource: any[] = Array.isArray(framework?.profiles)
    ? framework.profiles
    : Array.isArray(meta?.profiles)
      ? meta.profiles
      : [];

  const profiles: Array<{ name: string; code?: string; frequency?: string }> =
    profilesSource.map((profile: any) => ({
      name: String(profile?.name ?? ""),
      code: profile?.code ?? null,
      frequency: profile?.frequency ?? null,
    }));

  const freqSource: any[] = Array.isArray(framework?.frequencies)
    ? framework.frequencies
    : Array.isArray(meta?.frequencies)
      ? meta.frequencies
      : [];

  const freqLabels: Record<string, string> = freqSource.length
    ? Object.fromEntries(
        freqSource.map((frequency: any) => [
          String(frequency?.code ?? "").toUpperCase(),
          String(frequency?.label ?? ""),
        ])
      )
    : { A: "A", B: "B", C: "C", D: "D" };

  let profileScores: Record<string, number> = {};
  let frequencyScores: Record<string, number> = {};

  if (
    totalsRaw &&
    typeof totalsRaw === "object" &&
    ("frequencies" in totalsRaw || "profiles" in totalsRaw)
  ) {
    const totals: any = totalsRaw;

    if (totals.frequencies && typeof totals.frequencies === "object") {
      frequencyScores = Object.fromEntries(
        Object.entries(totals.frequencies).map(([key, value]) => [
          String(key).toUpperCase(),
          Number(value) || 0,
        ])
      );
    }

    if (totals.profiles && typeof totals.profiles === "object") {
      const rawProfiles = totals.profiles as Record<string, number>;

      const codeToName = new Map<string, string>();

      for (const profile of profiles) {
        if (profile.code) {
          const upperCode = String(profile.code).toUpperCase();

          codeToName.set(upperCode, profile.name);
          codeToName.set(codeToPShort(upperCode), profile.name);
        }
      }

      profileScores = {};

      for (const [rawKey, value] of Object.entries(rawProfiles)) {
        const upperKey = String(rawKey).toUpperCase();
        const short = codeToPShort(upperKey);

        const mappedName =
          codeToName.get(upperKey) ||
          codeToName.get(short.toUpperCase()) ||
          rawKey;

        profileScores[mappedName] = Number(value) || 0;
      }
    }
  } else {
    const keys = Object.keys(totalsRaw || {});

    const isFreqTotals =
      keys.length &&
      keys.every((key) => ["A", "B", "C", "D"].includes(key.toUpperCase()));

    if (isFreqTotals) {
      frequencyScores = Object.fromEntries(
        Object.entries(totalsRaw).map(([key, value]) => [
          key.toUpperCase(),
          Number(value) || 0,
        ])
      );
    } else {
      profileScores = Object.fromEntries(
        Object.entries(totalsRaw).map(([key, value]) => [
          String(key),
          Number(value) || 0,
        ])
      );

      const profileToFrequency = Object.fromEntries(
        profiles.map((profile) => [
          profile.name,
          (profile.frequency || "").toUpperCase(),
        ])
      );

      frequencyScores = Object.entries(profileScores).reduce(
        (acc, [profileName, score]) => {
          const frequency = profileToFrequency[profileName] || "";

          if (!frequency) return acc;

          acc[frequency] = (acc[frequency] || 0) + (Number(score) || 0);

          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  const freqPct = asPercentMap(frequencyScores);
  const profilePct = asPercentMap(profileScores);

  const topProfile = sortDesc(profileScores)[0] as
    | [string, number]
    | undefined;

  const fullName =
    [taker.first_name, taker.last_name].filter(Boolean).join(" ").trim() || "—";

  const sortedProfilePct = sortDesc(profilePct);

  const topThreeProfiles = sortedProfilePct.slice(0, 3).map(([name, pct]) => {
    const profileMeta = profiles.find((profile) => profile.name === name);
    const code = profileMeta?.code || "";

    return { name, pct, code };
  });

  const labels = ["Primary profile", "Secondary", "Tertiary"];
  // Standard-test chart data (mirrors the Frequencies bars + Personality Map
  // radar the respondent's own report renders).
  const freqChart = (["A", "B", "C", "D"] as const).map((code) => ({
    code,
    name:
      (freqSource.find(
        (x: any) => String(x?.code).toUpperCase() === code,
      )?.label as string) ||
      freqLabels[code] ||
      code,
    pct: freqPct[code] ?? 0,
  }));

  const profileRadarLabels = profiles.map((p) => ({
    code: codeToPShort(p.code) || p.name,
    name: p.name,
  }));

  const profileRadarPct: Record<string, number> = Object.fromEntries(
    profiles.map((p) => [codeToPShort(p.code) || p.name, profilePct[p.name] ?? 0]),
  );

  const slugLower = String(test?.slug || "").toLowerCase();
  const testNameLower = String(test?.name || "").toLowerCase();

  const isGed =
    meta?.is_ged === true ||
    String(meta?.assessment_name || "").toLowerCase().trim() ===
      "growth engine diagnostic" ||
    slugLower.includes("growth-engine-diagnostic") ||
    slugLower.startsWith("ged-") ||
    testNameLower.includes("growth engine diagnostic") ||
    testNameLower.startsWith("ged");

  const isQsc =
    !isGed &&
    (test?.slug === "qsc-core" ||
      test?.slug === "qsc-leaders" ||
      (typeof meta?.frameworkType === "string" &&
        meta.frameworkType.toLowerCase() === "qsc"));

  const isInevitableStandard =
    Boolean((totalsRaw as any)?.inevitable_standard?.pillars) ||
    meta?.is_inevitable_standard === true ||
    slugLower === "inevitable-standard" ||
    slugLower.startsWith("inevitable-standard-") ||
    testNameLower.includes("inevitable standard");

  let gedDiagnostics: GedDiagnostics | null = null;
  let gedCompletedAt: string | null = null;

  if (isGed) {
    const { data: gedSubmission, error: gedSubmissionError } = await sb
      .from("test_submissions")
      .select("created_at, totals")
      .eq("taker_id", taker.id)
      .eq("test_id", taker.test_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gedSubmissionError) {
      console.warn(
        "GED submission lookup failed on test-taker profile:",
        gedSubmissionError.message
      );
    }

    const fromSubmission = extractGedDiagnostics(gedSubmission?.totals);
    const fromLatestResult = extractGedDiagnostics(latest?.totals);

    gedDiagnostics = fromSubmission || fromLatestResult || null;

    gedCompletedAt =
      gedSubmission?.created_at || latest?.created_at || null;
  }

  let qscSnapshotUrl: string | null = null;
  let qscExtendedUrl: string | null = null;
  let qscStrategicUrl: string | null = null;

  let qscAudience: QscAudience | null = null;
  // QSC and GED both read from qsc_results (same table/API). Fetch once.
  let qscRow: any = null;

  if ((isQsc || isGed) && taker.link_token) {
    const { data } = await sb
      .from("qsc_results")
      .select(
        "audience, created_at, personality_percentages, mindset_percentages, primary_personality, secondary_personality, primary_mindset, secondary_mindset, combined_profile_code",
      )
      .eq("token", taker.link_token)
      .eq("taker_id", taker.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    qscRow = data;
  }

  if (isQsc && taker.link_token) {
    const aud = (qscRow?.audience as QscAudience | null) ?? null;

    if (aud === "leader" || aud === "entrepreneur") {
      qscAudience = aud;
    } else if (test?.slug === "qsc-leaders") {
      qscAudience = "leader";
    } else {
      qscAudience = "entrepreneur";
    }

    const base = `/qsc/${encodeURIComponent(taker.link_token)}`;
    const query = `?tid=${encodeURIComponent(taker.id)}`;

    qscSnapshotUrl = `${base}${query}`;

    const extendedPath =
      qscAudience === "leader" ? "/extended-leader" : "/extended";

    qscExtendedUrl = `${base}${extendedPath}${query}`;

    const strategicPath =
      qscAudience === "leader" ? "/leader" : "/entrepreneur";

    qscStrategicUrl = `${base}${strategicPath}${query}`;
  }

  let gedExtendedUrl: string | null = null;
  let gedStrategicUrl: string | null = null;

  if (isGed && taker.link_token) {
    const base = `/ged/${encodeURIComponent(taker.link_token)}`;
    const query = `?tid=${encodeURIComponent(taker.id)}`;

    gedExtendedUrl = `${base}/extended${query}`;
    gedStrategicUrl = `${base}/entrepreneur${query}`;
  }

  let reportUrl: string | null = null;

  if (isVisibility && taker.link_token) {
    reportUrl = `/t/${encodeURIComponent(
      taker.link_token
    )}/visibility/report?tid=${encodeURIComponent(taker.id)}&src=portal`;
  } else if (isGed) {
    reportUrl = gedStrategicUrl;
  } else if (isQsc) {
    reportUrl = qscStrategicUrl;
  } else if (taker.link_token) {
    reportUrl = `/t/${encodeURIComponent(
      taker.link_token
    )}/report?tid=${encodeURIComponent(taker.id)}&src=portal`;
  } else if (taker.last_result_url) {
    reportUrl = String(taker.last_result_url);
  }

  const profileExtendedReportUrl =
    isVisibility && latest?.id
      ? `/portal/${encodeURIComponent(
          slug
        )}/database/${encodeURIComponent(
          taker.id
        )}/profile-extended-report`
      : null;

  const fullDiagnosticReportUrl =
    isInevitableStandard && taker.link_token
      ? `/t/${encodeURIComponent(
          taker.link_token,
        )}/full-report?tid=${encodeURIComponent(
          taker.id,
        )}&src=portal`
      : null;

  const insiderInsightsUrl =
    isInevitableStandard && latest?.id
      ? `/portal/insider-insights/${encodeURIComponent(slug)}/${encodeURIComponent(
          taker.id,
        )}`
      : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{fullName}</h1>
          <p className="text-sm text-gray-500">{org.name}</p>
        </div>

        <Link
          href={`/portal/${slug}/database`}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Back to database
        </Link>
      </header>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-medium">Contact</h2>

        <dl className="grid grid-cols-3 gap-2 text-sm">
          <dt className="text-gray-500">First name</dt>
          <dd className="col-span-2">{taker.first_name || "—"}</dd>

          <dt className="text-gray-500">Last name</dt>
          <dd className="col-span-2">{taker.last_name || "—"}</dd>

          <dt className="text-gray-500">Email</dt>
          <dd className="col-span-2">{taker.email || "—"}</dd>

          <dt className="text-gray-500">Phone</dt>
          <dd className="col-span-2">{taker.phone || "—"}</dd>

          <dt className="text-gray-500">Created at</dt>
          <dd className="col-span-2">
            {taker.created_at
              ? new Date(taker.created_at as any).toLocaleString()
              : "—"}
          </dd>

          <dt className="text-gray-500">Company</dt>
          <dd className="col-span-2">{taker.company || "—"}</dd>

          <dt className="text-gray-500">Role title</dt>
          <dd className="col-span-2">{taker.role_title || "—"}</dd>
        </dl>
      </section>

      {isGed && (
        <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div>
            <h2 className="font-medium text-slate-900">
              GED Qualifying Answers
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Internal diagnostic information captured during the Growth Engine
              Diagnostic.
            </p>
          </div>

          {gedCompletedAt && (
            <p className="text-xs text-slate-500">
              GED completed: {new Date(gedCompletedAt).toLocaleString()}
            </p>
          )}

          {gedDiagnostics ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Current business stage
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  {gedDiagnostics.business_stage?.question_text ||
                    "Which best describes your current business?"}
                </p>

                <p className="mt-2 font-medium text-slate-900">
                  {gedAnswerText(gedDiagnostics.business_stage)}
                </p>
              </div>

              <div className="rounded-lg border border-emerald-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Core constraint
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  {gedDiagnostics.core_constraint?.question_text ||
                    "Where is your biggest constraint right now?"}
                </p>

                <p className="mt-2 font-medium text-slate-900">
                  {gedAnswerText(gedDiagnostics.core_constraint)}
                </p>
              </div>

              <div className="rounded-lg border border-emerald-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Scale readiness
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  {gedDiagnostics.scale_readiness?.question_text ||
                    "If you stepped out of the business for 30 days, what would happen?"}
                </p>

                <p className="mt-2 font-medium text-slate-900">
                  {gedAnswerText(gedDiagnostics.scale_readiness)}
                </p>
              </div>

              <div className="rounded-lg border border-emerald-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Strategic self-diagnosis
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  In your own words, what is currently stopping your business
                  from scaling without you?
                </p>

                <p className="mt-2 whitespace-pre-wrap font-medium text-slate-900">
                  {gedDiagnostics.self_diagnosis || "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-emerald-200 bg-white p-4 text-sm text-slate-600">
              No GED qualifying answers were found for this test taker. This
              normally means they completed the assessment before these
              diagnostic answers were added to the GED submission data.
            </div>
          )}
        </section>
      )}

      <section className="space-y-4 rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-medium">Latest Result</h2>

            <dl className="mt-1 grid grid-cols-3 gap-2 text-sm">
              <dt className="text-gray-500">Test</dt>
              <dd className="col-span-2">{test?.name || "—"}</dd>

              <dt className="text-gray-500">Completed</dt>
              <dd className="col-span-2">
                {latest?.created_at
                  ? new Date(latest.created_at as any).toLocaleString()
                  : "—"}
              </dd>

              {!isVisibility && !isQsc && !isGed && (
                <>
                  <dt className="text-gray-500">Top profile</dt>
                  <dd className="col-span-2">
                    {topProfile ? `${topProfile[0]} (${topProfile[1]})` : "—"}
                  </dd>
                </>
              )}
            </dl>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap gap-2">
              {profileExtendedReportUrl ? (
                <Link
                  href={profileExtendedReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-50 hover:bg-slate-800"
                >
                  Generate Profile Extended Report
                </Link>
              ) : null}

              {reportUrl && !isGed && (
                <Link
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-sky-500 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100"
                >
                  {isVisibility
                    ? "Open Visibility Report"
                    : "Open test-taker report in new tab"}
                </Link>
              )}

              {fullDiagnosticReportUrl && (
                <Link
                  href={fullDiagnosticReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-50 hover:bg-slate-800"
                >
                  Open Full Diagnostic Report
                </Link>
              )}

              {insiderInsightsUrl && (
                <Link
                  href={insiderInsightsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-amber-500 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                >
                  Open Insider Insights (adviser-only)
                </Link>
              )}
            </div>
          </div>
        </div>

        {isGed && (gedExtendedUrl || gedStrategicUrl) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {gedStrategicUrl && (
              <Link
                href={gedStrategicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-emerald-600 bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-400"
              >
                Strategic Growth Report
              </Link>
            )}

            {gedExtendedUrl && (
              <Link
                href={gedExtendedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-50 hover:bg-slate-800"
              >
                Predictive Selling Playbook
              </Link>
            )}
          </div>
        )}

        {isQsc && (qscSnapshotUrl || qscExtendedUrl || qscStrategicUrl) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {qscSnapshotUrl && (
              <Link
                href={qscSnapshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-sky-500 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100"
              >
                Buyer Persona Snapshot
              </Link>
            )}

            {qscExtendedUrl && (
              <Link
                href={qscExtendedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-50 hover:bg-slate-800"
              >
                Extended Source Code Snapshot
              </Link>
            )}

            {qscStrategicUrl && (
              <Link
                href={qscStrategicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-amber-600 bg-amber-500 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-400"
              >
                QSC — Strategic Growth Report
              </Link>
            )}
          </div>
        )}

        {!isVisibility && !isGed && (
          <>
            <div className="space-y-2 pt-4">
              <h3 className="font-medium">Frequency mix</h3>

              {["A", "B", "C", "D"].map((frequency) => (
                <BarRow
                  key={frequency}
                  label={
                    (freqSource.find(
                      (item: any) =>
                        String(item?.code).toUpperCase() === frequency
                    )?.label as string) ||
                    freqLabels[frequency] ||
                    frequency
                  }
                  note={`(${frequency})`}
                  pct={freqPct[frequency] ?? 0}
                />
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Profile mix</h3>

              {Object.keys(profilePct).length ? (
                sortDesc(profilePct).map(([name, pct]) => {
                  const profile = profiles.find(
                    (item) => item.name === name
                  );

                  const short = codeToPShort(profile?.code || "");

                  return (
                    <BarRow
                      key={name}
                      label={name}
                      note={short ? `(${short})` : undefined}
                      pct={pct}
                    />
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">
                  Profile-level scores aren’t available for this result (only
                  frequencies were stored).
                </p>
              )}
            </div>

            {topThreeProfiles.length > 0 && (
              <div className="grid gap-4 pt-4 md:grid-cols-3">
                {topThreeProfiles.map((profile, index) => (
                  <div
                    key={profile.name}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {labels[index] || "Profile"}
                    </p>

                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      {profile.name}
                    </h3>

                    {profile.code && (
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        {profile.code}
                      </p>
                    )}

                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {profile.pct}% match
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!isVisibility && !isQsc && !isGed && (
          <StandardResultGraphs
            freq={freqChart}
            profileLabels={profileRadarLabels}
            profilePct={profileRadarPct}
          />
        )}

        {(isQsc || isGed) && qscRow && (
          <QscResultGraphs
            variant={
              isGed
                ? "ged"
                : qscAudience === "leader"
                  ? "qsc-leader"
                  : "qsc-entrepreneur"
            }
            personality={qscRow.personality_percentages ?? {}}
            mindset={qscRow.mindset_percentages ?? {}}
            primaryPersonality={qscRow.primary_personality}
            secondaryPersonality={qscRow.secondary_personality}
            primaryMindset={qscRow.primary_mindset}
            secondaryMindset={qscRow.secondary_mindset}
          />
        )}
      </section>

      {reportUrl && (
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="font-medium">
                {isVisibility
                  ? "Embedded Visibility Report"
                  : "Embedded Report"}
              </h2>

              <p className="text-sm text-gray-500">
                View the test-taker report directly inside this profile
              </p>
            </div>

            <Link
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Open full report
            </Link>
          </div>

          <iframe
            src={reportUrl}
            title="Test-taker report"
            className="min-h-[1400px] w-full bg-white"
          />
        </section>
      )}
    </div>
  );
}