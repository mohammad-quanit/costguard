#!/bin/bash

# CostGuard Alert System Testing Script with Threshold Simulation
# This script tests the alert system with simulated high utilization

set -e

# Configuration
BASE_URL="https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev"
TEST_EMAIL="mquanit1@yopmail.com"
TEST_PASSWORD="ThresholdTest123!"

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

print_header "CostGuard Alert System Testing with Threshold Simulation"
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
        \"firstName\": \"Threshold\",
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

# Step 3: Create test budgets with different scenarios
print_header "Step 3: Creating Test Budgets"

# Create Budget 1 - Very low limit to simulate high utilization (will exceed 80%)
print_info "Creating Budget 1 (High Utilization - will exceed 80%)"
BUDGET1_RESPONSE=$(curl -s -X POST "$BASE_URL/budget/set" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "budgetName": "High Utilization Alert Test",
        "monthlyLimit": 0.01,
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
print_success "High utilization budget created: $BUDGET1_ID (Limit: $0.01)"

# Create Budget 2 - Normal budget that won't trigger
print_info "Creating Budget 2 (Normal Budget - won't trigger)"
BUDGET2_RESPONSE=$(curl -s -X POST "$BASE_URL/budget/set" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "budgetName": "Normal Budget Test",
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
print_success "Normal budget created: $BUDGET2_ID (Limit: $1000)"

# Step 4: Wait a moment for budget creation to settle
print_info "Waiting 2 seconds for budget creation to settle..."
sleep 2

# Step 5: Test normal alert check (should trigger for high utilization budget)
print_header "Step 5: Testing Normal Alert Check (Real Threshold Detection)"
print_info "This should detect the high utilization budget and trigger an alert"

NORMAL_ALERT_RESPONSE=$(curl -s -X POST "$BASE_URL/alerts/trigger" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "testMode": false,
        "forceAlert": false
    }')

echo "Normal Alert Check Response:"
echo "$NORMAL_ALERT_RESPONSE" | jq '.'

NORMAL_ALERTS_TRIGGERED=$(echo "$NORMAL_ALERT_RESPONSE" | jq -r '.summary.alertsTriggered // 0')
NORMAL_NOTIFICATIONS_SENT=$(echo "$NORMAL_ALERT_RESPONSE" | jq -r '.summary.notificationsSent // 0')

print_success "Normal alerts triggered: $NORMAL_ALERTS_TRIGGERED"
print_success "Normal notifications sent: $NORMAL_NOTIFICATIONS_SENT"

# Step 6: Test specific high utilization budget
print_header "Step 6: Testing Specific High Utilization Budget"
print_info "Testing the specific budget that should exceed threshold"

SPECIFIC_ALERT_RESPONSE=$(curl -s -X POST "$BASE_URL/alerts/trigger" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"budgetId\": \"$BUDGET1_ID\",
        \"testMode\": false,
        \"forceAlert\": false
    }")

echo "Specific Budget Alert Response:"
echo "$SPECIFIC_ALERT_RESPONSE" | jq '.'

SPECIFIC_ALERTS=$(echo "$SPECIFIC_ALERT_RESPONSE" | jq -r '.summary.alertsTriggered // 0')
SPECIFIC_NOTIFICATIONS=$(echo "$SPECIFIC_ALERT_RESPONSE" | jq -r '.summary.notificationsSent // 0')

print_success "Specific budget alerts: $SPECIFIC_ALERTS"
print_success "Specific budget notifications: $SPECIFIC_NOTIFICATIONS"

# Step 7: Force alert to guarantee email sending
print_header "Step 7: Force Alert Test (Guaranteed Email)"
print_info "Forcing alert to guarantee email notification is sent"

FORCE_ALERT_RESPONSE=$(curl -s -X POST "$BASE_URL/alerts/trigger" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"budgetId\": \"$BUDGET1_ID\",
        \"testMode\": false,
        \"forceAlert\": true
    }")

echo "Force Alert Response:"
echo "$FORCE_ALERT_RESPONSE" | jq '.'

FORCE_ALERTS=$(echo "$FORCE_ALERT_RESPONSE" | jq -r '.summary.alertsTriggered // 0')
FORCE_NOTIFICATIONS=$(echo "$FORCE_ALERT_RESPONSE" | jq -r '.summary.notificationsSent // 0')

print_success "Forced alerts triggered: $FORCE_ALERTS"
print_success "Forced notifications sent: $FORCE_NOTIFICATIONS"

# Step 8: Check budget status to see utilization
print_header "Step 8: Checking Budget Utilization Status"
BUDGET_STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/budget" \
    -H "Authorization: Bearer $TOKEN")

echo "Budget Utilization Status:"
echo "$BUDGET_STATUS_RESPONSE" | jq '.budgets[] | {
    name: .budgetName,
    limit: .monthlyLimit,
    spent: .totalSpentThisMonth,
    utilization: .utilization,
    status: .status,
    threshold: .alertThreshold,
    lastAlert: .lastAlertSent
}'

# Step 9: Test with even smaller budget to guarantee threshold breach
print_header "Step 9: Creating Micro Budget (Guaranteed Threshold Breach)"
print_info "Creating a budget with $0.001 limit to guarantee >80% utilization"

MICRO_BUDGET_RESPONSE=$(curl -s -X POST "$BASE_URL/budget/set" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "budgetName": "Micro Budget Guaranteed Alert",
        "monthlyLimit": 0.001,
        "currency": "USD",
        "alertThreshold": 50,
        "services": ["Lambda"],
        "notifications": {
            "email": true,
            "sns": true,
            "slack": false
        }
    }')

MICRO_BUDGET_ID=$(echo "$MICRO_BUDGET_RESPONSE" | jq -r '.budget.budgetId')
print_success "Micro budget created: $MICRO_BUDGET_ID (Limit: $0.001, Threshold: 50%)"

# Wait and test micro budget
sleep 2

MICRO_ALERT_RESPONSE=$(curl -s -X POST "$BASE_URL/alerts/trigger" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"budgetId\": \"$MICRO_BUDGET_ID\",
        \"testMode\": false,
        \"forceAlert\": false
    }")

echo "Micro Budget Alert Response:"
echo "$MICRO_ALERT_RESPONSE" | jq '.'

MICRO_ALERTS=$(echo "$MICRO_ALERT_RESPONSE" | jq -r '.summary.alertsTriggered // 0')
MICRO_NOTIFICATIONS=$(echo "$MICRO_ALERT_RESPONSE" | jq -r '.summary.notificationsSent // 0')

print_success "Micro budget alerts: $MICRO_ALERTS"
print_success "Micro budget notifications: $MICRO_NOTIFICATIONS"

# Final Summary
print_header "Test Summary"
echo "✅ Threshold-based alert testing completed!"
echo ""
echo "Test Results:"
echo "- Test user created: $TEST_EMAIL"
echo "- High utilization budget: $BUDGET1_ID (Limit: $0.01)"
echo "- Normal budget: $BUDGET2_ID (Limit: $1000)"
echo "- Micro budget: $MICRO_BUDGET_ID (Limit: $0.001)"
echo "- Normal alerts triggered: $NORMAL_ALERTS_TRIGGERED"
echo "- Specific alerts triggered: $SPECIFIC_ALERTS"
echo "- Forced alerts triggered: $FORCE_ALERTS"
echo "- Micro budget alerts: $MICRO_ALERTS"
echo ""
echo "📧 Email notifications should have been sent for budgets exceeding thresholds!"
echo ""
echo "🔍 Check Lambda logs for detailed processing:"
echo "   aws logs tail /aws/lambda/CostGuard-dev-triggerAlerts --follow"
echo ""
echo "📊 Check budget utilization:"
echo "   curl -X GET $BASE_URL/budget -H \"Authorization: Bearer $TOKEN\" | jq '.budgets[] | {name: .budgetName, utilization: .utilization, status: .status}'"
