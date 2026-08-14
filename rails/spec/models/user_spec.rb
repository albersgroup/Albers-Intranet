require "rails_helper"

RSpec.describe User do
  describe "validations" do
    it "requires a valid role and a valid division" do
      expect(build(:user, role: "bogus")).not_to be_valid
      expect(build(:user, division: "bogus")).not_to be_valid
      expect(build(:user, role: "admin", division: nil)).to be_valid # org-wide
    end

    # The admin UI's "Org-wide" choice is a blank <option>, which posts ""
    # rather than nil. Untreated, `allow_nil: true` rejects it, so an org-wide
    # admin can't be saved from Avo at all.
    it "treats a blank division as org-wide (nil)" do
      user = build(:user, role: "admin", division: "")
      expect(user).to be_valid
      expect(user.division).to be_nil
    end
  end

  describe "#can_edit_division?" do
    it "lets an org-wide admin edit any division" do
      admin = build(:admin)
      User::DIVISIONS.each { |d| expect(admin.can_edit_division?(d)).to be true }
    end

    it "scopes a division admin to their own division" do
      user = build(:division_admin) # corporate
      expect(user.can_edit_division?("corporate")).to be true
      expect(user.can_edit_division?("defense")).to be false
    end

    it "never lets a viewer edit" do
      viewer = build(:user, role: "viewer", division: "corporate")
      expect(viewer.can_edit_division?("corporate")).to be false
    end
  end
end
