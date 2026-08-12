class AddTypeAndDepartmentToTeamSpotlights < ActiveRecord::Migration[8.1]
  def change
    add_column :team_spotlights, :spotlight_type, :string
    add_column :team_spotlights, :department, :string
  end
end
