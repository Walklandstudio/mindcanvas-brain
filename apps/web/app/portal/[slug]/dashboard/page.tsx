// apps/web/app/portal/[slug]/dashboard/page.tsx
// Server component — redesigned portal Dashboard for /portal/[slug]/dashboard
// Overview surface: usage strip, next-action / billing alert, KPI stats,
// recent activity, active test links, setup checklist + community.
// The greeting header lives in the shared PortalHeader (layout chrome).
// The previous link-analytics console now lives at /portal/[slug]/legacy/dashboard.
import "server-only";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { createClient } from "@/lib/server/supabaseAdmin";
import {
  getSubmissionUsage,
  getActiveEntitlement,
  type SubmissionUsage,
} from "@/app/_lib/billing";
import {
  DashboardAnalytics,
  ProUpsellBanner,
  ProStatusBanner,
} from "./_components/DashboardAnalytics";
import { cardClass as CARD, JAKARTA } from "@/components/portal/ui";
import { Avatar } from "@/components/portal/Avatar";
import { Badge } from "@/components/portal/Badge";
import { ProgressBar } from "@/components/portal/ProgressBar";

// Tier → plan naming. Tier 1 = Starter (analytics locked); tier >= 2 unlocks
// analytics (2 = Pro, 3 = Niche, 4 = Enterprise). Mirrors profile/billing.
const TIER_PLANS = [
  { tier: 2, label: "Pro", submissions: 35, next: "Niche" },
  { tier: 3, label: "Niche", submissions: 50, next: "Enterprise" },
  { tier: 4, label: "Enterprise", submissions: 100, next: null as string | null },
];

// Format a timestamp as a relative label (e.g. "2h ago", "Yesterday").
function relativeTime(value: string | null): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";

  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Mirror of the link-active rules used by the analytics API.
function isLinkActive(row: {
  is_active?: boolean | null;
  expires_at?: string | null;
  max_uses?: number | null;
  use_count?: number | null;
}): boolean {
  if (row.is_active === false) return false;
  if (row.expires_at) {
    const exp = new Date(row.expires_at);
    if (Number.isFinite(exp.getTime()) && exp.getTime() <= Date.now()) return false;
  }
  const max = row.max_uses ?? null;
  const used = row.use_count ?? 0;
  if (max != null && used >= max) return false;
  return true;
}

type Activity = {
  id: string;
  name: string;
  testName: string;
  completed: boolean;
  created: string | null;
};

type LinkRow = {
  token: string;
  name: string;
  testName: string;
  active: boolean;
  submissions: number;
};

