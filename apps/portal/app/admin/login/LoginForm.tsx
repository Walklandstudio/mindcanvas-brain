"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Route } from "next";

const toRoute = (href: string) => href as unknown as Route;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }

      setSent(true);

      const next = searchParams.get("next") || "/portal";
      // Cast to Route because typedRoutes requires typed destination
      router.replace(toRoute(next));
    } catch {
      setError("Network error");
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6"
    >
      <h1 className="mb-4 text-2xl font-semibold text-white">Sign in</h1>

      {sent ? (
        <p className="text-sm text-white/70">
          Check your email for a magic login link.
        </p>
      ) : (
        <>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mb-3 w-full rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/20 focus:outline-none"
          />

          {error && (
            <p className="mb-3 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-50"
          >
            {busy ? "Sending link..." : "Send magic link"}
          </button>
        </>
      )}
    </form>
  );
}
