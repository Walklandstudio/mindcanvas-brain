export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return new Response(JSON.stringify({ ok: true, layer: 'app-api' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
