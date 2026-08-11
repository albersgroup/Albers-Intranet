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
    create(:content_item, division: "corporate", section: "employee_resources", title: "GovDash",
           content_record: build(:quick_link, link_url: "https://dashboard.govdash.com"))

    get portal_path(division: "corporate")

    expect(response.body).to include('href="https://dashboard.govdash.com"')
  end

  it "renders section empty states when a division has no content" do
    get portal_path(division: "defense")

    expect(response.body).to include("No bulletins yet.")
    expect(response.body).to include("No news articles yet.")
    expect(response.body).to include("No newsletter available")
  end

  it "renders the code-level defaults on corporate with an empty database" do
    get portal_path(division: "corporate")

    expect(response.body).to include("2025-2027 Strategic Plan")
    expect(response.body).to include("Employee Resources")
    expect(response.body).to include("Maria Pichowsky")
  end

  it "renders BOU's tools and external systems cards" do
    get portal_path(division: "bou")

    expect(response.body).to include("BOU Tools")
    expect(response.body).to include("External Systems")
    expect(response.body).to include("BOU Bulletin Board")
  end

  it "overrides the default team spotlights with published TeamSpotlight items" do
    create(:content_item, division: "corporate", section: "team_spotlights", title: "Spotlight: Jordan Q",
           content_record: build(:team_spotlight, employee_name: "Jordan Quintero", employee_role: "Systems Engineer"))

    get portal_path(division: "corporate")

    expect(response.body).to include("Jordan Quintero")
    expect(response.body).not_to include("Maria Pichowsky")
  end
end
