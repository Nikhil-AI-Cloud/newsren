import type { AiResult, GenerationMeta } from "../../types/ai.ts";
import type { ExplanationMode } from "../../types/index.ts";
import { cacheKey, getCached, type Limits, limitsFromEnv, putCached, takeCallSlot } from "./cache.ts";
import { AiError } from "./errors.ts";
import { ASK_SCHEMA, askPrompt, BRIEF_SCHEMA, briefPrompt, EXPLAIN_SCHEMA, explainPrompt, promptVersion, SYSTEM_INSTRUCTION, UPDATES_SCHEMA, updatesPrompt } from "./prompts.ts";
import type { Generate } from "./provider.ts";
import { assessEvidence, docsByIds, type EvidenceDoc, evidenceHash, retrieveEvidence } from "./retrieve.ts";
import { parseJson, validateAnswer, validateBrief, validateExplanation, validateUpdates } from "./validate.ts";

export type TaskInput =
  | { task: "brief"; articleId: string }
  | { task: "explain"; articleId: string; audience: ExplanationMode }
  | { task: "ask"; question: string; articleId?: string }
  /** Explain new matching coverage for a saved topic. Ids are stored article ids. */
  | { task: "updates"; topic: string; newIds: string[]; seenIds: string[] };

export interface RunDeps {
  generate: Generate;
  model: string;
  /** Opaque caller id (hashed before storage) for per-client limits. */
  client: string;
  limits?: Limits;
  now?: () => Date;
}

export const QUESTION_MIN = 5;
export const QUESTION_MAX = 300;
const TIMEOUT_MS = 30_000;
const MAX_OUTPUT = { brief: 3000, explain: 2500, ask: 2000, updates: 2500 } as const;

const g = globalThis as unknown as { __newsrenAiInflight?: Map<string, Promise<AiResult>> };
const inflight = (g.__newsrenAiInflight ??= new Map());

interface Prepared {
  docs: EvidenceDoc[];
  hash: string;
  key: string;
  audience?: ExplanationMode;
  question?: string;
  /** Distinguishes cache entries that share evidence but differ in setup (updates). */
  variant?: string;
  /** Updates only: refs of the new-coverage documents. */
  newRefs?: string[];
  level?: "none" | "limited" | "ok";
}

const ID = /^[0-9a-f]{12}$/;
const MAX_NEW = 6;
const MAX_SEEN_CONTEXT = 4;

const SOURCE_MARK = /\s*\[?\bS\d{1,2}\b\]?/g;

/** Results saved before inline source IDs were stripped may still contain them in sentences. */
function scrub(r: AiResult): AiResult {
  const fix = <T extends { text: string }>(items: T[] | undefined): T[] | undefined =>
    items?.map((c) => ({ ...c, text: c.text.replace(SOURCE_MARK, "").trim() }));
  const copy = { ...r } as Record<string, unknown>;
  for (const key of ["whatHappened", "whyItMatters", "uncertain", "paragraphs", "claims", "items"]) {
    if (key in copy) copy[key] = fix(copy[key] as { text: string }[]);
  }
  return copy as unknown as AiResult;
}

function fromCache(hit: AiResult): AiResult {
  return scrub({ ...hit, meta: { ...hit.meta, cached: true } } as AiResult);
}

export function normalizeQuestion(q: string): string {
  return q.trim().replace(/\s+/g, " ");
}

function prepare(input: TaskInput, model: string): Prepared {
  if (input.task === "updates") {
    const topic = normalizeQuestion(input.topic);
    if (topic.length < 3 || topic.length > 140) throw new AiError("bad_request", "The saved topic must be 3 to 140 characters.", 400);
    const clean = (ids: unknown, max: number) =>
      Array.isArray(ids) ? [...new Set(ids.filter((i): i is string => typeof i === "string" && ID.test(i)))].slice(0, max) : [];
    const newIds = clean(input.newIds, MAX_NEW);
    const seenIds = clean(input.seenIds, 50).filter((i) => !newIds.includes(i)).slice(-MAX_SEEN_CONTEXT);
    const fresh = docsByIds(newIds);
    if (fresh.length === 0) throw new AiError("not_found", "None of the new articles is in Newsren's article store.", 404);
    const context = docsByIds(seenIds, fresh.length + 1);
    const docs = [...fresh, ...context];
    const newRefs = fresh.map((d) => d.ref);
    const hash = evidenceHash(docs);
    const variant = `new:${fresh.map((d) => d.articleId).sort().join(",")}`;
    const key = cacheKey({ task: "updates", model, promptVersion: promptVersion("updates"), evidenceHash: hash, audience: variant, question: topic });
    return { docs, hash, key, question: topic, variant, newRefs };
  }
  let question: string | undefined;
  if (input.task === "ask") {
    question = normalizeQuestion(input.question);
    if (question.length < QUESTION_MIN) throw new AiError("bad_request", `Ask a question of at least ${QUESTION_MIN} characters.`, 400);
    if (question.length > QUESTION_MAX) throw new AiError("bad_request", `Keep the question under ${QUESTION_MAX} characters.`, 400);
  }
  const docs = retrieveEvidence({ articleId: input.articleId, question });
  if (input.task !== "ask" && docs.length === 0) throw new AiError("not_found", "That story is not in Newsren's article store.", 404);
  if (input.task === "ask" && input.articleId && docs.length === 0) throw new AiError("not_found", "That story is not in Newsren's article store.", 404);
  const hash = evidenceHash(docs);
  const audience = input.task === "explain" ? input.audience : undefined;
  const key = cacheKey({ task: input.task, model, promptVersion: promptVersion(input.task), evidenceHash: hash, audience, question });
  const level = input.task === "ask" ? undefined : assessEvidence(docs).level;
  return { docs, hash, key, audience, question, level };
}

