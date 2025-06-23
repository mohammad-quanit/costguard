# CostGuard Authentication API Documentation

## Overview

The CostGuard application now includes a complete authentication system using AWS Cognito User Pools and DynamoDB for user management. All cost monitoring endpoints are now protected and require authentication.

## Authentication Endpoints

### 1. Sign Up
**POST** `/auth/signup`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "monthlyBudget": 100.00,
  "alertThreshold": 80
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "userId": "uuid-here",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2025-06-23T18:00:00.000Z",
    "preferences": {
      "emailNotifications": true,
      "smsNotifications": false,
      "currency": "USD",
      "timezone": "UTC"
    },
    "costSettings": {
      "monthlyBudget": 100.00,
      "alertThreshold": 80,
      "alertFrequency": "daily"
    }
  }
}
```

### 2. Sign In
**POST** `/auth/signin`

Authenticate user and get access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "tokens": {
    "accessToken": "jwt-token-here",
    "refreshToken": "refresh-token-here",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  },
  "user": {
    "userId": "uuid-here",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "lastLoginAt": "2025-06-23T18:00:00.000Z",
    "preferences": {...},
    "costSettings": {...}
  },
  "cognitoTokens": {
    "accessToken": "cognito-access-token",
    "idToken": "cognito-id-token",
    "refreshToken": "cognito-refresh-token"
  }
}
```

### 3. Refresh Token
**POST** `/auth/refresh`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh-token-here"
}
```

**Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "tokens": {
    "accessToken": "new-jwt-token-here",
    "refreshToken": "new-refresh-token-here",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  }
}
```

### 4. Get User Profile
**GET** `/auth/profile`

Get current user's profile information.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "message": "User profile retrieved successfully",
  "user": {
    "userId": "uuid-here",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2025-06-23T18:00:00.000Z",
    "updatedAt": "2025-06-23T18:00:00.000Z",
    "lastLoginAt": "2025-06-23T18:00:00.000Z",
    "preferences": {
      "emailNotifications": true,
      "smsNotifications": false,
      "currency": "USD",
      "timezone": "UTC"
    },
    "costSettings": {
      "monthlyBudget": 100.00,
      "alertThreshold": 80,
      "alertFrequency": "daily"
    }
  }
}
```

### 5. Update User Profile
**PUT** `/auth/profile`

Update user profile information.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "preferences": {
    "emailNotifications": false,
    "currency": "EUR"
  },
  "costSettings": {
    "monthlyBudget": 150.00,
    "alertThreshold": 75
  }
}
```

**Response (200):**
```json
{
  "message": "User profile updated successfully",
  "user": {
    // Updated user object
  }
}
```

## Protected Endpoints

### Get Cost Data
**GET** `/cost-usage`

Get cost and usage data (now requires authentication).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "totalCost": "$123.45",
  "currentMonthCost": "$45.67",
  "budget": {
    "monthlyBudget": 100.00,
    "budgetUtilization": 45.67,
    "remainingBudget": "$54.33",
    "budgetStatus": "on_track"
  },
  "user": {
    "userId": "uuid-here",
    "email": "user@example.com",
    "costSettings": {
      "monthlyBudget": 100.00,
      "alertThreshold": 80
    }
  },
  // ... other cost data
}
```

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields",
  "message": "Email, password, firstName, and lastName are required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Account deactivated",
  "message": "Your account has been deactivated"
}
```

### 404 Not Found
```json
{
  "error": "User not found",
  "message": "No account found with this email"
}
```

### 409 Conflict
```json
{
  "error": "User already exists",
  "message": "An account with this email already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Usage Examples

### JavaScript/Node.js Example

```javascript
// Sign up
const signUpResponse = await fetch('https://your-api-gateway-url/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    monthlyBudget: 100.00
  })
});

// Sign in
const signInResponse = await fetch('https://your-api-gateway-url/auth/signin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});

const { tokens } = await signInResponse.json();

// Get cost data (authenticated)
const costDataResponse = await fetch('https://your-api-gateway-url/cost-usage', {
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json',
  }
});
```

### cURL Examples

```bash
# Sign up
curl -X POST https://your-api-gateway-url/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "monthlyBudget": 100.00
  }'

# Sign in
curl -X POST https://your-api-gateway-url/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Get cost data
curl -X GET https://your-api-gateway-url/cost-usage \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Deployment Notes

1. Make sure to set a strong JWT_SECRET in your environment variables
2. The Cognito User Pool and DynamoDB table will be created automatically during deployment
3. All existing cost monitoring functions are now protected by authentication
4. Users must sign up and sign in to access cost data
5. User preferences and cost settings are stored per user in DynamoDB

## Security Features

- Password strength validation
- JWT token-based authentication
- Cognito User Pool integration
- User session management
- Protected API endpoints
- User data isolation
- Automatic token expiration
- Refresh token rotation
