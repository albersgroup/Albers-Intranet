class CreateQuickLinks < ActiveRecord::Migration[8.1]
  def change
    create_table :quick_links do |t|
      t.string :link_url, null: false
      t.string :icon
      t.timestamps
    end
  end
end
