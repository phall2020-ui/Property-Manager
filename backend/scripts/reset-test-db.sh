#!/bin/bash
# Quick script to reset test database and reseed
# Usage: ./scripts/reset-test-db.sh

set -e

cd "$(dirname "$0")/.."

echo "🔄 Resetting test database..."
npx prisma migrate reset --force --skip-generate

echo "🌱 Seeding database..."
npm run seed

echo "✅ Database reset complete!"

