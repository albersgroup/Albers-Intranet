class CreateNewsletters < ActiveRecord::Migration[8.1]
  def change
    create_table :newsletters do |t|
      # Only one current newsletter per division at a time (mirrors the old
      # Node app's behavior); enforced in ContentItem, see
      # SINGLETON_PER_DIVISION_TYPES.
      t.boolean :is_current, null: false, default: false
      t.timestamps
    end
  end
end
