require "rails_helper"

RSpec.describe "Admin (Avo) access", type: :request do
  it "redirects anonymous users away from /avo to login" do
    get "/avo"
    expect(response).to redirect_to("/login")
  end

  it "lets an admin in after dev login" do
    admin = create(:admin)
    post dev_login_path, params: { user_id: admin.id }
    follow_redirect!

    get "/avo"
    expect(response).not_to redirect_to("/login")
    expect(response).to have_http_status(:ok).or have_http_status(:found)
  end

  it "keeps a plain viewer out of /avo" do
    viewer = create(:user, role: "viewer")
    post dev_login_path, params: { user_id: viewer.id }
    get "/avo"
    expect(response).to redirect_to("/login")
  end
end
