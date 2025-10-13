// app/api/dashboard/summary/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Summary = {
  submissions: number;
  unique_clients: number;
  from: string;
  to: string;
  test: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const test = url.searchParams.get("test");

  const toIso = (to ? new Date(to) : new Date()).toISOString();
  const fromIso = (from ? new Date(from) : new Date(Date.now() - 30 * 864e5)).toISOString();

  // Default payload in case of any DB hiccup
  const empty: Summary = {
    submissions: 0,
    unique_clients: 0,
    from: fromIso,
    to: toIso,
    test: test || null,
  };

  try {
    // Count submissions
    const base = supabase
      .from("mc_submissions")
      .select("id, person_email, created_at, test_slug", { count: "exact", head: true })
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    const subQ = test ? base.eq("test_slug", test) : base;
    const { count: submissionsCount, error: subErr } = await subQ;

    if (subErr) return NextResponse.json(empty);

    // Distinct people by email (or by id fallback)
    const peopleQ = supabase
      .from("mc_submissions")
      .select("person_email, id, created_at, test_slug")
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    const peopleRes = test ? await peopleQ.eq("test_slug", test) : await peopleQ;
    const emails = new Set<string>();
    if (peopleRes.data) {
      for (const row of peopleRes.data) {
        const key = (row as { person_email?: string | null }).person_email ?? `sid:${row.id}`;
        emails.add(key);
      }
    }

    const out: Summary = {
      submissions: submissionsCount ?? 0,
      unique_clients: emails.size,
      from: fromIso,
      to: toIso,
      test: test || null,
    };

    return NextResponse.json(out);
  } catch {
    return NextResponse.json(empty);
  }
}
