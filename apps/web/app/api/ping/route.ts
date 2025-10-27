export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasRole = !!process.env.SUPABASE_SERVICE_ROLE;
  return Response.json({ ok: hasUrl && hasRole, hasUrl, hasRole });
}
