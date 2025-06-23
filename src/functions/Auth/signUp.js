const { AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { createUser, getUserByEmail } = require('../../services/userService');
const { createResponse, handleError, isValidEmail, validatePassword, cognitoClient } = require('../../utils/auth');

/**
 * User registration handler
 * Creates user in Cognito User Pool and stores user data in DynamoDB
 */
exports.handler = async(event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password, firstName, lastName, monthlyBudget, alertThreshold } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return createResponse(400, {
        error: 'Missing required fields',
        message: 'Email, password, firstName, and lastName are required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return createResponse(400, {
        error: 'Invalid email format',
        message: 'Please provide a valid email address',
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return createResponse(400, {
        error: 'Invalid password',
        message: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
    }

    // Check if user already exists in DynamoDB
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return createResponse(409, {
        error: 'User already exists',
        message: 'An account with this email already exists',
      });
    }

    // Create user in Cognito User Pool
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName },
      ],
      MessageAction: 'SUPPRESS', // Don't send welcome email
      TemporaryPassword: password,
    });

    const cognitoUser = await cognitoClient.send(createUserCommand);
    const cognitoUserId = cognitoUser.User.Username;

    // Set permanent password
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: cognitoUserId,
      Password: password,
      Permanent: true,
    });

    await cognitoClient.send(setPasswordCommand);

    // Create user record in DynamoDB
    const userData = {
      email,
      firstName,
      lastName,
      cognitoUserId,
      monthlyBudget: monthlyBudget || null,
      alertThreshold: alertThreshold || 80,
    };

    const user = await createUser(userData);

    // Remove sensitive information from response
    const { cognitoUserId: _, ...userResponse } = user;

    return createResponse(201, {
      message: 'User created successfully',
      user: userResponse,
    });

  } catch (error) {
    console.error('SignUp error:', error);
    return handleError(error);
  }
};
