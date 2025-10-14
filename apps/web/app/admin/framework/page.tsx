"use client";

import { useEffect, useState } from "react";

type Profile = {
  id: string;
  name: string;
  frequency: "A" | "B" | "C" | "D" | string;
  ordinal?: number | null;
  image_url?: string | null;
  blurb?: string | null;
};

export default function FrameworkPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [frameworkId, setFrameworkId] = useState<string | null>(null);

  useEffect(() => {
    // TODO: pull from your auth/session
    setOrgId((globalThis as any).__orgId ?? "demo-org-uuid");
  }, []);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const res = await fetch(`/api/admin/framework/list?orgId=${orgId}`);
      if (!res.ok) {
        toast("Failed to load framework list");
        return;
      }
      const json = await res.json();
      setProfiles(json.profiles ?? []);
      setFrameworkId(json.frameworkId ?? null);

      if (!json.profiles || json.profiles.length === 0) {
        // Auto-seed then reload
        const seed = await fetch("/api/admin/framework/reseed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId }),
        });
        if (!seed.ok) {
          toast("Reseed failed");
          return;
        }
        const again = await fetch(`/api/admin/framework/list?orgId=${orgId}`);
        const j2 = await again.json();
        setProfiles(j2.profiles ?? []);
        setFrameworkId(j2.frameworkId ?? null);
        toast("Framework seeded");
      }
    })();
  }, [orgId]);

  return (
    <main className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Framework</h1>
        <a className="btn-secondary" href="/admin/test-builder">
          Go to Test Builder →
        </a>
      </div>

      <ul className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {profiles.map((p) => (
          <li key={p.id} className="border rounded p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              {["A", "B", "C", "D"].includes(p.frequency) ? p.frequency : "—"}
            </div>
            <h3 className="text-lg font-semibold">{p.name}</h3>

            {/* Inline edit */}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-600">
                Edit
              </summary>
              {orgId && frameworkId ? (
                <InlineEdit
                  orgId={orgId}
                  frameworkId={frameworkId}
                  profile={p}
                  onSaved={(np) => {
                    setProfiles((old) =>
                      old.map((o) => (o.id === np.id ? np : o))
                    );
                    toast("Saved");
                  }}
                  onError={(e) => toast(e)}
                />
              ) : null}
            </details>
          </li>
        ))}
      </ul>

      <div className="pt-6">
        <a className="btn-primary" href="/admin/test-builder">
          Go to Test Builder →
        </a>
      </div>
    </main>
  );
}

function InlineEdit({
  orgId,
  frameworkId,
  profile,
  onSaved,
  onError,
}: {
  orgId: string;
  frameworkId: string;
  profile: Profile;
  onSaved: (p: Profile) => void;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [imageUrl, setImageUrl] = useState(profile.image_url ?? "");

  const save = async () => {
    const res = await fetch("/api/admin/framework/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        frameworkId,
        profileId: profile.id,
        name,
        imageUrl,
      }),
    });
    const j = await res.json();
    if (!res.ok) return onError(j.error ?? "Save failed");
    onSaved({ ...profile, name, image_url: imageUrl });
  };

  return (
    <div className="mt-2 space-y-2">
      <input
        className="w-full border rounded px-2 py-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      <input
        className="w-full border rounded px-2 py-1"
        value={imageUrl ?? ""}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Image URL"
      />
      <button onClick={save} className="btn-secondary w-full">
        Save
      </button>
    </div>
  );
}

function toast(msg: string) {
  // TODO: replace with your real toast
  // eslint-disable-next-line no-alert
  alert(msg);
}
