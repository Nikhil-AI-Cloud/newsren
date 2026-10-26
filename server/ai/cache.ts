import { createHash } from "node:crypto";
import type { AiResult } from "../../types/ai.ts";
import { getDb } from "../db.ts";
import { AiError } from "./errors.ts";

export function cacheKey(parts: { task: string; model: string; promptVersion: string; evidenceHash: string; audience?: string; question?: string }): string {
  return createHash("sha256")
    .update(JSON.stringify([parts.task, parts.model, parts.promptVersion, parts.evidenceHash, parts.audience ?? "", (parts.question ?? "").toLowerCase()]))
    .digest("hex");
}

export function getCached(key: string): AiResult | null {
  const row = getDb().prepare("SELECT result_json FROM ai_cache WHERE key = ?").get(key) as { result_json: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.result_json) as AiResult;
  } catch {
    return null;
  }
}

export function putCached(key: string, p: { task: string; model: string; promptVersion: string; evidenceHash: string; audience?: string }, result: AiResult) {
  getDb()
    .prepare(
      `INSERT INTO ai_cache (key, task, model, prompt_version, evidence_hash, audience, result_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET result_json = excluded.result_json, created_at = excluded.created_at`,
    )
    .run(key, p.task, p.model, p.promptVersion, p.evidenceHash, p.audience ?? null, JSON.stringify(result), result.meta.generatedAt);
}

export interface Limits {
  perClientPerMinute: number;
  globalPerMinute: number;
  globalPerDay: number;
}

function intEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function limitsFromEnv(): Limits {
  return {
    perClientPerMinute: intEnv("NEWSREN_AI_PER_CLIENT_PER_MINUTE", 6),
    globalPerMinute: intEnv("NEWSREN_AI_PER_MINUTE", 12),
    globalPerDay: intEnv("NEWSREN_AI_PER_DAY", 200),
  };
}

/**
 * Records one provider call, or throws if a limit is reached. Only provider
 * calls count; cache hits are free. Client ids are hashed before storage.
 */
export function takeCallSlot(clientRaw: string, limits: Limits = limitsFromEnv(), nowMs = Date.now()) {
  const client = createHash("sha256").update(clientRaw).digest("hex").slice(0, 16);
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM ai_calls WHERE ts_ms < ?").run(nowMs - 24 * 3600_000);
    const count = (since: number, c?: string) =>
      (c
        ? (db.prepare("SELECT COUNT(*) n FROM ai_calls WHERE ts_ms >= ? AND client = ?").get(since, c) as { n: number })
        : (db.prepare("SELECT COUNT(*) n FROM ai_calls WHERE ts_ms >= ?").get(since) as { n: number })
      ).n;
    if (count(nowMs - 60_000, client) >= limits.perClientPerMinute)
      throw new AiError("rate_limited", "You are asking too quickly. Please wait a minute and try again.", 429, 60);
    if (count(nowMs - 60_000) >= limits.globalPerMinute)
      throw new AiError("rate_limited", "Newsren is busy. Please try again in a minute.", 429, 60);
    if (count(nowMs - 24 * 3600_000) >= limits.globalPerDay)
      throw new AiError("rate_limited", "Newsren's daily AI limit has been reached. Try again tomorrow.", 429, 3600);
    db.prepare("INSERT INTO ai_calls (ts_ms, client) VALUES (?, ?)").run(nowMs, client);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
