// app/report/[id]/FlowBlock.tsx
type Props = {
  name: string;
  overview?: string | null;
  strengths?: string[];
  watchouts?: string[];
  tips?: string[];
  longform?: string | null;
};

export default function FlowBlock({
  name,
  overview,
  strengths = [],
  watchouts = [],
  tips = [],
  longform,
}: Props) {
  return (
    <section className="border rounded-xl p-4 grid gap-4">
      <h3 className="text-lg font-semibold">{name}</h3>

      {overview && (
        <p className="text-sm leading-6 text-gray-800 whitespace-pre-wrap">
          {overview}
        </p>
      )}

      {longform && (
        <div>
          <h4 className="font-semibold mb-1">About this Coaching Flow</h4>
          <div className="text-sm leading-6 whitespace-pre-wrap">{longform}</div>
        </div>
      )}

      {strengths.length > 0 && (
        <div>
          <h4 className="font-semibold mb-1">Strengths</h4>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {watchouts.length > 0 && (
        <div>
          <h4 className="font-semibold mb-1">Watch-outs</h4>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {watchouts.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {tips.length > 0 && (
        <div>
          <h4 className="font-semibold mb-1">Tips</h4>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {tips.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
