// app/api/dashboard/flow-distribution/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type FlowKey = "A" | "B" | "C" | "D";
type Bucket = { key: FlowKey; count: number };
type Ok = { buckets: Bucket[]; from: string; to: string; test: string | null };

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

  // Default 30d window
  const toIso = (to ? new Date(to) : new Date()).toISOString();
  const fromIso = (from ? new Date(from) : new Date(Date.now() - 30 * 864e5)).toISOString();

  // We try to read summed flow columns from a results table/view.
  // If the query fails (missing table/cols), we still return a typed zero payload.
  const zero: Ok = {
    from: fromIso,
    to: toIso,
    test: test || null,
    buckets: [
      { key: "A", count: 0 },
      { key: "B", count: 0 },
      { key: "C", count: 0 },
      { key: "D", count: 0 },
    ],
  };

  try {
    // Prefer a view like `mc_results` that already contains one row per submission/result
    // with flow_a..flow_d integers and created_at/test_slug.
    const q = supabase
      .from("mc_results")
      .select("flow_a, flow_b, flow_c, flow_d, created_at, test_slug")
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    const { data, error } = test ? await q.eq("test_slug", test) : await q;

    if (error || !data) return NextResponse.json(zero);

    let A = 0,
      B = 0,
      C = 0,
      D = 0;
    for (const row of data) {
      A += Number(row.flow_a ?? 0);
      B += Number(row.flow_b ?? 0);
      C += Number(row.flow_c ?? 0);
      D += Number(row.flow_d ?? 0);
    }

    const out: Ok = {
      from: fromIso,
      to: toIso,
      test: test || null,
      buckets: [
        { key: "A", count: A },
        { key: "B", count: B },
        { key: "C", count: C },
        { key: "D", count: D },
      ],
    };
    return NextResponse.json(out);
  } catch {
    return NextResponse.json(zero);
  }
}
