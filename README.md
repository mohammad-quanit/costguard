# CostGuard 💰🛡️

A serverless cloud cost alerting application built for AWS Lambda Hackathon.

## Overview
CostGuard helps small teams and startups avoid surprise AWS bills by providing real-time cost monitoring, intelligent alerts, and actionable insights.

## Architecture
- **Backend**: AWS Lambda + API Gateway + DynamoDB + CloudWatch + SNS
- **Frontend**: React.js with AWS Amplify hosting
- **Monitoring**: CloudWatch Events + Cost Explorer API

## Features
- 📊 Real-time cost monitoring
- 🚨 Smart threshold alerts
- 📈 Cost trend analysis
- 💡 Cost optimization recommendations
- 📱 Multi-channel notifications (Email, Slack, SMS)
- 🎯 Budget forecasting

## Project Structure
```
costguard/
├── backend/           # Serverless backend
│   ├── src/
│   │   ├── functions/ # Lambda functions
│   │   ├── utils/     # Shared utilities
│   │   ├── models/    # Data models
│   │   └── services/  # Business logic
│   ├── infrastructure/ # IaC (SAM/CDK)
│   └── tests/         # Unit tests
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── services/
│   └── public/
└── docs/             # Documentation
```

## Quick Start
1. Clone the repository
2. Set up AWS credentials
3. Deploy backend: `cd backend && sam deploy`
4. Start frontend: `cd frontend && npm start`

## Tech Stack
- **Backend**: Node.js, AWS Lambda, DynamoDB, SNS, CloudWatch
- **Frontend**: React.js, Chart.js, AWS Amplify
- **Infrastructure**: AWS SAM
- **Testing**: Jest, React Testing Library

## Team
Built with ❤️ for AWS Lambda Hackathon
