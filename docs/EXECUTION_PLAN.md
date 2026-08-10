# Albers Intranet — Simplify & Rebuild-on-Rails: Execution Plan

> Condensed, actionable version of the Feasibility Study (Rev 2). The study argued
> that once IDIQ, BOU Admin/Training, Albers Bot, and the external integrations are
> out of scope, what remains is essentially a **content management system** —
> implemented twice (BOU, then cloned for the divisions) with no shared abstraction.
> The go-forward is therefore not "port the app, then build a CMS." It is: **strip
> the Node app, then rebuild the surviving content layer as a unified CMS on Rails**,
> so the roadmap CMS feature *is* the migration.

## Framing decision: no users, no migration

The current intranet is a **demo with no active users**. There is **no
backward-compatibility requirement and no data-migration requirement**. That removes
the most expensive non-code work the study anticipated — a live-DB migration
baseline, characterization tests as migration ground-truth, and verifying a data
migration against production content. **We build the new model fresh and seed it with
representative content.**

## Locked decisions

| Question | Decision |
| --- | --- |
| Where does the Rails app live? | New app in **`rails/`** subdirectory of this repo; the stripped Node app stays alongside and runnable for A/B comparison at the gate. |
| Strip first, or Rails-only? | **Strip first.** The lean surviving surface becomes the precise spec for the port. |
| Authentication | **Real Entra ID OIDC** (`omniauth_openid_connect`), with a **dev-login bypass** so the CMS is demonstrable before Azure tenant admin consent lands. |
| Admin UI | **Avo** (resource-per-model), replacing the ~5,280 lines of hand-built React admin. |

## Current-state facts (measured from the repo)

- **46 tables**: 41 declared in `shared/schema.ts` + **5 undeclared raw-SQL tables**
  (`division_bulletins`, `division_hero_assets`, `division_home_sections`,
  `division_quick_links`, `bou_training_categories`) that live CRUD code hits but
  for which no `CREATE TABLE` exists anywhere. Moot once we leave Drizzle, but it
  demonstrates the content layer's fragility.
- **183 endpoints** in a single **8,542-line `server/routes.ts`**.
- **No tests, no CI**; `drizzle-kit push` is the only schema mechanism.
- **DOMPurify is not in the client bundle.** Eight `dangerouslySetInnerHTML` sinks
  render stored HTML; only the trip-report path is sanitized (server-side).
- Division portals are **inconsistent**: Corporate has editable content blocks, team
  spotlights, and a LinkedIn widget; Defense / Industrials / Special-Projects only
  have `DivisionBulletins`. Nobody appears to have chosen this.

## The phases

| # | Phase | Outcome | Executed now? |
| --- | --- | --- | --- |
| 0 | **Strip the Node app** | Delete out-of-scope modules + dead code; lean surviving surface = the port spec | ✅ Yes |
| 1 | **Rails foundation** | Rails 8 app, keep-as-is models, Entra OIDC, Avo, Pundit, ActiveStorage→Azure, RSpec + CI | ✅ Yes |
| 2 | **Unified CMS** (the roadmap feature) | `content_items` / `content_versions` / `media_assets`; draft/schedule/publish, versioning, media library; one Avo admin; seeded content | ✅ Yes |
| — | **DECISION GATE** | Working Rails CMS to evaluate; re-estimate the rest | ⏸ Stop & decide |
| 3 | Server-render the division portals | Six hand-assembled React homes → one templated page driven by the content model | ❌ Post-gate |
| 4 | Port the remaining apps | Trip reports (ActiveStorage), bulletin board (ActiveRecord), BD tools as React islands, pg_search across all content | ❌ Post-gate |
| 5 | Cutover & decommission | Content-owner walkthrough, UAT, DNS switch, retire the Node app | ❌ Post-gate |

---

## Phase 0 — Strip the Node app

Delete **in place**. We do *not* invest in splitting the 8,542-line `routes.ts`
monolith — the Node app is a reference to be decommissioned, not maintained.

**Remove**

- **IDIQ** — `/api/idiq/*` (incl. email-ingest webhook), `client/src/pages/IdiqManagement.tsx`,
  IDIQ routes in `App.tsx`, the 11 `idiq_*` tables.
- **BOU Admin & Training** — the training/admin half of `/api/bou` (training
  slides/categories/assignments, quick-links, home-layout, hero-assets, bot-settings),
  `pages/admin/BOUAdminPage.tsx`, the training/admin tables. **Keep the BOU Bulletin
  Board** (posts/comments/likes/mentions/shares/members).
- **Albers Bot + Knowledge Base** — `/api/chat`, `server/generate-knowledge-base.ts`,
  `server/knowledge-base.txt`, the Albers Bot page, and the
  `knowledge_articles` / `knowledge_update_logs` / `bot_question_logs` tables.
- **Dormant integrations** — `/api/clickup`, `/api/easy-bi-reports` (BI SSO +
  `generateSSOToken`), IDIQ email ingestion.
