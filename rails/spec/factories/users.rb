FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@albers.aero" }
    name { "Test User" }
    role { "viewer" }

    factory :admin,          traits: [ :admin ]
    factory :division_admin, traits: [ :division_admin ]

    trait :admin do
      role { "admin" }
      division { nil }
    end

    trait :division_admin do
      role { "division_admin" }
      division { "corporate" }
    end
  end
end
