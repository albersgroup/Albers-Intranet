module ContentRecord
  extend ActiveSupport::Concern

  # Fields that live on the shared ContentItem envelope (placement, lifecycle,
  # reusable media) — delegated onto each concrete type so its own Avo
  # resource can read and write them directly without every type repeating
  # the same mapping. Type-specific fields (body, link_url, ...) stay native
  # to each concrete model.
  ENVELOPE_READERS = %i[
    title subtitle division section position status publish_at
    author_id media_asset_id image live?
  ].freeze
  ENVELOPE_WRITERS = %i[
    title= subtitle= division= section= position= status= publish_at=
    author= author_id= media_asset= media_asset_id= image=
  ].freeze

  included do
    # autosave: true is required, not just the has_one default — without it,
    # Rails only auto-saves this association when it's newly built; changes
    # made to an already-persisted content_item (e.g. quick_link.title = "…")
    # via content_item_for_write would silently be lost on quick_link.save!.
    has_one :content_item, as: :content_record, touch: true, autosave: true
    has_paper_trail

    # Real (if read-mostly) associations, purely so Avo's `as: :belongs_to`
    # field can introspect them via reflect_on_association — author and
    # media_asset actually live on content_item, not this table. Their
    # writers are overridden below (ENVELOPE_WRITERS) to go through
    # content_item_for_write instead, since has_one-through can't create a
    # not-yet-existing content_item on a brand-new record.
    has_one :author, through: :content_item
    has_one :media_asset, through: :content_item

    delegate(*ENVELOPE_READERS, to: :content_item, allow_nil: true)
    delegate(*ENVELOPE_WRITERS, to: :content_item_for_write)
  end

  # `content_item` (a has_one) doesn't exist yet on a brand-new record being
  # built through Avo/seeds — this guarantees a writable target either way.
  # ContentItem is a delegated_type owner (its content_record_id points at
  # this row), so it's only actually persisted once this record has an id;
  # Rails' has_one autosave handles that ordering on save.
  def content_item_for_write
    content_item || build_content_item
  end

  # Overridden by types with an explicit "current" flag (Newsletter). Default
  # is "publishing this is enough to make it the active one" (HeroAsset).
  def active_for_singleton?
    true
  end
end
