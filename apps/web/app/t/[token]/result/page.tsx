// apps/web/app/api/public/test/[token]/report/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Totals = Record<string, number | string | null | undefined>;
type LabelRow = { frequency_code?: string; frequency_name?: string; profile_code?: string; profile_name?: string };

function toNumber(x: unknown): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function toPercents(map: Record<string, number>): Record<string, number> {
  const sum = Object.values(map).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  if (!sum || sum <= 0) {
    // Avoid NaNs – return zeros maintaining keys
    const out: Record<string, number> = {};
    for (const k of Object.keys(map)) out[k] = 0;
    return out;
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) out[k] = clamp01(v / sum) * 100;
  return out;
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const sb = createClient().schema("portal");
  const token = params.token;
  const url = new URL(req.url);
  const takerId = (url.searchParams.get("tid") || "").trim();

  if (!token || !takerId) {
    return NextResponse.json(
      { ok: false, error: "missing token/tid" },
      { status: 400 }
    );
  }

  // 1) Resolve the link → test
  const { data: link, error: linkErr } = await sb
    .from("test_links")
    .select("id, test_id, token")
    .eq("token", token)
    .maybeSingle();

  if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
  if (!link)  return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });

  // 2) Confirm taker exists for this test
  const { data: taker, error: takerErr } = await sb
    .from("test_takers")
    .select("id, first_name, last_name, email, company, role_title")
    .eq("id", takerId)
    .eq("test_id", link.test_id)
    .maybeSingle();

  if (takerErr) return NextResponse.json({ ok: false, error: takerErr.message }, { status: 500 });
  if (!taker)  return NextResponse.json({ ok: false, error: "invalid taker" }, { status: 404 });

  // 3) Grab the latest submission for this taker/test
  //    Your schema: totals (jsonb), answers_json (jsonb), link_token (text)
  const { data: sub, error: subErr } = await sb
    .from("test_submissions")
    .select("totals, totals_json, answers_json, link_token, first_name, last_name, email, company, role_title, created_at")
    .eq("taker_id", takerId)
    .eq("test_id", link.test_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subErr) return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
  if (!sub)    return NextResponse.json({ ok: false, error: "no submission" }, { status: 404 });

  // Normalize totals:
  // Prefer `totals` (your table), fall back to `totals_json` if present.
  const totalsObj: Totals =
    (sub as any).totals ??
    (sub as any).totals_json ??
    {};

  // Extract raw frequency/profile maps
  // Expecting keys: A,B,C,D and PROFILE_1..PROFILE_8 (but we’ll be forgiving)
  const freqRaw: Record<string, number> = {
    A: toNumber((totalsObj as any).A),
    B: toNumber((totalsObj as any).B),
    C: toNumber((totalsObj as any).C),
    D: toNumber((totalsObj as any).D),
  };

  // Profiles: accept PROFILE_1..PROFILE_8 if present, otherwise zeros
  const profileKeys = Array.from({ length: 8 }, (_, i) => `PROFILE_${i + 1}`);
  const profRaw: Record<string, number> = {};
  for (const k of profileKeys) profRaw[k] = toNumber((totalsObj as any)[k]);

  // Convert to percentages
  const freqPerc = toPercents(freqRaw);
  const profPerc = toPercents(profRaw);

  // 4) Labels for this test
  const [freqLabelsRes, profLabelsRes] = await Promise.all([
    sb
      .from("test_frequency_labels")
      .select("frequency_code, frequency_name")
      .eq("test_id", link.test_id),
    sb
      .from("test_profile_labels")
      .select("profile_code, profile_name")
      .eq("test_id", link.test_id),
  ]);

  if (freqLabelsRes.error)
    return NextResponse.json({ ok: false, error: freqLabelsRes.error.message }, { status: 500 });
  if (profLabelsRes.error)
    return NextResponse.json({ ok: false, error: profLabelsRes.error.message }, { status: 500 });

  const freqLabelMap: Record<string, string> = {};
  (freqLabelsRes.data || []).forEach((r: LabelRow) => {
    if (r.frequency_code) freqLabelMap[r.frequency_code] = r.frequency_name || r.frequency_code;
  });

  const profLabelMap: Record<string, string> = {};
  (profLabelsRes.data || []).forEach((r: LabelRow) => {
    if (r.profile_code) profLabelMap[r.profile_code] = r.profile_name || r.profile_code!;
  });

  // 5) Build the response payload (plain JSON only)
  const payload = {
    meta: {
      test_id: link.test_id,
      taker_id: taker.id,
      token: link.token,
      submitted_at: sub.created_at,
      link_token: sub.link_token,
    },
    identity: {
      first_name: sub.first_name ?? taker.first_name ?? null,
      last_name:  sub.last_name  ?? taker.last_name  ?? null,
      email:      sub.email      ?? taker.email      ?? null,
      company:    sub.company    ?? taker.company    ?? null,
      role_title: sub.role_title ?? taker.role_title ?? null,
    },
    frequencies: {
      raw: freqRaw,
      percents: freqPerc,
      labels: {
        A: freqLabelMap.A ?? "A",
        B: freqLabelMap.B ?? "B",
        C: freqLabelMap.C ?? "C",
        D: freqLabelMap.D ?? "D",
      },
    },
    profiles: {
      raw: profRaw,
      percents: profPerc,
      labels: profileKeys.reduce<Record<string, string>>((acc, k) => {
        acc[k] = profLabelMap[k] ?? k;
        return acc;
      }, {}),
    },
  };

  return NextResponse.json({ ok: true, data: payload }, { status: 200 });
}
