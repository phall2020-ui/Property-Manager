#!/bin/bash
set -e

echo "🚀 Starting Property Manager in PRODUCTION mode..."
echo "   (Faster startup, no hot reload)"
echo ""

# Stop any existing services
pkill -f "nest start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 2

# Set production mode flag
export USE_PROD_MODE=true

# Start services
bash .devcontainer/start-services.sh
