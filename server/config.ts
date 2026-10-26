/**
 * "live" (default) ingests the allowlisted feeds. "sample" serves the
 * development fixtures and must be chosen explicitly; live failures never fall
 * back to it.
 */
export type ContentMode = "live" | "sample";

export function contentMode(): ContentMode {
  return process.env.NEWSREN_CONTENT === "sample" ? "sample" : "live";
}

/** Dev/test switch: comma-separated feed ids that are forced to fail. */
export function blockedFeedIds(): Set<string> {
  return new Set(
    (process.env.NEWSREN_BLOCK_FEEDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
