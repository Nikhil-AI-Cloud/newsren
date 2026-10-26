import type { AiErrorCode } from "../../types/ai.ts";

/** An expected failure with a message that is safe to show to the reader. */
export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly status: number;
  readonly retryAfterSeconds?: number;
  /** Internal detail for logs and tests; never shown to readers. */
  readonly detail?: string;

  constructor(code: AiErrorCode, message: string, status: number, retryAfterSeconds?: number, detail?: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.detail = detail;
  }
}
