// apps/web/app/api/public/test/[token]/report/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type TotalsMap = Partial<Record<"A" | "B" | "C" | "D", number>> &
  Partial<Record<`PROFILE_${1|2|3|4|5|6|7|8}`, number>>;

type FrequencyCode = "A" | "B" | "C" | "D";
type ProfileCode = `PROFILE_${1|2|3|4|5|6|7|8}`;

type FrequencyLabelRow = {
  test_id: string;
  frequency_code: FrequencyCode;
  frequency_name: string;
};

type ProfileLabelRow = {
  test_id: string;
  profile_code: ProfileCode;
  profile_name: string;
  frequency_code: FrequencyCode | null;
};

function safeNumber(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function toPercentages<TCode extends string>(
  totals: Partial<Record<TCode, number>>,
  codes: readonly TCode[],
  precision = 1
): Record<TCode, number> {
  const vals = codes.map((c) => safeNumber(totals[c]));
  const sum = vals.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    // Nothing scored—return 0s
    return Object.fromEntries(codes.map((c) => [c, 0])) as Record<TCode, number>;
  }
  return Object.fromEntries(
    codes.map((c) => {
      const pct = (safeNumber(totals[c]) / sum) * 100;
      const rounded =
        precision <= 0 ? Math.round(pct) : Number(pct.toFixed(precision));
      return [c, rounded];
    })
  ) as Record<TCode, number>;
}

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  const url = new URL(req.url);
  const takerIdParam = url.searchParams.get("tid")?.trim() || null;

  const sb = createClient().schema("portal");

  try {
    // 1) Resolve link by token (to get org_id & test_id)
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("id, org_id, test_id, token")
      .eq("token", params.token)
      .maybeSingle();

    if (linkErr) {
      return NextResponse.json(
        { ok: false, error: linkErr.message },
        { status: 500 }
      );
    }
    if (!link) {
      return NextResponse.json(
        { ok: false, error: "Invalid test link" },
        { status: 404 }
      );
    }

    // 2) Resolve taker
    let takerId = takerIdParam;
    if (!takerId) {
      // Latest taker for this link token
      const { data: recentTaker, error: takerErr } = await sb
        .from("test_takers")
        .select("id")
        .eq("link_token", link.token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (takerErr) {
        return NextResponse.json(
          { ok: false, error: takerErr.message },
          { status: 500 }
        );
      }
      takerId = recentTaker?.id ?? null;
    }

    if (!takerId) {
      return NextResponse.json(
        { ok: false, error: "No taker found for this link" },
        { status: 404 }
      );
    }

    // 3) Load submission (use whichever JSON column exists: totals_json or totals)
    //    Also select identity snapshot in case you want to render it client-side.
    const { data: sub, error: subErr } = await sb
      .from("test_submissions")
      .select(
        `
        id, taker_id, test_id, created_at,
        totals_json,
        totals,
        answers_json,
        first_name, last_name, email, company, role_title
      `
      )
      .eq("taker_id", takerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr) {
      return NextResponse.json(
        { ok: false, error: subErr.message },
        { status: 500 }
      );
    }
    if (!sub) {
      return NextResponse.json(
        { ok: false, error: "No submission found for this taker" },
        { status: 404 }
      );
    }

    // 4) Normalize totals map (support both `totals_json` and `totals`)
    const rawTotals: TotalsMap =
      (sub.totals_json as TotalsMap | null) ??
      (sub.totals as TotalsMap | null) ??
      {};

    // 5) Compute frequency and profile percentages
    const FREQ_CODES: readonly FrequencyCode[] = ["A", "B", "C", "D"] as const;
    const PROF_CODES: readonly ProfileCode[] = [
      "PROFILE_1",
      "PROFILE_2",
      "PROFILE_3",
      "PROFILE_4",
      "PROFILE_5",
      "PROFILE_6",
      "PROFILE_7",
      "PROFILE_8",
    ] as const;

    const freqPercents = toPercentages(rawTotals, FREQ_CODES, 0);
    const profPercents = toPercentages(rawTotals, PROF_CODES, 0);

    // 6) Pull labels
    const [{ data: freqLabels, error: flErr }, { data: profLabels, error: plErr }] =
      await Promise.all([
        sb
          .from("test_frequency_labels")
          .select("test_id, frequency_code, frequency_name")
          .eq("test_id", link.test_id),
        sb
          .from("test_profile_labels")
          .select("test_id, profile_code, profile_name, frequency_code")
          .eq("test_id", link.test_id),
      ]);

    if (flErr) {
      return NextResponse.json({ ok: false, error: flErr.message }, { status: 500 });
    }
    if (plErr) {
      return NextResponse.json({ ok: false, error: plErr.message }, { status: 500 });
    }

    const freqNameByCode = new Map<FrequencyCode, string>();
    (freqLabels ?? []).forEach((r: FrequencyLabelRow) => {
      freqNameByCode.set(r.frequency_code, r.frequency_name);
    });

    const profNameByCode = new Map<ProfileCode, string>();
    (profLabels ?? []).forEach((r: ProfileLabelRow) => {
      profNameByCode.set(r.profile_code, r.profile_name);
    });

    // 7) Build ranked arrays with names
    const freqRank = (FREQ_CODES.map((code) => [code, freqPercents[code]]) as Array<
      [FrequencyCode, number]
    >).sort((a, b) => b[1] - a[1]);

    const profRank = (PROF_CODES.map((code) => [code, profPercents[code]]) as Array<
      [ProfileCode, number]
    >).sort((a, b) => b[1] - a[1]);

    const topFreq = {
      code: freqRank[0]?.[0] ?? "A",
      percent: freqRank[0]?.[1] ?? 0,
      name: freqNameByCode.get(freqRank[0]?.[0] as FrequencyCode) ?? freqRank[0]?.[0] ?? "A",
    };

    const topProf = {
      code: profRank[0]?.[0] ?? "PROFILE_1",
      percent: profRank[0]?.[1] ?? 0,
      name:
        profNameByCode.get(profRank[0]?.[0] as ProfileCode) ??
        (profRank[0]?.[0] ?? "PROFILE_1"),
    };

    // 8) Shape response for the Result/Report page
    const response = {
      ok: true,
      data: {
        test_id: link.test_id as string,
        taker_id: sub.taker_id as string,
        submitted_at: sub.created_at as string,
        identity: {
          first_name: sub.first_name ?? null,
          last_name: sub.last_name ?? null,
          email: sub.email ?? null,
          company: sub.company ?? null,
          role_title: sub.role_title ?? null,
        },
        frequencies: {
          percents: freqPercents,
          labels: Object.fromEntries(
            FREQ_CODES.map((c) => [c, freqNameByCode.get(c) ?? c])
          ) as Record<FrequencyCode, string>,
          ranked: freqRank.map(([code, pct]) => ({
            code,
            name: freqNameByCode.get(code) ?? code,
            percent: pct,
          })),
          top: topFreq,
        },
        profiles: {
          percents: profPercents,
          labels: Object.fromEntries(
            PROF_CODES.map((c) => [c, profNameByCode.get(c) ?? c])
          ) as Record<ProfileCode, string>,
          ranked: profRank.map(([code, pct]) => ({
            code,
            name: profNameByCode.get(code) ?? code,
            percent: pct,
          })),
          top: topProf,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
