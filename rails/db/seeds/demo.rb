# Demo profile: representative content across divisions and types. Section
# keys line up with Portal::Layout's registry (news, bulletins, newsletter,
# strategic_plan, team_spotlights, employee_resources, bd_tools, bou_tools,
# external_systems, hero) so everything seeded here actually renders on the
# portals, overriding the code-level defaults.
load Rails.root.join("db/seeds/reset.rb")

admin = SEED_ADMIN
corp_admin = SEED_CORP_ADMIN
def_admin = SEED_DEF_ADMIN

# -- A reusable SVG "image" (no image processor needed for SVG) --------------
def svg(label, color = "#51142a")
  <<~SVG
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420">
      <rect width="1200" height="420" fill="#{color}"/>
      <text x="60" y="230" fill="#ffffff" font-family="Segoe UI, sans-serif"
            font-size="64" font-weight="700">#{label}</text>
    </svg>
  SVG
end

def attach_svg(attachment, label, color = "#51142a")
  attachment.attach(
    io: StringIO.new(svg(label, color)),
    filename: "#{label.parameterize}.svg",
    content_type: "image/svg+xml"
  )
end

puts "Seeding media library…"
logo = MediaAsset.new(title: "Albers Wordmark", description: "Primary brand wordmark for reuse across portals.")
attach_svg(logo.file, "ALBERS")
logo.save!

# -- Content helper ------------------------------------------------------
# Each concrete type (News, QuickLink, ...) delegates the shared envelope
# fields (division, section, status, title, ...) onto its own content_item,
# so a plain `Model.create!(attrs)` handles both the envelope and the type's
# own fields (body, link_url, ...) in one call — see ContentRecord concern.
def content(model_class, hero: nil, **attrs)
  color = attrs[:division] == "defense" ? "#0E2841" : "#51142a"
  record = model_class.create!(attrs)
  attach_svg(record.image, hero, color) if hero
  record
end

puts "Seeding content items…"

# Corporate — the richest portal (mirrors the old CorporateHome composition)
content(HeroAsset, division: "corporate", section: "hero", status: "published",
        title: "Welcome to the Albers Aerospace Intranet",
        subtitle: "Tools, announcements and resources for every team.",
        author: corp_admin, hero: "Corporate")
content(News, division: "corporate", section: "news", status: "published",
        title: "FY26 Strategic Plan published", subtitle: "Read the priorities for the year ahead.",
        author: corp_admin, publish_at: 2.days.ago,
        body: "<p>The leadership team has published the <strong>FY26 strategic plan</strong>. Highlights include expanded defense programs and new industrial partnerships.</p>")
content(News, division: "corporate", section: "news", status: "published",
        title: "New 401(k) match effective July 1", subtitle: "Principal plan updates for all employees.",
        author: corp_admin, publish_at: 5.days.ago)
content(News, division: "corporate", section: "news", status: "scheduled",
        title: "All-hands meeting — agenda preview", subtitle: "Goes live the morning of the event.",
        author: corp_admin, publish_at: 1.day.from_now)
content(News, division: "corporate", section: "news", status: "draft",
        title: "DRAFT: Q3 town hall recap", subtitle: "Not yet published.", author: corp_admin)
content(ContentBlock, division: "corporate", section: "strategic_plan", status: "published",
        title: "2025-2027 Strategic Plan", subtitle: "People First - Mission Always",
        author: corp_admin, block_key: "strategic_plan",
        badges: %w[Innovation Excellence Dedication Stewardship],
        body: "<p>Operating and executing at the speed of relevance. Our strategic priorities focus on innovation, excellence, dedication, and stewardship.</p>")
content(TeamSpotlight, division: "corporate", section: "team_spotlights", status: "published",
        title: "Spotlight: Maria Pichowsky", author: corp_admin,
        employee_name: "Maria Pichowsky", employee_role: "Proposal Coordinator",
        department: "BOU", spotlight_type: "New Hire",
        body: "<p>Joined Albers in March and has contributed significantly in Business Intelligence and Proposal Coordination.</p>")
