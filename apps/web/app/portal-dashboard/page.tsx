// apps/web/app/portal-dashboard/page.tsx
import "server-only";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function Page() {
  // Legacy route: push into the real portal routing
  redirect("/portal");
}

