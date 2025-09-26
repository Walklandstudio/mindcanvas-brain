// app/test/[slug]/page.tsx
import TestClient from "./TestClient";
import { getTestConfig } from "@/lib/testConfigs";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const testConfig = getTestConfig(slug);

  if (!testConfig) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Test not found</h1>
        <p className="text-sm text-gray-600">Unknown slug: {slug}</p>
      </main>
    );
  }

  // Pass config down as a normal prop to the *client* component
  return <TestClient testConfig={testConfig} />;
}




