// apps/web/app/api/portal-dashboard/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Don't throw during build; return a clear runtime error instead.
  // This keeps current flows safe.
  console.warn('[portal-dashboard] Missing Supabase env vars');
}

type DashboardPayload = {
  frequencies: Array<{ key: string; value: number }>;
  profiles: Array<{ key: string; value: number }>;
  top3: Array<{ key: string; value: number }>;
  bottom3: Array<{ key: string; value: number }>;
  overall?: { average?: number; count?: number };
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const org = url.searchParams.get('org')?.trim();
    const testId = url.searchParams.get('testId')?.trim() || null;

    if (!org) {
      return NextResponse.json(
        { ok: false, error: 'Missing ?org=slug' },
        { status: 400 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: missing Supabase env' },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Call your RPC. It should accept p_org_slug and optional p_test_id
    const { data, error } = await supabase.rpc('fn_get_dashboard_data', {
      p_org_slug: org,
      p_test_id: testId,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: `RPC error: ${error.message}` },
        { status: 500 }
      );
    }

    // Expecting your RPC to already return a compact structure.
    // If not, map it here into the DashboardPayload shape.
    const payload = (data ?? {}) as DashboardPayload;

    return NextResponse.json({ ok: true, org, testId, data: payload }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
