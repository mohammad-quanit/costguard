#!/bin/bash

# CostGuard API Testing Script
# This script tests all API endpoints with sample data

set -e  # Exit on any error

# Configuration
BASE_URL="https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev"
TEST_EMAIL="api-test-$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"
TEST_FIRST_NAME="API"
TEST_LAST_NAME="Tester"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

run_test() {
    local test_name="$1"
    local command="$2"
    local expected_status="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    print_info "Testing: $test_name"
    
    # Run the command and capture response
    response=$(eval "$command" 2>/dev/null)
    status_code=$(echo "$response" | tail -n1)
    
    if [[ "$status_code" == "$expected_status" ]]; then
        print_success "$test_name - Status: $status_code"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_error "$test_name - Expected: $expected_status, Got: $status_code"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Start testing
print_header "CostGuard API Testing Script"
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Test 1: User Registration
print_header "Authentication Tests"

print_info "1. Testing User Registration"
SIGNUP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"firstName\": \"$TEST_FIRST_NAME\",
        \"lastName\": \"$TEST_LAST_NAME\"
    }")

SIGNUP_STATUS=$(echo "$SIGNUP_RESPONSE" | tail -n1)
SIGNUP_BODY=$(echo "$SIGNUP_RESPONSE" | sed '$d')

if [[ "$SIGNUP_STATUS" == "201" ]]; then
    print_success "User Registration - Status: 201"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "User Registration - Expected: 201, Got: $SIGNUP_STATUS"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 2: User Login
print_info "2. Testing User Login"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/signin" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }")

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [[ "$LOGIN_STATUS" == "200" ]]; then
    print_success "User Login - Status: 200"
    ACCESS_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.tokens.accessToken')
    REFRESH_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.tokens.refreshToken')
    print_info "Access token obtained: ${ACCESS_TOKEN:0:20}..."
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "User Login - Expected: 200, Got: $LOGIN_STATUS"
    print_error "Cannot continue without access token"
    exit 1
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 3: Get User Profile
print_header "Profile Tests"

print_info "3. Testing Get User Profile"
PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/auth/profile" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

PROFILE_STATUS=$(echo "$PROFILE_RESPONSE" | tail -n1)

if [[ "$PROFILE_STATUS" == "200" ]]; then
    print_success "Get User Profile - Status: 200"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Get User Profile - Expected: 200, Got: $PROFILE_STATUS"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 4: Update User Profile
print_info "4. Testing Update User Profile"
UPDATE_PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/auth/profile" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "firstName": "Updated",
        "lastName": "Tester",
        "preferences": {
            "currency": "USD",
            "emailNotifications": true
        }
    }')

UPDATE_PROFILE_STATUS=$(echo "$UPDATE_PROFILE_RESPONSE" | tail -n1)

if [[ "$UPDATE_PROFILE_STATUS" == "200" ]]; then
    print_success "Update User Profile - Status: 200"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Update User Profile - Expected: 200, Got: $UPDATE_PROFILE_STATUS"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 5: Create Budget
print_header "Budget Management Tests"

print_info "5. Testing Create Budget"
CREATE_BUDGET_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/budget/set" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "budgetName": "Test Budget",
        "monthlyLimit": 500,
        "currency": "USD",
        "alertThreshold": 80,
        "services": ["EC2", "S3"],
        "notifications": {
            "email": true
        }
    }')

CREATE_BUDGET_STATUS=$(echo "$CREATE_BUDGET_RESPONSE" | tail -n1)
CREATE_BUDGET_BODY=$(echo "$CREATE_BUDGET_RESPONSE" | sed '$d')

if [[ "$CREATE_BUDGET_STATUS" == "201" ]]; then
    print_success "Create Budget - Status: 201"
    BUDGET_ID=$(echo "$CREATE_BUDGET_BODY" | jq -r '.budget.budgetId')
    print_info "Budget ID: $BUDGET_ID"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Create Budget - Expected: 201, Got: $CREATE_BUDGET_STATUS"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 6: Get All Budgets
