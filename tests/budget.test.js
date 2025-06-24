const { handler: setBudgetHandler } = require('../src/functions/Budget/setBudgetHandler');
const { handler: getBudgetHandler } = require('../src/functions/Budget/getBudgetHandler');
const { handler: costAlertHandler } = require('../src/functions/CostAlert/costAlertHandler');

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-cost-explorer');
jest.mock('@aws-sdk/client-sns');

// Mock services
jest.mock('../src/services/budgetService');
jest.mock('../src/services/userService');
jest.mock('../src/utils/auth');

const budgetService = require('../src/services/budgetService');
const userService = require('../src/services/userService');
const authUtils = require('../src/utils/auth');

describe('Budget Management Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth utilities
    authUtils.extractTokenFromEvent.mockReturnValue('mock-token');
    authUtils.verifyToken.mockReturnValue({ email: 'test@example.com', userId: 'user-123' });
    authUtils.createResponse.mockImplementation((statusCode, body) => ({
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(body),
    }));

    // Mock user service
    userService.getUserByEmail.mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
    });
  });

  describe('setBudgetHandler', () => {
    test('should create a new budget successfully', async() => {
      const mockBudget = {
        budgetId: 'budget-123',
        userId: 'user-123',
        budgetName: 'Default Budget',
        monthlyLimit: 200,
        currency: 'USD',
        alertThreshold: 80,
        alertFrequency: 'daily',
        isActive: true,
        createdAt: '2025-06-24T00:00:00.000Z',
        updatedAt: '2025-06-24T00:00:00.000Z',
      };

      budgetService.getPrimaryBudget.mockResolvedValue(null);
      budgetService.setBudget.mockResolvedValue(mockBudget);

      const event = {
        headers: { Authorization: 'Bearer mock-token' },
        body: JSON.stringify({
          monthlyLimit: 200,
          currency: 'USD',
          alertThreshold: 80,
          alertFrequency: 'daily',
        }),
      };

      const result = await setBudgetHandler(event);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(response.message).toBe('Budget created successfully');
      expect(response.budget.monthlyLimit).toBe(200);
      expect(budgetService.setBudget).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          monthlyLimit: 200,
          currency: 'USD',
          alertThreshold: 80,
        }),
      );
    });

    test('should update existing budget', async() => {
      const existingBudget = {
        budgetId: 'budget-123',
        userId: 'user-123',
        budgetName: 'Default Budget',
        monthlyLimit: 150,
        createdAt: '2025-06-23T00:00:00.000Z',
      };

      const updatedBudget = {
        ...existingBudget,
        monthlyLimit: 250,
        updatedAt: '2025-06-24T00:00:00.000Z',
      };

      budgetService.getPrimaryBudget.mockResolvedValue(existingBudget);
      budgetService.setBudget.mockResolvedValue(updatedBudget);

      const event = {
        headers: { Authorization: 'Bearer mock-token' },
        body: JSON.stringify({
          monthlyLimit: 250,
          alertThreshold: 85,
        }),
      };

      const result = await setBudgetHandler(event);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(response.message).toBe('Budget updated successfully');
      expect(response.budget.monthlyLimit).toBe(250);
    });

    test('should return 400 for invalid monthly limit', async() => {
      const event = {
        headers: { Authorization: 'Bearer mock-token' },
        body: JSON.stringify({
          monthlyLimit: -100,
        }),
      };

      authUtils.createResponse.mockReturnValue({
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid budget limit',
          message: 'Monthly limit must be a positive number',
        }),
      });

      const result = await setBudgetHandler(event);
      expect(result.statusCode).toBe(400);
    });

    test('should return 401 for missing token', async() => {
      authUtils.extractTokenFromEvent.mockReturnValue(null);
      authUtils.createResponse.mockReturnValue({
        statusCode: 401,
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Authorization token is required',
        }),
      });

      const event = {
        headers: {},
        body: JSON.stringify({ monthlyLimit: 200 }),
      };

      const result = await setBudgetHandler(event);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('getBudgetHandler', () => {
    test('should get user budget successfully', async() => {
      const mockBudget = {
        budgetId: 'budget-123',
        userId: 'user-123',
        budgetName: 'Default Budget',
        monthlyLimit: 200,
        totalSpentThisMonth: 80,
        projectedMonthlySpend: 160,
        alertThreshold: 80,
        isActive: true,
      };

      budgetService.getPrimaryBudget.mockResolvedValue(mockBudget);
      budgetService.calculateUtilization.mockReturnValue(40);
      budgetService.getBudgetStatus.mockReturnValue('on_track');

      const event = {
        headers: { Authorization: 'Bearer mock-token' },
        queryStringParameters: null,
      };

      const result = await getBudgetHandler(event);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(response.message).toBe('Budget settings retrieved successfully');
      expect(response.budgets).toHaveLength(1);
      expect(response.budgets[0].utilization).toBe(40);
      expect(response.budgets[0].status).toBe('on_track');
    });

    test('should return empty array when no budget exists', async() => {
      budgetService.getPrimaryBudget.mockResolvedValue(null);

      const event = {
        headers: { Authorization: 'Bearer mock-token' },
        queryStringParameters: null,
      };

      const result = await getBudgetHandler(event);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(response.budgets).toHaveLength(0);
    });

    test('should get all budgets when includeAll is true', async() => {
      const mockBudgets = [
        { budgetId: 'budget-1', budgetName: 'Default Budget', monthlyLimit: 200 },
        { budgetId: 'budget-2', budgetName: 'Development Budget', monthlyLimit: 100 },
      ];

      budgetService.getUserBudgets.mockResolvedValue(mockBudgets);
      budgetService.calculateUtilization.mockReturnValue(30);
      budgetService.getBudgetStatus.mockReturnValue('on_track');

      const event = {
        headers: { Authorization: 'Bearer mock-token' },
        queryStringParameters: { includeAll: 'true' },
      };

      const result = await getBudgetHandler(event);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(response.budgets).toHaveLength(2);
      expect(budgetService.getUserBudgets).toHaveBeenCalledWith('user-123');
    });
  });

  describe('costAlertHandler', () => {
    test('should process budgets and send alerts', async() => {
      const mockBudgets = [
        {
          budgetId: 'budget-123',
          userId: 'user-123',
          budgetName: 'Default Budget',
          monthlyLimit: 200,
          alertThreshold: 80,
          notifications: { email: true, sns: false, slack: false },
        },
      ];

      const mockCostResponse = {
        ResultsByTime: [
          {
            Total: {
              BlendedCost: {
                Amount: '170.50',
              },
            },
          },
        ],
      };

      budgetService.getAllActiveBudgets.mockResolvedValue(mockBudgets);
      userService.getUserById.mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      });

      // Mock Cost Explorer response
      const { CostExplorerClient } = require('@aws-sdk/client-cost-explorer');
      const mockSend = jest.fn().mockResolvedValue(mockCostResponse);
      CostExplorerClient.prototype.send = mockSend;

      budgetService.updateBudgetSpending.mockResolvedValue({
        ...mockBudgets[0],
        totalSpentThisMonth: 170.50,
        projectedMonthlySpend: 180,
      });

      budgetService.isThresholdExceeded.mockReturnValue(true);
      budgetService.calculateUtilization.mockReturnValue(85.25);
      budgetService.getBudgetStatus.mockReturnValue('warning');

      const event = {};
      const result = await costAlertHandler(event);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(response.message).toBe('Cost alert check completed');
      expect(response.processedBudgets).toBe(1);
      expect(budgetService.updateBudgetSpending).toHaveBeenCalledWith(
        'user-123',
        'budget-123',
        expect.objectContaining({
          totalSpentThisMonth: 170.50,
        }),
      );
    });

    test('should handle no active budgets', async() => {
      budgetService.getAllActiveBudgets.mockResolvedValue([]);

      const event = {};
      const result = await costAlertHandler(event);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(response.message).toBe('No active budgets found');
      expect(response.processedBudgets).toBe(0);
    });

    test('should skip inactive users', async() => {
      const mockBudgets = [
        {
          budgetId: 'budget-123',
          userId: 'user-123',
          budgetName: 'Default Budget',
          monthlyLimit: 200,
        },
      ];

      budgetService.getAllActiveBudgets.mockResolvedValue(mockBudgets);
      userService.getUserById.mockResolvedValue({
        userId: 'user-123',
        isActive: false,
      });

      const event = {};
      const result = await costAlertHandler(event);
      const response = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(response.results).toHaveLength(0);
    });
  });
});

