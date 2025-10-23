// apps/web/app/api/admin/tests/seed-if-empty/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/app/_lib/portal';

export const dynamic = 'force-dynamic';

function defaultForSlug(slug: string) {
  if (slug === 'team-puzzle') {
    return { name: 'Team Puzzle Profile', slug: 'team-puzzle-profile' };
  }
  if (slug === 'competency-coach') {
    return { name: 'Competency Coach Profile', slug: 'competency-coach-profile' };
  }
  // generic fallback
  return { name: 'Org Test', slug: `${slug}-profile` };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgSlug = (url.searchParams.get('org') || '').trim();

    if (!orgSlug) {
      return NextResponse.json(
        { error: "Missing ?org=team-puzzle|competency-coach" },
        { status: 400 },
      );
    }

    const sb = await getAdminClient();

    // Resolve org
    const { data: org, error: orgErr } = await sb
      .from('organizations')
      .select('id, slug, name')
      .eq('slug', orgSlug)
      .maybeSingle();

    if (orgErr || !org) {
      return NextResponse.json(
        { error: `Org not found for slug "${orgSlug}"` },
        { status: 404 },
      );
    }

    // Count current tests
    const { count } = await sb
      .from('org_tests')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id);

    if ((count ?? 0) > 0) {
      return NextResponse.json({
        ok: true,
        seeded: false,
        reason: 'Tests already exist for this org',
        org: { id: org.id, slug: org.slug, name: org.name },
        count,
      });
    }

    // Create a default test for this org
    const def = defaultForSlug(org.slug);
    const { data: inserted, error: insErr } = await sb
      .from('org_tests')
      .insert([
        {
          org_id: org.id,
          name: def.name,
          slug: def.slug,
          mode: 'full',
          status: 'active',
        },
      ])
      .select('id, name, slug')
      .limit(1);

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      seeded: true,
      org: { id: org.id, slug: org.slug, name: org.name },
      test: inserted?.[0] ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
