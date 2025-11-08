#!/bin/bash
# Comprehensive test execution script for Property Manager
# Usage: ./run-tests.sh [frontend|backend|e2e|all|coverage]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}\n"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install missing dependencies
install_dependencies() {
    local dir=$1
    local deps=$2
    
    print_header "Installing dependencies in $dir"
    cd "$SCRIPT_DIR/$dir"
    
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found, running npm install..."
        npm install
    fi
    
    # Install specific dev dependencies if needed
    for dep in $deps; do
        if ! npm list "$dep" >/dev/null 2>&1; then
            print_warning "Installing $dep..."
            npm install --save-dev "$dep"
        fi
    done
    
    cd "$SCRIPT_DIR"
}

# Run frontend tests
run_frontend_tests() {
    print_header "Running Frontend Unit Tests"
    
    cd "$SCRIPT_DIR/frontend-new"
    
    # Install dependencies
    install_dependencies "frontend-new" "@vitest/coverage-v8"
    
    # Check if Playwright browsers are installed
    if ! npx playwright --version >/dev/null 2>&1; then
        print_warning "Playwright not found, installing browsers..."
        npx playwright install --with-deps || print_warning "Playwright install failed, continuing..."
    fi
    
    print_success "Running unit tests..."
    npm test || {
        print_error "Frontend unit tests failed"
        return 1
    }
    
    cd "$SCRIPT_DIR"
    print_success "Frontend unit tests passed"
}

# Run frontend coverage
run_frontend_coverage() {
    print_header "Running Frontend Tests with Coverage"
    
    cd "$SCRIPT_DIR/frontend-new"
    install_dependencies "frontend-new" "@vitest/coverage-v8"
    
    print_success "Running tests with coverage..."
    npm run test:coverage || {
        print_error "Frontend coverage tests failed"
        return 1
    }
    
    if [ -d "coverage" ]; then
        print_success "Coverage report generated at: frontend-new/coverage/index.html"
    fi
    
    cd "$SCRIPT_DIR"
}

# Run backend tests
run_backend_tests() {
    print_header "Running Backend Tests"
    
    cd "$SCRIPT_DIR/backend"
    
    # Install dependencies
    install_dependencies "backend" "jest-junit"
    
    # Generate Prisma client if needed
    if [ ! -d "node_modules/.prisma" ]; then
        print_warning "Generating Prisma client..."
        npx prisma generate || print_warning "Prisma generate failed, continuing..."
    fi
    
    print_success "Running backend tests..."
    npm test || {
        print_error "Backend tests failed"
        return 1
    }
    
    cd "$SCRIPT_DIR"
    print_success "Backend tests passed"
}

# Run backend coverage
run_backend_coverage() {
    print_header "Running Backend Tests with Coverage"
    
    cd "$SCRIPT_DIR/backend"
    install_dependencies "backend" "jest-junit"
    
    # Setup test database if using SQLite
    if [ -z "$DATABASE_URL" ] || [[ "$DATABASE_URL" == file:* ]]; then
        print_warning "Using SQLite for tests (default)"
    fi
    
    print_success "Running tests with coverage..."
    npm run test:coverage || {
        print_error "Backend coverage tests failed"
        return 1
    }
    
    if [ -d "coverage" ]; then
        print_success "Coverage report generated at: backend/coverage/index.html"
    fi
    
    cd "$SCRIPT_DIR"
}

# Run E2E tests
run_e2e_tests() {
    print_header "Running E2E Tests"
    
    print_warning "E2E tests require backend to be running"
    print_warning "The Playwright config will attempt to start servers automatically"
    
    cd "$SCRIPT_DIR/frontend-new"
    install_dependencies "frontend-new" "@vitest/coverage-v8"
    
    # Check if Playwright browsers are installed
    if ! npx playwright --version >/dev/null 2>&1; then
        print_warning "Installing Playwright browsers..."
        npx playwright install --with-deps
    fi
    
    # Build frontend first
    print_success "Building frontend..."
    npm run build || {
        print_error "Frontend build failed"
        return 1
    }
    
    print_success "Running E2E tests..."
    npm run test:e2e || {
        print_error "E2E tests failed"
        print_warning "Check test-results/ and playwright-report/ for details"
        return 1
    }
    
    if [ -d "playwright-report" ]; then
        print_success "E2E report generated at: frontend-new/playwright-report/index.html"
        print_warning "Run 'npx playwright show-report' to view"
    fi
    
    cd "$SCRIPT_DIR"
}

# Main execution
case "${1:-all}" in
    frontend)
        run_frontend_tests
        ;;
    backend)
        run_backend_tests
        ;;
    e2e)
        run_e2e_tests
        ;;
    coverage)
        print_header "Running All Tests with Coverage"
        run_frontend_coverage
        run_backend_coverage
        ;;
    all)
        print_header "Running All Tests"
        run_frontend_tests
        run_backend_tests
        print_warning "Skipping E2E tests (run './run-tests.sh e2e' separately)"
        ;;
    *)
        echo "Usage: $0 [frontend|backend|e2e|all|coverage]"
        echo ""
        echo "Commands:"
        echo "  frontend  - Run frontend unit tests"
        echo "  backend   - Run backend unit tests"
        echo "  e2e       - Run E2E tests (requires backend)"
        echo "  coverage  - Run all tests with coverage reports"
        echo "  all       - Run frontend and backend tests"
        exit 1
        ;;
esac

print_header "Test Execution Complete"
print_success "All requested tests completed successfully!"

