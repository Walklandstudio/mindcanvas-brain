import { redirect } from "next/navigation";

export default function PortalIndex() {
  // Single-source flow: always use Admin as the entry to the portal.
  redirect("/admin");
}
