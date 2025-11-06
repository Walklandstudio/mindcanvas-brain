create or replace function portal.fn_get_dashboard_data(
  p_org_slug text,
  p_test_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = portal, public
as $$
declare
  result jsonb;
begin
  select metrics
  into result
  from portal.v_dashboard_consolidated
  where org_slug = p_org_slug
  and (p_test_id is null or test_id = p_test_id)
  limit 1;

  return coalesce(result, '{}'::jsonb);
end;
$$;

comment on function portal.fn_get_dashboard_data is
'Returns consolidated dashboard metrics for an org (and optional test_id).';
