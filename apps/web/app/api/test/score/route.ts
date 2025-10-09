import { NextResponse } from 'next/server';
import { SCORING } from '../_lib/scoring';

export const runtime = 'nodejs';

type Answer = { order: number | string; choice: 1|2|3|4 | string };

// small typed helper so entries aren’t `[string, number][]`
function entriesOf<T extends Record<PropertyKey, number>>(obj: T) {
  return (Object.keys(obj) as Array<keyof T>)
    .map((k) => [k, obj[k]] as [keyof T, number]);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as null | { answers: Answer[] };
    if (!body?.answers?.length) {
      return NextResponse.json({ ok:false, error:'invalid_payload' }, { status:400 });
    }

    // Totals
    const freqTotals: Record<'A'|'B'|'C'|'D', number> = { A:0, B:0, C:0, D:0 };
    const profileTotals: Record<1|2|3|4|5|6|7|8, number> =
      { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0 };

    for (const a of body.answers) {
      const order = Number(a.order);
      const choice = Number(a.choice) as 1|2|3|4;

      if (!Number.isFinite(order) || order < 1 || order > 15) continue;
      if (!Number.isFinite(choice) || choice < 1 || choice > 4) continue;

      const map = SCORING[order as keyof typeof SCORING];
      if (!map) continue;

      const entry = map[choice - 1];
      if (!entry) continue;

      freqTotals[entry.freq] += entry.points;
      profileTotals[entry.profile] += entry.points;
    }

    // Determine bests
    const orderFreq = ['A','B','C','D'] as const;

    const bestFreq = entriesOf(freqTotals)
      .sort((x, y) => y[1] - x[1] || orderFreq.indexOf(x[0] as any) - orderFreq.indexOf(y[0] as any))[0][0];

    const bestProfile = entriesOf(profileTotals)
      .sort((x, y) => y[1] - x[1] || Number(x[0]) - Number(y[0]))[0][0];

    return NextResponse.json({
      ok: true,
      totals: {
        frequency: freqTotals,
        profile: profileTotals
      },
      result: {
        frequency: bestFreq,
        profile: Number(bestProfile)
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:String(e?.message ?? e) }, { status:500 });
  }
}
