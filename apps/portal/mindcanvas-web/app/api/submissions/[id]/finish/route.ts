// app/api/submissions/[id]/finish/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ProfileCode = 'P1'|'P2'|'P3'|'P4'|'P5'|'P6'|'P7'|'P8';
type FlowLabel = 'Catalyst'|'Communications'|'Rhythmic'|'Observer';

const ALL_PROFILES: ProfileCode[] = ['P1','P2','P3','P4','P5','P6','P7','P8'];
const ALL_FLOWS: FlowLabel[] = ['Catalyst','Communications','Rhythmic','Observer'];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

interface OptionRow {
  id: string;
  points: number | null;
  profile_code: ProfileCode | null;
  flow: FlowLabel | null;
}

interface AnswerRow {
  id: string;
  question_id: string;
  option_id: string | null;
  value: unknown;
  mc_options: OptionRow | null;
}

interface Quals {
  q16?: unknown;
  q17?: unknown;
  q18?: unknown;
  q19?: unknown;
  q20?: unknown;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function zeroProfileMap(): Record<ProfileCode, number> {
  return ALL_PROFILES.reduce((acc, code) => {
    acc[code] = 0;
    return acc;
  }, {} as Record<ProfileCode, number>);
}

function zeroFlowMap(): Record<FlowLabel, number> {
  return ALL_FLOWS.reduce((acc, f) => {
    acc[f] = 0;
    return acc;
  }, {} as Record<FlowLabel, number>);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: submissionId } = await ctx.params;
    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submission id' }, { status: 400 });
    }

    // Optional quals in body (tolerate empty/invalid JSON)
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      rawBody = undefined;
    }

    const quals: Partial<Quals> = isRecord(rawBody)
      ? {
          q16: rawBody.q16,
          q17: rawBody.q17,
          q18: rawBody.q18,
          q19: rawBody.q19,
          q20: rawBody.q20,
        }
      : {};

    // 1) Fetch answers joined to options (points, profile_code, flow)
    const { data: answersData, error: answersErr } = await supabase
      .from('mc_answers')
      .select(`
        id,
        question_id,
        option_id,
        value,
        mc_options (
          id,
          points,
          profile_code,
          flow
        )
      `)
      .eq('submission_id', submissionId);

    if (answersErr) {
      return NextResponse.json(
        { error: 'Failed to fetch answers', details: answersErr.message },
        { status: 500 }
      );
    }

    const answers: AnswerRow[] = (answersData ?? []) as unknown as AnswerRow[];

    // 2) Aggregate totals
    const profileTotals = zeroProfileMap();
    const flowTotals = zeroFlowMap();

    for (const a of answers) {
      const opt = a.mc_options;
      const points = (opt?.points ?? 0) as number;
      const pcode = (opt?.profile_code ?? undefined) as ProfileCode | undefined;
      const flow = (opt?.flow ?? undefined) as FlowLabel | undefined;

      if (pcode && ALL_PROFILES.includes(pcode)) {
        profileTotals[pcode] = profileTotals[pcode] + points;
      }
      if (flow && ALL_FLOWS.includes(flow)) {
        flowTotals[flow] = flowTotals[flow] + points;
      }
    }

    // 3) Winners
    const winnerProfile = ((): ProfileCode => {
      let best: ProfileCode = 'P1';
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const code of ALL_PROFILES) {
        const s = profileTotals[code];
        if (s > bestScore) {
          best = code;
          bestScore = s;
        }
      }
      return best;
    })();

    const winnerFlow = ((): FlowLabel => {
      let best: FlowLabel = 'Catalyst';
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const f of ALL_FLOWS) {
        const s = flowTotals[f];
        if (s > bestScore) {
          best = f;
          bestScore = s;
        }
      }
      return best;
    })();

    // 4) Totals & percentages
    const totalScore = ALL_PROFILES.reduce((acc, code) => acc + profileTotals[code], 0);
    const flowDenom = ALL_FLOWS.reduce((acc, f) => acc + flowTotals[f], 0);

    const scores_json = {
      profiles: profileTotals,
      flows: flowTotals,
      total: totalScore,
      winner: { profileCode: winnerProfile, flow: winnerFlow },
      percentages: {
        profiles: ALL_PROFILES.reduce((acc, code) => {
          const val = profileTotals[code];
          acc[code] = totalScore > 0 ? Math.round((val / totalScore) * 100) : 0;
          return acc;
        }, {} as Record<ProfileCode, number>),
        flows: ALL_FLOWS.reduce((acc, f) => {
          const val = flowTotals[f];
          acc[f] = flowDenom > 0 ? Math.round((val / flowDenom) * 100) : 0;
          return acc;
        }, {} as Record<FlowLabel, number>),
      },
    };

    // 5) Persist to mc_submissions
    const { error: upErr } = await supabase
      .from('mc_submissions')
      .update({
        scores_json,
        total_score: totalScore,
        full_profile_code: winnerProfile,
        full_frequency: winnerFlow,
        finished_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (upErr) {
      return NextResponse.json(
        { error: 'Failed to update submission', details: upErr.message },
        { status: 500 }
      );
    }

    // 6) Upsert quals if provided (non-fatal on error)
    const hasQuals = Object.values(quals).some((v) => typeof v !== 'undefined');
    if (hasQuals) {
      const qualRow: { submission_id: string } & Partial<Quals> = {
        submission_id: submissionId,
        ...quals,
      };
      const { error: qualErr } = await supabase
        .from('mc_qualifications')
        .upsert(qualRow, { onConflict: 'submission_id' });

      if (qualErr) {
        return NextResponse.json(
          {
            submissionId,
            result: scores_json,
            warning: 'Results saved, but qualifications upsert failed',
            details: qualErr.message,
          },
          { status: 207 }
        );
      }
    }

    return NextResponse.json({ submissionId, result: scores_json }, { status: 200 });
  } catch (err: unknown) {
    const message =
      typeof err === 'object' && err !== null && 'toString' in err
        ? String(err)
        : 'Unknown error';
    return NextResponse.json(
      { error: 'Unexpected error finishing submission', details: message },
      { status: 500 }
    );
  }
}

