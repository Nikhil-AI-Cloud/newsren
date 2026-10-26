// FIXTURE tests: deterministic articles in a fresh temp database; no network, no AI.
// They exercise the real search (server/ai/retrieve.ts), the real check builder
// (server/topic-check.ts) and the real baseline logic (lib/topic-check.ts).
// Run: node scripts/topic-fixture-test.ts
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.NEWSREN_DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), "newsren-topic-")), "fixture.sqlite");
const { getDb } = await import("../server/db.ts");
const { buildCheckResponse } = await import("../server/topic-check.ts");
const { applyCheck, MAX_SEEN } = await import("../lib/topic-check.ts");
const { AiError } = await import("../server/ai/errors.ts");
import type { FeedStatus, TopicCheckState } from "../types/index.ts";

const db = getDb();
db.exec(`INSERT INTO feeds (id, publisher, topic_label, feed_url, homepage_url, category, kind) VALUES
  ('tech','Fixture Tech Wire','t','https://example.com/t','https://example.com','technology','publisher'),
  ('fin','Fixture Finance Wire','f','https://example.com/f','https://example.com','finance','publisher')`);
let n = 0;
function add(title: string, excerpt: string, feed: "tech" | "fin", published: string | null) {
  const id = (++n).toString(16).padStart(12, "0");
  const t = `2026-10-2${n % 10}T00:00:00.000Z`;
  db.prepare(
    `INSERT INTO articles (id, canonical_url, slug, title, excerpt, category, feed_id, published_at, first_retrieved_at, last_retrieved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, `https://example.com/${id}`, `slug-${id}`, title, excerpt, feed === "tech" ? "technology" : "finance", feed, published, t, t);
  return id;
}

const okStatuses: FeedStatus[] = [
  { sourceId: "tech", name: "Fixture Tech Wire", category: "technology", state: "ok", itemCount: 3, retrievedAt: "2026-10-25T00:00:00.000Z", error: null },
  { sourceId: "fin", name: "Fixture Finance Wire", category: "finance", state: "ok", itemCount: 3, retrievedAt: "2026-10-25T00:00:00.000Z", error: null },
];
const check = (topic: string, category: "technology" | "finance" | null = null, statuses = okStatuses) =>
  buildCheckResponse(topic, category, statuses, new Date());

// Fixture corpus
const a1 = add("Solar panel tariffs announced by trade office", "The trade office announced new tariffs on imported solar panels.", "tech", "2026-10-20T00:00:00.000Z");
const a2 = add("Installers react to solar tariffs", "Solar panel installers say the tariffs will change project costs.", "tech", null);
add("Chip maker unveils new memory design", "A preprint describes a lower-power memory design.", "tech", "2026-10-21T00:00:00.000Z");
const a4 = add("Bank sector reacts to solar financing rule", "A regulator issued a rule on financing for solar panel loans.", "fin", "2026-10-22T00:00:00.000Z");

// 1. First check = initial coverage, baseline persisted
let state: TopicCheckState | undefined;
const resp = check("solar panel tariffs");
state = applyCheck(state, resp);
assert.equal(state.lastResult.kind, "initial");
const initialIds = state.lastResult.items.map((m) => m.id);
assert.ok(initialIds.includes(a1) && initialIds.includes(a2));
assert.ok(!state.lastResult.items.some((m) => m.title.includes("memory")), "off-topic article matched");
assert.deepEqual([...state.seenIds].sort(), [...initialIds].sort());
const dated = state.lastResult.items.find((m) => m.id === a2)!;
assert.equal(dated.publishedAt, null, "missing publication date must stay null");
assert.ok(dated.firstRetrievedAt, "retrieval time kept");
console.log(`PASS  first check: "initial" coverage of ${initialIds.length} articles; baseline saved; missing date stays null`);

// 2. Repeat check: nothing new, nothing repeated, baseline unchanged, earlier coverage kept
const before = JSON.stringify(state.seenIds);
state = applyCheck(state, check("solar panel tariffs"));
assert.equal(state.lastResult.kind, "new");
assert.equal(state.lastResult.items.length, 0);
assert.equal(state.lastResult.alreadySeenCount, initialIds.length);
assert.equal(JSON.stringify(state.seenIds), before);
assert.equal(state.lastCoverage?.kind, "initial");
console.log("PASS  repeat check: 0 new, already-seen not repeated, baseline unchanged, earlier coverage kept");

// 3. New matching article appears: only it is shown; then it is not repeated
const a5 = add("Solar panel tariffs challenged at trade tribunal", "A tribunal heard a challenge to the solar panel tariffs.", "tech", "2026-10-25T00:00:00.000Z");
add("Unrelated cooking feature", "Recipes for autumn.", "tech", "2026-10-25T00:00:00.000Z");
state = applyCheck(state, check("solar panel tariffs"));
assert.deepEqual(state.lastResult.items.map((m) => m.id), [a5]);
assert.equal(state.lastResult.kind, "new");
assert.equal(state.seenIds.length, initialIds.length + 1);
assert.equal(state.lastCoverage?.items[0].id, a5);
state = applyCheck(state, check("solar panel tariffs"));
assert.equal(state.lastResult.items.length, 0);
assert.equal(state.lastCoverage?.items[0].id, a5, "most recent coverage retained after an empty check");
console.log("PASS  new coverage: exactly the new article shown, then not repeated; last coverage retained");

// 4. No matches: honest empty initial state; a later match shows as NEW (baseline exists)
let empty: TopicCheckState | undefined = applyCheck(undefined, check("zebra migration patterns"));
assert.equal(empty.lastResult.kind, "initial");
assert.equal(empty.lastResult.items.length, 0);
assert.equal(empty.lastCoverage, null);
add("Zebra migration patterns studied", "Researchers track zebra migration across the plains.", "tech", "2026-10-25T00:00:00.000Z");
empty = applyCheck(empty, check("zebra migration patterns"));
assert.equal(empty.lastResult.kind, "new");
assert.equal(empty.lastResult.items.length, 1);
console.log("PASS  no matches: empty initial baseline; a later match appears as new matching coverage");

// 5. Category scoping
const fin = check("solar panel", "finance");
assert.deepEqual(fin.matches.map((m) => m.id), [a4]);
console.log("PASS  category-scoped topic only matches that category");

// 6. Total failure: the check throws, and the caller never applies it, so state is untouched
const allDown: FeedStatus[] = okStatuses.map((s) => ({ ...s, state: "failed" as const, error: "Timed out" }));
const snapshot = JSON.stringify(state);
assert.throws(() => check("solar panel tariffs", null, allDown), (e: unknown) => e instanceof AiError && e.code === "sources_unavailable");
assert.equal(JSON.stringify(state), snapshot);
const allStale = okStatuses.map((s) => ({ ...s, state: "stale" as const, error: "Timed out" }));
assert.throws(() => check("solar panel tariffs", null, allStale), (e: unknown) => e instanceof AiError && e.code === "sources_unavailable");
console.log("PASS  total failure (all failed, or all stale): check refused; saved state byte-identical");

// 7. Partial failure: still returns matches, names the problem sources
const staleTech: FeedStatus[] = [{ ...okStatuses[0], state: "stale", error: "Timed out" }, okStatuses[1]];
const p = check("solar panel tariffs", null, staleTech);
assert.deepEqual(p.staleSources, ["Fixture Tech Wire"]);
assert.deepEqual(p.unavailableSources, []);
assert.ok(p.matches.length > 0, "stored (older) items still searched");
const downFin: FeedStatus[] = [okStatuses[0], { ...okStatuses[1], state: "failed", itemCount: 0, error: "HTTP 500" }];
assert.deepEqual(check("solar panel tariffs", null, downFin).unavailableSources, ["Fixture Finance Wire"]);
assert.deepEqual(check("solar panel tariffs", "technology", downFin).unavailableSources, [], "failures outside the topic's category are not reported");
console.log("PASS  partial failure: matches returned with stale/unavailable sources named");

// 8. Baseline is bounded
let big: TopicCheckState | undefined = applyCheck(undefined, check("solar panel tariffs"));
big = { ...big, seenIds: Array.from({ length: MAX_SEEN }, (_, i) => `old${i}`) };
big = applyCheck(big, check("solar panel tariffs"));
assert.equal(big.seenIds.length, MAX_SEEN);
console.log("PASS  baseline capped at " + MAX_SEEN + " ids");

console.log("\nAll topic fixture tests passed (FIXTURE data, not live news).");
