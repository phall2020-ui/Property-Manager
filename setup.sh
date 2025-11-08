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

# Ask for database preference
echo ""
echo "Which database do you want to use?"
echo "  1) SQLite (recommended for development, no Docker required)"
echo "  2) PostgreSQL (production-like, requires Docker)"
read -p "Enter choice (1 or 2): " -n 1 -r
echo

USE_SQLITE=true
if [[ $REPLY == "2" ]]; then
    USE_SQLITE=false
fi

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"

# Setup environment file
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
fi

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"

if [ "$USE_SQLITE" = false ]; then
    # Start Docker services for PostgreSQL
    echo ""
    echo "🐳 Starting PostgreSQL and Redis with Docker Compose..."
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker or use SQLite instead."
        exit 1
    fi
    docker compose up -d
    echo "✅ Docker services started"
    
    # Wait for PostgreSQL to be ready
    echo ""
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
    
    # Update .env to use PostgreSQL
    if grep -q "DATABASE_URL=file:" .env; then
        echo "📝 Updating .env to use PostgreSQL..."
        sed -i.bak 's|DATABASE_URL=file:./dev.db|DATABASE_URL=postgresql://postgres:postgres@localhost:5432/property_management|' .env
        rm -f .env.bak
    fi
else
    echo ""
    echo "📝 Using SQLite database (file:./dev.db)"
fi

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

# Install frontend-new dependencies
echo ""
echo "📦 Installing frontend dependencies (frontend-new)..."
cd ../frontend-new
npm install
echo "✅ Frontend dependencies installed"

echo ""
echo "✅ Setup complete!"
echo ""
if [ "$USE_SQLITE" = true ]; then
    echo "📊 Database: SQLite (file: backend/dev.db)"
else
    echo "📊 Database: PostgreSQL (Docker container)"
    echo "   Redis: Available at redis://localhost:6379"
fi
echo ""
echo "To start the application:"
echo "  1. Backend:  cd backend && npm run dev"
echo "  2. Frontend: cd frontend-new && npm run dev"
echo ""
echo "Backend will run on:  http://localhost:4000"
echo "Frontend will run on: http://localhost:5173"
echo "API docs available at: http://localhost:4000/api/docs"
echo ""
echo "Test credentials:"
echo "  landlord@example.com / password123 (LANDLORD)"
echo "  tenant@example.com / password123 (TENANT)"
echo "  contractor@example.com / password123 (CONTRACTOR)"
echo "  ops@example.com / password123 (OPS)"
