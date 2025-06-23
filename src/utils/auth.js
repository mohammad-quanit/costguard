const jwt = require('jsonwebtoken');
const { CognitoIdentityProviderClient } = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration time
 * @returns {string} JWT token
 */
const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token', error);
  }
};

/**
 * Extract token from Authorization header
 * @param {Object} event - Lambda event object
 * @returns {string|null} Extracted token or null
 */
const extractTokenFromEvent = (event) => {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Create standardized API response
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @param {Object} headers - Additional headers
 * @returns {Object} API Gateway response object
 */
const createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers,
    },
    body: JSON.stringify(body),
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and errors
 */
const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Handle errors and create appropriate response
 * @param {Error} error - Error object
 * @returns {Object} API Gateway error response
 */
const handleError = (error) => {
  console.error('Error:', error);

  // Cognito specific errors
  if (error.name === 'UsernameExistsException') {
    return createResponse(409, {
      error: 'User already exists',
      message: 'An account with this email already exists',
    });
  }

  if (error.name === 'UserNotFoundException') {
    return createResponse(404, {
      error: 'User not found',
      message: 'No account found with this email',
    });
  }

  if (error.name === 'NotAuthorizedException') {
    return createResponse(401, {
      error: 'Authentication failed',
      message: 'Invalid email or password',
    });
  }

  if (error.name === 'InvalidPasswordException') {
    return createResponse(400, {
      error: 'Invalid password',
      message: error.message,
    });
  }

  if (error.name === 'InvalidParameterException') {
    return createResponse(400, {
      error: 'Invalid parameter',
      message: error.message,
    });
  }

  // JWT errors
  if (error.message === 'Invalid or expired token') {
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }

  // Generic error
  return createResponse(500, {
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  });
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromEvent,
  createResponse,
  isValidEmail,
  validatePassword,
  handleError,
  cognitoClient,
};
