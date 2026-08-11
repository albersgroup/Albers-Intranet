class CreateIndustryEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :industry_events do |t|
      t.date :start_date
      t.date :end_date
      t.string :location
      t.string :vertical
      t.timestamps
    end
  end
end
