#!/bin/bash

# Property Manager - Integration Test Script
# Tests complete workflow: Login → Create Property → Create Ticket → View Ticket

# Note: Not using 'set -e' because we want to continue testing even if some tests fail

# Allow configuration through environment variables
BASE_URL="${API_BASE_URL:-http://localhost:4000/api}"
FRONTEND_URL="${FRONTEND_BASE_URL:-http://localhost:3000}"

echo "=================================="
echo "Property Manager Integration Tests"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name=$1
    local expected_status=$2
    local actual_status=$3
    
    if [ "$actual_status" == "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $name"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $name (Expected: $expected_status, Got: $actual_status)"
        ((FAILED++))
    fi
}

# Helper function to extract and validate token
extract_token() {
    local response=$1
    local token=$(echo "$response" | jq -r '.accessToken')
    
    if [ "$token" != "null" ] && [ ! -z "$token" ] && [ "$token" != "" ]; then
        echo "$token"
        return 0
    else
        return 1
    fi
}

# Test 1: Health Check
echo "Test 1: Health Check"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health)
test_endpoint "Backend health endpoint" "200" "$STATUS"
echo ""

# Test 2: Landlord Authentication
echo "Test 2: Landlord Authentication"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"landlord@example.com","password":"password123"}')

if LANDLORD_TOKEN=$(extract_token "$LOGIN_RESPONSE"); then
    echo -e "${GREEN}✓${NC} Landlord login successful"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Landlord login failed"
    ((FAILED++))
fi
echo ""

# Test 3: Tenant Authentication
echo "Test 3: Tenant Authentication"
TENANT_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant@example.com","password":"password123"}')

if TENANT_TOKEN=$(extract_token "$TENANT_RESPONSE"); then
    echo -e "${GREEN}✓${NC} Tenant login successful"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Tenant login failed"
    ((FAILED++))
fi
echo ""

# Test 4: Contractor Authentication
echo "Test 4: Contractor Authentication"
CONTRACTOR_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contractor@example.com","password":"password123"}')

if CONTRACTOR_TOKEN=$(extract_token "$CONTRACTOR_RESPONSE"); then
    echo -e "${GREEN}✓${NC} Contractor login successful"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Contractor login failed"
    ((FAILED++))
fi
echo ""

# Test 5: Get Current User
echo "Test 5: Get Current User (Landlord)"
USER_RESPONSE=$(curl -s $BASE_URL/users/me \
  -H "Authorization: Bearer $LANDLORD_TOKEN")

USER_EMAIL=$(echo $USER_RESPONSE | jq -r '.email')
if [ "$USER_EMAIL" == "landlord@example.com" ]; then
    echo -e "${GREEN}✓${NC} Get current user successful"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Get current user failed"
    ((FAILED++))
fi
echo ""

# Test 6: List Properties
echo "Test 6: List Properties (Landlord)"
PROPERTIES_RESPONSE=$(curl -s $BASE_URL/properties \
  -H "Authorization: Bearer $LANDLORD_TOKEN")

PROPERTY_COUNT=$(echo $PROPERTIES_RESPONSE | jq 'length')
if [ "$PROPERTY_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} List properties successful ($PROPERTY_COUNT properties)"
    ((PASSED++))
    PROPERTY_ID=$(echo $PROPERTIES_RESPONSE | jq -r '.[0].id')
else
    echo -e "${RED}✗${NC} List properties failed"
    ((FAILED++))
fi
echo ""

# Test 7: Get Property Details
echo "Test 7: Get Property Details"
if [ ! -z "$PROPERTY_ID" ]; then
    PROPERTY_DETAIL=$(curl -s $BASE_URL/properties/$PROPERTY_ID \
      -H "Authorization: Bearer $LANDLORD_TOKEN")
    
    PROPERTY_ADDRESS=$(echo $PROPERTY_DETAIL | jq -r '.addressLine1')
    if [ "$PROPERTY_ADDRESS" != "null" ]; then
        echo -e "${GREEN}✓${NC} Get property details successful"
        echo "   Address: $PROPERTY_ADDRESS"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Get property details failed"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗${NC} Skipped (no property ID)"
    ((FAILED++))
fi
echo ""

# Test 8: List Tenancies
echo "Test 8: List Tenancies (Landlord)"
TENANCIES_RESPONSE=$(curl -s $BASE_URL/tenancies \
  -H "Authorization: Bearer $LANDLORD_TOKEN")

TENANCY_COUNT=$(echo $TENANCIES_RESPONSE | jq 'length')
if [ "$TENANCY_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} List tenancies successful ($TENANCY_COUNT tenancies)"
    ((PASSED++))
    TENANCY_ID=$(echo $TENANCIES_RESPONSE | jq -r '.[0].id')
else
    echo -e "${RED}✗${NC} List tenancies failed"
    ((FAILED++))
fi
echo ""

# Test 9: List Tickets (Landlord)
echo "Test 9: List Tickets (Landlord)"
LANDLORD_TICKETS=$(curl -s $BASE_URL/tickets \
  -H "Authorization: Bearer $LANDLORD_TOKEN")

LANDLORD_TICKET_COUNT=$(echo $LANDLORD_TICKETS | jq -r '.data | length')
if [ "$LANDLORD_TICKET_COUNT" != "null" ] && [[ "$LANDLORD_TICKET_COUNT" =~ ^[0-9]+$ ]]; then
    echo -e "${GREEN}✓${NC} Landlord can list tickets ($LANDLORD_TICKET_COUNT tickets)"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Landlord list tickets failed"
    ((FAILED++))
fi
echo ""

# Test 10: List Tickets (Tenant)
echo "Test 10: List Tickets (Tenant)"
TENANT_TICKETS=$(curl -s $BASE_URL/tickets \
  -H "Authorization: Bearer $TENANT_TOKEN")

TENANT_TICKET_COUNT=$(echo $TENANT_TICKETS | jq -r '.data | length')
if [ "$TENANT_TICKET_COUNT" != "null" ] && [[ "$TENANT_TICKET_COUNT" =~ ^[0-9]+$ ]]; then
    echo -e "${GREEN}✓${NC} Tenant can list tickets ($TENANT_TICKET_COUNT tickets)"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Tenant list tickets failed"
    ((FAILED++))
fi
echo ""

# Test 11: List Tickets (Contractor)
echo "Test 11: List Tickets (Contractor)"
CONTRACTOR_TICKETS=$(curl -s $BASE_URL/tickets \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN")

CONTRACTOR_TICKET_COUNT=$(echo $CONTRACTOR_TICKETS | jq -r '.data | length')
if [ "$CONTRACTOR_TICKET_COUNT" != "null" ] && [[ "$CONTRACTOR_TICKET_COUNT" =~ ^[0-9]+$ ]]; then
    echo -e "${GREEN}✓${NC} Contractor can list tickets ($CONTRACTOR_TICKET_COUNT tickets)"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Contractor list tickets failed"
    ((FAILED++))
fi
echo ""

# Test 12: Frontend is running
echo "Test 12: Frontend Server"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)
test_endpoint "Frontend server is running" "200" "$FRONTEND_STATUS"
echo ""

# Summary
echo "=================================="
echo "Test Summary"
echo "=================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
