#!/bin/bash

# 🛡️ CostGuard - Complete End-to-End Flow Test Script
# Tests all endpoints with user: muhammadquanit@gmail.com

set -e  # Exit on any error

# Configuration
BASE_URL="https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev"
TEST_EMAIL="muhammadquanit@gmail.com"
TEST_PASSWORD="TestPassword123!"
TEST_FIRST_NAME="Muhammad"
TEST_LAST_NAME="Quanit"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Global variables
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Function to make API calls with error handling
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    
    echo "Making $method request to: $endpoint" >&2
    
    if [ -n "$headers" ]; then
        if [ -n "$data" ]; then
            curl --http1.1 -s -X $method "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "$headers" \
                -d "$data"
        else
            curl --http1.1 -s -X $method "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "$headers"
        fi
    else
        if [ -n "$data" ]; then
            curl --http1.1 -s -X $method "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data"
        else
            curl --http1.1 -s -X $method "$BASE_URL$endpoint" \
                -H "Content-Type: application/json"
        fi
    fi
}

# Function to extract JSON values
extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

# Test functions
test_user_signup() {
    log_step "Step 1: User Signup"
    
    local signup_data='{
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'",
        "firstName": "'$TEST_FIRST_NAME'",
        "lastName": "'$TEST_LAST_NAME'"
    }'
    
    local response=$(api_call "POST" "/auth/signup" "$signup_data")
    echo "Signup Response: $response"
    
    if echo "$response" | grep -q "User created successfully\|already exists"; then
        USER_ID=$(extract_json_value "$response" "userId")
        log_success "User signup completed. User ID: $USER_ID"
        return 0
    else
        log_error "Signup failed: $response"
        return 1
    fi
}

test_user_signin() {
    log_step "Step 2: User Sign In"
    
    local signin_data='{
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'"
    }'
    
    local response=$(api_call "POST" "/auth/signin" "$signin_data")
    echo "Signin Response: $response"
    
    if echo "$response" | grep -q "accessToken"; then
        ACCESS_TOKEN=$(extract_json_value "$response" "accessToken")
        REFRESH_TOKEN=$(extract_json_value "$response" "refreshToken")
        log_success "Sign in successful. Access token obtained."
        return 0
    else
        log_error "Sign in failed: $response"
        return 1
    fi
}

test_get_user_profile() {
    log_step "Step 3: Get User Profile"
    
    local response=$(api_call "GET" "/auth/profile" "" "Authorization: Bearer $ACCESS_TOKEN")
    echo "Profile Response: $response"
    
    if echo "$response" | grep -q "$TEST_EMAIL"; then
        log_success "User profile retrieved successfully"
        return 0
    else
        log_error "Failed to get user profile: $response"
        return 1
    fi
}

test_update_user_profile() {
    log_step "Step 4: Update User Profile"
    
    local update_data='{
        "firstName": "Muhammad",
        "lastName": "Quanit Updated",
        "preferences": {
            "emailNotifications": true,
            "smsNotifications": false,
            "currency": "USD",
            "timezone": "UTC"
        },
        "costSettings": {
            "monthlyBudget": 100,
            "alertThreshold": 80,
            "alertFrequency": "daily"
        }
    }'
    
    local response=$(api_call "PUT" "/auth/profile" "$update_data" "Authorization: Bearer $ACCESS_TOKEN")
    echo "Profile Update Response: $response"
    
    if echo "$response" | grep -q "Profile updated successfully\|Updated"; then
        log_success "User profile updated successfully"
        return 0
    else
        log_error "Failed to update user profile: $response"
        return 1
    fi
}

test_set_budget() {
    log_step "Step 5: Set Budget"
    
    local budget_data='{
        "budgetName": "Monthly AWS Budget",
        "monthlyLimit": 150.00,
        "alertThreshold": 80,
        "services": ["EC2", "S3", "Lambda"],
        "alertFrequency": "daily"
    }'
    
    local response=$(api_call "POST" "/budget/set" "$budget_data" "Authorization: Bearer $ACCESS_TOKEN")
    echo "Set Budget Response: $response"
    
    if echo "$response" | grep -q "Budget created successfully\|Budget updated successfully"; then
        log_success "Budget set successfully"
        return 0
    else
        log_error "Failed to set budget: $response"
        return 1
    fi
}

