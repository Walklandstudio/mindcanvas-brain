// apps/web/app/api/public/test/[token]/result/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const AB_VALUES = ["A", "B", "C", "D"] as const;
type AB = (typeof AB_VALUES)[number];
type TotalsAB = Partial<Record<AB, number>>;

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Use service role on the server if available; else anon
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function toPercentages(t: TotalsAB): Record<AB, number> {
  const sum = AB_VALUES.reduce(
    (acc, k) => acc + Number(t?.[k] ?? 0),
    0
  );
  const out = {} as Record<AB, number>;
  for (const k of AB_VALUES) {
    const v = Number(t?.[k] ?? 0);
    out[k] = sum > 0 ? v / sum : 0;
  }
  return out;
}
function sumAB(t: TotalsAB) {
  return AB_VALUES.reduce(
    (acc, k) => acc + Number(t?.[k] ?? 0),
    0
  );
}
function normalizeFreqTotals(input: any): TotalsAB {
  if (!input || typeof input !== "object")
    return { A: 0, B: 0, C: 0, D: 0 };
  const t =
    input.frequencies && typeof input.frequencies === "object"
      ? input.frequencies
      : input;
  return {
    A: Number(t?.A ?? 0),
    B: Number(t?.B ?? 0),
    C: Number(t?.C ?? 0),
    D: Number(t?.D ?? 0),
  };
}
function normalizeProfileTotals(
  input: any
): Record<string, number> {
  if (!input || typeof input !== "object") return {};
  if (input.profiles && typeof input.profiles === "object") {
    return Object.fromEntries(
      Object.entries(input.profiles).map(([k, v]) => [
        k,
        Number((v as any) || 0),
      ])
    );
  }
  return {};
}
function zeroTotals(
  freq: TotalsAB,
  prof: Record<string, number>
) {
  const sf = sumAB(freq);
  const sp = Object.values(prof).reduce(
    (a, b) => a + Number(b || 0),
    0
  );
  return sf === 0 && sp === 0;
}

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  const url = new URL(req.url);
  const token = params.token;
  const tid = url.searchParams.get("tid");

  if (!token)
    return NextResponse.json(
      { ok: false, error: "Missing token" },
      { status: 400 }
    );
  if (!tid)
    return NextResponse.json(
      { ok: false, error: "Missing taker id (?tid=)" },
      { status: 400 }
    );

  const sb = supa();

  // 1) link -> test_id
  const link = await sb
    .from("test_links")
    .select("test_id")
    .eq("token", token)
    .maybeSingle();
  if (link.error)
    return NextResponse.json(
      { ok: false, error: link.error.message },
      { status: 500 }
    );
  if (!link.data?.test_id)
    return NextResponse.json(
      { ok: false, error: "test not found for token" },
      { status: 404 }
    );
  const testId = link.data.test_id as string;

  // 1b) Fetch test + org so we can send org_slug / org_name / test_name
  let orgSlug: string | null = null;
  let orgName: string | null = null;
  let testName: string | null = null;

  const testRes = await sb
    .from("tests")
    .select("id, name, org_id")
    .eq("id", testId)
    .maybeSingle();
  if (testRes.error) {
    // Non-fatal; we still return scores
    console.warn(
      "[test result] error loading test metadata",
      testRes.error
    );
  } else if (testRes.data) {
    testName = (testRes.data as any).name ?? null;

    const orgId = (testRes.data as any).org_id as
      | string
      | null
      | undefined;
    if (orgId) {
      const orgRes = await sb
        .from("orgs")
        .select("id, slug, name")
        .eq("id", orgId)
        .maybeSingle();
      if (orgRes.error) {
        console.warn(
          "[test result] error loading org metadata",
          orgRes.error
        );
      } else if (orgRes.data) {
        orgSlug = (orgRes.data as any).slug ?? null;
        orgName = (orgRes.data as any).name ?? null;
      }
    }
  }

  // 1c) Fetch taker names for the report header
  let takerFirst: string | null = null;
  let takerLast: string | null = null;
  const takerRes = await sb
    .from("test_takers")
    .select("first_name, last_name")
    .eq("id", tid)
    .maybeSingle();
  if (takerRes.error) {
    console.warn(
      "[test result] error loading taker names",
      takerRes.error
    );
  } else if (takerRes.data) {
    takerFirst = (takerRes.data as any).first_name ?? null;
    takerLast = (takerRes.data as any).last_name ?? null;
  }

  // 2) Load totals (prefer results → latest submission) + harvest raw answers for recompute
  let rawTotals: any = null;
  let rawAnswers: Array<{ question_id: string; value: number }> =
    [];

  const r1 = await sb
    .from("test_results")
    .select("totals")
    .eq("taker_id", tid)
    .maybeSingle();
  rawTotals = r1.data?.totals ?? null;

  if (!rawTotals) {
    const r2 = await sb
      .from("test_submissions")
      .select("totals, raw_answers, answers_json")
      .eq("taker_id", tid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    rawTotals = r2.data?.totals ?? null;
    const ra = Array.isArray(r2.data?.raw_answers)
      ? r2.data?.raw_answers
      : Array.isArray(r2.data?.answers_json)
      ? r2.data?.answers_json
      : [];
    rawAnswers = ra
      .map((a: any) => ({
        question_id: String(a?.question_id ?? a?.id ?? ""),
        value: Number(
          a?.value ??
            a?.selected ??
            a?.selected_index ??
            a?.index ??
            0
        ),
      }))
      .filter((x) => x.question_id);
  }

  let frequencyTotals = normalizeFreqTotals(rawTotals);
  let profileTotals = normalizeProfileTotals(rawTotals);

  // 3) Labels for THIS test (no cross-fallbacks)
  const fl = await sb
    .from("test_frequency_labels")
    .select("frequency_code, frequency_name")
    .eq("test_id", testId);
  if (fl.error)
    return NextResponse.json(
      { ok: false, error: fl.error.message },
      { status: 500 }
    );
  if (!fl.data?.length)
    return NextResponse.json(
      {
        ok: false,
        error: "labels_missing_for_test_frequency",
      },
      { status: 500 }
    );

  const frequencyLabels = AB_VALUES.map((c) => ({
    code: c,
    name:
      fl.data.find(
        (r: any) =>
          String(r.frequency_code).toUpperCase() === c
      )?.frequency_name || `Frequency ${c}`,
  }));

  const pl = await sb
    .from("test_profile_labels")
    .select("profile_code, profile_name, frequency_code")
    .eq("test_id", testId);
  if (pl.error)
    return NextResponse.json(
      { ok: false, error: pl.error.message },
      { status: 500 }
    );
  if (!pl.data?.length)
    return NextResponse.json(
      {
        ok: false,
        error: "labels_missing_for_test_profile",
      },
      { status: 500 }
    );

  const profileLabels = pl.data.map((r: any) => ({
    code: String(r.profile_code || "").trim(),
    name: String(r.profile_name || "").trim(),
    frequency: String(r.frequency_code || "")
      .trim()
      .toUpperCase() as AB | null,
  }));

  // 4) Recompute if needed (zero totals + we have answers)
  if (zeroTotals(frequencyTotals, profileTotals) &&
      rawAnswers.length > 0) {
    const nameToCode = new Map<string, string>();
    const codeToFreq = new Map<string, AB>();
    for (const p of profileLabels) {
      if (p.name && p.code) nameToCode.set(p.name, p.code);
      if (p.code && p.frequency) codeToFreq.set(p.code, p.frequency);
    }

    const qs = await sb
      .from("test_questions")
      .select("id, profile_map")
      .eq("test_id", testId);
    if (qs.error)
      return NextResponse.json(
        { ok: false, error: qs.error.message },
        { status: 500 }
      );

    const mapByQ = new Map<
      string,
      Array<{ profile: string; points: number }>
    >();
    for (const r of qs.data || []) {
      const a = Array.isArray((r as any).profile_map)
        ? (r as any).profile_map
        : [];
      mapByQ.set(
        r.id,
        a.map((x: any) => ({
          profile: String(x?.profile ?? "").trim(),
          points: Number(x?.points ?? 0),
        }))
      );
    }

    const freqTotals: TotalsAB = { A: 0, B: 0, C: 0, D: 0 };
    const profTotals: Record<string, number> = {};

    for (const { question_id, value } of rawAnswers) {
      const map = mapByQ.get(question_id);
      if (!map || map.length === 0) continue;
      const idx =
        Math.max(1, Math.min(Number(value) || 0, map.length)) - 1;
      const entry = map[idx];
      if (!entry) continue;

      let pcode = entry.profile;
      if (pcode && !/^P(?:ROFILE)?[_\s-]?\d+$/i.test(pcode)) {
        const byName = nameToCode.get(pcode);
        if (byName) pcode = byName;
      }
      if (!pcode) continue;

      const pts = Number(entry.points || 0);
      profTotals[pcode] = (profTotals[pcode] || 0) + pts;

      const f = codeToFreq.get(pcode);
      if (f)
        freqTotals[f] =
          Number(freqTotals[f] || 0) + pts;
    }

    frequencyTotals = {
      A: Number(freqTotals.A || 0),
      B: Number(freqTotals.B || 0),
      C: Number(freqTotals.C || 0),
      D: Number(freqTotals.D || 0),
    };
    profileTotals = profTotals;

    // Persist nested totals for fast subsequent loads
    await sb
      .from("test_results")
      .upsert(
        {
          taker_id: tid,
          totals: {
            frequencies: frequencyTotals,
            profiles: profileTotals,
          },
        },
        { onConflict: "taker_id" }
      );
  }

  // 5) Build response with percentages
  const freqPct = toPercentages(frequencyTotals);
  const pSum = Object.values(profileTotals).reduce(
    (a, b) => a + Number(b || 0),
    0
  );
  const profilePercentages: Record<string, number> = {};
  if (pSum > 0)
    for (const [k, v] of Object.entries(profileTotals))
      profilePercentages[k] = Number(v || 0) / pSum;

  const topFreq =
    (Object.entries(frequencyTotals).sort(
      (a, b) => Number(b[1] || 0) - Number(a[1] || 0)
    )[0]?.[0] as AB) || "A";
  const topProfileCode =
    Object.entries(profileTotals).sort(
      (a, b) => Number(b[1] || 0) - Number(a[1] || 0)
    )[0]?.[0] ||
    profileLabels[0]?.code ||
    "PROFILE_1";
  const topProfileName =
    profileLabels.find((p) => p.code === topProfileCode)
      ?.name ||
    profileLabels[0]?.name ||
    "Top Profile";

  return NextResponse.json({
    ok: true,
    data: {
      // NEW: org + test metadata for the report page
      org_slug: orgSlug,
      org_name: orgName,
      test_name: testName,

      // NEW: taker names for the header
      taker: {
        id: tid,
        first_name: takerFirst,
        last_name: takerLast,
      },

      frequency_labels: frequencyLabels,
      frequency_totals: {
        A: Number(frequencyTotals.A || 0),
        B: Number(frequencyTotals.B || 0),
        C: Number(frequencyTotals.C || 0),
        D: Number(frequencyTotals.D || 0),
      },
      frequency_percentages: {
        A: Number(freqPct.A || 0),
        B: Number(freqPct.B || 0),
        C: Number(freqPct.C || 0),
        D: Number(freqPct.D || 0),
      },

      profile_labels: profileLabels.map((p) => ({
        code: p.code,
        name: p.name,
      })),
      profile_totals: profileTotals,
      profile_percentages: profilePercentages,

      top_freq: topFreq,
      top_profile_code: topProfileCode,
      top_profile_name: topProfileName,
      version: "portal-v1",
    },
  });
}

