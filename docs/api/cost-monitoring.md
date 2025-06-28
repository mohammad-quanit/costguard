# Cost Monitoring APIs

Cost monitoring and alerting endpoints for tracking AWS spending and triggering budget alerts.

## Base URL
```
https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev
```

---

## 📊 Get Cost and Usage Data

### `GET /cost-usage`

Retrieve AWS cost and usage data for the authenticated user.

**Request:**
```bash
curl -X GET https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/cost-usage \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Headers:**
```
Authorization: Bearer <access_token>  // Required
```

**Query Parameters (Optional):**
```
startDate=2025-06-01    // Optional: Start date (YYYY-MM-DD)
endDate=2025-06-30      // Optional: End date (YYYY-MM-DD)
granularity=DAILY       // Optional: DAILY, MONTHLY (default: MONTHLY)
groupBy=SERVICE         // Optional: SERVICE, REGION, USAGE_TYPE
```

**Example with Parameters:**
```bash
curl -X GET "https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/cost-usage?startDate=2025-06-01&endDate=2025-06-30&granularity=DAILY&groupBy=SERVICE" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200):**
```json
{
  "message": "Cost data retrieved successfully",
  "costData": {
    "timePeriod": {
      "start": "2025-06-01",
      "end": "2025-06-30"
    },
    "granularity": "MONTHLY",
    "totalCost": {
      "amount": "245.67",
      "currency": "USD"
    },
    "resultsByTime": [
      {
        "timePeriod": {
          "start": "2025-06-01",
          "end": "2025-06-30"
        },
        "total": {
          "BlendedCost": {
            "amount": "245.67",
            "currency": "USD"
          }
        },
        "groups": [
          {
            "keys": ["Amazon Elastic Compute Cloud - Compute"],
            "metrics": {
              "BlendedCost": {
                "amount": "125.30",
                "currency": "USD"
              }
            }
          },
          {
            "keys": ["Amazon Simple Storage Service"],
            "metrics": {
              "BlendedCost": {
                "amount": "45.20",
                "currency": "USD"
              }
            }
          },
          {
            "keys": ["AWS Lambda"],
            "metrics": {
              "BlendedCost": {
                "amount": "32.15",
                "currency": "USD"
              }
            }
          },
          {
            "keys": ["Amazon DynamoDB"],
            "metrics": {
              "BlendedCost": {
                "amount": "28.90",
                "currency": "USD"
              }
            }
          },
          {
            "keys": ["Amazon CloudFront"],
            "metrics": {
              "BlendedCost": {
                "amount": "14.12",
                "currency": "USD"
              }
            }
          }
        ]
      }
    ],
    "summary": {
      "topServices": [
        {
          "service": "Amazon Elastic Compute Cloud - Compute",
          "cost": 125.30,
          "percentage": 51.0
        },
        {
          "service": "Amazon Simple Storage Service",
          "cost": 45.20,
          "percentage": 18.4
        },
        {
          "service": "AWS Lambda",
          "cost": 32.15,
          "percentage": 13.1
        }
      ],
      "dailyAverage": 8.19,
      "projectedMonthly": 245.67
    }
  },
  "budgetContext": {
    "totalBudgets": 2,
    "totalBudgetLimit": 700.00,
    "totalSpent": 245.67,
    "utilizationPercentage": 35.1,
    "remainingBudget": 454.33,
    "status": "on_track"
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

// 400 - Invalid date range
{
  "error": "Invalid date range",
  "message": "End date must be after start date"
}

// 500 - AWS API Error
{
  "error": "Cost Explorer error",
  "message": "Unable to retrieve cost data from AWS"
}
```

---

## 🚨 Trigger Cost Alerts

### `POST /alerts/trigger`

Manually trigger cost alert checking for all active budgets.

