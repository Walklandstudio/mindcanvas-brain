// apps/web/app/portal-dashboard/page.tsx
import "server-only";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function Page() {
  // Let middleware handle routing the user to /portal/[orgSlug]/dashboard
  redirect("/portal");
}

