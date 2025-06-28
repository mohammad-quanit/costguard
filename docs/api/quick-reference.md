# CostGuard API Quick Reference

Quick reference guide for all CostGuard API endpoints with essential curl commands.

## 🔗 Base URL
```
https://uvg5ue10ai.execute-api.us-east-1.amazonaws.com/dev
```

---

## 🚀 Quick Start

### 1. Register & Login
```bash
# Register
curl -X POST https://uvg5ue10ai.execute-api.us-east-1.amazonaws.com/dev/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!","firstName":"John","lastName":"Doe"}'

# Login & Get Token
TOKEN=$(curl -X POST https://uvg5ue10ai.execute-api.us-east-1.amazonaws.com/dev/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}' | jq -r '.tokens.accessToken')
```

### 2. Create Budget
```bash
# Create Budget
curl -X POST https://uvg5ue10ai.execute-api.us-east-1.amazonaws.com/dev/budget/set \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"budgetName":"My Budget","monthlyLimit":500,"alertThreshold":80}'
```

### 3. Get Cost Data
```bash
# Get Cost Data
curl -X GET https://uvg5ue10ai.execute-api.us-east-1.amazonaws.com/dev/cost-usage \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📋 All Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/signup` | ❌ | Register user |
| `POST` | `/auth/signin` | ❌ | Login user |
| `POST` | `/auth/refresh` | ❌ | Refresh token |
| `GET` | `/auth/profile` | ✅ | Get profile |
| `PUT` | `/auth/profile` | ✅ | Update profile |
| `POST` | `/budget/set` | ✅ | Create/update budget |
| `GET` | `/budget` | ✅ | Get all budgets |
| `GET` | `/budget?budgetId=<id>` | ✅ | Get specific budget |
| `GET` | `/budget?primaryOnly=true` | ✅ | Get primary budget |
| `GET` | `/cost-usage` | ✅ | Get cost data |
| `POST` | `/alerts/trigger` | ✅ | Trigger alerts |

---

## 🔐 Authentication Commands

```bash
# Register
curl -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!","firstName":"John","lastName":"Doe"}'

# Login
curl -X POST $BASE_URL/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Refresh Token
curl -X POST $BASE_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"REFRESH_TOKEN_HERE"}'
```

---

## 👤 Profile Commands

```bash
# Get Profile
curl -X GET $BASE_URL/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# Update Profile
curl -X PUT $BASE_URL/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Smith","preferences":{"currency":"USD"}}'
```

---

## 💰 Budget Commands

```bash
# Create Budget
curl -X POST $BASE_URL/budget/set \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"budgetName":"Production","monthlyLimit":500,"alertThreshold":80}'

# Get All Budgets
curl -X GET $BASE_URL/budget \
  -H "Authorization: Bearer $TOKEN"

# Get Specific Budget
curl -X GET "$BASE_URL/budget?budgetId=BUDGET_ID" \
  -H "Authorization: Bearer $TOKEN"

# Get Primary Budget
curl -X GET "$BASE_URL/budget?primaryOnly=true" \
  -H "Authorization: Bearer $TOKEN"

# Update Budget
curl -X POST $BASE_URL/budget/set \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"budgetId":"BUDGET_ID","monthlyLimit":750}'
```

---

## 📊 Cost Monitoring Commands

```bash
# Get Cost Data
curl -X GET $BASE_URL/cost-usage \
  -H "Authorization: Bearer $TOKEN"

# Get Cost Data with Parameters
curl -X GET "$BASE_URL/cost-usage?startDate=2025-06-01&endDate=2025-06-30&granularity=DAILY" \
  -H "Authorization: Bearer $TOKEN"

# Trigger Alerts
curl -X POST $BASE_URL/alerts/trigger \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## 🛠️ Useful One-Liners

### Complete Setup Flow
```bash
BASE_URL="https://uvg5ue10ai.execute-api.us-east-1.amazonaws.com/dev"

# 1. Register
curl -X POST $BASE_URL/auth/signup -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"DemoPass123!","firstName":"Demo","lastName":"User"}'

# 2. Login & Extract Token
TOKEN=$(curl -s -X POST $BASE_URL/auth/signin -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"DemoPass123!"}' | jq -r '.tokens.accessToken')

# 3. Create Budget
curl -X POST $BASE_URL/budget/set -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"budgetName":"Demo Budget","monthlyLimit":200,"alertThreshold":75}'

# 4. Get Budget Summary
curl -s -X GET $BASE_URL/budget -H "Authorization: Bearer $TOKEN" | \
  jq '{totalBudgets:.totalBudgets,budgets:[.budgets[]|{name:.budgetName,limit:.monthlyLimit,status:.status}]}'
```

### Monitor Budget Status
```bash
# Get budget utilization summary
curl -s -X GET $BASE_URL/budget -H "Authorization: Bearer $TOKEN" | \
  jq '.budgets[] | {name:.budgetName,limit:.monthlyLimit,spent:.totalSpentThisMonth,utilization:.utilization,status:.status}'
```

### Cost Analysis
```bash
# Get top services by cost
curl -s -X GET $BASE_URL/cost-usage -H "Authorization: Bearer $TOKEN" | \
  jq '.costData.summary.topServices[] | {service:.service,cost:.cost,percentage:.percentage}'
```

### Alert Check
```bash
# Trigger alerts and show results
curl -s -X POST $BASE_URL/alerts/trigger -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" | \
  jq '{processed:.processedBudgets,alertsSent:.alertsSent,alerts:[.results[]|select(.alertSent==true)|{budget:.budgetName,utilization:.utilization}]}'
```

---

---

## 🔍 Response Filtering with jq

```bash
# Get only budget names and limits
curl -s -X GET $BASE_URL/budget -H "Authorization: Bearer $TOKEN" | \
  jq '.budgets[] | {name: .budgetName, limit: .monthlyLimit}'

# Get cost summary
curl -s -X GET $BASE_URL/cost-usage -H "Authorization: Bearer $TOKEN" | \
  jq '{total: .costData.totalCost.amount, services: .costData.summary.topServices}'

# Get user info
curl -s -X GET $BASE_URL/auth/profile -H "Authorization: Bearer $TOKEN" | \
  jq '{name: (.user.firstName + " " + .user.lastName), email: .user.email}'
```

---

## ⚠️ Common Issues

### 401 Unauthorized
```bash
# Token expired - refresh it
curl -X POST $BASE_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### 400 Bad Request
```bash
# Check request body format
echo '{"budgetName":"Test","monthlyLimit":100}' | jq '.'
```

### 404 Not Found
```bash
# Verify endpoint URL
echo $BASE_URL/budget
```

---

## 📚 Additional Resources

- [Complete API Documentation](./README.md)
- [Authentication Guide](./authentication.md)
- [Budget Management Guide](./budget-management.md)
- [Cost Monitoring Guide](./cost-monitoring.md)
- [Postman Collection](../CostGuard-API-Collection.postman_collection.json)
