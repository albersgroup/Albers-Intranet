FactoryBot.define do
  factory :content_item do
    sequence(:title) { |n| "Content #{n}" }
    section { "news" }
    division { "corporate" }
    status { "published" }
    publish_at { 1.day.ago }
    association :content_record, factory: :news

    trait :draft do
      status { "draft" }
      publish_at { nil }
    end

    trait :scheduled do
      status { "scheduled" }
      publish_at { 1.day.from_now }
    end

    trait :archived do
      status { "archived" }
    end
  end

  factory :news do
    body { "<p>Body copy.</p>" }
  end

  factory :quick_link do
    sequence(:link_url) { |n| "https://example.com/#{n}" }
  end

  factory :hero_asset do
    alt_text { "Hero image" }
  end

  factory :content_block do
    body { "<p>Block copy.</p>" }
  end

  factory :team_spotlight do
    body { "<p>Spotlight copy.</p>" }
    employee_name { "Jamie Rivera" }
    employee_role { "Propulsion Engineer" }
  end

  factory :newsletter do
    is_current { false }
  end

  factory :bulletin do
    body { "<p>Bulletin copy.</p>" }
  end

  factory :linkedin_post do
    sequence(:external_ref) { |n| "urn:li:activity:#{n}" }
  end

  factory :industry_event do
    start_date { 1.week.from_now.to_date }
    end_date { 1.week.from_now.to_date + 2.days }
    location { "Farnborough, UK" }
    vertical { "defense" }
  end

  factory :media_asset do
    sequence(:title) { |n| "Asset #{n}" }

    after(:build) do |asset|
      asset.file.attach(
        io: StringIO.new("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
        filename: "asset.svg",
        content_type: "image/svg+xml"
      )
    end
  end
end
