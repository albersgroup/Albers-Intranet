class CreateTeamSpotlights < ActiveRecord::Migration[8.1]
  def change
    create_table :team_spotlights do |t|
      # Best-guess fields pending real stakeholder input (see
      # docs/CONTENT_MODEL_SPLIT_PLAN.md open questions).
      t.string :employee_name
      t.string :employee_role
      t.timestamps
    end
  end
end
