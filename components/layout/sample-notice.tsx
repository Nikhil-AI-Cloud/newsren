export function SampleNotice() {
  return (
    <div role="note" className="border-b border-accent/20 bg-accent-soft">
      <p className="mx-auto max-w-5xl px-4 py-2 text-center text-sm text-accent-ink sm:px-6">
        <strong className="font-semibold">Sample content — live sources not connected yet.</strong>{" "}
        Stories, sources, and links here are placeholders (development fixtures).
      </p>
    </div>
  );
}

export function FinanceNotice() {
  return (
    <p role="note" className="rounded-md border border-line bg-card px-4 py-3 text-sm text-muted">
      Finance content is informational and not investment advice. Newsren does not give buy, sell,
      or hold recommendations.
    </p>
  );
}
