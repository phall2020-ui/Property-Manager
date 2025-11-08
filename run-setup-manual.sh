#!/bin/bash
cd "$(dirname "$0")"
echo "🔧 Setting up test environment..."

# Backend setup
echo "📦 Setting up backend..."
cd backend

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'ENVEOF'
DATABASE_URL=file:./dev.db
NODE_ENV=development
JWT_ACCESS_SECRET=test-access-secret-change-in-production
JWT_REFRESH_SECRET=test-refresh-secret-change-in-production
PORT=4000
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
ENVEOF
fi

echo "✅ Backend .env ready"
echo ""
echo "📋 Next steps (run in your terminal with Node.js):"
echo ""
echo "cd backend"
echo "npm install"
echo "npx prisma generate"
echo "npx prisma migrate reset --force"
echo "npm run seed"
echo ""
echo "cd ../frontend-new"
echo "npm install"
echo "echo 'VITE_API_BASE_URL=http://localhost:4000/api' > .env.local"
echo ""
echo "✅ Setup script created!"
