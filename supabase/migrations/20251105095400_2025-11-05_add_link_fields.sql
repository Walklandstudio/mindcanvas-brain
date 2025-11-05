do $$
declare
  sch text;
begin
  -- Detect which schema has the test_links table
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'portal' and table_name = 'test_links'
  ) then
    sch := 'portal';
  elsif exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'test_links'
  ) then
    sch := 'public';
  else
    raise exception 'test_links table not found in portal or public schema';
  end if;

  -- Add columns
  execute format($f$
    alter table %I.test_links
      add column if not exists name text,
      add column if not exists reason text,
      add column if not exists send_report boolean default false,
      add column if not exists show_results boolean default true
  $f$, sch);

  -- Optional index for searching by name
  execute format($f$
    create index if not exists idx_test_links_name on %I.test_links(name)
  $f$, sch);

  -- Helpful comments
  execute format($f$ comment on column %I.test_links.name is %L $f$, sch, 'Admin-facing name of the generated link');
  execute format($f$ comment on column %I.test_links.reason is %L $f$, sch, 'Optional free text reason for link generation');
  execute format($f$ comment on column %I.test_links.send_report is %L $f$, sch, 'Whether to email report to test taker after completion');
  execute format($f$ comment on column %I.test_links.show_results is %L $f$, sch, 'Whether taker sees their results page immediately');
end $$;
