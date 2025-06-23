const { getUserById } = require('../../services/userService');
const { createResponse, handleError, verifyToken, generateToken } = require('../../utils/auth');

/**
 * Refresh JWT token handler
 * Validates refresh token and issues new access token
 */
exports.handler = async(event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { refreshToken } = body;

    if (!refreshToken) {
      return createResponse(400, {
        error: 'Missing refresh token',
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      return createResponse(401, {
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired',
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

    // Check if user is still active
    if (!user.isActive) {
      return createResponse(403, {
        error: 'Account deactivated',
        message: 'Your account has been deactivated',
      });
    }

    // Generate new access token
    const tokenPayload = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      cognitoUserId: user.cognitoUserId,
    };

    const newAccessToken = generateToken(tokenPayload, '24h');
    const newRefreshToken = generateToken({ userId: user.userId }, '30d');

    return createResponse(200, {
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 86400, // 24 hours in seconds
        tokenType: 'Bearer',
      },
    });

  } catch (error) {
    console.error('RefreshToken error:', error);
    return handleError(error);
  }
};
