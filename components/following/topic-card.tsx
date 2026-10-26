"use client";

import Link from "next/link";
import { AiError, AiLabel, ClaimParagraph, EvidenceNotice, SourcesUsed, Spinner } from "@/components/ai/ai-parts";
import { useAiRequest } from "@/components/ai/use-ai-request";
import { categoryLabel } from "@/lib/categories";
import { formatDate, formatDateTime } from "@/lib/format";
import type { FollowedTopic, MatchedItem, TopicCheckResult } from "@/types";
import type { UpdateRelation, UpdatesResult } from "@/types/ai";

export type CheckStatus = { state: "idle" } | { state: "checking" } | { state: "error"; message: string };

const RELATION: Record<UpdateRelation, string> = {
  new_development_reported: "Reports a development",
  another_report_of_known_event: "Another report of a known event",
  cannot_tell: "Cannot tell from the excerpt",
};

function Coverage({ result }: { result: TopicCheckResult }) {
  return (
    <ul className="space-y-3">
      {result.items.map((m: MatchedItem) => (
        <li key={m.id} className="rounded-md border border-line bg-paper p-3">
          <Link href={`/story/${m.slug}`} className="font-medium text-accent-ink underline underline-offset-2">
            {m.title}
          </Link>
          <p className="mt-1 text-sm text-muted">
            {m.publisher} · {categoryLabel(m.category)} · Published {m.publishedAt ? formatDate(m.publishedAt) : "(date not provided)"} · First retrieved by Newsren {formatDateTime(m.firstRetrievedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ResultBlock({ result, heading }: { result: TopicCheckResult; heading?: string }) {
  const title = heading ?? (result.kind === "initial" ? "Initial coverage" : "New matching coverage");
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {title} · checked {formatDateTime(result.checkedAt)}
      </h4>
      {result.items.length > 0 ? (
        <Coverage result={result} />
      ) : (
        <p className="rounded-md border border-dashed border-line bg-paper p-3 text-sm">
          {result.kind === "initial"
            ? "No stored articles match this topic yet. This check set your starting point, so later matches will show as new."
            : "No new matching coverage found in this check."}
          {result.alreadySeenCount > 0 ? ` ${result.alreadySeenCount} earlier match${result.alreadySeenCount === 1 ? " was" : "es were"} already shown and not repeated.` : ""}
        </p>
      )}
      {result.items.length > 0 && result.alreadySeenCount > 0 && (
        <p className="text-sm text-muted">{result.alreadySeenCount} earlier match{result.alreadySeenCount === 1 ? "" : "es"} already shown, not repeated.</p>
      )}
    </div>
  );
}

function Explain({ topic }: { topic: FollowedTopic }) {
  const check = topic.check!;
  const newIds = check.lastResult.items.map((m) => m.id);
  const seenIds = check.seenIds.filter((id) => !newIds.includes(id));
  const { state, run } = useAiRequest<UpdatesResult>("/api/ai/updates");
  const loading = state.status === "loading";
  const result = state.status === "done" ? state.data : null;
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={loading}
        onClick={() => run({ topic: topic.label, newIds, seenIds })}
        className="rounded-md border border-accent bg-card px-3 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Explaining…" : "Explain these updates (AI)"}
      </button>
      {loading && <Spinner label="Reading the new excerpts…" />}
      {state.status === "error" && <AiError message={state.message} />}
      {result && (
        <div className="space-y-3">
          <AiLabel meta={result.meta} />
          <EvidenceNotice meta={result.meta} citations={result.citations} abstained={result.abstained} />
          {result.abstained ? (
            <p>The excerpts do not establish what changed. {result.abstainReason}</p>
          ) : (
            <>
              <ul className="space-y-3">
                {result.items.map((it, i) => (
                  <li key={i} className="space-y-1">
                    <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs font-medium text-muted">{RELATION[it.relation]}</span>
                    <ClaimParagraph claim={it} citations={result.citations} />
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted">
                <span className="font-semibold">What the excerpts do not establish: </span>
                {result.cannotEstablish}
              </p>
              <SourcesUsed citations={result.citations} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function TopicCard({
  topic,
  status,
  onCheck,
  onRemove,
  busy,
}: {
  topic: FollowedTopic;
  status: CheckStatus;
  onCheck: () => void;
  onRemove: () => void;
  /** Another check is running; one at a time. */
  busy: boolean;
}) {
  const check = topic.check;
  const result = check?.lastResult;
  const checking = status.state === "checking";
  return (
    <li className="space-y-4 rounded-lg border border-line bg-card p-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{topic.category ? categoryLabel(topic.category) : "Any category"}</p>
        <h3 className="font-serif text-xl font-semibold">{topic.label}</h3>
        <p className="text-sm font-medium text-muted">Manual updates — checked when you click</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onCheck}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {checking ? "Checking…" : "Check for updates"}
          <span className="sr-only"> {topic.label}</span>
        </button>
        <button type="button" onClick={onRemove} className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:border-accent/50">
          Remove<span className="sr-only"> {topic.label}</span>
        </button>
      </div>

      {checking && <Spinner label="Refreshing sources and searching stored articles…" />}
      {status.state === "error" && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
          <p className="font-semibold">This check failed.</p>
          <p>{status.message}</p>
          <p className="text-muted">
            {check ? `Your results and baseline from the last successful check (${formatDateTime(check.lastCheckedAt)}) are unchanged.` : "Nothing was saved, so the next check will still set your starting point."}
          </p>
        </div>
      )}

      {!check && status.state !== "checking" && (
        <p className="text-sm text-muted">
          Not checked yet. The first check shows existing matching coverage as your starting point (“Initial coverage”). Later checks show only articles you have not seen.
        </p>
      )}

      {result && (
        <div className="space-y-4">
          {(result.unavailableSources.length > 0 || result.staleSources.length > 0) && (
            <p role="status" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
              <strong className="font-semibold">Partial check: coverage may be incomplete.</strong>
              {result.unavailableSources.length > 0 ? ` Unavailable: ${result.unavailableSources.join(", ")}.` : ""}
              {result.staleSources.length > 0 ? ` Showing older stored items for: ${result.staleSources.join(", ")}.` : ""}
            </p>
          )}
          <p className="text-xs text-muted">
            Sources last refreshed {result.feedsRefreshedAt ? formatDateTime(result.feedsRefreshedAt) : "(unknown)"}. Refreshes are limited to once every few minutes, so checking again right away may find nothing new.
          </p>
          <ResultBlock result={result} />
          {result.items.length === 0 && check.lastCoverage && (
            <details className="rounded-md border border-line bg-paper px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium">
                Earlier coverage you have already seen ({check.lastCoverage.items.length}) · {check.lastCoverage.kind === "initial" ? "initial coverage" : "new matching coverage"} from the check on {formatDateTime(check.lastCoverage.checkedAt)}
              </summary>
              <div className="mt-3">
                <Coverage result={check.lastCoverage} />
              </div>
            </details>
          )}
          {result.kind === "new" && result.items.length > 0 && <Explain topic={topic} />}
          <p className="text-xs text-muted">
            Matches come from keywords in headlines and publisher excerpts, so they can be off-topic or miss different wording. “New matching coverage” means Newsren has stored an article it has not shown you before. It does not mean a new real-world event happened, and dates shown are the publisher&apos;s and Newsren&apos;s retrieval time, not when an event occurred.
          </p>
        </div>
      )}
    </li>
  );
}
