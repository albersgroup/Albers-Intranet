class RestructureContentItemsForDelegatedTypes < ActiveRecord::Migration[8.1]
  def change
    # `content_type` becomes the delegated_type discriminator; `link_url` and
    # `external_ref` move to the concrete types that actually have them
    # (QuickLink, LinkedinPost). `body` (has_rich_text) moves off ContentItem
    # entirely — only some concrete types have a body, so it's no longer
    # universal. No data migration: demo app, no users, seeds are rewritten
    # to create through the new concrete models instead.
    remove_column :content_items, :content_type, :string
    remove_column :content_items, :link_url, :string
    remove_column :content_items, :external_ref, :string

    add_reference :content_items, :content_record, polymorphic: true, index: false
    add_index :content_items, [ :content_record_type, :content_record_id ], unique: true
  end
end
