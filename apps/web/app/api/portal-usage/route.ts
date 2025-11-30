import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type UsageSummary = {
  total_submissions: number;
  unique_tests: number;
  unique_links: number;
};

type UsageByTest = {
  test_id: string;
  test_name: string;
  test_slug: string | null;
  submissions: number;
  first_submission: string | null;
  last_submission: string | null;
};

type UsageByLink = {
  link_id: string | null;
  link_name: string | null;
  link_token: string | null;
  test_name: string | null;
  submissions: number;
  first_submission: string | null;
  last_submission: string | null;
};

type UsageActivityByDay = {
  date: string; // YYYY-MM-DD
  submissions: number;
};

type UsagePayload = {
  summary: UsageSummary;
  byTest: UsageByTest[];
  byLink: UsageByLink[];
  activityByDay: UsageActivityByDay[];
};

function computeRange(period: string | null): { from: Date | null; to: Date | null } {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  if (!period || period === "all") {
    return { from: null, to: null };
  }

  const startOfWeek = (d: Date) => {
    const day = d.getUTCDay(); // 0=Sun
    const diff = (day + 6) % 7; // make Monday start (0)
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - diff);
    return new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
  };

  const startOfMonth = new Date(Date.UTC(year, month, 1));
  const startOfYear = new Date(Date.UTC(year, 0, 1));

  switch (period) {
    case "this_week": {
      const from = startOfWeek(today);
      const to = new Date(from);
      to.setUTCDate(from.getUTCDate() + 7);
      return { from, to };
    }
    case "last_week": {
      const thisWeekStart = startOfWeek(today);
      const from = new Date(thisWeekStart);
      from.setUTCDate(thisWeekStart.getUTCDate() - 7);
      const to = thisWeekStart;
      return { from, to };
    }
    case "this_month": {
      const from = startOfMonth;
      const to = new Date(Date.UTC(year, month + 1, 1));
      return { from, to };
    }
    case "last_month": {
      const from = new Date(Date.UTC(year, month - 1, 1));
      const to = startOfMonth;
      return { from, to };
    }
    case "this_year": {
      const from = startOfYear;
      const to = new Date(Date.UTC(year + 1, 0, 1));
      return { from, to };
    }
    case "last_year": {
      const from = new Date(Date.UTC(year - 1, 0, 1));
      const to = startOfYear;
      return { from, to };
    }
    default:
      return { from: null, to: null };
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
    const testId = (url.searchParams.get("testId") || "").trim() || null;
    const period = (url.searchParams.get("period") || "all").trim() || "all";

    if (!orgSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing ?org=slug" },
        { status: 400 }
      );
    }

    const { from, to } = computeRange(period);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const portal = sb.schema("portal");

    // Base rows from the view
    let query = portal
      .from("v_usage_submissions")
      .select("*")
      .eq("org_slug", orgSlug);

    if (testId) {
      query = query.eq("test_id", testId);
    }
    if (from) {
      query = query.gte("created_at", from.toISOString());
    }
    if (to) {
      query = query.lt("created_at", to.toISOString());
    }

    const { data: rows, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const records = Array.isArray(rows) ? rows : [];

    // ---- aggregate in Node ----
    const summary: UsageSummary = {
      total_submissions: records.length,
      unique_tests: new Set(records.map((r: any) => r.test_id).filter(Boolean)).size,
      unique_links: new Set(records.map((r: any) => r.link_id).filter(Boolean)).size,
    };

    const byTestMap = new Map<string, UsageByTest>();
    const byLinkMap = new Map<string, UsageByLink>();
    const dayMap = new Map<string, number>();

    for (const r of records as any[]) {
      const testIdKey = String(r.test_id);
      const linkIdKey = r.link_id ? String(r.link_id) : `no-link:${r.test_id || "unknown"}`;
      const created = r.created_at ? new Date(r.created_at) : null;
      const dayKey = created
        ? created.toISOString().slice(0, 10) // YYYY-MM-DD
        : null;

      // by test
      const existingTest = byTestMap.get(testIdKey);
      if (!existingTest) {
        byTestMap.set(testIdKey, {
          test_id: testIdKey,
          test_name: r.test_name || "Unknown test",
          test_slug: r.test_slug || null,
          submissions: 1,
          first_submission: r.created_at || null,
          last_submission: r.created_at || null,
        });
      } else {
        existingTest.submissions += 1;
        if (
          r.created_at &&
          (!existingTest.first_submission ||
            r.created_at < existingTest.first_submission)
        ) {
          existingTest.first_submission = r.created_at;
        }
        if (
          r.created_at &&
          (!existingTest.last_submission ||
            r.created_at > existingTest.last_submission)
        ) {
          existingTest.last_submission = r.created_at;
        }
      }

      // by link
      const existingLink = byLinkMap.get(linkIdKey);
      if (!existingLink) {
        byLinkMap.set(linkIdKey, {
          link_id: r.link_id || null,
          link_name: r.link_name || null,
          link_token: r.link_token || null,
          test_name: r.test_name || null,
          submissions: 1,
          first_submission: r.created_at || null,
          last_submission: r.created_at || null,
        });
      } else {
        existingLink.submissions += 1;
        if (
          r.created_at &&
          (!existingLink.first_submission ||
            r.created_at < existingLink.first_submission)
        ) {
          existingLink.first_submission = r.created_at;
        }
        if (
          r.created_at &&
          (!existingLink.last_submission ||
            r.created_at > existingLink.last_submission)
        ) {
          existingLink.last_submission = r.created_at;
        }
      }

      // activity by day
      if (dayKey) {
        dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
      }
    }

    const byTest: UsageByTest[] = Array.from(byTestMap.values()).sort((a, b) =>
      a.test_name.localeCompare(b.test_name)
    );
    const byLink: UsageByLink[] = Array.from(byLinkMap.values()).sort((a, b) =>
      (a.link_name || "").localeCompare(b.link_name || "")
    );
    const activityByDay: UsageActivityByDay[] = Array.from(dayMap.entries())
      .map(([date, submissions]) => ({ date, submissions }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const payload: UsagePayload = {
      summary,
      byTest,
      byLink,
      activityByDay,
    };

    return NextResponse.json(
      {
        ok: true,
        org: orgSlug,
        period,
        from: from ? from.toISOString() : null,
        to: to ? to.toISOString() : null,
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
