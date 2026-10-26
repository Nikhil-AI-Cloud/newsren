import { formatDate } from "@/lib/format";
import type { EvidenceItem, Source } from "@/types";

const KIND_LABEL: Record<Source["kind"], string> = {
  publisher: "Reporting",
  primary: "Primary source",
  independent: "Independent",
  research: "Research",
  regulator: "Regulator",
};

export function EvidenceList({
  items,
}: {
  items: (EvidenceItem & { source: Source | undefined })[];
}) {
  return (
    <section aria-labelledby="evidence-title" className="space-y-4">
      <h2 id="evidence-title" className="font-serif text-2xl font-semibold">
        Evidence and sources
      </h2>
      <ul className="divide-y divide-line rounded-lg border border-line bg-card">
        {items.map((item) => (
          <li key={item.id} className="space-y-1 p-4">
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <span className="font-medium text-ink">{item.source?.name ?? "Unknown source"}</span>
              {item.source && (
                <span className="rounded-full border border-line px-2 py-0.5 text-xs">
                  {KIND_LABEL[item.source.kind]}
                </span>
              )}
              <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
            </p>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent-ink underline underline-offset-2 hover:text-accent"
            >
              {item.title}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <p className="text-sm text-muted">Supports: {item.supports}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Sample evidence only. Links are placeholders, and retrieval times are not recorded until
        live sources are connected.
      </p>
    </section>
  );
}
