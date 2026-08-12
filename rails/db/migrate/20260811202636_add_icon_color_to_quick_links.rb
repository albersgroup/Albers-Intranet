class AddIconColorToQuickLinks < ActiveRecord::Migration[8.1]
  def change
    add_column :quick_links, :icon_color, :string
  end
end
