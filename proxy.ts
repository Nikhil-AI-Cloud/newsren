import { type NextRequest, NextResponse } from "next/server";
import { contentMode } from "@/server/config";
import { getDb } from "@/server/db";
import { idFromSlug } from "@/server/feeds/ids";

/**
 * Returns a real 404 status for unknown story URLs. Story pages stream, so by
 * the time the page could call notFound() the 200 status has already been sent.
 * A story is "known" when its id is in the article store. If the store has no
 * articles yet (first run), the request passes through so the page can load.
 */
export function proxy(request: NextRequest) {
  if (contentMode() === "sample") return NextResponse.next();
  const slug = decodeURIComponent(request.nextUrl.pathname.replace(/^\/story\//, ""));
  const id = idFromSlug(slug);
  let known = false;
  try {
    const db = getDb();
    const empty = !db.prepare("SELECT 1 FROM articles LIMIT 1").get();
    known = empty || (!!id && !!db.prepare("SELECT 1 FROM articles WHERE id = ?").get(id));
  } catch {
    known = true; // If the store cannot be read, let the page decide.
  }
  if (known) return NextResponse.next();
  return NextResponse.rewrite(new URL("/story-not-found", request.url), { status: 404 });
}

export const config = { matcher: "/story/:slug*" };
