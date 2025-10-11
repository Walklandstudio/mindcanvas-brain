import './globals.css';
import { getBrandTokens } from './api/_lib/brand';

export const metadata = { title: 'MindCanvas' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBrandTokens();

  // expose as CSS variables
  const vars: React.CSSProperties = {
    // @ts-ignore
    '--brand-bg': brand.background,
    '--brand-primary': brand.primary,
    '--brand-secondary': brand.secondary,
    '--brand-accent': brand.accent,
    '--brand-font': brand.font,
  };

  return (
    <html lang="en">
      <body style={{ background: 'var(--brand-bg)' }} className="text-white" >
        <div style={vars as any}>
          {children}
        </div>
      </body>
    </html>
  );
}