content(TeamSpotlight, division: "corporate", section: "team_spotlights", status: "published",
        title: "Spotlight: Ryan Flood", author: corp_admin,
        employee_name: "Ryan Flood", employee_role: "Proposal Manager",
        department: "BOU", spotlight_type: "Promotion",
        body: "<p>Promoted to Proposal Manager after leading several successful proposals in the BOU.</p>")

# Corporate link cards (Employee Resources / BD & Proposals) — CMS-editable
# QuickLink items in the sections the portal renders.
[
  [ "Unanet", "Time tracking & expense reporting", "calendar", "text-blue-600", "https://albers-aero.unanet.biz/albers-aero/action/login" ],
  [ "Rippling", "HR, payroll & benefits portal", "users", "text-emerald-600", "https://app.rippling.com/" ],
  [ "401k / Retirement", "Retirement savings & planning", "dollar-sign", "text-amber-600", "https://www.principal.com/" ],
  [ "Healthcare Portal", "Benefits & insurance information", "heart", "text-rose-600", "https://www.anthem.com/" ]
].each do |title, description, icon, color, url|
  content(QuickLink, division: "corporate", section: "employee_resources", status: "published",
          title: title, subtitle: description, icon: icon, icon_color: color,
          link_url: url, author: corp_admin)
end
[
  [ "SOPs & Processes", "Standard operating procedures", "book-open", "text-blue-600", "/sops" ],
  [ "Bid / No-Bid", "Opportunity evaluation framework", "clipboard-check", "text-amber-600", "/bid-no-bid" ],
  [ "Capture Questions", "Strategic capture guidance", "file-text", "text-purple-600", "/capture-questions" ]
].each do |title, description, icon, color, url|
  content(QuickLink, division: "corporate", section: "bd_tools", status: "published",
          title: title, subtitle: description, icon: icon, icon_color: color,
          link_url: url, author: corp_admin)
end

# Defense — hero + bulletins + news (mirrors DefenseHome)
content(HeroAsset, division: "defense", section: "hero", status: "published",
        title: "Defense Division", subtitle: "Programs, bulletins and resources.",
        author: def_admin, hero: "Defense")
content(Bulletin, division: "defense", section: "bulletins", status: "published",
        title: "Badge renewal deadline: Aug 31", subtitle: "Complete your annual security refresh.",
        author: def_admin, publish_at: 1.day.ago,
        body: "<p>All defense-division badges must be renewed by <strong>August 31</strong>. Schedule your refresh with Security.</p>")
content(News, division: "defense", section: "news", status: "published",
        title: "New task order awarded", subtitle: "Congratulations to the capture team.",
        author: def_admin, publish_at: 3.days.ago)

# Industrials + BOU — lighter portals
content(HeroAsset, division: "industrials", section: "hero", status: "published",
        title: "Industrials Division", author: admin, hero: "Industrials")
content(Bulletin, division: "industrials", section: "bulletins", status: "published",
        title: "Plant safety stand-down recap", author: admin, publish_at: 4.days.ago,
        body: "<p>Thanks to everyone who participated in this quarter's plant safety stand-down.</p>")
content(HeroAsset, division: "bou", section: "hero", status: "published",
        title: "Business Operations Unit", author: admin, hero: "BOU")
[
  [ "Business Intelligence Tool", "Business intelligence reports", "bar-chart-3", "text-blue-600", "/api/easy-bi-reports" ],
  [ "GovDash", "Government dashboard", "layout-dashboard", "text-emerald-600", "https://dashboard.govdash.com/login" ],
  [ "ClickUp", "Project management", "check-square", "text-purple-600", "https://app.clickup.com/login" ],
  [ "Salesforce", "CRM & pipeline management", "target", "text-amber-600", "https://albers.my.salesforce.com/" ]
].each do |title, description, icon, color, url|
  content(QuickLink, division: "bou", section: "external_systems", status: "published",
          title: title, subtitle: description, icon: icon, icon_color: color,
          link_url: url, author: admin)
end

# Org-wide (division nil) — surfaces on every portal
content(News, division: nil, section: "news", status: "published",
        title: "Company holiday: Independence Day", subtitle: "Offices closed July 4.",
        author: admin, publish_at: 6.days.ago)

puts "Seed complete: #{User.count} users, #{ContentItem.count} content items " \
     "(#{ContentItem.live.count} live), #{MediaAsset.count} media assets."
