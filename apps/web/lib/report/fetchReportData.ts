import { createClient } from '@supabase/supabase-js';

export async function fetchReportData({ orgSlug, takerId }:{ orgSlug: string; takerId: string }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const { data: org } = await supabase.from('portal.orgs').select('*').eq('slug', orgSlug).maybeSingle();
  const { data: taker } = await supabase.from('portal.test_takers').select('*').eq('id', takerId).maybeSingle();
  const { data: results } = await supabase.from('portal.test_results')
    .select('frequency_a,frequency_b,frequency_c,frequency_d,top_profile_code,top_profile_name,top_profile_desc')
    .eq('taker_id', takerId).maybeSingle();

  return { org, taker, results };
}
