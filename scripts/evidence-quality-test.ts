// SIMULATED tests (fake provider, temp database): evidence quality rules and the
// "Explain these updates" task. No network, no API key; uses a throwaway fixture database.
// Run: node scripts/evidence-quality-test.ts
import assert from "node:assert/strict";

const { createFixtureDb } = await import("./test-db.ts");
await createFixtureDb();

const { getDb } = await import("../server/db.ts");
const { runTask } = await import("../server/ai/run.ts");
const { AiError } = await import("../server/ai/errors.ts");

const db = getDb();
const story = db.prepare("SELECT id FROM articles WHERE feed_id = 'mit-news-ai' ORDER BY published_at DESC LIMIT 1").get() as { id: string };
const EXCERPT =
  "In Compton Lecture, the distinguished legal scholar warns of potential loss of the Enlightenment while suggesting ways innovations can meet our civic and cultural needs.";
const setExcerpt = (x: string | null) => db.prepare("UPDATE articles SET excerpt = ? WHERE id = ?").run(x, story.id);
const clear = () => db.exec("DELETE FROM ai_cache; DELETE FROM ai_calls;");

let calls = 0;
let lastPrompt = "";
const fake = (json: unknown) => async (req: { user: string }) => {
  calls++;
  lastPrompt = req.user;
  return JSON.stringify(json);
};
const deps = (generate: unknown) => ({ generate: generate as never, model: "fake-model", client: "t" });
const rejects = async (p: Promise<unknown>, label: string) => {
  try {
    await p;
    assert.fail(`${label}: expected rejection`);
  } catch (e) {
    assert.ok(e instanceof AiError, `${label}: ${e}`);
    assert.equal((e as InstanceType<typeof AiError>).code, "malformed", label);
  }
  console.log(`PASS  ${label}`);
};
const brief = { task: "brief", articleId: story.id } as const;
const mk = (over: Record<string, unknown> = {}) => ({
  abstain: false, abstainReason: "",
  whatHappened: [{ text: "A legal scholar warned of a potential loss of the Enlightenment at the Compton Lecture.", sourceIds: ["S1"] }],
  whyItMatters: [{ kind: "interpretation", text: "It frames AI as a question for democratic institutions.", sourceIds: [] }],
  uncertain: [{ text: "The excerpt does not say which innovations are meant.", sourceIds: [] }],
  background: [],
  ...over,
});

// ---- Thin evidence: no excerpt, headline only -> abstain without a model call or quota use
setExcerpt(null); clear(); calls = 0;
for (const input of [brief, { task: "explain", articleId: story.id, audience: "student" } as const]) {
  const r = await runTask(input, deps(fake(mk())));
  assert.ok("abstained" in r && r.abstained && r.abstainReason);
}
assert.equal(calls, 0);
assert.equal((db.prepare("SELECT COUNT(*) n FROM ai_calls").get() as { n: number }).n, 0);
console.log("PASS  no excerpt: brief and explanation abstain with 0 provider calls, 0 quota used");

// ---- Short excerpt -> limited brief; the model is told so and the result is labelled
setExcerpt("A lecture on democracy and AI was held at MIT, the publisher says."); clear(); calls = 0;
let r = await runTask(brief, deps(fake(mk({ whatHappened: [{ text: "A lecture on democracy and AI was held at MIT, the publisher says.", sourceIds: ["S1"] }] }))));
assert.equal(r.meta.evidenceLevel, "limited");
assert.match(lastPrompt, /limited brief/i);
console.log("PASS  short excerpt: model told to write a limited brief; result labelled limited");

// ---- Single source is recorded from the cited excerpts
setExcerpt(EXCERPT); clear();
r = await runTask(brief, deps(fake(mk())));
assert.equal(r.meta.citedPublisherCount, 1);
assert.equal(r.meta.evidenceLevel, "ok");
console.log("PASS  one cited publisher -> citedPublisherCount = 1 (UI shows 'Single source, not independently verified')");
assert.match(lastPrompt, /one publisher/);
console.log("PASS  prompt tells the model all documents come from one publisher");

