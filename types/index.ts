export type Category = "technology" | "education" | "industry" | "finance";

export type ExplanationMode = "student" | "educator" | "professional";

export type SourceKind =
  | "publisher"
  | "primary"
  | "independent"
  | "research"
  | "regulator";

export interface Source {
  id: string;
  name: string;
  kind: SourceKind;
  homepageUrl: string;
}

/** One piece of evidence behind a briefing's main claims. */
export interface EvidenceItem {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  /** ISO date (YYYY-MM-DD) the evidence was published. */
  publishedAt: string;
  /** ISO timestamp of retrieval; null until live retrieval exists. */
  retrievedAt: string | null;
  /** What this item supports, in plain words. */
  supports: string;
}

export interface TopicRef {
  id: string;
  label: string;
}

/** Reader-facing explanation of a story. Paragraphs are plain text. */
export interface Briefing {
  /** "sample" = hand-written placeholder; "generated" = produced by the future pipeline. */
  origin: "sample" | "generated";
  generatedAt: string | null;
  whatHappened: string[];
  whyItMatters: string[];
  explanations: Record<ExplanationMode, string[]>;
}

/** Where a story came from. A link to the original is provenance, not corroboration. */
export interface Provenance {
  /** Followable label for the feed. */
  feedName: string;
  feedUrl: string;
  itemUrl: string;
  /** ISO timestamp of the fetch that produced this item. */
  retrievedAt: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  /** Short excerpt supplied by the publisher's feed (plain text); null if the feed gave none. */
  excerpt: string | null;
  category: Category;
  topic: TopicRef;
  sourceId: string;
  /** ISO date or timestamp exactly as provided by the source; null when not provided. */
  publishedAt: string | null;
  /** ISO timestamp of the actual retrieval; null for sample fixtures. */
  retrievedAt: string | null;
  originalUrl: string;
  featured?: boolean;
  isSample: boolean;
  /** Null until the AI briefing pipeline is connected. */
  briefing: Briefing | null;
  /** Independent evidence; empty until evidence verification is connected. */
  evidence: EvidenceItem[];
  provenance?: Provenance;
}

/** Lightweight shape for lists and cards; source name is resolved server-side. */
export type ArticleListItem = Pick<
  Article,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "retrievedAt"
  | "category"
  | "topic"
  | "publishedAt"
  | "featured"
  | "isSample"
> & { sourceName: string };

/**
 * "source" follows a publisher feed (id `feed:<feed id>`). "topic" is a topic or
 * research question the reader typed (id `topic:<normalized text>`). Neither is
 * monitored yet.
 */
export type FollowKind = "source" | "topic";

/** A stored article matched to a saved topic. Dates are the publisher's and Newsren's own, never inferred. */
export interface MatchedItem {
  id: string;
  slug: string;
  title: string;
  publisher: string;
  url: string;
  category: Category;
  /** Publisher's date; null when the feed gave none. Not necessarily when the event happened. */
  publishedAt: string | null;
  /** When Newsren first stored this article. */
  firstRetrievedAt: string;
}

/** What the server returns for one manual topic check. It does not know the reader's baseline. */
export interface TopicCheckResponse {
  checkedAt: string;
  /** Most recent successful feed fetch among all sources, or null. */
  feedsRefreshedAt: string | null;
  /** Every stored article matching the topic (bounded), newest first. */
  matches: MatchedItem[];
  /** Sources whose latest fetch failed and nothing is stored. */
  unavailableSources: string[];
  /** Sources whose latest fetch failed, so older stored items were searched. */
  staleSources: string[];
}

export interface TopicCheckResult {
  /** "initial" = first check (baseline); "new" = a later check. */
  kind: "initial" | "new";
  checkedAt: string;
  feedsRefreshedAt: string | null;
  items: MatchedItem[];
  /** Matches already seen in earlier checks and therefore not repeated. */
  alreadySeenCount: number;
  unavailableSources: string[];
  staleSources: string[];
}

/** Saved in this browser with the topic. Only successful checks change it. */
export interface TopicCheckState {
  lastCheckedAt: string;
  /** Baseline: ids of every matching article already shown to the reader. */
  seenIds: string[];
  lastResult: TopicCheckResult;
  /** Most recent successful check that found something, kept when later checks find nothing. */
  lastCoverage: TopicCheckResult | null;
}

export interface FollowedTopic {
  id: string;
  kind: FollowKind;
  label: string;
  /** Category the reader chose for a saved topic; always set for sources. */
  category: Category | null;
  /** ISO timestamp. */
  followedAt: string;
  /** Story a source was followed from; null for typed topics. */
  sourceArticleSlug: string | null;
  /** Manual update-check state; topics only. */
  check?: TopicCheckState;
}

export type FeedState = "ok" | "stale" | "failed";

/** Health of one allowlisted feed after the latest refresh. */
export interface FeedStatus {
  sourceId: string;
  name: string;
  category: Category;
  /** stale = the latest fetch failed, so older items are being shown. */
  state: FeedState;
  itemCount: number;
  retrievedAt: string | null;
  error: string | null;
}

/** Results of future server integrations; all are "not_connected" for now. */
export type NotConnected = { status: "not_connected"; message: string };
