// app/api/admin/debug/route.ts
import { NextResponse } from 'next/server';

/**
 * Minimal debug endpoint to confirm server env wiring.
 * Valid route exports are HTTP methods (GET, POST, etc.) and a small set of config fields.
 * We ONLY export GET here.
 */
export async function GET() {
  const hasToken = Boolean(process.env.ADMIN_DASH_TOKEN);
  return NextResponse.json({
    ok: true,
    env: { ADMIN_DASH_TOKEN_present: hasToken },
    note:
      'If ADMIN_DASH_TOKEN_present is false, set it in Vercel → Project → Settings → Environment Variables and redeploy.',
  });
}
