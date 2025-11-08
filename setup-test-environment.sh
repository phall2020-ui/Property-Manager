#!/bin/bash
# Setup Test Environment for Property Manager
# This script creates a clean test environment with all user types and seed data

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Setup backend
setup_backend() {
    print_header "Setting Up Backend"
    
    cd "$SCRIPT_DIR/backend"
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found, creating from .env.example if available"
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env from .env.example"
        else
            print_warning "No .env.example found, using defaults"
            cat > .env << EOF
DATABASE_URL=file:./test.db
NODE_ENV=development
JWT_ACCESS_SECRET=test-access-secret-change-in-production
JWT_REFRESH_SECRET=test-refresh-secret-change-in-production
PORT=4000
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
EOF
            print_success "Created default .env file"
        fi
    fi
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_info "Installing backend dependencies..."
        npm install
    else
        print_info "Backend dependencies already installed"
    fi
    
    # Generate Prisma client
    print_info "Generating Prisma client..."
    npx prisma generate || print_warning "Prisma generate failed, continuing..."
    
    # Reset database (clean slate)
    print_info "Resetting database..."
    npx prisma migrate reset --force --skip-generate || {
        print_warning "Migration reset failed, trying migrate deploy..."
        npx prisma migrate deploy || print_error "Migration failed"
    }
    
    # Seed database
    print_info "Seeding database with test data..."
    npm run seed || {
        print_error "Seeding failed"
        exit 1
    }
    
    print_success "Backend setup complete"
    cd "$SCRIPT_DIR"
}

# Setup frontend
setup_frontend() {
    print_header "Setting Up Frontend"
    
    cd "$SCRIPT_DIR/frontend-new"
    
    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        print_info "Creating .env.local..."
        cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:4000/api
EOF
        print_success "Created .env.local"
    fi
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm install
    else
        print_info "Frontend dependencies already installed"
    fi
    
    print_success "Frontend setup complete"
    cd "$SCRIPT_DIR"
}

# Display test credentials
display_credentials() {
    print_header "Test Environment Ready!"
    
    echo -e "${BLUE}📋 TEST CREDENTIALS${NC}\n"
    
    echo -e "${GREEN}🏢 LANDLORD:${NC}"
    echo -e "   Email:    ${YELLOW}landlord@example.com${NC}"
    echo -e "   Password: ${YELLOW}password123${NC}"
    echo -e "   Access:   Properties, Tenancies, Approve Quotes, Finance\n"
    
    echo -e "${GREEN}👤 TENANT:${NC}"
    echo -e "   Email:    ${YELLOW}tenant@example.com${NC}"
    echo -e "   Password: ${YELLOW}password123${NC}"
    echo -e "   Access:   Report Issues, View Tickets, View Tenancy\n"
    
    echo -e "${GREEN}🔧 CONTRACTOR:${NC}"
    echo -e "   Email:    ${YELLOW}contractor@example.com${NC}"
    echo -e "   Password: ${YELLOW}password123${NC}"
    echo -e "   Access:   View Jobs, Submit Quotes, Update Status\n"
    
    echo -e "${GREEN}⚙️  OPS:${NC}"
    echo -e "   Email:    ${YELLOW}ops@example.com${NC}"
    echo -e "   Password: ${YELLOW}password123${NC}"
    echo -e "   Access:   Manage Queue, Assign Tickets, View Analytics\n"
    
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

# Display URLs
display_urls() {
    print_header "Application URLs"
    
    echo -e "${GREEN}Frontend:${NC}  http://localhost:5173"
    echo -e "${GREEN}Backend:${NC}   http://localhost:4000/api"
    echo -e "${GREEN}API Docs:${NC}  http://localhost:4000/api/docs"
    echo -e "${GREEN}Health:${NC}    http://localhost:4000/api/health\n"
}

# Display next steps
display_next_steps() {
    print_header "Next Steps"
    
    echo -e "${YELLOW}1. Start Backend:${NC}"
    echo -e "   ${BLUE}cd backend && npm run dev${NC}\n"
    
    echo -e "${YELLOW}2. Start Frontend:${NC}"
    echo -e "   ${BLUE}cd frontend-new && npm run dev${NC}\n"
    
    echo -e "${YELLOW}3. Login with any test user:${NC}"
    echo -e "   ${BLUE}Use the credentials shown above${NC}\n"
    
    echo -e "${YELLOW}4. Run Tests:${NC}"
    echo -e "   ${BLUE}./run-tests.sh all${NC}\n"
    
    echo -e "${YELLOW}5. Reset Database (if needed):${NC}"
    echo -e "   ${BLUE}cd backend && npm run seed${NC}\n"
}

# Main execution
main() {
    print_header "Property Manager - Test Environment Setup"
    
    check_prerequisites
    setup_backend
    setup_frontend
    display_credentials
    display_urls
    display_next_steps
    
    print_success "Test environment setup complete!"
    print_info "You can now start the servers and begin testing."
}

# Run main function
main