export default async function DashboardPage({
  params,
}: {
  params: { slug: string };
}) {
  try {
    const { slug } = params;
    const sb = createClient().schema("portal");

    // --- 1) Resolve org -------------------------------------------------
    const { data: org, error: orgErr } = await sb
      .from("orgs")
      .select("id, slug, name, status, logo_url")
      .eq("slug", slug)
      .maybeSingle();

    if (orgErr || !org) {
      throw new Error(orgErr?.message || "Organisation not found");
    }

    const status = String(org.status || "").toLowerCase();

    // --- 2) Billing / submission usage (allowance, used, remaining) ------
    let usage: SubmissionUsage | null = null;
    try {
      usage = await getSubmissionUsage(org.id);
    } catch {
      usage = null;
    }
    const subscriptionUsed = usage?.used ?? 0;
    const subscriptionAllowance = usage?.allowance ?? null;
    const subscriptionRemaining = usage?.remaining ?? null;
    const resetDate = usage?.period_end ?? null;
    const isInternal = usage?.exempt === true;

    // Free-trial organisations intentionally have no active subscription.
    // Their usable submissions live in engine_trial_allocations instead.
    let trialRemaining = Math.max(usage?.trial_remaining ?? 0, 0);
    let trialAllocated = trialRemaining;

    if (!isInternal && status === "pending_activation") {
      const { data: trialRows, error: trialError } = await sb
        .from("engine_trial_allocations")
        .select("quantity_allocated, quantity_remaining")
        .eq("org_id", org.id)
        .eq("allocation_type", "trial");

      if (!trialError && trialRows) {
        trialAllocated = trialRows.reduce(
          (sum: number, row: any) =>
            sum + Number(row.quantity_allocated ?? 0),
          0,
        );

        trialRemaining = trialRows.reduce(
          (sum: number, row: any) =>
            sum + Number(row.quantity_remaining ?? 0),
          0,
        );
      }
    }

    const isFreeTrial =
      !isInternal &&
      status === "pending_activation" &&
      trialAllocated > 0;

    const hasTrialRemaining =
      isFreeTrial && trialRemaining > 0;

    const used = isFreeTrial
      ? Math.max(trialAllocated - trialRemaining, 0)
      : subscriptionUsed;

    const allowance = isFreeTrial
      ? trialAllocated
      : subscriptionAllowance;

    const remaining = isFreeTrial
      ? trialRemaining
      : subscriptionRemaining;

    const needsBilling =
      !isInternal &&
      status === "pending_activation" &&
      !hasTrialRemaining;

    const pastDue = !isInternal && status === "past_due";

    // --- Plan tier (drives Starter vs Pro analytics variant) ------------
    let tier: number | null = null;
    try {
      tier = (await getActiveEntitlement(org.id))?.tier ?? null;
    } catch {
      tier = null;
    }
    const isPro = isInternal || (tier != null && tier >= 2);
    const plan = TIER_PLANS.find((p) => p.tier === tier);

    // --- 3) Tests (for names) -------------------------------------------
    const { data: tests } = await sb
      .from("tests")
      .select("id, name, slug")
      .eq("org_id", org.id);

    const testNameById = new Map<string, string>();
    (tests ?? []).forEach((t: any) => {
      testNameById.set(t.id, t.name || t.slug || "Untitled test");
    });

    // --- 4) Test links --------------------------------------------------
    const { data: linkRows } = await sb
      .from("test_links")
      .select(
        "token, name, label, test_id, is_active, use_count, max_uses, created_at, expires_at",
      )
      .eq("org_id", org.id)
      .order("created_at", { ascending: false });

    // --- 5) Test takers (activity + counts) -----------------------------
    const { data: takers } = await sb
      .from("test_takers")
      .select("id, first_name, last_name, test_id, link_token, status, created_at")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(500);

    const takerList = (takers ?? []) as any[];

    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    let completedCount = 0;
    let weekCount = 0;
    const submissionsByToken = new Map<string, number>();

    for (const t of takerList) {
      const isCompleted = String(t.status || "").toLowerCase() === "completed";
      if (isCompleted) completedCount += 1;

      const created = t.created_at ? new Date(t.created_at).getTime() : NaN;
      if (Number.isFinite(created) && created >= weekAgo) weekCount += 1;

      const token = (t.link_token || "").trim();
      if (token) submissionsByToken.set(token, (submissionsByToken.get(token) || 0) + 1);
    }

    const totalTakers = takerList.length;
    const pendingReports = Math.max(totalTakers - completedCount, 0);

    // Links → view rows + active count
    const links: LinkRow[] = (linkRows ?? []).map((l: any) => {
      const token = (l.token || "").trim();
      return {
        token,
        name: l.name || l.label || "Untitled link",
        testName: testNameById.get(l.test_id) || "—",
        active: isLinkActive(l),
        submissions: submissionsByToken.get(token) || 0,
      };
    });
    const activeLinks = links.filter((l) => l.active).length;
    const draftLinks = Math.max(links.length - activeLinks, 0);

    // Recent activity (latest 5 takers)
    const activity: Activity[] = takerList.slice(0, 5).map((t: any) => ({
      id: t.id,
      name:
        [t.first_name, t.last_name].filter(Boolean).join(" ").trim() || "Anonymous",
      testName: testNameById.get(t.test_id) || "Profile test",
      completed: String(t.status || "").toLowerCase() === "completed",
      created: t.created_at ?? null,
    }));

    // Setup checklist — labels mirror the Figma design, done-state is derived.
    const checklist = [
      { label: "Account created", done: true },
      { label: "Email verified", done: true },
      { label: "Organisation created", done: !!org.name },
      { label: "Logo uploaded", done: !!org.logo_url },
      { label: "First diagnostic done", done: totalTakers > 0 },
      { label: "Onboarding booked", done: false },
      { label: "First test link created", done: links.length > 0 },
      { label: "Billing set up", done: status === "active" },
    ];
    const checklistDone = checklist.filter((c) => c.done).length;
    const checklistPct = Math.round((checklistDone / checklist.length) * 100);

    // --- Shared body blocks (arranged differently per tier below) --------
    const statsGrid = (
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Submissions used"
          value={String(used)}
          caption={
            isFreeTrial
              ? `of ${allowance ?? 0} trial submissions`
              : allowance != null
                ? `of ${allowance} included`
                : "this period"
          }
        />
        <StatCard
          label="Reports generated"
          value={String(completedCount)}
          caption={pendingReports > 0 ? `${pendingReports} in progress` : "All complete"}
        />
        <StatCard
          label="Active test links"
          value={String(activeLinks)}
          caption={`${activeLinks} shared · ${draftLinks} draft`}
        />
        <StatCard
          label="New this week"
          value={String(weekCount)}
          caption="Profile submissions"
        />
      </div>
    );

    const recentActivityCard = (
      <div className={`${CARD} p-5`}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-white">Recent activity</h2>
          <Link
            href={`/portal/${slug}/database`}
            className="text-[12px] font-medium text-white/45 transition-colors hover:text-white/70"
          >
            View all →
          </Link>
        </div>

        <div className="mt-4">
          {activity.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-white/40">
              No activity yet. Share a test link to get started.
            </div>
          ) : (
            activity.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 border-t border-white/[0.05] py-3 first:border-t-0"
              >
                <Avatar name={a.name} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-white">{a.name}</div>
                  <div className="truncate text-[12px] text-white/45">
                    {a.testName} · {a.completed ? "Report ready" : "In progress"}
                  </div>
                </div>
                <span className="shrink-0 text-[12px] text-white/40">
                  {relativeTime(a.created)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );

    const checklistCard = (
      <div className="rounded-[16px] border border-white/[0.12] bg-[#0e2a45] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-white">Setup checklist</h3>
          <span className="text-[11px] text-white/40">
            {checklistDone} of {checklist.length}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-white/40">Complete your account setup</p>
        <div className="mt-3 space-y-0.5">
          {checklist.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-2.5 border-t border-white/[0.07] py-2 first:border-t-0"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                  c.done
                    ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                    : "border-white/15 text-transparent"
                }`}
              >
                ✓
              </span>
              <span
                className={`text-[12px] ${
                  c.done ? "text-white/40 line-through decoration-white/20" : "text-white/70"
                }`}
              >
                {c.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <ProgressBar value={checklistPct} className="flex-1" />
          <span className="text-[10px] text-white/40">{checklistPct}%</span>
        </div>
      </div>
    );

    const communityCard = (
      <div className="rounded-[16px] border border-white/[0.12] bg-[#0f3040] p-4">
        <div className="flex items-start gap-3">
          <span className="text-[20px] leading-none">🌐</span>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white">
              Join the MindCanvas community
            </div>
            <p className="mt-1 text-[11px] leading-[16px] text-white/40">
              Ask questions, get support, and learn from other hosts.
            </p>
          </div>
        </div>
        <a
          href="https://community.profiletest.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex h-[30px] items-center justify-center rounded-md border border-white/[0.12] text-[12px] font-medium text-white/65 transition-colors hover:bg-white/[0.05]"
        >
          Join →
        </a>
      </div>
    );

    const testLinksCard = (
      <div className={`${CARD} p-5`}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-white">Test links</h2>
          <Link
            href={`/portal/${slug}/links`}
            className="text-[12px] font-medium text-white/45 transition-colors hover:text-white/70"
          >
            Manage →
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
                <th className="py-3 pr-4">Name</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Submissions</th>
                <th className="py-3 pl-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {links.slice(0, 6).map((l) => (
                <tr key={l.token} className="border-b border-white/[0.05]">
                  <td className="py-3.5 pr-4">
                    <Link
                      href={`/portal/${slug}/dashboard/link/${l.token}`}
                      className="text-[14px] font-medium text-white transition-colors hover:text-[#54AFE0]"
                    >
                      {l.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[#3d6ea8]/50 px-3 py-1 text-[12px] font-medium text-[#4a9cff]">
                      {l.testName}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[14px] text-white/70">Free</td>
                  <td className="px-4 py-3.5 text-[14px] text-white/70">{l.submissions}</td>
                  <td className="py-3.5 pl-4">
                    <Badge tone={l.active ? "emerald" : "neutral"}>
                      {l.active ? "Active" : "Draft"}
                    </Badge>
                  </td>
                </tr>
              ))}

              {links.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[13px] text-white/40">
                    No test links yet. Create one to start collecting submissions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );

    return (
      <div className="space-y-5 text-slate-100" style={{ fontFamily: JAKARTA }}>
        {/* Usage strip */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[14px] border border-white/[0.08] bg-white/[0.02] px-5 py-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.08em] text-white/35">
              {isFreeTrial ? "Trial used" : "Used this month"}
            </span>
            <span className="text-[13px] font-semibold text-white/85">
              {used} of {allowance ?? "∞"}
            </span>
            {allowance ? (
              <ProgressBar
                value={Math.round((used / allowance) * 100)}
                height="h-1"
                className="mt-1 w-[120px]"
              />
            ) : null}
          </div>
          <UsageItem
            label={isFreeTrial ? "Trial remaining" : "Included remaining"}
            value={remaining != null ? `${remaining} remaining` : "Unlimited"}
          />
          <UsageItem label="Additional credits" value="0" />
          <UsageItem label="Reset date" value={formatDate(resetDate)} />
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12px] text-white/50">Billing</span>
            <Link
              href={`/portal/${slug}/billing`}
              className="inline-flex h-[28px] items-center rounded-md border border-white/[0.12] bg-white/[0.04] px-3 text-[12px] font-semibold text-white/70 transition-colors hover:bg-white/[0.08]"
            >
              Manage
            </Link>
          </div>
        </div>

        {/* Billing alert */}
        {(needsBilling || pastDue) && (
          <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-amber-400/[0.18] bg-amber-400/[0.07] px-4 py-2.5">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
            <span className="text-[13px] text-amber-100/90">
              {pastDue
                ? "Payment past due. Update billing to keep test links active."
                : "Card details required before test links can be shared or embedded."}
            </span>
            <Link
              href={`/portal/${slug}/billing`}
              className="ml-auto inline-flex h-[28px] items-center rounded-md border border-amber-400/40 bg-amber-400/10 px-3 text-[12px] font-semibold text-amber-100 transition-colors hover:bg-amber-400/20"
            >
              {pastDue ? "Update billing" : "Add card"}
            </Link>
          </div>
        )}

        {isInternal && (
          <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">✓</span>
            <div>
              <div className="text-[13px] font-bold text-emerald-100">Internal account · Full platform access</div>
              <div className="text-[12px] text-emerald-100/65">All analytics, insights, test engines and unlimited submissions are available.</div>
            </div>
          </div>
        )}

        {/* Pro status banner (active Pro+ orgs) */}
        {isPro && !isInternal && !needsBilling && !pastDue && (
          <ProStatusBanner
            slug={slug}
            planLabel={plan?.label ?? "Pro"}
            submissions={plan?.submissions ?? allowance ?? 35}
            nextTier={plan?.next ?? null}
          />
        )}

        {/* Recommended next action */}
        {needsBilling && (
          <div className="relative overflow-hidden rounded-[16px] border border-[#54AFE0]/20 bg-[linear-gradient(101deg,rgba(26,106,232,0.12)_0%,rgba(74,155,255,0.06)_100%)] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#54AFE0]">
              Recommended next action
            </div>
            <div className="mt-1.5 text-[16px] font-bold text-white">
              Set up billing to activate your first test link
            </div>
            <p className="mt-1 text-[13px] text-white/60">
              Your test link has been created. Add your card to start sharing it with
              clients.
            </p>
            <Link
              href={`/portal/${slug}/billing`}
              className="mt-3 inline-flex h-[32px] items-center rounded-md bg-[#54AFE0] px-4 text-[12px] font-bold text-white shadow-[0_6px_20px_0_rgba(26,106,232,0.38)] transition-opacity hover:opacity-90"
            >
              Set up billing
            </Link>
          </div>
        )}

        {isPro ? (
          /* --- Pro/Niche/Enterprise: full-width stats + unlocked analytics --- */
          <>
            {statsGrid}
            <DashboardAnalytics slug={slug} locked={false} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_345px]">
              {recentActivityCard}
              {checklistCard}
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_345px]">
              {testLinksCard}
              {communityCard}
            </div>
          </>
        ) : (
          /* --- Starter: stats + activity left / checklist + community right --- */
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_345px]">
              <div className="space-y-5">
                {statsGrid}
                {recentActivityCard}
              </div>
              <div className="space-y-5">
                {checklistCard}
                {communityCard}
              </div>
            </div>

            {testLinksCard}

            {/* Locked analytics preview + upgrade prompt (mockup) */}
            <DashboardAnalytics slug={slug} locked />
            <ProUpsellBanner slug={slug} />
          </>
        )}
      </div>
    );
  } catch (err: any) {
    return (
      <div className="space-y-3 p-6 text-red-200">
        <h1 className="text-xl font-semibold">Dashboard error</h1>
        <p className="text-sm">Something went wrong while loading the dashboard.</p>
        <pre className="whitespace-pre-wrap rounded border border-red-700/40 bg-red-950/40 p-3 text-xs">
          {String(err?.message || err)}
        </pre>
      </div>
    );
  }
}

function UsageItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-[0.08em] text-white/35">
        {label}
      </span>
      <span className="text-[13px] font-semibold text-white/85">{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="text-[12px] font-medium text-white/55">{label}</div>
      <div className="mt-2 text-[28px] font-bold leading-none text-white">{value}</div>
      <div className="mt-2 text-[11px] text-white/38">{caption}</div>
    </div>
  );
}
