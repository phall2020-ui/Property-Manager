#!/bin/bash

echo "🛑 Stopping Property Manager services..."

# Stop backend
if pkill -f "nest start" 2>/dev/null; then
    echo "✅ Backend stopped"
else
    echo "ℹ️  Backend was not running"
fi

# Stop frontend
if pkill -f "next dev" 2>/dev/null; then
    echo "✅ Frontend stopped"
else
    echo "ℹ️  Frontend was not running"
fi

echo ""
echo "✅ All services stopped"
echo ""
echo "To start services again, run:"
echo "  bash .devcontainer/start-services.sh"
echo "  or"
echo "  ./restart-services.sh"
