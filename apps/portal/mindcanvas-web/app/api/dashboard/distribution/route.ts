// app/api/dashboard/distribution/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type FlowLabel = 'Catalyst'|'Communications'|'Rhythmic'|'Observer';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key, { auth: { persistSession: false } });

export async function GET() {
  const { data, error } = await supabase
    .from('mc_submissions')
    .select('full_frequency')
    .not('full_frequency', 'is', null)
    .limit(2000);
  if (error) return NextResponse.json([], { status: 200 });

  const counts: Record<FlowLabel, number> = {
    Catalyst: 0, Communications: 0, Rhythmic: 0, Observer: 0
  };
  for (const r of data ?? []) {
    const f = r.full_frequency as FlowLabel | null;
    if (f && f in counts) counts[f] += 1;
  }
  return NextResponse.json(
    (Object.keys(counts) as FlowLabel[]).map(flow => ({ flow, count: counts[flow] })),
    { status: 200 }
  );
}

