"use client";

import { useEffect, useMemo, useState } from "react";

type Summary = {
  total_submissions: number;
  distinct_tests: number;
  distinct_links: number;
};

type TestRow = {
  test_id: string;
  test_name: string;
  test_slug: string | null;
  submissions: number;
};

type LinkRow = {
  link_id: string;
  link_name: string | null;
  token: string;
  contact_owner: string | null;
  submissions: number;
};

type DayRow = {
  date: string;
  submissions: number;
};

type UsageResponse = {
  ok: boolean;
  data?: {
    summary: Summary;
    byTest: TestRow[];
    byLink: LinkRow[];
    byDay: DayRow[];
  };
  error?: string;
};

type Props = {
  orgSlug: string;
  /** Optional default test slug to pre-select (e.g. team-puzzle-profile) */
  defaultTestSlug?: string | null;
};

const RANGE_OPTIONS = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-week", label: "This week" },
  { value: "last-week", label: "Last week" },
  { value: "this-year", label: "This year" },
  { value: "last-year", label: "Last year" },
];

type SortDir = "asc" | "desc";
type TableKey = "tests" | "links";

export default function OrgUsagePanel({ orgSlug, defaultTestSlug }: Props) {
  const [range, setRange] = useState<string>("this-month");
  const [testSlug, setTestSlug] = useState<string>(defaultTestSlug || "");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byTest, setByTest] = useState<TestRow[]>([]);
  const [byLink, setByLink] = useState<LinkRow[]>([]);
  const [byDay, setByDay] = useState<DayRow[]>([]);
  const [testOptions, setTestOptions] = useState<{ slug: string; name: string }[]>([]);

  const [sortKey, setSortKey] = useState<TableKey>("tests");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Load available tests for dropdown
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const q = new URLSearchParams();
        q.set("org", orgSlug);

        const res = await fetch(`/api/portal-tests?${q.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!active) return;
        const rows =
          (json?.tests as { slug: string; name: string }[] | undefined) ?? [];
        setTestOptions(rows);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      active = false;
    };
  }, [orgSlug]);

  // Load usage data whenever filters change
  async function fetchUsage() {
    if (!orgSlug) return;
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      q.set("org", orgSlug);
      if (testSlug) q.set("test", testSlug);
      q.set("range", range);

      const res = await fetch(`/api/org-usage?${q.toString()}`, {
        cache: "no-store",
      });
      const json: UsageResponse = await res.json();
      if (!json.ok || !json.data) {
        throw new Error(json.error || "Failed to load usage");
      }
      setSummary(json.data.summary);
      setByTest(json.data.byTest || []);
      setByLink(json.data.byLink || []);
      setByDay(json.data.byDay || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug, range, testSlug]);

  // Quick text filter (tests & links)
  const q = filter.toLowerCase().trim();

  const filteredTests = useMemo(() => {
    if (!q) return byTest;
    return byTest.filter(
      (t) =>
        t.test_name.toLowerCase().includes(q) ||
        (t.test_slug || "").toLowerCase().includes(q)
    );
  }, [byTest, q]);

  const filteredLinks = useMemo(() => {
    if (!q) return byLink;
    return byLink.filter(
      (l) =>
        (l.link_name || "").toLowerCase().includes(q) ||
        l.token.toLowerCase().includes(q) ||
        (l.contact_owner || "").toLowerCase().includes(q)
    );
  }, [byLink, q]);

  const sortedTests = useMemo(() => {
    const copy = [...filteredTests];
    copy.sort((a, b) => {
      const diff = (a.submissions ?? 0) - (b.submissions ?? 0);
      return sortDir === "asc" ? diff : -diff;
    });
    return copy;
  }, [filteredTests, sortDir]);

  const sortedLinks = useMemo(() => {
    const copy = [...filteredLinks];
    copy.sort((a, b) => {
      const diff = (a.submissions ?? 0) - (b.submissions ?? 0);
      return sortDir === "asc" ? diff : -diff;
    });
    return copy;
  }, [filteredLinks, sortDir]);

  function toggleSort(table: TableKey) {
    if (sortKey !== table) {
      setSortKey(table);
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    }
  }

  return (
    <section className="mt-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">
          Usage &amp; Segmentation
        </h2>
        <button
          type="button"
          onClick={fetchUsage}
          disabled={loading}
          className="rounded-md border border-sky-500/70 bg-sky-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 transition disabled:opacity-60"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Test
          </label>
          <select
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            value={testSlug}
            onChange={(e) => setTestSlug(e.target.value)}
          >
            <option value="">All tests</option>
            {testOptions.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Time range
          </label>
          <select
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            {RANGE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs uppercase tracking-wide text-slate-400">
            Quick filter (tests &amp; links)
          </label>
          <input
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Type to filter by test, link name, token, or contact owner…"
          />
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-red-500/40 bg-red-950/60 px-4 py-2 text-sm text-red-200">
          Error: {err}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Total submissions</div>
          <div className="mt-2 text-2xl font-semibold text-sky-400">
            {summary?.total_submissions ?? "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Distinct tests</div>
          <div className="mt-2 text-2xl font-semibold text-sky-400">
            {summary?.distinct_tests ?? "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Distinct links</div>
          <div className="mt-2 text-2xl font-semibold text-sky-400">
            {summary?.distinct_links ?? "—"}
          </div>
        </div>
      </div>

      {/* Submissions by test */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Submissions by test
            </h3>
            <p className="text-xs text-slate-400">
              Sorted by number of submissions. Use the quick filter above to
              search by test name or slug.
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleSort("tests")}
            className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
          >
            Sort: {sortKey === "tests" ? sortDir : "desc"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-100">
            <thead className="border-b border-slate-700/80 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Test name</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2 text-right">Submissions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTests.map((t) => (
                <tr key={t.test_id} className="border-b border-slate-800/80">
                  <td className="px-3 py-2">{t.test_name}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {t.test_slug ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {t.submissions}
                  </td>
                </tr>
              ))}
              {!sortedTests.length && (
                <tr>
                  <td className="px-3 py-3 text-sm text-slate-400" colSpan={3}>
                    No submissions in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submissions by link */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Submissions by link
            </h3>
            <p className="text-xs text-slate-400">
              Sorted by number of submissions. Use the quick filter above to
              search by link name, token, or contact owner.
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleSort("links")}
            className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
          >
            Sort: {sortKey === "links" ? sortDir : "desc"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-100">
            <thead className="border-b border-slate-700/80 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Link name</th>
                <th className="px-3 py-2">Token</th>
                <th className="px-3 py-2">Contact owner</th>
                <th className="px-3 py-2 text-right">Submissions</th>
              </tr>
            </thead>
            <tbody>
              {sortedLinks.map((l) => (
                <tr key={l.link_id || l.token} className="border-b border-slate-800/80">
                  <td className="px-3 py-2">{l.link_name || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {l.token}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-300">
                    {l.contact_owner || "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {l.submissions}
                  </td>
                </tr>
              ))}
              {!sortedLinks.length && (
                <tr>
                  <td className="px-3 py-3 text-sm text-slate-400" colSpan={4}>
                    No submissions in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity by day */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Activity by day
            </h3>
            <p className="text-xs text-slate-400">
              Simple time series of submissions per day in the selected range.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-100">
            <thead className="border-b border-slate-700/80 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Submissions</th>
              </tr>
            </thead>
            <tbody>
              {byDay.map((d) => (
                <tr key={d.date} className="border-b border-slate-800/80">
                  <td className="px-3 py-2">{d.date}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {d.submissions}
                  </td>
                </tr>
              ))}
              {!byDay.length && (
                <tr>
                  <td className="px-3 py-3 text-sm text-slate-400" colSpan={2}>
                    No submissions in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
