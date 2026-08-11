# Content Model Split — Per-Type Models Plan

## Status

**Implemented** (Phase 3, see [`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md)). This
doc is kept as the design record for *why* delegated types over STI and the
resulting shape; a few details were adjusted during implementation — notably
`ContentEnvelopeFields` lives at the model layer (a `ContentRecord` concern
delegating title/subtitle/division/section/position/status/publish_at/
author/media_asset/image onto each concrete type) rather than only at the Avo
layer, and each Avo resource sets `self.authorization_policy = ContentRecordPolicy`
(a new shared policy, since `ContentItemPolicy` now guards only the read-only
overview resource).

## Why

Phase 2 (built, in the PR) collapsed thirteen old content tables into one
`ContentItem` with a `content_type` string column and a single Avo resource
showing every field for every type — `link_url` next to `body` next to
`start_date`, mostly irrelevant to whichever type is actually selected. That
was the right move at the **storage/behavior** layer (ordering, publish
lifecycle, versioning, media, division scoping are genuinely one concern,
not thirteen). It is the wrong move at the **admin UX / domain-model**
layer: an administrator doesn't think in terms of "a content item of type
news" — they think in terms of "a news article." A single mega-model with a
type dropdown is not an improvement over thirteen tables from the person
using the CMS, even though it's a big improvement in the code.

The fix is to split by type at the model layer while keeping the CMS
behaviors unified underneath — not a reversal of Phase 2, a more correct
realization of what Phase 2 was actually trying to do.

## Pattern: Rails delegated types, not STI

Two ways to get "shared behavior, distinct types" in ActiveRecord:

- **Single Table Inheritance** — one physical table, a `type` column,
  subclasses add behavior. Simple, but every type-specific column (an
  `IndustryEvent`'s `start_date`/`end_date`/`location`, a `QuickLink`'s
  `link_url`) sits as a NULL column on every row of every *other* type. Only
  fixes the admin-UX problem, not the schema-cleanliness problem, and gets
  worse as more types are added.
- **Delegated types** (`delegated_type`, Rails 6.1+) — `ContentItem` keeps
  the universal CMS surface (placement, lifecycle, versioning, media) and
  holds a polymorphic reference to one of N concrete tables, each with only
  its own columns. This is the pattern Rails added specifically for "a set
  of otherwise-distinct domain objects that share a placement/lifecycle
  envelope" — Basecamp's own `Recording`/`Entry` pattern in Basecamp 3 and
  HEY is the canonical example.

**Recommendation: delegated types.** It solves both problems — clean admin
UX (one Avo resource per type, only relevant fields) and clean schema (no
NULL bloat as more types are added).

## Shape

`ContentItem` keeps the fields that are genuinely universal — the CMS
envelope, not the content:

- `division`, `section`, `position` (`acts_as_list`)
- `status` (draft/scheduled/published/archived), `publish_at` — unchanged,
  `PublishScheduledContentJob` and `ContentItemPolicy` are untouched by this
  change, they only ever touched these fields
- `title` (kept centralized — every one of the nine types uses a title as
  its primary label; portal rendering and search benefit from not needing a
  per-type field map just to list things). `subtitle` likely stays too, as
  the "secondary line" pattern recurs across most types — worth confirming
  once real content types are nailed down (see open question below)
- `author_id`, `media_asset_id` (the reusable media library reference stays
  centralized — "attach a library asset" is a universal CMS action)
- `content_record_type` / `content_record_id` — the new delegated-type link

Nine concrete tables replace the `content_type` enum, one per existing type,
each with only its distinguishing fields:

| Type | Distinguishing fields (beyond the shared envelope) |
| --- | --- |
| `News` | body (ActionText); maybe `is_pinned` |
| `QuickLink` | `link_url`, `icon` |
| `HeroAsset` | `alt_text`; "only one active per division" behavior |
| `ContentBlock` | body; optional `block_key` for named singleton blocks (e.g. the old `strategic_plan` block) |
| `TeamSpotlight` | body; likely employee name/role — pending real content-type answers |
| `Newsletter` | file attachment (PDF); `is_current` — another singleton-per-division flag |
| `Bulletin` | body; `is_pinned` |
| `LinkedinPost` | `external_ref` (post permalink/id); possibly cached engagement counts |
| `IndustryEvent` | `start_date`, `end_date`, `location`, `vertical` — structurally the most different of the nine, the strongest argument for not flattening onto one table |

`HeroAsset` and `Newsletter` share a "only one active/current per division"
pattern (this existed in the old Node app — activating one deactivated the
others). Worth a small shared concern rather than duplicating that logic
twice.

Each concrete model includes a `ContentRecord` concern:
```ruby
module ContentRecord
  extend ActiveSupport::Concern
  included { has_one :content_item, as: :content_record, touch: true }
end
```
and `ContentItem` becomes:
```ruby
class ContentItem < ApplicationRecord
  delegated_type :content_record, types: %w[
    News QuickLink HeroAsset ContentBlock TeamSpotlight
    Newsletter Bulletin LinkedinPost IndustryEvent
  ]
  # acts_as_list, status/publish_at, pg_search_scope, has_paper_trail — unchanged
end
```

`pg_search_scope` extends via `associated_against` to reach into whichever
concrete table's body/text field is relevant. `has_paper_trail` applies to
both `ContentItem` (placement/lifecycle changes) and each concrete type
(content changes) — versioning stays intact, just correctly attributed to
which table actually changed.

## Admin UX payoff

One Avo resource per type — `Avo::Resources::News`, `::QuickLink`,
`::HeroAsset`, `::TeamSpotlight`, `::Newsletter`, `::Bulletin`,
`::LinkedinPost`, `::IndustryEvent`, `::ContentBlock` — each a clean,
minimal form with only relevant fields, appearing as distinct sections in
the Avo sidebar instead of one "Content Items" resource with a type
dropdown. Shared placement/lifecycle fields (division, section, position,
status, publish_at) are still shown on every form, via a shared field-list
concern so nine resource files don't hand-duplicate the same six fields.
Worth also keeping one read-only `ContentItem`-backed resource as a
cross-type overview/audit list — useful for "what's scheduled to publish
this week across every type," not useful for editing.

## Honest scope: this reworks what Phase 2 already built

This is not additive-only. Everything in the current PR that assumes the
single-table shape needs updating:

- `app/models/content_item.rb` — restructure around `delegated_type`
- Nine new concrete models + the `ContentRecord` concern (new migrations)
- `content_items` migration — drop type-specific columns
  (`link_url`, `external_ref`, ...), add `content_record_type`/`content_record_id`
- `app/avo/resources/content_item.rb` → split into nine (+ optional overview)
- `db/seeds.rb` — rewrite to create through concrete types
- `PortalsController`/views — query shape (`ContentItem.for_division(...).live.ordered`)
  is unaffected; rendering needs `item.content_record.link_url` instead of
  `item.link_url` for type-specific fields
- `spec/factories/content_items.rb`, `spec/models/content_item_spec.rb`,
  `spec/requests/portals_spec.rb` — all currently build bare `ContentItem`
  rows with no `content_record`, need updating
- `PublishScheduledContentJob`, `ContentItemPolicy` — untouched; both only
  ever touch the shared envelope fields

No data migration concern — per the framing decision already in
[`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md), this is a demo with no users;
the 17 seeded items just get reseeded through the new shape.

## Sequencing

Must land **before** Phase 4 (old Phase 3, "server-render the division
portals" — see the renumbered table in `EXECUTION_PLAN.md`), since that
phase builds portal rendering against the content model. Building it against
the current single-table shape and then redoing it after the split would be
wasted work. Good timing: Phase 4 hasn't started, so there's nothing to
unwind.

## Open questions

Same unresolved question already flagged in `EXECUTION_PLAN.md`'s
requirements-gathering section, sharpened by this plan: **what are the
actual fields each content type needs**, from the people who maintain these
pages — not inferred from the old schema. `TeamSpotlight` and `Newsletter`
in particular are underspecified above pending that answer.
