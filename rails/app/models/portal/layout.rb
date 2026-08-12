# frozen_string_literal: true

# Per-division portal composition, transcribed row-by-row from the Node app's
# hand-assembled React pages (CorporateHome.tsx, DefenseHome.tsx,
# IndustrialsHome.tsx, SpecialProjectsHome.tsx, BOUHome.tsx). The portals
# reproduce those pages pixel-for-pixel (gated by visual-diff/), so the
# Tailwind class strings and copy in here are verbatim — including the
# hardcoded defaults Node shows when a section has no database content.
#
# All class strings must stay full literals: config/tailwind.config.js scans
# this directory, and dynamically-built class names would be dropped from the
# build.
module Portal
  # A stat entry in the hero's bottom row. kind: :dot (colored bullet),
  # :icon (lucide icon + label), or :link (arrow icon + label wrapped in <a>).
  Stat = Data.define(:kind, :label, :css, :icon, :href) do
    def initialize(kind:, label:, css: nil, icon: nil, href: nil) = super
  end

  Hero = Data.define(:image, :gradient, :icon, :dot_css, :badge, :title, :subtitle, :description, :stats)

  # A row in a quick-links card (Employee Resources, BD & Proposals, BOU
  # Tools, External Systems). external: renders an <a target="_blank"> with an
  # external-link trailing icon spot; internal rows link in-app.
  LinkRow = Data.define(:title, :description, :icon, :color, :url, :external) do
    def initialize(title:, description:, icon:, color:, url:, external: false) = super
  end

  # key: the ContentItem.section bucket that overrides this section's defaults
  # (nil for purely static sections). partial: rendered from
  # app/views/portals/sections/. locals: static/default data for the partial.
  Section = Data.define(:key, :partial, :locals) do
    def initialize(key:, partial:, locals: {}) = super
  end

  # css nil => render the section bare (no wrapper element, Node renders the
  # component as a direct child); css "" => plain unclassed <div> wrapper
  # (Node's BOU renderSections wraps every cell in a bare <div>).
  Cell = Data.define(:css, :section) do
    def initialize(section:, css: nil) = super
  end

  # css nil => cells are emitted directly (no row wrapper element).
  Row = Data.define(:css, :cells) do
    def initialize(cells:, css: nil) = super
  end

  class Layout
    attr_reader :hero, :hero_cell_css, :rows

    def initialize(hero:, rows:, hero_cell_css: nil)
      @hero = hero
      @hero_cell_css = hero_cell_css
      @rows = rows
      freeze
    end

    def self.for(division) = DEFINITIONS.fetch(division)

    def self.section_keys(division)
      self.for(division).rows.flat_map { |r| r.cells.map { |c| c.section.key } }.compact
    end

    ICON_COLORS = %w[text-blue-600 text-emerald-600 text-purple-600 text-amber-600 text-rose-600 text-cyan-600].freeze

    NEWS_SECTION = lambda do |title:, limit:|
      Section.new(key: "news", partial: "latest_news", locals: { title: title, limit: limit })
    end

    BULLETINS_SECTION = lambda do |title:|
      Section.new(key: "bulletins", partial: "bulletins", locals: { title: title, limit: 5 })
    end

    NEWSLETTER_SECTION = Section.new(key: "newsletter", partial: "newsletter")
    LINKEDIN_SECTION = Section.new(key: "linkedin", partial: "linkedin")

    CORPORATE = new(
      hero: Hero.new(
        image: "portal/hero-corporate.png",
        gradient: "bg-gradient-to-br from-[#51142a]/85 via-[#3d1020]/80 to-[#0E2841]/85",
        icon: "sparkles",
        dot_css: "bg-emerald-400 border-[#51142a]",
        badge: "Mission Ready",
        title: "Welcome to the Albers Aerospace Intranet",
        subtitle: "Your single source of truth for tools, announcements, and resources",
        description: "Find the information you need quickly—from employee resources and company announcements to department-specific tools and templates. Spend less time searching and more time executing.",
        stats: [
          Stat.new(kind: :dot, css: "bg-emerald-400", label: "All Systems Operational"),
          Stat.new(kind: :icon, icon: "building-2", label: "4 Divisions"),
          Stat.new(kind: :icon, icon: "star", label: "Ask Albers Bot for help")
        ]
      ),
      rows: [
        Row.new(css: "grid lg:grid-cols-2 gap-6", cells: [
          Cell.new(section: NEWS_SECTION.call(title: "News Bulletin", limit: 3)),
          Cell.new(section: Section.new(key: "strategic_plan", partial: "content_block", locals: {
            image: "portal/strategic-plan.png",
            title: "2025-2027 Strategic Plan",
            subtitle: "People First - Mission Always",
            content: "Operating and executing at the speed of relevance. Our strategic priorities focus on innovation, excellence, dedication, and stewardship.",
            badges: %w[Innovation Excellence Dedication Stewardship]
          }))
        ]),
        Row.new(css: "grid lg:grid-cols-3 gap-6 items-stretch", cells: [
          Cell.new(css: "lg:col-span-2 flex", section: NEWSLETTER_SECTION),
          Cell.new(css: "flex", section: LINKEDIN_SECTION)
        ]),
        Row.new(css: "grid lg:grid-cols-3 gap-6 items-stretch", cells: [
          Cell.new(css: "", section: Section.new(key: "team_spotlights", partial: "team_spotlights", locals: {
            spotlights: [
              { spotlight_type: "New Hire", name: "Maria Pichowsky", role: "Proposal Coordinator",
                department: "BOU", image: "portal/spotlight-maria-pichowsky.png",
                context: "Joined Albers in March and has contributed significantly in Business Intelligence and Proposal Coordination." },
              { spotlight_type: "Promotion", name: "Ryan Flood", role: "Proposal Manager",
                department: "BOU", image: "portal/spotlight-ryan-flood.png",
                context: "Promoted to Proposal Manager after leading several successful proposals in the BOU." },
              { spotlight_type: "Achievement", name: "Innovation Team", role: "Q4 Contract Win",
                department: "Albers Innovation", image: nil,
                context: "Awarded Phase II of SBIR MOUS." }
            ]
          })),
          Cell.new(css: "", section: Section.new(key: "employee_resources", partial: "quick_links_card", locals: {
            title: "Employee Resources",
            description: "Quick access to HR, benefits, and administrative tools",
            header_icon: "users",
            card_css: "h-full flex flex-col",
            rows: [
              LinkRow.new(title: "Unanet", description: "Time tracking & expense reporting", icon: "calendar",
                          color: "text-blue-600", url: "https://albers-aero.unanet.biz/albers-aero/action/login", external: true),
              LinkRow.new(title: "Rippling", description: "HR, payroll & benefits portal", icon: "users",
                          color: "text-emerald-600", url: "https://app.rippling.com/", external: true),
              LinkRow.new(title: "401k / Retirement", description: "Retirement savings & planning", icon: "dollar-sign",
                          color: "text-amber-600", url: "https://www.principal.com/", external: true),
              LinkRow.new(title: "Healthcare Portal", description: "Benefits & insurance information", icon: "heart",
                          color: "text-rose-600", url: "https://www.anthem.com/", external: true)
            ]
          })),
          Cell.new(css: "", section: Section.new(key: "bd_tools", partial: "quick_links_card", locals: {
            title: "BD & Proposals",
            description: "Business development tools and capture resources",
            header_icon: "briefcase",
            card_css: "h-full flex flex-col",
            rows: [
              LinkRow.new(title: "SOPs & Processes", description: "Standard operating procedures", icon: "book-open",
                          color: "text-blue-600", url: "/sops"),
              LinkRow.new(title: "Bid / No-Bid", description: "Opportunity evaluation framework", icon: "clipboard-check",
                          color: "text-amber-600", url: "/bid-no-bid"),
              LinkRow.new(title: "Capture Questions", description: "Strategic capture guidance", icon: "file-text",
                          color: "text-purple-600", url: "/capture-questions")
            ],
            footer_button: { label: "Submit New Opportunity", icon: "file-text", url: "/new-opportunity" }
          }))
        ])
      ]
    )

    DEFENSE = new(
      hero: Hero.new(
        image: "portal/hero-defense.jpg",
        gradient: "bg-gradient-to-br from-[#1e3a5f]/90 via-[#0d2137]/85 to-[#51142a]/80",
        icon: "shield",
        dot_css: "bg-blue-400 border-[#1e3a5f]",
        badge: "Defense Division",
        title: "Albers Defense",
        subtitle: "Defense Division Portal",
        description: "Welcome to the Albers Defense division hub. Access defense-specific resources, news, and tools for our defense operations and programs.",
        stats: [
          Stat.new(kind: :dot, css: "bg-blue-400", label: "Defense Operations"),
          Stat.new(kind: :icon, icon: "building-2", label: "DoD Programs"),
          Stat.new(kind: :link, icon: "arrow-right", label: "Go to Corporate Portal", href: "/")
        ]
      ),
      rows: [
        Row.new(cells: [ Cell.new(section: BULLETINS_SECTION.call(title: "Defense Bulletins")) ]),
        Row.new(cells: [ Cell.new(section: NEWS_SECTION.call(title: "Defense News", limit: 3)) ]),
        Row.new(cells: [ Cell.new(section: NEWSLETTER_SECTION) ])
      ]
    )

    INDUSTRIALS = new(
      hero: Hero.new(
        image: "portal/hero-industrials.jpg",
        gradient: "bg-gradient-to-br from-[#78350f]/90 via-[#451a03]/85 to-[#51142a]/80",
        icon: "factory",
        dot_css: "bg-amber-400 border-[#78350f]",
        badge: "Industrial Division",
        title: "Albers Industrials",
        subtitle: "Industrial Division Portal",
        description: "Welcome to the Albers Industrials division hub. Access industrial-specific resources, news, and tools for our industrial operations and manufacturing programs.",
        stats: [
          Stat.new(kind: :dot, css: "bg-amber-400", label: "Manufacturing Operations"),
          Stat.new(kind: :icon, icon: "building-2", label: "Industrial Programs"),
          Stat.new(kind: :link, icon: "arrow-right", label: "Go to Corporate Portal", href: "/")
        ]
      ),
      rows: [
        Row.new(cells: [ Cell.new(section: BULLETINS_SECTION.call(title: "Industrials Bulletins")) ]),
        Row.new(cells: [ Cell.new(section: NEWS_SECTION.call(title: "Industrials News", limit: 3)) ]),
        Row.new(cells: [ Cell.new(section: NEWSLETTER_SECTION) ]),
        Row.new(cells: [ Cell.new(section: Section.new(key: nil, partial: "division_resources", locals: {
          header_icon_css: "text-amber-600",
          description: "Industrial-specific tools and documentation",
          glyph: "factory"
        })) ])
      ]
    )

    ADVANCED_PROGRAMS = new(
      hero: Hero.new(
        image: "portal/hero-advanced-programs.jpg",
        gradient: "bg-gradient-to-br from-[#581c87]/90 via-[#3b0764]/85 to-[#51142a]/80",
        icon: "rocket",
        dot_css: "bg-purple-400 border-[#581c87]",
        badge: "Advanced Programs",
        title: "Albers Advanced Programs",
        subtitle: "Advanced Programs Division Portal",
        description: "Welcome to the Albers Advanced Programs division hub. Access resources, news, and tools for our advanced programs and technology initiatives.",
        stats: [
          Stat.new(kind: :dot, css: "bg-purple-400", label: "Innovation Programs"),
          Stat.new(kind: :icon, icon: "sparkles", label: "Technology Initiatives"),
          Stat.new(kind: :link, icon: "arrow-right", label: "Go to Corporate Portal", href: "/")
        ]
      ),
      rows: [
        Row.new(cells: [ Cell.new(section: BULLETINS_SECTION.call(title: "Advanced Programs Bulletins")) ]),
        Row.new(cells: [ Cell.new(section: NEWS_SECTION.call(title: "Advanced Programs News", limit: 3)) ]),
        Row.new(cells: [ Cell.new(section: NEWSLETTER_SECTION) ]),
        Row.new(cells: [ Cell.new(section: Section.new(key: nil, partial: "division_resources", locals: {
          header_icon_css: "text-purple-600",
          description: "Advanced programs tools and documentation",
          glyph: "sparkles"
        })) ])
      ]
    )

    BOU = new(
      hero: Hero.new(
        image: "portal/hero-bou.png",
        gradient: "bg-gradient-to-br from-[#51142a]/75 via-[#3d1020]/70 to-[#0E2841]/70",
        icon: "presentation",
        dot_css: "bg-emerald-400 border-[#51142a]",
        badge: "Business Operations",
        title: "Business Operations Unit",
        subtitle: "Proposal Management & Business Development Hub",
        description: "Your central hub for proposal management, business development tools, and capture operations. Track proposal metrics, access training resources, and manage the full BD lifecycle.",
        stats: [
          Stat.new(kind: :dot, css: "bg-emerald-400", label: "Proposal Operations"),
          Stat.new(kind: :icon, icon: "trending-up", label: "Business Development"),
          Stat.new(kind: :link, icon: "arrow-right", label: "Go to Corporate Portal", href: "/")
        ]
      ),
      # BOUHome's renderSections wraps every section in a plain <div>, and the
      # hero (column_span 2) gets its own bare-div row before the paired rows.
      hero_cell_css: "",
      rows: [
        Row.new(css: "grid lg:grid-cols-2 gap-6", cells: [
          Cell.new(css: "", section: NEWS_SECTION.call(title: "BOU News & Updates", limit: 5)),
          Cell.new(css: "", section: NEWSLETTER_SECTION)
        ]),
        Row.new(css: "grid lg:grid-cols-2 gap-6", cells: [
          Cell.new(css: "", section: Section.new(key: nil, partial: "bou_board")),
          Cell.new(css: "", section: Section.new(key: "bou_tools", partial: "quick_links_card", locals: {
            title: "BOU Tools",
            description: "Proposal and capture management resources",
            header_icon: "clipboard-check",
            rows: [
              LinkRow.new(title: "New Opportunity Form", description: "Submit new business opportunities",
                          icon: "file-plus-2", color: "text-blue-600", url: "/new-opportunity"),
              LinkRow.new(title: "Capture Questions", description: "Strategic capture guidance",
                          icon: "file-text", color: "text-emerald-600", url: "/capture-questions")
            ]
          }))
        ]),
        Row.new(css: "grid lg:grid-cols-2 gap-6", cells: [
          Cell.new(css: "", section: Section.new(key: "external_systems", partial: "quick_links_card", locals: {
            title: "External Systems",
            description: "Quick access to external platforms",
            header_icon: "external-link",
            rows: [
              LinkRow.new(title: "Business Intelligence Tool", description: "Business intelligence reports",
                          icon: "bar-chart-3", color: "text-blue-600", url: "/api/easy-bi-reports", external: true),
              LinkRow.new(title: "GovDash", description: "Government dashboard",
                          icon: "layout-dashboard", color: "text-emerald-600", url: "https://dashboard.govdash.com/login", external: true),
              LinkRow.new(title: "ClickUp", description: "Project management",
                          icon: "check-square", color: "text-purple-600", url: "https://app.clickup.com/login", external: true),
              LinkRow.new(title: "Salesforce", description: "CRM & pipeline management",
                          icon: "target", color: "text-amber-600", url: "https://albers.my.salesforce.com/", external: true)
            ]
          }))
        ])
      ]
    )

    DEFINITIONS = {
      "corporate" => CORPORATE,
      "defense" => DEFENSE,
      "industrials" => INDUSTRIALS,
      "advanced_programs" => ADVANCED_PROGRAMS,
      "bou" => BOU
    }.freeze
  end
end
