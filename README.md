# 🛡️ CostGuard - AWS Cost Monitoring & Budget Management System

[![Serverless](https://img.shields.io/badge/serverless-framework-orange)](https://www.serverless.com/)
[![AWS](https://img.shields.io/badge/AWS-Lambda-yellow)](https://aws.amazon.com/lambda/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

CostGuard is a comprehensive AWS cost monitoring and budget management system built with serverless architecture. It provides real-time cost tracking, budget alerts, and detailed spending analytics to help you manage your AWS expenses effectively across multiple AWS accounts.

## 🌟 Features

- **💰 Multi-Account Budget Management** - Create and manage budgets across multiple AWS accounts
- **📊 Real-time Cost Monitoring** - Integration with AWS Cost Explorer API for live cost data
- **🚨 Smart Alerts** - Automated threshold notifications via email with 1-minute monitoring
- **👤 User Management** - Secure JWT authentication with AWS Cognito
- **📈 Analytics** - Service breakdown, projections, and historical trends
- **🔐 AWS Account Validation** - Secure credential validation using AWS STS
- **⚡ Serverless Architecture** - Built entirely on AWS Lambda functions

## 🏗️ Architecture

Serverless infrastructure using 10+ AWS Lambda functions, API Gateway, DynamoDB, Cognito, and Cost Explorer API.

```
API Gateway → Lambda Functions → DynamoDB
     ↓              ↓              ↓
  Cognito    Cost Explorer    SES/SNS
     ↓              ↓              ↓
EventBridge → Budget Monitor → Email Alerts
```

## ⚡ AWS Lambda Usage

CostGuard leverages AWS Lambda as its core compute engine with **15 specialized functions**:

### **Authentication Functions**
- `signUp` - User registration with Cognito integration
- `signIn` - JWT token generation and user login
- `refreshToken` - Token refresh mechanism
- `getUserProfile` / `updateUserProfile` - User management
- `sesEmailVerifier` - Cognito post-confirmation trigger

### **Budget & Cost Management**
- `setBudget` / `getBudget` / `deleteBudget` - Budget CRUD operations
- `getCostData` - Multi-account cost data retrieval from Cost Explorer
- `validateAWSAccount` - AWS credential validation using STS
- `fetchAWSAccounts` - Retrieve stored AWS accounts

### **Automated Monitoring**
- `budgetThresholdMonitor` - **Scheduled function** (runs every 1 minute)
  - Monitors all AWS accounts for budget violations
  - Sends email alerts when thresholds are crossed
  - Supports multi-account cost tracking
- `triggerAlerts` - Manual alert triggering API

### **Lambda Benefits**
- **Event-driven**: HTTP triggers, scheduled events, Cognito triggers
- **Auto-scaling**: Handles multiple accounts and users simultaneously  
- **Cost-efficient**: Pay only for execution time
- **Multi-account support**: Dynamic credential switching per account

## 🚀 Local Development Setup

### Prerequisites
- **Node.js 18.x** or later
- **pnpm** package manager
- **AWS CLI** configured with appropriate permissions
- **Serverless Framework** installed globally

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/mohammad-quanit/costguard.git
cd costguard
```

2. **Install dependencies using pnpm**
```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install project dependencies
pnpm install
```

3. **Configure AWS credentials**
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
# AWS Access Key ID [None]: AKIA...
# AWS Secret Access Key [None]: your-secret-key
# Default region name [None]: us-east-1
# Default output format [None]: json
```

4. **Install Serverless Framework globally**
```bash
pnpm add -g serverless
```

5. **Deploy to AWS**
```bash
# Deploy all functions and resources
sls deploy

# Deploy individual function (faster for development)
sls deploy function --function FUNCTION_NAME
```

6. **Environment Variables**
Create a `.env` file in the root directory:
```bash
FROM_EMAIL=your-verified-ses-email@example.com
DEFAULT_ALERT_EMAIL=your-alert-email@example.com
```

### Development Commands
```bash
# Local development with hot reload
sls dev

# Deploy all functions
sls deploy

# Deploy specific function
sls deploy function --function budgetThresholdMonitor

# Invoke function locally
sls invoke --function FUNCTION_NAME

# View function logs
sls logs --function FUNCTION_NAME --tail

# Remove all resources
sls remove
```

## 🌐 Frontend Application

The CostGuard frontend is a separate React application that provides a user-friendly interface for managing AWS costs and budgets.

**Frontend Repository:** [https://github.com/mohammad-quanit/costguard-client](https://github.com/mohammad-quanit/costguard-client)

### Frontend Features:
- Dashboard with cost visualizations
- Budget management interface
- Multi-account AWS credential management
- Real-time cost monitoring
- Alert configuration and history

## 📚 API Documentation

**Base URL:** `https://your-api-id.execute-api.region.amazonaws.com/stage`

### Core Endpoints
- **Authentication**: `/auth/signup`, `/auth/signin`, `/auth/refresh`
- **User Profile**: `/auth/profile`
- **Budget Management**: `/budget/set`, `/budget`, `/budget/{budgetId}`
- **AWS Accounts**: `/aws/validate-account`, `/aws/accounts`
- **Cost Monitoring**: `/cost-usage`, `/cost-usage?accountId=xxx`
- **Alerts**: `/alerts/trigger`

### Multi-Account Support
All cost and budget endpoints support the `accountId` query parameter:
```bash
GET /cost-usage?accountId=your-account-uuid-here
GET /budget?accountId=your-account-uuid-here
```

## 🛠️ AWS Services Used

- **AWS Lambda** - 15+ serverless functions
- **Amazon API Gateway** - REST API endpoints
- **Amazon DynamoDB** - User data, budgets, AWS accounts storage
- **AWS Cognito** - User authentication and management
- **Amazon SES** - Email notifications and alerts
- **AWS Cost Explorer** - Real-time cost data retrieval
- **AWS Budgets** - Budget management and tracking
- **AWS STS** - Multi-account credential validation
- **Amazon EventBridge** - Scheduled monitoring triggers
- **AWS CloudFormation** - Infrastructure as Code

## 🔧 Configuration

### Required AWS Permissions
- Cost Explorer API access (`ce:GetCostAndUsage`)
- DynamoDB read/write permissions
- Cognito user pool management
- SES email sending permissions
- Lambda execution role
- CloudWatch logs access

### Environment Variables
```yaml
AWS_ACCOUNTS_TABLE: CostGuard-aws-accounts-stage
CLOUD_BUDGET_SETTINGS_TABLE: CostGuard-budget-settings-stage
FROM_EMAIL: your-verified-ses-email@example.com
```

## 🔒 Security Features

- **JWT-based authentication** with AWS Cognito
- **Multi-account credential isolation** - Each user's AWS credentials stored securely
- **Input validation** and sanitization
- **CORS configuration** for secure API access
- **Least privilege IAM permissions**
- **Encrypted data** at rest and in transit

## 🚨 Monitoring & Alerts

- **Real-time monitoring** every 1 minute via EventBridge
- **Email alerts** when budget thresholds are crossed
- **Multi-account support** - Monitor costs across all connected AWS accounts
- **Customizable thresholds** per budget
- **Historical tracking** and trend analysis

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for AWS Cost Management**

*Stop AWS bill surprises with intelligent multi-account cost monitoring and automated alerts.*
