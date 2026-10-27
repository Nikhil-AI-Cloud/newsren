# Newsren

| | |
| --- | --- |
| **Live demo** | https://newsren.onrender.com (free Render instance: see "Live demo on free Render" below) |
| **GitHub** | https://github.com/Nikhil-AI-Cloud/newsren |
| **Submission summary** | [SUBMISSION.md](SUBMISSION.md) |
| **System card** | [docs/system-card.md](docs/system-card.md) |
| **Demo video** | pending recording |

Newsren is a prototype of a news reader that helps you discover stories from official and
original publishers, understand them at your level, ask questions that are answered only from
retrieved publisher excerpts, and save topics you can check for new coverage **when you click**.

- **Discover:** headlines, short publisher excerpts, dates and links to the original, from 15 approved RSS/Atom feeds in four categories (Technology, Education, Industry, Finance).
- **Understand:** an AI brief and Student / Educator / Professional explanations, generated only on request from the stored excerpts, with clickable citations.
- **Investigate:** "Ask Newsren" answers from stored excerpts and says when the sources do not establish an answer.
- **Follow:** follow a publisher feed, or save a topic or question and check it manually for new matching coverage.

It is a course prototype, not a production service. It has no accounts, email, payments or background monitoring, and the only deployment is a free demo instance. See `docs/system-card.md` for what it can and cannot establish. Newsren does not independently verify facts, does not read full articles, and does not guarantee that its output is correct.

## Prerequisites

| Requirement | Detail |
| --- | --- |
| Node.js | **22.18 or newer** (`engines` in `package.json`). Developed and tested on **v24.19.0** with npm 11.17.0. Node 22.18 is the minimum because the code uses the built-in `node:sqlite` module and runs the TypeScript test scripts directly; it was not tested on Node 22. Node prints an "experimental" warning for `node:sqlite`; that is expected. |
| Internet | To fetch the 15 feeds and (optionally) call Gemini. Stored articles still work offline. |
| Gemini API key | Optional. Without it everything works except AI briefs, explanations, answers and "Explain these updates", which show "Gemini key not set". |
| Disk | A writable local folder for the SQLite file (`.data/`). |

## Install and run

```bash
git clone https://github.com/Nikhil-AI-Cloud/newsren.git
cd newsren
npm install
cp .env.example .env.local
```

(From a downloaded ZIP, unzip it, `cd` into the folder and run the last two commands. `cp` copies the hidden file `.env.example`, which is included.)

`.env.example` holds only empty placeholders. Open `.env.local` and, only if you want AI features, paste your own Gemini API key from Google AI Studio after `GEMINI_API_KEY=` (no quotes or spaces). The key is used on the server only and is never sent to the browser. Never commit `.env.local`; it is git-ignored. Without a key, everything else works and the AI buttons show "Gemini key not set".

Run a production build (recommended for the demo):

```bash
npm run build
npm start
```

Then open http://localhost:3000. For development with hot reload use `npm run dev` instead.

The first page load fetches all 15 feeds (a few seconds) and creates `.data/newsren.sqlite`.

## Configuration (`.env.example`, no secrets)

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | none | Gemini API key. Server only; never prefixed `NEXT_PUBLIC_`. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Must be a model with a free tier. Newsren never switches models by itself. |
| `NEWSREN_DB_PATH` | `./.data/newsren.sqlite` | SQLite file location. |
| `NEWSREN_REFRESH_SECONDS` | `600` | Minimum time between feed refreshes (also applies after a restart). |
| `NEWSREN_USER_AGENT` | `Newsren/0.1 (...)` | Sent to publishers. Add a contact address if a publisher asks (the SEC asks automated clients to). |
| `NEWSREN_AI_PER_CLIENT_PER_MINUTE`, `NEWSREN_AI_PER_MINUTE`, `NEWSREN_AI_PER_DAY` | 6, 12, 200 | Limits on provider calls (cached results are free). |
| `NEWSREN_CONTENT` | live | `sample` serves old development fixtures with a visible banner. Live failures never fall back to sample content. |
| `NEWSREN_BLOCK_FEEDS` | none | Test switch: comma-separated feed ids forced to fail. |
| `NEWSREN_AI_DEBUG` | off | `1` logs validation details that can quote model output. |

