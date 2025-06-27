const { deleteBudget, getBudget } = require('../../services/budgetService');
const { getUserByEmail } = require('../../services/userService');
const { createResponse, handleError, extractTokenFromEvent, verifyToken } = require('../../utils/auth');

/**
 * Delete Budget Handler
 * Deletes a user's budget by budgetId
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

    // Extract budgetId from path parameters
    const budgetId = event.pathParameters?.budgetId;
    if (!budgetId) {
      return createResponse(400, {
        error: 'Missing budget ID',
        message: 'Budget ID is required in the URL path',
      });
    }

    // Check if budget exists and belongs to the user
    const existingBudget = await getBudget(user.userId, budgetId);
    if (!existingBudget) {
      return createResponse(404, {
        error: 'Budget not found',
        message: 'Budget not found or does not belong to this user',
      });
    }

    // Delete the budget
    await deleteBudget(user.userId, budgetId);

    return createResponse(200, {
      message: 'Budget deleted successfully',
      deletedBudget: {
        budgetId: existingBudget.budgetId,
        budgetName: existingBudget.budgetName,
        monthlyLimit: existingBudget.monthlyLimit,
        deletedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('DeleteBudget error:', error);
    return handleError(error);
  }
};
