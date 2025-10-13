// app/api/submissions/[id]/result/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ProfileCode = 'P1'|'P2'|'P3'|'P4'|'P5'|'P6'|'P7'|'P8';
type FlowLabel = 'Catalyst'|'Communications'|'Rhythmic'|'Observer';

interface ScoresJson {
  profiles: Record<ProfileCode, number>;
  flows: Record<FlowLabel, number>;
  total: number;
  winner: { profileCode: ProfileCode; flow: FlowLabel };
  percentages: {
    profiles: Record<ProfileCode, number>;
    flows: Record<FlowLabel, number>;
  };
}

interface SubmissionRow {
  id: string;
  scores_json: ScoresJson | null;
  total_score: number | null;
  full_profile_code: ProfileCode | null;
  full_frequency: FlowLabel | null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // Fetch the submission
  const { data, error } = await supabase
    .from('mc_submissions')
    .select('id, scores_json, total_score, full_profile_code, full_frequency')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load submission', details: error.message },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const row = data as unknown as SubmissionRow;

  if (!row.scores_json) {
    // Not finished yet
    return NextResponse.json(
      {
        submissionId: row.id,
        result: null,
        message: 'No computed result yet. Finish the test to generate results.',
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      submissionId: row.id,
      result: row.scores_json,
    },
    { status: 200 }
  );
}
