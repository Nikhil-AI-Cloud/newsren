// Test helper: a throwaway SQLite database holding every registry feed and one fixture
// article, so the offline test suites need neither the live database nor the network.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const FIXTURE_STORY_ID = "303db39c14fc";

export async function createFixtureDb(): Promise<string> {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "newsren-test-")), "test.sqlite");
  process.env.NEWSREN_DB_PATH = file;
  delete process.env.GEMINI_API_KEY;
  const { getDb } = await import("../server/db.ts");
  const { FEEDS } = await import("../server/feeds/registry.ts");
  const db = getDb();
  const now = "2026-10-26T00:00:00.000Z";
  for (const f of FEEDS) {
    db.prepare(
      `INSERT INTO feeds (id, publisher, topic_label, feed_url, homepage_url, category, kind, last_attempt_at, last_success_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(f.id, f.publisher, f.topicLabel, f.feedUrl, f.homepageUrl, f.category, f.kind, now, now);
  }
  // Fixture article written for the tests (the wording mirrors a real feed excerpt style).
  db.prepare(
    `INSERT INTO articles (id, canonical_url, slug, title, excerpt, category, feed_id, published_at, first_retrieved_at, last_retrieved_at)
     VALUES (?, ?, ?, ?, ?, 'technology', 'mit-news-ai', '2026-10-23T21:00:00.000Z', ?, ?)`,
  ).run(
    FIXTURE_STORY_ID,
    "https://example.com/fixture/minow",
    `at-mit-martha-minow-speaks-${FIXTURE_STORY_ID}`,
    "At MIT, Martha Minow speaks on sustaining democracy, both by using and overcoming AI",
    "In Compton Lecture, the distinguished legal scholar warns of potential “loss of the Enlightenment” while suggesting ways innovations can meet our civic and cultural needs.",
    now,
    now,
  );
  return file;
}
