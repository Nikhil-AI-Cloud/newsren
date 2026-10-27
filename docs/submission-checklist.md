# Submission checklist

Status as of 26–27 October 2026. The exact course upload requirements (format, platform, deadline, what to include) have **not been confirmed**: check the assignment page before submitting and adjust this list.

| Item | Status | Notes |
| --- | --- | --- |
| Source code | Done | Public repository: https://github.com/Nikhil-AI-Cloud/newsren (standalone; the unrelated app is not included). Also packaged as `Newsren_Submission.zip`. |
| README (`README.md`) | Done | Install, run, configuration, architecture, sources, limits, hosting. |
| Submission summary (`SUBMISSION.md`) | Done | |
| System card (`docs/system-card.md`) | Done | |
| Demo script (`docs/demo-script.md`) | Done | Timed 2-minute real-app walkthrough, plus a separate optional fixture section. |
| Demo video | **To be recorded** | Does not exist yet. Record with `docs/demo-script.md`. |
| Deployment URL | Done (free demo) | https://newsren.onrender.com. Free Render instance: sleeps when idle and its database resets on restart (see README). |
| Course upload requirements | **Unconfirmed** | |

## Before you hand anything in

1. Run `npm run typecheck`, `npm run lint`, `npm run build` and `npm test` from `newsren/`.
2. Make sure the package contains **no** secrets or generated data. Do not include: `.env.local` (your Gemini key), `.data/` (SQLite databases), `node_modules/`, `.next/`, `next-env.d.ts` or `tsconfig.tsbuildinfo`. `.env.example` is safe (no values).
3. Optionally rotate the Gemini key before sharing the project, since it was shared in plain text during development.

`Newsren_Submission.zip` was built from the committed files only (`git archive`), so it already leaves those out. To rebuild it from the repository folder:

```bash
mkdir -p ../newsren-submission-output
git archive --format=zip --prefix=Newsren/ -o ../newsren-submission-output/Newsren_Submission.zip HEAD
```

Then check what it contains:

```bash
unzip -l ../newsren-submission-output/Newsren_Submission.zip
```
