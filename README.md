# 🛡️ CostGuard - AWS Cost Monitoring & Budget Management System

[![Serverless](https://img.shields.io/badge/serverless-framework-orange)](https://www.serverless.com/)
[![AWS](https://img.shields.io/badge/AWS-Lambda-yellow)](https://aws.amazon.com/lambda/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

CostGuard is a comprehensive AWS cost monitoring and budget management system built with serverless architecture. It provides real-time cost tracking, budget alerts, and detailed spending analytics to help you manage your AWS expenses effectively.

## 🌟 Features

### 💰 Budget Management
- **Multiple Budgets**: Create and manage multiple budgets per user
- **Flexible Thresholds**: Set custom alert thresholds (1-100%)
- **Service-Specific Budgets**: Monitor specific AWS services
- **Tag-Based Filtering**: Filter costs by resource tags
- **Real-time Updates**: Live budget utilization tracking

### 📊 Cost Monitoring
- **Real-time Cost Data**: Integration with AWS Cost Explorer API
- **Service Breakdown**: Detailed cost analysis by AWS service
- **Daily/Monthly Granularity**: Flexible time period analysis
- **Projected Spending**: Forecast monthly costs based on current usage
- **Historical Trends**: Track spending patterns over time

### 🚨 Smart Alerts
- **Threshold Alerts**: Notifications when spending reaches set thresholds
- **Budget Exceeded**: Alerts when budgets are exceeded
- **Projection Warnings**: Early warnings for projected overspending
- **Multiple Channels**: Email, SNS, and Slack notifications
- **Alert Frequency**: Daily alert schedules

### 👤 User Management
- **Secure Authentication**: JWT-based authentication with AWS Cognito
- **User Profiles**: Customizable user preferences and settings
- **Multi-currency Support**: USD, EUR, GBP currency options
- **Timezone Support**: Global timezone configuration

## 🏗️ Architecture

### Serverless Infrastructure
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │────│   AWS Lambda     │────│   DynamoDB      │
│                 │    │   Functions      │    │   Tables        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌──────────────────┐            │
         │              │   AWS Cognito    │            │
         │              │   User Pool      │            │
         │              └──────────────────┘            │
         │                       │                       │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudWatch    │    │  Cost Explorer   │    │      SNS        │
│   Events        │    │      API         │    │   Notifications │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core Components
- **API Gateway**: RESTful API endpoints
- **AWS Lambda**: Serverless compute functions
- **DynamoDB**: NoSQL database for user data and budgets
- **AWS Cognito**: User authentication and management
- **Cost Explorer API**: Real-time AWS cost data
- **CloudWatch Events**: Scheduled cost monitoring
- **SNS**: Push notifications for alerts

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or later
- AWS CLI configured with appropriate permissions
- Serverless Framework installed globally

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/costguard.git
   cd costguard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Deploy to AWS**
   ```bash
   serverless deploy
   ```

### Environment Variables
```bash
AWS_REGION=us-east-1
USERS_TABLE=CostGuard-dev-users
CLOUD_BUDGET_SETTINGS_TABLE=CostGuard-dev-cloud-budget-settings
USER_POOL_ID=us-east-1_uEYtQOD55
USER_POOL_CLIENT_ID=38t6dn69m14plcipikds7qkstg
JWT_SECRET=your-jwt-secret-key
```

## 📚 API Documentation

### Base URL
```
https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev
```

### Quick API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/signup` | User registration | ❌ |
| `POST` | `/auth/signin` | User login | ❌ |
| `POST` | `/auth/refresh` | Refresh token | ❌ |
| `GET` | `/auth/profile` | Get user profile | ✅ |
| `PUT` | `/auth/profile` | Update profile | ✅ |
| `POST` | `/budget/set` | Create/update budget | ✅ |
| `GET` | `/budget` | Get all budgets | ✅ |
| `GET` | `/cost-usage` | Get cost data | ✅ |
| `POST` | `/alerts/trigger` | Trigger alerts | ✅ |

### Complete Documentation
- **[📖 Full API Documentation](./docs/README.md)** - Comprehensive API reference
- **[⚡ Quick Reference](./docs/api/quick-reference.md)** - Essential curl commands
- **[🔐 Authentication Guide](./docs/api/authentication.md)** - Auth endpoints
- **[💰 Budget Management](./docs/api/budget-management.md)** - Budget APIs
- **[📊 Cost Monitoring](./docs/api/cost-monitoring.md)** - Cost tracking APIs
- **[🌐 Interactive Docs](./docs/index.html)** - Browse documentation

### Development Tools
- **[🧪 API Test Script](./docs/test-api.sh)** - Automated testing
- **[📋 Postman Collection](./docs/CostGuard-API-Collection.postman_collection.json)** - Import ready

## 🛠️ Development

### Local Development
```bash
# Start local development
serverless dev

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing
```bash
# Run API tests
./docs/test-api.sh

# Test specific endpoint
curl -X GET https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Deployment
```bash
# Deploy all functions
serverless deploy

# Deploy specific function
serverless deploy function -f getBudget

# View logs
serverless logs -f getBudget --tail
```

## 📊 Usage Examples

### 1. User Registration & Login
```bash
# Register new user
curl -X POST https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Login and get access token
TOKEN=$(curl -s -X POST https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}' | \
  jq -r '.tokens.accessToken')
```

### 2. Create and Manage Budgets
```bash
# Create a production budget
curl -X POST https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget/set \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetName": "Production Environment",
    "monthlyLimit": 1000,
    "alertThreshold": 80,
    "services": ["EC2", "RDS", "S3"],
    "notifications": {"email": true}
  }'

# Get all budgets
curl -X GET https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/budget \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Monitor Costs
```bash
# Get current month cost data
curl -X GET https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/cost-usage \
  -H "Authorization: Bearer $TOKEN"

# Trigger cost alerts
curl -X POST https://dl6q0k9s90.execute-api.us-east-1.amazonaws.com/dev/alerts/trigger \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

## 🔧 Configuration

### AWS Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetUsageReport",
        "dynamodb:*",
        "cognito-idp:*",
        "sns:Publish",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### Serverless Configuration
The project uses `serverless.yml` for infrastructure as code:
- **Runtime**: Node.js 18.x
- **Memory**: 1024MB per function
- **Timeout**: 30 seconds
- **Stage**: dev (configurable)
- **Region**: us-east-1 (configurable)

## 📈 Monitoring & Observability

### CloudWatch Integration
- **Function Logs**: Detailed logging for all Lambda functions
- **Metrics**: Custom metrics for budget utilization
- **Alarms**: CloudWatch alarms for system health
- **Dashboards**: Cost monitoring dashboards

### Error Handling
- **Graceful Degradation**: Fallback mechanisms for API failures
- **Retry Logic**: Automatic retries for transient failures
- **Error Logging**: Comprehensive error tracking
- **User-Friendly Messages**: Clear error responses

## 🔒 Security

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **AWS Cognito**: Managed user authentication
- **Token Expiration**: 24-hour access token expiry
- **Refresh Tokens**: 30-day refresh token expiry

### Data Protection
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Proper cross-origin settings

### Best Practices
- **Least Privilege**: Minimal required AWS permissions
- **Audit Logging**: Complete audit trail

## 🚀 Deployment

### Production Deployment
```bash
# Deploy to production
serverless deploy --stage prod

# Set production environment variables
serverless deploy --stage prod --param="jwtSecret=your-prod-secret"
```

## 🤝 Contributing

### Code Standards
- **ESLint**: Code linting and formatting
- **Conventional Commits**: Standardized commit messages
- **Documentation**: Update docs for new features

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- **[Complete API Docs](./docs/README.md)** - Full documentation
- **[Quick Start Guide](./docs/api/quick-reference.md)** - Get started quickly
- **[Troubleshooting](./docs/troubleshooting.md)** - Common issues

### Community
- **Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Wiki**: Community-maintained documentation

**Built with ❤️ for AWS Cost Management**

*CostGuard helps you take control of your AWS spending with intelligent monitoring, flexible budgeting, and proactive alerts.*