function metaFor(docs: EvidenceDoc[], model: string, now: Date, cached: boolean, task = "brief"): GenerationMeta {
  return {
    model,
    promptVersion: promptVersion(task),
    generatedAt: now.toISOString(),
    cached,
    evidenceCount: docs.length,
    publisherCount: new Set(docs.map((d) => d.publisher)).size,
  };
}

/** Result for a story whose feed excerpt is too thin to brief. No model call, no quota. */
function thinResult(input: TaskInput & { task: "brief" | "explain" }, now: Date): AiResult {
  const meta: GenerationMeta = { model: "none (no model call)", promptVersion: promptVersion("brief"), generatedAt: now.toISOString(), cached: false, evidenceCount: 0, publisherCount: 0, citedPublisherCount: 0, evidenceLevel: "limited" };
  const abstainReason = "The publisher's feed gave no usable excerpt for this story (at most a headline), so Newsren cannot say more than the headline and the original link.";
  return input.task === "brief"
    ? { task: "brief", abstained: true, abstainReason, whatHappened: [], whyItMatters: [], uncertain: [], citations: [], meta }
    : { task: "explain", audience: input.audience, abstained: true, abstainReason, paragraphs: [], discussionQuestions: [], citations: [], meta };
}

/** Returns cached output for this input if present. Makes no provider call and uses no quota. */
export function peekTask(input: TaskInput, model: string): AiResult | null {
  try {
    const p = prepare(input, model);
    const hit = getCached(p.key);
    return hit ? fromCache(hit) : null;
  } catch {
    return null;
  }
}

export async function runTask(input: TaskInput, deps: RunDeps): Promise<AiResult> {
  const { model } = deps;
  const now = deps.now ?? (() => new Date());
  const p = prepare(input, model);

  // No relevant stored article: answer honestly without spending any quota.
  if (input.task === "ask" && p.docs.length === 0) {
    return {
      task: "ask",
      question: p.question!,
      answerable: false,
      claims: [],
      limitations: "No stored article matched this question, so there are no sources to answer from.",
      citations: [],
      meta: { ...metaFor(p.docs, "none (no model call)", now(), false) },
    };
  }

  if ((input.task === "brief" || input.task === "explain") && p.level === "none") return thinResult(input, now());

  const hit = getCached(p.key);
  if (hit) return fromCache(hit);

  const existing = inflight.get(p.key);
  if (existing) return existing;

  const job = (async (): Promise<AiResult> => {
    takeCallSlot(deps.client, deps.limits ?? limitsFromEnv());
    const base = { model, system: SYSTEM_INSTRUCTION, timeoutMs: TIMEOUT_MS };
    const meta = (): GenerationMeta => ({ ...metaFor(p.docs, model, now(), false, input.task), evidenceLevel: p.level === "limited" ? "limited" : "ok" });
    const ctx = { limited: p.level === "limited" };
    let result: AiResult;
    if (input.task === "brief") {
      const text = await deps.generate({ ...base, user: briefPrompt(p.docs, ctx), schema: BRIEF_SCHEMA, maxOutputTokens: MAX_OUTPUT.brief });
      result = validateBrief(parseJson(text), p.docs, meta());
    } else if (input.task === "explain") {
      const text = await deps.generate({ ...base, user: explainPrompt(p.docs, input.audience, ctx), schema: EXPLAIN_SCHEMA, maxOutputTokens: MAX_OUTPUT.explain });
      result = validateExplanation(parseJson(text), p.docs, meta(), input.audience);
    } else if (input.task === "updates") {
      const text = await deps.generate({ ...base, user: updatesPrompt(p.question!, p.docs, p.newRefs!), schema: UPDATES_SCHEMA, maxOutputTokens: MAX_OUTPUT.updates });
      result = validateUpdates(parseJson(text), p.docs, meta(), p.question!, p.newRefs!);
    } else {
      const text = await deps.generate({ ...base, user: askPrompt(p.docs, p.question!, !!input.articleId), schema: ASK_SCHEMA, maxOutputTokens: MAX_OUTPUT.ask });
      result = validateAnswer(parseJson(text), p.docs, meta(), p.question!);
    }
    putCached(p.key, { task: input.task, model, promptVersion: promptVersion(input.task), evidenceHash: p.hash, audience: p.audience ?? p.variant }, result);
    return result;
  })().finally(() => inflight.delete(p.key));

  inflight.set(p.key, job);
  return job;
}
