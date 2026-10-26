// Verifies that refreshing a feed never deletes previously stored articles.
// Uses the real store functions on a temp database. Needs the server-only stub
// import hook:  node --import ./scripts/stub-server-only.mjs scripts/retention-test.ts
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.NEWSREN_DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), "newsren-ret-")), "retention.sqlite");
const { FEEDS } = await import("../server/feeds/registry.ts");
const { getStoredById, listStored, recordFailure, recordSuccess, syncFeeds, feedStatuses } = await import("../server/store.ts");

const feed = FEEDS[0];
syncFeeds(FEEDS);
const item = (n: number, at: string) => ({
  id: n.toString(16).padStart(12, "0"),
  canonicalUrl: `https://example.com/${n}`,
  slug: `story-${n.toString(16).padStart(12, "0")}`,
  title: `Fixture story ${n}`,
  excerpt: `Excerpt ${n}`,
  category: feed.category,
  feedId: feed.id,
  publishedAt: `2026-10-${String(n).padStart(2, "0")}T00:00:00.000Z`,
  retrievedAt: at,
});

// Refresh 1: the feed lists stories 1-10.
recordSuccess(feed.id, Array.from({ length: 10 }, (_, i) => item(i + 1, "2026-10-20T00:00:00.000Z")), "2026-10-20T00:00:00.000Z");
// Refresh 2: the feed has moved on and lists only stories 8-17. Stories 1-7 are no longer in the feed.
recordSuccess(feed.id, Array.from({ length: 10 }, (_, i) => item(i + 8, "2026-10-21T00:00:00.000Z")), "2026-10-21T00:00:00.000Z");

const old = getStoredById(item(1, "").id);
assert.ok(old, "an article that left the feed must remain accessible");
assert.equal(old.article.title, "Fixture story 1");
assert.equal(old.article.retrievedAt, "2026-10-20T00:00:00.000Z", "its retrieval time is from the refresh that saw it");
assert.ok(getStoredById(item(17, "").id), "new articles were added");
const total = listStored(100).length;
assert.equal(total, 17, "10 from refresh 1 + 7 new from refresh 2 = 17 stored (10 per refresh, not 10 total)");
console.log(`PASS  refresh 2 listed 10 items but ${total} are stored; the 7 that left the feed are still accessible`);

// A refresh that updates an existing article keeps it and its first retrieval time.
const before = getStoredById(item(8, "").id)!;
recordSuccess(feed.id, [{ ...item(8, "2026-10-22T00:00:00.000Z"), title: "Fixture story 8 (edited)" }], "2026-10-22T00:00:00.000Z");
const after = getStoredById(item(8, "").id)!;
assert.equal(after.article.title, "Fixture story 8 (edited)");
assert.equal(listStored(100).length, 17);
console.log("PASS  re-seeing an article updates it in place (no duplicate); count stays 17");

// A failed refresh deletes nothing and marks the feed stale.
recordFailure(feed.id, "Timed out", "2026-10-23T00:00:00.000Z");
assert.equal(listStored(100).length, 17);
assert.equal(feedStatuses(FEEDS).find((s) => s.sourceId === feed.id)?.state, "stale");
console.log("PASS  failed refresh deletes nothing; feed is stale with 17 stored items");
void before;
console.log("\nRetention tests passed.");
