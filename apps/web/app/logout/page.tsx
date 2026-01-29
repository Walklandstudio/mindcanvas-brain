// apps/web/app/portal/logout/page.tsx
"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const dynamic = "force-dynamic";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth
      .signOut()
      .catch(() => null)
      .finally(() => {
        router.replace("/portal/login");
      });
  }, [router]);

  return <main className="p-8">Signing out…</main>;
}

