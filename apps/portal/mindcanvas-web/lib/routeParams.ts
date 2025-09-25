// mindcanvas-web/lib/routeParams.ts
export function extractParamFromUrl(u: string, segment: string): string {
  const parts = new URL(u).pathname.split("/");
  const i = parts.indexOf(segment);
  return i >= 0 ? parts[i + 1] ?? "" : "";
}