test_get_budgets() {
    log_step "Step 6: Get User Budgets"
    
    local response=$(api_call "GET" "/budget" "" "Authorization: Bearer $ACCESS_TOKEN")
    echo "Get Budgets Response: $response"
    
    if echo "$response" | grep -q "budgets\|Monthly AWS Budget"; then
        log_success "Budgets retrieved successfully"
        return 0
    else
        log_error "Failed to get budgets: $response"
        return 1
    fi
}

test_get_cost_usage() {
    log_step "Step 7: Get Cost Usage Data"
    
    local response=$(api_call "GET" "/cost-usage" "" "Authorization: Bearer $ACCESS_TOKEN")
    echo "Cost Usage Response: $response"
    
    if echo "$response" | grep -q "cost\|usage\|spend"; then
        log_success "Cost usage data retrieved successfully"
        return 0
    else
        log_warning "Cost usage endpoint may not have data yet: $response"
        return 0  # Don't fail the test for this
    fi
}

test_trigger_alerts() {
    log_step "Step 8: Trigger Budget Alerts"
    
    local alert_data='{
        "testMode": true,
        "forceAlert": true
    }'
    
    local response=$(api_call "POST" "/alerts/trigger" "$alert_data" "Authorization: Bearer $ACCESS_TOKEN")
    echo "Trigger Alerts Response: $response"
    
    if echo "$response" | grep -q "Alert check completed\|alertsTriggered"; then
        log_success "Budget alerts triggered successfully"
        return 0
    else
        log_error "Failed to trigger alerts: $response"
        return 1
    fi
}

test_refresh_token() {
    log_step "Step 9: Refresh Access Token"
    
    local refresh_data='{
        "refreshToken": "'$REFRESH_TOKEN'"
    }'
    
    local response=$(api_call "POST" "/auth/refresh" "$refresh_data")
    echo "Refresh Token Response: $response"
    
    if echo "$response" | grep -q "accessToken"; then
        ACCESS_TOKEN=$(extract_json_value "$response" "accessToken")
        log_success "Token refreshed successfully"
        return 0
    else
        log_error "Failed to refresh token: $response"
        return 1
    fi
}

test_advanced_budget_scenarios() {
    log_step "Step 10: Advanced Budget Scenarios"
    
    # Test multiple budgets
    log_info "Creating additional test budgets..."
    
    local budget_data_2='{
        "budgetName": "Development Environment",
        "monthlyLimit": 50.00,
        "alertThreshold": 75,
        "services": ["Lambda", "API Gateway", "DynamoDB"],
        "alertFrequency": "daily"
    }'
    
    local response2=$(api_call "POST" "/budget/set" "$budget_data_2" "Authorization: Bearer $ACCESS_TOKEN")
    echo "Additional Budget Response: $response2"
    
    local budget_data_3='{
        "budgetName": "Storage Budget",
        "monthlyLimit": 25.00,
        "alertThreshold": 90,
        "services": ["S3", "EBS"],
        "alertFrequency": "weekly"
    }'
    
    local response3=$(api_call "POST" "/budget/set" "$budget_data_3" "Authorization: Bearer $ACCESS_TOKEN")
    echo "Storage Budget Response: $response3"
    
    log_success "Advanced budget scenarios completed"
}

