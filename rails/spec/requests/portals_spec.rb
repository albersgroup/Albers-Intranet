require "rails_helper"

RSpec.describe "Portals", type: :request do
  it "renders published content for a division and hides drafts" do
    create(:content_item, division: "corporate", title: "Published headline")
    create(:content_item, :draft, division: "corporate", title: "Secret draft")

    get portal_path(division: "corporate")

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Published headline")
    expect(response.body).not_to include("Secret draft")
  end

  it "surfaces org-wide content on every division portal" do
    create(:content_item, division: nil, title: "Company-wide notice")
    get portal_path(division: "defense")
    expect(response.body).to include("Company-wide notice")
  end

  it "supports full-text search" do
    create(:content_item, division: "corporate", title: "Propulsion milestone")
    get portal_path(division: "corporate", q: "propulsion")
    expect(response.body).to include("Propulsion milestone")
  end

  it "renders the hero asset separately from the sectioned content" do
    create(:content_item, division: "corporate", section: "hero", title: "Corporate Hero",
           content_record: build(:hero_asset))
    create(:content_item, division: "corporate", section: "news", title: "Regular news item")

    get portal_path(division: "corporate")

    expect(response.body).to include("Corporate Hero")
    expect(response.body).to include("Regular news item")
  end

  it "links a quick link's title to its content_record's link_url" do
    create(:content_item, division: "corporate", section: "quick_links", title: "GovDash",
           content_record: build(:quick_link, link_url: "https://dashboard.govdash.com"))

    get portal_path(division: "corporate")

    expect(response.body).to include('href="https://dashboard.govdash.com"')
  end
end