## Actual model and settings (from the code)

| Setting | Value |
| --- | --- |
| Provider / SDK | Google Gemini API through `@google/genai` |
| Model | `gemini-3.5-flash-lite` unless `GEMINI_MODEL` is set (`server/ai/provider.ts`) |
| Generation | JSON output with a response schema, temperature 0.2, thinking level LOW for `gemini-3*` models, one attempt (no SDK retries) |
| Evidence per request | up to 7 stored articles, feed excerpts of at most 300 characters each |
| Output caps | brief 3000, explanation 2500, answer 2000, update summary 2500 tokens |
| Request timeout | 30 seconds |
| Question / topic length | question 5 to 300 characters; saved topic 3 to 140 characters |
| Prompt versions (cache keys) | brief v2, explanation v3, Ask v3, update summaries v2 (`server/ai/prompts.ts`) |
| Newsren request limits | 6 per client per minute, 12 per minute overall, 200 per day (`NEWSREN_AI_*`) |
| Feed refresh | at most every 600 seconds (`NEWSREN_REFRESH_SECONDS`), 10 newest items per feed per refresh |

## Architecture

```
app/                      routes: / , /story/[slug] , /following , /api/ai/* , /api/topics/check
components/               UI only
types/                    shared types
lib/                      small shared helpers (formatting, topic-check baseline logic)
hooks/use-followed-topics.ts   browser-local follows, saved topics, check state
server/feeds/             allowlist registry, fetch, parse, text sanitizing, ids, ingest
server/db.ts, store.ts    SQLite schema and queries
server/content.ts         what pages read
server/ai/                retrieval, prompts, validation, cache/limits, Gemini provider, orchestration
server/topic-check.ts     manual topic check logic
proxy.ts                  real HTTP 404 for unknown story URLs
data/sample/              old development fixtures (only used when NEWSREN_CONTENT=sample)
scripts/                  tests, feed verifier, demo fixture
docs/                     system card, demo script, submission checklist
```

- **Ingestion:** feeds are fetched on the server (8 s timeout, 3 MB cap, redirects must stay on the allowlisted host). Feed HTML is converted to plain text and never rendered as markup; images are not fetched. Items are normalized, deduplicated by canonical URL and upserted into SQLite.
- **Secrets:** `GEMINI_API_KEY` is read only in `server/ai/provider.ts`. A scan of the build output found no copy of it.
- **Pages never call AI.** Story pages only read already-cached AI results; calls happen in the three POST routes after a click.

### Approved sources (15 feeds, verified with `npm run verify:feeds`)

| Category | Feeds |
| --- | --- |
| Technology | MIT News (AI topic), Google Research blog, NIST news |
| Education | The Hechinger Report, The 74, Inside Higher Ed |
| Industry | USTR press releases, EIA Today in Energy, Supply Chain Dive, Manufacturing Dive |
| Finance | SEC press releases, Federal Reserve, European Central Bank, BIS, CFPB |

Feed URLs are in `server/feeds/registry.ts`. Candidates that were rejected (empty, too large, no links or test content): arXiv, CISA, Census Bureau, International Trade Administration.

**Reuse.** Newsren shows only the headline, a feed excerpt of at most 300 characters (labelled "Publisher excerpt"), the publisher name, dates and a link to the original. It does not copy full articles or images. Publishers' terms differ (US government sources are generally public domain; several nonprofit publishers use Creative Commons terms that limit commercial reuse; Google Research and the trade publishers should be treated as all rights reserved). This is not legal advice: confirm each publisher's terms before any public launch.

## Data retention (what is actually stored)

- Each refresh ingests **at most the 10 newest items per feed** (dated items older than 120 days are skipped). That is a per-refresh cap, not a cap on what is kept.
- Articles are **upserted and never deleted** by refreshes, failures or restarts (`server/store.ts` has no delete for articles; `scripts/retention-test.ts` checks it: after a refresh whose feed no longer lists 7 earlier stories, all 17 are still stored and reachable). A story that has left its feed keeps its URL.
- The homepage shows the newest 40 stored stories per category. Older stored stories are still reachable by URL and are included in topic checks and AI evidence retrieval, which search every stored article.
- Nothing prunes the database, so it grows over time. It lives in `.data/` and is never committed.

