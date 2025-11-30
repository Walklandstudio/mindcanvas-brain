// apps/web/app/api/org-usage/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UsageSummary = {
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
  date: string;          // yyyy-mm-dd
  submissions: number;
};

type Payload = {
  summary: UsageSummary;
  byTest: TestRow[];
  byLink: LinkRow[];
  byDay: DayRow[];
};

function normaliseRange(range: string | null): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);

  switch (range) {
    case "this-week": {
      const day = end.getDay(); // 0=Sun
      const diff = (day === 0 ? 6 : day - 1); // Monday as start
      start.setDate(end.getDate() - diff);
      break;
    }
    case "last-week": {
      const day = end.getDay();
      const diff = (day === 0 ? 6 : day - 1);
      end.setDate(end.getDate() - diff - 1);      // Sunday end of last week
      start.setTime(end.getTime());
      start.setDate(end.getDate() - 6);           // Monday start
      break;
    }
    case "last-month": {
      start.setMonth(start.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth(), 0); // last day of previous month
      break;
    }
    case "this-year": {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "last-year": {
      start.setFullYear(start.getFullYear() - 1, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(end.getFullYear() - 1, 11, 31);
      break;
    }
    case "this-month":
    default: {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    }
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const portal = sb.schema("portal");

    const url = new URL(req.url);
    const orgSlug = (url.searchParams.get("org") || "").trim();
    const testSlug = (url.searchParams.get("test") || "").trim() || null;
    const rangeKey = (url.searchParams.get("range") || "this-month").trim();

    if (!orgSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing ?org=slug" },
        { status: 400 }
      );
    }

    // Resolve org_id + optional test_id (if test slug provided)
    const { data: orgRow, error: orgErr } = await portal
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .maybeSingle();

    if (orgErr || !orgRow?.id) {
      return NextResponse.json(
        { ok: false, error: "Org not found" },
        { status: 404 }
      );
    }

    const orgId = orgRow.id as string;

    let testId: string | null = null;
    if (testSlug) {
      const { data: tRow } = await portal
        .from("tests")
        .select("id")
        .eq("org_id", orgId)
        .eq("slug", testSlug)
        .maybeSingle();
      testId = tRow?.id ?? null;
    }

    const { from, to } = normaliseRange(rangeKey);

    // Base filter: date range + org (+ optional test)
    const baseFilter = portal
      .from("test_submissions")
      .select(
        `
        id,
        test_id,
        link_token,
        created_at
      `
      )
      .gte("created_at", from)
      .lte("created_at", to)
      .eq("org_id", orgId);

    const { data: subsRaw, error: subsErr } = testId
      ? await baseFilter.eq("test_id", testId)
      : await baseFilter;

    if (subsErr) {
      return NextResponse.json(
        { ok: false, error: subsErr.message },
        { status: 500 }
      );
    }

    const submissions = subsRaw ?? [];
    const total_submissions = submissions.length;

    // If no data, short-circuit
    if (!total_submissions) {
      const empty: Payload = {
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
        { ok: true, org: orgSlug, testSlug, range: rangeKey, data: empty },
        { status: 200 }
      );
    }

    // Collect ids
    const testIds = Array.from(new Set(submissions.map((s: any) => s.test_id)));
    const linkTokens = Array.from(
      new Set(submissions.map((s: any) => s.link_token))
    );

    // Load test + link metadata
    const [{ data: testsMeta }, { data: linksMeta }] = await Promise.all([
      portal
        .from("tests")
        .select("id,name,slug")
        .in("id", testIds),
      portal
        .from("test_links")
        .select("id,token,name,contact_owner")
        .in("token", linkTokens),
    ]);

    const testsById = new Map<string, any>();
    (testsMeta ?? []).forEach((t: any) => testsById.set(t.id, t));

    const linksByToken = new Map<string, any>();
    (linksMeta ?? []).forEach((l: any) => linksByToken.set(l.token, l));

    // Aggregate by test
    const testCounts = new Map<string, number>();
    const linkCounts = new Map<string, number>();
    const dayCounts = new Map<string, number>();

    for (const s of submissions as any[]) {
      const tId = s.test_id as string;
      const tok = s.link_token as string;
      const d = new Date(s.created_at);
      const day = d.toISOString().slice(0, 10); // yyyy-mm-dd

      testCounts.set(tId, (testCounts.get(tId) ?? 0) + 1);
      linkCounts.set(tok, (linkCounts.get(tok) ?? 0) + 1);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }

    const byTest: TestRow[] = Array.from(testCounts.entries())
      .map(([test_id, submissions]) => {
        const meta = testsById.get(test_id);
        return {
          test_id,
          test_name: meta?.name ?? "(unknown test)",
          test_slug: meta?.slug ?? null,
          submissions,
        };
      })
      .sort((a, b) => b.submissions - a.submissions);

    const byLink: LinkRow[] = Array.from(linkCounts.entries())
      .map(([token, submissions]) => {
        const meta = linksByToken.get(token);
        return {
          link_id: meta?.id ?? "",
          link_name: meta?.name ?? null,
          token,
          contact_owner: meta?.contact_owner ?? null,
          submissions,
        };
      })
      .sort((a, b) => b.submissions - a.submissions);

    const byDay: DayRow[] = Array.from(dayCounts.entries())
      .map(([date, submissions]) => ({ date, submissions }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const payload: Payload = {
      summary: {
        total_submissions,
        distinct_tests: testCounts.size,
        distinct_links: linkCounts.size,
      },
      byTest,
      byLink,
      byDay,
    };

    return NextResponse.json(
      {
        ok: true,
        org: orgSlug,
        testSlug,
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
