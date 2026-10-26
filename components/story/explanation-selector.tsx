"use client";

import { useId, useState } from "react";
import { AiError, AiLabel, BackgroundNotes, ClaimParagraph, EvidenceNotice, SourcesUsed, Spinner } from "@/components/ai/ai-parts";
import { useAiRequest } from "@/components/ai/use-ai-request";
import { NotConnectedBadge } from "@/components/ui/states";
import { EXPLANATION_MODES } from "@/lib/categories";
import type { Briefing, ExplanationMode } from "@/types";
import type { ExplanationResult } from "@/types/ai";

/** Sample fixtures only: switches between hand-written placeholder explanations. */
function SampleExplanations({ explanations }: { explanations: Briefing["explanations"] }) {
  const [mode, setMode] = useState<ExplanationMode>("student");
  const groupId = useId();
  const active = EXPLANATION_MODES.find((m) => m.id === mode)!;
  return (
    <section aria-labelledby={`${groupId}-title`} className="space-y-4">
      <h2 id={`${groupId}-title`} className="font-serif text-2xl font-semibold">
        Explain for
      </h2>
      <div role="radiogroup" aria-labelledby={`${groupId}-title`} className="inline-flex rounded-lg border border-line bg-card p-1">
        {EXPLANATION_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === m.id ? "bg-accent text-white" : "text-ink hover:bg-accent-soft"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{active.hint}</p>
      <div aria-live="polite" className="space-y-4 text-lg leading-relaxed">
        {explanations[mode].map((p, i) => (
          <p key={`${mode}-${i}`}>{p}</p>
        ))}
      </div>
    </section>
  );
}

function AudiencePanel({
  slug,
  mode,
  initial,
  aiAvailable,
}: {
  slug: string;
  mode: ExplanationMode;
  initial: ExplanationResult | null;
  aiAvailable: boolean;
}) {
  const { state, run } = useAiRequest<ExplanationResult>("/api/ai/explain", initial);
  const label = EXPLANATION_MODES.find((m) => m.id === mode)!.label;
  const loading = state.status === "loading";
  const result = state.status === "done" ? state.data : null;

  return (
    <div className="space-y-4">
      {!result && (
        <button
          type="button"
          disabled={loading || !aiAvailable}
          onClick={() => run({ slug, audience: mode })}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating…" : `Generate ${label} explanation`}
        </button>
      )}
      {loading && <Spinner label={`Writing the ${label.toLowerCase()} explanation…`} />}
      {state.status === "error" && <AiError message={state.message} onRetry={() => run({ slug, audience: mode })} />}
      {result && (
        <div className="space-y-4">
          <AiLabel meta={result.meta} />
          <EvidenceNotice meta={result.meta} citations={result.citations} abstained={result.abstained} />
          {result.abstained ? (
            <p className="text-lg">The available excerpts are not enough to explain this story. {result.abstainReason}</p>
          ) : (
            <>
              <div className="space-y-4 text-lg leading-relaxed">
                {result.paragraphs.map((c, i) => (
                  <ClaimParagraph key={i} claim={c} citations={result.citations} />
                ))}
              </div>
              {result.discussionQuestions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Discussion questions</h3>
                  <ul className="list-disc space-y-1 pl-5 text-lg">
                    {result.discussionQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.limitations && (
                <p className="text-sm text-muted">
                  <span className="font-semibold">Limits of the evidence: </span>
                  {result.limitations}
                </p>
              )}
              <BackgroundNotes notes={result.background} />
              <SourcesUsed citations={result.citations} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Live stories: each audience is generated on demand and kept separately (previously
 * generated ones arrive as `initial`). Sample stories: placeholder fixtures.
 */
export function ExplanationSelector({
  slug,
  sample,
  initial,
  aiAvailable,
}: {
  slug: string;
  sample: Briefing["explanations"] | null;
  initial: Partial<Record<ExplanationMode, ExplanationResult>>;
  aiAvailable: boolean;
}) {
  const [mode, setMode] = useState<ExplanationMode>("student");
  const groupId = useId();
  if (sample) return <SampleExplanations explanations={sample} />;
  const active = EXPLANATION_MODES.find((m) => m.id === mode)!;

  return (
    <section aria-labelledby={`${groupId}-title`} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${groupId}-title`} className="font-serif text-2xl font-semibold">
          Explain for
        </h2>
        {!aiAvailable && <NotConnectedBadge label="Gemini key not set" />}
      </div>
      <div role="radiogroup" aria-labelledby={`${groupId}-title`} className="inline-flex rounded-lg border border-line bg-card p-1">
        {EXPLANATION_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === m.id ? "bg-accent text-white" : "text-ink hover:bg-accent-soft"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{active.hint}. Generated only when you ask, from the same excerpts.</p>
      {/* One panel per audience, kept mounted so each keeps its own result. */}
      {EXPLANATION_MODES.map((m) => (
        <div key={m.id} hidden={m.id !== mode}>
          <AudiencePanel slug={slug} mode={m.id} initial={initial[m.id] ?? null} aiAvailable={aiAvailable} />
        </div>
      ))}
    </section>
  );
}
