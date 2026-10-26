"use client";

import { useId, useState } from "react";
import { AiError, AiLabel, ClaimParagraph, EvidenceNotice, SourcesUsed, Spinner } from "@/components/ai/ai-parts";
import { useAiRequest } from "@/components/ai/use-ai-request";
import { NotConnectedBadge } from "@/components/ui/states";
import type { AnswerResult } from "@/types/ai";

const MAX = 300;

/** Questions are answered only from stored publisher excerpts, retrieved fresh for each question. */
export function AskNewsren({ slug, enabled, aiAvailable }: { slug: string; enabled: boolean; aiAvailable: boolean }) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const { state, run } = useAiRequest<AnswerResult>("/api/ai/ask");
  const loading = state.status === "loading";
  const usable = enabled && aiAvailable;
  const answer = state.status === "done" ? state.data : null;

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-3 rounded-lg border border-line bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="font-serif text-2xl font-semibold">
          Ask Newsren
        </h2>
        {!enabled ? <NotConnectedBadge label="Not available for sample stories" /> : !aiAvailable ? <NotConnectedBadge label="Gemini key not set" /> : null}
      </div>
      <p className="text-muted">
        Answers use only the publisher excerpts Newsren has stored, starting with this story. It
        does not browse the web or read full articles, and it will say so when the sources do not
        establish an answer.
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (usable && !loading && question.trim().length >= 5) run({ slug, question });
        }}
      >
        <label htmlFor={`${id}-input`} className="sr-only">
          Your question about this story
        </label>
        <textarea
          id={`${id}-input`}
          disabled={!usable}
          rows={3}
          maxLength={MAX}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this story or its topic…"
          className="w-full rounded-md border border-line bg-paper px-3 py-2 text-base disabled:cursor-not-allowed disabled:opacity-70"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!usable || loading || question.trim().length < 5}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Asking…" : "Ask"}
          </button>
          <span className="text-xs text-muted">
            {question.length}/{MAX}
          </span>
        </div>
      </form>
      {loading && <Spinner label="Searching the stored excerpts and writing an answer…" />}
      {state.status === "error" && <AiError message={state.message} />}
      {answer && (
        <div className="space-y-4">
          <AiLabel meta={answer.meta} />
          <EvidenceNotice meta={answer.meta} citations={answer.citations} abstained={!answer.answerable} />
          <p className="text-sm text-muted">Question: {answer.question}</p>
          {answer.answerable ? (
            <div className="space-y-3 text-lg leading-relaxed">
              {answer.claims.map((c, i) => (
                <ClaimParagraph key={i} claim={c} citations={answer.citations} />
              ))}
            </div>
          ) : (
            <p className="text-lg">The available sources do not establish an answer to this question.</p>
          )}
          <p className="text-sm text-muted">
            <span className="font-semibold">Limits of the evidence: </span>
            {answer.limitations}
          </p>
          <SourcesUsed citations={answer.citations} />
        </div>
      )}
    </section>
  );
}
