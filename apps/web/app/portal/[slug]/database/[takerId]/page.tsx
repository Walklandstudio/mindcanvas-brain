// apps/web/app/portal/[slug]/database/[takerId]/page.tsx
// Server component — /portal/[slug]/database/[takerId]
// Contact info + latest results with Frequency/Profile mixes (no fragile views)

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";
import { buildCoachSummary } from "@/lib/report/buildCoachSummary";

export const dynamic = "force-dynamic";

type Totals = Record<string, any> | string | null | undefined;

function parseTotals(totals: Totals): any {
  if (!totals) return {};
  try {
    if (typeof totals === "string") {
      const once = JSON.parse(totals);
      if (typeof once === "string") return JSON.parse(once);
      return once;
    }
    return totals || {};
  } catch {
    return {};
  }
}

function asPercentMap(values: Record<string, number>): Record<string, number> {
  const sum = Object.values(values).reduce(
    (a, b) => a + (Number(b) || 0),
    0
  );
  if (!sum)
    return Object.fromEntries(
      Object.keys(values).map((k) => [k, 0])
    );
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [
      k,
      Math.round(((Number(v) || 0) / sum) * 100),
    ])
  );
}

function asDecimalMap(values: Record<string, number>): Record<string, number> {
  const sum = Object.values(values).reduce(
    (a, b) => a + (Number(b) || 0),
    0
  );
  if (!sum)
    return Object.fromEntries(
      Object.keys(values).map((k) => [k, 0])
    );
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [
      k,
      (Number(v) || 0) / sum,
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
      <div className="flex-1 h-2 rounded bg-gray-200">
        <div
          className="h-2 rounded bg-blue-600"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <div className="w-10 text-right text-sm tabular-nums">
        {pct}%
      </div>
    </div>
  );
}

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
  if (!taker || taker.org_id !== org.id) return notFound();

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

  const meta: any = (test?.meta as any) ?? {};
  const profiles: Array<{ name: string; code?: string; frequency?: string }> =
    Array.isArray(meta?.profiles)
      ? meta.profiles.map((p: any) => ({
          name: String(p?.name ?? ""),
          code: p?.code ?? null,
          frequency: p?.frequency ?? null,
        }))
      : [];
  const freqLabels: Record<string, string> = Array.isArray(meta?.frequencies)
    ? Object.fromEntries(
        meta.frequencies.map((f: any) => [
          String(f?.code ?? "").toUpperCase(),
          String(f?.label ?? ""),
        ])
      )
    : { A: "A", B: "B", C: "C", D: "D" };

  // --- Build frequency and profile score maps (raw points) ----------------
  let profileScores: Record<string, number> = {};
  let frequencyScores: Record<string, number> = {};

  if (
    totalsRaw &&
    typeof totalsRaw === "object" &&
    ("frequencies" in totalsRaw || "profiles" in totalsRaw)
  ) {
    // New structured shape: { frequencies: {...}, profiles: {...} }
    const tr: any = totalsRaw;

    if (tr.frequencies && typeof tr.frequencies === "object") {
      frequencyScores = Object.fromEntries(
        Object.entries(tr.frequencies).map(([k, v]) => [
          String(k).toUpperCase(),
          Number(v) || 0,
        ])
      );
    }

    if (tr.profiles && typeof tr.profiles === "object") {
      const rawProfiles = tr.profiles as Record<string, number>;

      const codeToName = new Map<string, string>();
      for (const p of profiles) {
        if (p.code) {
          const upperCode = String(p.code).toUpperCase();
          codeToName.set(upperCode, p.name);
          codeToName.set(codeToPShort(upperCode), p.name);
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
    // Legacy flat totals
    const keys = Object.keys(totalsRaw || {});
    const isFreqTotals =
      keys.length &&
      keys.every((k) => ["A", "B", "C", "D"].includes(k.toUpperCase()));

    if (isFreqTotals) {
      frequencyScores = Object.fromEntries(
        Object.entries(totalsRaw).map(([k, v]) => [
          k.toUpperCase(),
          Number(v) || 0,
        ])
      );
    } else {
      // Assume these are profile scores keyed by profile name
      profileScores = Object.fromEntries(
        Object.entries(totalsRaw).map(([k, v]) => [
          String(k),
          Number(v) || 0,
        ])
      );

      const p2f = Object.fromEntries(
        profiles.map((p) => [p.name, (p.frequency || "").toUpperCase()])
      );
      frequencyScores = Object.entries(profileScores).reduce(
        (acc, [pName, score]) => {
          const f = p2f[pName] || "";
          if (!f) return acc;
          acc[f] = (acc[f] || 0) + (Number(score) || 0);
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  // --- Percentages for display (0–100) ------------------------------------
  const freqPct = asPercentMap(frequencyScores);
  const profilePct = asPercentMap(profileScores);
  const topProfile = sortDesc(profileScores)[0] as
    | [string, number]
    | undefined;

  // --- Decimals for coach summary (0–1) -----------------------------------
  const freqDec = asDecimalMap(frequencyScores);
  const profileDec = asDecimalMap(profileScores);

  const freqLabelArray = (
    ["A", "B", "C", "D"] as const
  ).map((code) => ({
    code,
    name: freqLabels[code] || code,
  }));

  const topFreqEntry = sortDesc(freqDec)[0];
  const topFreqCode = (topFreqEntry
    ? topFreqEntry[0].toUpperCase()
    : "A") as "A" | "B" | "C" | "D";

  const sortedProfileDec = sortDesc(profileDec);
  const primaryDec = sortedProfileDec[0]
    ? {
        code: "",
        name: sortedProfileDec[0][0],
        pct: sortedProfileDec[0][1],
      }
    : undefined;
  const secondaryDec = sortedProfileDec[1]
    ? {
        code: "",
        name: sortedProfileDec[1][0],
        pct: sortedProfileDec[1][1],
      }
    : undefined;
  const tertiaryDec = sortedProfileDec[2]
    ? {
        code: "",
        name: sortedProfileDec[2][0],
        pct: sortedProfileDec[2][1],
      }
    : undefined;

  const hasScores =
    Object.values(frequencyScores).some((v) => v > 0) ||
    Object.values(profileScores).some((v) => v > 0);

  const coachSummary = hasScores
    ? buildCoachSummary({
        participant: {
          firstName: taker.first_name || undefined,
          role: taker.role_title || undefined,
          company: taker.company || undefined,
        },
        organisation: {
          name: org.name,
        },
        frequencies: {
          labels: freqLabelArray,
          percentages: freqDec as Record<"A" | "B" | "C" | "D", number>,
          topCode: topFreqCode,
        },
        profiles: {
          labels: profiles.map((p) => ({
            code: p.code || "",
            name: p.name,
          })),
          percentages: profileDec,
          primary: primaryDec,
          secondary: secondaryDec,
          tertiary: tertiaryDec,
        },
      })
    : "";

  const fullName =
    [taker.first_name, taker.last_name].filter(Boolean).join(" ").trim() ||
    "—";

  // Build top 3 profiles for cards (using percentage profile mix)
  const sortedProfilePct = sortDesc(profilePct);
  const topThreeProfiles = sortedProfilePct.slice(0, 3).map(([name, pct]) => {
    const pMeta = profiles.find((p) => p.name === name);
    const code = pMeta?.code || "";
    return { name, pct, code };
  });

  const labels = ["Primary profile", "Secondary", "Tertiary"];

  // --- QSC URLs (Snapshot + Extended + Strategic Growth Report) -----------
  const isQsc =
    test?.slug === "qsc-core" ||
    (typeof meta?.frameworkType === "string" &&
      meta.frameworkType.toLowerCase() === "qsc");

  let qscSnapshotUrl: string | null = null;
  let qscExtendedUrl: string | null = null;
  let qscEntrepreneurUrl: string | null = null;

  if (isQsc && taker.link_token) {
    const base = `/qsc/${encodeURIComponent(taker.link_token)}`;
    const query = `?tid=${encodeURIComponent(taker.id)}`;

    // 1) Buyer Persona Snapshot
    qscSnapshotUrl = `${base}${query}`;

    // 2) Extended Source Code Snapshot (existing Extended Source Code page)
    qscExtendedUrl = `${base}/report${query}`;

    // 3) QSC Entrepreneur — Strategic Growth Report (to be implemented)
    qscEntrepreneurUrl = `${base}/entrepreneur${query}`;
  }

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

      {/* Contact (editable) */}
      <section className="rounded-xl border p-4 bg-white space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">Contact</h2>
          <p className="text-xs text-gray-500">
            Updating these fields won&apos;t change scores or reports, only how this
            person appears in the database and exports.
          </p>
        </div>

        <form
          method="POST"
          action="/api/portal/takers/update"
          className="space-y-4"
        >
          <input type="hidden" name="org" value={slug} />
          <input type="hidden" name="id" value={taker.id} />
          <input
            type="hidden"
            name="redirect"
            value={`/portal/${slug}/database/${taker.id}`}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-medium">
                First name
              </label>
              <input
                name="first_name"
                defaultValue={taker.first_name ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-medium">
                Last name
              </label>
              <input
                name="last_name"
                defaultValue={taker.last_name ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-medium">
                Email
              </label>
              <input
                name="email"
                type="email"
                defaultValue={taker.email ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-medium">
                Phone
              </label>
              <input
                name="phone"
                defaultValue={taker.phone ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-medium">
                Company
              </label>
              <input
                name="company"
                defaultValue={taker.company ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-gray-500 text-xs font-medium">
                Role title
              </label>
              <input
                name="role_title"
                defaultValue={taker.role_title ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="rounded-md border border-sky-500 bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Save changes
            </button>
          </div>
        </form>
      </section>

      {/* Latest Result */}
      <section className="rounded-xl border p-4 bg-white space-y-4">
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
              <dt className="text-gray-500">Top profile</dt>
              <dd className="col-span-2">
                {topProfile ? `${topProfile[0]} (${topProfile[1]})` : "—"}
              </dd>
            </dl>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
              disabled
            >
              Generate PDF (coming soon)
            </button>
          </div>
        </div>

        {isQsc &&
          (qscSnapshotUrl || qscExtendedUrl || qscEntrepreneurUrl) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {qscSnapshotUrl && (
                <Link
                  href={qscSnapshotUrl}
                  className="rounded-md border border-sky-500 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100"
                >
                  Buyer Persona Snapshot
                </Link>
              )}

              {qscExtendedUrl && (
                <Link
                  href={qscExtendedUrl}
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-50 hover:bg-slate-800"
                >
                  Extended Source Code Snapshot
                </Link>
              )}

              {qscEntrepreneurUrl && (
                <Link
                  href={qscEntrepreneurUrl}
                  className="rounded-md border border-amber-600 bg-amber-500 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-400"
                >
                  QSC Entrepreneur — Strategic Growth Report
                </Link>
              )}
            </div>
          )}

        <div className="space-y-2 pt-4">
          <h3 className="font-medium">Frequency mix</h3>
          {["A", "B", "C", "D"].map((f) => (
            <BarRow
              key={f}
              label={
                (meta?.frequencies?.find?.(
                  (x: any) => String(x?.code).toUpperCase() === f
                )?.label as string) ?? freqLabels[f] ?? f
              }
              note={`(${f})`}
              pct={freqPct[f] ?? 0}
            />
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Profile mix</h3>
          {Object.keys(profilePct).length ? (
            sortDesc(profilePct).map(([name, pct]) => {
              const p = profiles.find((x) => x.name === name);
              const short = codeToPShort(p?.code || "");
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

        {/* Primary / Secondary / Tertiary cards for coaches */}
        {topThreeProfiles.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3 pt-4">
            {topThreeProfiles.map((p, idx) => (
              <div
                key={p.name}
                className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {labels[idx] || "Profile"}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">
                  {p.name}
                </h3>
                {p.code && (
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    {p.code}
                  </p>
                )}
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {p.pct}% match
                </p>
              </div>
            ))}
          </div>
        )}

        {coachSummary && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="font-medium mb-2">Coach summary</h3>
            <div className="space-y-2 text-sm leading-relaxed text-gray-700">
              {coachSummary
                .split(/\n{2,}/)
                .map((p, idx) => p.trim())
                .filter(Boolean)
                .map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
