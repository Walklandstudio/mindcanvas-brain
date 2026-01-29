import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---- types used in response ----
type UsageRow = {
  submission_id: string;
  completed_at: string;
  org_id: string;
  org_slug: string;
  org_name: string;
  test_id: string;
  test_slug: string | null;
  test_name: string | null;
  link_id: string | null;
  link_token: string | null;
  link_name: string | null;
  link_contact_owner: string | null;
  taker_id: string;
  taker_email: string | null;
  taker_first_name: string | null;
  taker_last_name: string | null;
  taker_status: string | null;
  taker_company: string | null;
  taker_role_title: string | null;
};

// ---- helper: compute date range from query ----
function computeRange(
  range: string | null,
  fromParam: string | null,
  toParam: string | null
) {
  // If explicit from/to are provided, trust them
  if (fromParam && toParam) {
    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (isNaN(+from) || isNaN(+to)) {
      throw new Error("Invalid from/to date");
    }
    return { from, to, label: "custom" as const };
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-11
  const day = now.getUTCDate();

  const startOfDay = new Date(Date.UTC(year, month, day));
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setUTCDate(startOfDay.getUTCDate() - startOfDay.getUTCDay()); // Sunday as start
  const startOfMonth = new Date(Date.UTC(year, month, 1));
  const startOfYear = new Date(Date.UTC(year, 0, 1));

  let from: Date;
  let to: Date;
  let label: string;

  switch (range) {
    case "this_week":
      from = startOfWeek;
      to = new Date(startOfWeek);
      to.setUTCDate(to.getUTCDate() + 7);
      label = "this_week";
      break;
    case "last_week": {
      const endOfLastWeek = startOfWeek;
      const startOfLastWeek = new Date(endOfLastWeek);
      startOfLastWeek.setUTCDate(endOfLastWeek.getUTCDate() - 7);
      from = startOfLastWeek;
      to = endOfLastWeek;
      label = "last_week";
      break;
    }
    case "last_month": {
      const startOfThisMonth = startOfMonth;
      const startOfLastMonth = new Date(
        Date.UTC(
          startOfThisMonth.getUTCFullYear(),
          startOfThisMonth.getUTCMonth() - 1,
          1
        )
      );
      const startOfThisMonthCopy = new Date(startOfThisMonth);
      from = startOfLastMonth;
      to = startOfThisMonthCopy;
      label = "last_month";
      break;
    }
    case "this_year":
      from = startOfYear;
      to = new Date(Date.UTC(year + 1, 0, 1));
      label = "this_year";
      break;
    case "last_year":
      from = new Date(Date.UTC(year - 1, 0, 1));
      to = new Date(Date.UTC(year, 0, 1));
      label = "last_year";
      break;
    case "this_month":
    default: {
      // default = this_month
      const startOfThisMonth = startOfMonth;
      const startOfNextMonth = new Date(
        Date.UTC(year, month + 1, 1)
      );
      from = startOfThisMonth;
      to = startOfNextMonth;
      label = "this_month";
      break;
    }
  }

  return { from, to, label };
}

// ---- helper: group rows in memory ----
function groupBy<T, K extends string>(
  rows: T[],
  keyFn: (row: T) => K | null | undefined
) {
  const map = new Map<K, { key: K; count: number; sample?: T }>();
  for (const r of rows) {
    const key = keyFn(r);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { key, count: 1, sample: r });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
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
    const testSlug = (url.searchParams.get("test") || "").trim() || null;
    const rangeParam = (url.searchParams.get("range") || "").trim() || null;
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const includeDetails = url.searchParams.get("details") === "1";

    if (!orgSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing ?org=slug" },
        { status: 400 }
      );
    }

    const { from, to, label: rangeLabel } = computeRange(
      rangeParam,
      fromParam,
      toParam
    );

    const supabase: any = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );
    const portal = supabase.schema("portal");

    // We limit details but still get a full count from Supabase.
    const maxDetails = includeDetails ? 1000 : 300;

    const query = portal
      .from("v_usage_submissions")
      .select("*", { count: "exact", head: false })
      .eq("org_slug", orgSlug)
      .gte("completed_at", from.toISOString())
      .lt("completed_at", to.toISOString())
      .order("completed_at", { ascending: false })
      .limit(maxDetails);

    if (testSlug) {
      query.eq("test_slug", testSlug);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message || "Supabase query failed");
    }

    const rows = (data || []) as UsageRow[];
    const totalCount = count ?? rows.length;

    // ---- summaries ----

    // by test
    const byTestRaw = groupBy(rows, (r) => (r.test_slug || undefined) as string);
    const byTest = byTestRaw.map((g) => ({
      test_slug: g.key,
      test_name: g.sample?.test_name || g.key,
      count: g.count,
    }));

    // by link
    const byLinkRaw = groupBy(rows, (r) => (r.link_token || undefined) as string);
    const byLink = byLinkRaw.map((g) => ({
      link_token: g.key,
      link_name: g.sample?.link_name || g.key,
      contact_owner: g.sample?.link_contact_owner || null,
      count: g.count,
    }));

    // simple time series (per day)
    const byDayMap = new Map<
      string,
      { date: string; count: number }
    >();
    for (const r of rows) {
      const d = new Date(r.completed_at);
      // yyyy-mm-dd in UTC
      const key = d.toISOString().slice(0, 10);
      const existing = byDayMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        byDayMap.set(key, { date: key, count: 1 });
      }
    }
    const byDay = Array.from(byDayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const summary = {
      total_submissions: totalCount,
      by_test: byTest,
      by_link: byLink,
      by_day: byDay,
    };

    // limit details payload to what’s useful in UI
    const details = includeDetails
      ? rows.map((r) => ({
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
        }))
      : undefined;

    return NextResponse.json(
      {
        ok: true,
        filters: {
          org: orgSlug,
          test: testSlug,
          range: rangeParam || rangeLabel,
          from: from.toISOString(),
          to: to.toISOString(),
        },
        summary,
        details,
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
