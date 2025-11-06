// app/api/portal-dashboard/route.ts
export async function GET() {
    return new Response(JSON.stringify({ ok: true, ping: 'pong' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  
