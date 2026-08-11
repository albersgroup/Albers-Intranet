# Seed dispatcher. Two profiles:
#
#   SEED_PROFILE=demo   (default) — representative content across divisions
#                       and types; what you want for demos and admin work.
#   SEED_PROFILE=parity — users only, zero content items. This is the state
#                         the visual-diff baselines were frozen in (the Node
#                         app rendered its hardcoded defaults against an empty
#                         database), so run this before `npm run compare`.
#
# Both are idempotent: they clear all CMS data first.
profile = ENV.fetch("SEED_PROFILE", "demo")
seed_file = Rails.root.join("db/seeds/#{profile}.rb")
abort "Unknown SEED_PROFILE #{profile.inspect} (expected demo or parity)" unless File.exist?(seed_file)
load seed_file
