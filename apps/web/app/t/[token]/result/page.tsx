export default function Result({ params }: { params: { token: string } }) {
  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Result</h1>
      <p className="text-slate-700">Thanks — your responses were recorded (demo flow).</p>
      <a href="/" className="text-slate-600 underline text-sm">Back to home</a>
    </div>
  );
}
