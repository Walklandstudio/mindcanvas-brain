// lib/routeParams.ts

/**
 * Helpers for reading dynamic route params from `Request.url`
 * in Next.js 15 route handlers (avoids the typed 2nd arg).
 *
 * Examples:
 *   const id = extractParamFromUrl(req.url, "submissions"); // /api/submissions/[id]/...
 *   const slug = extractParamFromUrl(req.url, "tests");     // /api/tests/[slug]
 */

export function extractParamFromUrl(u: string, segment: string): string {
  try {
    const { pathname } = new URL(u);
    const parts = pathname.split("/").filter(Boolean); // e.g. ["api","submissions","123","finish"]
    const idx = parts.indexOf(segment);
    return idx >= 0 && idx + 1 < parts.length
      ? decodeURIComponent(parts[idx + 1])
      : "";
  } catch {
    return "";
  }
}

/** Convenience aliases used around the codebase */
export const extractIdFromUrl = (u: string) => extractParamFromUrl(u, "submissions");
export const extractSlugFromUrl = (u: string) => extractParamFromUrl(u, "tests");

/**
 * Grab multiple params at once, e.g.:
 *   const { submissionId, testSlug } =
 *     extractParams(req.url, { submissionId: "submissions", testSlug: "tests" });
 */
export function extractParams(
  u: string,
  mapping: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, seg] of Object.entries(mapping)) {
    out[key] = extractParamFromUrl(u, seg);
  }
  return out;
}
