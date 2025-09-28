import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type SubmissionRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type ResultRow = {
  submission_id: string;
  profile_code: string | null;
  flow_a: number | null;
  flow_b: number | null;
  flow_c: number | null;
  flow_d: number | null;
};

type ClientListItem = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  profile_code: string | null;
  flow_a: number;
  flow_b: number;
  flow_c: number;
  flow_d: number;
};

export async function GET() {
  // Submissions
  const subsRes = await supabaseAdmin
    .from('mc_submissions')
    .select('id, created_at, name, email, phone')
    .order('created_at', { ascending: false });

  if (subsRes.error) {
    return NextResponse.json({ error: subsRes.error.message }, { status: 500 });
  }

  const subs = (subsRes.data ?? []) as SubmissionRow[];
  const ids = subs.map((s) => s.id);

  // Results (optional)
  const resRes = await supabaseAdmin
    .from('mc_results')
    .select('submission_id, profile_code, flow_a, flow_b, flow_c, flow_d')
    .in('submission_id', ids);

  if (resRes.error) {
    return NextResponse.json({ error: resRes.error.message }, { status: 500 });
  }

  const results = (resRes.data ?? []) as ResultRow[];
  const byId = new Map<string, ResultRow>();
  for (const r of results) byId.set(r.submission_id, r);

  const out: ClientListItem[] = subs.map((s) => {
    const r = byId.get(s.id);
    return {
      id: s.id,
      created_at: s.created_at,
      name: s.name ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      profile_code: r?.profile_code ?? null,
      flow_a: r?.flow_a ?? 0,
      flow_b: r?.flow_b ?? 0,
      flow_c: r?.flow_c ?? 0,
      flow_d: r?.flow_d ?? 0,
    };
  });

  return NextResponse.json(out);
}
