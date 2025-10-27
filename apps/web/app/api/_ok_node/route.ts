// apps/web/app/api/__ok_node/route.ts  (NODE)
export const runtime = 'nodejs';
export async function GET() {
  return new Response('node-ok', { headers: { 'content-type': 'text/plain' } });
}
