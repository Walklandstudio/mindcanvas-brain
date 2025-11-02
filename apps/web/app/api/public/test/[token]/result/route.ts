// apps/web/app/api/public/test/[token]/result/route.ts
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

function toPctMap(t: Partial<Record<AB, number>>): Record<AB, number> {
  const sum = AB_VALUES.reduce((acc, k) => acc + Number(t[k] ?? 0), 0);
  const out = {} as Record<AB, number>;
  for (const k of AB_VALUES) {
    const v = Number(t[k] ?? 0);
    out[k] = sum > 0 ? v / sum : 0;
  }
  return out;
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

  // --- 1) Resolve link → test_id, org_id, org_slug, test_name (NO CC defaulting here)
  let test_id: string | null = null;
  let org_id: string | null = null;
  let org_slug: string | null = null;
  let test_name: string | null = null;

  // link
  const { data: link, error: linkErr } = await supa
    .from("test_links")
    .select("test_id, org_id")
    .eq("token", token)
    .maybeSingle();
  if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
  if (!link?.test_id) return NextResponse.json({ ok: false, error: "Invalid or expired link" }, { status: 404 });

  test_id = link.test_id;
  org_id = link.org_id ?? null;

  // v_org_tests has org_slug + test_name for a test_id (use if present)
  {
    const { data: vt } = await supa
      .from("v_org_tests")
      .select("org_slug, test_name")
      .eq("test_id", test_id)
      .maybeSingle();
    if (vt?.org_slug) org_slug = String(vt.org_slug);
    if (vt?.test_name) test_name = String(vt.test_name);
  }

  // fallback to organizations.slug if needed
  if (!org_slug && org_id) {
    const { data: org } = await supa
      .from("organizations")
      .select("slug")
      .eq("id", org_id)
      .maybeSingle();
    if (org?.slug) org_slug = String(org.slug);
  }

  // As a last resort, coerce but prefer TEAM PUZZLE over CC
  org_slug = coerceOrgSlug({ org_slug }) || "team-puzzle";

  // --- 2) Load totals (results → submissions)
  let freqTotals: Partial<Record<AB, number>> = { A: 0, B: 0, C: 0, D: 0 };

  {
    const r1 = await supa.from("test_results").select("totals").eq("taker_id", tid).maybeSingle();
    const totalsObj = (r1.data?.totals ?? null) as any;
    if (totalsObj && typeof totalsObj === "object") {
      freqTotals = {
        A: Number(totalsObj.A ?? totalsObj?.frequencies?.A ?? 0),
        B: Number(totalsObj.B ?? totalsObj?.frequencies?.B ?? 0),
        C: Number(totalsObj.C ?? totalsObj?.frequencies?.C ?? 0),
        D: Number(totalsObj.D ?? totalsObj?.frequencies?.D ?? 0),
      };
    } else {
      const r2 = await supa
        .from("test_submissions")
        .select("totals")
        .eq("taker_id", tid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const t2 = (r2.data?.totals ?? null) as any;
      if (t2 && typeof t2 === "object") {
        freqTotals = {
          A: Number(t2.A ?? t2?.frequencies?.A ?? 0),
          B: Number(t2.B ?? t2?.frequencies?.B ?? 0),
          C: Number(t2.C ?? t2?.frequencies?.C ?? 0),
          D: Number(t2.D ?? t2?.frequencies?.D ?? 0),
        };
      }
    }
  }

  const freqPct = toPctMap(freqTotals);
  const topFreq = topAB(freqTotals);

  // --- 3) Labels: prefer DB tables for THIS test_id
  // Tables: test_frequency_labels (frequency_code+name), test_profile_labels (profile_code+name+frequency_code)
  let frequency_labels: { code: AB; name: string }[] = [];
  let profile_labels: { code: string; name: string; frequency?: AB }[] = [];

  // frequency labels
  {
    const { data: fl } = await supa
      .from("test_frequency_labels")
      .select("frequency_code, frequency_name")
      .eq("test_id", test_id);

    if (Array.isArray(fl) && fl.length) {
      const map = new Map<AB, string>();
      for (const row of fl) {
        const code = String(row.frequency_code || "").toUpperCase() as AB;
        const name = String(row.frequency_name || "").trim();
        if (AB_VALUES.includes(code) && name) map.set(code, name);
      }
      frequency_labels = AB_VALUES.map((c) => ({
        code: c,
        name: map.get(c) || `Frequency ${c}`,
      }));
    }
  }

  // profile labels
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

  // If any label set is missing, load it from the JSON framework for THIS org_slug
  if (!frequency_labels.length || !profile_labels.length) {
    const slug = coerceOrgSlug({ org_slug }) || "team-puzzle"; // <- never default to CC here
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
        // optional frequency mapping if present in your JSON
        frequency: (lookups.profilePrimaryFreq.get(String(p.code || "")) as AB | undefined) || undefined,
      }));
    }

    // also fill test_name if still missing
    if (!test_name) test_name = fw.framework.name || "Profile Test";
  }

  // Always set a sane test_name if still empty
  if (!test_name) test_name = "Profile Test";

  // Currently profile mix percentages may be empty (until you persist per-profile totals).
  const profile_totals: Record<string, number> = {};
  const profile_percentages: Record<string, number> = {};
  const top_profile_code = profile_labels[0]?.code || "PROFILE_1";
  const top_profile_name = profile_labels[0]?.name || "Top Profile";

  return NextResponse.json({
    ok: true,
    data: {
      org_slug,
      test_name,
      taker: { id: tid },
      frequency_labels,
      frequency_totals: {
        A: Number(freqTotals.A ?? 0),
        B: Number(freqTotals.B ?? 0),
        C: Number(freqTotals.C ?? 0),
        D: Number(freqTotals.D ?? 0),
      },
      frequency_percentages: freqPct,
      // If you’ve added per-frequency scores /10 upstream, you can attach here:
      // frequency_scores: { A: 0, B: 0, C: 0, D: 0 },
      profile_labels,
      profile_totals,
      profile_percentages,
      top_freq: topFreq,
      top_profile_code,
      top_profile_name,
      version: "portal-v1",
    },
  });
}
