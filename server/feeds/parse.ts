import { XMLParser } from "fast-xml-parser";
import { canonicalizeUrl } from "./url.ts";

export interface RawItem {
  title: string;
  /** Canonical http(s) URL of the original article. */
  url: string;
  /** ISO timestamp exactly as provided by the feed, or null when absent/invalid. */
  publishedAt: string | null;
  /** Raw (untrusted) description markup or text; sanitize before use. */
  descriptionHtml: string | null;
}

export interface ParsedFeed {
  format: "rss" | "atom" | "rdf";
  channelTitle: string | null;
  copyright: string | null;
  items: RawItem[];
  /** Entries dropped because they lacked a title or a safe link. */
  dropped: number;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
  isArray: (name) => ["item", "entry", "link"].includes(name),
});

type Node = Record<string, unknown>;

function text(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") return text((v as Node)["#text"]);
  return null;
}

function parseDate(v: unknown): string | null {
  const s = text(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function linkOf(entry: Node, base: string): string | null {
  const links = entry.link;
  const candidates: (string | null)[] = [];
  if (Array.isArray(links)) {
    // Atom: prefer rel="alternate" (or no rel); RSS: plain text.
    for (const l of links) {
      if (typeof l === "string") candidates.push(l);
      else if (l && typeof l === "object") {
        const attrs = l as Node;
        const rel = text(attrs["@_rel"]);
        if (!rel || rel === "alternate") candidates.push(text(attrs["@_href"]) ?? text(attrs["#text"]));
      }
    }
  }
  const guid = entry.guid as Node | string | undefined;
  const guidIsLink =
    typeof guid === "string" ||
    (guid && typeof guid === "object" && String(guid["@_isPermaLink"]).toLowerCase() !== "false");
  candidates.push(guidIsLink ? text(guid) : null);
  for (const c of candidates) {
    const url = canonicalizeUrl(c, base);
    if (url) return url;
  }
  return null;
}

export function parseFeed(xml: string, feedUrl: string): ParsedFeed {
  const doc = parser.parse(xml) as Node;
  let format: ParsedFeed["format"];
  let container: Node;
  let entries: Node[];

  if (doc.rss && typeof doc.rss === "object") {
    format = "rss";
    container = ((doc.rss as Node).channel ?? {}) as Node;
    entries = (container.item as Node[] | undefined) ?? [];
  } else if (doc.feed && typeof doc.feed === "object") {
    format = "atom";
    container = doc.feed as Node;
    entries = (container.entry as Node[] | undefined) ?? [];
  } else if (doc["rdf:RDF"] && typeof doc["rdf:RDF"] === "object") {
    format = "rdf";
    container = doc["rdf:RDF"] as Node;
    entries = (container.item as Node[] | undefined) ?? [];
  } else {
    throw new Error("Not an RSS, Atom, or RDF feed");
  }

  const items: RawItem[] = [];
  let dropped = 0;
  for (const entry of entries) {
    const title = text(entry.title);
    const url = linkOf(entry, feedUrl);
    if (!title || !url) {
      dropped++;
      continue;
    }
    items.push({
      title,
      url,
      publishedAt:
        parseDate(entry.pubDate) ??
        parseDate(entry["dc:date"]) ??
        parseDate(entry.published) ??
        parseDate(entry.updated),
      descriptionHtml:
        text(entry.description) ?? text(entry.summary) ?? text(entry["content:encoded"]) ?? text(entry.content),
    });
  }

  const channel = format === "rss" ? container : (doc["rdf:RDF"] as Node)?.channel ?? container;
  return {
    format,
    channelTitle: text((channel as Node).title),
    copyright: text((channel as Node).copyright) ?? text((channel as Node).rights),
    items,
    dropped,
  };
}
