import "server-only";

import { connection } from "next/server";
import { SAMPLE_ARTICLES } from "@/data/sample/articles";
import { SAMPLE_SOURCES } from "@/data/sample/sources";
import type { Article, ArticleListItem, FeedStatus, Source } from "@/types";
import { contentMode, type ContentMode } from "./config";
import { ensureFresh } from "./feeds/ingest";
import { idFromSlug } from "./feeds/ids";
import { FEEDS } from "./feeds/registry";
import { feedStatuses, getStoredById, listStored } from "./store";

/**
 * Content repository used by pages. In "live" mode it reads the SQLite article
 * store, refreshing feeds into it first; "sample" mode (NEWSREN_CONTENT=sample)
 * serves the development fixtures. Live failures never fall back to sample content.
 */

/** Newest stored stories shown per category on the homepage. */
const PER_CATEGORY = 40;

export interface ArticleListing {
  mode: ContentMode;
  articles: ArticleListItem[];
  statuses: FeedStatus[];
  /** ISO timestamp of the latest feed refresh; null in sample mode. */
  refreshedAt: string | null;
}

export interface StoryResult {
  mode: ContentMode;
  article: Article;
  source: Source;
  /** Status of the story's feed, when live. */
  status: FeedStatus | null;
}

const sampleSources = new Map(SAMPLE_SOURCES.map((s) => [s.id, s]));

/** Sources for sample evidence items. */
export function getSampleSource(id: string): Source | undefined {
  return sampleSources.get(id);
}

function toListItem(article: Article, sourceName: string): ArticleListItem {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    topic: article.topic,
    publishedAt: article.publishedAt,
    retrievedAt: article.retrievedAt,
    featured: article.featured,
    isSample: article.isSample,
    sourceName,
  };
}

export async function listArticles(): Promise<ArticleListing> {
  await connection();
  if (contentMode() === "sample") {
    const articles = [...SAMPLE_ARTICLES]
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .map((a) => toListItem(a, sampleSources.get(a.sourceId)?.name ?? "Unknown source"));
    return { mode: "sample", articles, statuses: [], refreshedAt: null };
  }
  await ensureFresh();
  const statuses = feedStatuses(FEEDS);
  const refreshedAt = statuses.reduce<string | null>(
    (latest, s) => (s.retrievedAt && (!latest || s.retrievedAt > latest) ? s.retrievedAt : latest),
    null,
  );
  return {
    mode: "live",
    articles: listStored(PER_CATEGORY).map(({ article, source }) => toListItem(article, source.name)),
    statuses,
    refreshedAt,
  };
}

/** Looks a story up by the id at the end of its slug. Never touches the network. */
export async function getArticle(slug: string): Promise<StoryResult | undefined> {
  await connection();
  if (contentMode() === "sample") {
    const article = SAMPLE_ARTICLES.find((a) => a.slug === slug);
    const source = article && sampleSources.get(article.sourceId);
    return article && source ? { mode: "sample", article, source, status: null } : undefined;
  }
  const id = idFromSlug(slug);
  if (!id) return undefined;
  const stored = getStoredById(id);
  if (!stored) return undefined;
  const status = feedStatuses(FEEDS).find((s) => s.sourceId === stored.article.sourceId) ?? null;
  return { mode: "live", ...stored, status };
}
