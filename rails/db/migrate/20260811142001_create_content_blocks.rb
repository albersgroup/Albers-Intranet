class CreateContentBlocks < ActiveRecord::Migration[8.1]
  def change
    create_table :content_blocks do |t|
      # Optional stable key for named singleton blocks (e.g. the old
      # "strategic_plan" block) that a view can look up directly rather than
      # going through a division/section placement.
      t.string :block_key
      t.timestamps
    end

    add_index :content_blocks, :block_key, unique: true
  end
end
