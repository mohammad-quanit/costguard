# CostGuard API Reference

Complete reference for all CostGuard API endpoints with curl examples.

## Base URL
```
https://v49jjlxhmc.execute-api.us-east-1.amazonaws.com/dev
```

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/signup` | User registration | ❌ |
| `POST` | `/auth/signin` | User login | ❌ |
| `POST` | `/auth/refresh` | Refresh access token | ❌ |
| `GET` | `/auth/profile` | Get user profile | ✅ |
| `PUT` | `/auth/profile` | Update user profile | ✅ |
| `POST` | `/budget/set` | Create/update budget | ✅ |
| `GET` | `/budget` | Get all user budgets | ✅ |
| `GET` | `/budget?budgetId=<id>` | Get specific budget | ✅ |
| `GET` | `/budget?primaryOnly=true` | Get primary budget | ✅ |
| `GET` | `/cost-usage` | Get cost and usage data | ✅ |
| `POST` | `/alerts/trigger` | Trigger cost alerts | ✅ |

## Response Format

### Success Response
```json
{
  "message": "Success message",
  "data": { ... },
  "statusCode": 200
}
```

### Error Response
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "statusCode": 400
}
```

## Common HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `500` | Internal Server Error |

## Authentication

Protected endpoints require a Bearer token:
```bash
Authorization: Bearer <access_token>
```

Get access token from `/auth/signin` response:
```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

## Rate Limiting

- No explicit rate limiting implemented
- AWS API Gateway default limits apply
- Recommended: Implement client-side throttling

## CORS

CORS is enabled for all endpoints with:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Content-Type,Authorization`
- `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`
