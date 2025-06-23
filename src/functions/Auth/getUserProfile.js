const { getUserByEmail } = require('../../services/userService');
const { createResponse, handleError, extractTokenFromEvent, verifyToken } = require('../../utils/auth');

/**
 * Get user profile handler
 * Returns user profile information for authenticated user
 */
exports.handler = async(event) => {
  try {
    // For Cognito authorizer, user info is in requestContext.authorizer.claims
    // For custom JWT auth, we need to extract and verify the token
    let userEmail;

    if (event.requestContext?.authorizer?.claims?.email) {
      // Using Cognito authorizer
      userEmail = event.requestContext.authorizer.claims.email;
    } else {
      // Using custom JWT token
      const token = extractTokenFromEvent(event);
      if (!token) {
        return createResponse(401, {
          error: 'Unauthorized',
          message: 'Authorization token is required',
        });
      }

      const decoded = verifyToken(token);
      userEmail = decoded.email;
    }

    if (!userEmail) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'User email not found in token',
      });
    }

    // Get user from database by email
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return createResponse(404, {
        error: 'User not found',
        message: 'User profile not found',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return createResponse(403, {
        error: 'Account deactivated',
        message: 'Your account has been deactivated',
      });
    }

    // Remove sensitive information from response
    const { cognitoUserId, ...userProfile } = user;

    return createResponse(200, {
      message: 'User profile retrieved successfully',
      user: userProfile,
    });

  } catch (error) {
    console.error('GetUserProfile error:', error);
    return handleError(error);
  }
};
