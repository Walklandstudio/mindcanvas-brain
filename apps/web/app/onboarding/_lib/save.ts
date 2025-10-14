// Minimal client-side helper. If you already have an API route, plug it in below.
export type OnboardingPayload = {
  account?: { email?: string };
  company?: { name?: string };
  branding?: { logoUrl?: string };
  goals?: { primary?: string };
};

export async function saveOnboarding(payload: OnboardingPayload): Promise<void> {
  // If you have a server endpoint, uncomment this and delete the localStorage fallback:
  // const res = await fetch("/api/onboarding/save", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload),
  // });
  // if (!res.ok) {
  //   const j = await res.json().catch(() => ({}));
  //   throw new Error(j.error ?? "Failed to save onboarding");
  // }

  // Demo fallback (keeps UI moving without backend)
  const key = "mc_onboarding_payload";
  const prev = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  const merged = { ...(prev ? JSON.parse(prev) : {}), ...payload };
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(merged));
  }
}
