"use client";

import { AiError, AiLabel, BackgroundNotes, CitationChips, ClaimParagraph, EvidenceNotice, SourcesUsed, Spinner } from "@/components/ai/ai-parts";
import { useAiRequest } from "@/components/ai/use-ai-request";
import { NotConnectedBadge } from "@/components/ui/states";
import type { BriefResult } from "@/types/ai";

export function StoryBrief({ slug, initial, aiAvailable }: { slug: string; initial: BriefResult | null; aiAvailable: boolean }) {
  const { state, run } = useAiRequest<BriefResult>("/api/ai/brief", initial);
  const loading = state.status === "loading";
  const brief = state.status === "done" ? state.data : null;

  return (
    <section aria-labelledby="brief-title" className="space-y-4 rounded-lg border border-line bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="brief-title" className="font-serif text-2xl font-semibold">
          What happened? and Why it matters
        </h2>
        {!aiAvailable && <NotConnectedBadge label="Gemini key not set" />}
      </div>

      {!brief && (
        <>
          <p className="text-muted">
            Generate a short brief from this story&apos;s publisher excerpt and any related stored
            excerpts. It runs only when you ask, and every factual claim is linked to its source.
          </p>
          <button
            type="button"
            disabled={loading || !aiAvailable}
            onClick={() => run({ slug })}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate AI brief"}
          </button>
          {!aiAvailable && <p className="text-sm text-muted">Set GEMINI_API_KEY on the server to enable this.</p>}
        </>
      )}
      {loading && <Spinner label="Reading the excerpts and writing the brief…" />}
      {state.status === "error" && <AiError message={state.message} onRetry={() => run({ slug })} />}

      {brief && (
        <div className="space-y-5">
          <AiLabel meta={brief.meta} />
          <EvidenceNotice meta={brief.meta} citations={brief.citations} abstained={brief.abstained} />
          {brief.abstained ? (
            <p className="text-lg">
              The available excerpts are not enough to brief this story. {brief.abstainReason}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">What happened</h3>
                <div className="space-y-3 text-lg leading-relaxed">
                  {brief.whatHappened.map((c, i) => (
                    <ClaimParagraph key={i} claim={c} citations={brief.citations} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Why it matters</h3>
                <div className="space-y-3 text-lg leading-relaxed">
                  {brief.whyItMatters.map((c, i) => (
                    <div key={i}>
                      <span
                        className={`mr-2 rounded-full border px-2 py-0.5 align-middle text-xs font-medium ${
                          c.kind === "interpretation" ? "border-line bg-paper text-muted" : "border-accent/40 bg-accent-soft text-accent-ink"
                        }`}
                      >
                        {c.kind === "interpretation" ? "Interpretation" : "Reported"}
                      </span>
                      <ClaimParagraph claim={c} citations={brief.citations} />
                    </div>
                  ))}
                </div>
              </div>
              {brief.uncertain.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">What remains uncertain</h3>
                  <ul className="list-disc space-y-2 pl-5 text-lg leading-relaxed">
                    {brief.uncertain.map((c, i) => (
                      <li key={i}>
                        {c.text}
                        <CitationChips ids={c.sourceIds} citations={brief.citations} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <BackgroundNotes notes={brief.background} />
              <SourcesUsed citations={brief.citations} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
