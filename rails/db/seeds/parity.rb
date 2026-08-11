# Visual-diff parity profile: users only, ZERO content items.
#
# The frozen baselines in visual-diff/baselines/ were captured against the
# Node app with an empty database — every dynamic section showed its empty
# state and every "default" (heroes, strategic plan, spotlights, link cards)
# came from hardcoded page code. The Rails portals mirror those defaults in
# Portal::Layout, so an empty content database reproduces the baseline state
# exactly. Do not add content here; seed the demo profile instead.
load Rails.root.join("db/seeds/reset.rb")

puts "Parity profile: no content items seeded " \
     "(#{User.count} users; portals render their code-level defaults)."
