// apps/web/app/portal/[slug]/dashboard/UsageSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type TimeRangeKey =
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "all_time";

const TIME_RANGE_OPTIONS: { value: TimeRangeKey; label: string }[] = [
  { value: "this_week", label: "This week (default)" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
  { value: "all_time", label: "All time" },
];

type PortalTest = {
  id: string;
  name: string;
  slug: string;
  is_default_dashboard?: boolean | null;
};

type Summary = {
  total_submissions: number;
  distinct_tests: number;
  distinct_links: number;
};

type ByTestRow = {
  test_id: string;
  test_name: string;
  test_slug: string | null;
  submissions: number;
};

type ByLinkRow = {
  token: string;
  link_name: string | null;
  contact_owner: string | null;
  submissions: number;
};

type ByDayRow = {
  date: string;
  submissions: number;
};

type UsageResponseOk = {
  ok: true;
  org: string;
  testSlug: string | null;
  range: TimeRangeKey;
  data: {
    summary: Summary;
    byTest: ByTestRow[];
    byLink: ByLinkRow[];
    byDay: ByDayRow[];
  };
};

type UsageResponse = UsageResponseOk | { ok: false; error: string };

type TestsResponseOk = {
  ok: true;
  tests: PortalTest[];
  defaultTestId?: string | null;
};

type TestsResponse = TestsResponseOk | { ok: false; error: string };

function toCSV(rows: Array<Record<string, any>>): string {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
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

export default function UsageSection() {
  const pathname = usePathname();
  const orgSlug = useMemo(() => {
    const segs = (pathname || "").split("/").filter(Boolean);
    const i = segs.indexOf("portal");
    return i >= 0 && segs[i + 1] ? segs[i + 1] : "";
  }, [pathname]);

  const [tests, setTests] = useState<PortalTest[]>([]);
  const [selectedTestSlug, setSelectedTestSlug] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRangeKey>("this_week");

  const [loadingTests, setLoadingTests] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [byTest, setByTest] = useState<ByTestRow[]>([]);
  const [byLink, setByLink] = useState<ByLinkRow[]>([]);
  const [byDay, setByDay] = useState<ByDayRow[]>([]);

  const [quickFilter, setQuickFilter] = useState("");

  // 1) Load tests for this org (re-use /api/portal-tests)
  useEffect(() => {
    if (!orgSlug) return;
    let active = true;

    (async () => {
      try {
        setLoadingTests(true);
        const res = await fetch(`/api/portal-tests?org=${encodeURIComponent(orgSlug)}`);
        const json: TestsResponse = await res.json();
        if (!active) return;
        if (!json.ok) {
          setError(json.error || "Failed to load tests");
          return;
        }

        const testsList = json.tests || [];
        setTests(testsList);

        // pick default test
        let defaultSlug: string | null = null;
        if (json.defaultTestId) {
          const match = testsList.find((t) => t.id === json.defaultTestId);
          if (match) defaultSlug = match.slug;
        }
        if (!defaultSlug && testsList.length) {
          const fromFlag =
            testsList.find((t) => t.is_default_dashboard) || testsList[0];
          defaultSlug = fromFlag.slug;
        }
        setSelectedTestSlug(defaultSlug);
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load tests");
      } finally {
        if (active) setLoadingTests(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [orgSlug]);

  // 2) Load usage for current org + test + range
  useEffect(() => {
    if (!orgSlug) return;
    let active = true;

    (async () => {
      try {
        setLoadingUsage(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("org", orgSlug);
        if (selectedTestSlug) params.set("testSlug", selectedTestSlug);
        params.set("range", range);

        const res = await fetch(`/api/portal-usage?${params.toString()}`);
        const json: UsageResponse = await res.json();
        if (!active) return;

        if (!json.ok) {
          setError(json.error || "Failed to load usage");
          setSummary(null);
          setByTest([]);
          setByLink([]);
          setByDay([]);
          return;
        }

        setSummary(json.data.summary);
        setByTest(json.data.byTest);
        setByLink(json.data.byLink);
        setByDay(json.data.byDay);
      } catch (e: any) {
        if (active) {
          setError(e?.message || "Failed to load usage");
          setSummary(null);
          setByTest([]);
          setByLink([]);
          setByDay([]);
        }
      } finally {
        if (active) setLoadingUsage(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [orgSlug, selectedTestSlug, range]);

  const currentTestLabel = useMemo(() => {
    if (!selectedTestSlug) return "All tests";
    const t = tests.find((x) => x.slug === selectedTestSlug);
    return t ? t.name : selectedTestSlug;
  }, [tests, selectedTestSlug]);

  const filteredByTest = useMemo(() => {
    const q = quickFilter.trim().toLowerCase();
    if (!q) return byTest;
    return byTest.filter((row) => {
      const hay = `${row.test_name} ${row.test_slug ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [byTest, quickFilter]);

  const filteredByLink = useMemo(() => {
    const q = quickFilter.trim().toLowerCase();
    if (!q) return byLink;
    return byLink.filter((row) => {
      const hay = `${row.link_name ?? ""} ${row.token} ${row.contact_owner ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [byLink, quickFilter]);

  const filteredByDay = useMemo(() => byDay, [byDay]); // could also filter by date string if needed

  return (
    <section className="mt-10 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-sky-100">
            Usage &amp; Segmentation
          </h2>
          <p className="text-xs text-slate-400">
            View test completions by test, link and day for the selected time range.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <span className="opacity-70">Test</span>
            <select
              className="min-w-[220px] rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs"
              value={selectedTestSlug ?? ""}
              onChange={(e) =>
                setSelectedTestSlug(e.target.value || null)
              }
              disabled={loadingTests || !tests.length}
            >
              <option value="">All tests</option>
              {tests.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name} — {t.slug}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="opacity-70">Time range</span>
            <select
              className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs"
              value={range}
              onChange={(e) => setRange(e.target.value as TimeRangeKey)}
            >
              {TIME_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="opacity-70">Quick filter (tests &amp; links)</span>
            <input
              className="w-56 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs"
              placeholder="type to filter…"
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          Error: {error}
        </div>
      )}

      {loadingUsage && (
        <div className="text-xs text-slate-400">Loading usage…</div>
      )}

      {summary && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
            <div className="text-xs opacity-70 mb-1">Scope</div>
            <div className="font-semibold text-sky-300">
              {orgSlug} – {currentTestLabel}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
            <div className="text-xs opacity-70 mb-1">Total submissions</div>
            <div className="text-2xl font-semibold text-sky-400">
              {summary.total_submissions}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 flex items-center justify-between">
            <div>
              <div className="text-xs opacity-70">Distinct tests</div>
              <div className="text-lg font-semibold text-sky-300">
                {summary.distinct_tests}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70">Distinct links</div>
              <div className="text-lg font-semibold text-sky-300 text-right">
                {summary.distinct_links}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submissions by test */}
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-sky-100">
              Submissions by test
            </h3>
            <p className="text-[11px] text-slate-400">
              Sorted by number of submissions (high to low).
            </p>
          </div>
          <button
            className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500 hover:text-white transition"
            disabled={!filteredByTest.length}
            onClick={() =>
              downloadCSV(
                `usage_by_test_${orgSlug}.csv`,
                filteredByTest.map((r) => ({
                  test_name: r.test_name,
                  test_slug: r.test_slug ?? "",
                  submissions: r.submissions,
                }))
              )
            }
          >
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="min-w-full border-collapse">
            <thead className="border-b border-slate-700/70 text-slate-300">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Test name</th>
                <th className="px-2 py-2 text-left font-medium">Slug</th>
                <th className="px-2 py-2 text-right font-medium">Submissions</th>
              </tr>
            </thead>
            <tbody>
              {!filteredByTest.length && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-2 py-3 text-center text-slate-500"
                  >
                    No submissions in this range.
                  </td>
                </tr>
              )}
              {filteredByTest.map((row) => (
                <tr key={row.test_id} className="border-t border-slate-800/70">
                  <td className="px-2 py-1.5">{row.test_name}</td>
                  <td className="px-2 py-1.5 text-slate-400">
                    {row.test_slug ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold">
                    {row.submissions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submissions by link */}
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-sky-100">
              Submissions by link
            </h3>
            <p className="text-[11px] text-slate-400">
              Sorted by number of submissions (high to low).
            </p>
          </div>
          <button
            className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500 hover:text-white transition"
            disabled={!filteredByLink.length}
            onClick={() =>
              downloadCSV(
                `usage_by_link_${orgSlug}.csv`,
                filteredByLink.map((r) => ({
                  link_name: r.link_name ?? "",
                  token: r.token,
                  contact_owner: r.contact_owner ?? "",
                  submissions: r.submissions,
                }))
              )
            }
          >
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="min-w-full border-collapse">
            <thead className="border-b border-slate-700/70 text-slate-300">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Link name</th>
                <th className="px-2 py-2 text-left font-medium">Token</th>
                <th className="px-2 py-2 text-left font-medium">
                  Contact owner
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  Submissions
                </th>
              </tr>
            </thead>
            <tbody>
              {!filteredByLink.length && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-2 py-3 text-center text-slate-500"
                  >
                    No submissions in this range.
                  </td>
                </tr>
              )}
              {filteredByLink.map((row) => (
                <tr key={row.token} className="border-t border-slate-800/70">
                  <td className="px-2 py-1.5">{row.link_name ?? "—"}</td>
                  <td className="px-2 py-1.5 text-slate-400">{row.token}</td>
                  <td className="px-2 py-1.5 text-slate-300">
                    {row.contact_owner ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold">
                    {row.submissions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity by day */}
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-sky-100">
              Activity by day
            </h3>
            <p className="text-[11px] text-slate-400">
              Simple time series of submissions per day in the selected range.
            </p>
          </div>
          <button
            className="rounded-md border border-sky-500 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500 hover:text-white transition"
            disabled={!filteredByDay.length}
            onClick={() =>
              downloadCSV(
                `usage_by_day_${orgSlug}.csv`,
                filteredByDay.map((r) => ({
                  date: r.date,
                  submissions: r.submissions,
                }))
              )
            }
          >
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="min-w-full border-collapse">
            <thead className="border-b border-slate-700/70 text-slate-300">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Date</th>
                <th className="px-2 py-2 text-right font-medium">
                  Submissions
                </th>
              </tr>
            </thead>
            <tbody>
              {!filteredByDay.length && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-2 py-3 text-center text-slate-500"
                  >
                    No submissions in this range.
                  </td>
                </tr>
              )}
              {filteredByDay.map((row) => (
                <tr key={row.date} className="border-t border-slate-800/70">
                  <td className="px-2 py-1.5">{row.date}</td>
                  <td className="px-2 py-1.5 text-right font-semibold">
                    {row.submissions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
