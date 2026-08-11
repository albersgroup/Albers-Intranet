# Visual Diff — Phase 3 Pixel-Parity Plan

## Why

Phase 3 replaces six hand-assembled React division-home pages with one Rails
template driven by the content model. "Replaces" needs a definition of done
that isn't just "renders something reasonable" — the requirement is **visual
parity with the existing Node app**, checked automatically rather than by eye.
This tool freezes what the Node app currently renders and checks the Rails app
against that frozen reference as Phase 3 work lands.

## Status

**Local-only, temporary.** It exists to gate the Node → Rails conversion and
gets deleted once Node is decommissioned (Phase 5) — it is not part of the
long-term test suite and is not wired into CI.

## Tool choice

**Playwright Test's built-in `toHaveScreenshot()`**, not a bespoke pixelmatch
script. It already does anti-aliasing-aware pixel comparison with configurable
thresholds, and produces a proper HTML report (side-by-side, diff overlay,
slider) via `playwright show-report` — no reason to reinvent that.

## Location

New top-level `visual-diff/` directory (sibling to `client/`, `server/`,
`rails/`) — cross-cutting migration tooling, not part of either app.

## Two-step flow

1. **`capture-baseline.ts`** — a plain script (not a Playwright test) that logs
   into the running Node app, navigates each scenario route, screenshots it,
   and saves PNGs into `visual-diff/baselines/`. Run once now, and again only
   if a division's Node design is deliberately changed before decommission
   (it shouldn't be — Node is frozen). **These PNGs are committed to git** —
   they are the versioned definition of "pixel-perfect," and once Node is gone
   this is the only record of what it looked like.
2. **`compare.spec.ts`** — a real Playwright test. For each scenario, navigates
   to the equivalent Rails URL and asserts `toHaveScreenshot()` against that
   same baseline file (via `snapshotPathTemplate` pointing both capture and
   compare at `visual-diff/baselines/`). Run via `npx playwright test` any time
   during Phase 3 work; fails with a diff image the moment Rails drifts from
   the frozen reference.

## Scenario mapping

| name | Node route | Rails route | Node auth required |
| --- | --- | --- | --- |
| corporate | `/` | `/portal/corporate` | no |
| defense | `/defense` | `/portal/defense` | yes |
| industrials | `/industrials` | `/portal/industrials` | yes |
| advanced-programs | `/special-projects` | `/portal/advanced_programs` | yes |
| bou | `/bou` | `/portal/bou` | yes |

Note the route/enum mismatch on advanced programs: the Node route is
`/special-projects` but the underlying division key is `advanced_programs` —
the scenario config captures that explicitly rather than assuming symmetry.

## Capture scope: content region, not full page

Full-page for `corporate` only (no sidebar chrome, public route). For the
other four, screenshot just the `<main>` content region, not the full page.
Rails intentionally uses a topbar instead of the Node app's sidebar — a
full-page diff there would show ~100% mismatch on chrome alone and bury the
signal that actually matters (does the portal *content* match). Configurable
per-scenario, not hardcoded, in case full-page comparison is wanted later.

## Auth for capture

Node's dev-login credentials are read from environment variables
(`visual-diff/.env`, with `.env.example` documenting the shape) — no
credentials, even fake local ones, live in source.

## Housekeeping

`playwright-report/` and `test-results/` are gitignored (ephemeral,
regenerated per run). `baselines/*.png` are committed — they're the point of
the exercise.

## Relationship to the execution plan

Referenced from Phase 3 in [`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md) as the
acceptance mechanism for "server-render the division portals": Phase 3 is done
when `visual-diff`'s comparison suite passes for all five scenarios, not
before.
