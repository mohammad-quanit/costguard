// Import the refactored handler
const { GetCostAndUsageHandler } = require('./handler');

// Export the handler for backward compatibility
module.exports.GetCostAndUsageHandler = GetCostAndUsageHandler;