**Request:**
```bash
curl -X POST https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/alerts/trigger \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Headers:**
```
Authorization: Bearer <access_token>  // Required
Content-Type: application/json       // Required
```

**Success Response (200):**
```json
{
  "message": "Cost alert check completed",
  "processedBudgets": 3,
  "alertsSent": 1,
  "errors": 0,
  "results": [
    {
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "budgetId": "a10ba90d-48de-4258-9e7b-9480dfd7617e",
      "budgetName": "Production Budget",
      "monthlyLimit": 500,
      "totalSpent": 425.30,
      "projectedSpend": 510.36,
      "utilization": 85.06,
      "status": "warning",
      "alertSent": true,
      "error": null
    },
    {
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "budgetId": "b20cb90e-59ef-5369-af8c-a591ege8728f",
      "budgetName": "Development Budget",
      "monthlyLimit": 200,
      "totalSpent": 45.20,
      "projectedSpend": 135.60,
      "utilization": 22.6,
      "status": "on_track",
      "alertSent": false,
      "error": null
    },
    {
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "budgetId": "c30dc90f-6aff-6470-bg9d-b602fhf9839g",
      "budgetName": "Testing Budget",
      "monthlyLimit": 100,
      "totalSpent": 95.75,
      "projectedSpend": 115.00,
      "utilization": 95.75,
      "status": "exceeded",
      "alertSent": true,
      "error": null
    }
  ],
  "alertDetails": [
    {
      "budgetName": "Production Budget",
      "alertType": "THRESHOLD_REACHED",
      "threshold": 80,
      "currentUtilization": 85.06,
      "notificationChannels": ["email"],
      "timestamp": "2025-06-25T10:30:00.000Z"
    },
    {
      "budgetName": "Testing Budget",
      "alertType": "BUDGET_EXCEEDED",
      "threshold": 90,
      "currentUtilization": 95.75,
      "notificationChannels": ["email", "sns"],
      "timestamp": "2025-06-25T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**
```json
// 401 - Unauthorized
{
  "error": "Unauthorized",
  "message": "Authorization token is required"
}

// 500 - Processing error
{
  "error": "Alert processing failed",
  "message": "Unable to process cost alerts"
}
```

---

## 📈 Cost Data Response Schema

### Time Period Object
```json
{
  "start": "2025-06-01",    // Start date (YYYY-MM-DD)
  "end": "2025-06-30"       // End date (YYYY-MM-DD)
}
```

### Cost Amount Object
```json
{
  "amount": "245.67",       // Cost amount as string
  "currency": "USD"         // Currency code
}
```

### Service Group Object
```json
{
  "keys": ["Amazon Elastic Compute Cloud - Compute"],  // Service name array
  "metrics": {
    "BlendedCost": {
      "amount": "125.30",   // Cost amount
      "currency": "USD"     // Currency
    }
  }
}
```

---

## 🔔 Alert Types

| Alert Type | Description | Trigger Condition |
|------------|-------------|-------------------|
| `THRESHOLD_REACHED` | Budget threshold exceeded | Utilization ≥ Alert Threshold |
| `BUDGET_EXCEEDED` | Monthly budget exceeded | Utilization ≥ 100% |
| `PROJECTION_WARNING` | Projected to exceed budget | Projected spend > Budget limit |

---

## 📊 Status Values

| Status | Description | Condition |
|--------|-------------|-----------|
| `on_track` | Spending is normal | < Alert threshold |
| `warning` | Approaching budget limit | ≥ Alert threshold & < 100% |
| `exceeded` | Budget has been exceeded | ≥ 100% of budget |

---

## 📝 Examples

### Get Current Month Cost Data
```bash
# Get current month's cost breakdown
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X GET https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/cost-usage \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq '{
    totalCost: .costData.totalCost.amount,
    topServices: .costData.summary.topServices,
    budgetStatus: .budgetContext.status,
    utilization: .budgetContext.utilizationPercentage
  }'
```

### Get Daily Cost Breakdown
```bash
# Get daily cost data for current month
START_DATE=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

curl -X GET "https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/cost-usage?startDate=$START_DATE&endDate=$END_DATE&granularity=DAILY" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Get Cost by Service
```bash
# Get cost breakdown by AWS service
curl -X GET "https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/cost-usage?groupBy=SERVICE" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq '.costData.resultsByTime[0].groups[] | {
    service: .keys[0],
    cost: .metrics.BlendedCost.amount
  }'
```

### Trigger Manual Alert Check
```bash
# Manually trigger cost alert checking
curl -X POST https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/alerts/trigger \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" | \
  jq '{
    processed: .processedBudgets,
    alertsSent: .alertsSent,
    errors: .errors,
    alerts: [.results[] | select(.alertSent == true) | {
      budget: .budgetName,
      utilization: .utilization,
      status: .status
    }]
  }'
```

### Monitor Budget Performance
```bash
# Get budget performance summary
curl -X GET https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/cost-usage \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq '{
    totalBudget: .budgetContext.totalBudgetLimit,
    totalSpent: .budgetContext.totalSpent,
    remaining: .budgetContext.remainingBudget,
    utilization: .budgetContext.utilizationPercentage,
    status: .budgetContext.status,
    dailyAverage: .costData.summary.dailyAverage,
    projectedMonthly: .costData.summary.projectedMonthly
  }'
```

### Check Specific Date Range
```bash
# Get cost data for specific date range
curl -X GET "https://6glk0hluf8.execute-api.us-east-1.amazonaws.com/dev/cost-usage?startDate=2025-06-01&endDate=2025-06-15&granularity=DAILY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq '{
    period: .costData.timePeriod,
    totalCost: .costData.totalCost.amount,
    dailyBreakdown: [.costData.resultsByTime[] | {
      date: .timePeriod.start,
      cost: .total.BlendedCost.amount
    }]
  }'
```

---

## 🔒 Security & Rate Limiting

1. **Authentication Required**: All endpoints require valid access token
2. **User Isolation**: Users only see their own cost data
3. **AWS Permissions**: Requires Cost Explorer read permissions
4. **Rate Limiting**: Consider implementing rate limiting for cost data requests
5. **Data Caching**: Cost data may be cached for performance
6. **Alert Throttling**: Alerts are throttled to prevent spam

---

## ⚠️ Important Notes

1. **Cost Data Delay**: AWS cost data has a 24-48 hour delay
2. **Permissions**: Ensure AWS account has Cost Explorer API access
3. **Billing**: Cost Explorer API calls incur charges
4. **Accuracy**: Projected costs are estimates based on current usage
5. **Time Zones**: All timestamps are in UTC
6. **Currency**: All amounts are in the account's billing currency
