const { getUserById } = require('../services/userService');
const { createResponse, extractTokenFromEvent, verifyToken } = require('./auth');

/**
 * Authentication middleware for Lambda functions
 * Validates JWT token and adds user context to event
 */
const withAuth = (handler) => {
  return async(event, context) => {
    try {
      // Skip authentication for scheduled events (cron jobs)
      if (event.source === 'aws.events') {
        return await handler(event, context);
      }

      // Extract token from event
      const token = extractTokenFromEvent(event);

      if (!token) {
        return createResponse(401, {
          error: 'Unauthorized',
          message: 'Authorization token is required',
        });
      }

      // Verify token
      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (error) {
        console.error("error while verifying token", error);
        return createResponse(401, {
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
      }

      // Get user from database
      const user = await getUserById(decoded.userId);
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

      // Add user context to event
      event.user = {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        preferences: user.preferences,
        costSettings: user.costSettings,
      };

      // Call the original handler
      return await handler(event, context);

    } catch (error) {
      console.error('Auth middleware error:', error);
      return createResponse(500, {
        error: 'Internal server error',
        message: 'An unexpected error occurred during authentication',
      });
    }
  };
};

/**
 * Role-based authorization middleware
 * Checks if user has required role/permission
 */
const withRole = (requiredRole) => {
  return (handler) => {
    return withAuth(async(event, context) => {
      const user = event.user;

      // Check if user has required role
      if (user.role !== requiredRole && user.role !== 'admin') {
        return createResponse(403, {
          error: 'Forbidden',
          message: `Access denied. Required role: ${requiredRole}`,
        });
      }

      return await handler(event, context);
    });
  };
};

/**
 * Cost settings validation middleware
 * Ensures user has proper cost monitoring settings
 */
const withCostSettings = (handler) => {
  return withAuth(async(event, context) => {
    const user = event.user;

    // Check if user has cost settings configured
    if (!user.costSettings || !user.costSettings.monthlyBudget) {
      return createResponse(400, {
        error: 'Cost settings required',
        message: 'Please configure your monthly budget and alert settings first',
      });
    }

    return await handler(event, context);
  });
};

module.exports = {
  withAuth,
  withRole,
  withCostSettings,
};
