#!/usr/bin/env node

/**
 * Test script for Budget Management API endpoints
 * Run this after deployment to test the budget functionality
 */

const https = require('https');

// Configuration - Update these after deployment
const API_BASE_URL = 'https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev';
const TEST_USER = {
  email: 'budget-test@costguard.com',
  password: 'TestPass123!',
  firstName: 'Budget',
  lastName: 'Tester',
};

/**
 * Make HTTP request
 */
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(body),
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Test user registration and login to get access token
 */
async function getAccessToken() {
  console.log('\n🔐 Setting up test user...');

  try {
    // Try to register user (might already exist)
    await makeRequest(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, TEST_USER);

    // Login to get access token
    const loginResponse = await makeRequest(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (loginResponse.statusCode === 200) {
      console.log('✅ User authenticated successfully');
      return loginResponse.body.tokens.accessToken;
    } else {
      console.log('❌ Failed to authenticate user');
      console.log('Response:', loginResponse.body);
      return null;
    }
  } catch (error) {
    console.log('❌ Error during authentication:', error.message);
    return null;
  }
}

/**
 * Test setting a budget
 */
async function testSetBudget(accessToken) {
  console.log('\n💰 Testing Set Budget...');

  try {
    const budgetData = {
      budgetName: 'Test Budget',
      monthlyLimit: 300,
      currency: 'USD',
      alertThreshold: 75,
      alertFrequency: 'daily',
      services: ['EC2', 'S3', 'Lambda'],
      tags: {
        Environment: 'test',
        Project: 'costguard',
      },
      notifications: {
        email: true,
        sns: false,
        slack: false,
      },
    };

    const response = await makeRequest(`${API_BASE_URL}/budget/set`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }, budgetData);

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('✅ Budget set successfully');
      console.log(`Budget ID: ${response.body.budget?.budgetId}`);
      console.log(`Monthly Limit: $${response.body.budget?.monthlyLimit}`);
      console.log(`Alert Threshold: ${response.body.budget?.alertThreshold}%`);
      return response.body.budget;
    } else {
      console.log('❌ Failed to set budget');
      console.log('Response:', response.body);
      return null;
    }
  } catch (error) {
    console.log('❌ Error setting budget:', error.message);
    return null;
  }
}

/**
 * Test getting budget
 */
async function testGetBudget(accessToken) {
  console.log('\n📊 Testing Get Budget...');

  try {
    const response = await makeRequest(`${API_BASE_URL}/budget`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log('✅ Budget retrieved successfully');
      console.log(`Total Budgets: ${response.body.totalBudgets}`);

      if (response.body.budgets && response.body.budgets.length > 0) {
        const budget = response.body.budgets[0];
        console.log(`Budget Name: ${budget.budgetName}`);
        console.log(`Monthly Limit: $${budget.monthlyLimit}`);
        console.log(`Current Spend: $${budget.totalSpentThisMonth}`);
        console.log(`Utilization: ${budget.utilization}%`);
        console.log(`Status: ${budget.status}`);
        console.log(`Remaining: $${budget.remainingBudget}`);
      }

      return response.body.budgets;
    } else {
      console.log('❌ Failed to get budget');
      console.log('Response:', response.body);
      return null;
    }
  } catch (error) {
    console.log('❌ Error getting budget:', error.message);
    return null;
  }
}

/**
 * Test getting all budgets
 */
