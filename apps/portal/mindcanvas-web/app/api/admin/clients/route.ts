import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Person = { name: string | null; email: string | null; phone: string | null };
type Result = { profile_code: string | null; flow_a: number | null; flow_b: number | null; flow_c: number | null; flow_d: number | null };

type RowWire = {
  id: string;
  created_at: string;
  person: Person | Person[] | null;
  result: Result | Result[] | null;
};

type Item = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  profile_code: string | null;
  flow: { A: number; B: number; C: number; D: number } | null;
};

function pickFirst<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function GET(_req: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from('mc_submissions')
    .select(`
      id, created_at,
      person:mc_people(name,email,phone),
      result:mc_results(profile_code, flow_a, flow_b, flow_c, flow_d)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }

  const rows: RowWire[] = (data ?? []) as RowWire[];

  const items: Item[] = rows.map((r) => {
    const person = pickFirst<Person>(r.person);
    const result = pickFirst<Result>(r.result);

    return {
      id: r.id,
      created_at: r.created_at,
      name: person?.name ?? null,
      email: person?.email ?? null,
      phone: person?.phone ?? null,
      profile_code: result?.profile_code ?? null,
      flow: result
        ? {
            A: Number(result.flow_a ?? 0),
            B: Number(result.flow_b ?? 0),
            C: Number(result.flow_c ?? 0),
            D: Number(result.flow_d ?? 0),
          }
        : null,
    };
  });

  return NextResponse.json({ items });
}
