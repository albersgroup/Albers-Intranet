class CreateHeroAssets < ActiveRecord::Migration[8.1]
  def change
    create_table :hero_assets do |t|
      t.string :alt_text
      t.timestamps
    end
  end
end
