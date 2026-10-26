import type { Category, SourceKind } from "../../types/index.ts";

/**
 * Allowlist of feeds Newsren may fetch. Nothing outside this list is ever
 * requested, and no endpoint accepts a URL from the client. Each entry was
 * checked to return a parseable RSS/Atom/RDF document (see README).
 */
export interface FeedConfig {
  id: string;
  publisher: string;
  /** Short label for the feed itself, shown as the followable topic. */
  topicLabel: string;
  feedUrl: string;
  homepageUrl: string;
  category: Category;
  kind: SourceKind;
  /** Most recent items to keep per refresh. */
  maxItems: number;
}

export const FEEDS: FeedConfig[] = [
  // Technology
  { id: "mit-news-ai", publisher: "MIT News", topicLabel: "MIT News: artificial intelligence", feedUrl: "https://news.mit.edu/rss/topic/artificial-intelligence2", homepageUrl: "https://news.mit.edu/topic/artificial-intelligence2", category: "technology", kind: "research", maxItems: 10 },
  { id: "google-research", publisher: "Google Research", topicLabel: "Google Research blog", feedUrl: "https://research.google/blog/rss/", homepageUrl: "https://research.google/blog/", category: "technology", kind: "primary", maxItems: 10 },
  { id: "nist-news", publisher: "NIST", topicLabel: "NIST news", feedUrl: "https://www.nist.gov/news-events/news/rss.xml", homepageUrl: "https://www.nist.gov/news-events/news", category: "technology", kind: "primary", maxItems: 10 },
  // Education
  { id: "hechinger", publisher: "The Hechinger Report", topicLabel: "The Hechinger Report", feedUrl: "https://hechingerreport.org/feed/", homepageUrl: "https://hechingerreport.org/", category: "education", kind: "publisher", maxItems: 10 },
  { id: "the74", publisher: "The 74", topicLabel: "The 74 education news", feedUrl: "https://www.the74million.org/feed/", homepageUrl: "https://www.the74million.org/", category: "education", kind: "publisher", maxItems: 10 },
  { id: "inside-higher-ed", publisher: "Inside Higher Ed", topicLabel: "Inside Higher Ed", feedUrl: "https://www.insidehighered.com/rss.xml", homepageUrl: "https://www.insidehighered.com/", category: "education", kind: "publisher", maxItems: 10 },
  // Industry
  { id: "ustr-news", publisher: "Office of the U.S. Trade Representative", topicLabel: "USTR press releases", feedUrl: "https://ustr.gov/rss.xml", homepageUrl: "https://ustr.gov/about-us/policy-offices/press-office/press-releases", category: "industry", kind: "primary", maxItems: 10 },
  { id: "eia-today", publisher: "U.S. EIA", topicLabel: "EIA Today in Energy", feedUrl: "https://www.eia.gov/rss/todayinenergy.xml", homepageUrl: "https://www.eia.gov/todayinenergy/", category: "industry", kind: "primary", maxItems: 10 },
  { id: "supply-chain-dive", publisher: "Supply Chain Dive", topicLabel: "Supply Chain Dive", feedUrl: "https://www.supplychaindive.com/feeds/news/", homepageUrl: "https://www.supplychaindive.com/", category: "industry", kind: "publisher", maxItems: 10 },
  { id: "manufacturing-dive", publisher: "Manufacturing Dive", topicLabel: "Manufacturing Dive", feedUrl: "https://www.manufacturingdive.com/feeds/news/", homepageUrl: "https://www.manufacturingdive.com/", category: "industry", kind: "publisher", maxItems: 10 },
  // Finance
  { id: "sec-press", publisher: "U.S. SEC", topicLabel: "SEC press releases", feedUrl: "https://www.sec.gov/news/pressreleases.rss", homepageUrl: "https://www.sec.gov/newsroom/press-releases", category: "finance", kind: "regulator", maxItems: 10 },
  { id: "fed-press", publisher: "Federal Reserve", topicLabel: "Federal Reserve press releases", feedUrl: "https://www.federalreserve.gov/feeds/press_all.xml", homepageUrl: "https://www.federalreserve.gov/newsevents/pressreleases.htm", category: "finance", kind: "regulator", maxItems: 10 },
  { id: "ecb-press", publisher: "European Central Bank", topicLabel: "ECB press releases", feedUrl: "https://www.ecb.europa.eu/rss/press.html", homepageUrl: "https://www.ecb.europa.eu/press/pr/html/index.en.html", category: "finance", kind: "regulator", maxItems: 10 },
  { id: "bis-press", publisher: "Bank for International Settlements", topicLabel: "BIS press releases", feedUrl: "https://www.bis.org/doclist/all_pressrels.rss", homepageUrl: "https://www.bis.org/press/index.htm", category: "finance", kind: "regulator", maxItems: 10 },
  { id: "cfpb-news", publisher: "CFPB", topicLabel: "CFPB newsroom", feedUrl: "https://www.consumerfinance.gov/about-us/newsroom/feed/", homepageUrl: "https://www.consumerfinance.gov/about-us/newsroom/", category: "finance", kind: "regulator", maxItems: 10 },
];

export function getFeed(id: string): FeedConfig | undefined {
  return FEEDS.find((f) => f.id === id);
}
