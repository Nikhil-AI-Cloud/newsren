import type { ExplanationMode } from "@/types";

/** A supplied source, resolved by the server from the stored article. */
export interface Citation {
  /** Reference used in the model output and in `sourceIds`, e.g. "S1". */
  ref: string;
  articleId: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  retrievedAt: string;
}

export interface Claim {
  text: string;
  /** Refs into `citations`. */
  sourceIds: string[];
}

export interface InterpretiveClaim extends Claim {
  /** "reported" must be supported by cited excerpts; "interpretation" is the model's reading. */
  kind: "reported" | "interpretation";
}

export interface GenerationMeta {
  model: string;
  promptVersion: string;
  /** ISO timestamp of the model call that produced this output. */
  generatedAt: string;
  /** True when served from the SQLite cache without calling the provider. */
  cached: boolean;
  evidenceCount: number;
  /** Distinct publishers among the supplied excerpts. */
  publisherCount: number;
  /** Distinct publishers among the excerpts actually cited. Absent in results saved before v2. */
  citedPublisherCount?: number;
  /** "limited" = the excerpt is short, so only a limited brief was attempted. Absent before v2. */
  evidenceLevel?: "ok" | "limited";
}

/** Model-written general context. Not drawn from the sources and never cited. */
export interface BackgroundNote {
  text: string;
}

interface Base {
  citations: Citation[];
  meta: GenerationMeta;
}

export interface BriefResult extends Base {
  task: "brief";
  abstained: boolean;
  abstainReason: string | null;
  whatHappened: Claim[];
  whyItMatters: InterpretiveClaim[];
  uncertain: Claim[];
  background?: BackgroundNote[];
}

export interface ExplanationResult extends Base {
  task: "explain";
  audience: ExplanationMode;
  abstained: boolean;
  abstainReason: string | null;
  paragraphs: Claim[];
  discussionQuestions: string[];
  background?: BackgroundNote[];
  /** What the excerpts do not show, and what to verify. Uncited; absent in results saved before v3. */
  limitations?: string;
}

export interface AnswerResult extends Base {
  task: "ask";
  question: string;
  /** False when the supplied excerpts do not establish an answer. */
  answerable: boolean;
  claims: Claim[];
  limitations: string;
}

export type UpdateRelation = "new_development_reported" | "another_report_of_known_event" | "cannot_tell";

export interface UpdateClaim extends Claim {
  relation: UpdateRelation;
}

export interface UpdatesResult extends Base {
  task: "updates";
  topic: string;
  abstained: boolean;
  abstainReason: string | null;
  items: UpdateClaim[];
  /** What the excerpts cannot establish about what changed. */
  cannotEstablish: string;
}

export type AiResult = BriefResult | ExplanationResult | AnswerResult | UpdatesResult;

export type AiErrorCode =
  | "not_configured"
  | "invalid_credentials"
  | "quota"
  | "rate_limited"
  | "timeout"
  | "malformed"
  | "provider"
  | "bad_request"
  | "not_found"
  | "sources_unavailable";

export interface AiErrorBody {
  error: { code: AiErrorCode; message: string; retryAfterSeconds?: number };
}
