# Shared teardown + users for every seed profile.

puts "Clearing existing CMS data…"
PaperTrail::Version.delete_all
ActiveStorage::Attachment.where(record_type: %w[ContentItem MediaAsset News ContentBlock TeamSpotlight Bulletin Newsletter]).find_each(&:purge)
ActionText::RichText.delete_all
ContentItem.delete_all
# delete_all is a raw SQL DELETE — it doesn't trigger ContentItem's
# `dependent: :destroy`, so each concrete table needs clearing too.
[ News, QuickLink, HeroAsset, ContentBlock, TeamSpotlight, Newsletter, Bulletin, LinkedinPost, IndustryEvent ]
  .each(&:delete_all)
MediaAsset.delete_all
User.delete_all

puts "Seeding users…"
SEED_ADMIN = User.create!(email: "admin@albers.aero", name: "Alex Admin", role: "admin")
SEED_CORP_ADMIN = User.create!(email: "corporate.admin@albers.aero", name: "Casey Corporate", role: "division_admin", division: "corporate")
SEED_DEF_ADMIN = User.create!(email: "defense.admin@albers.aero", name: "Dana Defense", role: "division_admin", division: "defense")
User.create!(email: "viewer@albers.aero", name: "Vic Viewer", role: "viewer")
