import { createHash } from "node:crypto";
import { getDb } from "../db.ts";

export interface EvidenceDoc {
  /** Source ID shown to the model and used in citations: "S1", "S2", ... */
  ref: string;
  articleId: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  retrievedAt: string;
  /** Publisher-supplied feed excerpt (plain text, already truncated). Not the full article. */
  excerpt: string | null;
}

interface CorpusRow {
  id: string;
  title: string;
  excerpt: string | null;
  canonical_url: string;
  published_at: string | null;
  last_retrieved_at: string;
  first_retrieved_at: string;
  category: string;
  slug: string;
  publisher: string;
  feed_id: string;
}

export const MAX_DOCS = 7;

const STOP = new Set(
  "the and for are but not you all any can had her was one our out has have been this that with from they will would there their what about which when who how why does did into than then them these those also more most such only over very your its it's is of to in on at by an as be or if we he she do so up no".split(" "),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}

function loadCorpus(): CorpusRow[] {
  return getDb()
    .prepare(
      `SELECT a.id, a.title, a.excerpt, a.canonical_url, a.published_at, a.last_retrieved_at,
              a.first_retrieved_at, a.category, a.slug, f.publisher, a.feed_id
       FROM articles a JOIN feeds f ON f.id = a.feed_id`,
    )
    .all() as unknown as CorpusRow[];
}

function toDoc(r: CorpusRow, ref: string): EvidenceDoc {
  return {
    ref,
    articleId: r.id,
    title: r.title,
    publisher: r.publisher,
    url: r.canonical_url,
    publishedAt: r.published_at,
    retrievedAt: r.last_retrieved_at,
    excerpt: r.excerpt,
  };
}

export interface RetrieveInput {
  /** Story the reader is on; always included first when given. */
  articleId?: string;
  /** Reader's question; weighted above the story's own terms. */
  question?: string;
}

/**
 * Selects stored articles relevant to a story and/or question by IDF-weighted
 * term overlap in titles (x2) and excerpts. Reads only the local database.
 */
export function retrieveEvidence(input: RetrieveInput): EvidenceDoc[] {
  const corpus = loadCorpus();
  const primary = input.articleId ? corpus.find((r) => r.id === input.articleId) : undefined;
  if (input.articleId && !primary) return [];

  const docTokens = corpus.map((r) => ({
    row: r,
    title: new Set(tokenize(r.title)),
    body: new Set(tokenize(r.excerpt ?? "")),
  }));
  const df = new Map<string, number>();
  for (const d of docTokens) {
    for (const t of new Set([...d.title, ...d.body])) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const idf = (t: string) => Math.log(1 + corpus.length / (df.get(t) ?? 1));

  const weights = new Map<string, number>();
  const add = (terms: string[], w: number) => {
    for (const t of terms) weights.set(t, Math.max(weights.get(t) ?? 0, w));
  };
  if (primary) add(tokenize(primary.title), 1);
  if (input.question) add(tokenize(input.question), 2);
  const termCount = weights.size;

  const scored = docTokens
    .filter((d) => d.row.id !== primary?.id)
    .map((d) => {
      let score = 0;
      let matched = 0;
      for (const [t, w] of weights) {
        const inTitle = d.title.has(t);
        const inBody = d.body.has(t);
        if (!inTitle && !inBody) continue;
        matched++;
        score += w * idf(t) * ((inTitle ? 2 : 0) + (inBody ? 1 : 0));
      }
      return { row: d.row, score, matched };
    })
    .filter((s) => s.matched >= Math.min(2, termCount) && s.score > 0)
    .sort((a, b) => b.score - a.score || (b.row.published_at ?? "").localeCompare(a.row.published_at ?? ""));

  const rows = [...(primary ? [primary] : []), ...scored.map((s) => s.row)].slice(0, MAX_DOCS);
  return rows.map((r, i) => toDoc(r, `S${i + 1}`));
}

/** Stable hash of the evidence content (not retrieval times), used to invalidate cached output. */
export function evidenceHash(docs: EvidenceDoc[]): string {
  const h = createHash("sha256");
  for (const d of [...docs].sort((a, b) => a.articleId.localeCompare(b.articleId))) {
    h.update(`${d.articleId}\u0001${d.title}\u0001${d.excerpt ?? ""}\u0001${d.publishedAt ?? ""}\u0001${d.url}\u0002`);
  }
  return h.digest("hex");
}


export interface TopicMatch {
  id: string;
  slug: string;
  title: string;
  publisher: string;
  url: string;
  category: string;
  publishedAt: string | null;
  firstRetrievedAt: string;
}

export const TOPIC_MATCH_LIMIT = 15;

/**
 * Bounded keyword search of the stored corpus for a saved topic. Same IDF-weighted
 * term overlap as evidence retrieval: stems only, no synonyms or semantics, so it
 * misses paraphrases and can match on shared words. Returns newest first.
 */
export function searchTopic(topic: string, opts: { category?: string | null; limit?: number } = {}): TopicMatch[] {
  const corpus = loadCorpus();
  const terms = [...new Set(tokenize(topic))];
  if (terms.length === 0) return [];
  const docs = corpus.map((r) => ({ row: r, title: new Set(tokenize(r.title)), body: new Set(tokenize(r.excerpt ?? "")) }));
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set([...d.title, ...d.body])) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = (t: string) => Math.log(1 + corpus.length / (df.get(t) ?? 1));
  const need = Math.min(2, terms.length);

  return docs
    .filter((d) => !opts.category || d.row.category === opts.category)
    .map((d) => {
      let score = 0;
      let matched = 0;
      for (const t of terms) {
        const inTitle = d.title.has(t);
        const inBody = d.body.has(t);
        if (!inTitle && !inBody) continue;
        matched++;
        score += idf(t) * ((inTitle ? 2 : 0) + (inBody ? 1 : 0));
      }
      return { row: d.row, score, matched };
    })
    .filter((s) => s.matched >= need && s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? TOPIC_MATCH_LIMIT)
    .map((s) => s.row)
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "") || b.first_retrieved_at.localeCompare(a.first_retrieved_at))
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      publisher: r.publisher,
      url: r.canonical_url,
      category: r.category,
      publishedAt: r.published_at,
      firstRetrievedAt: r.first_retrieved_at,
    }));
}

/** Stored articles by id (unknown ids are skipped), as evidence docs numbered from `startAt`. */
export function docsByIds(ids: string[], startAt = 1): EvidenceDoc[] {
  const byId = new Map(loadCorpus().map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is CorpusRow => !!r)
    .map((r, i) => toDoc(r, `S${startAt + i}`));
}

export interface EvidenceAssessment {
  /** "none": nothing usable to summarize. "limited": very short excerpt. "ok" otherwise. */
  level: "none" | "limited" | "ok";
}

export const EXCERPT_MIN_CHARS = 40;
export const EXCERPT_FULL_CHARS = 160;

/** Judges the primary document's excerpt (S1). The title alone is not enough to brief a story. */
export function assessEvidence(docs: EvidenceDoc[]): EvidenceAssessment {
  const len = (docs[0]?.excerpt ?? "").length;
  if (len < EXCERPT_MIN_CHARS) return { level: "none" };
  if (len < EXCERPT_FULL_CHARS) return { level: "limited" };
  return { level: "ok" };
}
