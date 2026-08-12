require "rails_helper"

RSpec.describe ContentItemPolicy do
  subject { described_class }

  let(:admin)        { build(:admin) }
  let(:corp_admin)   { build(:division_admin, division: "corporate") }
  let(:viewer)       { build(:user, role: "viewer") }
  let(:corp_item)    { build(:content_item, division: "corporate") }
  let(:defense_item) { build(:content_item, division: "defense") }

  # The Avo resource backed by ContentItem itself is a read-only cross-type
  # overview now — editing happens on each type's own resource, authorized by
  # ContentRecordPolicy instead. See docs/CONTENT_MODEL_SPLIT_PLAN.md.
  describe "index?/show?" do
    it "lets staff (admin or division admin) view the overview" do
      expect(subject.new(admin, defense_item).index?).to be true
      expect(subject.new(corp_admin, corp_item).show?).to be true
    end

    it "denies viewers" do
      expect(subject.new(viewer, corp_item).index?).to be false
      expect(subject.new(viewer, corp_item).show?).to be false
    end
  end

  describe "update?/create?/destroy?" do
    it "is always false — this resource is read-only" do
      expect(subject.new(admin, defense_item).update?).to be false
      expect(subject.new(admin, defense_item).create?).to be false
      expect(subject.new(admin, defense_item).destroy?).to be false
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
