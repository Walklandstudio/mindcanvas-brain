// apps/web/app/portal/login/page.tsx
"use client";

import { useState } from "react";

function safeNextPath(input: unknown, fallback: string) {
  const s = typeof input === "string" ? input.trim() : "";
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//")) return fallback;
  return s;
}

type LoginResponse = {
  ok: boolean;
  error?: string;
  next?: string;

  // returned by /api/portal/login
  is_superadmin?: boolean;
  org_slug?: string | null;
};

function getNextFromUrl(): string | null {
  try {
    const usp = new URLSearchParams(window.location.search || "");
    const next = usp.get("next");
    return next ? next : null;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const [user, setUser] = useState(""); // email
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
      const json = ct.includes("application/json")
        ? ((await res.json().catch(() => null)) as LoginResponse | null)
        : null;

      if (!res.ok || !json?.ok) {
        setError(json?.error || `Login failed (HTTP ${res.status})`);
        return;
      }

      const isSuper = !!json.is_superadmin;

      // Priority:
      // 1) explicit ?next=...
      // 2) server-provided next
      // 3) role-aware fallback
      const nextFromUrl = getNextFromUrl();
      const nextFromServer = json?.next;

      const computedFallback = isSuper
        ? "/dashboard"
        : json?.org_slug
          ? `/portal/${json.org_slug}/dashboard`
          : "/portal";

      let target = safeNextPath(nextFromUrl || nextFromServer, computedFallback);

      // Guardrails:
      // - Org users must never land in /dashboard or /admin
      if (!isSuper && (target === "/dashboard" || target.startsWith("/dashboard/"))) {
        target = computedFallback;
      }
      if (!isSuper && (target === "/admin" || target.startsWith("/admin/"))) {
        target = computedFallback;
      }

      // - Superadmin should not be forced into a portal org path unless explicitly requested
      // (If you WANT superadmins to be able to land on a portal org, remove this.)
      if (isSuper && target.startsWith("/portal/") && !nextFromUrl) {
        target = "/dashboard";
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
          <label className="block text-sm mb-1">User (enter email address)</label>
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
          <label className="block text-sm mb-1">Password (enter password)</label>
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