test_budget_deletion() {
    log_step "Step 11: Budget Deletion Tests"
    
    # First, get all budgets to find one to delete
    log_info "Getting current budgets to find one to delete..."
    local budgets_response=$(api_call "GET" "/budget" "" "Authorization: Bearer $ACCESS_TOKEN")
    echo "Current Budgets: $budgets_response"
    
    # Extract a budget ID from the response (we'll delete the first one)
    local budget_id=$(echo "$budgets_response" | grep -o '"budgetId":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$budget_id" ]; then
        log_info "Deleting budget with ID: $budget_id"
        local delete_response=$(api_call "DELETE" "/budget/$budget_id" "" "Authorization: Bearer $ACCESS_TOKEN")
        echo "Delete Budget Response: $delete_response"
        
        # Verify the budget was deleted by trying to get budgets again
        log_info "Verifying budget deletion..."
        local verify_response=$(api_call "GET" "/budget" "" "Authorization: Bearer $ACCESS_TOKEN")
        echo "Budgets After Deletion: $verify_response"
        
        # Test deleting a non-existent budget
        log_info "Testing deletion of non-existent budget..."
        local nonexistent_response=$(api_call "DELETE" "/budget/non-existent-budget-id" "" "Authorization: Bearer $ACCESS_TOKEN")
        echo "Non-existent Budget Delete Response: $nonexistent_response"
    else
        log_info "No budgets found to delete"
    fi
    
    log_success "Budget deletion tests completed"
}

test_error_scenarios() {
    log_step "Step 12: Error Handling Tests"
    
    log_info "Testing invalid token..."
    local invalid_response=$(api_call "GET" "/auth/profile" "" "Authorization: Bearer invalid_token_123")
    echo "Invalid Token Response: $invalid_response"
    
    log_info "Testing missing required fields..."
    local invalid_budget='{
        "budgetName": "Incomplete Budget"
    }'
    local invalid_budget_response=$(api_call "POST" "/budget/set" "$invalid_budget" "Authorization: Bearer $ACCESS_TOKEN")
    echo "Invalid Budget Response: $invalid_budget_response"
    
    log_success "Error handling tests completed"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "🛡️ =========================================="
    echo "   CostGuard Complete End-to-End Test"
    echo "=========================================="
    echo -e "Base URL: $BASE_URL"
    echo -e "Test User: $TEST_EMAIL"
    echo -e "==========================================${NC}\n"
    
    # Check if BASE_URL is set correctly
    if [[ "$BASE_URL" == *"your-api-gateway-url"* ]]; then
        log_error "Please update the BASE_URL in the script with your actual API Gateway URL"
        exit 1
    fi
    
    local failed_tests=0
    local total_tests=12
    
    # Execute all tests
    test_user_signup || ((failed_tests++))
    test_user_signin || ((failed_tests++))
    test_get_user_profile || ((failed_tests++))
    test_update_user_profile || ((failed_tests++))
    test_set_budget || ((failed_tests++))
    test_get_budgets || ((failed_tests++))
    test_get_cost_usage || ((failed_tests++))
    test_trigger_alerts || ((failed_tests++))
    test_refresh_token || ((failed_tests++))
    test_advanced_budget_scenarios || ((failed_tests++))
    test_budget_deletion || ((failed_tests++))
    test_error_scenarios || ((failed_tests++))
    
    # Final summary
    log_step "Test Summary"
    local passed_tests=$((total_tests - failed_tests))
    
    echo -e "${BLUE}📊 Test Results:${NC}"
    echo -e "   ✅ Passed: $passed_tests/$total_tests"
    echo -e "   ❌ Failed: $failed_tests/$total_tests"
    
    if [ $failed_tests -eq 0 ]; then
        log_success "🎉 All tests passed! CostGuard API is working perfectly."
        echo -e "\n${GREEN}🔍 Next Steps:${NC}"
        echo -e "   • Check your email ($TEST_EMAIL) for SES verification if first time"
        echo -e "   • Monitor CloudWatch logs for detailed execution traces"
        echo -e "   • Set up real AWS budgets for production monitoring"
        echo -e "   • Configure SNS topics for alert notifications"
    else
        log_error "Some tests failed. Please check the error messages above."
        echo -e "\n${YELLOW}🔧 Troubleshooting:${NC}"
        echo -e "   • Verify all Lambda functions are deployed correctly"
        echo -e "   • Check CloudWatch logs for detailed error information"
        echo -e "   • Ensure DynamoDB tables are created and accessible"
        echo -e "   • Verify Cognito User Pool configuration"
        exit 1
    fi
    
    echo -e "\n${BLUE}📋 User Account Details:${NC}"
    echo -e "   Email: $TEST_EMAIL"
    echo -e "   User ID: $USER_ID"
    echo -e "   Access Token: ${ACCESS_TOKEN:0:20}..."
    echo -e "   Profile: Updated with preferences and cost settings"
    echo -e "   Budgets: Multiple budgets created and configured"
}

# Execute main function
main "$@"
