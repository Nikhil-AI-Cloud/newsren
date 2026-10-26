import "server-only";

import type { AiErrorBody } from "@/types/ai";
import { AiError } from "./errors";
import { classifyError } from "./provider";

const MAX_BODY = 4_000;

export function errorResponse(err: unknown): Response {
  const e = classifyError(err);
  // Log the category only: never prompts, request bodies, or keys.
  // Validation details can quote model output, so they are logged only when debugging.
  const detail = e.detail && (e.code !== "malformed" || process.env.NEWSREN_AI_DEBUG === "1") ? ` (${e.detail})` : "";
  console.error(`[ai] ${e.code}${detail}`);
  const body: AiErrorBody = { error: { code: e.code, message: e.message, retryAfterSeconds: e.retryAfterSeconds } };
  return Response.json(body, {
    status: e.status,
    headers: e.retryAfterSeconds ? { "retry-after": String(e.retryAfterSeconds) } : undefined,
  });
}

/** Same-origin JSON POST only, with a small body, so the endpoints cannot be driven cross-site. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) throw new AiError("bad_request", "Cross-origin requests are not allowed.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) throw new AiError("bad_request", "Expected JSON.", 415);
  const text = await request.text();
  if (text.length > MAX_BODY) throw new AiError("bad_request", "Request too large.", 413);
  try {
    const v: unknown = JSON.parse(text);
    if (typeof v === "object" && v !== null && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw new AiError("bad_request", "Invalid request.", 400);
}

export function clientId(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
