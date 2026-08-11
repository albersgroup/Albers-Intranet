require "rails_helper"

RSpec.describe ContentRecordPolicy do
  subject { described_class }

  let(:admin)      { build(:admin) }
  let(:corp_admin) { build(:division_admin, division: "corporate") }
  let(:viewer)      { build(:user, role: "viewer") }
  let(:corp_news)   { create(:content_item, division: "corporate").content_record }
  let(:defense_news) { create(:content_item, division: "defense").content_record }

  describe "update?" do
    it "lets an admin edit any division's content" do
      expect(subject.new(admin, defense_news).update?).to be true
    end

    it "lets a division admin edit only their own division's content" do
      expect(subject.new(corp_admin, corp_news).update?).to be true
      expect(subject.new(corp_admin, defense_news).update?).to be false
    end

    it "denies viewers" do
      expect(subject.new(viewer, corp_news).update?).to be false
    end
  end

  describe "Scope" do
    it "returns all records for an admin" do
      create(:content_item, division: "corporate")
      create(:content_item, division: "defense")
      expect(described_class::Scope.new(admin, News).resolve.count).to eq(2)
    end

    it "scopes a division admin to their division plus org-wide" do
      create(:content_item, division: "corporate")
      create(:content_item, division: nil)
      create(:content_item, division: "defense")
      resolved = described_class::Scope.new(create(:division_admin, division: "corporate"), News).resolve
      expect(resolved.map { |n| n.content_item.division }).to match_array([ "corporate", nil ])
    end
  end
end
