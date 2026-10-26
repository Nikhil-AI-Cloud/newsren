import { type FeedConfig, FEEDS } from "./registry.ts";

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 3 * 1024 * 1024;

export const USER_AGENT =
  process.env.NEWSREN_USER_AGENT?.trim() || "Newsren/0.1 (prototype news reader; headlines and links only)";

const ALLOWED_HOSTS = new Set(FEEDS.map((f) => new URL(f.feedUrl).hostname));

/** Fetches one allowlisted feed. Throws a short, user-safe Error on any failure. */
export async function fetchFeedXml(feed: FeedConfig): Promise<string> {
  // Only feeds from the registry (by reference) are ever requested.
  if (!FEEDS.includes(feed)) throw new Error("Feed is not on the allowlist");

  const res = await fetch(feed.feedUrl, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
    },
  }).catch((err: unknown) => {
    const name = err instanceof Error ? err.name : "";
    throw new Error(name === "TimeoutError" || name === "AbortError" ? "Timed out" : "Network error");
  });

  // A redirect must stay on an allowlisted host.
  if (res.url && !ALLOWED_HOSTS.has(new URL(res.url).hostname)) {
    await res.body?.cancel();
    throw new Error("Redirected to a host that is not allowlisted");
  }
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Empty response");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error("Response too large");
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}
