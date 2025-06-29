# CostGuard API Documentation

CostGuard is a comprehensive AWS cost monitoring and budget management system built with serverless architecture.

## 📚 Documentation Structure

- [API Overview](./api/README.md) - Complete API reference
- [Authentication APIs](./api/authentication.md) - User authentication endpoints
- [Budget Management APIs](./api/budget-management.md) - Budget CRUD operations
- [Cost Monitoring APIs](./api/cost-monitoring.md) - Cost tracking and alerts
- [User Profile APIs](./api/user-profile.md) - User management endpoints

## 🚀 Quick Start

### Base URL
```
https://xxxxxxxx.execute-api.us-east-1.amazonaws.com/dev
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```bash
Authorization: Bearer <access_token>
```

### Common Headers
```bash
Content-Type: application/json
Authorization: Bearer <access_token>  # For protected endpoints
```

## 📋 API Categories

### 🔐 Authentication APIs
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `POST /auth/refresh` - Refresh access token

### 👤 User Profile APIs
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### 💰 Budget Management APIs
- `POST /budget/set` - Create/update budget
- `GET /budget` - Get user budgets
- `GET /budget?budgetId=<id>` - Get specific budget
- `GET /budget?primaryOnly=true` - Get primary budget only

### 📊 Cost Monitoring APIs
- `GET /cost-usage` - Get cost and usage data
- `POST /alerts/trigger` - Trigger cost alerts manually

## 📖 Detailed Documentation

For detailed API documentation with examples, request/response schemas, and error codes, see the individual API documentation files in the `api/` directory.

## 🛠️ Development

### Local Testing
```bash
# Install dependencies
npm install

# Deploy to AWS
serverless deploy

# Check logs
serverless logs -f <function-name>
```

### Error Handling
All APIs return consistent error responses:
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "statusCode": 400
}
```

## 📞 Support

For issues and questions, please refer to the individual API documentation or check the CloudWatch logs for detailed error information.
