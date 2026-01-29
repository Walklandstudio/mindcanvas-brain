// apps/web/app/login/page.tsx
"use client";

import { useEffect } from "react";

export default function LoginRedirect() {
  useEffect(() => {
    // Read params without next/navigation hooks (avoids Suspense build error)
    const usp = new URLSearchParams(window.location.search || "");
    const next = usp.get("next") || usp.get("redirect") || "";

    const q = new URLSearchParams();
    if (next) q.set("next", next.startsWith("/") ? next : `/${next}`);

    const url = `/portal/login${q.toString() ? `?${q.toString()}` : ""}`;
    window.location.replace(url);
  }, []);

  return <main className="p-8">Redirecting to login…</main>;
}


