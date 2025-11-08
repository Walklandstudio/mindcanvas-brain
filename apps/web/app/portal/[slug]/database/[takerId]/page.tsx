// Server component — /portal/[slug]/database/[takerId]
// Contact info + latest results with Frequency/Profile mixes (no fragile views)

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

type Totals = Record<string, number> | string | null | undefined;

function parseTotals(totals: Totals): Record<string, number> {
  if (!totals) return {};
  try {
    if (typeof totals === "string") {
      const once = JSON.parse(totals);
      if (typeof once === "string") return JSON.parse(once);
      return once;
    }
    return totals as Record<string, number>;
  } catch {
    return {};
  }
}
function asPercentMap(values: Record<string, number>): Record<string, number> {
  const sum = Object.values(values).reduce((a, b) => a + (Number(b) || 0), 0);
  if (!sum) return Object.fromEntries(Object.keys(values).map((k) => [k, 0]));
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Math.round(((Number(v) || 0) / sum) * 100)]));
}
function sortDesc(obj: Record<string, number>) {
  return Object.entries(obj).sort((a, b) => (b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]));
}
function codeToPShort(code?: string | null) {
  if (!code) return "";
  const m = code.match(/PROFILE_(\d+)/i);
  return m ? `P${m[1]}` : code;
}
function BarRow({ label, pct, note }: { label: string; pct: number; note?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-48 text-sm">
        <span className="font-medium">{label}</span>{note ? <span className="text-gray-500"> {note}</span> : null}
      </div>
      <div className="flex-1 h-2 rounded bg-gray-200">
        <div className="h-2 rounded bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      <div className="w-10 text-right text-sm tabular-nums">{pct}%</div>
    </div>
  );
}

export default async function TakerDetail({ params }: { params: { slug: string; takerId: string } }) {
  const { slug, takerId } = params;
  const sb = createClient().schema("portal");

  const { data: org } = await sb.from("orgs").select("id, slug, name").eq("slug", slug).maybeSingle();
  if (!org) return notFound();

  const { data: taker } = await sb
    .from("test_takers")
    .select("id, org_id, test_id, first_name, last_name, email, phone, created_at, company, role_title")
    .eq("id", takerId)
    .maybeSingle();
  if (!taker || taker.org_id !== org.id) return notFound();

  const { data: test } = await sb.from("tests").select("id, name, meta").eq("id", taker.test_id).maybeSingle();

  const { data: results } = await sb
    .from("test_results")
    .select("id, created_at, totals")
    .eq("taker_id", taker.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const latest = (results ?? [])[0] || null;
  const totalsRaw = parseTotals(latest?.totals);

  const meta: any = (test?.meta as any) ?? {};
  const profiles: Array<{ name: string; code?: string; frequency?: string }> =
    Array.isArray(meta?.profiles) ? meta.profiles.map((p: any) => ({ name: String(p?.name ?? ""), code: p?.code ?? null, frequency: p?.frequency ?? null })) : [];
  const freqLabels: Record<string, string> =
    Array.isArray(meta?.frequencies)
      ? Object.fromEntries(meta.frequencies.map((f: any) => [String(f?.code ?? "").toUpperCase(), String(f?.label ?? "")]))
      : { A: "A", B: "B", C: "C", D: "D" };

  const keys = Object.keys(totalsRaw);
  const isFreqTotals = keys.length && keys.every((k) => ["A", "B", "C", "D"].includes(k.toUpperCase()));

  let profileScores: Record<string, number> = {};
  let frequencyScores: Record<string, number> = {};

  if (isFreqTotals) {
    frequencyScores = Object.fromEntries(Object.entries(totalsRaw).map(([k, v]) => [k.toUpperCase(), Number(v) || 0]));
  } else {
    profileScores = Object.fromEntries(Object.entries(totalsRaw).map(([k, v]) => [String(k), Number(v) || 0]));
    const p2f = Object.fromEntries(profiles.map((p) => [p.name, (p.frequency || "").toUpperCase()]));
    frequencyScores = Object.entries(profileScores).reduce((acc, [pName, score]) => {
      const f = p2f[pName] || "";
      if (!f) return acc;
      acc[f] = (acc[f] || 0) + (Number(score) || 0);
      return acc;
    }, {} as Record<string, number>);
  }

  const freqPct = asPercentMap(frequencyScores);
  const profilePct = asPercentMap(profileScores);
  const topProfile = sortDesc(profileScores)[0] as [string, number] | undefined;
  const fullName = [taker.first_name, taker.last_name].filter(Boolean).join(" ").trim() || "—";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{fullName}</h1>
          <p className="text-sm text-gray-500">{org.name}</p>
        </div>
        <Link href={`/portal/${slug}/database`} className="rounded-md border px-3 py-2 text-sm">Back to database</Link>
      </header>

      {/* Contact */}
      <section className="rounded-xl border p-4 bg-white">
        <h2 className="font-medium mb-3">Contact</h2>
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <dt className="text-gray-500">First name</dt><dd className="col-span-2">{taker.first_name || "—"}</dd>
          <dt className="text-gray-500">Last name</dt><dd className="col-span-2">{taker.last_name || "—"}</dd>
          <dt className="text-gray-500">Email</dt><dd className="col-span-2">{taker.email || "—"}</dd>
          <dt className="text-gray-500">Phone</dt><dd className="col-span-2">{taker.phone || "—"}</dd>
          <dt className="text-gray-500">Created at</dt><dd className="col-span-2">{taker.created_at ? new Date(taker.created_at as any).toLocaleString() : "—"}</dd>
          <dt className="text-gray-500">Company</dt><dd className="col-span-2">{taker.company || "—"}</dd>
          <dt className="text-gray-500">Role title</dt><dd className="col-span-2">{taker.role_title || "—"}</dd>
        </dl>
      </section>

      {/* Latest Result */}
      <section className="rounded-xl border p-4 bg-white space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Latest Result</h2>
          <button className="rounded-md border px-3 py-2 text-sm disabled:opacity-60" disabled>Generate PDF (coming soon)</button>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-sm">
          <dt className="text-gray-500">Test</dt><dd className="col-span-2">{test?.name || "—"}</dd>
          <dt className="text-gray-500">Completed</dt><dd className="col-span-2">{latest?.created_at ? new Date(latest.created_at as any).toLocaleString() : "—"}</dd>
          <dt className="text-gray-500">Top profile</dt><dd className="col-span-2">{topProfile ? `${topProfile[0]} (${topProfile[1]})` : "—"}</dd>
        </dl>

        <div className="space-y-2">
          <h3 className="font-medium">Frequency mix</h3>
          {["A","B","C","D"].map((f) => (
            <BarRow key={f} label={`${(meta?.frequencies?.find?.((x:any)=>String(x?.code).toUpperCase()===f)?.label) ?? f}`} note={`(${f})`} pct={freqPct[f] ?? 0}/>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Profile mix</h3>
          {Object.keys(profilePct).length ? (
            sortDesc(profilePct).map(([name, pct]) => {
              const p = profiles.find((x) => x.name === name);
              const short = codeToPShort(p?.code || "");
              return <BarRow key={name} label={name} note={short ? `(${short})` : undefined} pct={pct} />;
            })
          ) : (
            <p className="text-sm text-gray-500">Profile-level scores aren’t available for this result (only frequencies were stored).</p>
          )}
        </div>
      </section>
    </div>
  );
}
