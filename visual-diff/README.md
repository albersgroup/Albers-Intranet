# visual-diff

Local-only, temporary tool that gates Phase 4 of the Rails migration
(see [`docs/VISUAL_DIFF_PLAN.md`](../docs/VISUAL_DIFF_PLAN.md)). Freezes what
the Node app currently renders as baseline PNGs, then checks the Rails app
against them via Playwright's `toHaveScreenshot()`. Not wired into CI, and
gets deleted once Node is decommissioned — it exists only to make "pixel
parity" checkable instead of eyeballed.

## Setup

```bash
cd visual-diff
npm install
npx playwright install chromium
cp .env.example .env   # fill in OLD_APP_EMAIL / OLD_APP_PASSWORD
```

## Baselines are environment-bound

Font metrics change text wrapping and therefore layout. Baselines captured on
a machine with different fonts **will not match** — even the Node app itself
fails against them (this happened once: the original baselines predated the
devcontainer and were re-captured inside it on 2026-08-11). Capture and
compare must run in the same environment; the devcontainer is that
environment. Run compare **headless only** (the default) — headed Chromium
reintroduces scrollbars and shifts layout.

## Capture the baseline

```bash
# Node app must be running: PORT=5050 npm run dev  (from the repo root)
# The Node dev DB needs its schema (npm run db:push), the five undeclared
# raw-SQL tables the routes still hit (at minimum division_bulletins), zero
# content rows, and a verified ADMIN user matching OLD_APP_EMAIL — the
# baselines are captured logged-in, so admin-only affordances (LinkedIn sync
# link, spotlight edit pencil, the invisible-but-in-flow content-block edit
# button) are part of the frozen reference.
npm run capture-baseline
```

Logs into the Node app, screenshots each scenario in `scenarios.ts`, and
writes PNGs into `baselines/`. **Commit these** — they're the versioned
definition of "pixel-perfect" and, once Node is gone, the only record of
what it looked like. Only re-run if a division's Node design is deliberately
changed (it shouldn't be — Node is frozen) or the capture environment itself
changes (see above).

Note: `npm run capture-baseline` uses tsx, which fails under this
devcontainer's Node 24; `node capture-baseline.ts` works directly (native
type stripping).

## Compare Rails against the baseline

```bash
# Rails must be running with the PARITY seed profile — the baselines were
# captured against an empty Node database, so Rails must render its
# code-level defaults, not demo content:
cd ../rails
SEED_PROFILE=parity bin/rails db:seed
bin/rails tailwindcss:build
bin/rails server -p 4123

cd ../visual-diff
npm run compare   # runs the Playwright test suite
npm run report    # opens the interactive HTML diff report
```

A failing scenario means Rails has drifted from the frozen Node reference;
the report shows expected/actual/diff side by side. A small anti-aliasing
tolerance is configured in `playwright.config.ts` (`maxDiffPixelRatio: 0.02`)
— real layout drift fails well above that threshold. Do not loosen it and do
not update baselines to make a comparison pass.

## Why content-region, not full-page, for four of five scenarios

Rails intentionally replaces Node's sidebar with a topbar — comparing full
pages there would show ~100% mismatch on navigation chrome alone and bury
whether the content itself matches. Those four scenarios screenshot just the
`<main>` region on both sides instead, and run the Rails side at a 1152px
viewport (Node's content region is 1440 minus the 288px sidebar; Rails has
no sidebar, so the viewport carries the difference rather than Rails markup).
The public corporate home has no sidebar on the Node side, so it stays
full-page at 1440 (see `scenarios.ts` for the per-scenario selector
reasoning, including why corporate's old/new selectors are asymmetric).

## Known gap

The sixth Node home page, `/business-development`, has no scenario or
baseline — it was deliberately deferred to Phase 5 along with the BD tools.
When it's ported, add a scenario in `scenarios.ts`, capture its baseline, and
extend the Rails `Portal::Layout` registry with one more definition.
