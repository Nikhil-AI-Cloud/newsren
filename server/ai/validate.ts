import type { AnswerResult, BackgroundNote, BriefResult, Citation, Claim, ExplanationResult, GenerationMeta, InterpretiveClaim, UpdateClaim, UpdatesResult } from "../../types/ai.ts";
import { AiError } from "./errors.ts";
import { type EvidenceDoc, tokenize } from "./retrieve.ts";

const MAX_TEXT = 600;
const MAX_QUESTION_TEXT = 200;

const malformed = (why: string) =>
  new AiError("malformed", "The AI returned an answer Newsren could not verify, so it was discarded. Please try again.", 502, undefined, why);

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseJson(text: string | undefined): Obj {
  if (!text) throw malformed("empty response");
  try {
    const v: unknown = JSON.parse(text);
    if (!isObj(v)) throw new Error("not an object");
    return v;
  } catch {
    throw malformed("not valid JSON");
  }
}

/** Lowercased evidence text the model's facts must be traceable to. */
function evidenceBlob(docs: EvidenceDoc[]): string {
  return docs
    .map((d) => `${d.title} ${d.excerpt ?? ""} ${d.publisher} ${d.publishedAt ?? ""}`)
    .join(" \n ")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

const ADVICE = /\b(you should|i recommend|we recommend|i suggest you|consider)\b[^.]{0,40}\b(buy|sell|hold|invest in|short)\b/i;

/** Rejects text that smuggles in URLs, unsupported numbers or quotations, or investment advice. */
function checkText(text: string, blob: string, opts: { numbers: boolean }): string {
  // Models sometimes write the source ID into the sentence; citations belong in sourceIds only.
  const t = text.replace(/\s*\[?\bS\d{1,2}\b\]?/g, "").trim().replace(/\s+/g, " ");
  if (!t) throw malformed("empty text");
  if (t.length > MAX_TEXT) throw malformed("text too long");
  if (/https?:\/\/|www\./i.test(t)) throw malformed("contains a URL");
  if (ADVICE.test(t)) throw malformed("contains investment advice");
  if (opts.numbers) {
    for (const m of t.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
      const n = m[0].replace(/,/g, "").replace(/\.$/, "");
      if (/^\d$/.test(n) || n === "10") continue; // small counts such as "two sources" or "1 of 3"
      if (!blob.replace(/,/g, "").includes(n)) throw malformed(`number ${n} not in the excerpts`);
    }
  }
  const normalized = t.replace(/[“”]/g, '"');
  for (const m of normalized.matchAll(/"([^"]{4,})"/g)) {
    if (!blob.includes(m[1].toLowerCase().replace(/[‘’]/g, "'"))) throw malformed("quotation not in the excerpts");
  }
  return t;
}

const NOT_NAMES = new Set("January February March April May June July August September October November December Monday Tuesday Wednesday Thursday Friday Saturday Sunday".split(" "));
const MIN_OVERLAP = 0.5;
/** Attribution and filler words that say nothing about the story, so they do not count against a claim. */
const NEUTRAL = new Set("according report reports says said stated states notes noted describes described discusses discussed addresses address explains explained publisher article story excerpt headline news also however while about their which would could that this these those other another further including several".split(" "));

/**
 * Heuristic check that a cited claim stays within its cited excerpts: most of its
 * content words, and every capitalized name or acronym, must appear in them. This
 * catches obvious additions; it cannot prove a paraphrase is accurate.
 */
export function checkGrounded(text: string, cited: EvidenceDoc[]): void {
  const raw = cited.map((d) => `${d.title} ${d.excerpt ?? ""} ${d.publisher}`).join(" \n ");
  const have = new Set(tokenize(raw));
  // "AI" in the excerpt licenses the spelled-out form in a summary.
  if (/\bai\b/.test(raw.toLowerCase())) {
    have.add("artificial");
    have.add("intelligence");
  }
  const words = tokenize(text).filter((t) => t.length >= 4 && !NEUTRAL.has(t));
  if (words.length >= 3 && words.filter((w) => have.has(w)).length / words.length < MIN_OVERLAP) {
    throw malformed(`claim goes beyond the cited excerpts: ${text.slice(0, 90)}`);
  }
  const lower = raw.toLowerCase();
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const parts = sentence.split(/\s+/).slice(1); // the first word is capitalized anyway
    for (const w of parts) {
      const word = w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
      if (/^[A-Z]{2,}$/.test(word)) {
        if (!new RegExp(`\\b${word.toLowerCase()}\\b`).test(lower)) throw malformed(`acronym ${word} not in the cited excerpts: ${text.slice(0, 90)}`);
      } else if (/^[A-Z][a-z]{3,}$/.test(word) && !NOT_NAMES.has(word)) {
        if (!have.has(tokenize(word)[0] ?? word.toLowerCase())) throw malformed(`name ${word} not in the cited excerpts: ${text.slice(0, 90)}`);
      }
    }
  }
}

