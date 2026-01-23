// apps/web/app/login/page.tsx
import "server-only";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  // Single source of truth for logins
  redirect("/portal/login");
}


