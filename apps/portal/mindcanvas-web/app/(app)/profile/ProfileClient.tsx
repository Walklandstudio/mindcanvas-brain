'use client';

import { useEffect, useState } from 'react';

type ProfileData = {
  first_name: string;
  last_name: string;
  position: string;
  email: string;
  phone: string;
  password_note: string; // placeholder; not a real password store
  company_name: string;
  website: string;
  linkedin: string;
  industry: string;
  sector: string;
  logo_url: string;
  updated_at?: string;
};

const empty: ProfileData = {
  first_name: '',
  last_name: '',
  position: '',
  email: '',
  phone: '',
  password_note: '',
  company_name: '',
  website: '',
  linkedin: '',
  industry: '',
  sector: '',
  logo_url: '',
};

export default function ProfileClient() {
  const [data, setData] = useState<ProfileData>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(null);
        const res = await fetch('/api/profile', { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as { data: ProfileData | null };
        if (alive) setData(json.data ?? empty);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const set = (k: keyof ProfileData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      setOk(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-gray-600">
          Your organization & contact details used across the app.
        </p>
      </div>

      {err && (
        <div className="mx-6 my-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      {ok && (
        <div className="mx-6 my-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved.
        </div>
      )}

      {loading ? (
        <div className="p-6 text-sm text-gray-600">Loading…</div>
      ) : (
        <form onSubmit={onSubmit} className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              <Field label="First Name">
                <input className="input" value={data.first_name} onChange={set('first_name')} />
              </Field>
              <Field label="Last Name">
                <input className="input" value={data.last_name} onChange={set('last_name')} />
              </Field>
              <Field label="Position">
                <input className="input" value={data.position} onChange={set('position')} />
              </Field>
              <Field label="Contact Email">
                <input type="email" className="input" value={data.email} onChange={set('email')} />
              </Field>
              <Field label="Contact Number">
                <input className="input" value={data.phone} onChange={set('phone')} />
              </Field>
              <Field label="Password (note)">
                <input
                  type="password"
                  className="input"
                  value={data.password_note}
                  onChange={set('password_note')}
                  placeholder="For reference only — not used for login"
                />
              </Field>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <Field label="Company name">
                <input className="input" value={data.company_name} onChange={set('company_name')} />
              </Field>
              <Field label="Website">
                <input className="input" value={data.website} onChange={set('website')} />
              </Field>
              <Field label="LinkedIn">
                <input className="input" value={data.linkedin} onChange={set('linkedin')} />
              </Field>
              <Field label="Industry">
                <input className="input" value={data.industry} onChange={set('industry')} />
              </Field>
              <Field label="Sector">
                <input className="input" value={data.sector} onChange={set('sector')} />
              </Field>

              <Field label="Logo (URL)">
                <input
                  className="input"
                  placeholder="https://…/logo.png"
                  value={data.logo_url}
                  onChange={set('logo_url')}
                />
                {data.logo_url && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.logo_url}
                      alt="Logo preview"
                      className="h-14 w-auto rounded border bg-white p-1"
                    />
                  </div>
                )}
              </Field>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.1);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
      {children}
    </label>
  );
}
