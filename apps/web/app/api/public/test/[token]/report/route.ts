import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin"; // your server/service client

export const dynamic = "force-dynamic";

type Totals = Partial<Record<"A"|"B"|"C"|"D", number>>;

function toNumber(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = params.token || "";
  const url = new URL(req.url);
  const tid = (url.searchParams.get("tid") || "").trim();

  if (!token || !tid) {
    return NextResponse.json({ ok: false, error: "missing token/tid" }, { status: 400 });
  }

  const sb = createClient().schema("portal");

  // Resolve link → test (org_id not needed for submissions)
  const { data: link, error: linkErr } = await sb
    .from("test_links")
    .select("id, test_id, token")
    .eq("token", token)
    .maybeSingle();

  if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
  if (!link)   return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });

  // Taker basic identity
  const { data: taker, error: takerErr } = await sb
    .from("test_takers")
    .select("id, first_name, last_name, email")
    .eq("id", tid)
    .eq("test_id", link.test_id)
    .maybeSingle();

  if (takerErr) return NextResponse.json({ ok: false, error: takerErr.message }, { status: 500 });
  if (!taker)   return NextResponse.json({ ok: false, error: "invalid taker" }, { status: 404 });

  // Latest submission for this taker (contains totals JSON)
  const { data: sub, error: subErr } = await sb
    .from("test_submissions")
    .select("id, totals, answers_json, created_at, first_name, last_name, email, company, role_title")
    .eq("taker_id", tid)
    .eq("test_id", link.test_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subErr) return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
  if (!sub)   return NextResponse.json({ ok: false, error: "no submission" }, { status: 404 });

  // Test name (for header)
  const { data: testRow } = await sb
    .from("tests")
    .select("name")
    .eq("id", link.test_id)
    .maybeSingle();

  const testName = testRow?.name || "Test";

  // Labels
  const [{ data: freqLabels }, { data: profLabels }] = await Promise.all([
    sb.from("test_frequency_labels")
      .select("frequency_code, frequency_name")
      .eq("test_id", link.test_id),
    sb.from("test_profile_labels")
      .select("profile_code, profile_name, frequency_code")
      .eq("test_id", link.test_id),
  ]);

  const frequency_labels =
    (freqLabels || []).map((f) => ({
      code: (f.frequency_code as "A"|"B"|"C"|"D") || "A",
      name: (f as any).frequency_name ?? `Frequency ${(f.frequency_code || "").toString()}`,
    })) as { code: "A"|"B"|"C"|"D"; name: string }[];

  const profile_labels =
    (profLabels || []).map((p) => ({
      code: String(p.profile_code),
      name: (p as any).profile_name ?? String(p.profile_code),
      frequency: (p.frequency_code as "A"|"B"|"C"|"D") || "A",
    })) as { code: string; name: string; frequency: "A"|"B"|"C"|"D" }[];

  // Totals & percentages
  const totalsObj = (sub.totals || {}) as Totals;
  const totals: Record<"A"|"B"|"C"|"D", number> = {
    A: toNumber(totalsObj.A),
    B: toNumber(totalsObj.B),
    C: toNumber(totalsObj.C),
    D: toNumber(totalsObj.D),
  };
  const sum = Math.max(1, totals.A + totals.B + totals.C + totals.D);
  const percentages = {
    A: totals.A / sum,
    B: totals.B / sum,
    C: totals.C / sum,
    D: totals.D / sum,
  };

  const sorted = (Object.entries(totals) as Array<["A"|"B"|"C"|"D", number]>)
    .sort((a, b) => b[1] - a[1]);
  const top_freq = sorted[0][0];

  // If you have exact-profile logic, apply it here; otherwise pick the first profile label for that frequency.
  const topProfileRow = profile_labels.find((p) => p.frequency === top_freq) || profile_labels[0];
  const top_profile_code = topProfileRow?.code || `${top_freq}1`;
  const top_profile_name = topProfileRow?.name || `${top_freq} Profile`;

  return NextResponse.json({
    ok: true,
    data: {
      org_name: null, // (optional) join organizations if you need it
      test_name: testName,
      taker,
      totals,
      percentages,
      top_freq,
      top_profile_code,
      top_profile_name,
      frequency_labels,
      profile_labels,
      version: "portal-v1",
    },
  });
}
