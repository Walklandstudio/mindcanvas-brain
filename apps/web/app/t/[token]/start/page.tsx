"use client";
import { useEffect, useState } from "react";

export default function StartTest({ params }: { params: { token: string } }) {
  const { token } = params;
  const [msg, setMsg] = useState("Starting…");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/public/test/${token}/start`, { method: "POST", cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) { setMsg(j?.error || `Failed to start (${r.status})`); return; }
        window.location.href = j.next || `/t/${token}`;
      } catch (e: any) {
        if (alive) setMsg(e?.message || "Network error");
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const isLoading = msg === "Starting…";
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Starting Test</h1>
      <p className={`mt-3 text-sm ${isLoading ? "text-slate-600" : "text-red-700"}`}>{msg}</p>
    </div>
  );
}
