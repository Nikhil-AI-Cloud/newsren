import { formatDate, formatDateTime } from "@/lib/format";
import type { Article, Source } from "@/types";
import { NotConnectedBadge } from "@/components/ui/states";

export function Provenance({
  article,
  source,
}: {
  article: Article;
  source: Source | undefined;
}) {
  const p = article.provenance;
  return (
    <section aria-labelledby="provenance-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="provenance-title" className="font-serif text-2xl font-semibold">
          Source and provenance
        </h2>
        <NotConnectedBadge label="Evidence checking not connected yet" />
      </div>
      <dl className="divide-y divide-line rounded-lg border border-line bg-card text-sm">
        <Row term="Publisher">{source?.name ?? "Unknown source"}</Row>
        {p && <Row term="Feed">{p.feedName}</Row>}
        <Row term="Original article">
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-accent-ink underline underline-offset-2 hover:text-accent"
          >
            {article.originalUrl}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Row>
        <Row term="Published">
          {article.publishedAt ? formatDate(article.publishedAt) : "Not provided by the source"}
        </Row>
        <Row term="Retrieved by Newsren">
          {article.retrievedAt ? formatDateTime(article.retrievedAt) : "Not retrieved (sample)"}
        </Row>
      </dl>
      <p className="text-sm text-muted">
        The link above shows where this story came from. It is provenance, not independent
        corroboration. Newsren has not compared this story with other reporting or checked its
        claims.
      </p>
    </section>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 p-4 sm:grid-cols-[11rem_1fr]">
      <dt className="font-medium text-muted">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}
