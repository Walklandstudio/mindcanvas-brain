// Server component for the org home page.
// Fixes: "Cannot find name 'params'" by accepting { params } in the signature.

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type PageProps = {
  params: { orgSlug: string };
};

export default function OrgHomePage({ params }: PageProps) {
  const { orgSlug } = params;

  // Route targets for the tab nav
  const dashboardHref = `/portal/${orgSlug}/dashboard`;
  const databaseHref = `/portal/${orgSlug}/database`;
  const testsHref = `/portal/${orgSlug}/tests`;
  const profileSettingsHref = `/portal/${orgSlug}/profile-settings`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{orgSlug}</h1>
        <Link href="/portal" className="underline">
          Back to admin
        </Link>
      </div>

      {/* Tabs */}
      <nav className="flex gap-3">
        <Link href={dashboardHref} className="btn-tab">
          Dashboard
        </Link>
        <Link href={databaseHref} className="btn-tab">
          Database
        </Link>
        <Link href={testsHref} className="btn-tab">
          Tests
        </Link>
        <Link href={profileSettingsHref} className="btn-tab">
          Profile Settings
        </Link>
      </nav>

      {/* Simple summary cards (static placeholders – wire up data later if desired) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">—</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test takers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">—</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg score (recent)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">—</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
