// apps/web/app/api/public/test/[token]/report/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Totals = Record<string, unknown>;
type Labeled = Record<string, string>;
type Percentages = Record<string, number>;

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computePercents(values: Record<string, number>): Percentages {
  const sum = Object.values(values).reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0) {
    // keep the keys but show zeros to avoid dividing by 0
    const allZero: Percentages = {};
    for (const k of Object.keys(values)) allZero[k] = 0;
    return allZero;
  }
  const out: Percentages = {};
  for (const [k, v] of Object.entries(values)) {
    const p = (Math.max(0, v) / sum) * 100;
    out[k] = Math.round(p * 10) / 10; // 1 decimal place
  }
  return out;
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const url = new URL(req.url);
  const tid = url.searchParams.get("tid") || "";
  const token = params.token;

  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }

  const sb = createClient().schema("portal");

  // 1) Resolve the link (get test_id + org context)
  const { data: link, error: linkErr } = await sb
    .from("test_links")
    .select("id, org_id, test_id, token")
    .eq("token", token)
    .maybeSingle();

  if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
  if (!link)  return NextResponse.json({ ok: false, error: "Invalid test link" }, { status: 404 });

  // 2) Resolve the taker (prefer tid if present, else latest by this token)
  let takerId = tid;
  if (takerId) {
    const { data: takerRow, error: takerErr } = await sb
      .from("test_takers")
      .select("id, test_id, link_token, first_name, last_name, email")
      .eq("id", takerId)
      .eq("link_token", link.token)
      .maybeSingle();
    if (takerErr) return NextResponse.json({ ok: false, error: takerErr.message }, { status: 500 });
    if (!takerRow) return NextResponse.json({ ok: false, error: "No taker found for this link" }, { status: 404 });
  } else {
    const { data: takerRow, error: takerErr } = await sb
      .from("test_takers")
      .select("id")
      .eq("link_token", link.token)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (takerErr) return NextResponse.json({ ok: false, error: takerErr.message }, { status: 500 });
    if (!takerRow) return NextResponse.json({ ok: false, error: "No taker found for this link" }, { status: 404 });
    takerId = takerRow.id;
  }

  // 3) Load submission (works with your schema: totals_json and/or totals)
  const { data: sub, error: subErr } = await sb
    .from("test_submissions")
    .select("id, first_name, last_name, email, company, role_title, totals_json, totals")
    .eq("taker_id", takerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subErr) return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });
  if (!sub)   return NextResponse.json({ ok: false, error: "No submission found for this taker" }, { status: 404 });

  // Prefer totals_json if it has content; otherwise fall back to totals
  const totalsRaw: Totals =
    (sub.totals_json && Object.keys(sub.totals_json as object).length > 0
      ? (sub.totals_json as Totals)
      : (sub.totals as Totals)) || {};

  // 4) Split raw totals into frequency (A..D) and profiles (PROFILE_1..8)
  const freqCodes = ["A", "B", "C", "D"] as const;
  const profCodes = Array.from({ length: 8 }, (_, i) => `PROFILE_${i + 1}`);

  const frequencyRaw: Record<string, number> = {};
  for (const f of freqCodes) frequencyRaw[f] = toNum(totalsRaw[f]);

  const profileRaw: Record<string, number> = {};
  for (const p of profCodes) profileRaw[p] = toNum(totalsRaw[p]);

  const frequencyPerc = computePercents(frequencyRaw);
  const profilePerc   = computePercents(profileRaw);

  // 5) Labels (friendly names)
  const [{ data: freqLabels, error: flErr }, { data: profLabels, error: plErr }] =
    await Promise.all([
      sb
        .from("test_frequency_labels")
        .select("frequency_code, frequency_name")
        .eq("test_id", link.test_id),
      sb
        .from("test_profile_labels")
        .select("profile_code, profile_name, frequency_code")
        .eq("test_id", link.test_id),
    ]);

  if (flErr) return NextResponse.json({ ok: false, error: flErr.message }, { status: 500 });
  if (plErr) return NextResponse.json({ ok: false, error: plErr.message }, { status: 500 });

  const frequencyNames: Labeled = {};
  for (const f of freqCodes) {
    const hit = (freqLabels || []).find((r: any) => r.frequency_code === f);
    frequencyNames[f] = hit?.frequency_name ?? f;
  }

  const profileNames: Labeled = {};
  for (const p of profCodes) {
    const hit = (profLabels || []).find((r: any) => r.profile_code === p);
    profileNames[p] = hit?.profile_name ?? p;
  }

  // 6) Identity snapshot (from submission row)
  const identity = {
    first_name: sub.first_name ?? null,
    last_name:  sub.last_name ?? null,
    email:      sub.email ?? null,
    company:    sub.company ?? null,
    role_title: sub.role_title ?? null,
  };

  // 7) Response payload
  return NextResponse.json({
    ok: true,
    data: {
      meta: {
        test_id: link.test_id,
        taker_id: takerId,
        token,
      },
      identity,
      frequencies: {
        raw: frequencyRaw,
        percents: frequencyPerc,
        labels: frequencyNames,     // e.g., { A: "Catalyst", ... }
      },
      profiles: {
        raw: profileRaw,
        percents: profilePerc,
        labels: profileNames,       // e.g., { PROFILE_1: "The Innovator", ... }
      },
    },
  });
}
