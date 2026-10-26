import "server-only";

import { notConnectedAnswerer, notConnectedUpdateChecker } from "./not-connected";
import type { QuestionAnswerer, UpdateChecker } from "./types";

/**
 * Integration registry. Replace the not-connected stubs with real providers
 * later. Credentials (for example NEWS_API_KEY, LLM_API_KEY) are read here, on
 * the server, and are never prefixed NEXT_PUBLIC_.
 */
export const questionAnswerer: QuestionAnswerer = notConnectedAnswerer;
export const updateChecker: UpdateChecker = notConnectedUpdateChecker;

export type { AskAnswer, AskInput, QuestionAnswerer, TopicUpdate, UpdateChecker } from "./types";