// ---- Two publishers: add a second article from another feed that shares terms
db.prepare(
  `INSERT OR REPLACE INTO articles (id, canonical_url, slug, title, excerpt, category, feed_id, published_at, first_retrieved_at, last_retrieved_at)
   VALUES ('aaaaaaaaaaaa','https://example.com/f1','fixture-aaaaaaaaaaaa','Martha Minow discusses democracy and the Enlightenment',
   'A different publisher reports a talk about democracy, the Enlightenment and artificial intelligence by a legal scholar, held in a Boston university hall and attended by journalists.','technology','google-research','2026-10-24T00:00:00.000Z','2026-10-25T00:00:00.000Z','2026-10-25T00:00:00.000Z')`,
).run();
clear();
r = await runTask(brief, deps(fake(mk({ whatHappened: [
  { text: "A legal scholar warned of a potential loss of the Enlightenment.", sourceIds: ["S1"] },
  { text: "Another publisher reports a talk about democracy and artificial intelligence by a legal scholar.", sourceIds: ["S2"] },
] }))));
assert.equal(r.meta.citedPublisherCount, 2);
console.log("PASS  claims cited to two publishers -> citedPublisherCount = 2 (no single-source warning)");

// ---- Unsupported factual additions are rejected (heuristic checks)
const bad = async (label: string, patch: Record<string, unknown>) => {
  clear();
  await rejects(runTask(brief, deps(fake(mk(patch)))), label);
};
await bad("added named entity (Google) rejected", { whatHappened: [{ text: "The legal scholar criticized Google at the Compton Lecture.", sourceIds: ["S1"] }] });
await bad("claim mostly outside the cited excerpt rejected", { whatHappened: [{ text: "Quantum computers will replace judges within decades according to researchers.", sourceIds: ["S1"] }] });
await bad("claim cited to the wrong source rejected", { whatHappened: [{ text: "The talk was held in a Boston university hall and attended by journalists.", sourceIds: ["S1"] }] });
await bad("unsupported definition inside a cited claim rejected", { whatHappened: [{ text: "The Enlightenment was a historical period focused on reason and science.", sourceIds: ["S1"] }] });

// ---- A faithful paraphrase (attribution words, "AI" spelled out) is still accepted
clear();
await runTask(brief, deps(fake(mk({ whatHappened: [{ text: "According to MIT News, the lecture addresses the intersection of artificial intelligence and democracy.", sourceIds: ["S1"] }] }))));
console.log("PASS  faithful paraphrase with attribution and spelled-out AI accepted");

// ---- Older cached text containing an inline source ID is cleaned when served
clear();
const dirty = await runTask(brief, deps(fake(mk())));
db.prepare("UPDATE ai_cache SET result_json = replace(result_json, 'warned of a potential', 'warned S1 of a potential')").run();
const served = await runTask(brief, deps(fake(mk())));
assert.ok(served.task === "brief" && !/\bS1\b/.test(served.whatHappened[0].text) && served.whatHappened[0].sourceIds.includes("S1"));
void dirty;
console.log("PASS  cached text with an inline source ID is cleaned; the real citation (sourceIds) is kept");

// ---- Background is separate, uncited, number-free
clear();
r = await runTask(brief, deps(fake(mk({ background: [{ text: "The Enlightenment is the name historians give to an era that stressed reason and scientific thinking." }] }))));
assert.equal(r.task === "brief" && r.background?.length, 1);
assert.ok(r.task === "brief" && r.whatHappened.every((c) => !c.text.includes("historians")));
console.log("PASS  background accepted as a separate, uncited field");
// Background that breaks a rule is dropped; the rest of the answer survives.
for (const [label, note] of [
  ["a number", { text: "The Enlightenment lasted about 100 years." }],
  ["a citation", { text: "The Enlightenment stressed reason.", sourceIds: ["S1"] }],
  ["a quotation", { text: 'It is often called "the Age of Reason".' }],
] as const) {
  clear();
  const kept = await runTask(brief, deps(fake(mk({ background: [note, { text: "The Enlightenment was an era that valued reason." }] }))));
  assert.deepEqual(kept.task === "brief" && kept.background?.map((b) => b.text), ["The Enlightenment was an era that valued reason."], label);
  console.log(`PASS  background note with ${label} dropped; valid note and the brief kept`);
}

