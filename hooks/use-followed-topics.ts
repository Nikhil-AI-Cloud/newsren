"use client";

import { useCallback, useSyncExternalStore } from "react";
import { applyCheck } from "@/lib/topic-check";
import type { Category, FollowedTopic, FollowKind, TopicCheckResponse, TopicCheckState } from "@/types";

/** Unchanged since the first version so existing saved follows keep working. */
const STORAGE_KEY = "newsren:followed-topics:v1";
const CATEGORY_IDS: Category[] = ["technology", "education", "industry", "finance"];

const EMPTY: FollowedTopic[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedValue: FollowedTopic[] = EMPTY;
/** True once localStorage failed (blocked or full); state then lives in memory for this tab. */
let memoryOnly = false;

/**
 * Accepts the current shape and the earlier one (no `kind`, always a category and
 * story slug). Earlier entries are typed by id: `feed:` ids were source follows;
 * anything else was a topic label from a sample story.
 */
function normalize(value: unknown): FollowedTopic | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.label !== "string" || typeof v.followedAt !== "string") return null;
  const category = CATEGORY_IDS.includes(v.category as Category) ? (v.category as Category) : null;
  const kind: FollowKind = v.kind === "source" || v.kind === "topic" ? v.kind : v.id.startsWith("feed:") ? "source" : "topic";
  return {
    id: v.id,
    kind,
    label: v.label,
    category,
    followedAt: v.followedAt,
    sourceArticleSlug: typeof v.sourceArticleSlug === "string" ? v.sourceArticleSlug : null,
    ...(kind === "topic" && isCheckState(v.check) ? { check: v.check } : {}),
  };
}

function isCheckState(v: unknown): v is TopicCheckState {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  const r = c.lastResult as Record<string, unknown> | undefined;
  return (
    typeof c.lastCheckedAt === "string" &&
    Array.isArray(c.seenIds) &&
    typeof r === "object" &&
    r !== null &&
    Array.isArray(r.items) &&
    (r.kind === "initial" || r.kind === "new")
  );
}

function parse(raw: string | null): FollowedTopic[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    const topics = data.map(normalize).filter((t): t is FollowedTopic => t !== null);
    return topics.length ? topics : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): FollowedTopic[] {
  if (memoryOnly) return cachedValue;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    memoryOnly = true;
    return cachedValue;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

function getServerSnapshot(): FollowedTopic[] {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: FollowedTopic[]) {
  const serialized = next.length ? JSON.stringify(next) : null;
  try {
    if (serialized) window.localStorage.setItem(STORAGE_KEY, serialized);
    else window.localStorage.removeItem(STORAGE_KEY);
    cachedRaw = serialized;
  } catch {
    memoryOnly = true;
  }
  cachedValue = next.length ? next : EMPTY;
  listeners.forEach((l) => l());
}

export interface FollowSourceInput {
  /** Feed topic id, `feed:<feed id>`. */
  id: string;
  label: string;
  category: Category;
  sourceArticleSlug: string;
}

export const TOPIC_MIN = 3;
export const TOPIC_MAX = 140;

export type SaveTopicResult = { ok: true } | { ok: false; error: string };

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function useFollowedTopics() {
  const topics = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isFollowing = useCallback(
    (id: string) => topics.some((t) => t.id === id),
    [topics],
  );

  const followSource = useCallback((input: FollowSourceInput) => {
    const current = getSnapshot();
    if (current.some((t) => t.id === input.id)) return;
    write([...current, { ...input, kind: "source", followedAt: new Date().toISOString() }]);
  }, []);

  const saveTopic = useCallback((text: string, category: Category | null): SaveTopicResult => {
    const label = normalizeText(text);
    if (label.length < TOPIC_MIN) return { ok: false, error: `Enter at least ${TOPIC_MIN} characters.` };
    if (label.length > TOPIC_MAX) return { ok: false, error: `Keep it under ${TOPIC_MAX} characters.` };
    const id = `topic:${label.toLowerCase()}`;
    const current = getSnapshot();
    if (current.some((t) => t.id === id)) return { ok: false, error: "You already saved this topic." };
    write([
      ...current,
      { id, kind: "topic", label, category, followedAt: new Date().toISOString(), sourceArticleSlug: null },
    ]);
    return { ok: true };
  }, []);

  /** Records a successful manual check. Failed checks never call this, so the baseline only moves on success. */
  const recordCheck = useCallback((id: string, resp: TopicCheckResponse) => {
    write(getSnapshot().map((t) => (t.id === id && t.kind === "topic" ? { ...t, check: applyCheck(t.check, resp) } : t)));
  }, []);

  const remove = useCallback((id: string) => {
    write(getSnapshot().filter((t) => t.id !== id));
  }, []);

  return { topics, isFollowing, followSource, saveTopic, recordCheck, remove };
}
