# visual-diff

Local-only, temporary tool that gates Phase 3/4 of the Rails migration
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

Both apps need to be running locally first — see the repo root README for
Node (`npm run dev`) and `rails/README.md` for Rails (`bin/rails server`).

## Capture the baseline (do this once)

```bash
npm run capture-baseline
```

Logs into the Node app, screenshots each scenario in `scenarios.ts`, and
writes PNGs into `baselines/`. **Commit these** — they're the versioned
definition of "pixel-perfect" and, once Node is gone, the only record of
what it looked like. Only re-run this if a division's Node design is
deliberately changed before decommission (it shouldn't be).

## Compare Rails against the baseline

```bash
npm run compare   # runs the Playwright test suite
npm run report    # opens the interactive HTML diff report
```

Run this anytime during Phase 3/4 work. A failing scenario means Rails has
drifted from the frozen Node reference; the report shows expected/actual/diff
side by side. A small anti-aliasing tolerance is configured in
`playwright.config.ts` (`maxDiffPixelRatio: 0.02`) — real layout drift should
fail well above that threshold.

## Why content-region, not full-page, for four of five scenarios

Rails intentionally replaces Node's sidebar with a topbar — comparing full
pages there would show ~100% mismatch on navigation chrome alone and bury
whether the content itself matches. Those four scenarios screenshot just the
`<main>` region on both sides instead. The public corporate home has no
sidebar on the Node side, so it stays full-page (see `scenarios.ts` for the
per-scenario selector reasoning, including why corporate's old/new selectors
are asymmetric).
