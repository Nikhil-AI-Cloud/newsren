# Submission checklist

Status as of 26 October 2026. The exact course upload requirements (format, platform, deadline, what to include) have **not been confirmed**: check the assignment page before submitting and adjust this list.

| Item | Status | Notes |
| --- | --- | --- |
| Source code (`newsren/`) | Ready, not committed | Nothing is committed to git; the folder sits inside an unrelated repository. Decide how it is to be delivered (zip, new repository or the course's platform). |
| README (`README.md`) | Done | Install, run, configuration, architecture, sources, limits, hosting. |
| System card (`docs/system-card.md`) | Done | |
| Demo script (`docs/demo-script.md`) | Done | Timed 2-minute real-app walkthrough, plus a separate optional fixture section. |
| Demo video | **To be recorded** | Does not exist yet. Record with `docs/demo-script.md`. |
| Deployment URL | **Pending** | Not deployed. The app needs a host with a persistent disk (see README). Do not list a URL until one exists. |
| Course upload requirements | **Unconfirmed** | |

## Before you hand anything in

1. Run `npm run typecheck`, `npm run lint`, `npm run build` and `npm test` from `newsren/`.
2. Make sure the package contains **no** secrets or generated data. Do not include: `.env.local` (your Gemini key), `.data/` (SQLite databases), `node_modules/`, `.next/`, `next-env.d.ts` or `tsconfig.tsbuildinfo`. `.env.example` is safe (no values).
3. Optionally rotate the Gemini key before sharing the project, since it was shared in plain text during development.

A zip that leaves those out can be created from the folder that contains `newsren/`:

```bash
zip -r newsren-submission.zip newsren -x "newsren/.env.local" "newsren/.env" "newsren/.data/*" "newsren/node_modules/*" "newsren/.next/*" "newsren/next-env.d.ts" "newsren/*.tsbuildinfo" "*/.DS_Store"
```

Then check what it contains:

```bash
unzip -l newsren-submission.zip
```
