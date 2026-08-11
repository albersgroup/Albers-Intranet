class CreateNews < ActiveRecord::Migration[8.1]
  def change
    create_table :news do |t|
      t.boolean :is_pinned, null: false, default: false
      t.timestamps
    end
  end
end
