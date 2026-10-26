import "server-only";

import type { Article, Category, FeedStatus, Source, SourceKind } from "@/types";
import type { FeedConfig } from "./feeds/registry";
import { getDb } from "./db.ts";

/** One normalized item ready to be stored. */
export interface StoredItem {
  id: string;
  canonicalUrl: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: Category;
  feedId: string;
  publishedAt: string | null;
  retrievedAt: string;
}

interface ArticleRow {
  id: string;
  canonical_url: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: Category;
  feed_id: string;
  published_at: string | null;
  first_retrieved_at: string;
  last_retrieved_at: string;
  publisher: string;
  kind: SourceKind;
  homepage_url: string;
  topic_label: string;
  feed_url: string;
}

const ARTICLE_SELECT = `
  SELECT a.*, f.publisher, f.kind, f.homepage_url, f.topic_label, f.feed_url
  FROM articles a JOIN feeds f ON f.id = a.feed_id`;

const ORDER = "published_at IS NULL, published_at DESC, first_retrieved_at DESC";

export interface StoredArticle {
  article: Article;
  source: Source;
}

function toStored(r: ArticleRow): StoredArticle {
  return {
    article: {
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      category: r.category,
      topic: { id: `feed:${r.feed_id}`, label: r.topic_label },
      sourceId: r.feed_id,
      publishedAt: r.published_at,
      retrievedAt: r.last_retrieved_at,
      originalUrl: r.canonical_url,
      isSample: false,
      briefing: null,
      evidence: [],
      provenance: {
        feedName: r.topic_label,
        feedUrl: r.feed_url,
        itemUrl: r.canonical_url,
        retrievedAt: r.last_retrieved_at,
      },
    },
    source: { id: r.feed_id, name: r.publisher, kind: r.kind, homepageUrl: r.homepage_url },
  };
}

/** Keeps stored source metadata in step with the registry. Never deletes anything. */
export function syncFeeds(feeds: FeedConfig[]) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO feeds (id, publisher, topic_label, feed_url, homepage_url, category, kind)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET publisher = excluded.publisher, topic_label = excluded.topic_label,
      feed_url = excluded.feed_url, homepage_url = excluded.homepage_url,
      category = excluded.category, kind = excluded.kind`);
  db.exec("BEGIN");
  try {
    for (const f of feeds) stmt.run(f.id, f.publisher, f.topicLabel, f.feedUrl, f.homepageUrl, f.category, f.kind);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** Upserts items (never deletes) and records a successful fetch. */
export function recordSuccess(feedId: string, items: StoredItem[], now: string) {
  const db = getDb();
  const dupTitle = db.prepare(
    "SELECT 1 FROM articles WHERE feed_id = ? AND lower(title) = lower(?) AND id <> ? LIMIT 1",
  );
  const upsert = db.prepare(`
    INSERT INTO articles (id, canonical_url, slug, title, excerpt, category, feed_id, published_at, first_retrieved_at, last_retrieved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, excerpt = excluded.excerpt,
      category = excluded.category, feed_id = excluded.feed_id,
      published_at = COALESCE(excluded.published_at, articles.published_at),
      last_retrieved_at = excluded.last_retrieved_at`);
  db.exec("BEGIN");
  try {
    for (const it of items) {
      // Same-source, same-title entries with a different URL are treated as duplicates.
      if (dupTitle.get(it.feedId, it.title, it.id)) continue;
      upsert.run(it.id, it.canonicalUrl, it.slug, it.title, it.excerpt, it.category, it.feedId, it.publishedAt, it.retrievedAt, it.retrievedAt);
    }
    db.prepare(
      "UPDATE feeds SET last_attempt_at = ?, last_success_at = ?, last_error = NULL, consecutive_failures = 0 WHERE id = ?",
    ).run(now, now, feedId);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function recordFailure(feedId: string, error: string, now: string) {
  getDb()
    .prepare(
      "UPDATE feeds SET last_attempt_at = ?, last_error = ?, consecutive_failures = consecutive_failures + 1 WHERE id = ?",
    )
    .run(now, error, feedId);
}

/** Most recent fetch attempt across all feeds, as epoch ms (0 when never attempted). */
export function lastAttemptMs(): number {
  const row = getDb().prepare("SELECT MAX(last_attempt_at) AS t FROM feeds").get() as { t: string | null };
  return row.t ? new Date(row.t).getTime() : 0;
}

/** Latest stored articles, at most `perCategory` for each category. */
export function listStored(perCategory: number): StoredArticle[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM (
         SELECT x.*, ROW_NUMBER() OVER (PARTITION BY category ORDER BY ${ORDER}) AS rn
         FROM (${ARTICLE_SELECT}) x
       ) WHERE rn <= ? ORDER BY ${ORDER}`,
    )
    .all(perCategory) as unknown as ArticleRow[];
  return rows.map(toStored);
}

export function getStoredById(id: string): StoredArticle | undefined {
  const row = getDb().prepare(`${ARTICLE_SELECT} WHERE a.id = ?`).get(id) as ArticleRow | undefined;
  return row ? toStored(row) : undefined;
}

export function feedStatuses(registry: FeedConfig[]): FeedStatus[] {
  const rows = getDb()
    .prepare(
      `SELECT f.id, f.last_success_at, f.last_error,
              (SELECT COUNT(*) FROM articles a WHERE a.feed_id = f.id) AS n
       FROM feeds f`,
    )
    .all() as unknown as { id: string; last_success_at: string | null; last_error: string | null; n: number }[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return registry.map((feed) => {
    const r = byId.get(feed.id);
    const n = r?.n ?? 0;
    const failing = !!r?.last_error || !r?.last_success_at;
    return {
      sourceId: feed.id,
      name: feed.publisher,
      category: feed.category,
      state: failing ? (n > 0 ? "stale" : "failed") : "ok",
      itemCount: n,
      retrievedAt: r?.last_success_at ?? null,
      error: r?.last_error ?? (r?.last_success_at ? null : "Not retrieved yet"),
    };
  });
}
