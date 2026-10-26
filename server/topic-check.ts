import type { Category, FeedStatus, MatchedItem, TopicCheckResponse } from "../types/index.ts";
import { AiError } from "./ai/errors.ts";
import { searchTopic } from "./ai/retrieve.ts";

export const TOPIC_MIN = 3;
export const TOPIC_MAX = 140;
const CATEGORIES = ["technology", "education", "industry", "finance"];

export function parseTopicRequest(body: Record<string, unknown>): { topic: string; category: Category | null } {
  const topic = typeof body.topic === "string" ? body.topic.trim().replace(/\s+/g, " ") : "";
  if (topic.length < TOPIC_MIN || topic.length > TOPIC_MAX) {
    throw new AiError("bad_request", `The topic must be ${TOPIC_MIN} to ${TOPIC_MAX} characters.`, 400);
  }
  const category = typeof body.category === "string" && CATEGORIES.includes(body.category) ? (body.category as Category) : null;
  return { topic, category };
}

/**
 * Searches stored articles for a topic after the caller has refreshed feeds.
 * If no source could be refreshed the check fails outright, so the caller's
 * saved baseline is left alone. Partial failures are reported, not hidden.
 */
export function buildCheckResponse(topic: string, category: Category | null, statuses: FeedStatus[], now: Date): TopicCheckResponse {
  if (statuses.length > 0 && statuses.every((s) => s.state !== "ok")) {
    throw new AiError("sources_unavailable", "No news source could be refreshed just now, so this check did not run. Your previous results are unchanged.", 503);
  }
  const matches: MatchedItem[] = searchTopic(topic, { category }).map((m) => ({ ...m, category: m.category as Category }));
  const refreshed = statuses.reduce<string | null>((latest, s) => (s.retrievedAt && (!latest || s.retrievedAt > latest) ? s.retrievedAt : latest), null);
  const scoped = (s: FeedStatus) => !category || s.category === category;
  return {
    checkedAt: now.toISOString(),
    feedsRefreshedAt: refreshed,
    matches,
    unavailableSources: statuses.filter((s) => scoped(s) && s.state === "failed").map((s) => s.name),
    staleSources: statuses.filter((s) => scoped(s) && s.state === "stale").map((s) => s.name),
  };
}
