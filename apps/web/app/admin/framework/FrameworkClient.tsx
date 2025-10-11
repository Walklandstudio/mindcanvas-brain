// apps/web/app/admin/framework/FrameworkClient.tsx
"use client";

import { useState } from "react";
import { createClient as createSb } from "@supabase/supabase-js";

type FrequencyLetter = "A" | "B" | "C" | "D";
type FrequencyMeta = Record<FrequencyLetter, { name?: string; image_url?: string; image_prompt?: string }>;
type Profile = { id: string; name: string; frequency: FrequencyLetter; ordinal: number; image_url?: string | null };

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export default function FrameworkClient({
  frequencyMeta,
  profiles,
}: {
  frequencyMeta: FrequencyMeta;
  profiles: Profile[];
}) {
  const [meta, setMeta] = useState<FrequencyMeta>(frequencyMeta);
  const [list, setList] = useState<Profile[]>(profiles);
  const [drawer, setDrawer] = useState<{ type: "frequency" | "profile"; letter?: FrequencyLetter; id?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>("");

  const supa = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function post(url: string, body?: any) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error((await res.json()).error || "error");
    return res.json();
  }

  async function handleGenerateImages() {
    setToast("Generating images…");
    try {
      await post("/api/admin/framework/generate-images");
      setToast("Images generated ✓. Refresh if they don’t appear immediately.");
    } catch (e: any) {
      setToast(`Image generation failed: ${e.message ?? "error"}`);
    }
  }

  function openEditFrequency(letter: FrequencyLetter) {
    setDrawer({ type: "frequency", letter });
  }
  function openEditProfile(id: string) {
    setDrawer({ type: "profile", id });
  }

  async function saveFrequency(letter: FrequencyLetter, patch: { name?: string; image_url?: string }) {
    setSaving(true);
    try {
      await post("/api/admin/framework/save", { type: "frequency", letter, ...patch });
      setMeta((m) => ({ ...m, [letter]: { ...(m[letter] || {}), ...patch } }));
      setToast("Saved ✓");
      setDrawer(null);
    } catch (e: any) {
      setToast(`Save failed: ${e.message ?? "error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile(id: string, patch: { name?: string; image_url?: string }) {
    setSaving(true);
    try {
      await post("/api/admin/framework/save", { type: "profile", id, ...patch });
      setList((arr) => arr.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      setToast("Saved ✓");
      setDrawer(null);
    } catch (e: any) {
      setToast(`Save failed: ${e.message ?? "error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function uploadFileAndGetUrl(file: File, path: string) {
    const { error } = await supa.storage.from("framework").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/png",
    });
    if (error) throw error;
    const { data } = supa.storage.from("framework").getPublicUrl(path);
    return data.publicUrl;
  }

  const groups: Record<FrequencyLetter, Profile[]> = { A: [], B: [], C: [], D: [] };
  list.forEach((p) => groups[p.frequency].push(p));

  return (
    <div>
      <div className="flex gap-2 mt-4">
        <form action="/api/admin/framework/generate" method="post">
          <button className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium">Generate with AI</button>
        </form>
        <form action="/api/admin/framework/reseed" method="post">
          <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 font-medium">Reseed Defaults</button>
        </form>
        <button onClick={handleGenerateImages} className="px-4 py-2 rounded-xl bg-white text-black font-medium">
          Generate Images
        </button>
        {toast && <div className="ml-2 text-white/80">{toast}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        {(["A", "B", "C", "D"] as FrequencyLetter[]).map((F) => {
          const title = meta?.[F]?.name || `Frequency ${F}`;
          const img = meta?.[F]?.image_url || null;
          return (
            <section key={F} className="border border-white/10 rounded-2xl p-4 bg-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {img ? (
                    <img src={img} alt={title} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/10 grid place-items-center text-sm">{F}</div>
                  )}
                  <h2 className="text-lg font-semibold">{title}</h2>
                </div>
                <button
                  onClick={() => openEditFrequency(F)}
                  className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/20"
                  title="Edit frequency"
                >
                  Edit
                </button>
              </div>

              {!groups[F].length ? (
                <div className="text-white/60 text-sm">No profiles yet.</div>
              ) : (
                <ul className="space-y-2">
                  {groups[F].map((p) => (
                    <li key={p.id} className="rounded-xl bg-white/10 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-md object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-white/10 grid place-items-center text-xs">#{p.ordinal}</div>
                        )}
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-white/60">Frequency {p.frequency} · Ord {p.ordinal}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => openEditProfile(p.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/20"
                        title="Edit profile"
                      >
                        Edit
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => !saving && setDrawer(null)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md bg-neutral-900 border-l border-white/15 p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {drawer.type === "frequency" ? (
              <EditFrequency
                letter={drawer.letter as FrequencyLetter}
                initial={meta[drawer.letter as FrequencyLetter] || {}}
                onSave={saveFrequency}
                onUpload={async (letter, file) => {
                  const path = `orgs/${ORG_ID}/frameworks/frequency_${letter}_${Date.now()}.png`;
                  const url = await uploadFileAndGetUrl(file, path);
                  await saveFrequency(letter, { image_url: url });
                }}
                saving={saving}
                onClose={() => setDrawer(null)}
              />
            ) : (
              <EditProfile
                profile={list.find((p) => p.id === drawer.id)!}
                onSave={saveProfile}
                onUpload={async (id, ordinal, file) => {
                  const path = `orgs/${ORG_ID}/frameworks/profile_${String(ordinal).padStart(2, "0")}_${Date.now()}.png`;
                  const url = await uploadFileAndGetUrl(file, path);
                  await saveProfile(id, { image_url: url });
                }}
                saving={saving}
                onClose={() => setDrawer(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditFrequency({
  letter,
  initial,
  saving,
  onSave,
  onUpload,
  onClose,
}: {
  letter: FrequencyLetter;
  initial: { name?: string; image_url?: string };
  saving: boolean;
  onSave: (letter: FrequencyLetter, patch: { name?: string; image_url?: string }) => Promise<void>;
  onUpload: (letter: FrequencyLetter, file: File) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [imageUrl, setImageUrl] = useState(initial.image_url ?? "");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(f?: File) {
    if (!f) return;
    setUploading(true);
    try {
      await onUpload(letter, f);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="text-white">
      <h3 className="text-xl font-semibold">Edit Frequency {letter}</h3>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="block text-sm mb-1">Name</span>
          <input className="w-full rounded-lg bg-white text-black p-3" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Image URL</span>
          <input className="w-full rounded-lg bg-white text-black p-3" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
        </label>
        <div className="flex items-center gap-2">
          <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0] || undefined)} />
          {uploading && <span className="text-white/70 text-sm">Uploading…</span>}
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button onClick={() => onSave(letter, { name, image_url: imageUrl })} disabled={saving} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20">Close</button>
      </div>
    </div>
  );
}

function EditProfile({
  profile,
  saving,
  onSave,
  onUpload,
  onClose,
}: {
  profile: { id: string; name: string; image_url?: string | null; ordinal?: number };
  saving: boolean;
  onSave: (id: string, patch: { name?: string; image_url?: string }) => Promise<void>;
  onUpload: (id: string, ordinal: number, file: File) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [imageUrl, setImageUrl] = useState(profile.image_url ?? "");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(f?: File) {
    if (!f) return;
    setUploading(true);
    try {
      await onUpload(profile.id, profile.ordinal ?? 0, f);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="text-white">
      <h3 className="text-xl font-semibold">Edit Profile</h3>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="block text-sm mb-1">Name</span>
          <input className="w-full rounded-lg bg-white text-black p-3" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Image URL</span>
          <input className="w-full rounded-lg bg-white text-black p-3" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
        </label>
        <div className="flex items-center gap-2">
          <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0] || undefined)} />
          {uploading && <span className="text-white/70 text-sm">Uploading…</span>}
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button onClick={() => onSave(profile.id, { name, image_url: imageUrl })} disabled={saving} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20">Close</button>
      </div>
    </div>
  );
}
