import BackgroundGrid from "@/components/ui/BackgroundGrid";

export default function PortalChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen text-white">
      <BackgroundGrid />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
