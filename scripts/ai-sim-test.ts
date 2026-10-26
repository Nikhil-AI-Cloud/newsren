// SIMULATED tests with a fake provider: no network, no API key, no quota.
// Run: node scripts/ai-sim-test.ts   (uses a throwaway fixture database)
import assert from "node:assert/strict";

const { createFixtureDb } = await import("./test-db.ts");
await createFixtureDb();

const { ApiError } = await import("@google/genai");
const { getDb } = await import("../server/db.ts");
const { runTask } = await import("../server/ai/run.ts");
const { AiError } = await import("../server/ai/errors.ts");
const { classifyError, geminiGenerate } = await import("../server/ai/provider.ts");

const db = getDb();
const story = db.prepare("SELECT id, title, excerpt FROM articles WHERE feed_id = 'mit-news-ai' ORDER BY published_at DESC LIMIT 1").get() as { id: string; title: string; excerpt: string };
const clear = () => { db.exec("DELETE FROM ai_cache; DELETE FROM ai_calls;"); };

let calls = 0;
const fake = (json: unknown) => async () => { calls++; return typeof json === "string" ? json : JSON.stringify(json); };
const deps = (generate: (...a: never[]) => Promise<string>, extra = {}) => ({ generate: generate as never, model: "fake-model", client: "t", ...extra });
const goodBrief = {
  abstain: false, abstainReason: "",
  whatHappened: [{ text: "Martha Minow spoke at the Compton Lecture.", sourceIds: ["S1"] }],
  whyItMatters: [{ kind: "interpretation", text: "It bears on how societies use AI.", sourceIds: [] }],
  uncertain: [{ text: "The excerpt gives no detail of her proposals.", sourceIds: [] }],
};
const rejects = async (p: Promise<unknown>, code: string, label: string) => {
  try { await p; assert.fail(`${label}: expected ${code}`); } catch (e) { assert.ok(e instanceof AiError, `${label}: not AiError: ${e}`); assert.equal((e as InstanceType<typeof AiError>).code, code, label); }
  console.log(`PASS  ${label} -> ${code}`);
};
const brief = { task: "brief", articleId: story.id } as const;

// 1. Valid output is accepted, citations resolve to the stored URL, and it is cached.
clear(); calls = 0;
const ok = await runTask(brief, deps(fake(goodBrief)));
assert.equal(ok.task, "brief");
assert.equal(ok.citations[0].url, (db.prepare("SELECT canonical_url u FROM articles WHERE id=?").get(story.id) as { u: string }).u);
console.log("PASS  valid brief accepted; citation URL resolved by server");

// 2. Cache hit makes no provider call; different audience / question are separate keys.
await runTask(brief, deps(fake(goodBrief)));
assert.equal(calls, 1);
console.log("PASS  repeat request served from cache (provider calls: 1)");

// 3. Output validation: each of these must be rejected and must NOT be cached.
const bad = async (label: string, mutate: (b: typeof goodBrief) => unknown, raw?: string) => {
  clear(); calls = 0;
  await rejects(runTask(brief, deps(fake(raw ?? mutate(structuredClone(goodBrief))))), "malformed", label);
  assert.equal((db.prepare("SELECT COUNT(*) n FROM ai_cache").get() as { n: number }).n, 0, `${label}: was cached`);
};
await bad("unknown citation ID S9 rejected", (b) => { b.whatHappened[0].sourceIds = ["S9"]; return b; });
await bad("factual claim without citation rejected", (b) => { b.whatHappened[0].sourceIds = []; return b; });
await bad("invented number rejected", (b) => { b.whatHappened[0].text = "Minow spoke to 4,732 attendees."; return b; });
await bad("invented quotation rejected", (b) => { b.whatHappened[0].text = 'Minow said "democracy will definitely collapse".'; return b; });
await bad("URL in text rejected", (b) => { b.whatHappened[0].text = "See https://example.com/fake for details."; return b; });
await bad("investment advice rejected", (b) => { b.whyItMatters[0].text = "You should buy shares in this."; return b; });
await bad("malformed JSON rejected", () => null, "{not json");
await bad("empty response rejected", () => null, "");
await bad("wrong shape rejected", () => null, JSON.stringify({ hello: "world" }));

