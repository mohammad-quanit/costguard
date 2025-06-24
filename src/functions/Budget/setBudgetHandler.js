const { setBudget, getPrimaryBudget, getBudget } = require('../../services/budgetService');
const { getUserByEmail } = require('../../services/userService');
const { createResponse, handleError, extractTokenFromEvent, verifyToken } = require('../../utils/auth');

/**
 * Set Budget Handler
 * Creates or updates a user's cloud budget settings
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

    const body = JSON.parse(event.body || '{}');
    const {
      budgetName,
      monthlyLimit,
      currency,
      alertThreshold,
      alertFrequency,
      services,
      tags,
      notifications,
    } = body;

    // Validate required fields
    if (!monthlyLimit || monthlyLimit <= 0) {
      return createResponse(400, {
        error: 'Invalid budget limit',
        message: 'Monthly limit must be a positive number',
      });
    }

    // Validate alert threshold
    if (alertThreshold && (alertThreshold < 1 || alertThreshold > 100)) {
      return createResponse(400, {
        error: 'Invalid alert threshold',
        message: 'Alert threshold must be between 1 and 100 percent',
      });
    }

    // Check if this is an update to an existing budget (by budgetId) or creating a new one
    const { budgetId: requestedBudgetId } = body;
    let existingBudget = null;
    
    if (requestedBudgetId) {
      // User wants to update a specific budget
      existingBudget = await getBudget(user.userId, requestedBudgetId);
      if (!existingBudget) {
        return createResponse(404, {
          error: 'Budget not found',
          message: 'Budget not found for this user'
        });
      }
    }

    const budgetData = {
      userId: user.userId,
      budgetId: existingBudget?.budgetId, // Only reuse ID if updating existing budget
      budgetName: budgetName || 'Default Budget',
      monthlyLimit: parseFloat(monthlyLimit),
      currency: currency || 'USD',
      alertThreshold: alertThreshold || 80,
      alertFrequency: alertFrequency || 'daily',
      services: services || [],
      tags: tags || {},
      notifications: {
        email: notifications?.email !== undefined ? notifications.email : true,
        sns: notifications?.sns || false,
        slack: notifications?.slack || false,
        webhookUrl: notifications?.webhookUrl || null,
      },
      isActive: true,
      createdAt: existingBudget?.createdAt, // Preserve original creation date if updating
    };

    // Create or update budget
    const budget = await setBudget(budgetData);

    // Remove sensitive information from response
    const response = {
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
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };

    return createResponse(existingBudget ? 200 : 201, {
      message: existingBudget ? 'Budget updated successfully' : 'Budget created successfully',
      budget: response,
    });

  } catch (error) {
    console.error('SetBudget error:', error);
    return handleError(error);
  }
};
