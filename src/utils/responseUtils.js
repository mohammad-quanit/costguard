/**
 * HTTP response utilities
 */

/**
 * Create a successful HTTP response
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} HTTP response object
 */
function createSuccessResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    },
    body: JSON.stringify(data),
  };
}

/**
 * Create an error HTTP response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} details - Additional error details
 * @returns {Object} HTTP response object
 */
function createErrorResponse(message, statusCode = 500, details = null) {
  const errorBody = {
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    errorBody.details = details;
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    },
    body: JSON.stringify(errorBody),
  };
}

/**
 * Safely serialize JSON with fallback handling
 * @param {Object} data - Data to serialize
 * @param {Object} fallbackData - Fallback data if serialization fails
 * @returns {string} Serialized JSON string
 */
function safeJsonStringify(data, fallbackData = null) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error('JSON serialization error:', error);

    if (fallbackData) {
      try {
        return JSON.stringify(fallbackData);
      } catch (fallbackError) {
        console.error('Fallback JSON serialization error:', fallbackError);
      }
    }

    // Ultimate fallback
    return JSON.stringify({
      error: 'Data serialization failed',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Create a response with safe JSON serialization
 * @param {Object} data - Response data
 * @param {Object} fallbackData - Fallback data if main data fails to serialize
 * @param {number} statusCode - HTTP status code
 * @returns {Object} HTTP response object
 */
function createSafeResponse(data, fallbackData = null, statusCode = 200) {
  const serializedBody = safeJsonStringify(data, fallbackData);

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    },
    body: serializedBody,
  };
}

/**
 * Log response information for debugging
 * @param {string} functionName - Name of the function
 * @param {Object} responseData - Response data to log
 */
function logResponse(functionName, responseData) {
  console.log(`[${functionName}] Response created successfully`);

  // Log key metrics without sensitive data
  if (responseData.totalCost) {
    console.log(`[${functionName}] Total Cost: ${responseData.totalCost}`);
  }
  if (responseData.serviceCount) {
    console.log(`[${functionName}] Service Count: ${responseData.serviceCount}`);
  }
  if (responseData.budget?.budgetStatus) {
    console.log(`[${functionName}] Budget Status: ${responseData.budget.budgetStatus}`);
  }
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  safeJsonStringify,
  createSafeResponse,
  logResponse,
};
