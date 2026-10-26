// REAL Gemini calls (a handful). Run: node --env-file=.env.local scripts/ai-real-test.ts
// Prints results only; never the key or prompts.
import { DatabaseSync } from "node:sqlite";
import { geminiGenerate, configuredModel } from "../server/ai/provider.ts";
import { runTask } from "../server/ai/run.ts";
import type { Generate } from "../server/ai/provider.ts";

let providerCalls = 0;
const counted: Generate = async (req) => {
  providerCalls++;
  return geminiGenerate(req);
};
const deps = { generate: counted, model: configuredModel(), client: "real-test" };

const db = new DatabaseSync(".data/newsren.sqlite");
const story = db
  .prepare("SELECT id, title FROM articles WHERE feed_id = 'mit-news-ai' ORDER BY published_at DESC LIMIT 1")
  .get() as { id: string; title: string };
console.log("model:", deps.model, "| story:", story.title);

async function step(name: string, input: Parameters<typeof runTask>[0]) {
  const before = providerCalls;
  const t0 = Date.now();
  try {
    const r = await runTask(input, deps);
    console.log(`\n== ${name} | provider calls this step: ${providerCalls - before} | cached=${r.meta.cached} | ${Date.now() - t0}ms`);
    console.log(JSON.stringify(r, null, 1).slice(0, 2600));
  } catch (e) {
    console.log(`\n== ${name} FAILED:`, (e as Error).name, (e as { code?: string }).code, (e as Error).message, (e as { detail?: string }).detail ?? "");
  }
}

await step("brief", { task: "brief", articleId: story.id });
await step("brief again (cache)", { task: "brief", articleId: story.id });
await step("explain student", { task: "explain", articleId: story.id, audience: "student" });
await step("ask supported", { task: "ask", articleId: story.id, question: "Who spoke at the Compton Lecture and what did they say about AI?" });
await step("ask unsupported", { task: "ask", articleId: story.id, question: "What was the final stock price of NVIDIA last Friday?" });
await step("ask supported again (cache)", { task: "ask", articleId: story.id, question: "Who spoke at the Compton Lecture and what did they say about AI?" });
console.log("\nTOTAL provider calls:", providerCalls);