// 4. Provider failures map to clear errors, are not cached, and never produce a fake answer.
const fail = async (label: string, err: unknown, code: string) => {
  clear();
  await rejects(runTask(brief, deps(async () => { throw classifyError(err); })), code, label);
  assert.equal((db.prepare("SELECT COUNT(*) n FROM ai_cache").get() as { n: number }).n, 0);
};
await fail("429 quota", new ApiError({ message: "RESOURCE_EXHAUSTED: quota", status: 429 }), "quota");
await fail("400 invalid API key", new ApiError({ message: "API key not valid. Please pass a valid API key.", status: 400 }), "invalid_credentials");
await fail("403 permission", new ApiError({ message: "PERMISSION_DENIED", status: 403 }), "invalid_credentials");
await fail("404 model", new ApiError({ message: "model not found", status: 404 }), "provider");
await fail("503 provider", new ApiError({ message: "overloaded", status: 503 }), "provider");
await fail("timeout", Object.assign(new Error("timed out"), { name: "TimeoutError" }), "timeout");
await fail("network error", new TypeError("fetch failed"), "provider");
// Missing credentials, through the real provider function (no network is reached).
clear();
await rejects(runTask(brief, { generate: geminiGenerate, model: "fake-model", client: "t" }), "not_configured", "missing GEMINI_API_KEY");

// 5. A failure is retried only by the user: next click calls the provider again, once.
clear(); calls = 0;
await rejects(runTask(brief, deps(async () => { calls++; throw classifyError(new ApiError({ message: "x", status: 429 })); })), "quota", "failure 1");
await runTask(brief, deps(fake(goodBrief)));
assert.equal(calls, 2);
console.log("PASS  no automatic retry; next user action makes exactly one new call");

// 6. Identical simultaneous requests share one provider call.
clear(); calls = 0;
const slow = async () => { calls++; await new Promise((r) => setTimeout(r, 150)); return JSON.stringify(goodBrief); };
await Promise.all([1, 2, 3].map(() => runTask(brief, deps(slow))));
assert.equal(calls, 1);
console.log("PASS  3 simultaneous identical requests -> 1 provider call");

// 7. Evidence change invalidates the cache.
clear(); calls = 0;
await runTask(brief, deps(fake(goodBrief)));
db.prepare("UPDATE articles SET excerpt = excerpt || ' Updated by the publisher.' WHERE id = ?").run(story.id);
const after = await runTask(brief, deps(fake(goodBrief)));
assert.equal(calls, 2);
assert.equal(after.meta.cached, false);
console.log("PASS  changed excerpt -> cache miss -> regenerated");

// 8. Server-side request limits count provider calls only.
clear(); calls = 0;
const limits = { perClientPerMinute: 2, globalPerMinute: 100, globalPerDay: 100 };
for (const a of ["student", "educator"] as const) await runTask({ task: "explain", articleId: story.id, audience: a }, deps(fake({ abstain: false, abstainReason: "", paragraphs: [{ text: "Minow spoke.", sourceIds: ["S1"] }], discussionQuestions: a === "educator" ? ["What is democracy?"] : [] }), { limits }));
await rejects(runTask({ task: "explain", articleId: story.id, audience: "professional" }, deps(fake({}), { limits })), "rate_limited", "3rd provider call in a minute");
await runTask({ task: "explain", articleId: story.id, audience: "student" }, deps(fake({}), { limits }));
console.log("PASS  cache hits do not consume the request limit");

// 9. Question handling: bounds, and abstention without a model call when nothing is stored.
clear(); calls = 0;
await rejects(runTask({ task: "ask", question: "hi" }, deps(fake({}))), "bad_request", "too-short question");
await rejects(runTask({ task: "ask", question: "x".repeat(301) }, deps(fake({}))), "bad_request", "too-long question");
const none = await runTask({ task: "ask", question: "zzqxv wwkjh plmnb" }, deps(fake({})));
assert.equal(none.task === "ask" && none.answerable, false);
assert.equal(calls, 0);
console.log("PASS  question with no matching stored article abstains with 0 provider calls");
await rejects(runTask({ task: "brief", articleId: "000000000000" }, deps(fake({}))), "not_found", "unknown story");

console.log("\nAll simulated tests passed.");
