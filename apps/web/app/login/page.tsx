// apps/web/app/login/page.tsx
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginRedirect() {
  const sp = useSearchParams();

  useEffect(() => {
    const next = sp?.get("next") || sp?.get("redirect") || "";
    const q = new URLSearchParams();
    if (next) q.set("next", next.startsWith("/") ? next : `/${next}`);
    const url = `/portal/login${q.toString() ? `?${q.toString()}` : ""}`;
    window.location.replace(url);
  }, [sp]);

  return (
    <main className="p-8">
      Redirecting to login…
    </main>
  );
}


