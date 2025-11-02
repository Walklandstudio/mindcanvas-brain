import './globals.css';
import '../styles/branding.css';
import type { ReactNode } from 'react';
import { Inter, Manrope } from 'next/font/google';

/** Swap these to your deck fonts if needed */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
