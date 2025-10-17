// apps/web/app/portal/login/page.tsx
"use client";

import { useState } from "react";

export default function LoginPage() {
  const [user, setUser] = useState("");       // email
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
      });
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Login failed");
      } else {
        window.location.href = json.next || "/portal/home";
      }
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#0b0f16] text-white">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border border-white/15 rounded-xl p-6">
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
