#!/bin/bash
# Runs once, on first creation of the db container's data volume.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
	CREATE DATABASE albers_intranet_development;
	CREATE DATABASE albers_cms_development;
	CREATE DATABASE albers_cms_test;
EOSQL