// ---- Audience explanation: background goes in its own field, not attributed to a source
clear();
const explain = { task: "explain", articleId: story.id, audience: "student" } as const;
const ex = await runTask(explain, deps(fake({ abstain: false, abstainReason: "", discussionQuestions: [],
  paragraphs: [{ text: "A legal scholar warned of a potential loss of the Enlightenment at the Compton Lecture.", sourceIds: ["S1"] }],
  background: [{ text: "The Enlightenment is the name for an era that valued reason." }] })));
assert.equal(ex.task === "explain" && ex.background?.length, 1);
console.log("PASS  explanation: background kept separate from cited paragraphs");
clear();
await rejects(runTask(explain, deps(fake({ abstain: false, abstainReason: "", discussionQuestions: [],
  paragraphs: [{ text: "The Enlightenment was a historical period focused on reason and science.", sourceIds: ["S1"] }], background: [] }))), "explanation: definition presented as a cited fact rejected");

// ---- Explain these updates (fake provider)
setExcerpt(EXCERPT);
db.prepare(
  `INSERT OR REPLACE INTO articles (id, canonical_url, slug, title, excerpt, category, feed_id, published_at, first_retrieved_at, last_retrieved_at)
   VALUES ('bbbbbbbbbbbb','https://example.com/f2','fixture-bbbbbbbbbbbb','Regulator opens consultation on AI marketing claims',
   'A regulator opened a consultation on how firms describe their use of AI.','finance','sec-press',NULL,'2026-10-25T01:00:00.000Z','2026-10-25T01:00:00.000Z')`,
).run();
const upd = { task: "updates" as const, topic: "AI marketing claims", newIds: ["bbbbbbbbbbbb"], seenIds: [story.id] };
const good = { abstain: false, abstainReason: "", cannotEstablish: "The excerpt does not say when the consultation opened.",
  items: [{ text: "A regulator opened a consultation on how firms describe their use of AI.", sourceIds: ["S1"], relation: "new_development_reported" }] };
