// apps/web/app/portal/settings/page.tsx
import 'server-only';
import { getServerSupabase, getActiveOrgId } from '@/app/_lib/portal';
import SettingsForm from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function PortalSettingsPage() {
  const sb = await getServerSupabase();
  const orgId = await getActiveOrgId(sb);

  if (!orgId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-gray-600">No active organization.</p>
      </div>
    );
  }

  // Best-effort: show current org name/slug for context
  const { data: org } = await sb
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .maybeSingle();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        {org && (
          <p className="mt-1 text-sm text-gray-600">
            Editing settings for <span className="font-medium">{org.name}</span>{' '}
            <span className="text-gray-500">({org.slug})</span>
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Branding */}
        <section className="rounded-xl border p-4 space-y-4">
          <h2 className="font-medium">Branding</h2>
          <SettingsForm
            initial={{
              companyName: org?.name ?? '',
              primaryColor: '',
              logoUrl: '',
              supportEmail: '',
            }}
          />
        </section>

        {/* Tips / Preview placeholder */}
        <section className="rounded-xl border p-4 space-y-3">
          <h2 className="font-medium">Tips</h2>
          <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700">
            <li>
              <span className="font-medium">Company Name</span> appears on taker pages and reports.
            </li>
            <li>
              <span className="font-medium">Primary Color</span> should be a HEX
              (e.g. <code>#111827</code>)—used for buttons and accents.
            </li>
            <li>
              <span className="font-medium">Logo URL</span> can be any public image
              (recommended ~512×512 PNG/SVG).
            </li>
            <li>
              <span className="font-medium">Support Email</span> is shown on invites and the completion screen.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
