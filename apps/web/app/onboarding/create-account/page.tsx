"use client";
import { useEffect, useState } from "react";

type Account = {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
  phone?: string;
};

export default function Page() {
  const [data, setData] = useState<Account>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/onboarding");
      const j = await r.json();
      const c = j.onboarding?.company ?? {};
      setData({
        companyName: c.companyName ?? "",
        firstName: c.firstName ?? "",
        lastName: c.lastName ?? "",
        position: c.position ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
      });
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: { ...data } }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <h1 className="text-xl font-semibold">Create Account</h1>
      <p className="mt-1 text-sm text-slate-300">
        Tell us who you are and your company details.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm text-slate-300">Company Name *</label>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.companyName ?? ""}
            onChange={(e) => setData({ ...data, companyName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300">First Name</label>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.firstName ?? ""}
            onChange={(e) => setData({ ...data, firstName: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300">Last Name</label>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.lastName ?? ""}
            onChange={(e) => setData({ ...data, lastName: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300">Position</label>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.position ?? ""}
            onChange={(e) => setData({ ...data, position: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300">Email *</label>
          <input
            type="email"
            required
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.email ?? ""}
            onChange={(e) => setData({ ...data, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300">Phone</label>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2"
            value={data.phone ?? ""}
            onChange={(e) => setData({ ...data, phone: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <a href="/" className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm">
          Back
        </a>
        <button
          onClick={save}
          disabled={saving || !data.companyName || !data.email}
          className="rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{
            background:
              "linear-gradient(135deg, var(--mc-c1), var(--mc-c2) 60%, var(--mc-c3))",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <a
          href="/onboarding/company"
          className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm"
        >
          Next
        </a>
      </div>
    </div>
  );
}
