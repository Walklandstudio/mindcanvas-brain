import './globals.css';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Default fallback
  let bg = '#0b1220';
  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const r = await fetch(`${origin}/api/onboarding/branding/get`, { cache: 'no-store' });
    const j = await r.json();
    if (j?.branding?.background) bg = j.branding.background as string;
  } catch {}

  return (
    <html lang="en">
      <body style={{ background: bg }}>{children}</body>
    </html>
  );
}
