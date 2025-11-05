#!/usr/bin/env bash
set -euo pipefail

echo "Resetting database..."
npx prisma migrate reset --force --skip-generate --schema=prisma/schema.prisma
echo "Running seeds..."
npm run seed