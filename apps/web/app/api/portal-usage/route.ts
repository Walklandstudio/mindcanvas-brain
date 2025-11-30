// apps/web/app/api/portal-usage/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  date: string; // YYYY-MM-DD
  submissions: number;
};

type UsagePayload = {
  summary: Summary;
  byTest: ByTestRow[];
  byLink: ByLinkRow[];
  byDay: ByDayRow[];
};

type TimeRangeKey =
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "all_time";

function startOfUTCDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

function addUTCMonths(d: Date, delta: number) {
  const c = new Date(d);
  c.setUTCMonth(c.getUTCMonth() + delta);
  return c;
}

function addUTCYears(d: Date, delta: number) {
  const c = new Date(d);
  c.setUTCFullYear(c.getUTCFullYear() + delta);
  return c;
}

function getRange(rangeKeyRaw: string | null): { key: TimeRangeKey; from: string | null; to: string | null } {
  const key = (rangeKeyRaw || "this_month").toLowerCase() as TimeRangeKey;
  const today = startOfUTCDay(new Date());

  const dayOfWeek = today.getUTCDay(); // 0 = Sun … 6 = Sat
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setUTCDate(today.getUTCDate() - daysSinceMonday);
  const mondayNextWeek = new Date(mondayThisWeek);
  mondayNextWeek.setUTCDate(mondayThisWeek.getUTCDate() + 7);

  const firstOfThisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const firstOfNextMonth = addUTCMonths(firstOfThisMonth, 1);
  const firstOfLastMonth = addUTCMonths(firstOfThisMonth, -1);

  const firstOfThisYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const firstOfNextYear = addUTCYears(firstOfThisYear, 1);
  const firstOfLastYear = addUTCYears(firstOfThisYear, -1);

  switch (key) {
    case "this_week":
      return {
        key: "this_week",
        from: mondayThisWeek.toISOString(),
        to: mondayNextWeek.toISOString(),
      };
    case "last_week":
      return {
        key: "last_week",
        from: new Date(mondayThisWeek.getTime() - 7 * 86400000).toISOString(),
        to: mondayThisWeek.toISOString(),
      };
    case "this_month":
      return {
        key: "this_month",
        from: firstOfThisMonth.toISOString(),
        to: firstOfNextMonth.toISOString(),
      };
    case "last_month":
      return {
        key: "last_month",
        from: firstOfLastMonth.toISOString(),
        to: firstOfThisMonth.toISOString(),
      };
    case "this_year":
      return {
        key: "this_year",
        from: firstOfThisYear.toISOString(),
        to: firstOfNextYear.toISOString(),
      };
    case "last_year":
      return {
        key: "last_year",
        from: firstOfLastYear.toISOString(),
        to: firstOfThisYear.toISOString(),
      };
    case "all_time":
      return { key: "all_time", from: null, to: null };
    default:
      // sensible default
      return {
        key: "this_month",
        from: firstOfThisMonth.toISOString(),
        to: firstOfNextMonth.toISOString(),
      };
  }
}

