"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type UsageSummary = {
  total_submissions: number;
  by_test: { test_slug: string; test_name: string; count: number }[];
  by_link: {
    link_token: string;
    link_name: string | null;
    contact_owner: string | null;
    count: number;
  }[];
  by_day: { date: string; count: number }[];
};

type UsageDetailsRow = {
  submission_id: string;
  completed_at: string;
  org_slug: string;
  test_slug: string | null;
  test_name: string | null;
  link_name: string | null;
  link_token: string | null;
  taker_email: string | null;
  taker_first_name: string | null;
  taker_last_name: string | null;
  taker_company: string | null;
  taker_role_title: string | null;
};

type UsageResponse = {
  ok: boolean;
  error?: string;
  filters?: {
    org: string;
    test: string | null;
    range: string | null;
    from: string;
    to: string;
  };
  summary?: UsageSummary;
  details?: UsageDetailsRow[];
};

const RANGE_OPTIONS = [
  { value: "this_month", label: "This month (default)" },
  { value: "last_month", label: "Last month" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
];

// ---- CSV helpers ----
function toCSV(rows: Array<Record<string, any>>): string {
  if (!rows || !rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

function downloadCSV(filename: string, rows: Array<Record<string, any>>) {
  if (!rows.length) return;
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UsageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Safely read from possibly-null searchParams
  const initialOrg = searchParams?.get("org") ?? "team-puzzle";
  const initialTest = searchParams?.get("test") ?? "";
  const initialRange = searchParams?.get("range") ?? "this_month";
  const initialDetails = (searchParams?.get("details") ?? "") === "1";

  const [org, setOrg] = useState(initialOrg);
  const [test, setTest] = useState(initialTest);
  const [range, setRange] = useState(initialRange);
  const [includeDetails, setIncludeDetails] = useState(initialDetails);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<UsageResponse | null>(null);

  // 🔍 NEW: quick text filter for summary tables
  const [filterText, setFilterText] = useState("");

  // keep URL in sync
  function syncUrl(nextOrg: string, nextTest: string, nextRange: string, nextDetails: boolean) {
    const params = new URLSearchParams();
    if (nextOrg.trim()) params.set("org", nextOrg.trim());
    if (nextTest.trim()) params.set("test", nextTest.trim());
    if (nextRange) params.set("range", nextRange);
    if (nextDetails) params.set("details", "1");
    const qs = params.toString();
    router.replace(qs ? `/admin/usage?${qs}` : `/admin/usage`);
  }

  async function loadUsage() {
    try {
      setLoading(true);
      setErr(null);

      const params = new URLSearchParams();
      if (org.trim()) params.set("org", org.trim());
      if (test.trim()) params.set("test", test.trim());
      if (range) params.set("range", range);
      if (includeDetails) params.set("details", "1");

      const res = await fetch(`/api/usage?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as UsageResponse;
      if (!json.ok) {
        throw new Error(json.error || "Unknown usage error");
      }
      setData(json);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // initial load
  useEffect(() => {
    loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = data?.summary;
  const details = data?.details ?? [];

  const normalizedFilter = filterText.trim().toLowerCase();

  // filtered summary datasets
  const filteredTests = useMemo(
    () =>
      (summary?.by_test ?? []).filter((row) => {
        if (!normalizedFilter) return true;
        const haystack = `${row.test_name} ${row.test_slug}`.toLowerCase();
        return haystack.includes(normalizedFilter);
      }),
    [summary, normalizedFilter]
  );

  const filteredLinks = useMemo(
    () =>
      (summary?.by_link ?? []).filter((row) => {
        if (!normalizedFilter) return true;
        const haystack = `${row.link_name ?? ""} ${row.link_token} ${
          row.contact_owner ?? ""
        }`.toLowerCase();
        return haystack.includes(normalizedFilter);
      }),
    [summary, normalizedFilter]
  );

  // CSV datasets (use filtered sets so exports respect quick filter)
  const testsCsvRows = useMemo(
    () =>
      filteredTests.map((row) => ({
        test_slug: row.test_slug,
        test_name: row.test_name,
        submissions: row.count,
      })),
    [filteredTests]
  );

  const linksCsvRows = useMemo(
    () =>
      filteredLinks.map((row) => ({
        link_token: row.link_token,
        link_name: row.link_name,
        contact_owner: row.contact_owner,
        submissions: row.count,
      })),
    [filteredLinks]
  );

  const daysCsvRows = useMemo(
    () =>
      summary?.by_day.map((row) => ({
        date: row.date,
        submissions: row.count,
      })) ?? [],
    [summary]
  );

  const detailsCsvRows = useMemo(
    () =>
      details.map((r) => ({
        submission_id: r.submission_id,
        completed_at: r.completed_at,
        org_slug: r.org_slug,
        test_slug: r.test_slug,
        test_name: r.test_name,
        link_name: r.link_name,
        link_token: r.link_token,
        taker_email: r.taker_email,
        taker_first_name: r.taker_first_name,
        taker_last_name: r.taker_last_name,
        taker_company: r.taker_company,
        taker_role_title: r.taker_role_title,
      })),
    [details]
  );

  const filePrefix = org ? org.replace(/[^a-zA-Z0-9_-]/g, "_") : "usage";

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Usage & Segmentation</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            View how many tests were completed per organisation, test and link over a selected time range.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            syncUrl(org, test, range, includeDetails);
            loadUsage();
          }}
          disabled={loading}
          className="rounded-xl bg-sky-600/90 px-4 py-2 text-sm font-medium text-white shadow hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      {/* Filters */}
      <section className="rounded-2xl border border-white/10 bg-[#020617]/80 p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Organisation slug
            </label>
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              placeholder="team-puzzle"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Test slug (optional)
            </label>
            <input
              type="text"
              value={test}
              onChange={(e) => setTest(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              placeholder="qsc-core"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Time range
            </label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={includeDetails}
              onChange={(e) => setIncludeDetails(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900"
            />
            Include detailed submission list (up to 1000 rows)
          </label>

          {/* 🔍 Quick filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">Quick filter (tests & links):</span>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              placeholder="type to filter…"
            />
          </div>
        </div>
      </section>

      {err && (
        <div className="rounded-md border border-red-500/50 bg-red-950/40 p-3 text-sm text-red-200">
          Error loading usage: {err}
        </div>
      )}

      {summary && (
        <>
          {/* Summary cards */}
          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="text-xs text-slate-400 mb-1">Total submissions</div>
              <div className="text-2xl font-semibold text-sky-400">
                {summary.total_submissions}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="text-xs text-slate-400 mb-1">Distinct tests</div>
              <div className="text-2xl font-semibold text-sky-400">
                {summary.by_test.length}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="text-xs text-slate-400 mb-1">Distinct links</div>
              <div className="text-2xl font-semibold text-sky-400">
                {summary.by_link.length}
              </div>
            </div>
          </section>

          {/* By test */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Submissions by test
                </h2>
                <p className="text-xs text-slate-400">
                  Sorted by number of submissions (high to low). Use the quick filter above to search by name or slug.
                </p>
              </div>
              <button
                type="button"
                disabled={!testsCsvRows.length}
                onClick={() =>
                  downloadCSV(`${filePrefix}_usage_by_test.csv`, testsCsvRows)
                }
                className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500 hover:text-white disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>

            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-xs text-left text-slate-200">
                <thead className="border-b border-slate-700 text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Test name</th>
                    <th className="py-2 pr-4">Slug</th>
                    <th className="py-2 pr-4 text-right">Submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map((row) => (
                    <tr key={row.test_slug} className="border-b border-slate-800/60">
                      <td className="py-1 pr-4">{row.test_name}</td>
                      <td className="py-1 pr-4 text-slate-400">
                        {row.test_slug}
                      </td>
                      <td className="py-1 pr-4 text-right font-semibold">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                  {!filteredTests.length && (
                    <tr>
                      <td className="py-2 text-slate-400" colSpan={3}>
                        No tests match this filter in the selected range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* By link */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Submissions by link
                </h2>
                <p className="text-xs text-slate-400">
                  Sorted by number of submissions (high to low). Use the quick filter above to search by link name, token or contact owner.
                </p>
              </div>
              <button
                type="button"
                disabled={!linksCsvRows.length}
                onClick={() =>
                  downloadCSV(`${filePrefix}_usage_by_link.csv`, linksCsvRows)
                }
                className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500 hover:text-white disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>

            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-xs text-left text-slate-200">
                <thead className="border-b border-slate-700 text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Link name</th>
                    <th className="py-2 pr-4">Token</th>
                    <th className="py-2 pr-4">Contact owner</th>
                    <th className="py-2 pr-4 text-right">Submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((row) => (
                    <tr key={row.link_token} className="border-b border-slate-800/60">
                      <td className="py-1 pr-4">{row.link_name || "—"}</td>
                      <td className="py-1 pr-4 text-slate-400">
                        <code className="text-[10px]">{row.link_token}</code>
                      </td>
                      <td className="py-1 pr-4 text-slate-300">
                        {row.contact_owner || "—"}
                      </td>
                      <td className="py-1 pr-4 text-right font-semibold">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                  {!filteredLinks.length && (
                    <tr>
                      <td className="py-2 text-slate-400" colSpan={4}>
                        No links match this filter in the selected range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* By day */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Activity by day
                </h2>
                <p className="text-xs text-slate-400">
                  Simple time series of submissions per day in the selected range.
                </p>
              </div>
              <button
                type="button"
                disabled={!daysCsvRows.length}
                onClick={() =>
                  downloadCSV(`${filePrefix}_usage_by_day.csv`, daysCsvRows)
                }
                className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500 hover:text-white disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>

            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-xs text-left text-slate-200">
                <thead className="border-b border-slate-700 text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4 text-right">Submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_day.map((row) => (
                    <tr key={row.date} className="border-b border-slate-800/60">
                      <td className="py-1 pr-4">{row.date}</td>
                      <td className="py-1 pr-4 text-right font-semibold">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                  {!summary.by_day.length && (
                    <tr>
                      <td className="py-2 text-slate-400" colSpan={2}>
                        No submissions in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Details table */}
      {includeDetails && details.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Detailed submissions (most recent first)
              </h2>
              <p className="text-xs text-slate-400">
                Up to 1000 rows, sorted by completion time.
              </p>
            </div>
            <button
              type="button"
              disabled={!detailsCsvRows.length}
              onClick={() =>
                downloadCSV(`${filePrefix}_usage_details.csv`, detailsCsvRows)
              }
              className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500 hover:text-white disabled:opacity-40"
            >
              Export CSV
            </button>
          </div>

          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-xs text-left text-slate-200">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Completed at</th>
                  <th className="py-2 pr-4">Test</th>
                  <th className="py-2 pr-4">Link</th>
                  <th className="py-2 pr-4">Taker</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Company / Role</th>
                </tr>
              </thead>
              <tbody>
                {details.map((r) => (
                  <tr key={r.submission_id} className="border-b border-slate-800/60">
                    <td className="py-1 pr-4 text-slate-300">
                      {new Date(r.completed_at).toLocaleString()}
                    </td>
                    <td className="py-1 pr-4">
                      <div className="font-medium">{r.test_name}</div>
                      <div className="text-[10px] text-slate-400">{r.test_slug}</div>
                    </td>
                    <td className="py-1 pr-4">
                      <div>{r.link_name || "—"}</div>
                      {r.link_token && (
                        <div className="text-[10px] text-slate-400">
                          <code>{r.link_token}</code>
                        </div>
                      )}
                    </td>
                    <td className="py-1 pr-4">
                      {r.taker_first_name || r.taker_last_name
                        ? `${r.taker_first_name ?? ""} ${r.taker_last_name ?? ""}`
                        : "—"}
                    </td>
                    <td className="py-1 pr-4 text-slate-300">
                      {r.taker_email || "—"}
                    </td>
                    <td className="py-1 pr-4 text-slate-300">
                      {r.taker_company || r.taker_role_title
                        ? `${r.taker_company ?? ""} ${r.taker_role_title ?? ""}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

