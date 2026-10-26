"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { categoryLabel } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { useFollowedTopics } from "@/hooks/use-followed-topics";
import { EmptyState } from "@/components/ui/states";
import type { AiErrorBody } from "@/types/ai";
import type { FollowedTopic, TopicCheckResponse } from "@/types";
import { type CheckStatus, TopicCard } from "./topic-card";

function SourceItem({ t, onRemove }: { t: FollowedTopic; onRemove: () => void }) {
  const fromSample = t.sourceArticleSlug?.startsWith("sample-");
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t.category ? categoryLabel(t.category) : "Any category"}</p>
      <h3 className="font-serif text-xl font-semibold">{t.label}</h3>
      <p className="text-sm text-muted">
        Followed {formatDate(t.followedAt.slice(0, 10))}
        {t.sourceArticleSlug && (
          <>
            {" · "}
            {fromSample ? <span>From a sample story</span> : <Link href={`/story/${t.sourceArticleSlug}`} className="text-accent-ink underline underline-offset-2">From this story</Link>}
          </>
        )}
      </p>
      <p className="text-sm text-muted">Sources are not checked. Save a topic to check for coverage.</p>
      <button type="button" onClick={onRemove} className="self-start rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:border-accent/50">
        Unfollow<span className="sr-only"> {t.label}</span>
      </button>
    </li>
  );
}

export function FollowedTopicsView() {
  const { topics, remove, recordCheck } = useFollowedTopics();
  const [statuses, setStatuses] = useState<Record<string, CheckStatus>>({});
  const [running, setRunning] = useState(false);
  const busy = useRef(false);

  const setStatus = (id: string, s: CheckStatus) => setStatuses((prev) => ({ ...prev, [id]: s }));

  const checkOne = useCallback(
    async (t: FollowedTopic) => {
      setStatus(t.id, { state: "checking" });
      try {
        const res = await fetch("/api/topics/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ topic: t.label, category: t.category }),
          signal: AbortSignal.timeout(60_000),
        });
        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          setStatus(t.id, { state: "error", message: (json as AiErrorBody | null)?.error?.message ?? "Something went wrong. Please try again." });
          return;
        }
        recordCheck(t.id, json as TopicCheckResponse);
        setStatus(t.id, { state: "idle" });
      } catch {
        setStatus(t.id, { state: "error", message: "Could not reach Newsren. Check your connection and try again." });
      }
    },
    [recordCheck],
  );

  /** One check at a time, so a double click cannot start two refreshes. */
  const run = useCallback(
    async (list: FollowedTopic[]) => {
      if (busy.current) return;
      busy.current = true;
      setRunning(true);
      try {
        for (const t of list) await checkOne(t);
      } finally {
        busy.current = false;
        setRunning(false);
      }
    },
    [checkOne],
  );

  if (topics.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        description="Follow a source from a story page, or save a topic or question above."
        action={
          <Link href="/" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink">
            Browse stories
          </Link>
        }
      />
    );
  }

  const sources = topics.filter((t) => t.kind === "source");
  const saved = topics.filter((t) => t.kind === "topic");

  return (
    <div className="space-y-8">
      <div className="space-y-2 rounded-lg border border-line bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={running || saved.length === 0}
            onClick={() => run(saved)}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? "Checking…" : "Check updates"}
          </button>
          <span className="text-sm font-medium">Manual updates — checked when you click</span>
        </div>
        <p className="text-sm text-muted">
          Nothing is monitored in the background. Each check refreshes Newsren&apos;s approved feeds (at most once every few minutes) and searches the articles it has stored. Saved topics, your starting point, and results are stored only in this browser.
        </p>
        {saved.length === 0 && <p className="text-sm text-muted">Save a topic above to check it. Followed sources are not checked.</p>}
      </div>

      {saved.length > 0 && (
        <section className="space-y-3" aria-label="Saved topics and questions">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Saved topics and questions</h2>
            <p className="text-sm text-muted">Local to this browser. Checked only when you click.</p>
          </div>
          <ul className="grid gap-4">
            {saved.map((t) => (
              <TopicCard key={t.id} topic={t} status={statuses[t.id] ?? { state: "idle" }} busy={running} onCheck={() => run([t])} onRemove={() => remove(t.id)} />
            ))}
          </ul>
        </section>
      )}

      {sources.length > 0 && (
        <section className="space-y-3" aria-label="Followed sources">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Followed sources</h2>
            <p className="text-sm text-muted">Publisher feeds you chose to follow. Not monitored or checked.</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {sources.map((t) => (
              <SourceItem key={t.id} t={t} onRemove={() => remove(t.id)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
