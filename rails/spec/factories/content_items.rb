FactoryBot.define do
  factory :content_item do
    sequence(:title) { |n| "Content #{n}" }
    section { "news" }
    content_type { "news" }
    division { "corporate" }
    status { "published" }
    publish_at { 1.day.ago }

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
