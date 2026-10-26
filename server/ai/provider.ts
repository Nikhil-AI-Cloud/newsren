import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { AiError } from "./errors.ts";

export interface GenerateRequest {
  model: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  timeoutMs: number;
}

/** Returns the model's raw JSON text. Throws AiError for every failure. */
export type Generate = (req: GenerateRequest) => Promise<string>;

/** Default model: a GA Flash-Lite model with a free tier (see README). Override with GEMINI_MODEL. */
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export function configuredModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function aiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY?.trim();
}

/** Maps an SDK or network error to a reader-safe AiError. Never includes the request or the key. */
export function classifyError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const name = err instanceof Error ? err.name : "";
  if (name === "TimeoutError" || name === "AbortError") {
    return new AiError("timeout", "The AI took too long to respond. Please try again.", 504);
  }
  const status = err instanceof ApiError ? err.status : typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : 0;
  const message = err instanceof Error ? err.message : "";
  if (status === 429 || /RESOURCE_EXHAUSTED/.test(message)) {
    return new AiError("quota", "The free AI quota is used up for now. Please try again later.", 429, 3600, `status ${status}`);
  }
  if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
    return new AiError("invalid_credentials", "The Gemini API key was rejected. Check GEMINI_API_KEY on the server.", 502, undefined, `status ${status}`);
  }
  if (status === 404) {
    return new AiError("provider", "The configured Gemini model is not available. Check GEMINI_MODEL.", 502, undefined, "status 404");
  }
  return new AiError("provider", "The AI service returned an error. Please try again later.", 502, undefined, status ? `status ${status}` : "network");
}

let client: GoogleGenAI | undefined;
let clientKeyLength = 0;

function getClient(timeoutMs: number): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AiError("not_configured", "AI is not configured: GEMINI_API_KEY is missing on the server.", 503);
  if (!client || clientKeyLength !== apiKey.length) {
    // One attempt only: no SDK retries, so a failure cannot multiply quota use.
    client = new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } } });
    clientKeyLength = apiKey.length;
  }
  return client;
}

export const geminiGenerate: Generate = async (req) => {
  const ai = getClient(req.timeoutMs);
  try {
    const res = await ai.models.generateContent({
      model: req.model,
      contents: req.user,
      config: {
        systemInstruction: req.system,
        responseMimeType: "application/json",
        responseJsonSchema: req.schema,
        maxOutputTokens: req.maxOutputTokens,
        temperature: 0.2,
        ...(req.model.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        abortSignal: AbortSignal.timeout(req.timeoutMs),
      },
    });
    const candidate = res.candidates?.[0];
    if (res.promptFeedback?.blockReason || (candidate?.finishReason && !["STOP"].includes(String(candidate.finishReason)))) {
      throw new AiError("malformed", "The AI did not finish a usable answer, so nothing was shown. Please try again.", 502, undefined, `finish ${String(candidate?.finishReason ?? res.promptFeedback?.blockReason)}`);
    }
    return res.text ?? "";
  } catch (err) {
    throw classifyError(err);
  }
};
