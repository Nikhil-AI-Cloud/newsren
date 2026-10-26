import "server-only";

import { idFromSlug } from "../feeds/ids";
import { AiError } from "./errors";

export function articleIdFromBody(body: Record<string, unknown>): string {
  const slug = typeof body.slug === "string" ? body.slug.slice(0, 300) : "";
  const id = idFromSlug(slug);
  if (!id) throw new AiError("not_found", "That story is not in Newsren's article store.", 404);
  return id;
}
