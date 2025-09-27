'use client';

import { useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Profile = {
  code: string;
  name: string;
  flow: string;
  overview: string | null;
  strengths: string[] | null;
  watchouts: string[] | null;
  tips: string[] | null;
  welcome_long: string | null;
  introduction_long: string | null;
  competencies_long: string | null;
  brand_color: string | null;
  image_url: string | null;
};

export default function ProfilesAdminPage() {
  // Create a client using your public anon key
  const supabase: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('mc_profiles')
        .select('*')
        .order('code');
      if (!error && data) setProfiles(data as Profile[]);
      setLoading(false);
    })();
  }, [supabase]);

  const handleChange = (code: string, field: keyof Profile, value: string) => {
    setProfiles(prev =>
      prev.map(p => (p.code === code ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    for (const p of profiles) {
      const { error } = await supabase.from('mc_profiles').upsert(p);
      if (error) {
        alert(`Error saving ${p.code}: ${error.message}`);
      }
    }
    setSaving(false);
    alert('Profiles saved!');
  };

  if (loading) return <div className="p-6">Loading profiles…</div>;

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      <h1 className="text-2xl font-bold">Profiles Admin</h1>

      {profiles.map(profile => (
        <div
          key={profile.code}
          className="rounded-xl border p-4 shadow-sm space-y-3 bg-white"
        >
          <h2 className="text-lg font-semibold">
            {profile.code} — {profile.name}
          </h2>

          <label className="block">
            <span className="text-sm font-medium">Overview</span>
            <textarea
              className="mt-1 w-full border rounded p-2"
              rows={2}
              value={profile.overview ?? ''}
              onChange={e => handleChange(profile.code, 'overview', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Welcome</span>
            <textarea
              className="mt-1 w-full border rounded p-2"
              rows={3}
              value={profile.welcome_long ?? ''}
              onChange={e => handleChange(profile.code, 'welcome_long', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Introduction</span>
            <textarea
              className="mt-1 w-full border rounded p-2"
              rows={3}
              value={profile.introduction_long ?? ''}
              onChange={e => handleChange(profile.code, 'introduction_long', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Competencies</span>
            <textarea
              className="mt-1 w-full border rounded p-2"
              rows={3}
              value={profile.competencies_long ?? ''}
              onChange={e => handleChange(profile.code, 'competencies_long', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Brand Color</span>
            <input
              type="color"
              className="ml-2"
              value={profile.brand_color ?? '#000000'}
              onChange={e => handleChange(profile.code, 'brand_color', e.target.value)}
            />
          </label>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save All'}
      </button>
    </main>
  );
}
