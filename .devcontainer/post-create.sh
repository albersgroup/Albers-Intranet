#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Node reads DATABASE_URL/PORT from .env (not docker-compose environment —
# see the comment in docker-compose.yml for why those can't be container-wide
# here). Pinned to container-appropriate values every time postCreate runs,
# since .env is gitignored/local-only and these are non-secret dev defaults;
# only DATABASE_URL's host differs from a host-native checkout ("db" here vs.
# "localhost" outside the container).
cat > .env <<-'EOF'
	DATABASE_URL=postgresql://albers:albers@db:5432/albers_intranet_development
	SESSION_SECRET=local-dev-session-secret-not-for-production
	SMTP_HOST=localhost
	SMTP_PORT=587
	SMTP_USER=dev@albers.aero
	SMTP_PASS=devpassword
	SMTP_FROM=dev@albers.aero
	NODE_ENV=development
	PORT=5050
	BASE_URL=http://localhost:5050
	STORAGE_DIR=./storage-dev
EOF

mise trust .mise.toml
mise install
npm install

mise trust rails/.mise.toml
# foreman is required by bin/dev but intentionally absent from the Gemfile
# (Rails convention: bin/dev installs it on demand). That on-demand install
# doesn't work under mise, since binaries from `gem install` aren't on PATH
# until `mise reshim` runs — so install and reshim it here instead.
(cd rails && mise install && bundle install && gem install foreman && mise reshim)

echo ""
echo "Setup complete."
echo "  Node app:  npm run dev              (http://localhost:5050)"
echo "  Rails app: cd rails && bin/dev      (http://localhost:3000)"
