// Builds a FIXTURE database so the update-check workflow can be demonstrated offline.
// The articles are fake and the publisher is named "FIXTURE Demo Wire". Never use it as news.
// It ALWAYS uses .data/demo.sqlite, whatever NEWSREN_DB_PATH says, so it cannot touch the live database.
//   node scripts/demo-fixture.ts seed   create the demo database (3 matching + 1 unrelated article)
//   node scripts/demo-fixture.ts add    add 2 new matching articles
//   node scripts/demo-fixture.ts add2   add 1 more matching article
// See docs/demo-script.md for the full, separate commands.
import { rmSync } from "node:fs";
process.env.NEWSREN_DB_PATH = ".data/demo.sqlite";
const { getDb } = await import("../server/db.ts");
const { FEEDS } = await import("../server/feeds/registry.ts");
const { articleId, makeSlug } = await import("../server/feeds/ids.ts");

const mode = process.argv[2];
if (mode === "seed") for (const f of ["", "-wal", "-shm"]) rmSync(`${process.env.NEWSREN_DB_PATH}${f}`, { force: true });
const db = getDb();
const now = new Date().toISOString();

function insert(feedId: string, title: string, excerpt: string, published: string | null) {
  const url = `https://example.com/fixture/${encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`;
  const id = articleId(url);
  const f = FEEDS.find((x) => x.id === feedId)!;
  db.prepare(
    `INSERT OR IGNORE INTO articles (id, canonical_url, slug, title, excerpt, category, feed_id, published_at, first_retrieved_at, last_retrieved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, url, makeSlug(title, id), title, excerpt, f.category, feedId, published, now, now);
}

if (mode === "seed") {
  for (const f of FEEDS) {
    db.prepare(
      `INSERT INTO feeds (id, publisher, topic_label, feed_url, homepage_url, category, kind, last_attempt_at, last_success_at, last_error, consecutive_failures)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)`,
    ).run(f.id, `FIXTURE Demo Wire (${f.publisher})`, f.topicLabel, f.feedUrl, f.homepageUrl, f.category, f.kind, now, now);
  }
  insert("supply-chain-dive", "Solar panel tariffs announced by trade office", "The trade office announced new tariffs on imported solar panels, effective next quarter.", "2026-10-20T00:00:00.000Z");
  insert("supply-chain-dive", "Installers react to solar panel tariffs", "Solar panel installers say the tariffs will raise project costs. No publication date was supplied.", null);
  insert("manufacturing-dive", "Manufacturer cites solar panel tariffs in earnings call", "A manufacturer told analysts the solar panel tariffs affect its sourcing plans.", "2026-10-21T00:00:00.000Z");
  insert("nist-news", "Unrelated: new calibration standard published", "A measurement standard for optical sensors was published.", "2026-10-21T00:00:00.000Z");
  console.log("seeded", process.env.NEWSREN_DB_PATH);
} else if (mode === "add") {
  insert("supply-chain-dive", "Solar panel tariffs challenged at trade tribunal", "A trade tribunal heard a challenge to the solar panel tariffs announced by the trade office.", "2026-10-26T00:00:00.000Z");
  insert("manufacturing-dive", "Solar panel tariffs: importers seek exemptions", "Importers asked the trade office for exemptions from the solar panel tariffs.", "2026-10-26T00:00:00.000Z");
  console.log("added 2 matching articles");
} else if (mode === "add2") {
  insert("supply-chain-dive", "Solar panel tariffs: customs agency issues guidance", "A customs agency issued guidance on how the solar panel tariffs will be collected at the border.", "2026-10-26T06:00:00.000Z");
  console.log("added 1 matching article");
} else {
  console.log("usage: node scripts/demo-fixture.ts seed|add|add2");
}
