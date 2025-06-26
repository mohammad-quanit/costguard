/**
 * Utility functions for creating standardized API responses
 */

/**
 * Create a standardized API response
 * @param {number} statusCode - HTTP status code
 * @param {object} body - Response body
 * @param {object} headers - Additional headers
 * @returns {object} API Gateway response object
 */
const createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  };
};

/**
 * Create a success response
 * @param {object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {object} API Gateway response object
 */
const createSuccessResponse = (data, message = 'Success', statusCode = 200) => {
  return createResponse(statusCode, {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Create an error response
 * @param {string} error - Error type
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {object} details - Additional error details
 * @returns {object} API Gateway response object
 */
const createErrorResponse = (error, message, statusCode = 400, details = null) => {
  const body = {
    success: false,
    error,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    body.details = details;
  }

  return createResponse(statusCode, body);
};

/**
 * Create a validation error response
 * @param {string} message - Validation error message
 * @param {array} errors - Array of validation errors
 * @returns {object} API Gateway response object
 */
const createValidationErrorResponse = (message, errors = []) => {
  return createErrorResponse('Validation Error', message, 400, { errors });
};

/**
 * Create an unauthorized response
 * @param {string} message - Unauthorized message
 * @returns {object} API Gateway response object
 */
const createUnauthorizedResponse = (message = 'Unauthorized access') => {
  return createErrorResponse('Unauthorized', message, 401);
};

/**
 * Create a forbidden response
 * @param {string} message - Forbidden message
 * @returns {object} API Gateway response object
 */
const createForbiddenResponse = (message = 'Access forbidden') => {
  return createErrorResponse('Forbidden', message, 403);
};

/**
 * Create a not found response
 * @param {string} message - Not found message
 * @returns {object} API Gateway response object
 */
const createNotFoundResponse = (message = 'Resource not found') => {
  return createErrorResponse('Not Found', message, 404);
};

/**
 * Create an internal server error response
 * @param {string} message - Error message
 * @param {object} error - Error object (for development)
 * @returns {object} API Gateway response object
 */
const createInternalServerErrorResponse = (message = 'Internal server error', error = null) => {
  const details = process.env.NODE_ENV === 'development' && error ? {
    stack: error.stack,
    name: error.name,
  } : null;

  return createErrorResponse('Internal Server Error', message, 500, details);
};

module.exports = {
  createResponse,
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createInternalServerErrorResponse,
};
