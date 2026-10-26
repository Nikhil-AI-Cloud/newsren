// Fetches every allowlisted feed and reports whether it parses.
// Run: node scripts/verify-feeds.ts
import { fetchFeedXml } from "../server/feeds/fetch.ts";
import { parseFeed } from "../server/feeds/parse.ts";
import { FEEDS } from "../server/feeds/registry.ts";
import { htmlToText } from "../server/feeds/text.ts";

let failures = 0;
for (const feed of FEEDS) {
  try {
    const xml = await fetchFeedXml(feed);
    const parsed = parseFeed(xml, feed.feedUrl);
    const dated = parsed.items.filter((i) => i.publishedAt).length;
    const withExcerpt = parsed.items.filter((i) => i.descriptionHtml && htmlToText(i.descriptionHtml)).length;
    const first = parsed.items[0];
    console.log(
      `OK   ${feed.id.padEnd(18)} ${feed.category.padEnd(10)} ${parsed.format} items=${parsed.items.length} dated=${dated} excerpts=${withExcerpt} dropped=${parsed.dropped}\n` +
        `     rights: ${parsed.copyright ?? "(none in feed)"}\n` +
        `     first: ${first ? `${htmlToText(first.title).slice(0, 70)} | ${first.publishedAt} | ${first.url}` : "(none)"}`,
    );
    if (parsed.items.length === 0) failures++;
  } catch (err) {
    failures++;
    console.log(`FAIL ${feed.id.padEnd(18)} ${(err as Error).message}`);
  }
}
console.log(failures ? `\n${failures} feed(s) failed` : "\nAll feeds OK");
process.exit(failures ? 1 : 0);
