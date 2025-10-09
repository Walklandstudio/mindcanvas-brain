import { NextResponse } from 'next/server';
import { SCORING } from '../_lib/scoring';

// You already have helpers similar to these in your codebase.
// If names differ, swap them to your actual implementations.
import { admin, orgIdFromAuth } from '../../_lib/org';

export const runtime = 'nodejs';

type Answer = { order: number | string; choice: number | string };
type Totals = {
  frequency: Record<'A'|'B'|'C'|'D', number>;
  profile: Record<1|2|3|4|5|6|7|8, number>;
};

function entriesOf<T extends Record<PropertyKey, number>>(obj: T) {
  return (Object.keys(obj) as Array<keyof T>).map(k => [k, obj[k]] as [keyof T, number]);
}

function score(answers: Answer[]) {
  const freqTotals: Totals['frequency'] = { A: 0, B: 0, C: 0, D: 0 };
  const profileTotals: Totals['profile'] = { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0 };

  for (const raw of answers) {
    const order = Number(raw.order);
    const choice = Number(raw.choice);
    if (!Number.isFinite(order) || order < 1 || order > 15) continue;
    if (!Number.isFinite(choice) || choice < 1 || choice > 4) continue;

    const map = SCORING[order as keyof typeof SCORING];
    if (!map) continue;

    const entry = map[choice - 1];
    if (!entry) continue;

    freqTotals[entry.freq] += entry.points;
    profileTotals[entry.profile] += entry.points;
  }

  const orderFreq = ['A','B','C','D'] as const;
  const bestFrequency = entriesOf(freqTotals).sort((x,y) => y[1]-x[1] || orderFreq.indexOf(x[0] as any) - orderFreq.indexOf(y[0] as any))[0][0];
  const bestProfile = Number(entriesOf(profileTotals).sort((x,y) => y[1]-x[1] || Number(x[0]) - Number(y[0]))[0][0]);

  return { totals: { frequency: freqTotals, profile: profileTotals }, bestFrequency, bestProfile };
}

function makeToken(len = 22) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) {
      return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
    }
    const orgId = await orgIdFromAuth(auth);
    if (!orgId) return NextResponse.json({ ok:false, error:'no_org' }, { status:401 });

    const payload = await req.json().catch(() => null) as null | {
      taker?: { email?: string; name?: string };
      answers: Answer[];
    };
    if (!payload?.answers?.length) {
      return NextResponse.json({ ok:false, error:'invalid_payload' }, { status:400 });
    }

    const { totals, bestFrequency, bestProfile } = score(payload.answers);

    const token = makeToken();

    const a = admin();
    // Save result
    const { data: resultRow, error: insertErr } = await a.from('test_results')
      .insert({
        org_id: orgId,
        token,
        taker_email: payload.taker?.email ?? null,
        taker_name: payload.taker?.name ?? null,
        totals,
        best_frequency: bestFrequency,
        best_profile: bestProfile
      })
      .select('id, token')
      .single();

    if (insertErr) throw insertErr;

    // Save answers
    const answerRows = payload.answers.map(ans => ({
      result_id: resultRow.id,
      question_order: Number(ans.order),
      choice: Number(ans.choice),
    })).filter(r => Number.isFinite(r.question_order) && Number.isFinite(r.choice));

    const { error: answersErr } = await a.from('test_answers').insert(answerRows);
    if (answersErr) throw answersErr;

    return NextResponse.json({
      ok: true,
      token: resultRow.token,
      result: {
        totals,
        frequency: bestFrequency,
        profile: bestProfile
      }
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: String(e?.message ?? e) }, { status:500 });
  }
}

