# PROJECT MEMORY — Investidor10 Dashboard

## Identity

- Project: investidor10-dashboard
- Canonical workspace: G:\Meu Drive\Codex\investidor10-dashboard
- Repository: psmarquesdossantos-creator/investidor10-dashboard
- Stack: static HTML/CSS/JavaScript, Chart.js, Playwright, Python development server

## Architecture contracts

- `script.js` is an ES module. Classic scripts use explicit `window` bridges.
- Load the optional local wallet before auth gate, then load the app module.
- Demo data must be synthetic and independent from local wallet files and browser data.
- Import pipeline: FILE → DETECT → PARSE → NORMALIZE → VALIDATE → PREVIEW → DEDUP → CONFIRM → WRITE.
- Keep UNKNOWN distinct from zero, PARTIAL from COMPLETE, STALE from FRESH, and ENGINE from DATA_READY.
- Keep chart summaries and visible data sourced from the same active dataset.
- `carteira-data.js` and financial exports remain local-only.

## Privacy and deployment

- Fixtures and public examples must use synthetic identifiers and values.
- Never add portfolio values, transaction details, personal emails, backups, or credentials to tracked docs, tests, logs, or commits.
- `.gitignore` protects local files from Git; `.vercelignore` applies to CLI uploads.
- `vercel.json` must keep an explicit static asset allowlist for both Git and CLI deployments.
- Public Git history is immutable for this mission; historical exposure requires a separate owner-approved response.

## Current recovery state

- Canonical workspace authorized by the owner.
- Active branch: `codex/identity-privacy-recovery`.
- This mission replaces the previous profile-shaped demo with a small synthetic fixture.
- See `PROJECT_STATE.md` and `NEXT_STEP.md` for validation and remaining blockers.
