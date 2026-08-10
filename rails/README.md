# Albers Intranet — Rails CMS (`rails/`)

The go-forward rebuild of the Albers Intranet as a **unified content management
system** on Rails 8. This is the Phase 1–2 deliverable of
[`docs/EXECUTION_PLAN.md`](../docs/EXECUTION_PLAN.md) — a working CMS to evaluate
at the Decision Gate. The stripped Node app still lives alongside in the repo
root for comparison.

## What's here

- **Unified content model** — three tables replace the old thirteen:
  - `content_items` — division, section, `content_type`, title, ordered
    `position` (acts_as_list), `status` (draft / scheduled / published /
    archived), `publish_at`, ActionText `body`, author.
  - PaperTrail `versions` — full history, diff, rollback, audit trail.
  - `media_assets` — a reusable media library (ActiveStorage).
- **One admin UI (Avo)** replacing the six hand-built React admin pages, with a
  "Publish now" action and division/status filters.
- **Division-scoped authorization (Pundit)** — admins manage all divisions,
  division admins only their own (plus org-wide content), viewers read-only.
- **Scheduled publishing** — `PublishScheduledContentJob` (Solid Queue, every
  minute) flips due scheduled items live.
- **Full-text search (pg_search)** across content.
- **Server-rendered portals** — `PortalsController` renders any division's
  portal entirely from `content_items`, proving one template replaces the six
  bespoke React home pages.
- **Entra ID SSO** with a dev-login bypass (see below).

## Local setup

Requires Ruby 3.3, PostgreSQL 16, Bundler.

```bash
cd rails
bundle install

# Point at your Postgres (defaults shown; override via env if needed)
export PGHOST=localhost PGUSER=albers PGPASSWORD=albers

bin/rails db:prepare   # create + migrate + seed
bin/rails server       # http://localhost:3000
```

Seeded sign-ins (dev only): `admin@albers.aero` (org admin),
`corporate.admin@albers.aero` / `defense.admin@albers.aero` (division admins),
`viewer@albers.aero`.

- Public portals: `/` (Corporate) and `/portal/:division`.
- Admin CMS: `/avo` (requires an admin or division-admin session).

## Authentication

### Dev login (default until Entra consent lands)
`/login` lists the seeded users; clicking one signs in. Guarded to
non-production (`SessionsController#dev_create`).

### Entra ID SSO (production)
Real OpenID Connect via `omniauth_openid_connect`. It activates automatically
once these environment variables are present — otherwise the provider is not
registered and dev login is used:

| Variable | Purpose |
| --- | --- |
| `AZURE_TENANT_ID` | Entra tenant (directory) ID |
| `AZURE_CLIENT_ID` | App registration (client) ID |
| `AZURE_CLIENT_SECRET` | App registration client secret |
| `APP_BASE_URL` | Public base URL, for the OIDC redirect URI |

**Azure app registration (external dependency — start early):**
1. Azure Portal → Entra ID → App registrations → New registration.
2. Redirect URI (Web): `${APP_BASE_URL}/auth/entra_id/callback`.
3. Certificates & secrets → new client secret → copy into `AZURE_CLIENT_SECRET`.
4. API permissions: `openid`, `email`, `profile` → **grant admin consent**
   (this step needs a tenant admin and is the scheduling risk).
5. Map roles/divisions from Entra group claims to `User#role` / `User#division`
   (extend `User.from_omniauth`).

## Media storage

`ActiveStorage` uses local disk in development and **Azure Blob Storage** in
production (no persistent disk required). Configure with `AZURE_STORAGE_ACCOUNT`,
`AZURE_STORAGE_ACCESS_KEY`, and `AZURE_STORAGE_CONTAINER`; production falls back
to local disk if these are unset.

## Tests

```bash
bundle exec rspec      # model, policy, job, and request specs
bundle exec rubocop    # rails-omakase style
```

CI runs both on every push touching `rails/` (`.github/workflows/rails-ci.yml`).

## Not yet built (post–Decision Gate)

Per the execution plan, these are deliberately deferred until the go/no-go on
Rails: server-rendering all six portals in full fidelity, porting Trip Reports
and the BOU Bulletin Board, mounting the BD decision tools as React islands, and
the Albers Bot re-integration seam.
