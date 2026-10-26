import { createHash } from "node:crypto";
import { slugify } from "./text.ts";

export function articleId(canonicalUrl: string): string {
  return createHash("sha256").update(canonicalUrl).digest("hex").slice(0, 12);
}

export function makeSlug(title: string, id: string): string {
  return `${slugify(title)}-${id}`;
}

/** Slugs end with the 12-hex-char id; the readable prefix is cosmetic. */
export function idFromSlug(slug: string): string | null {
  const m = /-([0-9a-f]{12})$/.exec(slug);
  return m ? m[1] : null;
}
