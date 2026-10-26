"use client";

import { useFollowedTopics, type FollowSourceInput } from "@/hooks/use-followed-topics";

/** Follows the story's publisher feed. Monitoring is not connected yet. */
export function FollowButton({ source }: { source: FollowSourceInput }) {
  const { isFollowing, followSource, remove } = useFollowedTopics();
  const following = isFollowing(source.id);

  return (
    <button
      type="button"
      aria-pressed={following}
      onClick={() => (following ? remove(source.id) : followSource(source))}
      className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
        following
          ? "border-accent bg-accent-soft text-accent-ink hover:bg-accent-soft/60"
          : "border-accent bg-accent text-white hover:bg-accent-ink"
      }`}
    >
      {following ? "Following source ✓" : "Follow source"}
    </button>
  );
}
