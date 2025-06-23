#!/usr/bin/env node

/**
 * Test script for CostGuard authentication system
 * Run this after deployment to test the authentication endpoints
 */

const https = require('https');

// Configuration - Update these after deployment
const API_BASE_URL = 'https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev';
const TEST_USER = {
  email: 'test@costguard.com',
  password: 'TestPass123!',
  firstName: 'Test',
  lastName: 'User',
  monthlyBudget: 100.00,
  alertThreshold: 80,
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
          console.log(error);
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
 * Test user registration
 */
async function testSignUp() {
  console.log('\n🔐 Testing User Registration...');

  try {
    const response = await makeRequest(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, TEST_USER);

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 201) {
      console.log('✅ User registration successful');
      console.log(`User ID: ${response.body.user?.userId}`);
      console.log(`Email: ${response.body.user?.email}`);
    } else if (response.statusCode === 409) {
      console.log('⚠️  User already exists (this is expected on subsequent runs)');
    } else {
      console.log('❌ User registration failed');
      console.log('Response:', response.body);
    }

    return response.statusCode === 201 || response.statusCode === 409;
  } catch (error) {
    console.log('❌ Error during registration:', error.message);
    return false;
  }
}

/**
 * Test user login
 */
async function testSignIn() {
  console.log('\n🔑 Testing User Login...');

  try {
    const response = await makeRequest(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log('✅ User login successful');
      console.log(`Access Token: ${response.body.tokens?.accessToken?.substring(0, 50)}...`);
      console.log(`Token expires in: ${response.body.tokens?.expiresIn} seconds`);
      return response.body.tokens?.accessToken;
    } else {
      console.log('❌ User login failed');
      console.log('Response:', response.body);
      return null;
    }
  } catch (error) {
    console.log('❌ Error during login:', error.message);
    return null;
  }
}

/**
 * Test getting user profile
 */
async function testGetProfile(accessToken) {
  console.log('\n👤 Testing Get User Profile...');

  try {
    const response = await makeRequest(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log('✅ Get profile successful');
      console.log(`User: ${response.body.user?.firstName} ${response.body.user?.lastName}`);
      console.log(`Email: ${response.body.user?.email}`);
      console.log(`Monthly Budget: $${response.body.user?.costSettings?.monthlyBudget}`);
    } else {
      console.log('❌ Get profile failed');
      console.log('Response:', response.body);
    }

    return response.statusCode === 200;
  } catch (error) {
    console.log('❌ Error getting profile:', error.message);
    return false;
  }
}

/**
 * Test updating user profile
 */
async function testUpdateProfile(accessToken) {
  console.log('\n✏️  Testing Update User Profile...');

  try {
    const updateData = {
      firstName: 'Updated',
      preferences: {
        currency: 'EUR',
        emailNotifications: false,
      },
      costSettings: {
        monthlyBudget: 150.00,
        alertThreshold: 75,
      },
    };

    const response = await makeRequest(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }, updateData);

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log('✅ Profile update successful');
      console.log(`Updated name: ${response.body.user?.firstName} ${response.body.user?.lastName}`);
      console.log(`Updated budget: $${response.body.user?.costSettings?.monthlyBudget}`);
      console.log(`Updated currency: ${response.body.user?.preferences?.currency}`);
    } else {
      console.log('❌ Profile update failed');
      console.log('Response:', response.body);
    }

    return response.statusCode === 200;
  } catch (error) {
    console.log('❌ Error updating profile:', error.message);
    return false;
  }
}

/**
 * Test getting cost data (protected endpoint)
 */
async function testGetCostData(accessToken) {
  console.log('\n💰 Testing Get Cost Data (Protected)...');

  try {
    const response = await makeRequest(`${API_BASE_URL}/cost-usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log('✅ Cost data retrieval successful');
      console.log(`Total Cost: ${response.body.totalCost}`);
      console.log(`Current Month: ${response.body.currentMonthCost}`);
      console.log(`Budget Status: ${response.body.budget?.budgetStatus}`);
      console.log(`User Budget: $${response.body.user?.costSettings?.monthlyBudget}`);
    } else {
      console.log('❌ Cost data retrieval failed');
      console.log('Response:', response.body);
    }

    return response.statusCode === 200;
  } catch (error) {
    console.log('❌ Error getting cost data:', error.message);
    return false;
  }
}

/**
 * Test accessing protected endpoint without token
 */
async function testUnauthorizedAccess() {
  console.log('\n🚫 Testing Unauthorized Access...');

  try {
    const response = await makeRequest(`${API_BASE_URL}/cost-usage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode === 401) {
      console.log('✅ Unauthorized access properly blocked');
      console.log(`Error: ${response.body.error}`);
    } else {
      console.log('❌ Unauthorized access not properly blocked');
      console.log('Response:', response.body);
    }

    return response.statusCode === 401;
  } catch (error) {
    console.log('❌ Error testing unauthorized access:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 CostGuard Authentication System Tests');
  console.log('==========================================');

  if (API_BASE_URL.includes('your-api-gateway-url')) {
    console.log('❌ Please update the API_BASE_URL in this script with your actual API Gateway URL');
    console.log('You can find this URL in the serverless deploy output or AWS Console');
    return;
  }

  const results = {
    signUp: false,
    signIn: false,
    getProfile: false,
    updateProfile: false,
    getCostData: false,
    unauthorizedAccess: false,
  };

  // Test user registration
  results.signUp = await testSignUp();

  // Test user login
  const accessToken = await testSignIn();
  results.signIn = !!accessToken;

  if (accessToken) {
    // Test authenticated endpoints
    results.getProfile = await testGetProfile(accessToken);
    results.updateProfile = await testUpdateProfile(accessToken);
    results.getCostData = await testGetCostData(accessToken);
  }

  // Test unauthorized access
  results.unauthorizedAccess = await testUnauthorizedAccess();

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`Sign Up: ${results.signUp ? '✅' : '❌'}`);
  console.log(`Sign In: ${results.signIn ? '✅' : '❌'}`);
  console.log(`Get Profile: ${results.getProfile ? '✅' : '❌'}`);
  console.log(`Update Profile: ${results.updateProfile ? '✅' : '❌'}`);
  console.log(`Get Cost Data: ${results.getCostData ? '✅' : '❌'}`);
  console.log(`Unauthorized Block: ${results.unauthorizedAccess ? '✅' : '❌'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Authentication system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the configuration and try again.');
  }
}

// Run tests
runTests().catch(console.error);
