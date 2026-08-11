class CreateLinkedinPosts < ActiveRecord::Migration[8.1]
  def change
    create_table :linkedin_posts do |t|
      t.string :external_ref # LinkedIn post permalink/id
      t.timestamps
    end
  end
end
