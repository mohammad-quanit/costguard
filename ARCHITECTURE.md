# CostGuard Backend Architecture

This document describes the refactored architecture of the CostGuard backend, following clean architecture principles with separation of concerns.

## Project Structure

```
src/
├── functions/           # Lambda function handlers
│   ├── CostData/
│   │   ├── handler.js   # Main business logic
│   │   └── index.js     # Entry point (backward compatibility)
│   ├── CostAlert/
│   │   ├── handler.js   # Alert processing logic
│   │   └── index.js     # Entry point
│   ├── ping/
│   │   └── handler.js   # Health check handler
│   └── ping.js          # Legacy ping handler
├── services/            # Business logic services
│   ├── costExplorerService.js
│   └── budgetsService.js
├── utils/               # Utility functions
│   ├── dateUtils.js
│   ├── budgetUtils.js
│   └── responseUtils.js
├── models/              # Data models and validation
│   └── costDataModel.js
└── index.js             # Main entry point
```

## Architecture Layers

### 1. Functions Layer (`/functions`)
- **Purpose**: AWS Lambda entry points and request/response handling
- **Responsibilities**: 
  - Parse Lambda events
  - Coordinate service calls
  - Handle errors and responses
  - Logging and monitoring

### 2. Services Layer (`/services`)
- **Purpose**: Business logic and external API interactions
- **Responsibilities**:
  - AWS SDK interactions
  - Data processing and transformation
  - Business rule implementation
  - Error handling for external services

### 3. Utils Layer (`/utils`)
- **Purpose**: Reusable utility functions
- **Responsibilities**:
  - Date calculations
  - Budget calculations
  - Response formatting
  - Common helper functions

### 4. Models Layer (`/models`)
- **Purpose**: Data structure definitions and validation
- **Responsibilities**:
  - Data model classes
  - Validation logic
  - Type definitions
  - Data transformation helpers

## Services

### CostExplorerService
Handles all interactions with AWS Cost Explorer API:
- `getCostAndUsage()` - Fetch cost data with flexible parameters
- `getCostDataWithServiceBreakdown()` - Get processed cost data with service breakdown
- `processServiceBreakdown()` - Transform raw data into structured format

### BudgetsService
Manages AWS Budgets API interactions:
- `getBudgets()` - Retrieve account budgets
- `getMonthlyCostHistoryFromBudgets()` - Get historical budget performance
- `getEffectiveBudget()` - Determine effective budget from multiple sources
- `calculateBudgetSummary()` - Generate budget statistics

## Utilities

### dateUtils
Date manipulation and formatting:
- `getStartOfMonthNMonthsAgo()` - Calculate historical date ranges
- `getCurrentDayOfMonth()` - Get current day for projections
- `getDaysInCurrentMonth()` - Calculate month metrics

### budgetUtils
Budget calculations and formatting:
- `calculateBudgetUtilization()` - Budget usage percentage
- `getBudgetStatus()` - Determine budget health status
- `createBudgetMetrics()` - Generate complete budget metrics object

### responseUtils
HTTP response handling:
- `createSuccessResponse()` - Standard success responses
- `createErrorResponse()` - Standard error responses
- `createSafeResponse()` - Safe JSON serialization with fallbacks

## Models

### CostDataResponse
Complete response model with validation:
- Service breakdown items
- Budget metrics
- Summary statistics
- Data validation

## Benefits of This Architecture

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Testability**: Services and utilities can be unit tested independently
3. **Reusability**: Common logic is shared across functions
4. **Maintainability**: Clear structure makes code easier to understand and modify
5. **Scalability**: Easy to add new functions or services
6. **Error Handling**: Centralized error handling and response formatting

## Usage Examples

### Using Services Directly
```javascript
const CostExplorerService = require('../services/costExplorerService');
const costService = new CostExplorerService();
const costData = await costService.getCostDataWithServiceBreakdown(6);
```

### Using Utilities
```javascript
const { createBudgetMetrics } = require('../utils/budgetUtils');
const { getCurrentDayOfMonth } = require('../utils/dateUtils');

const budgetMetrics = createBudgetMetrics({
  effectiveBudget: 1000,
  currentMonthCost: 750,
  currentDay: getCurrentDayOfMonth(),
  daysInMonth: 30
});
```

### Creating Responses
```javascript
const { createSuccessResponse, createErrorResponse } = require('../utils/responseUtils');

// Success response
return createSuccessResponse(data);

// Error response
return createErrorResponse('Something went wrong', 500);
```

## Migration Notes

- Original function signatures are preserved
- Environment variables and configuration remain the same
- Serverless.yml requires no changes

## Future Enhancements

1. Add TypeScript for better type safety
2. Implement comprehensive logging with structured logs
3. Add metrics and monitoring
4. Implement caching for frequently accessed data
5. Add more sophisticated error handling and retry logic
