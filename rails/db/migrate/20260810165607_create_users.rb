class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :name
      t.string :division
      t.string :role, null: false, default: "viewer"
      t.string :entra_oid

      t.timestamps
    end
    add_index :users, :email, unique: true
    add_index :users, :entra_oid, unique: true
  end
end
