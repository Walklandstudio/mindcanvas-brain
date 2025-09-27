'use client';

import { useEffect, useState } from 'react';

type TestRow = { id: string; slug: string; name: string; created_at: string };

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function TestsPage() {
  const [rows, setRows] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);

  // invite modal state
  const [open, setOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetch('/api/admin/tests').then(r => r.json());
      if (!active) return;
      setRows(data.items || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  function openInvite(slug: string) {
    setSelectedSlug(slug);
    setOpen(true);
    setInviteUrl(null);
    setErr(null);
    setFirst('');
    setLast('');
    setEmail('');
    setPhone('');
  }

  async function sendInvite() {
    if (!selectedSlug) return;
    setBusy(true);
    setErr(null);
    try {
      const name = [first.trim(), last.trim()].filter(Boolean).join(' ') || null;
      const emailClean = email.trim();
      const phoneClean = phone.trim();
      const emailToSend = isValidEmail(emailClean) ? emailClean : null;

      const res = await fetch('/api/admin/tests/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: selectedSlug,
          name,
          email: emailToSend, // only send if valid
          phone: phoneClean || null,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to create link');
      }
      const { url } = await res.json();
      const full = `${location.origin}${url}`;
      setInviteUrl(full);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tests</h2>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Slug</th>
              <th className="px-4 py-2 text-left font-medium">Created</th>
              <th className="px-4 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.slug}</td>
                <td className="px-4 py-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => openInvite(r.slug)} className="rounded-lg border px-3 py-1 hover:bg-gray-50">
                      Send Test
                    </button>
                    <a href={`/create-test/framework-preview?slug=${r.slug}`} className="rounded-lg border px-3 py-1 hover:bg-gray-50">
                      Edit
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No tests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="mt-3 text-sm text-gray-500">Loading…</div>}

      {/* Invite modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 text-lg font-semibold">Send Test</div>
            <div className="mb-3 text-xs text-gray-500">Test: {selectedSlug}</div>

            <div className="space-y-3">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="First name (optional)"
                value={first} onChange={e => setFirst(e.target.value)}
              />
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Last name (optional)"
                value={last} onChange={e => setLast(e.target.value)}
              />
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Email (optional)"
                type="email"
                value={email} onChange={e => setEmail(e.target.value)}
              />
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Phone (optional)"
                value={phone} onChange={e => setPhone(e.target.value)}
              />
              {email && !isValidEmail(email) && (
                <div className="text-xs text-amber-700">Email doesn’t look valid — we’ll ignore it.</div>
              )}
            </div>

            {err && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {err}
              </div>
            )}

            {inviteUrl ? (
              <div className="mt-4 rounded-md border bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Invite link</div>
                <div className="mt-1 break-all text-sm">{inviteUrl}</div>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => (navigator.clipboard.writeText(inviteUrl))} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100">
                    Copy
                  </button>
                  <a href={inviteUrl} target="_blank" className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100">
                    Open
                  </a>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100">Close</button>
              <button
                onClick={sendInvite}
                disabled={busy || !selectedSlug}
                className="rounded-lg bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {busy ? 'Creating…' : 'Create Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
