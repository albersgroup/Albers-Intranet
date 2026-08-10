require "rails_helper"

RSpec.describe ContentItemPolicy do
  subject { described_class }

  let(:admin)        { build(:admin) }
  let(:corp_admin)   { build(:division_admin, division: "corporate") }
  let(:viewer)       { build(:user, role: "viewer") }
  let(:corp_item)    { build(:content_item, division: "corporate") }
  let(:defense_item) { build(:content_item, division: "defense") }

  describe "update?" do
    it "lets an admin edit any division" do
      expect(subject.new(admin, defense_item).update?).to be true
    end

    it "lets a division admin edit only their own division" do
      expect(subject.new(corp_admin, corp_item).update?).to be true
      expect(subject.new(corp_admin, defense_item).update?).to be false
    end

    it "denies viewers" do
      expect(subject.new(viewer, corp_item).update?).to be false
    end
  end

  describe "Scope" do
    it "returns all items for an admin" do
      create(:content_item, division: "corporate")
      create(:content_item, division: "defense")
      expect(described_class::Scope.new(create(:admin), ContentItem).resolve.count).to eq(2)
    end

    it "scopes a division admin to their division plus org-wide" do
      create(:content_item, division: "corporate")
      create(:content_item, division: nil)
      create(:content_item, division: "defense")
      resolved = described_class::Scope.new(create(:division_admin, division: "corporate"), ContentItem).resolve
      expect(resolved.pluck(:division)).to match_array([ "corporate", nil ])
    end
  end
end
