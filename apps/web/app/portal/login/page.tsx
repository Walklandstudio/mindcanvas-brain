// apps/web/app/portal/login/page.tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

function safeNextPath(input: unknown, fallback: string) {
  const s = typeof input === "string" ? input.trim() : "";
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//")) return fallback;
  return s;
}

type LoginResponse = {
  ok: boolean;
  error?: string;

  // existing (you already have this)
  next?: string;

  // recommended additions from /api/portal/login (optional but useful)
  is_super_admin?: boolean;
  org_slug?: string | null;
};

export default function LoginPage() {
  const searchParams = useSearchParams();

  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: user, password }),
        redirect: "manual",
      });

      const ct = res.headers.get("content-type") || "";
      let json: LoginResponse | null = null;

      if (ct.includes("application/json")) {
        json = (await res.json().catch(() => null)) as LoginResponse | null;
      } else {
        const txt = await res.text().catch(() => "");
        if (!res.ok) {
          setError(txt || `Login failed (HTTP ${res.status})`);
          setLoading(false);
          return;
        }
        // If server didn’t return JSON, safest default is org home.
        window.location.href = "/portal/home";
        return;
      }

      if (!res.ok || !json?.ok) {
        setError(json?.error || `Login failed (HTTP ${res.status})`);
        setLoading(false);
        return;
      }

      // 1) Explicit next=... override (optional)
      const nextFromUrl = searchParams?.get("next");

      // 2) Server-provided next (current behavior)
      const nextFromServer = json?.next;

      // 3) Role-aware fallback if next is missing / wrong
      const computedFallback = json?.is_super_admin
        ? "/portal/admin"
        : json?.org_slug
          ? `/portal/${json.org_slug}/dashboard`
          : "/portal/home";

      // Prefer URL next, then server next, then computed fallback
      let target = safeNextPath(nextFromUrl || nextFromServer, computedFallback);

      // ✅ Guardrail: super admin should never land on global /dashboard
      if (json?.is_super_admin && target === "/dashboard") {
        target = "/portal/admin";
      }

      window.location.href = target;
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#0b0f16] text-white">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 border border-white/15 rounded-xl p-6"
      >
        <h1 className="text-xl font-semibold">Client Portal Login</h1>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <div>
          <label className="block text-sm mb-1">
            User (enter email address)
          </label>
          <input
            className="w-full rounded-md border border-white/20 bg-transparent p-2"
            type="email"
            value={user}
            onChange={(e) => setUser(e.currentTarget.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">
            Password (enter password)
          </label>
          <input
            className="w-full rounded-md border border-white/20 bg-transparent p-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          className="w-full rounded-md border border-white/25 py-2 hover:bg-white/5 disabled:opacity-50"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}