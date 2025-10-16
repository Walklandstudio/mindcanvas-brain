export const runtime = "nodejs"; // same runtime as your pages
export async function GET() {
  return new Response("pong");
}
