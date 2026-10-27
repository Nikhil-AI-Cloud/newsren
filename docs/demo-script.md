# Newsren demo script (about 2 minutes)

Everything in the timed part uses **real feeds and real stored articles**. The fixture section at the end is separate, uses fake data and a different port and database, and is optional. Manual checks are never autonomous monitoring: say that out loud.

## Before recording

From the `newsren/` folder, run each command on its own:

```bash
npm install
```

```bash
npm run build
```

```bash
npm start
```

Open http://localhost:3000. Make sure `.env.local` contains your Gemini key (see README) and that your browser's saved topics are empty for this site (browser developer tools, Application, Local Storage, clear), so the topic demo starts clean.

**Content check (do this just before recording).** Stories change as feeds update, so confirm today's content still fits:

1. The demo story below should open. It is saved in your local database (`.data/newsren.sqlite`), so it stays available even after it leaves the feed. If you are on a different machine or a fresh database, pick any Technology story from MIT News instead and expect to click **Generate** (a real Gemini call).
2. On the Following page, check that the demo topic **tariffs** finds matches (4 on 26 October 2026). If it finds none, use **Federal Reserve** instead.

**Pre-warm (recommended, before recording).** Open the demo story below and click **Generate AI brief** if the brief is not already shown, then click each of **Student**, **Educator** and **Professional** and press its **Generate … explanation** button once, then ask the two questions in the table. Each first click is a real Gemini request (a few seconds, free-tier quota); repeats of the same click are served from the local cache and make no request. If a button shows "Generating…" during the recording, a real request is being made. The saved results exist only in your local database.

**Local vs live demo.** This script is written for the local app (http://localhost:3000), where results you pre-warmed stay saved. The live demo (https://newsren.onrender.com) is a free Render instance: it sleeps when idle (open it a minute before recording to wake it), and its database and cached AI results reset after a restart, so every AI click there is a new request unless you pre-warmed it in the same session. Its content comes from the same 15 feeds but is a different database, so the demo story below may not exist there; pick any current Technology story instead.

## Timed walkthrough

**Demo story (direct URL):**
http://localhost:3000/story/at-mit-martha-minow-speaks-on-sustaining-democracy-both-by-u-303db39c14fc

| Time | Do | Say |
| --- | --- | --- |
| 0:00 – 0:15 | Open http://localhost:3000. Point at the category tabs, click **Technology**, then type `federal reserve` in search and clear it. Open the **Sources** line to show 15 of 15 sources. | "Newsren reads 15 approved official and publisher feeds. These are headlines and short publisher excerpts, each linking to the original." |
| 0:15 – 0:35 | Open the demo story URL. Show the publisher excerpt, the **Read the original at MIT News** link and the **Source and provenance** section. | "The excerpt is the publisher's own text. A link to the original is provenance, not independent verification." |
| 0:35 – 1:00 | Show the brief: the AI label and time, the **Single source, not independently verified** notice, **What happened**, the **Reported / Interpretation** tags, **What remains uncertain**, then click a numbered citation. | "The brief was generated from the excerpt only. Every fact has a link, interpretation is labelled, and it is flagged single-source." |
| 1:00 – 1:15 | Click **Student**, **Educator**, **Professional** (each already generated). Point at **Limits of the evidence** and, if shown, the **General background** box. | "Same evidence, three levels. The cited text only says what the excerpt says; gaps and caveats are in 'Limits of the evidence', and general context is labelled as background." |
| 1:15 – 1:40 | Ask: `What is this story about?` Then ask: `What were the audience's reactions and on what exact date was the lecture held?` | "On a story page, 'this story' means the story you're reading. The first answer is cited from the excerpt; the second is not in the excerpt, so it says the sources do not establish an answer." |
| 1:40 – 2:00 | Click **Follow source** (then **Following**). Open **Following**, save the topic `tariffs`, click **Check for updates** (Initial coverage), click again (no new coverage, nothing repeated). | "This is a manual check, not monitoring. The first check sets a baseline in this browser; later checks show only new matching articles. Matching is keyword-based, and new coverage does not mean a new event." |

Do not describe the check as monitoring, and do not say the output is verified. Close by saying what it cannot do: it reads excerpts, not full articles, and you should open the original.

## Optional: fixture demonstration of "New matching coverage" (fake data)

Say clearly on camera: **"This part uses fake fixture articles from a separate demo database, not live news."** Publisher names read "FIXTURE Demo Wire".

From the `newsren/` folder, in a **second terminal**, run each command on its own. The live app on port 3000 can keep running.

1. Create the separate demo database (it never touches the live one):

```bash
node scripts/demo-fixture.ts seed
```

2. Set the environment variables for this terminal only:

```bash
export NEWSREN_DB_PATH=.data/demo.sqlite
```

```bash
export NEWSREN_REFRESH_SECONDS=999999
```

3. Start the demo server on port 3200 (needs `npm run build` to have been run once):

```bash
npm start -- -p 3200
```

4. Open http://localhost:3200/following, save the topic `solar panel tariffs` and click **Check for updates**: "Initial coverage" of 3 fixture articles.

5. In a **third terminal** (from `newsren/`), add fixture updates:

```bash
node scripts/demo-fixture.ts add
```

6. Click **Check for updates** again: "New matching coverage" shows the 2 new fixture articles; the earlier 3 are not repeated.

7. Optional (one real Gemini call on fixture text): add one more, check again, then click **Explain these updates (AI)**:

```bash
node scripts/demo-fixture.ts add2
```

8. Stop the demo server with Ctrl+C. Port 3200 uses a separate browser origin, so its saved topics do not mix with port 3000. To reset the fixture, run the `seed` command again.
