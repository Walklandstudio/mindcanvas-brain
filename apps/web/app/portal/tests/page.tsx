"use client";
import { useEffect, useState } from "react";

export default function TestsFlat() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/portal/tests", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load tests");
        setData(j.tests ?? []);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6 text-slate-500">Loading tests…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!data.length) return <div className="p-6 text-slate-500">No tests found.</div>;

  return <div className="p-6">/* render your list here */</div>;
}
