import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadFrameworkBySlug, buildLookups, coerceOrgSlug } from "@/lib/frameworks";

const AB_VALUES = ["A", "B", "C", "D"] as const;
type AB = (typeof AB_VALUES)[number];

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function toPctMap<T extends Record<string, number>>(totals: T): Record<keyof T, number> {
  const sum = Object.values(totals).reduce((a, b) => a + Number(b || 0), 0);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(totals)) out[k] = sum > 0 ? Number(v || 0) / sum : 0;
  return out as Record<keyof T, number>;
}

function topAB(t: Partial<Record<AB, number>>): AB {
  let best: AB = "A";
  let max = -Infinity;
  for (const k of AB_VALUES) {
    const v = Number(t[k] ?? 0);
    if (v > max) {
      best = k;
      max = v;
    }
  }
  return best;
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token || "");
  const url = new URL(req.url);
  const tid = url.searchParams.get("tid");

  if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  if (!tid) return NextResponse.json({ ok: false, error: "Missing taker id (?tid=)" }, { status: 400 });

  const supa = sb();

  // 1) link → test_id, org_slug, test_name
  let test_id: string | null = null;
  let org_slug: string | null = null;
  let test_name: string | null = null;

  const { data: link, error: linkErr } = await supa
    .from("test_links")
    .select("test_id, org_id")
    .eq("token", token)
    .maybeSingle();
  if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
  if (!link?.test_id) return NextResponse.json({ ok: false, error: "Invalid or expired link" }, { status: 404 });
  test_id = link.test_id;

  {
    const { data: vt } = await supa
      .from("v_org_tests")
      .select("org_slug, test_name")
      .eq("test_id", test_id)
      .maybeSingle();
    if (vt?.org_slug) org_slug = String(vt.org_slug);
    if (vt?.test_name) test_name = String(vt.test_name);
  }
  if (!org_slug && link?.org_id) {
    const { data: org } = await supa.from("organizations").select("slug").eq("id", link.org_id).maybeSingle();
    if (org?.slug) org_slug = String(org.slug);
  }
  org_slug = coerceOrgSlug({ org_slug }) || "team-puzzle";

  // 2) totals (results → submissions) – expect {frequencies, profiles}
  let freqTotals: Partial<Record<AB, number>> = { A: 0, B: 0, C: 0, D: 0 };
  let profileTotals: Record<string, number> = {};

  {
    const r1 = await supa.from("test_results").select("totals").eq("taker_id", tid).maybeSingle();
    const t = r1.data?.totals as any;
    if (t && typeof t === "object") {
      // new shape
      if (t.frequencies && typeof t.frequencies === "object") {
        freqTotals = {
          A: Number(t.frequencies.A || 0),
          B: Number(t.frequencies.B || 0),
          C: Number(t.frequencies.C || 0),
          D: Number(t.frequencies.D || 0),
        };
      } else {
        // legacy shape: {A,B,C,D}
        freqTotals = {
          A: Number(t.A || 0),
          B: Number(t.B || 0),
          C: Number(t.C || 0),
          D: Number(t.D || 0),
        };
      }
      if (t.profiles && typeof t.profiles === "object") profileTotals = Object.fromEntries(
        Object.entries(t.profiles).map(([k, v]) => [String(k), Number(v || 0)])
      );
    } else {
      const r2 = await supa
        .from("test_submissions")
        .select("totals")
        .eq("taker_id", tid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const t2 = r2.data?.totals as any;
      if (t2 && typeof t2 === "object") {
        if (t2.frequencies && typeof t2.frequencies === "object") {
          freqTotals = {
            A: Number(t2.frequencies.A || 0),
            B: Number(t2.frequencies.B || 0),
            C: Number(t2.frequencies.C || 0),
            D: Number(t2.frequencies.D || 0),
          };
        } else {
          freqTotals = {
            A: Number(t2.A || 0),
            B: Number(t2.B || 0),
            C: Number(t2.C || 0),
            D: Number(t2.D || 0),
          };
        }
        if (t2.profiles && typeof t2.profiles === "object") profileTotals = Object.fromEntries(
          Object.entries(t2.profiles).map(([k, v]) => [String(k), Number(v || 0)])
        );
      }
    }
  }

  const frequency_percentages = toPctMap({
    A: Number(freqTotals.A || 0),
    B: Number(freqTotals.B || 0),
    C: Number(freqTotals.C || 0),
    D: Number(freqTotals.D || 0),
  });
  const top_freq = topAB(freqTotals);

  // 3) Labels for THIS test
  let frequency_labels: { code: AB; name: string }[] = [];
  let profile_labels: { code: string; name: string; frequency?: AB }[] = [];

  {
    const { data: fl } = await supa
      .from("test_frequency_labels")
      .select("frequency_code, frequency_name")
      .eq("test_id", test_id);
    if (Array.isArray(fl) && fl.length) {
      const map = new Map<AB, string>();
      for (const r of fl) {
        const c = String(r.frequency_code || "").toUpperCase() as AB;
        const n = String(r.frequency_name || "").trim();
        if (AB_VALUES.includes(c) && n) map.set(c, n);
      }
      frequency_labels = AB_VALUES.map((c) => ({ code: c, name: map.get(c) || `Frequency ${c}` }));
    }
  }
  {
    const { data: pl } = await supa
      .from("test_profile_labels")
      .select("profile_code, profile_name, frequency_code")
      .eq("test_id", test_id);
    if (Array.isArray(pl) && pl.length) {
      profile_labels = pl.map((r) => ({
        code: String(r.profile_code || "").trim() || "PROFILE_1",
        name: String(r.profile_name || "").trim() || "Profile",
        frequency: (String(r.frequency_code || "").toUpperCase() as AB) || undefined,
      }));
    }
  }

  // JSON fallback tied to org_slug (never default to CC unless org_slug is CC)
  if (!frequency_labels.length || !profile_labels.length) {
    const slug = coerceOrgSlug({ org_slug }) || "team-puzzle";
    const fw = await loadFrameworkBySlug(slug);
    const lookups = buildLookups(fw);

    if (!frequency_labels.length) {
      frequency_labels = AB_VALUES.map((c) => ({
        code: c,
        name: lookups.freqByCode.get(c)?.name || `Frequency ${c}`,
      }));
    }
    if (!profile_labels.length) {
      profile_labels = fw.framework.profiles.map((p) => ({
        code: String(p.code || "").trim() || "PROFILE_1",
        name: String(p.name || "").trim() || String(p.code || "Profile"),
      }));
    }
    if (!test_name) test_name = fw.framework.name || "Profile Test";
  }
  if (!test_name) test_name = "Profile Test";

  // profile % — align to label order, unknown keys still included
  const profile_percentages_raw = toPctMap(profileTotals);
  const profile_percentages: Record<string, number> = {};
  for (const p of profile_labels) profile_percentages[p.code] = Number(profile_percentages_raw[p.code] || 0);

  // top profile heuristic (highest % among labels; falls back to first)
  let top_profile_code = profile_labels[0]?.code || "PROFILE_1";
  let top_profile_name = profile_labels[0]?.name || "Top Profile";
  let max = -1;
  for (const p of profile_labels) {
    const v = Number(profile_percentages[p.code] || 0);
    if (v > max) {
      max = v;
      top_profile_code = p.code;
      top_profile_name = p.name;
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      org_slug,
      test_name,
      taker: { id: tid },
      frequency_labels,
      frequency_totals: {
        A: Number(freqTotals.A || 0),
        B: Number(freqTotals.B || 0),
        C: Number(freqTotals.C || 0),
        D: Number(freqTotals.D || 0),
      },
      frequency_percentages,
      profile_labels,
      profile_totals: profileTotals,
      profile_percentages,
      top_freq,
      top_profile_code,
      top_profile_name,
      version: "portal-v1",
    },
  });
}