print_info "6. Testing Get All Budgets"
GET_BUDGETS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/budget" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

GET_BUDGETS_STATUS=$(echo "$GET_BUDGETS_RESPONSE" | tail -n1)

if [[ "$GET_BUDGETS_STATUS" == "200" ]]; then
    print_success "Get All Budgets - Status: 200"
    BUDGET_COUNT=$(echo "$GET_BUDGETS_RESPONSE" | sed '$d' | jq -r '.totalBudgets')
    print_info "Total budgets: $BUDGET_COUNT"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Get All Budgets - Expected: 200, Got: $GET_BUDGETS_STATUS"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 7: Get Specific Budget
if [[ -n "$BUDGET_ID" && "$BUDGET_ID" != "null" ]]; then
    print_info "7. Testing Get Specific Budget"
    GET_SPECIFIC_BUDGET_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/budget?budgetId=$BUDGET_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    GET_SPECIFIC_BUDGET_STATUS=$(echo "$GET_SPECIFIC_BUDGET_RESPONSE" | tail -n1)

    if [[ "$GET_SPECIFIC_BUDGET_STATUS" == "200" ]]; then
        print_success "Get Specific Budget - Status: 200"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "Get Specific Budget - Expected: 200, Got: $GET_SPECIFIC_BUDGET_STATUS"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
else
    print_warning "Skipping Get Specific Budget test - no budget ID available"
fi

# Test 8: Update Budget
if [[ -n "$BUDGET_ID" && "$BUDGET_ID" != "null" ]]; then
    print_info "8. Testing Update Budget"
    UPDATE_BUDGET_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/budget/set" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"budgetId\": \"$BUDGET_ID\",
            \"monthlyLimit\": 750,
            \"alertThreshold\": 85
        }")

    UPDATE_BUDGET_STATUS=$(echo "$UPDATE_BUDGET_RESPONSE" | tail -n1)

    if [[ "$UPDATE_BUDGET_STATUS" == "200" ]]; then
        print_success "Update Budget - Status: 200"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "Update Budget - Expected: 200, Got: $UPDATE_BUDGET_STATUS"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
else
    print_warning "Skipping Update Budget test - no budget ID available"
fi

# Test 9: Get Cost Usage Data
print_header "Cost Monitoring Tests"

print_info "9. Testing Get Cost Usage Data"
GET_COST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/cost-usage" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

GET_COST_STATUS=$(echo "$GET_COST_RESPONSE" | tail -n1)

if [[ "$GET_COST_STATUS" == "200" ]]; then
    print_success "Get Cost Usage Data - Status: 200"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Get Cost Usage Data - Expected: 200, Got: $GET_COST_STATUS"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 10: Trigger Cost Alerts
print_info "10. Testing Trigger Cost Alerts"
TRIGGER_ALERTS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/alerts/trigger" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")

TRIGGER_ALERTS_STATUS=$(echo "$TRIGGER_ALERTS_RESPONSE" | tail -n1)

if [[ "$TRIGGER_ALERTS_STATUS" == "200" ]]; then
    print_success "Trigger Cost Alerts - Status: 200"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Trigger Cost Alerts - Expected: 200, Got: $TRIGGER_ALERTS_STATUS"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 11: Refresh Token
print_header "Token Management Tests"

print_info "11. Testing Refresh Token"
REFRESH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

REFRESH_STATUS=$(echo "$REFRESH_RESPONSE" | tail -n1)

if [[ "$REFRESH_STATUS" == "200" ]]; then
    print_success "Refresh Token - Status: 200"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Refresh Token - Expected: 200, Got: $REFRESH_STATUS"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test Summary
print_header "Test Summary"
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    print_success "All tests passed! 🎉"
    echo ""
    echo "Test user created:"
    echo "  Email: $TEST_EMAIL"
    echo "  Password: $TEST_PASSWORD"
    echo ""
    echo "You can use these credentials to test the API manually."
    exit 0
else
    print_error "Some tests failed. Please check the API endpoints."
    exit 1
fi
