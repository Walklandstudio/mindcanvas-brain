// apps/web/app/onboarding/_lib/save.ts

export type AccountInfo = {
  email?: string;
};

export type CompanyInfo = {
  // ✅ New fields you asked for
  website?: string;
  linkedin?: string;
  industry?: string;
  sector?: string;

  // (Legacy fields kept so older pages don’t break)
  name?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
  phone?: string;
};

export type BrandingInfo = {
  logoUrl?: string;
};

export type GoalsInfo = {
  primary?: string;
};

export type OnboardingPayload = {
  account?: AccountInfo;
  company?: CompanyInfo;
  branding?: BrandingInfo;
  goals?: GoalsInfo;
};

/**
 * Minimal client-side helper.
 * If you have a server endpoint, swap in a fetch() and remove the localStorage fallback.
 */
export async function saveOnboarding(payload: OnboardingPayload): Promise<void> {
  // Example server call (uncomment and adjust if you have an API):
  // const res = await fetch("/api/onboarding/save", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload),
  // });
  // if (!res.ok) {
  //   const j = await res.json().catch(() => ({}));
  //   throw new Error(j.error ?? "Failed to save onboarding");
  // }

  // Demo/local fallback: persist a merged object so UI flows are unblocked
  const KEY = "mc_onboarding_payload";
  const prevRaw =
    typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  const prev = prevRaw ? JSON.parse(prevRaw) : {};
  const merged = { ...prev, ...payload };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(merged));
  }
}