clear(); calls = 0;
const u1 = await runTask(upd, deps(fake(good)));
assert.equal(u1.task, "updates");
assert.equal(u1.task === "updates" && u1.citations[0].articleId, "bbbbbbbbbbbb");
assert.match(lastPrompt, /previously_seen_coverage/);
assert.match(lastPrompt, /retrieval time is not event time/);
console.log("PASS  updates: only new coverage cited; prompt separates new from previously seen and bans inferring event time");
await runTask(upd, deps(fake(good)));
assert.equal(calls, 1);
console.log("PASS  updates: repeat served from cache (1 provider call)");
clear();
await rejects(runTask(upd, deps(fake({ ...good, items: [{ ...good.items[0], sourceIds: ["S2"] }] }))), "updates: item citing only previously seen coverage rejected");
await rejects(runTask(upd, deps(fake({ ...good, items: [{ ...good.items[0], relation: "huge_news" }] }))), "updates: unknown relation value rejected");
await rejects(runTask(upd, deps(fake({ ...good, items: [{ ...good.items[0], sourceIds: ["S9"] }] }))), "updates: unknown source ID rejected");
try {
  await runTask({ ...upd, newIds: ["ffffffffffff"] }, deps(fake(good)));
  assert.fail("expected not_found");
} catch (e) {
  assert.equal((e as InstanceType<typeof AiError>).code, "not_found");
  console.log("PASS  updates: unknown article ids -> not_found, no provider call");
}
const ab = await runTask({ ...upd, topic: "AI marketing claims " }, deps(fake({ abstain: true, abstainReason: "The excerpt is not about the topic.", items: [], cannotEstablish: "" })));
assert.equal(ab.task === "updates" && ab.abstained, true);
console.log("PASS  updates: model may abstain");
// ---- Ask on a story page: "it" / "this story" resolve to the current story
setExcerpt(EXCERPT); clear();
const goodAnswer = { answerable: true, limitations: "The excerpt gives no further detail.", claims: [{ text: "A legal scholar warned of a potential loss of the Enlightenment at the Compton Lecture.", sourceIds: ["S1"] }] };
const onStory = await runTask({ task: "ask", question: "explain me about it", articleId: story.id }, deps(fake(goodAnswer)));
assert.match(lastPrompt, /CURRENT STORY/);
assert.match(lastPrompt, /At MIT, Martha Minow speaks/);
assert.match(lastPrompt, /one publisher limits independent verification but does not stop you/i);
assert.equal(onStory.meta.promptVersion, "v3");
const global = await runTask({ task: "ask", question: "what did the legal scholar warn about the Enlightenment" }, deps(fake({ answerable: false, claims: [], limitations: "Not established." })));
assert.doesNotMatch(lastPrompt, /CURRENT STORY/);
console.log("PASS  ask on a story: prompt names the current story and tells the model what 'it'/'this' mean; global ask does not");
assert.equal(global.task, "ask");
// ---- Regression: Professional explanation that keeps verify-advice in `limitations` is accepted;
// the same advice inside a cited paragraph dilutes grounding and is rejected.
db.prepare("UPDATE articles SET title = ?, excerpt = ? WHERE id = ?").run(
  "CSX sees rail conversion opportunities from battered trucking market",
  "The railroad is reviewing shipper truckload files to provide service and cost comparisons for intermodal opportunities.",
  story.id,
);
db.prepare("DELETE FROM articles WHERE id IN ('aaaaaaaaaaaa','bbbbbbbbbbbb')").run();
const pro = { task: "explain", articleId: story.id, audience: "professional" } as const;
const proBase = { abstain: false, abstainReason: "", discussionQuestions: [], background: [] };
clear();
const proOk = await runTask(pro, deps(fake({ ...proBase,
  paragraphs: [{ text: "According to MIT News, CSX is reviewing shipper truckload files to provide service and cost comparisons for intermodal opportunities.", sourceIds: ["S1"] }],
  limitations: "The excerpt gives no routes, timelines or rate details. A practitioner would want to confirm the actual comparisons with CSX before acting." })));
assert.ok(proOk.task === "explain" && proOk.limitations?.includes("confirm"));
assert.equal(proOk.meta.evidenceLevel, "limited");
console.log("PASS  professional explanation: caveats in limitations, short cited paragraph accepted; excerpt limited");
clear();
await rejects(runTask(pro, deps(fake({ ...proBase,
  paragraphs: [{ text: "CSX is reviewing shipper truckload files to compare service and cost for intermodal opportunities. Practitioners should confirm lane coverage, transit reliability and pricing assumptions with CSX directly, because the excerpt does not give routes, timelines or rate details. Logistics managers evaluating modal shifts would want independent benchmarks before acting.", sourceIds: ["S1"] }],
  limitations: "" }))), "uncited commentary mixed into a cited paragraph is still rejected (grounding preserved)");
clear();
await rejects(runTask(pro, deps(fake({ ...proBase,
  paragraphs: [{ text: "CSX is reviewing shipper truckload files for intermodal opportunities.", sourceIds: ["S1"] }],
  limitations: "See https://example.com for the missing details." }))), "limitations containing a URL rejected");
console.log("\nAll evidence-quality and updates tests passed.");
