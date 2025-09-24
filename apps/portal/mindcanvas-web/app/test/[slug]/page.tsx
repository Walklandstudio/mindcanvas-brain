import { notFound } from "next/navigation";

export default function TestPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  if (slug !== "competency-coach-dna") {
    notFound();
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Test: {slug}</h1>
      <p>This is the dynamic test page ✅</p>
    </main>
  );
}



