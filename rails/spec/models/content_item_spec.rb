require "rails_helper"

RSpec.describe ContentItem do
  describe "validations" do
    it "requires a content_record, a valid status and a valid division" do
      expect(build(:content_item, content_record: nil)).not_to be_valid
      expect(build(:content_item, status: "bogus")).not_to be_valid
      expect(build(:content_item, division: "bogus")).not_to be_valid
      expect(build(:content_item, division: nil)).to be_valid # org-wide
    end

    it "requires publish_at when scheduled" do
      item = build(:content_item, status: "scheduled", publish_at: nil)
      expect(item).not_to be_valid
      expect(item.errors[:publish_at]).to be_present
    end
  end

  describe ".live" do
    it "includes published and due-scheduled, excludes drafts and future-scheduled" do
      published = create(:content_item)
      due       = create(:content_item, status: "scheduled", publish_at: 1.hour.ago)
      future    = create(:content_item, :scheduled)
      draft     = create(:content_item, :draft)

      expect(ContentItem.live).to include(published, due)
      expect(ContentItem.live).not_to include(future, draft)
    end
  end

  describe ".for_division" do
    it "includes the division's items and org-wide (nil) items" do
      corp = create(:content_item, division: "corporate")
      org  = create(:content_item, division: nil)
      defn = create(:content_item, division: "defense")

      expect(ContentItem.for_division("corporate")).to include(corp, org)
      expect(ContentItem.for_division("corporate")).not_to include(defn)
    end
  end

  describe "versioning + rollback (paper_trail)" do
    it "records versions and can roll back a title change" do
      item = create(:content_item, title: "Original")
      item.update!(title: "Changed")

      expect(item.versions.count).to be >= 2
      item.rollback_to!(item.versions.last.id)
      expect(item.reload.title).to eq("Original")
    end
  end

  describe "ordering (acts_as_list)" do
    it "assigns positions within a (division, section) scope" do
      a = create(:content_item, division: "corporate", section: "news")
      b = create(:content_item, division: "corporate", section: "news")
      expect([ a.position, b.reload.position ]).to eq([ 1, 2 ])
    end
  end

  describe "search (pg_search)" do
    it "matches on title" do
      match = create(:content_item, title: "Propulsion breakthrough")
      _miss = create(:content_item, title: "Payroll notice")
      expect(ContentItem.search("propulsion")).to include(match)
      expect(ContentItem.search("propulsion")).not_to include(_miss)
    end
  end

  describe "#publish!" do
    it "moves a draft to published" do
      item = create(:content_item, :draft)
      expect { item.publish! }.to change { item.reload.status }.from("draft").to("published")
      expect(item.publish_at).to be_present
    end
  end

  describe "delegated content_record" do
    it "exposes the concrete type via content_record_type and its ?-predicate" do
      item = create(:content_item, content_record: build(:quick_link, link_url: "https://example.com"))

      expect(item.content_record_type).to eq("QuickLink")
      expect(item.quick_link?).to be true
      expect(item.news?).to be false
      expect(item.content_record.link_url).to eq("https://example.com")
    end
  end

  describe "#enforce_singleton_per_division" do
    it "archives the previously-published hero asset in the same division when a new one publishes" do
      first  = create(:content_item, section: "hero", division: "corporate",
                       status: "published", content_record: build(:hero_asset))
      second = create(:content_item, section: "hero", division: "corporate",
                       status: "published", content_record: build(:hero_asset))

      expect(first.reload.status).to eq("archived")
      expect(second.reload.status).to eq("published")
    end

    it "does not affect hero assets in other divisions" do
      corp    = create(:content_item, section: "hero", division: "corporate",
                        status: "published", content_record: build(:hero_asset))
      defense = create(:content_item, section: "hero", division: "defense",
                        status: "published", content_record: build(:hero_asset))

      expect(corp.reload.status).to eq("published")
      expect(defense.reload.status).to eq("published")
    end
  end
end
