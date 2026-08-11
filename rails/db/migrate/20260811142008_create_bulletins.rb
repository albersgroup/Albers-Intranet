class CreateBulletins < ActiveRecord::Migration[8.1]
  def change
    create_table :bulletins do |t|
      t.boolean :is_pinned, null: false, default: false
      t.timestamps
    end
  end
end