async function testGetAllBudgets(accessToken) {
  console.log('\n📋 Testing Get All Budgets...');

  try {
    const response = await makeRequest(`${API_BASE_URL}/budget?includeAll=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log('✅ All budgets retrieved successfully');
      console.log(`Total Budgets: ${response.body.totalBudgets}`);

      response.body.budgets.forEach((budget, index) => {
        console.log(`\nBudget ${index + 1}:`);
        console.log(`  Name: ${budget.budgetName}`);
        console.log(`  Limit: $${budget.monthlyLimit}`);
        console.log(`  Status: ${budget.status}`);
        console.log(`  Services: ${budget.services.join(', ') || 'All'}`);
      });

      return response.body.budgets;
    } else {
      console.log('❌ Failed to get all budgets');
      console.log('Response:', response.body);
      return null;
    }
  } catch (error) {
    console.log('❌ Error getting all budgets:', error.message);
    return null;
  }
}

/**
 * Test updating budget
 */
async function testUpdateBudget(accessToken) {
  console.log('\n✏️  Testing Update Budget...');

  try {
    const updateData = {
      monthlyLimit: 400,
      alertThreshold: 85,
      services: ['EC2', 'S3', 'Lambda', 'RDS'],
      notifications: {
        email: true,
        sns: true,
        slack: false,
      },
    };

    const response = await makeRequest(`${API_BASE_URL}/budget/set`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }, updateData);

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log('✅ Budget updated successfully');
      console.log(`Updated Monthly Limit: $${response.body.budget?.monthlyLimit}`);
      console.log(`Updated Alert Threshold: ${response.body.budget?.alertThreshold}%`);
      console.log(`Updated Services: ${response.body.budget?.services.join(', ')}`);
      return response.body.budget;
    } else {
      console.log('❌ Failed to update budget');
      console.log('Response:', response.body);
      return null;
    }
  } catch (error) {
    console.log('❌ Error updating budget:', error.message);
    return null;
  }
}

/**
 * Test triggering cost alert manually
 */
async function testTriggerCostAlert(accessToken) {
  console.log('\n🚨 Testing Manual Cost Alert Trigger...');

  try {
    const response = await makeRequest(`${API_BASE_URL}/alerts/trigger`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log('✅ Cost alert triggered successfully');
      console.log(`Processed Budgets: ${response.body.processedBudgets}`);
      console.log(`Alerts Sent: ${response.body.alertsSent}`);
      console.log(`Errors: ${response.body.errors}`);

      if (response.body.results && response.body.results.length > 0) {
        console.log('\nAlert Results:');
        response.body.results.forEach((result, index) => {
          console.log(`\nBudget ${index + 1}:`);
          console.log(`  Name: ${result.budgetName}`);
          console.log(`  Limit: $${result.monthlyLimit}`);
          console.log(`  Spent: $${result.totalSpent?.toFixed(2) || 0}`);
          console.log(`  Utilization: ${result.utilization?.toFixed(2) || 0}%`);
          console.log(`  Status: ${result.status}`);
          console.log(`  Alert Sent: ${result.alertSent ? '✅' : '❌'}`);
          if (result.error) {
            console.log(`  Error: ${result.error}`);
          }
        });
      }

      return response.body;
    } else {
      console.log('❌ Failed to trigger cost alert');
      console.log('Response:', response.body);
      return null;
    }
  } catch (error) {
    console.log('❌ Error triggering cost alert:', error.message);
    return null;
  }
}

/**
 * Test invalid budget data
 */
async function testInvalidBudgetData(accessToken) {
  console.log('\n❌ Testing Invalid Budget Data...');

  try {
    const invalidData = {
      monthlyLimit: -100, // Invalid negative limit
      alertThreshold: 150, // Invalid threshold > 100
    };

    const response = await makeRequest(`${API_BASE_URL}/budget/set`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }, invalidData);

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 400) {
      console.log('✅ Invalid data properly rejected');
      console.log(`Error: ${response.body.error}`);
      console.log(`Message: ${response.body.message}`);
    } else {
      console.log('❌ Invalid data not properly handled');
      console.log('Response:', response.body);
    }

    return response.statusCode === 400;
  } catch (error) {
    console.log('❌ Error testing invalid data:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runBudgetTests() {
  console.log('🧪 CostGuard Budget Management API Tests');
  console.log('==========================================');

  if (API_BASE_URL.includes('your-api-gateway-url')) {
    console.log('❌ Please update the API_BASE_URL in this script with your actual API Gateway URL');
    return;
  }

  const results = {
    authentication: false,
    setBudget: false,
    getBudget: false,
    getAllBudgets: false,
    updateBudget: false,
    triggerAlert: false,
    invalidData: false,
  };

  // Get access token
  const accessToken = await getAccessToken();
  results.authentication = !!accessToken;

  if (accessToken) {
    // Test budget operations
    results.setBudget = !!(await testSetBudget(accessToken));
    results.getBudget = !!(await testGetBudget(accessToken));
    results.getAllBudgets = !!(await testGetAllBudgets(accessToken));
    results.updateBudget = !!(await testUpdateBudget(accessToken));
    results.triggerAlert = !!(await testTriggerCostAlert(accessToken));
    results.invalidData = await testInvalidBudgetData(accessToken);
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`Authentication: ${results.authentication ? '✅' : '❌'}`);
  console.log(`Set Budget: ${results.setBudget ? '✅' : '❌'}`);
  console.log(`Get Budget: ${results.getBudget ? '✅' : '❌'}`);
  console.log(`Get All Budgets: ${results.getAllBudgets ? '✅' : '❌'}`);
  console.log(`Update Budget: ${results.updateBudget ? '✅' : '❌'}`);
  console.log(`Trigger Alert: ${results.triggerAlert ? '✅' : '❌'}`);
  console.log(`Invalid Data Handling: ${results.invalidData ? '✅' : '❌'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All budget management tests passed! System is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the configuration and try again.');
  }
}

// Run tests
runBudgetTests().catch(console.error);