export async function GET(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Supabase env not configured" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const orgSlug = (url.searchParams.get("org") || "").trim();
    const testSlug = (url.searchParams.get("testSlug") || "").trim() || null;
    const rangeRaw = url.searchParams.get("range");
    const { key: rangeKey, from, to } = getRange(rangeRaw);

    if (!orgSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing ?org=slug" },
        { status: 400 }
      );
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const portal = sb.schema("portal");

    // 1) Resolve org
    const { data: orgRow, error: orgErr } = await portal
      .from("orgs")
      .select("id")
      .eq("slug", orgSlug)
      .maybeSingle();

    if (orgErr || !orgRow) {
      return NextResponse.json(
        { ok: false, error: orgErr?.message || "Org not found" },
        { status: 404 }
      );
    }

    const orgId = orgRow.id as string;

    // 2) Load tests for org
    const { data: tests, error: testsErr } = await portal
      .from("tests")
      .select("id, name, slug, is_default_dashboard, status")
      .eq("org_id", orgId);

    if (testsErr) {
      return NextResponse.json(
        { ok: false, error: testsErr.message },
        { status: 500 }
      );
    }

    const activeTests = (tests || []).filter((t: any) => t.status !== "archived");

    if (!activeTests.length) {
      const empty: UsagePayload = {
        summary: {
          total_submissions: 0,
          distinct_tests: 0,
          distinct_links: 0,
        },
        byTest: [],
        byLink: [],
        byDay: [],
      };
      return NextResponse.json(
        { ok: true, org: orgSlug, testSlug: null, range: rangeKey, data: empty },
        { status: 200 }
      );
    }

    let selectedTest: any | null = null;
    if (testSlug) {
      selectedTest = activeTests.find((t: any) => t.slug === testSlug) || null;
    }
    if (!selectedTest) {
      selectedTest =
        activeTests.find((t: any) => t.is_default_dashboard) || activeTests[0];
    }

    const effectiveTestIds: string[] = selectedTest
      ? [selectedTest.id as string]
      : activeTests.map((t: any) => t.id as string);

    // 3) Load submissions for those tests within the time window
    let subsQuery = portal
      .from("test_submissions")
      .select("id, test_id, link_token, created_at")
      .in("test_id", effectiveTestIds);

    if (from) subsQuery = subsQuery.gte("created_at", from);
    if (to) subsQuery = subsQuery.lt("created_at", to);

    const { data: subs, error: subsErr } = await subsQuery;

    if (subsErr) {
      return NextResponse.json(
        { ok: false, error: subsErr.message },
        { status: 500 }
      );
    }

    const submissions = subs || [];

    const total_submissions = submissions.length;

    const testIdSet = new Set<string>();
    const linkTokenSet = new Set<string>();

    for (const s of submissions as any[]) {
      if (s.test_id) testIdSet.add(String(s.test_id));
      if (s.link_token) linkTokenSet.add(String(s.link_token));
    }

    const distinct_tests = testIdSet.size;

    // 4) Load link metadata for those tokens
    let linksByToken: Record<string, { name: string | null; contact_owner: string | null }> =
      {};

    if (linkTokenSet.size) {
      const { data: linkRows, error: linksErr } = await portal
        .from("test_links")
        .select("token, name, contact_owner")
        .in("token", Array.from(linkTokenSet));

      if (!linksErr && Array.isArray(linkRows)) {
        for (const r of linkRows as any[]) {
          if (!r.token) continue;
          linksByToken[String(r.token)] = {
            name: r.name ?? null,
            contact_owner: r.contact_owner ?? null,
          };
        }
      }
    }

    // 5) Aggregate by test
    const testsById: Record<string, any> = {};
    for (const t of activeTests) {
      testsById[String(t.id)] = t;
    }

    const byTestMap = new Map<string, number>();
    const byLinkMap = new Map<string, number>();
    const byDayMap = new Map<string, number>();

    for (const s of submissions as any[]) {
      const testId = String(s.test_id);
      const token = s.link_token ? String(s.link_token) : null;
      const createdAt: string = s.created_at;

      // per-test
      byTestMap.set(testId, (byTestMap.get(testId) || 0) + 1);

      // per-link
      if (token) {
        byLinkMap.set(token, (byLinkMap.get(token) || 0) + 1);
      }

      // per-day (UTC date)
      if (createdAt) {
        const day = createdAt.slice(0, 10); // YYYY-MM-DD
        byDayMap.set(day, (byDayMap.get(day) || 0) + 1);
      }
    }

    const byTest: ByTestRow[] = Array.from(byTestMap.entries())
      .map(([testId, count]) => {
        const t = testsById[testId];
        return {
          test_id: testId,
          test_name: t?.name ?? "(Unknown test)",
          test_slug: t?.slug ?? null,
          submissions: count,
        };
      })
      .sort((a, b) => b.submissions - a.submissions);

    const byLink: ByLinkRow[] = Array.from(byLinkMap.entries())
      .map(([token, count]) => {
        const meta = linksByToken[token] || { name: null, contact_owner: null };
        return {
          token,
          link_name: meta.name,
          contact_owner: meta.contact_owner,
          submissions: count,
        };
      })
      .sort((a, b) => b.submissions - a.submissions);

    const byDay: ByDayRow[] = Array.from(byDayMap.entries())
      .map(([date, count]) => ({ date, submissions: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const distinct_links = byLink.length;

    const payload: UsagePayload = {
      summary: {
        total_submissions,
        distinct_tests,
        distinct_links,
      },
      byTest,
      byLink,
      byDay,
    };

    return NextResponse.json(
      {
        ok: true,
        org: orgSlug,
        testSlug: selectedTest?.slug ?? null,
        range: rangeKey,
        data: payload,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