describe('Budget Service Tests', () => {
  // Reset mocks for service tests
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('calculateUtilization should return correct percentage', () => {
    const { calculateUtilization } = jest.requireActual('../src/services/budgetService');

    expect(calculateUtilization(50, 100)).toBe(50);
    expect(calculateUtilization(75, 100)).toBe(75);
    expect(calculateUtilization(0, 100)).toBe(0);
    expect(calculateUtilization(100, 0)).toBe(0);
  });

  test('getBudgetStatus should return correct status', () => {
    const { getBudgetStatus } = jest.requireActual('../src/services/budgetService');

    const budgetOnTrack = { totalSpentThisMonth: 50, monthlyLimit: 100, alertThreshold: 80 };
    const budgetWarning = { totalSpentThisMonth: 85, monthlyLimit: 100, alertThreshold: 80 };
    const budgetExceeded = { totalSpentThisMonth: 110, monthlyLimit: 100, alertThreshold: 80 };

    expect(getBudgetStatus(budgetOnTrack)).toBe('on_track');
    expect(getBudgetStatus(budgetWarning)).toBe('warning');
    expect(getBudgetStatus(budgetExceeded)).toBe('exceeded');
  });

  test('isThresholdExceeded should return correct boolean', () => {
    const { isThresholdExceeded } = jest.requireActual('../src/services/budgetService');

    const budgetUnderThreshold = { totalSpentThisMonth: 70, monthlyLimit: 100, alertThreshold: 80 };
    const budgetOverThreshold = { totalSpentThisMonth: 85, monthlyLimit: 100, alertThreshold: 80 };

    expect(isThresholdExceeded(budgetUnderThreshold)).toBe(false);
    expect(isThresholdExceeded(budgetOverThreshold)).toBe(true);
  });
});
