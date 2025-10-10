import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MindCanvas",
  description: "Create, brand, deploy, and analyze Signature profile tests",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-screen bg-[#050914] text-white">{children}</body>
    </html>
  );
}
