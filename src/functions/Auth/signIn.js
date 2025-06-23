const { AdminInitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { getUserByEmail, updateLastLogin } = require('../../services/userService');
const { createResponse, handleError, isValidEmail, generateToken, cognitoClient } = require('../../utils/auth');

/**
 * User login handler
 * Authenticates user with Cognito and returns JWT token
 */
exports.handler = async(event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return createResponse(400, {
        error: 'Missing credentials',
        message: 'Email and password are required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return createResponse(400, {
        error: 'Invalid email format',
        message: 'Please provide a valid email address',
      });
    }

    // Get user from DynamoDB
    const user = await getUserByEmail(email);
    if (!user) {
      return createResponse(404, {
        error: 'User not found',
        message: 'No account found with this email',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return createResponse(403, {
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Authenticate with Cognito
    const authCommand = new AdminInitiateAuthCommand({
      UserPoolId: process.env.USER_POOL_ID,
      ClientId: process.env.USER_POOL_CLIENT_ID,
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const authResult = await cognitoClient.send(authCommand);

    if (!authResult.AuthenticationResult) {
      return createResponse(401, {
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Update last login timestamp
    await updateLastLogin(user.userId);

    // Generate custom JWT token with user information
    const tokenPayload = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      cognitoUserId: user.cognitoUserId,
    };

    const accessToken = generateToken(tokenPayload, '24h');
    const refreshToken = generateToken({ userId: user.userId }, '30d');

    // Remove sensitive information from user response
    const { cognitoUserId, ...userResponse } = user;

    return createResponse(200, {
      message: 'Login successful',
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 86400, // 24 hours in seconds
        tokenType: 'Bearer',
      },
      user: userResponse,
      cognitoTokens: {
        accessToken: authResult.AuthenticationResult.AccessToken,
        idToken: authResult.AuthenticationResult.IdToken,
        refreshToken: authResult.AuthenticationResult.RefreshToken,
      },
    });

  } catch (error) {
    console.error('SignIn error:', error);
    return handleError(error);
  }
};
