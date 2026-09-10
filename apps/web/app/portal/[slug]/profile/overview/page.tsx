import Link from "next/link";
import { getAdminClient, getServerSupabase } from "@/app/_lib/portal";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { PortalCard } from "@/components/portal/PortalCard";
import { JAKARTA_STYLE, primaryBtnClass } from "@/components/portal/ui";
import { notFound } from "next/navigation";
import { requireOrgAccess } from "@/lib/server/orgAccess";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = await getAdminClient();
  const portal = admin.schema("portal");
  const session = await getServerSupabase();
  const { data: authData } = await session.auth.getUser();
  const user = authData.user;
  const meta = (user?.user_metadata ?? {}) as Record<string, string>;
  const displayName = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || meta.full_name || user?.email || "Account owner";

  const { data: org } = await portal.from("orgs").select("id,name,website_url,industry,primary_contact_name,primary_contact_email,logo_url,brand_primary,brand_secondary").eq("slug", slug).maybeSingle();
  const orgId = org?.id ?? "";
  const accessCheck = await requireOrgAccess(orgId);
  if (!accessCheck.ok) notFound();
  const [billing, entitlement, links, submissions, access, membership] = orgId ? await Promise.all([
    portal.from("billing_accounts").select("tier,stripe_status,billing_interval").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    portal.from("entitlements").select("included_trials_per_month,extra_trials_purchased,status").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    portal.from("test_links").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    portal.from("test_takers").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "completed"),
    portal.from("org_test_access").select("test_id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "active"),
    user ? portal.from("user_orgs").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]) : [{ data: null }, { data: null }, { count: 0 }, { count: 0 }, { count: 0 }, { data: null }] as const;

  const completedFields = [org?.name, org?.website_url, org?.industry, org?.primary_contact_name, org?.primary_contact_email, org?.logo_url, org?.brand_primary, org?.brand_secondary].filter(Boolean).length;
  const organisationPercent = Math.round((completedFields / 8) * 100);
  const tier = billing.data?.tier;
  const planName = tier ? ["", "Starter", "Pro", "Growth", "Enterprise"][tier] ?? `Tier ${tier}` : "Not set up";
  const status = billing.data?.stripe_status ?? "Not set up";
  const allowance = (entitlement.data?.included_trials_per_month ?? 0) + (entitlement.data?.extra_trials_purchased ?? 0);
  const used = submissions.count ?? 0;

  return <div style={JAKARTA_STYLE} className="space-y-6 text-slate-100">
    <PortalPageHeader title="Overview" subtitle="Manage your account, organisation, billing and settings." />
    <PortalCard title={displayName} description={user?.email ?? "Signed-in MindCanvas user"}><div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-white/55">{membership.data?.role?.replaceAll("_", " ") || "Organisation member"} · {org?.name || slug}</p><div className="flex gap-3"><Link href={`/portal/${slug}/profile`} className={primaryBtnClass}>Edit my account</Link><Link href={`/portal/${slug}/profile/organisation`} className={primaryBtnClass}>Organisation settings</Link></div></div></PortalCard>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Summary title="Organisation" value={`${organisationPercent}% complete`} detail="Details, contacts and branding" href={`/portal/${slug}/profile/checklist`} action="View checklist" />
      <Summary title="Plan & billing" value={planName} detail={status} href={`/portal/${slug}/billing`} action="Manage billing" />
      <Summary title="Assessment usage" value={allowance ? `${used} of ${allowance}` : `${used} completed`} detail="Assessments recorded" href={`/portal/${slug}/billing`} action="View usage" />
      <Summary title="Access" value={`${access.count ?? 0} test engine${access.count === 1 ? "" : "s"}`} detail="Available to your organisation" href={`/portal/${slug}/tests`} action="View tests" />
    </div>
    <PortalCard title="Quick actions" description="Only launch-ready actions are shown."><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Action title="Complete organisation details" href={`/portal/${slug}/profile/organisation`} /><Action title="Add branding" href={`/portal/${slug}/profile/logo`} /><Action title="Create a test link" href={`/portal/${slug}/tests`} /><Action title="Manage billing" href={`/portal/${slug}/billing`} /></div></PortalCard>
    <p className="text-xs text-white/35">{links.count ?? 0} test links created · {submissions.count ?? 0} assessments completed</p>
  </div>;
}

function Summary({ title, value, detail, href, action }: { title: string; value: string; detail: string; href: string; action: string }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-[#0b2b46]/80 p-5"><p className="text-xs text-white/45">{title}</p><p className="mt-2 text-xl font-semibold text-white">{value}</p><p className="mt-1 text-xs capitalize text-white/45">{detail}</p><Link href={href} className="mt-5 inline-block text-xs font-semibold text-[#64bae2]">{action} →</Link></div>;
}
function Action({ title, href }: { title: string; href: string }) { return <Link href={href} className="rounded-xl border border-white/[0.08] bg-[#061d31] p-4 text-sm font-semibold text-white transition hover:border-[#64bae2]/50">{title}<span className="mt-4 block text-xs text-[#64bae2]">Open →</span></Link>; }
