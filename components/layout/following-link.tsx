"use client";

import Link from "next/link";
import { useFollowedTopics } from "@/hooks/use-followed-topics";

export function FollowingLink() {
  const { topics } = useFollowedTopics();
  return (
    <Link
      href="/following"
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-accent-soft"
    >
      Following
      <span
        aria-label={`${topics.length} followed topics`}
        className="min-w-5 rounded-full bg-accent px-1.5 text-center text-xs font-semibold leading-5 text-white"
      >
        {topics.length}
      </span>
    </Link>
  );
}