function citedDocs(docs: EvidenceDoc[], ids: string[]): EvidenceDoc[] {
  return docs.filter((d) => ids.includes(d.ref));
}

/**
 * General background: no citations, no numbers, no URLs or quotations, short. Background is
 * optional, so a note that breaks a rule is dropped instead of discarding the whole answer;
 * only a malformed field is an error.
 */
function background(value: unknown): BackgroundNote[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw malformed("bad background");
  const notes: BackgroundNote[] = [];
  for (const b of value.slice(0, 2)) {
    if (!isObj(b) || typeof b.text !== "string" || "sourceIds" in b) continue;
    const t = b.text.trim().replace(/\s+/g, " ");
    if (!t || t.length > 300) continue;
    if (/\d/.test(t) || /https?:\/\/|www\.|["“”]/.test(t) || ADVICE.test(t)) continue;
    notes.push({ text: t });
  }
  return notes;
}

function refs(value: unknown, valid: Set<string>, required: boolean): string[] {
  if (!Array.isArray(value)) throw malformed("sourceIds is not a list");
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string" || !valid.has(v)) throw malformed(`unknown source ID ${String(v).slice(0, 20)}`);
    if (!out.includes(v)) out.push(v);
  }
  if (required && out.length === 0) throw malformed("a factual claim has no citation");
  return out;
}

function claims(value: unknown, valid: Set<string>, blob: string, opts: { cite: boolean; min: number; max: number }, docs: EvidenceDoc[]): Claim[] {
  if (!Array.isArray(value)) throw malformed("claims is not a list");
  if (value.length < opts.min || value.length > opts.max) throw malformed("wrong number of claims");
  return value.map((c) => {
    if (!isObj(c) || typeof c.text !== "string") throw malformed("bad claim");
    const text = checkText(c.text, blob, { numbers: true });
    const sourceIds = refs(c.sourceIds, valid, opts.cite);
    if (opts.cite) checkGrounded(text, citedDocs(docs, sourceIds));
    return { text, sourceIds };
  });
}

function citationsFor(docs: EvidenceDoc[], used: Claim[][]): Citation[] {
  const cited = new Set(used.flat().flatMap((c) => c.sourceIds));
  return docs
    .filter((d) => cited.has(d.ref))
    .map((d) => ({
      ref: d.ref,
      articleId: d.articleId,
      title: d.title,
      publisher: d.publisher,
      url: d.url,
      publishedAt: d.publishedAt,
      retrievedAt: d.retrievedAt,
    }));
}

/** Citations for the cited refs, plus how many distinct publishers they come from. */
function withCitations(docs: EvidenceDoc[], used: Claim[][], meta: GenerationMeta): { citations: Citation[]; meta: GenerationMeta } {
  const citations = citationsFor(docs, used);
  return { citations, meta: { ...meta, citedPublisherCount: new Set(citations.map((c) => c.publisher)).size } };
}

function abstainReason(o: Obj): string {
  const r = typeof o.abstainReason === "string" ? o.abstainReason.trim().replace(/\s+/g, " ") : "";
  if (!r || r.length > 400 || /https?:\/\//i.test(r)) throw malformed("bad abstain reason");
  return r;
}

export function validateBrief(raw: Obj, docs: EvidenceDoc[], meta: GenerationMeta): BriefResult {
  const valid = new Set(docs.map((d) => d.ref));
  const blob = evidenceBlob(docs);
  if (typeof raw.abstain !== "boolean") throw malformed("abstain missing");
  if (raw.abstain) {
    return { task: "brief", abstained: true, abstainReason: abstainReason(raw), whatHappened: [], whyItMatters: [], uncertain: [], citations: [], meta };
  }
  const whatHappened = claims(raw.whatHappened, valid, blob, { cite: true, min: 1, max: 4 }, docs);
  if (!Array.isArray(raw.whyItMatters)) throw malformed("whyItMatters missing");
  if (raw.whyItMatters.length < 1 || raw.whyItMatters.length > 4) throw malformed("wrong number of items");
  const whyItMatters: InterpretiveClaim[] = raw.whyItMatters.map((c) => {
    if (!isObj(c) || typeof c.text !== "string" || (c.kind !== "reported" && c.kind !== "interpretation")) throw malformed("bad whyItMatters item");
    const kind = c.kind;
    const sourceIds = refs(c.sourceIds, valid, kind === "reported");
    const text = checkText(c.text, blob, { numbers: kind === "reported" });
    if (kind === "reported") checkGrounded(text, citedDocs(docs, sourceIds));
    return {
      kind,
      // Interpretation is the model's own reading, so numbers in it are not required to appear in the excerpts.
      text,
      sourceIds,
    };
  });
  const uncertain = claims(raw.uncertain, valid, blob, { cite: false, min: 0, max: 4 }, docs);
  return {
    task: "brief",
    abstained: false,
    abstainReason: null,
    whatHappened,
    whyItMatters,
    uncertain,
    background: background(raw.background),
    ...withCitations(docs, [whatHappened, whyItMatters, uncertain], meta),
  };
}

export function validateExplanation(raw: Obj, docs: EvidenceDoc[], meta: GenerationMeta, audience: ExplanationResult["audience"]): ExplanationResult {
  const valid = new Set(docs.map((d) => d.ref));
  const blob = evidenceBlob(docs);
  if (typeof raw.abstain !== "boolean") throw malformed("abstain missing");
  if (raw.abstain) {
    return { task: "explain", audience, abstained: true, abstainReason: abstainReason(raw), paragraphs: [], discussionQuestions: [], citations: [], meta };
  }
  const paragraphs = claims(raw.paragraphs, valid, blob, { cite: true, min: 1, max: 4 }, docs);
  const questions = Array.isArray(raw.discussionQuestions) ? raw.discussionQuestions : [];
  if (audience !== "educator" && questions.length > 0) throw malformed("discussion questions for a non-educator audience");
  const discussionQuestions = questions.slice(0, 3).map((q) => {
    if (typeof q !== "string") throw malformed("bad discussion question");
    const t = checkText(q, blob, { numbers: true });
    if (!t.endsWith("?")) throw malformed("discussion question is not a question");
    return t;
  });
  // Limitations describe gaps and what to verify, so they are not grounded in the excerpts; they still get the URL/advice checks.
  const limitations = typeof raw.limitations === "string" && raw.limitations.trim() ? checkText(raw.limitations, blob, { numbers: false }) : undefined;
  return { task: "explain", audience, abstained: false, abstainReason: null, paragraphs, discussionQuestions, background: background(raw.background), ...(limitations ? { limitations } : {}), ...withCitations(docs, [paragraphs], meta) };
}

export function validateAnswer(raw: Obj, docs: EvidenceDoc[], meta: GenerationMeta, question: string): AnswerResult {
  const valid = new Set(docs.map((d) => d.ref));
  const blob = evidenceBlob(docs);
  if (typeof raw.answerable !== "boolean") throw malformed("answerable missing");
  const limitations = typeof raw.limitations === "string" ? raw.limitations.trim().replace(/\s+/g, " ") : "";
  if (!limitations || limitations.length > 500 || /https?:\/\//i.test(limitations)) throw malformed("bad limitations");
  if (!raw.answerable) {
    return { task: "ask", question, answerable: false, claims: [], limitations, citations: [], meta };
  }
  const answer = claims(raw.claims, valid, blob, { cite: true, min: 1, max: 4 }, docs);
  return { task: "ask", question, answerable: true, claims: answer, limitations, ...withCitations(docs, [answer], meta) };
}

export function validateUpdates(raw: Obj, docs: EvidenceDoc[], meta: GenerationMeta, topic: string, newRefs: string[]): UpdatesResult {
  const valid = new Set(docs.map((d) => d.ref));
  const blob = evidenceBlob(docs);
  if (typeof raw.abstain !== "boolean") throw malformed("abstain missing");
  if (raw.abstain) {
    return { task: "updates", topic, abstained: true, abstainReason: abstainReason(raw), items: [], cannotEstablish: "", citations: [], meta: { ...meta, citedPublisherCount: 0 } };
  }
  if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 4) throw malformed("wrong number of items");
  const items: UpdateClaim[] = raw.items.map((c) => {
    if (!isObj(c) || typeof c.text !== "string") throw malformed("bad item");
    if (c.relation !== "new_development_reported" && c.relation !== "another_report_of_known_event" && c.relation !== "cannot_tell") throw malformed("bad relation");
    const text = checkText(c.text, blob, { numbers: true });
    const sourceIds = refs(c.sourceIds, valid, true);
    if (!sourceIds.some((id) => newRefs.includes(id))) throw malformed("an update item cites no new coverage");
    checkGrounded(text, citedDocs(docs, sourceIds));
    return { text, sourceIds, relation: c.relation };
  });
  const cannot = typeof raw.cannotEstablish === "string" ? raw.cannotEstablish.trim().replace(/\s+/g, " ") : "";
  if (!cannot || cannot.length > 500 || /https?:\/\//i.test(cannot)) throw malformed("bad cannotEstablish");
  return { task: "updates", topic, abstained: false, abstainReason: null, items, cannotEstablish: cannot, ...withCitations(docs, [items], meta) };
}

export { MAX_QUESTION_TEXT };
