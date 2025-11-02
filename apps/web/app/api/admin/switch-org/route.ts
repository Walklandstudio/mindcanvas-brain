// apps/web/app/api/admin/switch-org/route.ts
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'active_org_id';

export async function POST(req: Request) {
  try {
    // Accept either form POST (from <form>) or JSON POST
    const contentType = req.headers.get('content-type') || '';
    let orgId = '';
    let mode = 'switch';

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      orgId = String(body?.orgId || '').trim();
      mode = String(body?.mode || 'switch').trim();
    } else {
      const form = await req.formData();
      orgId = String(form.get('orgId') || '').trim();
      mode = String(form.get('mode') || 'switch').trim();
    }

    const url = new URL(req.url);
    const backTo = '/admin';

    if (mode === 'clear') {
      const res = NextResponse.redirect(new URL(backTo, req.url));
      res.cookies.set(COOKIE_NAME, '', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        maxAge: 0,
      });
      return res;
    }

    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'Missing orgId' }, { status: 400 });
    }

    // Set/overwrite the cookie and redirect back to /admin
    const res = NextResponse.redirect(new URL(backTo, req.url));
    res.cookies.set(COOKIE_NAME, orgId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      // Persist it for a while so session survives navigation
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// Optional convenience:
// GET /api/admin/switch-org?clear=1  → clears the cookie
export async function GET(req: Request) {
  const url = new URL(req.url);
  const shouldClear = url.searchParams.get('clear');
  const res = NextResponse.redirect(new URL('/admin', req.url));
  if (shouldClear) {
    res.cookies.set(COOKIE_NAME, '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 0,
    });
  }
  return res;
}
