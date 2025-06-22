const { createSuccessResponse } = require('../../utils/responseUtils');

/**
 * Simple ping handler for health checks and cron jobs
 * @param {Object} event - Lambda event object
 * @returns {Object} HTTP response
 */
module.exports.pingHandler = async (event) => {
  const time = new Date();
  console.log(`[PingHandler] Ping function executed at ${time.toISOString()}`);
  
  const responseData = {
    message: 'Ping received',
    timestamp: time.toISOString(),
    environment: process.env.NODE_ENV || 'development',
    region: process.env.AWS_REGION || 'us-east-1'
  };

  return createSuccessResponse(responseData);
};
