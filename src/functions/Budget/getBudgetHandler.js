const { getUserBudgets, getPrimaryBudget, getBudget, calculateUtilization, getBudgetStatus } = require('../../services/budgetService');
const { getUserByEmail } = require('../../services/userService');
const { createResponse, handleError, extractTokenFromEvent, verifyToken } = require('../../utils/auth');

/**
 * Get Budget Handler
 * Retrieves user's budget settings and current spending status
 */
exports.handler = async(event) => {
  try {
    // Extract and verify user token
    const token = extractTokenFromEvent(event);
    if (!token) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Authorization token is required',
      });
    }

    const decoded = verifyToken(token);
    const userEmail = decoded.email;

    // Get user from database
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return createResponse(404, {
        error: 'User not found',
        message: 'User associated with this token no longer exists',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return createResponse(403, {
        error: 'Account deactivated',
        message: 'Your account has been deactivated',
      });
    }

    // Get query parameters
    const budgetId = event.queryStringParameters?.budgetId;
    const primaryOnly = event.queryStringParameters?.primaryOnly === 'true';

    let budgets;

    if (budgetId) {
      // Get specific budget
      const budget = await getBudget(user.userId, budgetId);
      if (!budget) {
        return createResponse(404, {
          error: 'Budget not found',
          message: 'Budget not found for this user',
        });
      }
      budgets = [budget];
    } else if (primaryOnly) {
      // Get primary budget only
      const primaryBudget = await getPrimaryBudget(user.userId);
      budgets = primaryBudget ? [primaryBudget] : [];
    } else {
      // Get all user budgets by default
      budgets = await getUserBudgets(user.userId);
    }

    // Enhance budgets with calculated fields
    const enhancedBudgets = budgets.map(budget => {
      const utilization = calculateUtilization(budget.totalSpentThisMonth, budget.monthlyLimit);
      const status = getBudgetStatus(budget);
      const remainingBudget = Math.max(0, budget.monthlyLimit - budget.totalSpentThisMonth);

      return {
        budgetId: budget.budgetId,
        budgetName: budget.budgetName,
        monthlyLimit: budget.monthlyLimit,
        currency: budget.currency,
        alertThreshold: budget.alertThreshold,
        alertFrequency: budget.alertFrequency,
        services: budget.services,
        tags: budget.tags,
        notifications: budget.notifications,
        isActive: budget.isActive,
        totalSpentThisMonth: budget.totalSpentThisMonth,
        projectedMonthlySpend: budget.projectedMonthlySpend,
        remainingBudget: remainingBudget,
        utilization: utilization,
        status: status,
        lastAlertSent: budget.lastAlertSent,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
      };
    });

    // Prepare response
    const response = {
      message: 'Budget settings retrieved successfully',
      budgets: enhancedBudgets,
      totalBudgets: enhancedBudgets.length,
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };

    // If single budget requested, return budget object directly
    if (budgetId && enhancedBudgets.length === 1) {
      response.budget = enhancedBudgets[0];
    }

    return createResponse(200, response);

  } catch (error) {
    console.error('GetBudget error:', error);
    return handleError(error);
  }
};
