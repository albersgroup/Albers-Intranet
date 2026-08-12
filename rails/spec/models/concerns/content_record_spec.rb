require "rails_helper"

RSpec.describe ContentRecord do
  describe "envelope writers on an already-persisted record" do
    it "persist through to content_item on save, not just in memory" do
      item = create(:content_item, content_record: build(:quick_link, link_url: "https://example.com"))
      quick_link = item.content_record

      quick_link.title = "Updated title"
      quick_link.save!

      expect(QuickLink.find(quick_link.id).content_item.title).to eq("Updated title")
    end
  end
end
