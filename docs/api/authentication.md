# Authentication APIs

Authentication endpoints for user registration, login, and token management.

## Base URL
```
https://9nr4780m2j.execute-api.us-east-1.amazonaws.com/dev
```

---

## 🔐 User Registration

### `POST /auth/signup`

Register a new user account.

**Request:**
```bash
curl -X POST https://9nr4780m2j.execute-api.us-east-1.amazonaws.com/dev/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Request Body:**
```json
{
  "email": "user@example.com",        // Required: Valid email address
  "password": "SecurePass123!",       // Required: Min 8 chars, 1 uppercase, 1 number, 1 special
  "firstName": "John",                // Required: User's first name
  "lastName": "Doe"                   // Required: User's last name
}
```

**Success Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2025-06-25T10:00:00.000Z",
    "updatedAt": "2025-06-25T10:00:00.000Z",
    "lastLoginAt": null,
    "preferences": {
      "emailNotifications": true,
      "smsNotifications": false,
      "currency": "USD",
      "timezone": "UTC"
    },
    "costSettings": {
      "monthlyBudget": null,
      "alertThreshold": 80,
      "alertFrequency": "daily"
    }
  }
}
```

**Error Responses:**
```json
// 400 - Invalid email format
{
  "error": "Invalid email format",
  "message": "Please provide a valid email address"
}

// 400 - Weak password
{
  "error": "Password too weak",
  "message": "Password must be at least 8 characters with uppercase, number, and special character"
}

// 409 - User already exists
{
  "error": "User already exists",
  "message": "An account with this email already exists"
}
```

---

## 🔑 User Login

### `POST /auth/signin`

Authenticate user and get access tokens.

**Request:**
```bash
curl -X POST https://9nr4780m2j.execute-api.us-east-1.amazonaws.com/dev/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Request Body:**
```json
{
  "email": "user@example.com",        // Required: User's email
  "password": "SecurePass123!"        // Required: User's password
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  },
  "user": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "lastLoginAt": "2025-06-25T10:00:00.000Z",
    "preferences": {
      "emailNotifications": true,
      "currency": "USD",
      "timezone": "UTC"
    },
    "costSettings": {
      "monthlyBudget": 500,
      "alertThreshold": 80,
      "alertFrequency": "daily"
    }
  },
  "cognitoTokens": {
    "accessToken": "...",
    "idToken": "...",
    "refreshToken": "..."
  }
}
```

**Error Responses:**
```json
// 401 - Invalid credentials
{
  "error": "Invalid credentials",
  "message": "Email or password is incorrect"
}

// 403 - Account deactivated
{
  "error": "Account deactivated",
  "message": "Your account has been deactivated"
}

// 404 - User not found
{
  "error": "User not found",
  "message": "No account found with this email"
}
```

---

## 🔄 Refresh Token

### `POST /auth/refresh`

Refresh access token using refresh token.

**Request:**
```bash
curl -X POST https://9nr4780m2j.execute-api.us-east-1.amazonaws.com/dev/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Required: Valid refresh token
}
```

**Success Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  }
}
```

**Error Responses:**
```json
// 401 - Invalid refresh token
{
  "error": "Invalid refresh token",
  "message": "Refresh token is invalid or expired"
}

// 400 - Missing refresh token
{
  "error": "Missing refresh token",
  "message": "Refresh token is required"
}
```

---

## 🔒 Token Usage

### Using Access Token
Include the access token in the Authorization header for protected endpoints:

```bash
curl -X GET https://9nr4780m2j.execute-api.us-east-1.amazonaws.com/dev/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Expiration
- **Access Token**: Expires in 24 hours (86400 seconds)
- **Refresh Token**: Expires in 30 days
- Use refresh token to get new access token before expiration

### Security Best Practices
1. Store tokens securely (not in localStorage for web apps)
2. Implement automatic token refresh
3. Clear tokens on logout
4. Use HTTPS only
5. Implement proper CORS policies

---

## 📝 Examples

### Complete Authentication Flow

```bash
# 1. Register new user
curl -X POST https://9nr4780m2j.execute-api.us-east-1.amazonaws.com/dev/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "DemoPass123!",
    "firstName": "Demo",
    "lastName": "User"
  }'

# 2. Login to get tokens
curl -X POST https://9nr4780m2j.execute-api.us-east-1.amazonaws.com/dev/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "DemoPass123!"
  }' | jq -r '.tokens.accessToken'

# 3. Use access token for protected endpoints
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X GET https://9nr4780m2j.execute-api.us-east-1.amazonaws.com/dev/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 4. Refresh token when needed
REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X POST https://9nr4780m2j.execute-api.us-east-1.amazonaws.com/dev/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
```
