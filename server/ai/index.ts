import "server-only";

import { type AiResult } from "@/types/ai";
import { AiError } from "./errors";
import { aiConfigured, configuredModel, geminiGenerate } from "./provider";
import { peekTask, runTask, type TaskInput } from "./run";

export { AiError, aiConfigured, configuredModel };
export type { TaskInput };

/** Runs a task with the real Gemini provider. Only call this from a user-triggered route handler. */
export function runAiTask(input: TaskInput, client: string): Promise<AiResult> {
  return runTask(input, { generate: geminiGenerate, model: configuredModel(), client });
}

/** Cache-only lookup for page rendering. Never calls the provider. */
export function peekAiTask(input: TaskInput): AiResult | null {
  return peekTask(input, configuredModel());
}
