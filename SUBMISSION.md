# Newsren: submission summary

**Project:** Newsren, a news reader prototype that collects headlines and short excerpts from 15 approved RSS/Atom feeds and lets a reader understand a story at a chosen level, ask questions answered only from stored excerpts, and save topics to check manually for new coverage.

| | |
| --- | --- |
| Live demo | https://newsren.onrender.com (free Render instance; sleeps when idle, database resets on restart) |
| GitHub | https://github.com/Nikhil-AI-Cloud/newsren |
| README | [README.md](README.md) |
| System card | [docs/system-card.md](docs/system-card.md) |
| 2-minute demo script | [docs/demo-script.md](docs/demo-script.md) |
| Demo video | **pending recording** |

## Implemented features

- **Discover:** homepage with Technology, Education, Industry and Finance tabs, search, featured story and cards. Each card shows the source, date and category, a publisher excerpt, and links to the original article.
- **Approved sources only:** 15 feeds (MIT News, Google Research, NIST, The Hechinger Report, The 74, Inside Higher Ed, USTR, EIA, Supply Chain Dive, Manufacturing Dive, SEC, Federal Reserve, ECB, BIS, CFPB). Feed failures are shown, never replaced by sample content.
- **Durable storage:** fetched articles are kept in SQLite and stay reachable after they leave a feed.
- **AI brief:** on request, a short brief with "what happened", "why it matters" (reported facts and interpretation labelled separately) and "what remains uncertain", with citations linked to the original articles.
- **Audience explanations:** Student, Educator and Professional versions, generated on request, with a "Limits of the evidence" note and optional labelled general background.
- **Ask Newsren:** answers a question from stored excerpts with citations; on a story page "it" or "this story" means the current story; it says so when the sources do not establish an answer.
- **Evidence labels:** "AI-generated from publisher excerpts", "Single source, not independently verified", "Limited brief", and a finance notice that content is not investment advice.
- **Follow and save:** follow a publisher (source) or save a topic or question. Saved topics can be checked manually for "Initial coverage" and later "New matching coverage" (nothing runs automatically). All of this is stored in the browser only.
- **Quota and safety controls:** AI runs only after a click, results are cached, identical requests are shared, inputs and outputs are bounded, requests are rate limited, and the server validates AI output (including rejecting unknown citation IDs).

## Architecture overview

Next.js 16 (App Router, TypeScript, Tailwind) with a server-side layer: feed fetching and parsing from an allowlist, a SQLite store (`node:sqlite`), keyword retrieval over stored excerpts, Gemini (`gemini-3.5-flash-lite` by default, official `@google/genai` SDK) called only from three POST routes, and server-side validation of the model's JSON output. `GEMINI_API_KEY` is read on the server only. See the README for the folder layout and `docs/system-card.md` for the evidence flow.

## Testing summary (checks actually performed)

- `npm run typecheck`, `npm run lint` and `npm run build`: pass.
- `npm test`: 68 offline checks pass (fake AI provider and fixture data; no network, no API key): AI validation, provider errors, rate limits, caching, evidence quality, explanation limitations, topic baselines and failure handling, and data retention.
- `npm run verify:feeds`: all 15 feeds fetched and parsed.
- Manual browser walkthrough on the local app with real feeds: homepage, filters, search, story pages, original links, follow and unfollow, saved topic with initial and repeat check, reload and server restart, mobile width, and the loading, error, limited-evidence and single-source states.
- Real Gemini requests (local, free tier, a small number): briefs, three explanations, supported and unsupported questions, and an update summary on a few stories.
- Live demo: reachable (HTTP 200, about 37 s for the first request after idle), 13 of 15 sources reachable at one check, story pages load, unknown story returns 404. AI requests on the live site were not exercised.
- The submission ZIP was installed from a clean copy and built (see the final report for the result).

## Known limitations

- Keyword retrieval only (no synonyms or semantics): it misses different wording and can match unrelated stories.
- Newsren reads feed excerpts (at most 300 characters, sometimes none), not full articles, and has not browsed the web.
- It does not independently verify facts. A link to the original is provenance, not corroboration, and most stories rest on one publisher.
- Output validation catches obvious unsupported additions but is imperfect and does not guarantee correctness.
- "New matching coverage" means a matching article was newly stored, not that a new event happened. Topic checks are manual; there is no automatic monitoring.
- Saved topics, followed sources and baselines live only in one browser (`localStorage`).
- Free Gemini quota can run out; AI features then show an error.
- Local SQLite persists across local restarts, but the free Render filesystem does not: the live demo sleeps when idle and loses stored articles and cached AI output on restart.
- Not verified: AI output on the deployed site, SEC article pages in a browser (they block automated requests), and Node versions other than 24.19.0.

## Demo video

Demo video: pending recording.
