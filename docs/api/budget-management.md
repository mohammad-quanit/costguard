# Budget Management APIs

Budget management endpoints for creating, updating, and retrieving budget configurations.

## Base URL
```
https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev
```

---

## 💰 Create/Update Budget

### `POST /budget/set`

Create a new budget or update an existing one.

**Request:**
```bash
curl -X POST https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget/set \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "budgetName": "Production Budget",
    "monthlyLimit": 500,
    "currency": "USD",
    "alertThreshold": 80,
    "alertFrequency": "daily",
    "services": ["EC2", "S3", "Lambda"],
    "tags": {
      "Environment": "production",
      "Project": "costguard"
    },
    "notifications": {
      "email": true,
      "sns": false,
      "slack": false,
      "webhookUrl": null
    }
  }'
```

**Headers:**
```
Authorization: Bearer <access_token>  // Required
Content-Type: application/json       // Required
```

**Request Body:**
```json
{
  "budgetId": "uuid",                     // Optional: For updating existing budget
  "budgetName": "Production Budget",      // Optional: Budget name (default: "Default Budget")
  "monthlyLimit": 500,                    // Required: Monthly budget limit (> 0)
  "currency": "USD",                      // Optional: Currency code (default: "USD")
  "alertThreshold": 80,                   // Optional: Alert threshold 1-100% (default: 80)
  "alertFrequency": "daily",              // Optional: daily/weekly/monthly (default: "daily")
  "services": ["EC2", "S3", "Lambda"],    // Optional: AWS services to monitor
  "tags": {                               // Optional: Cost allocation tags
    "Environment": "production",
    "Project": "costguard"
  },
  "notifications": {                      // Optional: Notification settings
    "email": true,                        // Optional: Email notifications (default: true)
    "sns": false,                         // Optional: SNS notifications (default: false)
    "slack": false,                       // Optional: Slack notifications (default: false)
    "webhookUrl": null                    // Optional: Slack webhook URL
  }
}
```

**Success Response (201 - Created / 200 - Updated):**
```json
{
  "message": "Budget created successfully",
  "budget": {
    "budgetId": "a10ba90d-48de-4258-9e7b-9480dfd7617e",
    "budgetName": "Production Budget",
    "monthlyLimit": 500,
    "currency": "USD",
    "alertThreshold": 80,
    "alertFrequency": "daily",
    "services": ["EC2", "S3", "Lambda"],
    "tags": {
      "Environment": "production",
      "Project": "costguard"
    },
    "notifications": {
      "email": true,
      "sns": false,
      "slack": false,
      "webhookUrl": null
    },
    "isActive": true,
    "totalSpentThisMonth": 0,
    "projectedMonthlySpend": 0,
    "createdAt": "2025-06-25T10:00:00.000Z",
    "updatedAt": "2025-06-25T10:00:00.000Z"
  }
}
```

**Error Responses:**
```json
// 400 - Invalid budget limit
{
  "error": "Invalid budget limit",
  "message": "Monthly limit must be a positive number"
}

// 400 - Invalid alert threshold
{
  "error": "Invalid alert threshold",
  "message": "Alert threshold must be between 1 and 100 percent"
}

// 404 - Budget not found (when updating)
{
  "error": "Budget not found",
  "message": "Budget not found for this user"
}
```

---

## 📊 Get All User Budgets

### `GET /budget`

Retrieve all budgets for the authenticated user.

