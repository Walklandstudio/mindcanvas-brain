export const runtime = 'edge';
export function GET() {
  return new Response('edge-ok', { headers: { 'content-type': 'text/plain' } });
}