- **Dead code** — `server/objectStorage.ts`, `server/storage.ts`,
  `server/plaud-parser.ts`, `server/resend-client.ts`; client `CommandPalette.tsx`,
  legacy `pages/Home.tsx` + `TopNav.tsx` + `WelcomePage.tsx`; Replit vite plugins +
  deps, `.replit`, `main.py`; `@neondatabase/serverless` if unreferenced after the cut.

**Fix (keep-regardless, light)**

- Wire **DOMPurify** into the surviving client `dangerouslySetInnerHTML` sinks (news,
  content blocks, SOPs). Small, since Rails/ActionText supersedes these paths — but it
  closes a privilege-escalation path in the app that stays runnable through the gate.

**Explicitly deferred** (premature before the go/no-go; Rails replaces them)

- Node → Azure Blob storage migration (Rails ActiveStorage does this natively).
- A Node characterization-test suite (only pays off on the stay-on-Node path).

**Result:** a roughly-half-size Node app whose surviving surface — trip reports,
bulletin board, BD tools, division portals/CMS, news, newsletters, LinkedIn, industry
events, SOPs, admin/users, auth — is the authoritative spec for the Rails port.
`npm run check` passes and `npm run dev` boots.

## Phase 1 — Rails foundation (`rails/`)

- **Rails 8 + Ruby 3.3+**, PostgreSQL, Propshaft + importmap. Isolated from the Node build.
- **Models & migrations** for the keep-as-is domain, generated fresh (no data
  migration): `users`, trip reports (+photos), BOU bulletin board, BD decision
  artifacts, admin. CMS content tables are intentionally deferred to Phase 2's
  unified model.
- **Entra ID OIDC** via `omniauth_openid_connect`, mapping division + admin role from
  group claims, with a **dev-login bypass** guarded to non-production. Azure app
  registration + tenant admin consent are an external dependency — documented in
  `rails/README.md`, not blocking.
- **Avo** installed and mounted; **Pundit** for division-scoped authorization.
- **ActiveStorage** with the Azure Blob service (prod) + local disk service (dev).
- **CI**: GitHub Actions running **RSpec** (+ FactoryBot) and RuboCop — the test
  framework the Node app never had.

## Phase 2 — Unified CMS (the real work)

**Schema — 3 tables replace 13:**

- `content_items` — `division`, `section`, `content_type` (enum), `title`,
  `position` (`acts_as_list`), `status` (draft / scheduled / published / archived),
  `publish_at`, ActionText `body`, `author`, timestamps.
- `content_versions` — via **paper_trail** (history, diff, rollback, audit trail).
- `media_assets` — via **ActiveStorage** (reusable media library).

`content_type` spans the existing shapes: `news`, `quick_link`, `hero_asset`,
`content_block`, `team_spotlight`, `newsletter`, `bulletin`, `linkedin_post`,
`industry_event`.

**Capabilities** (all cheap on a unified model, none exist today): draft/preview
before publish, publish, **scheduled publishing** (background job), **version history
+ rollback**, audit trail, media library. ActionText sanitizes on render by default —
closing the XSS blocker as a side effect of adoption.

- **Search**: `pg_search` across content items.
- **One Avo admin** (a `ContentItem` resource, division/type-scoped via Pundit)
  replacing the six React admin pages (`DivisionAdminPage`, `NewsAdminPage`,
  `NewsletterAdminPage`, `LinkedInAdminPage`, `BDAdminPage`, `ControlPanel`).
- **Seed** representative content across every division and content type.
- **Proof render**: a thin Rails controller/view rendering one division portal from
  `content_items` — demonstrating the model drives real pages. (Full portal
  server-render is Phase 3.)

## Decision Gate

**Deliverable to evaluate:** a runnable Rails CMS where an admin can **create / edit /
version / schedule / publish** content and **upload & reuse media**, with **division
scoping enforced**; a proof page renders a portal from the content model; the Node app
is still runnable for everything else. Accompanied by a **re-estimate** of the
remaining phases from what Phase 2 actually cost.

This is a genuine off-ramp: keep Node, or commit to Rails. The remainder is
re-estimated here after Phase 2 completes (see "Re-estimate" below).

---

## Open questions for requirements gathering

These shape Phase 2+ and are best answered by the people who maintain the pages, not
inferred from the current schema (which is an artifact of BOU being built first and
cloned):

1. **What are the actual content types, and who publishes each?** Get the real list.
2. **Do roles come from Entra groups or stay in the app?** Decides whether the users
   table is a shadow copy or a system of record.
3. **Which CMS capabilities are required at go-live?** Draft/preview, versioning,
   scheduled publishing, approval workflow, media library, audit trail. Approval
   workflow in particular expands scope quietly.
4. **Is the six-portal inconsistency intentional?** A unified CMS makes divisions
   consistent by default — confirm what each should actually have.
5. **How will Albers Bot embed when it returns?** Iframe with signed handoff, shared
   session, or server-side API call. Design the seam deliberately.

## Re-estimate

_To be filled in at the Decision Gate from actual Phase 2 cost._
