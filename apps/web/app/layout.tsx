export const metadata = {
  title: "MindCanvas (staging)",
  description: "Staging baseline"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
