export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { token: string } }) {
  return new Response(JSON.stringify({ ok: true, method: 'GET', token: params.token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
