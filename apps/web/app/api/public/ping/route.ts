// app/api/public/ping/route.ts
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({
    ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE,
  });
}
