#!/bin/bash
set -e

echo "🚀 Setting up Property Manager..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd /workspaces/Property-Manager/backend
npm install

# Setup backend environment
if [ ! -f .env ]; then
    echo "📝 Creating backend .env file..."
    cp .env.example .env
    
    # Update CORS for Gitpod
    if [ -n "$GITPOD_WORKSPACE_URL" ]; then
        WORKSPACE_URL=$(echo $GITPOD_WORKSPACE_URL | sed 's|https://||')
        FRONTEND_URL="https://3000-${WORKSPACE_URL}"
        BACKEND_URL="https://4000-${WORKSPACE_URL}"
        
        sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=${FRONTEND_URL}|g" .env
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=${FRONTEND_URL},http://localhost:3000,http://localhost:5173|g" .env
        sed -i "s|REFRESH_COOKIE_SECURE=.*|REFRESH_COOKIE_SECURE=true|g" .env
    fi
fi

# Generate Prisma client and run migrations
echo "🗄️  Setting up database..."
npx prisma generate
npx prisma migrate deploy

# Seed database if empty
echo "🌱 Seeding database..."
npm run seed || echo "⚠️  Seeding skipped (may already be seeded)"

# Build backend
echo "🔨 Building backend..."
npm run build

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd /workspaces/Property-Manager/frontend
npm install

# Setup frontend environment
if [ ! -f .env.local ]; then
    echo "📝 Creating frontend .env.local file..."
    if [ -n "$GITPOD_WORKSPACE_URL" ]; then
        WORKSPACE_URL=$(echo $GITPOD_WORKSPACE_URL | sed 's|https://||')
        BACKEND_URL="https://4000-${WORKSPACE_URL}"
        echo "NEXT_PUBLIC_API_BASE=${BACKEND_URL}/api" > .env.local
        echo "MAX_UPLOAD_MB=10" >> .env.local
    else
        cp .env.example .env.local
        echo "NEXT_PUBLIC_API_BASE=http://localhost:4000/api" > .env.local
        echo "MAX_UPLOAD_MB=10" >> .env.local
    fi
fi

echo "✅ Setup complete!"
