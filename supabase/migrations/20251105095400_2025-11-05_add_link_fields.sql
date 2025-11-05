do $$
begin
  -- If portal.test_links exists, add fields there
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'portal' and table_name = 'test_links'
  ) then
    execute $f$
      alter table portal.test_links
        add column if not exists name text,
        add column if not exists reason text,
        add column if not exists send_report boolean default false,
        add column if not exists show_results boolean default true;
      create index if not exists idx_portal_test_links_name on portal.test_links(name);
      comment on column portal.test_links.name is 'Admin-facing name of the generated link';
      comment on column portal.test_links.reason is 'Optional free text reason for link generation';
      comment on column portal.test_links.send_report is 'Whether to email report to test taker after completion';
      comment on column portal.test_links.show_results is 'Whether taker sees their results page immediately';
    $f$;
  end if;

  -- If public.test_links exists, add the same fields there too
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'test_links'
  ) then
    execute $f$
      alter table public.test_links
        add column if not exists name text,
        add column if not exists reason text,
        add column if not exists send_report boolean default false,
        add column if not exists show_results boolean default true;
      create index if not exists idx_public_test_links_name on public.test_links(name);
      comment on column public.test_links.name is 'Admin-facing name of the generated link';
      comment on column public.test_links.reason is 'Optional free text reason for link generation';
      comment on column public.test_links.send_report is 'Whether to email report to test taker after completion';
      comment on column public.test_links.show_results is 'Whether taker sees their results page immediately';
    $f$;
  end if;
end $$;
