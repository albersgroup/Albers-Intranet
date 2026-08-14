require "rails_helper"

# Regression cover for the "Role is not included in the list" / "Division is not
# included in the list" errors when promoting a user to admin in Avo.
#
# Two distinct bugs produced that screen:
#   1. The select fields declared options as {stored_value => label} (the
#      SelectFilter convention) instead of {label => stored_value}, so the
#      rendered <option value> was the humanized label and the form posted
#      "Admin" / "Division admin" rather than "admin" / "division_admin".
#   2. The "Org-wide" blank option posts "" rather than nil, which the
#      `inclusion ... allow_nil: true` validation rejected.
#
# These exercise the real Avo form round-trip, so they fail against either bug.
RSpec.describe "Avo user management", type: :request do
  let(:admin) { create(:admin) }

  before do
    post dev_login_path, params: { user_id: admin.id }
  end

  describe "the edit form's role options" do
    it "posts the stored role value, not the humanized label" do
      user = create(:user, role: "viewer")

      get "/avo/resources/users/#{user.id}/edit"
      expect(response).to have_http_status(:ok)

      User::ROLES.each do |role|
        expect(response.body).to include(%(value="#{role}"))
      end
      expect(response.body).not_to include(%(value="Division admin"))
    end

    it "renders the division options with their stored values" do
      user = create(:user, division: "advanced_programs")

      get "/avo/resources/users/#{user.id}/edit"

      User::DIVISIONS.each do |division|
        expect(response.body).to include(%(value="#{division}"))
      end
      expect(response.body).not_to include(%(value="Advanced programs"))
    end
  end

  describe "promoting a user to admin" do
    it "saves the role instead of failing inclusion validation" do
      user = create(:user, role: "viewer", division: "corporate")

      put "/avo/resources/users/#{user.id}",
          params: { user: { email: user.email, name: user.name, role: "admin", division: "" } }

      expect(user.reload.role).to eq("admin")
      expect(user.division).to be_nil
      expect(response.body).not_to include("is not included in the list")
    end

    it "keeps a division admin scoped to their division" do
      user = create(:user, role: "viewer")

      put "/avo/resources/users/#{user.id}",
          params: { user: { email: user.email, name: user.name,
                            role: "division_admin", division: "defense" } }

      user.reload
      expect(user.role).to eq("division_admin")
      expect(user.division).to eq("defense")
      expect(user).to be_division_admin
    end

    it "still rejects a role that is genuinely not a valid role" do
      user = create(:user, role: "viewer")

      put "/avo/resources/users/#{user.id}",
          params: { user: { email: user.email, name: user.name, role: "superuser" } }

      expect(user.reload.role).to eq("viewer")
    end
  end
end
