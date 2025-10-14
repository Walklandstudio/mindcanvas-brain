// apps/portal/lib/profileImages.ts
// Centralized titles + image paths for profile keys used in reports/portal UI.

import type { ProfileKey } from "./profileContent";

/** Human-readable titles for each profile key (keep in sync with profileContent). */
export const PROFILE_TITLES: Record<ProfileKey, string> = {
  P1: "Visionary",
  P2: "Spark",
  P3: "Anchor",
  P4: "Architect",
  P5: "Navigator",
  P6: "Producer",
  P7: "Connector",
  P8: "Analyst",
};

/**
 * Public image paths for each profile key.
 * These point to files under /public/images/profiles/*.png.
 * If you don't have actual assets yet, leave these as-is; Next.js will compile,
 * and the images will simply 404 at runtime until you add them.
 */
export const PROFILE_IMAGES: Record<ProfileKey, string> = {
  P1: "/images/profiles/P1.png",
  P2: "/images/profiles/P2.png",
  P3: "/images/profiles/P3.png",
  P4: "/images/profiles/P4.png",
  P5: "/images/profiles/P5.png",
  P6: "/images/profiles/P6.png",
  P7: "/images/profiles/P7.png",
  P8: "/images/profiles/P8.png",
};

export type { ProfileKey };
