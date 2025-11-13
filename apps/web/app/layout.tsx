import "./globals.css";
import "../styles/branding.css";
import type { ReactNode } from "react";
import { Inter, Manrope } from "next/font/google";

/** Inter = main UI font, Manrope = optional accent via CSS variable */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      {/* Make Inter the default font everywhere */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}