**Request:**
```bash
curl -X GET https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Headers:**
```
Authorization: Bearer <access_token>  // Required
```

**Success Response (200):**
```json
{
  "message": "Budget settings retrieved successfully",
  "budgets": [
    {
      "budgetId": "a10ba90d-48de-4258-9e7b-9480dfd7617e",
      "budgetName": "Production Budget",
      "monthlyLimit": 500,
      "currency": "USD",
      "alertThreshold": 80,
      "alertFrequency": "daily",
      "services": ["EC2", "S3", "Lambda"],
      "tags": {
        "Environment": "production"
      },
      "notifications": {
        "email": true,
        "sns": false,
        "slack": false,
        "webhookUrl": null
      },
      "isActive": true,
      "totalSpentThisMonth": 125.50,
      "projectedMonthlySpend": 375.00,
      "remainingBudget": 374.50,
      "utilization": 25.1,
      "status": "on_track",
      "lastAlertSent": null,
      "createdAt": "2025-06-25T10:00:00.000Z",
      "updatedAt": "2025-06-25T10:30:00.000Z"
    },
    {
      "budgetId": "b20cb90e-59ef-5369-af8c-a591ege8728f",
      "budgetName": "Development Budget",
      "monthlyLimit": 200,
      "currency": "USD",
      "alertThreshold": 75,
      "alertFrequency": "weekly",
      "services": ["Lambda", "DynamoDB"],
      "tags": {
        "Environment": "development"
      },
      "notifications": {
        "email": true,
        "sns": false,
        "slack": false,
        "webhookUrl": null
      },
      "isActive": true,
      "totalSpentThisMonth": 45.20,
      "projectedMonthlySpend": 135.60,
      "remainingBudget": 154.80,
      "utilization": 22.6,
      "status": "on_track",
      "lastAlertSent": null,
      "createdAt": "2025-06-25T09:00:00.000Z",
      "updatedAt": "2025-06-25T09:30:00.000Z"
    }
  ],
  "totalBudgets": 2,
  "user": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

## 🎯 Get Specific Budget

### `GET /budget?budgetId=<id>`

Retrieve a specific budget by ID.

**Request:**
```bash
curl -X GET "https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget?budgetId=a10ba90d-48de-4258-9e7b-9480dfd7617e" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Query Parameters:**
```
budgetId=<uuid>  // Required: Budget ID to retrieve
```

**Success Response (200):**
```json
{
  "message": "Budget settings retrieved successfully",
  "budgets": [
    {
      "budgetId": "a10ba90d-48de-4258-9e7b-9480dfd7617e",
      "budgetName": "Production Budget",
      "monthlyLimit": 500,
      "currency": "USD",
      "alertThreshold": 80,
      "alertFrequency": "daily",
      "services": ["EC2", "S3", "Lambda"],
      "tags": {
        "Environment": "production"
      },
      "notifications": {
        "email": true,
        "sns": false,
        "slack": false,
        "webhookUrl": null
      },
      "isActive": true,
      "totalSpentThisMonth": 125.50,
      "projectedMonthlySpend": 375.00,
      "remainingBudget": 374.50,
      "utilization": 25.1,
      "status": "on_track",
      "lastAlertSent": null,
      "createdAt": "2025-06-25T10:00:00.000Z",
      "updatedAt": "2025-06-25T10:30:00.000Z"
    }
  ],
  "totalBudgets": 1,
  "budget": {
    // Same budget object as above
  }
}
```

**Error Response:**
```json
// 404 - Budget not found
{
  "error": "Budget not found",
  "message": "Budget not found for this user"
}
```

---

## 🏆 Get Primary Budget Only

### `GET /budget?primaryOnly=true`

Retrieve only the primary/default budget.

**Request:**
```bash
curl -X GET "https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget?primaryOnly=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Query Parameters:**
```
primaryOnly=true  // Get only primary budget
```

**Success Response (200):**
```json
{
  "message": "Budget settings retrieved successfully",
  "budgets": [
    {
      "budgetId": "a10ba90d-48de-4258-9e7b-9480dfd7617e",
      "budgetName": "Default Budget",
      "monthlyLimit": 500,
      "currency": "USD",
      "alertThreshold": 80,
      "alertFrequency": "daily",
      "services": [],
      "tags": {},
      "notifications": {
        "email": true,
        "sns": false,
        "slack": false,
        "webhookUrl": null
      },
      "isActive": true,
      "totalSpentThisMonth": 125.50,
      "projectedMonthlySpend": 375.00,
      "remainingBudget": 374.50,
      "utilization": 25.1,
      "status": "on_track",
      "lastAlertSent": null,
      "createdAt": "2025-06-25T10:00:00.000Z",
      "updatedAt": "2025-06-25T10:30:00.000Z"
    }
  ],
  "totalBudgets": 1
}
```

---

## 📋 Budget Status Values

| Status | Description | Utilization |
|--------|-------------|-------------|
| `on_track` | Spending is below alert threshold | < Alert Threshold |
| `warning` | Spending has reached alert threshold | ≥ Alert Threshold & < 100% |
| `exceeded` | Budget has been exceeded | ≥ 100% |

---

## 🔧 AWS Services List

Common AWS services you can monitor:
```json
[
  "EC2", "S3", "Lambda", "RDS", "DynamoDB", 
  "CloudFront", "Route53", "ELB", "VPC", 
  "CloudWatch", "SNS", "SQS", "API Gateway",
  "ECS", "EKS", "Fargate", "ElastiCache",
  "Redshift", "EMR", "Glue", "Athena"
]
```

---

## 📝 Examples

### Create Simple Budget
```bash
# Create basic budget
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X POST https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget/set \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetName": "My First Budget",
    "monthlyLimit": 100,
    "alertThreshold": 80
  }'
```

### Create Advanced Budget
```bash
# Create budget with all options
curl -X POST https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget/set \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetName": "Production Environment",
    "monthlyLimit": 1000,
    "currency": "USD",
    "alertThreshold": 85,
    "alertFrequency": "daily",
    "services": ["EC2", "RDS", "S3", "CloudFront"],
    "tags": {
      "Environment": "production",
      "Team": "backend",
      "Project": "ecommerce"
    },
    "notifications": {
      "email": true,
      "sns": true,
      "slack": true,
      "webhookUrl": "https://hooks.slack.com/services/..."
    }
  }'
```

### Update Existing Budget
```bash
# Update budget by providing budgetId
BUDGET_ID="a10ba90d-48de-4258-9e7b-9480dfd7617e"
curl -X POST https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget/set \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"budgetId\": \"$BUDGET_ID\",
    \"monthlyLimit\": 750,
    \"alertThreshold\": 90
  }"
```

### Get All Budgets with Summary
```bash
# Get all budgets and extract summary
curl -X GET https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq '{
    totalBudgets: .totalBudgets,
    budgets: [.budgets[] | {
      name: .budgetName,
      limit: .monthlyLimit,
      spent: .totalSpentThisMonth,
      utilization: .utilization,
      status: .status
    }]
  }'
```

### Monitor Specific Budget
```bash
# Get specific budget status
BUDGET_ID="a10ba90d-48de-4258-9e7b-9480dfd7617e"
curl -X GET "https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget?budgetId=$BUDGET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq '.budgets[0] | {
    name: .budgetName,
    limit: .monthlyLimit,
    spent: .totalSpentThisMonth,
    remaining: .remainingBudget,
    utilization: .utilization,
    status: .status,
    projected: .projectedMonthlySpend
  }'
```
