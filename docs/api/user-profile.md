# User Profile APIs

User profile management endpoints for retrieving and updating user information.

## Base URL
```
https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev
```

---

## 👤 Get User Profile

### `GET /auth/profile`

Retrieve the authenticated user's profile information.

**Request:**
```bash
curl -X GET https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Headers:**
```
Authorization: Bearer <access_token>  // Required
```

**Success Response (200):**
```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2025-06-25T10:00:00.000Z",
    "updatedAt": "2025-06-25T10:30:00.000Z",
    "lastLoginAt": "2025-06-25T10:00:00.000Z",
    "preferences": {
      "emailNotifications": true,
      "smsNotifications": false,
      "currency": "USD",
      "timezone": "UTC"
    },
    "costSettings": {
      "monthlyBudget": 500,
      "alertThreshold": 80,
      "alertFrequency": "daily"
    }
  }
}
```

**Error Responses:**
```json
// 401 - Unauthorized
{
  "error": "Unauthorized",
  "message": "Authorization token is required"
}

// 403 - Invalid token
{
  "error": "Invalid token",
  "message": "Token is invalid or expired"
}

// 404 - User not found
{
  "error": "User not found",
  "message": "User associated with this token no longer exists"
}
```

---

## ✏️ Update User Profile

### `PUT /auth/profile`

Update the authenticated user's profile information.

**Request:**
```bash
curl -X PUT https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "preferences": {
      "emailNotifications": true,
      "smsNotifications": false,
      "currency": "USD",
      "timezone": "America/New_York"
    },
    "costSettings": {
      "monthlyBudget": 750,
      "alertThreshold": 85,
      "alertFrequency": "weekly"
    }
  }'
```

**Headers:**
```
Authorization: Bearer <access_token>  // Required
Content-Type: application/json       // Required
```

**Request Body (all fields optional):**
```json
{
  "firstName": "John",                    // Optional: User's first name
  "lastName": "Smith",                    // Optional: User's last name
  "preferences": {                        // Optional: User preferences
    "emailNotifications": true,           // Optional: Enable email notifications
    "smsNotifications": false,            // Optional: Enable SMS notifications
    "currency": "USD",                    // Optional: Preferred currency (USD, EUR, GBP)
    "timezone": "America/New_York"        // Optional: User's timezone
  },
  "costSettings": {                       // Optional: Cost monitoring settings
    "monthlyBudget": 750,                 // Optional: Monthly budget limit
    "alertThreshold": 85,                 // Optional: Alert threshold percentage (1-100)
    "alertFrequency": "weekly"            // Optional: Alert frequency (daily, weekly, monthly)
  }
}
```

**Success Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "isActive": true,
    "createdAt": "2025-06-25T10:00:00.000Z",
    "updatedAt": "2025-06-25T11:00:00.000Z",
    "lastLoginAt": "2025-06-25T10:00:00.000Z",
    "preferences": {
      "emailNotifications": true,
      "smsNotifications": false,
      "currency": "USD",
      "timezone": "America/New_York"
    },
    "costSettings": {
      "monthlyBudget": 750,
      "alertThreshold": 85,
      "alertFrequency": "weekly"
    }
  }
}
```

**Error Responses:**
```json
// 400 - Invalid data
{
  "error": "Invalid data",
  "message": "Alert threshold must be between 1 and 100"
}

// 401 - Unauthorized
{
  "error": "Unauthorized",
  "message": "Authorization token is required"
}

// 403 - Account deactivated
{
  "error": "Account deactivated",
  "message": "Your account has been deactivated"
}
```

---

## 📋 Field Specifications

### User Preferences
| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `emailNotifications` | boolean | true/false | Enable email notifications |
| `smsNotifications` | boolean | true/false | Enable SMS notifications |
| `currency` | string | USD, EUR, GBP | Preferred currency |
| `timezone` | string | IANA timezone | User's timezone |

### Cost Settings
| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `monthlyBudget` | number | > 0 | Monthly budget limit in selected currency |
| `alertThreshold` | number | 1-100 | Percentage of budget to trigger alerts |
| `alertFrequency` | string | daily, weekly, monthly | How often to send alerts |

---

## 📝 Examples

### Get Current Profile
```bash
# Get user profile
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X GET https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
```

### Update Name Only
```bash
# Update only first and last name
curl -X PUT https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe"
  }'
```

### Update Preferences Only
```bash
# Update user preferences
curl -X PUT https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "emailNotifications": false,
      "currency": "EUR",
      "timezone": "Europe/London"
    }
  }'
```

### Update Cost Settings Only
```bash
# Update cost monitoring settings
curl -X PUT https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "costSettings": {
      "monthlyBudget": 1000,
      "alertThreshold": 90,
      "alertFrequency": "daily"
    }
  }'
```

### Complete Profile Update
```bash
# Update all profile fields
curl -X PUT https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "preferences": {
      "emailNotifications": true,
      "smsNotifications": true,
      "currency": "USD",
      "timezone": "America/Los_Angeles"
    },
    "costSettings": {
      "monthlyBudget": 500,
      "alertThreshold": 75,
      "alertFrequency": "weekly"
    }
  }'
```

---

## 🔒 Security Notes

1. **Authentication Required**: All profile endpoints require valid access token
2. **User Isolation**: Users can only access/modify their own profile
3. **Data Validation**: All input data is validated before processing
4. **Audit Trail**: Profile changes are logged with timestamps
5. **Rate Limiting**: Consider implementing rate limiting for update operations
