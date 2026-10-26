import "server-only";

import { blockedFeedIds } from "../config";
import { type StoredItem, lastAttemptMs, recordFailure, recordSuccess, syncFeeds } from "../store";
import { fetchFeedXml } from "./fetch";
import { articleId, makeSlug } from "./ids";
import { parseFeed } from "./parse";
import { type FeedConfig, FEEDS } from "./registry";
import { htmlToText, stripBoilerplate, truncate } from "./text";

const EXCERPT_MAX = 300;
/** Dated items older than this are not "latest" news and are skipped; undated items are kept. */
const MAX_AGE_MS = 120 * 24 * 60 * 60 * 1000;

function refreshMs(): number {
  const s = Number(process.env.NEWSREN_REFRESH_SECONDS);
  return (Number.isFinite(s) && s >= 0 ? s : 600) * 1000;
}

const g = globalThis as unknown as { __newsrenRefresh?: { atMs: number; inflight: Promise<void> | null } };
const state = (g.__newsrenRefresh ??= { atMs: 0, inflight: null });

async function fetchItems(feed: FeedConfig): Promise<StoredItem[]> {
  if (blockedFeedIds().has(feed.id)) throw new Error("Blocked by NEWSREN_BLOCK_FEEDS (test switch)");
  const xml = await fetchFeedXml(feed);
  let parsed;
  try {
    parsed = parseFeed(xml, feed.feedUrl);
  } catch {
    throw new Error("Could not parse feed");
  }
  const retrievedAt = new Date().toISOString();
  const cutoff = Date.now() - MAX_AGE_MS;
  return parsed.items
    .filter((item) => !item.publishedAt || new Date(item.publishedAt).getTime() >= cutoff)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (b.item.publishedAt ?? "").localeCompare(a.item.publishedAt ?? "") || a.index - b.index)
    .slice(0, feed.maxItems)
    .map(({ item }): StoredItem => {
      const id = articleId(item.url);
      const title = htmlToText(item.title);
      const excerptText = item.descriptionHtml ? stripBoilerplate(htmlToText(item.descriptionHtml)) : "";
      return {
        id,
        canonicalUrl: item.url,
        slug: makeSlug(title, id),
        title,
        excerpt: excerptText && excerptText !== title ? truncate(excerptText, EXCERPT_MAX) : null,
        category: feed.category,
        feedId: feed.id,
        publishedAt: item.publishedAt,
        retrievedAt,
      };
    })
    .filter((a) => a.title);
}

async function refresh() {
  syncFeeds(FEEDS);
  await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const items = await fetchItems(feed);
        recordSuccess(feed.id, items, new Date().toISOString());
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        recordFailure(feed.id, message, new Date().toISOString());
      }
    }),
  );
}

/**
 * Refreshes feeds into the database when the last attempt (in this process or
 * recorded in the database, so restarts do not re-fetch needlessly) is older
 * than the refresh interval. Concurrent callers share one refresh.
 */
export async function ensureFresh(): Promise<void> {
  const now = Date.now();
  if (now - Math.max(state.atMs, lastAttemptMs()) < refreshMs()) return;
  state.inflight ??= refresh()
    .then(() => {
      state.atMs = Date.now();
    })
    .finally(() => {
      state.inflight = null;
    });
  return state.inflight;
}