## AI model and evidence retrieval

- **Model:** `gemini-3.5-flash-lite` through the official `@google/genai` SDK. Google's pricing page lists a free tier ("Free of charge" input and output) for it and it is not a preview model. Billing and paid tools are not enabled.
- **Retrieval:** a keyword search of stored articles (IDF-weighted stem overlap in titles and excerpts) selects up to 7 articles for the story or question, retrieved fresh for each question. The model sees only feed excerpts (at most 300 characters each) plus source IDs, titles, URLs, dates and retrieval times, and is told that they are excerpts, not full articles, that it has not browsed the web, and that several articles from one publisher are not independent verification.
- **Output rules:** structured JSON, validated on the server. Citations must be supplied source IDs and are resolved to URLs by the server. Output is rejected for unknown IDs, uncited factual claims, URLs, numbers or quotations not in the excerpts, investment-advice phrasing, or cited claims that are not grounded in the cited excerpts. Optional general background is kept separate and uncited. A story with no usable excerpt is not sent to the model.
- **Audience explanations:** Student, Educator and Professional are generated separately, on request, and cached separately. Each has short cited paragraphs that may contain only what the cited excerpt says, plus an uncited **Limits of the evidence** note (what the excerpt does not show and what to verify) and optional general background. Keeping caveats out of the cited paragraphs fixed an earlier false rejection in which verify-advice diluted the grounding check. Educator also gets up to three discussion questions.
- **Ask Newsren:** on a story page the prompt names the current story, so "explain me about it", "this story" or "summarize" refer to it and are answered from its title and excerpt (a short excerpt gives a short answer that lists what is missing). Questions the excerpts cannot answer abstain with an explanation.
- **Labels:** "AI-generated from publisher excerpts" with generation time; "Single source, not independently verified"; "Limited brief"; "General background, not from the sources". These checks reduce but do not eliminate errors and do not prove accuracy.
- **Free-quota controls:** AI runs only after a click; results are cached in SQLite by task, model, prompt version, evidence hash, audience and question; identical simultaneous requests share one call; one attempt per click (no retries); bounded inputs, output and 30 s timeout; request limits; same-origin requests only.

### Free API quota limitations

The free tier has per-minute and per-day request limits set by Google per project (view them in Google AI Studio), they can change, and free-tier content may be used by Google to improve its products. If the quota is exhausted Newsren shows "The free AI quota is used up for now" and generates nothing. Cached results keep working. Newsren's own limits (6 per client per minute, 12 per minute and 200 per day by default) are caution settings, not Google's limits.

## Following sources and saved topics

- **Follow source** (story page) follows a publisher feed. Followed sources are listed separately, are not monitored and are not checked.
- **Save a topic or question** (Following page) stores free text with an optional category.
- Both live in this browser's `localStorage` (`newsren:followed-topics:v1`). They are **local to one browser**: clearing site data deletes them, and they are not shared across browsers or devices. The server stores no per-user data.

### Manual topic checks, not automatic monitoring

**Manual updates — checked when you click.** Nothing runs in the background: no scheduler, email or login. **Check updates** refreshes the approved feeds (at most once per `NEWSREN_REFRESH_SECONDS`) and searches the stored articles.

- The first check shows matches as **Initial coverage** and saves a baseline (matched article ids and the check time) in your browser.
- Later checks show only matches not in the baseline as **New matching coverage**; already-seen articles are counted, not repeated.
- A check that fails (no source could be refreshed) changes nothing: previous results and baseline stay. A partial failure runs on stored items and names the stale or unavailable sources.
- Dates shown are the publisher's date (or "not provided") and when Newsren first retrieved the article. Retrieval time is never treated as event time.
- "Explain these updates (AI)" is a separate click that summarizes only the new matches and says what the excerpts cannot establish.

## Limitations

