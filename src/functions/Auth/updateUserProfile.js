const { AdminUpdateUserAttributesCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { getUserByEmail, updateUser } = require('../../services/userService');
const { createResponse, handleError, extractTokenFromEvent, verifyToken, cognitoClient } = require('../../utils/auth');

/**
 * Update user profile handler
 * Updates user profile information in both Cognito and DynamoDB
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

    const body = JSON.parse(event.body || '{}');
    const {
      firstName,
      lastName,
      preferences,
      costSettings,
    } = body;

    // Get current user data
    const currentUser = await getUserByEmail(userEmail);
    if (!currentUser) {
      return createResponse(404, {
        error: 'User not found',
        message: 'User profile not found',
      });
    }

    // Check if user is active
    if (!currentUser.isActive) {
      return createResponse(403, {
        error: 'Account deactivated',
        message: 'Your account has been deactivated',
      });
    }

    // Prepare updates for DynamoDB
    const updates = {};

    if (firstName !== undefined) {
      updates.firstName = firstName;
    }

    if (lastName !== undefined) {
      updates.lastName = lastName;
    }

    if (preferences && typeof preferences === 'object') {
      updates.preferences = {
        ...currentUser.preferences,
        ...preferences,
      };
    }

    if (costSettings && typeof costSettings === 'object') {
      updates.costSettings = {
        ...currentUser.costSettings,
        ...costSettings,
      };
    }

    // Update user in DynamoDB
    const updatedUser = await updateUser(currentUser.userId, updates);

    // Update Cognito user attributes if name changed
    if (firstName !== undefined || lastName !== undefined) {
      const userAttributes = [];

      if (firstName !== undefined) {
        userAttributes.push({ Name: 'given_name', Value: firstName });
      }

      if (lastName !== undefined) {
        userAttributes.push({ Name: 'family_name', Value: lastName });
      }

      if (userAttributes.length > 0) {
        try {
          const updateCognitoCommand = new AdminUpdateUserAttributesCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Username: currentUser.cognitoUserId,
            UserAttributes: userAttributes,
          });

          await cognitoClient.send(updateCognitoCommand);
        } catch (cognitoError) {
          console.warn('Failed to update Cognito attributes:', cognitoError.message);
          // Continue anyway - DynamoDB update was successful
        }
      }
    }

    // Remove sensitive information from response
    const { cognitoUserId, ...userResponse } = updatedUser;

    return createResponse(200, {
      message: 'User profile updated successfully',
      user: userResponse,
    });

  } catch (error) {
    console.error('UpdateUserProfile error:', error);
    return handleError(error);
  }
};
