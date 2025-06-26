#!/bin/bash

# CostGuard Alert System Testing Script
# This script tests the new alert notification system

set -e

# Configuration
BASE_URL="https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev"
TEST_EMAIL="muhammadquanit@gmail.com"
TEST_PASSWORD="Quanit123!"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header "CostGuard Alert System Testing"
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Step 1: Create test user
print_header "Step 1: Creating Test User"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"firstName\": \"Alert\",
        \"lastName\": \"Tester\"
    }")

echo "Signup Response: $SIGNUP_RESPONSE"

# Step 2: Login and get token
print_header "Step 2: Login and Get Token"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signin" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.accessToken')
if [[ "$TOKEN" == "null" || -z "$TOKEN" ]]; then
    print_error "Failed to get access token"
    echo "Login Response: $LOGIN_RESPONSE"
    exit 1
fi

print_success "Access token obtained: ${TOKEN:0:20}..."

# Step 3: Create test budgets
print_header "Step 3: Creating Test Budgets"

# Create Budget 1 - High utilization budget (for testing alerts)
print_info "Creating Budget 1 (High Utilization Test)"
BUDGET1_RESPONSE=$(curl -s -X POST "$BASE_URL/budget/set" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "budgetName": "High Utilization Test Budget",
        "monthlyLimit": 10,
        "currency": "USD",
        "alertThreshold": 80,
        "services": ["Lambda", "DynamoDB"],
        "notifications": {
            "email": true,
            "sns": true,
            "slack": false
        }
    }')

BUDGET1_ID=$(echo "$BUDGET1_RESPONSE" | jq -r '.budget.budgetId')
print_success "Budget 1 created: $BUDGET1_ID"

# Create Budget 2 - Normal budget
print_info "Creating Budget 2 (Normal Budget)"
BUDGET2_RESPONSE=$(curl -s -X POST "$BASE_URL/budget/set" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "budgetName": "Normal Test Budget",
        "monthlyLimit": 1000,
        "currency": "USD",
        "alertThreshold": 85,
        "services": ["EC2", "S3"],
        "notifications": {
            "email": true,
            "sns": false,
            "slack": false
        }
    }')

BUDGET2_ID=$(echo "$BUDGET2_RESPONSE" | jq -r '.budget.budgetId')
print_success "Budget 2 created: $BUDGET2_ID"

# Step 4: Test Manual Alert Trigger (Test Mode)
print_header "Step 4: Testing Manual Alert Trigger (Test Mode)"
print_info "Testing alert system in test mode (no notifications sent)"

TEST_ALERT_RESPONSE=$(curl -s -X POST "$BASE_URL/alerts/trigger" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "testMode": true,
        "forceAlert": false
    }')

echo "Test Alert Response:"
echo "$TEST_ALERT_RESPONSE" | jq '.'

ALERTS_TRIGGERED=$(echo "$TEST_ALERT_RESPONSE" | jq -r '.summary.alertsTriggered')
BUDGETS_CHECKED=$(echo "$TEST_ALERT_RESPONSE" | jq -r '.summary.budgetsChecked')

print_success "Budgets checked: $BUDGETS_CHECKED"
print_success "Alerts triggered: $ALERTS_TRIGGERED"

# Step 5: Test Forced Alert (Test Mode)
print_header "Step 5: Testing Forced Alert (Test Mode)"
print_info "Forcing alerts for all budgets in test mode"

FORCED_ALERT_RESPONSE=$(curl -s -X POST "$BASE_URL/alerts/trigger" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "testMode": true,
        "forceAlert": true
    }')

echo "Forced Alert Response:"
echo "$FORCED_ALERT_RESPONSE" | jq '.'

FORCED_ALERTS=$(echo "$FORCED_ALERT_RESPONSE" | jq -r '.summary.alertsTriggered')
print_success "Forced alerts triggered: $FORCED_ALERTS"

# Step 6: Test Specific Budget Alert
print_header "Step 6: Testing Specific Budget Alert"
print_info "Testing alert for specific budget: $BUDGET1_ID"

SPECIFIC_ALERT_RESPONSE=$(curl -s -X POST "$BASE_URL/alerts/trigger" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"budgetId\": \"$BUDGET1_ID\",
        \"testMode\": true,
        \"forceAlert\": true
    }")

echo "Specific Budget Alert Response:"
echo "$SPECIFIC_ALERT_RESPONSE" | jq '.'

# Step 7: Test Real Alert (with notifications)
print_header "Step 7: Testing Real Alert (with notifications)"
print_info "⚠️  This will send actual notifications!"

read -p "Do you want to test real notifications? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    REAL_ALERT_RESPONSE=$(curl -s -X POST "$BASE_URL/alerts/trigger" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"budgetId\": \"$BUDGET1_ID\",
            \"testMode\": false,
            \"forceAlert\": true
        }")

    echo "Real Alert Response:"
    echo "$REAL_ALERT_RESPONSE" | jq '.'

    NOTIFICATIONS_SENT=$(echo "$REAL_ALERT_RESPONSE" | jq -r '.summary.notificationsSent')
    print_success "Real notifications sent: $NOTIFICATIONS_SENT"
else
    print_info "Skipping real notification test"
fi

# Step 8: Check Budget Status
print_header "Step 8: Checking Budget Status"
BUDGET_STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/budget" \
    -H "Authorization: Bearer $TOKEN")

echo "Budget Status:"
echo "$BUDGET_STATUS_RESPONSE" | jq '.budgets[] | {
    name: .budgetName,
    limit: .monthlyLimit,
    utilization: .utilization,
    status: .status,
    lastAlert: .lastAlertSent
}'

print_header "Test Summary"
echo "✅ Alert system testing completed successfully!"
echo ""
echo "Test Results:"
echo "- Test user created: $TEST_EMAIL"
echo "- Budgets created: 2"
echo "- Test mode alerts: $ALERTS_TRIGGERED"
echo "- Forced alerts: $FORCED_ALERTS"
echo ""
echo "🔍 Check the Lambda logs for detailed alert processing information:"
echo "   aws logs tail /aws/lambda/CostGuard-dev-alertProcessor --follow"
echo "   aws logs tail /aws/lambda/CostGuard-dev-triggerAlerts --follow"