- **Publisher excerpts only.** Newsren reads feed excerpts (at most 300 characters, sometimes none), not full articles. It cannot establish anything beyond what an excerpt says, and an article link is provenance, not independent corroboration. Most stories have one publisher's account.
- **Keyword search only.** Topic checks and evidence retrieval match word stems in headlines and excerpts, with no synonyms or semantics. They miss different wording ("duties" vs "tariffs") and can match unrelated stories that share words; a two-or-more-word topic needs at least two matching terms.
- **"New matching coverage" is not a "new event".** It means Newsren stored a matching article it had not shown you before.
- Only the 10 newest items per feed are ingested per refresh, so a very busy feed can lose items between refreshes.
- Validation catches obvious unsupported additions; it cannot prove a paraphrase is accurate. Output should be checked against the original article.
- **Free API quota.** AI features run on a free-tier quota that can run out; Newsren then shows an error and generates nothing (cached results still work). Free-tier content may be used by Google to improve its products.
- **Browser-local topics.** Saved topics, followed sources and check baselines live only in one browser's `localStorage` (cleared with site data, not shared across devices).
- **Free Render demo.** It sleeps when idle and loses its database on restart (see "Hosting").
- Not verified here: the SEC story pages return HTTP 403 to automated requests, so SEC originals were not opened in a browser.

## Hosting: SQLite needs a persistent disk

Articles, feed status and the AI cache live in a **local SQLite file** (`.data/newsren.sqlite` plus `-wal` and `-shm`).

- **Locally** the file persists across restarts of the server (checked: a known story URL still opens after a restart).
- **On a host** run it on a machine or container with a **persistent, writable disk** and a single server instance per database file. Do **not** assume the file persists on ephemeral or serverless hosts: it would be lost on redeploy or scale-to-zero, and instances would not share it. To use such hosts properly, replace `server/db.ts` and `server/store.ts` (all queries go through them) with a hosted database.
- Back up locally by copying the three files while the server is stopped.

### Live demo on free Render

The live demo at https://newsren.onrender.com runs on a free Render instance. Expect these effects:

- **It sleeps when idle.** The first request after a quiet period has to wake it (one check took about 37 seconds); later requests are fast.
- **Its filesystem does not persist.** After a restart, spin-down or redeploy, the database starts empty: stored articles are re-collected from the feeds on the first page load, saved story URLs from before the reset stop working, and cached AI outputs are gone, so clicking Generate or Ask makes a new request to the free Gemini quota.
- **Some feeds may be unavailable from the host.** At one check 13 of 15 sources were reachable, and the page lists any that are not.
- Saved topics and followed sources are stored in your own browser, so they survive a server reset, but their saved baselines can then refer to stories that are no longer stored.
- The AI buttons are enabled there (the page does not show "Gemini key not set"). I did not run AI requests on the live site, so its AI behaviour is not verified.

## Tests and checks

```bash
npm run typecheck        # next typegen, then tsc --noEmit
npm run lint
npm run build
npm test                 # four offline suites, no network, no API key, no quota (68 checks)
npm run verify:feeds     # fetches and parses all 15 feeds (network)
npm run test:ai-real     # real Gemini calls: uses free quota; needs GEMINI_API_KEY
```

`npm test` runs `ai-sim-test.ts` (validation, provider errors, rate limits, cache and de-duplication with a fake provider), `evidence-quality-test.ts` (thin and single-source evidence, unsupported additions, background, updates task), `topic-fixture-test.ts` (baseline, new coverage, no duplicates, failure handling; fixture data) and `retention-test.ts` (articles survive refreshes). They use throwaway databases, so they do not touch `.data/`.

## Offline fixture demonstration (fake data, separate database)

Only for showing "New matching coverage" on demand. The articles are fake, the publisher is named "FIXTURE Demo Wire", and the data lives in `.data/demo.sqlite`, never in the live database. The script always uses that file whatever `NEWSREN_DB_PATH` says. Run each command separately, from `newsren/` (full steps in `docs/demo-script.md`):

```bash
node scripts/demo-fixture.ts seed
```

```bash
export NEWSREN_DB_PATH=.data/demo.sqlite
```

```bash
export NEWSREN_REFRESH_SECONDS=999999
```

```bash
npm start -- -p 3200
```

Open http://localhost:3200/following. In a second terminal, add fixture updates with `node scripts/demo-fixture.ts add`, then `node scripts/demo-fixture.ts add2`.

## Submission materials

`SUBMISSION.md`, `docs/system-card.md`, `docs/demo-script.md`, `docs/submission-checklist.md`. Do not include `.env.local`, `.data/`, `node_modules/` or `.next/`.
