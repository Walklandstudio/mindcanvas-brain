"use client";

import { useEffect, useState } from "react";

type ProfileCard = {
  id: string;
  name: string;
  frequency: "A" | "B" | "C" | "D" | string;
  blurb?: string | null;
  approved?: boolean;
};

export default function ReportsIndex() {
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [frameworkId, setFrameworkId] = useState<string | null>(null);

  useEffect(() => {
    setOrgId((globalThis as any).__orgId ?? "demo-org-uuid");
  }, []);

  useEffect(() => {
    (async () => {
      if (!orgId) return;
      // Endpoint should return { frameworkId, profiles: [{... , approved }] }
      const res = await fetch(`/api/admin/framework/profiles?orgId=${orgId}`);
      const j = await res.json();
      setProfiles(j.profiles ?? []);
      setFrameworkId(j.frameworkId ?? null);
    })();
  }, [orgId]);

  return (
    <main className="container mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <ul className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {profiles.map((p) => (
          <li key={p.id} className="border rounded p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-gray-500">
                {p.frequency}
              </span>
              {p.approved ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Approved
                </span>
              ) : (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  Draft
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold mt-2">{p.name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {p.blurb ?? "Short profile blurb will appear here."}
            </p>
            <a
              className="btn-secondary mt-3 inline-block"
              href={`/admin/reports/${p.id}?orgId=${orgId}&frameworkId=${frameworkId}`}
            >
              Open
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
