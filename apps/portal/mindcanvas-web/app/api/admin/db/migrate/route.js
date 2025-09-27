// app/api/admin/db/migrate/route.js
import 'server-only';
import { NextResponse } from 'next/server';
import pkg from 'pg';

export const runtime = 'nodejs';         // required for 'pg'
export const dynamic = 'force-dynamic';  // do not cache this route

const { Client } = pkg;

// your admin area is already gated by middleware; this is an extra guard
function hasAdminCookie(req) {
  return Boolean(req.cookies.get('admin_token')?.value);
}

const SQL = `
begin;

-- ---------- mc_questions hardening ----------
alter table mc_questions
  add column if not exists is_base boolean not null default false,
  add column if not exists scoring_mode text not null default 'scored',  -- 'scored' | 'info'
  add column if not exists order_index integer not null default 0;

-- ---------- mc_options hardening ----------
alter table mc_options
  add column if not exists profile_code text,          -- 'P1'..'P8'
  add column if not exists flow text,                  -- 'Catalyst' | 'Communications' | 'Rhythmic' | 'Observer'
  add column if not exists order_index integer not null default 0;

-- ---------- helpful indexes ----------
create index if not exists mc_questions_test_order_idx on mc_questions(test_id, order_index);
create index if not exists mc_options_q_order_idx     on mc_options(question_id, order_index);

-- ---------- guard: block deletes of base questions ----------
create or replace function fn_prevent_delete_base_q()
returns trigger
language plpgsql
as $$
begin
  if old.is_base is true then
    raise exception 'Cannot delete base questions';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_delete_base_q on mc_questions;
create trigger trg_prevent_delete_base_q
before delete on mc_questions
for each row execute function fn_prevent_delete_base_q();

commit;
`;

export async function POST(req) {
  if (!hasAdminCookie(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connStr = process.env.SUPABASE_DB_URL; // postgresql://postgres:*****@db.<ref>.supabase.co:5432/postgres
  if (!connStr) {
    return NextResponse.json(
      { error: 'Server misconfiguration: SUPABASE_DB_URL not set' },
      { status: 500 }
    );
  }

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(SQL);
    return NextResponse.json(
      { ok: true, ran: 'questions/options DDL migration' },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    try { await client.end(); } catch {}
  }
}
