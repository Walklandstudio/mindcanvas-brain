import PortalChrome from "@/components/layout/PortalChrome";
import { enableDarkGrid } from "@/lib/flags";

export default function Layout({ children }: { children: React.ReactNode }) {
  return enableDarkGrid ? <PortalChrome>{children}</PortalChrome> : <>{children}</>;
}
