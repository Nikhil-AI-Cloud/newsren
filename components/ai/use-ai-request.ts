"use client";

import { useCallback, useRef, useState } from "react";
import type { AiErrorBody } from "@/types/ai";

export type AiState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: T }
  | { status: "error"; message: string; code?: string };

const CLIENT_TIMEOUT_MS = 45_000;

/** POSTs to one of Newsren's own AI routes. Ignores further calls while one is in flight. */
export function useAiRequest<T>(url: string, initial?: T | null) {
  const [state, setState] = useState<AiState<T>>(initial ? { status: "done", data: initial } : { status: "idle" });
  const busy = useRef(false);

  const run = useCallback(
    async (body: Record<string, unknown>) => {
      if (busy.current) return;
      busy.current = true;
      setState({ status: "loading" });
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
        });
        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const err = (json as AiErrorBody | null)?.error;
          setState({ status: "error", message: err?.message ?? "Something went wrong. Please try again.", code: err?.code });
        } else {
          setState({ status: "done", data: json as T });
        }
      } catch {
        setState({ status: "error", message: "Could not reach Newsren. Check your connection and try again." });
      } finally {
        busy.current = false;
      }
    },
    [url],
  );

  return { state, run, setState };
}
