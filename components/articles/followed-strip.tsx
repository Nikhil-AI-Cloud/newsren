"use client";

import Link from "next/link";
import { useFollowedTopics } from "@/hooks/use-followed-topics";

export function FollowedStrip() {
  const { topics } = useFollowedTopics();
  return (
    <section
      aria-label="Followed topics"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-card px-4 py-3 text-sm"
    >
      <Link href="/following" className="font-semibold text-accent-ink hover:underline">
        Followed sources and saved topics
      </Link>
      {topics.length === 0 ? (
        <span className="text-muted">None yet. Follow a source from a story, or save a topic.</span>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {topics.slice(0, 4).map((t) => (
            <li key={t.id} className="rounded-full bg-accent-soft px-3 py-1 text-accent-ink">
              {t.label}
            </li>
          ))}
          {topics.length > 4 && <li className="py-1 text-muted">+{topics.length - 4} more</li>}
        </ul>
      )}
    </section>
  );
}
