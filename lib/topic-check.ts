import type { MatchedItem, TopicCheckResponse, TopicCheckResult, TopicCheckState } from "@/types";

/** Baseline size cap; oldest ids drop first. */
export const MAX_SEEN = 300;

/**
 * Folds a successful check into the saved state. First check (no `prev`) is the
 * "initial coverage" baseline; later checks keep only matches not already seen.
 * Failed checks never call this, so they cannot advance the baseline or erase results.
 */
export function applyCheck(prev: TopicCheckState | undefined, resp: TopicCheckResponse): TopicCheckState {
  const seen = new Set(prev?.seenIds ?? []);
  const kind: TopicCheckResult["kind"] = prev ? "new" : "initial";
  const items: MatchedItem[] = kind === "initial" ? resp.matches : resp.matches.filter((m) => !seen.has(m.id));
  const result: TopicCheckResult = {
    kind,
    checkedAt: resp.checkedAt,
    feedsRefreshedAt: resp.feedsRefreshedAt,
    items,
    alreadySeenCount: resp.matches.length - items.length,
    unavailableSources: resp.unavailableSources,
    staleSources: resp.staleSources,
  };
  const seenIds = [...(prev?.seenIds ?? []), ...resp.matches.map((m) => m.id).filter((id) => !seen.has(id))].slice(-MAX_SEEN);
  return {
    lastCheckedAt: resp.checkedAt,
    seenIds,
    lastResult: result,
    lastCoverage: items.length > 0 ? result : (prev?.lastCoverage ?? null),
  };
}
