import { notFound } from "next/navigation";

export default function TestPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  // For now, only handle the competency-coach-dna test
  if (slug !== "competency-coach-dna") {
    notFound();
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Test: {slug}</h1>
      <p className="mt-4">
        Welcome to the {slug} test. The survey questions will load here soon.
      </p>
    </main>
  );
}


