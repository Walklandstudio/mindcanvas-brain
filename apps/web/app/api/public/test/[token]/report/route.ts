// apps/web/app/api/public/test/[token]/report/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Totals = { A?: number; B?: number; C?: number; D?: number };

function topAndExact(t: Totals) {
  const entries: Array<["A" | "B" | "C" | "D", number]> = (["A", "B", "C", "D"] as const).map(
    (k) => [k, Number(t[k] ?? 0)]
  );
  entries.sort(
    (a: ["A" | "B" | "C" | "D", number], b: ["A" | "B" | "C" | "D", number]) => b[1] - a[1]
  );

  const top = entries[0][0];
  const A = Number(t.A ?? 0);
  const B = Number(t.B ?? 0);
  const C = Number(t.C ?? 0);
  const D = Number(t.D ?? 0);

  let exact: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "D1" | "D2";
  switch (top) {
    case "A": exact = B >= C ? "A1" : "A2"; break;
    case "B": exact = A >= D ? "B1" : "B2"; break;
    case "C": exact = D >= A ? "C1" : "C2"; break;
    case "D": exact = C >= B ? "D1" : "D2"; break;
  }
  return { top, exact, scores: { A, B, C, D } };
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const sb = createClient().schema("portal");

  try {
    const token = (params?.token || "").trim();
    const url = new URL(req.url);
    const takerId = (url.searchParams.get("tid") || "").trim();

    if (!token || !takerId) {
      return NextResponse.json({ ok: false, error: "missing token/tid" }, { status: 400 });
    }

    // Link → test + name (array-safe)
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("test_id, tests(name)")
      .eq("token", token)
      .maybeSingle();
    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link) return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });

    // Supabase can return nested rows as object or array depending on FK config — handle both:
    const testName =
      Array.isArray((link as any).tests)
        ? (link as any).tests?.[0]?.name ?? "Test"
        : (link as any).tests?.name ?? "Test";

    // Taker (confirm attachment to test)
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select("id, first_name, last_name, email")
      .eq("id", takerId)
      .eq("test_id", link.test_id)
      .maybeSingle();
    if (takerErr) return NextResponse.json({ ok: false, error: takerErr.message }, { status: 500 });
    if (!taker) return NextResponse.json({ ok: false, error: "invalid taker" }, { status: 404 });

    // Scores from results
    const { data: resRow, error: resErr } = await sb
      .from("test_results")
      .select("totals")
      .eq("taker_id", takerId)
      .maybeSingle();
    if (resErr) return NextResponse.json({ ok: false, error: resErr.message }, { status: 500 });
    if (!resRow) return NextResponse.json({ ok: false, error: "no result" }, { status: 404 });

    const { top, exact, scores } = topAndExact((resRow.totals || {}) as Totals);

    // Return percentages too (ready for UI)
    const sum = Math.max(1, scores.A + scores.B + scores.C + scores.D);
    const perc = {
      A: Math.round((scores.A / sum) * 100),
      B: Math.round((scores.B / sum) * 100),
      C: Math.round((scores.C / sum) * 100),
      D: Math.round((scores.D / sum) * 100),
    };

    return NextResponse.json(
      {
        ok: true,
        data: {
          test_name: testName,
          taker,
          scores,                 // raw totals
          percentages: perc,      // 0–100 integers
          top_freq: top,          // "A" | "B" | "C" | "D"
          profile_exact_key: exact, // "A1".."D2"
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
