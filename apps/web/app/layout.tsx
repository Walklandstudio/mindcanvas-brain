import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MindCanvas',
  description: 'Signature Profiling System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="mc-bg text-white antialiased">
        {/* Optional fade + max-width wrapper to keep pages tidy */}
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
