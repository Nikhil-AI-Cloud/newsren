# Newsren system card

Status: course prototype. Runs locally and as a free demo on Render (https://newsren.onrender.com). Source: https://github.com/Nikhil-AI-Cloud/newsren. Last verified: 26–27 October 2026 (see "Validation and actual test results").

## Purpose and intended users

Newsren helps a reader discover news from official and original publishers, understand a story at a chosen level (Student, Educator or Professional), ask questions answered only from retrieved publisher excerpts, and save topics to check for new coverage. Intended users are the course reviewers and, in principle, students, educators and early-career professionals who want a quick, source-linked orientation before reading the original. It is not a replacement for reading the original reporting.

It is **not** for investment decisions, legal, medical or safety decisions, or any use that needs verified facts. Finance stories are educational only and carry a notice that they are not investment advice.

## Model and provider

- **Provider and model:** Google Gemini API, model `gemini-3.5-flash-lite` (configurable with `GEMINI_MODEL`), through the official `@google/genai` SDK. Chosen because Google's pricing page lists a free tier ("Free of charge" input and output) for it, and it is not a preview model. No billing, paid search or other paid tool is enabled, and Newsren never switches models by itself.
- **Where it runs:** server side only. The API key is read from the server's environment variables (locally from `.env.local`) in one server file and is not present in browser code or build output.
- **Settings (from the code):** JSON output with a response schema, temperature 0.2, thinking level LOW for `gemini-3*` models, output caps of 2000–3000 tokens, 30-second timeout, one attempt per click. Prompt versions: brief v2, explanation v3, Ask v3, update summaries v2 (changing a version invalidates that task's cached results).
- **Calls:** only after a user click, never during page rendering or build. One attempt per click, a 30-second timeout, bounded output, per-client / per-minute / per-day limits, and a SQLite cache of successful results.

## Source data and evidence flow

1. **Approved sources only.** 15 public RSS/Atom feeds (listed in the README) from official institutions (SEC, Federal Reserve, ECB, BIS, CFPB, NIST, EIA, USTR), research institutions (MIT News, Google Research) and publishers (The Hechinger Report, The 74, Inside Higher Ed, Supply Chain Dive, Manufacturing Dive). Nothing else is fetched; no endpoint accepts a URL.
2. **Ingestion.** The server fetches feeds, converts feed HTML to plain text, normalizes items and **upserts** them into SQLite. It keeps the publisher's own date (or none) and the real retrieval time. Each refresh takes at most the 10 newest items per feed; stored articles are never deleted.
3. **Retrieval.** For a story or question, a keyword search over stored titles and excerpts picks up to 7 articles. The model receives only feed excerpts (at most 300 characters each) with source IDs, titles, URLs, dates and retrieval times, inside delimited blocks marked as untrusted data.
4. **Generation.** The model returns structured JSON. The server validates it, resolves citation IDs to stored URLs, and shows it labelled "AI-generated from publisher excerpts" with the generation time.
5. **Display.** Each claim links to its source. Single-source, limited-evidence and background content are labelled.

**Audience explanations (Student / Educator / Professional).** Generated separately on request from the same evidence and cached separately. Cited paragraphs may contain only what the cited excerpt says. What the excerpt does not show, and what a reader should verify, goes in an uncited "Limits of the evidence" note; general context goes in a labelled, uncited background note. (An earlier version asked the model to add verify-advice to the paragraphs, which the grounding check wrongly rejected; moving it to the limitations field fixed that.)

**Ask Newsren.** Retrieval runs fresh for each question over all stored articles. On a story page the current story is passed to the model as context, so "explain me about it", "this story" or "summarize" refer to it and are answered from its title and excerpt; a short excerpt gives a short answer that lists what is missing. A single publisher limits verification but does not stop its own report being summarized. Questions the excerpts cannot answer abstain.

**Manual topic checks.** A saved topic can be checked by clicking: Newsren refreshes the feeds (at most every 10 minutes) and keyword-searches the stored articles. The first check is "Initial coverage" and saves a baseline in the browser; later checks show only "New matching coverage". Nothing is monitored automatically. There is no scheduler, email or login.

## What the system can and cannot establish

**Can:**
- Show what a publisher's feed says (headline, excerpt, date) and link to the original.
- Summarize and explain what the supplied excerpts say, with links to the excerpts used.
- Say that a question is not answered by the stored excerpts.
- Tell you that a topic has stored articles you have not been shown before.

**Cannot:**
- **Verify facts.** An article link is provenance, not independent corroboration. Most stories rest on one publisher, which the interface says. Several articles from one publisher are not independent confirmation.
- **Read full articles.** Excerpts are short (at most 300 characters, sometimes none). The system has not browsed the web and says so.
- **Establish that a new real-world event happened.** "New matching coverage" only means Newsren stored a matching article it had not shown you. Retrieval time is not event time.
- **Find everything on a topic.** Matching is by word stem, with no synonyms or understanding, so it misses different wording and can match unrelated stories.
- **Guarantee accuracy.** The validation below catches obvious problems only.

## Validation and actual test results

**Server-side output checks.** Unknown citation IDs, uncited factual claims, URLs, numbers or quotations that are not in the excerpts, investment-advice phrasing and claims that are not lexically grounded in their cited excerpts (most content words and every capitalized name or acronym must appear in them) cause the whole output to be discarded and not cached. General background is kept in a separate uncited field and is dropped if it contains numbers, quotations or advice. A story with no usable excerpt is not sent to the model.

**Test results (26 October 2026, Node v24.19.0):**

| Check | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint`, `npm run build` | all pass |
| `npm test` (offline, fake provider and fixture data) | 68 checks pass: 29 AI validation / provider-error / limit / cache / de-duplication, 28 evidence-quality, explanation-limitations and update-task, 8 topic baseline and failure handling, 3 data retention |
| `npm run verify:feeds` (live) | all 15 feeds fetched and parsed |
| Original links (live) | the newest article of 14 of 15 feeds returned HTTP 200; the SEC returned 403 to an automated request, so SEC links were not opened |
| Real Gemini calls (local) | after the explanation and Ask fixes: Student, Educator and Professional explanations and a supported and an unsupported question on a one-sentence-excerpt story (CSX / Supply Chain Dive) all worked (5 calls); "explain me about it" and "What is this story about?" on the MIT story were answered with citations (3 calls). Earlier: a sourced brief, Student, Educator and Professional explanations, a supported question (answered with a citation), an unsupported question (declined: "available sources do not establish an answer"), a limited-evidence brief and an "Explain these updates" request all worked; cached repeats made no provider call |
| Real failures seen | a deliberately invalid key was rejected by Google and shown as "The Gemini API key was rejected"; during development the validator rejected several real model outputs (for example an Educator explanation with a numeric background note, since changed to drop only that note) |
| Browser walkthrough on real feeds | home, filters, search, direct story URL, follow/unfollow, saved topic with initial and repeat check (no duplicates), reload, server restart, mobile width (375 px, no horizontal overflow), loading, error, single-source, limited-evidence and no-excerpt states |
| Live demo (Render) | reachable (HTTP 200; the first request took about 37 s while the free instance woke); 13 of 15 sources reachable at one check; story pages load; an unknown story URL returns 404; AI buttons are enabled. **AI requests on the live site were not exercised.** |
| Simulated (not real) | 429 quota, timeouts, 5xx, malformed output and feed failure (`NEWSREN_BLOCK_FEEDS`) were simulated with fakes or a test switch |

**Not verified:** AI output on the deployed site; behaviour after a Render restart (expected from Render's free-tier terms, not tested); quality at scale or across many stories (a handful were reviewed); accuracy of paraphrases beyond the automated checks and a few manual reads; SEC original pages in a browser; behaviour on Node 22.

## Privacy, storage and data handling

- **Server:** stores public feed data (titles, excerpts, URLs, dates), feed status and cached AI outputs in a local SQLite file. It stores no accounts, names or reader content. For rate limiting it stores a hash of the caller's address (or "local") with a timestamp for 24 hours. Question text is cached with the answer.
- **Browser:** saved topics, followed sources, baselines and check results are stored only in your browser's `localStorage`. Clearing site data deletes them; they do not sync.
- **Sent to Google:** for each AI request, the question or topic text, the story or topic context and up to 7 publisher excerpts. On the free tier Google may use submitted content to improve its products, so do not enter private information into questions or saved topics.
- **Secrets:** `GEMINI_API_KEY` lives only in the server's environment (locally `.env.local`, which is git-ignored); it is not in the repository. Logs record error categories, not prompts or keys.
- **Retention:** nothing is pruned automatically. Locally the SQLite file persists across restarts. On the free Render demo the filesystem is not persistent: after a restart or redeploy the database starts empty and cached AI outputs are lost.

## Limitations and human review

- Keyword retrieval and 300-character excerpts limit both coverage and depth (see above).
- Briefs from one publisher are labelled single-source; a person should open the original link before relying on any statement.
- The model may phrase things more confidently than an excerpt warrants; the "Interpretation" and "Reported" tags and the "what remains uncertain" list reduce but do not remove this.
- No human editorial review happens inside the product. The project plan calls for human review before publishing finance content; this prototype publishes nothing and is meant to be read by a person who checks sources.
- The prototype has no abuse protection beyond basic request limits and same-origin checks, and is not hardened for public deployment.
- The SQLite store needs a persistent disk; it must not be assumed to persist on serverless or free ephemeral hosting. The free Render demo sleeps when idle (slow first request) and resets its data on restart.
- Free-tier API quota can run out; Newsren then shows an error and generates nothing.
- Newsren does not independently verify facts, does not read full articles, does not monitor topics automatically, and does not guarantee that any output is correct.
