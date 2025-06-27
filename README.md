# 🛡️ CostGuard - AWS Cost Monitoring & Budget Management System

[![Serverless](https://img.shields.io/badge/serverless-framework-orange)](https://www.serverless.com/)
[![AWS](https://img.shields.io/badge/AWS-Lambda-yellow)](https://aws.amazon.com/lambda/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

CostGuard is a comprehensive AWS cost monitoring and budget management system built with serverless architecture. It provides real-time cost tracking, budget alerts, and detailed spending analytics to help you manage your AWS expenses effectively.

## 🌟 Features

- **💰 Multiple Budget Management** - Create and manage multiple budgets with flexible thresholds
- **📊 Real-time Cost Monitoring** - Integration with AWS Cost Explorer API for live cost data
- **🚨 Smart Alerts** - Threshold notifications via email, SNS, and Slack
- **👤 User Management** - Secure JWT authentication with AWS Cognito
- **📈 Analytics** - Service breakdown, projections, and historical trends

## 🏗️ Architecture

Serverless infrastructure using AWS Lambda, API Gateway, DynamoDB, Cognito, and Cost Explorer API.

```
API Gateway → Lambda Functions → DynamoDB
     ↓              ↓              ↓
  Cognito    Cost Explorer      SNS
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or later
- AWS CLI configured
- Serverless Framework

### Installation
```bash
git clone https://github.com/your-username/costguard.git
cd costguard
npm install
serverless deploy
```

## 📚 API Documentation

**Base URL:** `https://xlr4wiih1g.execute-api.us-east-1.amazonaws.com/local`

### Available Endpoints
- Authentication: `/auth/signup`, `/auth/signin`, `/auth/refresh`
- User Profile: `/auth/profile`
- Budget Management: `/budget/set`, `/budget`
- Cost Monitoring: `/cost-usage`, `/alerts/trigger`

### Documentation Resources
- **[📖 Complete API Documentation](./docs/README.md)** - Full reference with examples
- **[⚡ Quick Reference](./docs/api/quick-reference.md)** - Essential commands
- **[🌐 Interactive Docs](./docs/index.html)** - Browse documentation
- **[🧪 Test Script](./docs/test-api.sh)** - Automated API testing
- **[📋 Postman Collection](./docs/CostGuard-API-Collection.postman_collection.json)** - Import ready

## 🛠️ Development

```bash
# Local development
serverless dev

# Deploy
serverless deploy

# Run tests
./docs/test-api.sh

# Linting
npm run lint
```

## 🔧 Configuration

### Required AWS Permissions
- Cost Explorer API access
- DynamoDB read/write
- Cognito user management
- SNS publish
- CloudWatch logs

## 🔒 Security

- JWT-based authentication with AWS Cognito
- Data encryption at rest and in transit
- Input validation and CORS configuration
- Least privilege AWS permissions

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for AWS Cost Management**
