class CreateContentItems < ActiveRecord::Migration[8.1]
  def change
    create_table :content_items do |t|
      t.string  :division                        # nil = org-wide / cross-division
      t.string  :section,      null: false       # placement bucket on a portal
      t.string  :content_type, null: false       # news, quick_link, hero_asset, ...
      t.string  :title,        null: false
      t.string  :subtitle
      t.string  :link_url
      t.integer :position,     null: false, default: 0
      t.string  :status,       null: false, default: "draft"
      t.datetime :publish_at
      t.string :external_ref                    # e.g. LinkedIn post id
      t.references :author, foreign_key: { to_table: :users }, null: true
      t.references :media_asset, foreign_key: false, null: true

      t.timestamps
    end

    add_index :content_items, [ :division, :section, :position ]
    add_index :content_items, [ :content_type, :status ]
    add_index :content_items, :status
    add_index :content_items, :publish_at
  end
end
