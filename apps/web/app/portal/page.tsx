// apps/web/app/portal/page.tsx
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/app/_lib/portal";

export default async function PortalIndex() {
  const sb = await getServerSupabase();
  const { data: auth } = await sb.auth.getUser();
  redirect(auth?.user ? "/portal/home" : "/portal/login");
}
