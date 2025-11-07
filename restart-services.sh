#!/bin/bash
set -e

echo "🔄 Restarting Property Manager services..."

# Stop existing services
echo "🛑 Stopping existing services..."
pkill -f "nest start" 2>/dev/null || echo "   Backend was not running"
pkill -f "next dev" 2>/dev/null || echo "   Frontend was not running"

# Wait a moment for processes to fully stop
sleep 2

# Start services using the devcontainer script
echo "🚀 Starting services..."
bash .devcontainer/start-services.sh
