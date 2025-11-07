#!/bin/bash
set -e

echo "🚀 Property Management Platform - Setup Script"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20 or later."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"

# Start Docker services
echo ""
echo "🐳 Starting PostgreSQL and Redis with Docker Compose..."
docker compose up -d
echo "✅ Docker services started"

# Wait for PostgreSQL to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
npx prisma migrate deploy
echo "✅ Database migrations completed"

# Seed database (optional)
echo ""
read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run seed
    echo "✅ Database seeded"
fi

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
echo "✅ Frontend dependencies installed"

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  1. Backend:  cd backend && npm run dev"
echo "  2. Frontend: cd frontend && npm run dev"
echo ""
echo "Backend will run on:  http://localhost:4000"
echo "Frontend will run on: http://localhost:5173"
echo "API docs available at: http://localhost:4000/api/docs"
