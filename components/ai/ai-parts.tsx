import { formatDate, formatDateTime } from "@/lib/format";
import type { BackgroundNote, Citation, Claim, GenerationMeta } from "@/types/ai";

export function AiLabel({ meta }: { meta: GenerationMeta }) {
  // Results Newsren produced itself (nothing was sent to the model) must not look AI-generated.
  if (meta.model.startsWith("none")) {
    return (
      <p className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-muted">
        <strong className="font-semibold text-ink">No AI was used here.</strong> There was too little stored text to send to the AI, so Newsren did not make a request.
      </p>
    );
  }
  return (
    <div className="space-y-1 rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent-ink">
      <p className="font-semibold">AI-generated from publisher excerpts</p>
      <p>
        Generated {formatDateTime(meta.generatedAt)} with {meta.model}
        {meta.cached ? " (saved result, no new request)" : ""}. Based on {meta.evidenceCount}{" "}
        {meta.evidenceCount === 1 ? "excerpt" : "excerpts"} from {meta.publisherCount}{" "}
        {meta.publisherCount === 1 ? "publisher" : "publishers"}. These are feed excerpts, not full
        articles, and Newsren has not browsed the web. Articles from one publisher are not
        independent verification. Automated checks catch some unsupported statements but do not
        guarantee accuracy: check the original.
      </p>
    </div>
  );
}

/** Numbered links to the cited originals, e.g. [1]. */
export function CitationChips({ ids, citations }: { ids: string[]; citations: Citation[] }) {
  const cited = ids.map((id) => citations.find((c) => c.ref === id)).filter((c): c is Citation => !!c);
  if (cited.length === 0) return null;
  return (
    <span className="ml-1 whitespace-nowrap">
      {cited.map((c) => (
        <a
          key={c.ref}
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${c.publisher}: ${c.title}`}
          className="mr-0.5 rounded bg-accent-soft px-1 text-xs font-semibold text-accent-ink hover:bg-accent hover:text-white"
        >
          {c.ref.replace(/^S/, "")}
          <span className="sr-only"> source: {c.publisher} (opens in a new tab)</span>
        </a>
      ))}
    </span>
  );
}

export function ClaimParagraph({ claim, citations }: { claim: Claim; citations: Citation[] }) {
  return (
    <p>
      {claim.text}
      <CitationChips ids={claim.sourceIds} citations={citations} />
    </p>
  );
}

export function SourcesUsed({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Sources cited (publisher excerpts)</h3>
      <ol className="space-y-2 text-sm">
        {citations.map((c) => (
          <li key={c.ref} className="flex gap-2">
            <span className="font-semibold text-accent-ink">{c.ref.replace(/^S/, "")}.</span>
            <span>
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline underline-offset-2">
                {c.title}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <span className="block text-muted">
                {c.publisher} · {c.publishedAt ? formatDate(c.publishedAt) : "date not provided"} · retrieved {formatDateTime(c.retrievedAt)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AiError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="space-y-2 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
      <p>{message}</p>
      <p className="text-muted">No AI output is shown for this request.</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="rounded-md border border-line bg-paper px-3 py-1 font-medium hover:border-accent/50">
          Try again
        </button>
      )}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </p>
  );
}

/** Single-source and limited-evidence warnings, derived from the cited sources. */
export function EvidenceNotice({ meta, citations, abstained }: { meta: GenerationMeta; citations: Citation[]; abstained?: boolean }) {
  if (abstained) return null;
  const publishers = [...new Set(citations.map((c) => c.publisher))];
  const count = meta.citedPublisherCount ?? publishers.length;
  return (
    <div className="space-y-1">
      {count <= 1 && (
        <p role="note" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm">
          <strong className="font-semibold">Single source, not independently verified.</strong>{" "}
          Everything cited here comes from {publishers[0] ?? "one publisher"}, so it is that publisher&apos;s account only.
        </p>
      )}
      {meta.evidenceLevel === "limited" && (
        <p role="note" className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-muted">
          <strong className="font-semibold text-ink">Limited brief.</strong> The publisher&apos;s excerpt is short, so this covers only what it states.
        </p>
      )}
    </div>
  );
}

/** Model-written context that is not drawn from, or cited to, the retrieved sources. */
export function BackgroundNotes({ notes }: { notes?: BackgroundNote[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className="space-y-2 rounded-md border border-dashed border-line bg-paper px-4 py-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">General background, not from the sources</h3>
      <ul className="list-disc space-y-1 pl-5 text-base">
        {notes.map((n, i) => (
          <li key={i}>{n.text}</li>
        ))}
      </ul>
      <p className="text-xs text-muted">Written by the AI as general context. It is not cited and not verified by Newsren.</p>
    </div>
  );
}
