# Representative seed data for the unified CMS. Fresh data — there is no legacy
# database to migrate (the old intranet is a demo with no users). Idempotent:
# safe to run repeatedly.

puts "Clearing existing CMS data…"
PaperTrail::Version.delete_all
ActiveStorage::Attachment.where(record_type: %w[ContentItem MediaAsset]).find_each(&:purge)
ContentItem.delete_all
MediaAsset.delete_all
User.delete_all

# -- Users -------------------------------------------------------------------
puts "Seeding users…"
admin = User.create!(email: "admin@albers.aero", name: "Alex Admin", role: "admin")
corp_admin = User.create!(email: "corporate.admin@albers.aero", name: "Casey Corporate", role: "division_admin", division: "corporate")
def_admin = User.create!(email: "defense.admin@albers.aero", name: "Dana Defense", role: "division_admin", division: "defense")
User.create!(email: "viewer@albers.aero", name: "Vic Viewer", role: "viewer")

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

# -- Content helper ----------------------------------------------------------
def item(attrs)
  body = attrs.delete(:body)
  hero_label = attrs.delete(:hero)
  color = attrs[:division] == "defense" ? "#0E2841" : "#51142a"
  ci = ContentItem.new(attrs)
  ci.body = body if body
  ci.save!
  attach_svg(ci.image, hero_label, color) if hero_label
  ci
end

puts "Seeding content items…"

# Corporate — the richest portal (mirrors the old CorporateHome composition)
item(division: "corporate", section: "hero", content_type: "hero_asset", status: "published",
     title: "Welcome to the Albers Aerospace Intranet",
     subtitle: "Tools, announcements and resources for every team.",
     author: corp_admin, hero: "Corporate")
item(division: "corporate", section: "news", content_type: "news", status: "published",
     title: "FY26 Strategic Plan published", subtitle: "Read the priorities for the year ahead.",
     author: corp_admin, publish_at: 2.days.ago,
     body: "<p>The leadership team has published the <strong>FY26 strategic plan</strong>. Highlights include expanded defense programs and new industrial partnerships.</p>")
item(division: "corporate", section: "news", content_type: "news", status: "published",
     title: "New 401(k) match effective July 1", subtitle: "Principal plan updates for all employees.",
     author: corp_admin, publish_at: 5.days.ago)
item(division: "corporate", section: "news", content_type: "news", status: "scheduled",
     title: "All-hands meeting — agenda preview", subtitle: "Goes live the morning of the event.",
     author: corp_admin, publish_at: 1.day.from_now)
item(division: "corporate", section: "news", content_type: "news", status: "draft",
     title: "DRAFT: Q3 town hall recap", subtitle: "Not yet published.", author: corp_admin)
item(division: "corporate", section: "quick_links", content_type: "quick_link", status: "published",
     title: "Unanet (Timekeeping)", link_url: "https://albers-aero.unanet.biz", author: corp_admin)
item(division: "corporate", section: "quick_links", content_type: "quick_link", status: "published",
     title: "Rippling (HR & Payroll)", link_url: "https://app.rippling.com", author: corp_admin)
item(division: "corporate", section: "spotlights", content_type: "team_spotlight", status: "published",
     title: "Spotlight: Propulsion Test Team", subtitle: "Completed 100 consecutive hot-fire tests.",
     author: corp_admin, media_asset: logo)
item(division: "corporate", section: "content_blocks", content_type: "content_block", status: "published",
     title: "Our Mission", author: corp_admin,
     body: "<p>Albers Aerospace delivers mission-critical capabilities across defense and industrial markets. This block is fully editable in the CMS — draft, preview, version, and publish.</p>")

# Defense — hero + bulletins + news (mirrors DefenseHome)
item(division: "defense", section: "hero", content_type: "hero_asset", status: "published",
     title: "Defense Division", subtitle: "Programs, bulletins and resources.",
     author: def_admin, hero: "Defense")
item(division: "defense", section: "bulletins", content_type: "bulletin", status: "published",
     title: "Badge renewal deadline: Aug 31", subtitle: "Complete your annual security refresh.",
     author: def_admin, publish_at: 1.day.ago)
item(division: "defense", section: "news", content_type: "news", status: "published",
     title: "New task order awarded", subtitle: "Congratulations to the capture team.",
     author: def_admin, publish_at: 3.days.ago)

# Industrials + BOU — lighter portals
item(division: "industrials", section: "hero", content_type: "hero_asset", status: "published",
     title: "Industrials Division", author: admin, hero: "Industrials")
item(division: "industrials", section: "bulletins", content_type: "bulletin", status: "published",
     title: "Plant safety stand-down recap", author: admin, publish_at: 4.days.ago)
item(division: "bou", section: "hero", content_type: "hero_asset", status: "published",
     title: "Business Operations Unit", author: admin, hero: "BOU")
item(division: "bou", section: "quick_links", content_type: "quick_link", status: "published",
     title: "GovDash", link_url: "https://dashboard.govdash.com", author: admin)

# Org-wide (division nil) — surfaces on every portal
item(division: nil, section: "news", content_type: "news", status: "published",
     title: "Company holiday: Independence Day", subtitle: "Offices closed July 4.",
     author: admin, publish_at: 6.days.ago)

puts "Seed complete: #{User.count} users, #{ContentItem.count} content items " \
     "(#{ContentItem.live.count} live), #{MediaAsset.count} media assets."
